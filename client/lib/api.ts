import { CommentInput, CreateLawResponse, Law, LawInput, LawsResponse, LawUpdatedResponse, RankingResponse, TimeRange } from "@shared/api";

import logger from "./logger";
import { auth, FIREBASE_ENABLED } from "@/lib/firebase";

function getVisitorId() {
  try {
    let v = localStorage.getItem("visitorId");
    if (!v) {
      v = typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function" ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
      localStorage.setItem("visitorId", v);
    }
    return v;
  } catch (e) {
    return "unknown";
  }
}

async function safeFetch(path: string, opts?: RequestInit) {
  const candidates: string[] = [];
  // keep original (relative)
  candidates.push(path);

  // try absolute origin if available (avoid protocol-relative issues)
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin.replace(/\/$/, '');
      if (path.startsWith('/')) candidates.push(origin + path);
    }
  } catch (e) {
    // ignore
  }

  // Netlify functions fallback convention
  if (path.startsWith('/api')) {
    candidates.push(`/.netlify/functions/api${path.slice(4)}`);
    candidates.push(`/.netlify/functions${path}`);
  }

  // try all candidates with a small timeout
  const controllerTimeout = (ms: number) => {
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), ms);
    return { signal: ac.signal, clear: () => clearTimeout(id) };
  };

  let lastErr: any = null;
  for (const url of candidates) {
    try {
      const t = controllerTimeout(7000);
      const res = await fetch(url, { ...(opts || {}), signal: t.signal as any });
      t.clear();
      // Accept and return even if non-ok — caller will handle status codes
      return res;
    } catch (err) {
      lastErr = err;
      // continue to next candidate
      // if abort error, continue
      continue;
    }
  }

  // Nothing worked — throw more informative error
  const err = new Error(`Network fetch failed for ${path}. Tried ${candidates.join(', ')}`);
  (err as any).cause = lastErr;
  logger.error('[safeFetch] All fetch attempts failed', err, lastErr);
  throw err;
}

export async function crearLey(input: LawInput): Promise<Law> {
  const res = await safeFetch("/api/laws", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-visitor-id": getVisitorId() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Error al crear la ley");
  }
  const data = (await res.json()) as CreateLawResponse;
  return data.law;
}

export async function obtenerRecientes(): Promise<Law[]> {
  const res = await safeFetch("/api/laws");
  if (!res.ok) throw new Error("Error al cargar leyes recientes");
  const data = (await res.json()) as LawsResponse;
  return data.items;
}

export async function votarLey(id: string): Promise<Law> {
  const res = await safeFetch(`/api/laws/${id}/upvote`, { method: "POST", headers: { "x-visitor-id": getVisitorId() } });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Error al votar");
  }
  const data = (await res.json()) as LawUpdatedResponse;
  return data.law;
}

export async function guardarLey(id: string): Promise<Law> {
  const res = await safeFetch(`/api/laws/${id}/save`, { method: "POST" });
  if (!res.ok) throw new Error("Error al guardar");
  const data = (await res.json()) as LawUpdatedResponse;
  return data.law;
}

export async function comentarLey(id: string, input: CommentInput): Promise<Law> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-visitor-id": getVisitorId() };
  try {
    if (FIREBASE_ENABLED && auth && auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore token fetch errors — server will require auth and respond accordingly
  }

  const res = await safeFetch(`/api/laws/${id}/comment`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Error al comentar");
  }
  const data = (await res.json()) as LawUpdatedResponse;
  return data.law;
}

export async function obtenerRanking(range: TimeRange): Promise<Law[]> {
  const params = new URLSearchParams({ range });
  const res = await safeFetch(`/api/ranking?${params.toString()}`);
  if (!res.ok) throw new Error("Error al cargar ranking");
  const data = (await res.json()) as RankingResponse;
  return data.items;
}
