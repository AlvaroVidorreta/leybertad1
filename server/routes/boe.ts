import { RequestHandler } from "express";

// Simple in-memory cache to avoid hammering BOE
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const cache = new Map<string, { ts: number; items: any[] }>();

async function fetchSummary(date: string) {
  const cacheKey = `summary:${date}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.items;

  const url = `https://boe.es/datosabiertos/api/boe/sumario/${date}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.status && String(data.status.code) === "200") {
      const items = extractItems(data.data || {});
      cache.set(cacheKey, { ts: Date.now(), items });
      return items;
    }
    return null;
  } catch (err) {
    return null;
  }
}

function extractItems(data: any, itemsList: any[] = []): any[] {
  if (!data) return itemsList;
  if (Array.isArray(data)) {
    for (const item of data) extractItems(item, itemsList);
    return itemsList;
  }
  if (typeof data === "object") {
    for (const key of Object.keys(data)) {
      const value = (data as any)[key];
      if (key === "item") {
        if (Array.isArray(value)) itemsList.push(...value);
        else if (value && typeof value === "object") itemsList.push(value);
      } else {
        extractItems(value, itemsList);
      }
    }
  }
  return itemsList;
}

function filterItemsByTerm(items: any[], term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  return items.filter((it) => it && it.titulo && String(it.titulo).toLowerCase().includes(t));
}

export const boeHandler: RequestHandler = async (req, res) => {
  const q = String(req.query.q || "").trim();
  const date = String(req.query.date || "").trim();
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 8)));

  if (!q) return res.status(400).json({ error: "q query param required" });

  // If date provided, use it; otherwise try today and previous 6 days until we find data
  const datesToTry: string[] = [];
  if (date && /^\d{8}$/.test(date)) datesToTry.push(date);
  else {
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      datesToTry.push(`${y}${m}${day}`);
    }
  }

  let allMatches: any[] = [];
  for (const dt of datesToTry) {
    const items = await fetchSummary(dt);
    if (!items) continue;
    const matches = filterItemsByTerm(items, q);
    if (matches.length > 0) {
      allMatches.push(...matches.map((m: any) => ({ _date: dt, item: m })));
    }
    // if we found many, stop early
    if (allMatches.length >= limit) break;
  }

  // Map to response shape
  const results = allMatches.slice(0, limit).map((entry: any) => {
    const item = entry.item || entry;
    const title = item.titulo || item.titulo_largo || "Sin título";
    // pdf link in the BOE summary often lies in item.url_pdf.texto
    let pdf = null;
    try {
      if (item.url_pdf && typeof item.url_pdf === "object") {
        // url_pdf may be {"texto": "https://...pdf"}
        pdf = item.url_pdf.texto || item.url_pdf[0] || null;
      }
      if (!pdf && item.url && typeof item.url === "string" && item.url.includes(".pdf")) pdf = item.url;
    } catch (e) {
      pdf = null;
    }

    // boe_url: attempt to use item.url or build from referencia
    let boe = item.url || null;
    if (!boe && item.referencia) boe = `https://www.boe.es/eli/${item.referencia}`;

    return {
      id: item.referencia || item.id || `${entry._date}-${Math.random().toString(36).slice(2,8)}`,
      title: String(title),
      summary: String(item.subtitulo || item.extracto || item.texto || ""),
      pdf_url: pdf || null,
      boe_url: boe || null,
      score: 1, // basic exact-title-match scoring for now
      matched_terms: [q],
    };
  });

  res.json({ results, meta: { query: q, tried: datesToTry.length, took_ms: 0 } });
};
