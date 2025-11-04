import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Comment, Law, LawInput, TimeRange } from "@shared/api";

const DATA_FILE = path.resolve(process.cwd(), "server", "data", "db.json");

type DataShape = {
  laws: Law[];
  creationsByVisitor: Record<string, string[]>;
  votesByVisitor: Record<string, string[]>;
  profiles?: Record<string, { displayName?: string; username?: string }>;
};

async function ensureDataFile() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.access(DATA_FILE);
  } catch (err) {
    const initial: DataShape = { laws: [], creationsByVisitor: {}, votesByVisitor: {}, profiles: {} };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

async function readData(): Promise<DataShape> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw) as DataShape;
    parsed.laws = parsed.laws || [];
    parsed.creationsByVisitor = parsed.creationsByVisitor || {};
    parsed.votesByVisitor = parsed.votesByVisitor || {};
    parsed.profiles = parsed.profiles || {};
    return parsed;
  } catch (err) {
    const initial: DataShape = { laws: [], creationsByVisitor: {}, votesByVisitor: {} };
    return initial;
  }
}

async function writeData(data: DataShape) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function nowISO() {
  return new Date().toISOString();
}

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

export const db = {
  async createLaw(input: LawInput, visitorKey: string) {
    const data = await readData();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const existing = data.creationsByVisitor[visitorKey] ?? [];
    const recent = existing.filter((ts) => now - Date.parse(ts) <= dayMs);
    if (recent.length >= 5) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    const law: Law = {
      id: randomUUID(),
      titulo: String(input.titulo).slice(0, 500),
      objetivo: String(input.objetivo).slice(0, 200),
      detalles: input.detalles ? String(input.detalles).slice(0, 2000) : undefined,
      apodo: input.apodo ? String(input.apodo).slice(0, 60) : undefined,
      createdAt: nowISO(),
      upvotes: 0,
      saves: 0,
      comentarios: [],
    };

    data.laws.unshift(law);
    const pushed = recent.concat([law.createdAt]);
    data.creationsByVisitor[visitorKey] = pushed;
    await writeData(data);
    return law;
  },

  async listRecent() {
    const data = await readData();
    return [...data.laws].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async upvoteLaw(id: string, visitorKey: string) {
    const data = await readData();
    const law = data.laws.find((l) => l.id === id);
    if (!law) throw new Error("NOT_FOUND");
    const visited = new Set(data.votesByVisitor[visitorKey] ?? []);
    if (visited.has(id)) throw new Error("ALREADY_VOTED");
    visited.add(id);
    data.votesByVisitor[visitorKey] = Array.from(visited);
    law.upvotes = (law.upvotes || 0) + 1;
    await writeData(data);
    return law;
  },

  async saveLaw(id: string) {
    const data = await readData();
    const law = data.laws.find((l) => l.id === id);
    if (!law) throw new Error("NOT_FOUND");
    law.saves = (law.saves || 0) + 1;
    await writeData(data);
    return law;
  },

  async commentLaw(id: string, texto: string) {
    const data = await readData();
    const law = data.laws.find((l) => l.id === id);
    if (!law) throw new Error("NOT_FOUND");
    const trimmed = String(texto).slice(0, 200);
    const comment: Comment = { id: randomUUID(), texto: trimmed, createdAt: nowISO() };
    law.comentarios.push(comment);
    await writeData(data);
    return law;
  },

  async ranking(range: TimeRange) {
    const data = await readData();
    const items = data.laws
      .filter((l) => withinRange(l.createdAt, range))
      .sort((a, b) => b.upvotes - a.upvotes || (a.createdAt < b.createdAt ? 1 : -1));
    return items;
  },

  async rawData() {
    return await readData();
  },

  async getProfile(visitorKey: string) {
    const data = await readData();
    return (data.profiles || {})[visitorKey] || null;
  },

  async setProfile(visitorKey: string, payload: { displayName?: string; username?: string }) {
    const data = await readData();
    data.profiles = data.profiles || {};
    data.profiles[visitorKey] = { ...(data.profiles[visitorKey] || {}), ...(payload || {}) };
    await writeData(data);
    return data.profiles[visitorKey];
  },
};

export async function tryInitSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    // @ts-ignore: optional dependency in some environments — suppress missing types during local typecheck
    const mod = await import("@supabase/supabase-js").catch(() => null);
    const { createClient } = (mod as any) || {};
    const supabase = createClient(url, key);
    return supabase;
  } catch (err) {
    return null;
  }
}
