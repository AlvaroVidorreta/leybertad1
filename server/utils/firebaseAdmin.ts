// Centralized Firebase Admin initialization and helpers
import type { App } from "firebase-admin/app";

let cachedAdmin: App | null = null;

export async function getAdmin(): Promise<App | null> {
  if (cachedAdmin) return cachedAdmin;
  try {
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT as string | undefined;
    if (!svc) return null;

    let svcObj: Record<string, unknown> | null = null;
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
        credential: admin.credential.cert(svcObj as Record<string, unknown>),
        projectId:
          (svcObj as any).project_id || process.env.FIREBASE_PROJECT_ID,
      });
    }

    cachedAdmin = admin.app();
    // eslint-disable-next-line no-console
    console.info("Firebase Admin initialized successfully");
    return cachedAdmin;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      "Firebase Admin init failed in helper:",
      e && (e as Error).message,
    );
    return null;
  }
}

export interface FirebaseDecodedToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

export async function verifyIdToken(
  idToken: string,
): Promise<FirebaseDecodedToken | null> {
  try {
    const admin = await getAdmin();
    if (!admin) return null;

    const decoded = await admin
      .auth()
      .verifyIdToken(idToken)
      .catch(() => null);

    return decoded as FirebaseDecodedToken | null;
  } catch (e) {
    return null;
  }
}
