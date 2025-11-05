import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Comment, Law, LawInput, TimeRange } from "@shared/api";

const DATA_FILE = path.resolve(process.cwd(), "server", "data", "db.json");

// Optional: initialize Firebase client SDK on the server side when a Realtime Database URL is provided.
// This lets us mirror perspectives (comments) to Firebase if the environment is configured.
let firebaseDb: any = null;
(async function initFirebase() {
  try {
    const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_REALTIME_DATABASE_URL;
    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
    if (!databaseURL) return;
    const { initializeApp, getApps } = await import('firebase/app');
    const { getDatabase } = await import('firebase/database');
    const config = { apiKey: apiKey || '', databaseURL };
    if (!getApps().length) initializeApp(config as any);
    firebaseDb = getDatabase();
  } catch (e) {
    // If initialization fails, continue without Firebase mirroring.
    // eslint-disable-next-line no-console
    console.warn('Firebase init skipped or failed on server:', e && (e.message || e));
    firebaseDb = null;
  }
})();

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

// Try to initialize Firebase Admin SDK (Firestore) using service account from env
let firestore: any = null;
let admin: any = null;
(async function initAdmin() {
  try {
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!svc) return;
    let svcObj: any = null;
    try {
      svcObj = JSON.parse(svc);
    } catch (e) {
      // maybe base64
      try {
        const decoded = Buffer.from(svc, 'base64').toString('utf-8');
        svcObj = JSON.parse(decoded);
      } catch (err) {
        svcObj = null;
      }
    }
    if (!svcObj) return;
    { const _mod = await import('firebase-admin'); admin = (_mod && (_mod.default || _mod)) || _mod; }
    if (!admin.apps || !admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(svcObj),
        projectId: svcObj.project_id || process.env.FIREBASE_PROJECT_ID,
      });
    }
    firestore = admin.firestore();
    // ensure timestampsInSnapshots behavior not needed in modern SDK
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Firebase Admin init failed, continuing with local DB:', e && (e.message || e));
    firestore = null;
  }
})();

