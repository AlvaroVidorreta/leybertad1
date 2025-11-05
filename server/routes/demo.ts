import { RequestHandler } from "express";
import { DemoResponse } from "@shared/api";

export const handleDemo: RequestHandler = async (req, res) => {
  // Basic demo response
  if (String(req.query.action || '') !== 'auth-check') {
    const response: DemoResponse = { message: 'Hello from Express server' };
    return res.status(200).json(response);
  }

  // Run an auth connectivity check: initialize admin, create custom token, exchange for idToken, verify
  try {
    const { getAdmin, verifyIdToken } = await import('../utils/firebaseAdmin');
    const admin = await getAdmin();
    if (!admin) return res.status(500).json({ ok: false, error: 'Firebase Admin not initialized' });

    const uid = `integration-test-${Date.now()}`;
    // create custom token
    const customToken = await admin.auth().createCustomToken(uid);

    // exchange custom token for idToken via Identity Toolkit REST API
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

    // verify id token via helper
    const decoded = await verifyIdToken(idToken);
    if (!decoded) return res.status(500).json({ ok: false, error: 'Token verification failed' });

    return res.json({ ok: true, uid: decoded.uid, token_issued_at: decoded.iat || null });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: String(err && (err.message || err)) });
  }
};
