import { RequestHandler } from "express";
import { LawInput, CommentInput, CreateLawResponse, LawsResponse, LawUpdatedResponse, RankingResponse, TimeRange } from "@shared/api";
import { db } from "../db";

function getVisitorKey(req: any) {
  const header = req.headers && (req.headers["x-visitor-id"] || req.headers["x-visitorid"]);
  if (header && typeof header === "string" && header.trim()) return header;
  return req.ip || (req.connection && req.connection.remoteAddress) || "unknown";
}

export const createLaw: RequestHandler = async (req, res) => {
  const body = req.body as LawInput;
  if (!body || !body.titulo || !body.objetivo) {
    return res.status(400).json({ error: "titulo y objetivo son requeridos" });
  }
  const visitor = getVisitorKey(req);
  try {
    const law = await db.createLaw(body, visitor);
    const response: CreateLawResponse = { law };
    res.json(response);
  } catch (err: any) {
    if (err && err.message === "RATE_LIMIT_EXCEEDED") {
      return res.status(429).json({ error: "Límite alcanzado: solo 5 publicaciones por día para usuarios no registrados" });
    }
    res.status(500).json({ error: "Error al crear la ley" });
  }
};

export const listRecent: RequestHandler = async (_req, res) => {
  try {
    const items = await db.listRecent();
    const response: LawsResponse = { items };
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Error al listar leyes" });
  }
};

export const upvoteLaw: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const visitor = getVisitorKey(req);
  try {
    const law = await db.upvoteLaw(id, visitor);
    const response: LawUpdatedResponse = { law };
    res.json(response);
  } catch (err: any) {
    if (err && err.message === "NOT_FOUND") return res.status(404).json({ error: "Ley no encontrada" });
    if (err && err.message === "ALREADY_VOTED") return res.status(400).json({ error: "Ya votaste esta ley" });
    res.status(500).json({ error: "Error al procesar voto" });
  }
};

export const saveLaw: RequestHandler = async (req, res) => {
  const { id } = req.params;
  try {
    const law = await db.saveLaw(id);
    const response: LawUpdatedResponse = { law };
    res.json(response);
  } catch (err: any) {
    if (err && err.message === "NOT_FOUND") return res.status(404).json({ error: "Ley no encontrada" });
    res.status(500).json({ error: "Error al guardar ley" });
  }
};

export const commentLaw: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { texto } = req.body as CommentInput;
  if (!texto || typeof texto !== "string") return res.status(400).json({ error: "Comentario requerido" });
  try {
    const law = await db.commentLaw(id, texto);
    const response: LawUpdatedResponse = { law };
    res.json(response);
  } catch (err: any) {
    if (err && err.message === "NOT_FOUND") return res.status(404).json({ error: "Ley no encontrada" });
    res.status(500).json({ error: "Error al guardar comentario" });
  }
};

export const ranking: RequestHandler = async (req, res) => {
  const range = (req.query.range as TimeRange) || "all";
  try {
    const items = await db.ranking(range);
    const response: RankingResponse = { items };
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener ranking" });
  }
};
