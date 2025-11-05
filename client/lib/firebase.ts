import { initializeApp, getApp, getApps } from "firebase/app";
import * as firebaseApp from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Prefer build-time Vite env, but also support runtime injection via window.__env or process.env
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_API_KEY) || (typeof process !== 'undefined' && (process.env as any).VITE_FIREBASE_API_KEY) || '';
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_AUTH_DOMAIN) || '';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_PROJECT_ID) || '';
const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_DATABASE_URL) || (typeof process !== 'undefined' && (process.env as any).VITE_FIREBASE_DATABASE_URL) || '';
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_STORAGE_BUCKET) || '';
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '';
const appId = import.meta.env.VITE_FIREBASE_APP_ID || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_APP_ID) || '';
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_MEASUREMENT_ID) || '';

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  databaseURL,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId,
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
    // auth is safe to initialize with apiKey
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

    // initialize Realtime Database only when we have a databaseURL or projectId
    const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL || (typeof window !== 'undefined' && (window as any).__env?.VITE_FIREBASE_DATABASE_URL) || (typeof process !== 'undefined' && (process.env as any).VITE_FIREBASE_DATABASE_URL) || '';
    const haveDbConfig = Boolean(databaseURL || projectId);
    if (haveDbConfig) {
      try {
        db = databaseURL ? getDatabase(app, databaseURL) : getDatabase(app);
      } catch (e) {
        // don't treat as fatal; log and continue without db
        // eslint-disable-next-line no-console
        console.warn('Firebase Realtime Database not available or misconfigured, continuing without db.', e);
        db = null;
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('Skipping Realtime Database initialization: missing VITE_FIREBASE_DATABASE_URL or projectId');
    }

    // initialize Storage only if storageBucket provided
    if (storageBucket) {
      try {
        storage = getStorage(app);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Firebase Storage not available or misconfigured, continuing without storage.', e);
        storage = null;
      }
    } else {
      storage = null;
    }
  } catch (e) {
    // If something goes wrong initializing critical parts, ensure we don't crash the whole app. Log and continue with disabled mode.
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
