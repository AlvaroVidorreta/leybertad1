// Centralized Firebase Admin initialization and helpers
let cachedAdmin: any = null;

export async function getAdmin() {
  if (cachedAdmin) return cachedAdmin;
  try {
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT as string | undefined;
    if (!svc) return null;
    let svcObj: any = null;
    try {
      svcObj = JSON.parse(svc);
    } catch (e) {
      try {
        svcObj = JSON.parse(Buffer.from(svc || "", "base64").toString("utf-8"));
      } catch (err) {
        svcObj = null;
      }
    }
    if (!svcObj) return null;
    const _mod = await import("firebase-admin");
    const admin = (_mod && (_mod.default || _mod)) || _mod;
    if (!admin.apps || !admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(svcObj),
        projectId: svcObj.project_id || process.env.FIREBASE_PROJECT_ID,
      });
    }
    cachedAdmin = admin;
    // eslint-disable-next-line no-console
    console.info("Firebase Admin initialized successfully");
    return cachedAdmin;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      "Firebase Admin init failed in helper:",
      e && (e.message || e),
    );
    return null;
  }
}

export async function verifyIdToken(idToken: string) {
  try {
    const admin = await getAdmin();
    if (!admin) return null;
    const decoded = await admin
      .auth()
      .verifyIdToken(idToken)
      .catch(() => null);
    return decoded || null;
  } catch (e) {
    return null;
  }
}
