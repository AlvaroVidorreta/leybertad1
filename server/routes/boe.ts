import { RequestHandler } from "express";
import fs from "fs/promises";
import path from "path";

// Simple in-memory cache to avoid hammering BOE
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const cache = new Map<string, { ts: number; items: any[] }>();

const CACHE_FILE = path.resolve(process.cwd(), "server", "data", "boe_cache.json");
let cacheDirty = false;

function log(...args: any[]) {
  const ts = new Date().toISOString();
  console.log("[boe]", ts, ...args);
}

async function loadPersistedCache() {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw || "{}") as Record<string, { ts: number; items: any[] }>;
    for (const k of Object.keys(parsed || {})) {
      cache.set(k, parsed[k]);
    }
    log("Loaded persisted cache with", cache.size, "entries");
  } catch (err) {
    // no file yet or parse error
    log("No persisted cache found or failed to load, starting fresh");
  }
}

async function persistCache() {
  try {
    if (!cacheDirty) return;
    const obj: Record<string, { ts: number; items: any[] }> = {};
    for (const [k, v] of cache.entries()) obj[k] = v;
    await fs.writeFile(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    cacheDirty = false;
    log("Persisted cache to disk", CACHE_FILE);
  } catch (err) {
    console.error("[boe] Error persisting cache:", err);
  }
}

// load on module init
loadPersistedCache();
// periodic flush
setInterval(() => persistCache().catch((e) => console.error(e)), 5 * 60 * 1000);

async function fetchSummary(date: string) {
  const cacheKey = `summary:${date}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.items;

  const url = `https://boe.es/datosabiertos/api/boe/sumario/${date}`;
  try {
    log("Fetching BOE summary for", date);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      log("BOE responded with status", res.status);
      return null;
    }
    const data = await res.json();
    if (data && data.status && String(data.status.code) === "200") {
      const items = extractItems(data.data || {});
      cache.set(cacheKey, { ts: Date.now(), items });
      cacheDirty = true;
      // persist asynchronously but await to reduce data loss window
      await persistCache();
      log("Fetched and cached", items.length, "items for", date);
      return items;
    }
    log("BOE summary missing or bad status for", date);
    return null;
  } catch (err) {
    console.error("[boe] fetchSummary error:", err);
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

// Simple rate limiter: maxRequests per minute per visitor
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const rateMap = new Map<string, { ts: number; count: number }>();

export const boeHandler: RequestHandler = async (req, res) => {
  const q = String(req.query.q || "").trim();
  const date = String(req.query.date || "").trim();
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 8)));

  // rate limit check
  const visitor = (req.headers && (req.headers['x-visitor-id'] || req.headers['x-visitorid'])) || req.ip || (req.connection && (req.connection as any).remoteAddress) || 'unknown';
  const now = Date.now();
  const state = rateMap.get(String(visitor));
  if (!state || now - state.ts > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(String(visitor), { ts: now, count: 1 });
  } else {
    state.count++;
    rateMap.set(String(visitor), state);
    if (state.count > RATE_LIMIT_MAX) return res.status(429).json({ error: 'rate_limit_exceeded' });
  }

  if (!q) return res.status(400).json({ error: "q query param required" });

  // If date provided, use it; otherwise try today and previous N days until we find data
  const datesToTry: string[] = [];
  if (date && /^\d{8}$/.test(date)) {
    datesToTry.push(date);
  } else {
    const daysParam = Number(req.query.since_days || 7) || 7;
    // cap to reasonable maximum to avoid huge scans
    const daysToTryCount = Math.min(365, Math.max(1, Math.floor(daysParam)));
    const today = new Date();
    for (let i = 0; i < daysToTryCount; i++) {
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
  let results = allMatches.map((entry: any) => {
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
      date: entry._date || null,
      score: 1, // basic exact-title-match scoring for now
      matched_terms: [q],
    };
  });

  // Ensure results prioritize those from the last year, sorted newest->oldest
  try {
    const today = new Date();
    const cutoff = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    const cutoffStr = `${cutoff.getFullYear()}${String(cutoff.getMonth() + 1).padStart(2, '0')}${String(cutoff.getDate()).padStart(2, '0')}`;

    results.sort((a: any, b: any) => {
      const aDate = a.date || '';
      const bDate = b.date || '';
      const aIsRecent = aDate >= cutoffStr;
      const bIsRecent = bDate >= cutoffStr;
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      // if both same recency status, sort by date desc (newest first)
      if (aDate && bDate) return bDate.localeCompare(aDate);
      if (aDate) return -1;
      if (bDate) return 1;
      return 0;
    });
  } catch (e) {
    // ignore sorting errors
  }

  // limit
  results = results.slice(0, limit);

  res.json({ results, meta: { query: q, tried: datesToTry.length, took_ms: 0 } });
};

// Test helpers
export async function __test_reset_rate() {
  rateMap.clear();
  cache.clear();
  cacheDirty = false;
  try {
    await fs.unlink(CACHE_FILE).catch(() => null);
  } catch (e) {
    // ignore
  }
}

export { RATE_LIMIT_MAX };
