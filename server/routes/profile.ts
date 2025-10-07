import { RequestHandler } from "express";
import { db } from "../db";

function getVisitorKey(req: any) {
  const header = req.headers && (req.headers["x-visitor-id"] || req.headers["x-visitorid"]);
  if (header && typeof header === "string" && header.trim()) return header;
  return req.ip || (req.connection && req.connection.remoteAddress) || "unknown";
}

export const profileHandler: RequestHandler = async (req, res) => {
  const visitor = getVisitorKey(req);
  try {
    const data = await db.rawData();
    const createdTimestamps = data.creationsByVisitor[visitor] || [];

    const created = data.laws.filter((l) => createdTimestamps.includes(l.createdAt));
    const votedIds = data.votesByVisitor[visitor] || [];
    const voted = data.laws.filter((l) => votedIds.includes(l.id));

    const displayName = `Usuario ${String(visitor).slice(0, 8)}`;
    const username = `@${String(visitor).slice(0, 8)}`;

    res.json({ displayName, username, created, voted });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener perfil" });
  }
};
