import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import logger from "../utils/logger";
import { computeScore } from "../utils/scoring";
import type { RequestHandler } from "express";

// Simple in-memory cache to avoid hammering BOE
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const cache = new Map<string, { ts: number; items: any[] }>();

const CACHE_FILE = path.resolve(process.cwd(), "server", "data", "boe_cache.json");
let cacheDirty = false;
const MAX_CACHE_ENTRIES = Number(process.env.MAX_CACHE_ENTRIES || 500);
function evictIfNeeded() {
  while (cache.size > MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (!firstKey) break;
    cache.delete(firstKey);
  }
}

function log(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    const ts = new Date().toISOString();
    console.debug("[boe]", ts, ...args);
  }
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
    logger.error("[boe] Error persisting cache:", err);
  }
}

// load on module init
loadPersistedCache();
// periodic flush
setInterval(() => persistCache().catch((e) => logger.error(e)), 5 * 60 * 1000);

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
    if (data && (data.status && String(data.status.code) === "200")) {
      const items = extractItems(data.data || {});
      cache.set(cacheKey, { ts: Date.now(), items });
      evictIfNeeded();
      cacheDirty = true;
      // persist asynchronously but await to reduce data loss window
      await persistCache();
      log("Fetched and cached", items.length, "items for", date);
      return items;
    }
    log("BOE summary missing or bad status for", date);
    return null;
  } catch (err) {
    logger.error("[boe] fetchSummary error:", err);
    return null;
  }
}

