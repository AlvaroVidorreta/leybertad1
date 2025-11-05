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

    // Protected tests: create a law, then call save and comment endpoints using the idToken
    const base = `http://localhost:8080`;

    // 1) Create a new law via server endpoint (no auth required)
    const createResp = await fetch(`${base}/api/laws`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Prueba integracion', objetivo: 'Test automático', apodo: 'auto' }),
    });
    const createdBody = await createResp.json().catch(() => ({}));
    if (!createResp.ok || !createdBody || !createdBody.law || !createdBody.law.id) {
      return res.status(500).json({ ok: false, error: 'Failed to create law', details: createdBody });
    }
    const lawId = createdBody.law.id;

    // 2) Call save endpoint with Authorization header
    const saveResp = await fetch(`${base}/api/laws/${encodeURIComponent(lawId)}/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const saveBody = await saveResp.json().catch(() => ({}));

    // 3) Call comment endpoint with Authorization header
    const commentResp = await fetch(`${base}/api/laws/${encodeURIComponent(lawId)}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ texto: 'Comentario de prueba automatizado' }),
    });
    const commentBody = await commentResp.json().catch(() => ({}));

    return res.json({ ok: true, uid: decoded.uid, lawId, create: createdBody, save: { status: saveResp.status, body: saveBody }, comment: { status: commentResp.status, body: commentBody } });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: String(err && (err.message || err)) });
  }
};
