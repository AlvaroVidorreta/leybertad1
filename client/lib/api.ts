import { CommentInput, CreateLawResponse, Law, LawInput, LawsResponse, LawUpdatedResponse, RankingResponse, TimeRange } from "@shared/api";

export async function crearLey(input: LawInput): Promise<Law> {
  const res = await fetch("/api/laws", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Error al crear la ley");
  const data = (await res.json()) as CreateLawResponse;
  return data.law;
}

export async function obtenerRecientes(): Promise<Law[]> {
  const res = await fetch("/api/laws");
  if (!res.ok) throw new Error("Error al cargar leyes recientes");
  const data = (await res.json()) as LawsResponse;
  return data.items;
}

export async function votarLey(id: string): Promise<Law> {
  const res = await fetch(`/api/laws/${id}/upvote`, { method: "POST" });
  if (!res.ok) throw new Error("Error al votar");
  const data = (await res.json()) as LawUpdatedResponse;
  return data.law;
}

export async function guardarLey(id: string): Promise<Law> {
  const res = await fetch(`/api/laws/${id}/save`, { method: "POST" });
  if (!res.ok) throw new Error("Error al guardar");
  const data = (await res.json()) as LawUpdatedResponse;
  return data.law;
}

export async function comentarLey(id: string, input: CommentInput): Promise<Law> {
  const res = await fetch(`/api/laws/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Error al comentar");
  const data = (await res.json()) as LawUpdatedResponse;
  return data.law;
}

export async function obtenerRanking(range: TimeRange): Promise<Law[]> {
  const params = new URLSearchParams({ range });
  const res = await fetch(`/api/ranking?${params.toString()}`);
  if (!res.ok) throw new Error("Error al cargar ranking");
  const data = (await res.json()) as RankingResponse;
  return data.items;
}
