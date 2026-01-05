import { RequestHandler } from "express";
import {
  LawInput,
  CommentInput,
  CreateLawResponse,
  LawsResponse,
  LawUpdatedResponse,
  RankingResponse,
  TimeRange,
} from "@shared/api";
import { CreateLawSchema, CommentSchema } from "@shared/schemas";
import { db } from "../db";
import { getVisitorKey } from "../utils/visitor";

export const createLaw: RequestHandler = async (req, res) => {
  try {
    // Validate input against schema
    const validated = CreateLawSchema.parse(req.body);
    const visitor = getVisitorKey(req);

    const law = await db.createLaw(validated, visitor);
    const response: CreateLawResponse = { law };
    res.json(response);
  } catch (err: any) {
    // Handle validation errors
    if (err.name === "ZodError") {
      const messages = err.errors
        .map((e: any) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return res.status(400).json({ error: `Validación fallida: ${messages}` });
    }

    // Handle rate limit
    if (err && err.message === "RATE_LIMIT_EXCEEDED") {
      return res.status(429).json({
        error:
          "Límite alcanzado: solo 5 publicaciones por día para usuarios no registrados",
      });
    }

    // Log unexpected errors
    // eslint-disable-next-line no-console
    console.error("Error creating law:", err);
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
    if (err && err.message === "NOT_FOUND")
      return res.status(404).json({ error: "Ley no encontrada" });
    if (err && err.message === "ALREADY_VOTED")
      return res.status(400).json({ error: "Ya votaste esta ley" });
    res.status(500).json({ error: "Error al procesar voto" });
  }
};

export const saveLaw: RequestHandler = async (req, res) => {
  const { id } = req.params;

  // If Authorization header present, validate Firebase token and associate save with profile
  const authHeader =
    req.headers && (req.headers.authorization || req.headers.Authorization);
  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    const idToken = authHeader.replace(/^Bearer\s+/, "");
    // Use centralized admin helper to avoid repeated dynamic imports and parsing
    try {
      const { verifyIdToken } = await import("../utils/firebaseAdmin");
      const decoded = await verifyIdToken(idToken);
      if (!decoded) return res.status(401).json({ error: "Token inválido" });
      const uid = decoded.uid;

      try {
        const law = await db.saveLaw(id, uid);
        const response: LawUpdatedResponse = { law };
        return res.json(response);
      } catch (err: any) {
        if (err && err.message === "NOT_FOUND")
          return res.status(404).json({ error: "Ley no encontrada" });
        return res.status(500).json({ error: "Error al guardar ley" });
      }
    } catch (err) {
      return res.status(500).json({ error: "Error validating token" });
    }
  }

  // No auth header — still increment saves counter but do not associate with profile
  try {
    const law = await db.saveLaw(id);
    const response: LawUpdatedResponse = { law };
    res.json(response);
  } catch (err: any) {
    if (err && err.message === "NOT_FOUND")
      return res.status(404).json({ error: "Ley no encontrada" });
    res.status(500).json({ error: "Error al guardar ley" });
  }
};

export const commentLaw: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { texto } = req.body as CommentInput;
  if (!texto || typeof texto !== "string")
    return res.status(400).json({ error: "Perspectiva requerida" });

  // Require Firebase ID token in Authorization header
  const authHeader =
    req.headers && (req.headers.authorization || req.headers.Authorization);
  if (
    !authHeader ||
    typeof authHeader !== "string" ||
    !authHeader.startsWith("Bearer ")
  ) {
    return res.status(401).json({ error: "Autenticación requerida" });
  }
  const idToken = authHeader.replace(/^Bearer\s+/, "");

  try {
    const { verifyIdToken } = await import("../utils/firebaseAdmin");
    const decoded = await verifyIdToken(idToken);
    if (!decoded) return res.status(401).json({ error: "Token inválido" });
    const uid = decoded.uid;

    const law = await db.commentLaw(id, texto, uid);
    const response: LawUpdatedResponse = { law };
    res.json(response);
  } catch (err: any) {
    if (err && err.message === "NOT_FOUND")
      return res.status(404).json({ error: "Ley no encontrada" });
    res.status(500).json({ error: "Error al guardar perspectiva" });
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
