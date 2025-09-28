import { CommentInput, CreateLawResponse, Law, LawInput, LawsResponse, LawUpdatedResponse, RankingResponse, TimeRange } from "@shared/api";

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
  try {
    return await fetch(path, opts);
  } catch (err) {
    // Network-level failure — try Netlify functions fallback if applicable
    if (path.startsWith("/api")) {
      const alt = `/.netlify/functions/api${path.slice(4)}`;
      try {
        return await fetch(alt, opts);
      } catch (err2) {
        // fall through and rethrow original error
      }
    }
    throw err;
  }
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
  const res = await safeFetch(`/api/laws/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-visitor-id": getVisitorId() },
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