export const db = {
  async createLaw(input: LawInput, visitorKey: string) {
    // If Firestore available, use it as primary
    if (firestore) {
      const now = nowISO();
      // rate limit: count creations in last 24h
      const dayMs = 24 * 60 * 60 * 1000;
      const since = new Date(Date.now() - dayMs).toISOString();
      const q = firestore.collection('laws').where('authorVisitor', '==', visitorKey).where('createdAt', '>=', since);
      const snap = await q.get();
      if (snap.size >= 5) throw new Error('RATE_LIMIT_EXCEEDED');

      const docRef = firestore.collection('laws').doc();
      const law: Law = {
        id: docRef.id,
        titulo: String(input.titulo).slice(0, 500),
        objetivo: String(input.objetivo).slice(0, 200),
        detalles: input.detalles ? String(input.detalles).slice(0, 2000) : undefined,
        apodo: input.apodo ? String(input.apodo).slice(0, 60) : undefined,
        createdAt: now,
        upvotes: 0,
        saves: 0,
        comentarios: [],
      };
      await docRef.set({ ...law, authorVisitor: visitorKey });
      return law;
    }

    // fallback to local file
    const data = await readData();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const existing = data.creationsByVisitor[visitorKey] ?? [];
    const recent = existing.filter((ts) => now - Date.parse(ts) <= dayMs);
    if (recent.length >= 5) {
      throw new Error('RATE_LIMIT_EXCEEDED');
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
    if (firestore) {
      const snap = await firestore.collection('laws').orderBy('createdAt', 'desc').get();
      const items: Law[] = [];
      snap.forEach((doc: any) => {
        const d = doc.data();
        items.push({
          id: doc.id,
          titulo: d.titulo,
          objetivo: d.objetivo,
          detalles: d.detalles,
          apodo: d.apodo,
          createdAt: d.createdAt,
          upvotes: d.upvotes || 0,
          saves: d.saves || 0,
          comentarios: d.comentarios || [],
        });
      });
      return items;
    }

    const data = await readData();
    return [...data.laws].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async upvoteLaw(id: string, visitorKey: string) {
    if (firestore) {
      const lawRef = firestore.collection('laws').doc(id);
      const voteRef = lawRef.collection('votes').doc(visitorKey);
      return await firestore.runTransaction(async (tx: any) => {
        const voteDoc = await tx.get(voteRef);
        if (voteDoc.exists) throw new Error('ALREADY_VOTED');
        const lawDoc = await tx.get(lawRef);
        if (!lawDoc.exists) throw new Error('NOT_FOUND');
        tx.set(voteRef, { createdAt: nowISO() });
        const current = lawDoc.data().upvotes || 0;
        tx.update(lawRef, { upvotes: current + 1 });
        const updated = await tx.get(lawRef);
        const d = updated.data();
        return {
          id: updated.id,
          titulo: d.titulo,
          objetivo: d.objetivo,
          detalles: d.detalles,
          apodo: d.apodo,
          createdAt: d.createdAt,
          upvotes: d.upvotes || 0,
          saves: d.saves || 0,
          comentarios: d.comentarios || [],
        } as Law;
      });
    }

    const data = await readData();
    const law = data.laws.find((l) => l.id === id);
    if (!law) throw new Error('NOT_FOUND');
    const visited = new Set(data.votesByVisitor[visitorKey] ?? []);
    if (visited.has(id)) throw new Error('ALREADY_VOTED');
    visited.add(id);
    data.votesByVisitor[visitorKey] = Array.from(visited);
    law.upvotes = (law.upvotes || 0) + 1;
    await writeData(data);
    return law;
  },

  async saveLaw(id: string, userId?: string) {
    if (firestore) {
      const lawRef = firestore.collection('laws').doc(id);
      await lawRef.update({ saves: admin.firestore.FieldValue.increment(1) });

      // If userId provided, add this law id to the user's profile saved list
      if (userId) {
        try {
          await firestore.collection('profiles').doc(userId).set({ saved: admin.firestore.FieldValue.arrayUnion(id) }, { merge: true });
        } catch (e) {
          // non-fatal
        }
      }

      const d = (await lawRef.get()).data();
      return {
        id: id,
        titulo: d.titulo,
        objetivo: d.objetivo,
        detalles: d.detalles,
        apodo: d.apodo,
        createdAt: d.createdAt,
        upvotes: d.upvotes || 0,
        saves: d.saves || 0,
        comentarios: d.comentarios || [],
      } as Law;
    }

    const data = await readData();
    const law = data.laws.find((l) => l.id === id);
    if (!law) throw new Error('NOT_FOUND');
    law.saves = (law.saves || 0) + 1;

    if (userId) {
      data.profiles = data.profiles || {};
      const profile = data.profiles[userId] || {} as any;
      const saved = new Set<string>(Array.isArray(profile.saved) ? profile.saved : []);
      saved.add(id);
      profile.saved = Array.from(saved);
      data.profiles[userId] = profile;
    }

    await writeData(data);
    return law;
  },

  async commentLaw(id: string, texto: string, author?: string) {
    if (firestore) {
      const trimmed = String(texto).slice(0, 200);
      const comment: any = { id: randomUUID(), texto: trimmed, createdAt: nowISO() };
      if (author) comment.author = author;
      const lawRef = firestore.collection('laws').doc(id);
      const lawDoc = await lawRef.get();
      if (!lawDoc.exists) throw new Error('NOT_FOUND');
      await lawRef.update({ comentarios: admin.firestore.FieldValue.arrayUnion(comment) });
      const d = (await lawRef.get()).data();
      return {
        id: id,
        titulo: d.titulo,
        objetivo: d.objetivo,
        detalles: d.detalles,
        apodo: d.apodo,
        createdAt: d.createdAt,
        upvotes: d.upvotes || 0,
        saves: d.saves || 0,
        comentarios: d.comentarios || [],
      } as Law;
    }

    const data = await readData();
    const law = data.laws.find((l) => l.id === id);
    if (!law) throw new Error('NOT_FOUND');
    const trimmed = String(texto).slice(0, 200);
    const comment: any = { id: randomUUID(), texto: trimmed, createdAt: nowISO() };
    if (author) comment.author = author;

    // Append locally
    law.comentarios.push(comment);
    await writeData(data);

    // Mirror to Firebase Realtime Database if available (non-fatal)
    if (firebaseDb) {
      try {
        const { ref, push } = await import('firebase/database');
        // push under /perspectives/{lawId}/
        const nodeRef = ref(firebaseDb, `perspectives/${id}`);
        await push(nodeRef, comment as any);
      } catch (err) {
        // ignore firebase errors — keep local persistence as primary
        // eslint-disable-next-line no-console
        console.warn('Failed to mirror comment to Firebase:', err && (err.message || err));
      }
    }

    return law;
  },

  async ranking(range: TimeRange) {
    if (firestore) {
      const items: Law[] = [];
      const snap = await firestore.collection('laws').get();
      snap.forEach((doc: any) => {
        const d = doc.data();
        if (withinRange(d.createdAt, range)) items.push({ id: doc.id, titulo: d.titulo, objetivo: d.objetivo, detalles: d.detalles, apodo: d.apodo, createdAt: d.createdAt, upvotes: d.upvotes || 0, saves: d.saves || 0, comentarios: d.comentarios || [] });
      });
      items.sort((a, b) => b.upvotes - a.upvotes || (a.createdAt < b.createdAt ? 1 : -1));
      return items;
    }

    const data = await readData();
    const items = data.laws
      .filter((l) => withinRange(l.createdAt, range))
      .sort((a, b) => b.upvotes - a.upvotes || (a.createdAt < b.createdAt ? 1 : -1));
    return items;
  },

  async rawData() {
    if (firestore) {
      const all: any = { laws: [], creationsByVisitor: {}, votesByVisitor: {}, profiles: {} };
      const snap = await firestore.collection('laws').get();
      snap.forEach((doc: any) => {
        const d = doc.data();
        all.laws.push({ id: doc.id, titulo: d.titulo, objetivo: d.objetivo, detalles: d.detalles, apodo: d.apodo, createdAt: d.createdAt, upvotes: d.upvotes || 0, saves: d.saves || 0, comentarios: d.comentarios || [] });
      });
      const profilesSnap = await firestore.collection('profiles').get();
      profilesSnap.forEach((p: any) => {
        all.profiles[p.id] = p.data();
      });
      return all;
    }

    return await readData();
  },

  async getProfile(visitorKey: string) {
    if (firestore) {
      const doc = await firestore.collection('profiles').doc(visitorKey).get();
      return doc.exists ? doc.data() : null;
    }
    const data = await readData();
    return (data.profiles || {})[visitorKey] || null;
  },

  async setProfile(visitorKey: string, payload: { displayName?: string; username?: string }) {
    if (firestore) {
      await firestore.collection('profiles').doc(visitorKey).set(payload, { merge: true });
      const doc = await firestore.collection('profiles').doc(visitorKey).get();
      return doc.data();
    }
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
