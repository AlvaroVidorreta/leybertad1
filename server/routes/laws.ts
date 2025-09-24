import { RequestHandler } from "express";
import { CommentInput, CreateLawResponse, Law, LawInput, LawUpdatedResponse, LawsResponse, RankingResponse, TimeRange } from "@shared/api";
import { randomUUID } from "crypto";

// In-memory store (reset on server restart)
const laws: Law[] = [];

function nowISO() {
  return new Date().toISOString();
}

export const createLaw: RequestHandler = (req, res) => {
  const body = req.body as LawInput;
  if (!body || !body.titulo || !body.objetivo) {
    return res.status(400).json({ error: "titulo y objetivo son requeridos" });
  }
  const law: Law = {
    id: randomUUID(),
    titulo: String(body.titulo).slice(0, 500),
    objetivo: String(body.objetivo).slice(0, 200),
    detalles: body.detalles ? String(body.detalles).slice(0, 2000) : undefined,
    apodo: body.apodo ? String(body.apodo).slice(0, 60) : undefined,
    createdAt: nowISO(),
    upvotes: 0,
    saves: 0,
    comentarios: [],
  };
  laws.unshift(law);
  const response: CreateLawResponse = { law };
  res.json(response);
};

export const listRecent: RequestHandler = (_req, res) => {
  const items = [...laws].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const response: LawsResponse = { items };
  res.json(response);
};

export const upvoteLaw: RequestHandler = (req, res) => {
  const { id } = req.params;
  const law = laws.find((l) => l.id === id);
  if (!law) return res.status(404).json({ error: "Ley no encontrada" });
  law.upvotes += 1;
  const response: LawUpdatedResponse = { law };
  res.json(response);
};

export const saveLaw: RequestHandler = (req, res) => {
  const { id } = req.params;
  const law = laws.find((l) => l.id === id);
  if (!law) return res.status(404).json({ error: "Ley no encontrada" });
  law.saves += 1; // sin auth, solo contador global
  const response: LawUpdatedResponse = { law };
  res.json(response);
};

export const commentLaw: RequestHandler = (req, res) => {
  const { id } = req.params;
  const { texto } = req.body as CommentInput;
  const law = laws.find((l) => l.id === id);
  if (!law) return res.status(404).json({ error: "Ley no encontrada" });
  if (!texto || typeof texto !== "string")
    return res.status(400).json({ error: "Comentario requerido" });
  const trimmed = texto.slice(0, 200);
  law.comentarios.push({ id: randomUUID(), texto: trimmed, createdAt: nowISO() });
  const response: LawUpdatedResponse = { law };
  res.json(response);
};

function withinRange(dateISO: string, range: TimeRange) {
  if (range === "all") return true;
  const d = new Date(dateISO).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === "day") return now - d <= day;
  if (range === "week") return now - d <= 7 * day;
  if (range === "month") return now - d <= 30 * day;
  if (range === "semester") return now - d <= 182 * day;
  return true;
}

export const ranking: RequestHandler = (req, res) => {
  const range = (req.query.range as TimeRange) || "all";
  const items = laws
    .filter((l) => withinRange(l.createdAt, range))
    .sort((a, b) => b.upvotes - a.upvotes || (a.createdAt < b.createdAt ? 1 : -1));
  const response: RankingResponse = { items };
  res.json(response);
};
