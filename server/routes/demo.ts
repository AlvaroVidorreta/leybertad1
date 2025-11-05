import { RequestHandler } from "express";
import { DemoResponse } from "@shared/api";

export const handleDemo: RequestHandler = async (req, res) => {
  // Basic demo response when no special action requested
  const action = String(req.query.action || '');
  const run = String(req.query.run || '');
  if (action !== 'auth-check' && run !== 'protected') {
    const response: DemoResponse = { message: 'Hello from Express server' };
    return res.status(200).json(response);
  }

  try {
    const { getAdmin, verifyIdToken } = await import('../utils/firebaseAdmin');
    const admin = await getAdmin();
    if (!admin) return res.status(500).json({ ok: false, error: 'Firebase Admin not initialized' });

    const uid = `integration-test-${Date.now()}`;
    const customToken = await admin.auth().createCustomToken(uid);

    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing Firebase API key' });

    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });

    const body = await resp.json();
    if (!resp.ok) return res.status(500).json({ ok: false, error: 'Failed exchanging custom token', details: body });

    const idToken = body.idToken;
    if (!idToken) return res.status(500).json({ ok: false, error: 'No idToken in response', details: body });

    const decoded = await verifyIdToken(idToken);
    if (!decoded) return res.status(500).json({ ok: false, error: 'Token verification failed' });

    // If only auth-check requested, return now
    if (action === 'auth-check' && run !== 'protected') {
      return res.json({ ok: true, uid: decoded.uid, token_issued_at: decoded.iat || null });
    }

    // Protected tests: use internal DB methods directly to avoid HTTP self-calls
    const { db } = await import('../db');
    try {
      const visitorKey = `integration-demo-${Date.now()}`;
      const createdLaw = await db.createLaw({ titulo: 'Prueba integracion', objetivo: 'Test automático', apodo: 'auto' }, visitorKey);
      const lawId = createdLaw.id;

      // Save with verified uid
      let saveResult: any = null;
      try {
        const saved = await db.saveLaw(lawId, decoded.uid);
        saveResult = { ok: true, saved };
      } catch (e: any) {
        saveResult = { ok: false, error: String(e && (e.message || e)) };
      }

      // Comment with verified uid
      let commentResult: any = null;
      try {
        const commented = await db.commentLaw(lawId, 'Comentario de prueba automatizado', decoded.uid);
        commentResult = { ok: true, commented };
      } catch (e: any) {
        commentResult = { ok: false, error: String(e && (e.message || e)) };
      }

      return res.json({ ok: true, uid: decoded.uid, lawId, create: createdLaw, save: saveResult, comment: commentResult });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: 'Failed to create law', details: String(e && (e.message || e)) });
    }
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: String(err && (err.message || err)) });
  }
};
