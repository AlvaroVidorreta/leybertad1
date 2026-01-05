import { RequestHandler } from "express";
import { ProfileSchema } from "@shared/schemas";
import { db } from "../db";
import { getVisitorKey } from "../utils/visitor";

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
    const validated = ProfileSchema.parse(req.body || {});
    const updated = await db.setProfile(visitor, validated);
    res.json({ ok: true, profile: updated });
  } catch (err: any) {
    // Handle validation errors
    if (err.name === "ZodError") {
      const messages = err.errors
        .map((e: any) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return res.status(400).json({ error: `Validación fallida: ${messages}` });
    }

    // eslint-disable-next-line no-console
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Error al guardar perfil" });
  }
};
