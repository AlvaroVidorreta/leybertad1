import { initializeApp, getApp, getApps } from "firebase/app";
import * as firebaseApp from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const FIREBASE_ENABLED = Boolean(firebaseConfig.apiKey);

// Basic validation to surface clearer errors in development
if (!FIREBASE_ENABLED) {
  // eslint-disable-next-line no-console
  console.error("Missing Firebase API key (VITE_FIREBASE_API_KEY). Authentication will fail.");
}

let app: any = null;
let auth: any = null;
let googleProvider: any = null;
let db: any = null;
let storage: any = null;

if (FIREBASE_ENABLED) {
  app = !firebaseApp.getApps().length ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.getApp();
  try {
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    db = getDatabase(app);
    storage = getStorage(app);
  } catch (e) {
    // If something goes wrong initializing, ensure we don't crash the whole app. Log and continue with disabled mode.
    // eslint-disable-next-line no-console
    console.error('Firebase initialization failed', e);
    auth = null;
    googleProvider = null;
    db = null;
    storage = null;
    app = null;
  }
}

export { auth, googleProvider, db, storage };
export default app;
