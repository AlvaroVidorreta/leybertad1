import { RequestHandler } from "express";
import { RequestHandler } from "express";
import { CommentInput, CreateLawResponse, Law, LawInput, LawUpdatedResponse, LawsResponse, RankingResponse, TimeRange } from "@shared/api";
import { randomUUID } from "crypto";

// In-memory store (reset on server restart)
const laws: Law[] = [];

// Track creations and votes per visitor (visitor = x-visitor-id header when present, otherwise IP)
const creationsByVisitor = new Map<string, string[]>(); // visitorId -> array of ISO timestamps
const votesByVisitor = new Map<string, Set<string>>(); // visitorId -> set of lawIds

function nowISO() {
  return new Date().toISOString();
}

function getVisitorKey(req: any) {
  const header = req.headers && (req.headers["x-visitor-id"] || req.headers["x-visitorid"]);
  if (header && typeof header === "string" && header.trim()) return header;
  // fallback to IP
  return req.ip || (req.connection && req.connection.remoteAddress) || "unknown";
}

export const createLaw: RequestHandler = (req, res) => {
  const body = req.body as LawInput;
  if (!body || !body.titulo || !body.objetivo) {
    return res.status(400).json({ error: "titulo y objetivo son requeridos" });
  }

  const visitor = getVisitorKey(req);

  // enforce 5 creations per 24h per visitor
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const existing = creationsByVisitor.get(visitor) ?? [];
  const recent = existing.filter((ts) => now - Date.parse(ts) <= dayMs);
  if (recent.length >= 5) {
    return res.status(429).json({ error: "Límite alcanzado: solo 5 publicaciones por día para usuarios no registrados" });
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

  // persist creation timestamp for visitor
  recent.push(law.createdAt);
  creationsByVisitor.set(visitor, recent);

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

  const visitor = getVisitorKey(req);
  const voted = votesByVisitor.get(visitor) ?? new Set<string>();
  if (voted.has(id)) {
    return res.status(400).json({ error: "Ya votaste esta ley" });
  }

  // register vote
  voted.add(id);
  votesByVisitor.set(visitor, voted);
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