function extractItems(data: unknown, itemsList: any[] = []) {
  if (!data) return itemsList;
  if (Array.isArray(data)) {
    for (const item of data) extractItems(item, itemsList);
    return itemsList;
  }
  if (typeof data === "object") {
    for (const key of Object.keys(data as Record<string, unknown>)) {
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

function findPdfInObject(obj: unknown): string | null {
  try {
    if (!obj) return null;
    if (typeof obj === 'string') return obj.includes('.pdf') ? obj : null;
    if (Array.isArray(obj)) {
      for (const it of obj) {
        const f = findPdfInObject(it);
        if (f) return f;
      }
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj as Record<string, unknown>)) {
        const v = (obj as any)[k];
        if (typeof v === 'string' && v.includes('.pdf')) return v;
        const f = findPdfInObject(v);
        if (f) return f;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function normalizeTerm(term: string) {
  return String(term || "").trim().toLowerCase();
}

function filterItemsByTerm(items: any[], term: string) {
  const t = normalizeTerm(term);
  if (!t) return [];
  const parts = t.split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    if (!it) return false;
    const fields: string[] = [];
    if (it.titulo) fields.push(String(it.titulo));
    if (it.titulo_largo) fields.push(String(it.titulo_largo));
    if (it.subtitulo) fields.push(String(it.subtitulo));
    if (it.extracto) fields.push(String(it.extracto));
    if (it.texto) fields.push(String(it.texto));
    if (it.referencia) fields.push(String(it.referencia));
    const haystack = fields.join(' ').toLowerCase();
    return parts.every((p) => haystack.includes(p));
  });
}

// Simple rate limiter: maxRequests per minute per visitor
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const rateMap = new Map<string, { ts: number; count: number }>();

function isValidYYYYMMDD(s: string) {
  if (!/^[0-9]{8}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

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
  const explicitDate = date && isValidYYYYMMDD(date) ? date : null;
  // determine days window (defaults to 7)
  const daysParam = explicitDate ? 1 : (Number(req.query.since_days || 7) || 7);
  const daysToTryCount = Math.min(365, Math.max(1, Math.floor(daysParam)));

  if (explicitDate) {
    datesToTry.push(explicitDate);
  } else {
    const today = new Date();
    for (let i = 0; i < daysToTryCount; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      datesToTry.push(`${y}${m}${day}`);
    }
  }

  // compute cutoff date for filtering items by their own dates (inclusive)
  const now = new Date();
  const cutoffDate = explicitDate
    ? new Date(Number(explicitDate.slice(0, 4)), Number(explicitDate.slice(4, 6)) - 1, Number(explicitDate.slice(6, 8)))
    : new Date(now.getTime() - daysToTryCount * 24 * 60 * 60 * 1000);

  const startTime = Date.now();

  // helper to recursively find a date string inside item objects and parse to Date
  function findDateInObject(obj: unknown): Date | null {
    try {
      if (!obj) return null;
      if (typeof obj === 'string') {
        const s = obj.trim();
        // ISO date
        const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
        // YYYYMMDD
        const ymd = s.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
        // DD/MM/YYYY or DD-MM-YYYY
        const dmy = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        return null;
      }
      if (Array.isArray(obj)) {
        for (const it of obj) {
          const f = findDateInObject(it);
          if (f) return f;
        }
      }
      if (typeof obj === 'object') {
        for (const k of Object.keys(obj as Record<string, unknown>)) {
          const v = (obj as any)[k];
          // common spanish date-like keys
          if (/fecha|fecha_publicacion|fecha_publica|fecha_doc|fecha_disposicion|fecha_firma/i.test(k)) {
            const parsed = findDateInObject(v);
            if (parsed) return parsed;
          }
          const f = findDateInObject(v);
          if (f) return f;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // We'll fetch summaries in small batches to improve latency while allowing early exit when we have enough matches
  const concurrency = 4;
  let allMatches: any[] = [];
  const seenRefs = new Set<string>();

  for (let i = 0; i < datesToTry.length; i += concurrency) {
    const batch = datesToTry.slice(i, i + concurrency);
    const batchPromises = batch.map((dt) => fetchSummary(dt).then((items) => ({ dt, items })).catch(() => ({ dt, items: null })));
    const batchResults = await Promise.all(batchPromises);
    for (const br of batchResults) {
      const items = br.items;
      if (!items) continue;
      const matches = filterItemsByTerm(items, q);
      for (const m of matches) {
        const ref = m.referencia || m.id || JSON.stringify(m);
        if (seenRefs.has(ref)) continue;
        // determine an item-level date (prefer the item's own date fields)
        let itemDate: Date | null = findDateInObject(m);
        if (!itemDate && br.dt && /^[0-9]{8}$/.test(String(br.dt))) {
          itemDate = new Date(Number(String(br.dt).slice(0, 4)), Number(String(br.dt).slice(4, 6)) - 1, Number(String(br.dt).slice(6, 8)));
        }
        // if we have a cutoff, ensure itemDate is within range
        if (cutoffDate && itemDate) {
          // include if itemDate >= cutoffDate (same or newer)
          if (itemDate.getTime() < cutoffDate.getTime()) continue;
        } else if (cutoffDate && !itemDate && explicitDate) {
          // if explicit date was requested but no item date and br.dt exists, allow only if br.dt matches explicitDate
          if (String(br.dt) !== explicitDate) continue;
        }

        seenRefs.add(ref);
        allMatches.push({ _date: br.dt, item: m, itemDate: itemDate ? `${itemDate.getFullYear()}${String(itemDate.getMonth() + 1).padStart(2, '0')}${String(itemDate.getDate()).padStart(2, '0')}` : null });
        if (allMatches.length >= limit) break;
      }
      if (allMatches.length >= limit) break;
    }
    if (allMatches.length >= limit) break;
  }

  // Map to response shape
  let results = allMatches.map((entry: any) => {
    const item = entry.item || entry;
    const title = item.titulo || item.titulo_largo || "Sin título";
    // find pdf link robustly
    let pdf = null;
    try {
      if (item.url_pdf && typeof item.url_pdf === "object") {
        if (typeof item.url_pdf === 'string') pdf = item.url_pdf;
        else if (item.url_pdf.texto) pdf = item.url_pdf.texto;
        else pdf = findPdfInObject(item.url_pdf);
      }
      if (!pdf) pdf = findPdfInObject(item);
      if (!pdf && item.url && typeof item.url === "string" && item.url.includes('.pdf')) pdf = item.url;
    } catch (e) {
      pdf = null;
    }

    let boe = item.url || null;
    if (!boe && item.referencia) boe = `https://www.boe.es/eli/${item.referencia}`;

    return {
      id: item.referencia || item.id || `${entry._date}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(title),
      summary: String((item as any).subtitulo || (item as any).extracto || (item as any).texto || ""),
      pdf_url: pdf || null,
      boe_url: boe || null,
      date: entry._date || null,
      score: 0,
      matched_terms: [q],
    };
  });

  // Compute relevance score for each result
  try {
    results = results.map((r: any) => ({ ...r, score: computeScore(r, q) }));
  } catch (e) {
    logger.warn('Scoring failed', e);
  }

  // Ensure results prioritize those from the last year, sorted newest->oldest and by score
  try {
    const today = new Date();
    const cutoff = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    const cutoffNum = Number(`${cutoff.getFullYear()}${String(cutoff.getMonth() + 1).padStart(2, '0')}${String(cutoff.getDate()).padStart(2, '0')}`);

    const toNum = (s: any) => {
      if (!s) return 0;
      if (typeof s === 'number') return s;
      const ss = String(s).trim();
      if (/^[0-9]{8}$/.test(ss)) return Number(ss);
      // try ISO parse
      const d = new Date(ss);
      if (isNaN(d.getTime())) return 0;
      return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
    };

    results.sort((a: any, b: any) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const aNum = toNum(a.date);
      const bNum = toNum(b.date);
      const aIsRecent = aNum >= cutoffNum;
      const bIsRecent = bNum >= cutoffNum;
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      if (aNum && bNum) return bNum - aNum; // newest first
      if (aNum) return -1;
      if (bNum) return 1;
      return 0;
    });
  } catch (e) {
    // ignore
  }

  // limit
  results = results.slice(0, limit);

  const body = { results, meta: { query: q, tried: datesToTry.length, took_ms: Date.now() - startTime } };
  try {
    const etag = crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('ETag', etag);
  } catch (e) {
    logger.warn('Failed to compute ETag', e);
  }
  res.json(body);
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
