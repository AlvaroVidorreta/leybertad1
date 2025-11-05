import { RequestHandler } from "express";
import { db } from "../db";

function getVisitorKey(req: any) {
  const header =
    req.headers && (req.headers["x-visitor-id"] || req.headers["x-visitorid"]);
  if (header && typeof header === "string" && header.trim()) return header;
  return (
    req.ip || (req.connection && req.connection.remoteAddress) || "unknown"
  );
}

export const profileHandler: RequestHandler = async (req, res) => {
  const visitor = getVisitorKey(req);
  try {
    const data = await db.rawData();
    const createdTimestamps = data.creationsByVisitor[visitor] || [];

    const created = data.laws.filter((l) =>
      createdTimestamps.includes(l.createdAt),
    );
    const votedIds = data.votesByVisitor[visitor] || [];
    const voted = data.laws.filter((l) => votedIds.includes(l.id));

    // base defaults
    const defaultDisplayName = `Usuario ${String(visitor).slice(0, 8)}`;
    const defaultUsername = `@${String(visitor).slice(0, 8)}`;

    // apply persisted profile overrides if any
    const persisted = await db.getProfile(visitor);
    const displayName =
      (persisted && persisted.displayName) || defaultDisplayName;
    const username = (persisted && persisted.username) || defaultUsername;

    res.json({ displayName, username, created, voted });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener perfil" });
  }
};

export const profileUpdateHandler: RequestHandler = async (req, res) => {
  const visitor = getVisitorKey(req);
  try {
    const body = req.body || {};
    const patch: { displayName?: string; username?: string } = {};
    if (typeof body.displayName === "string")
      patch.displayName = String(body.displayName).slice(0, 100);
    if (typeof body.username === "string")
      patch.username = String(body.username).slice(0, 60);
    const updated = await db.setProfile(visitor, patch);
    res.json({ ok: true, profile: updated });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar perfil" });
  }
};
