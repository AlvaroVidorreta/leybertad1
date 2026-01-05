import { useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously as fbSignInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider, FIREBASE_ENABLED } from "@/lib/firebase";

export default function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!FIREBASE_ENABLED || !auth) {
      // No firebase available in this environment (e.g. embedded preview) — set defaults and skip listeners
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // If a redirect sign-in flow was used, getRedirectResult resolves with the credential or throws a descriptive error
    (async () => {
      try {
        await getRedirectResult(auth);
      } catch (err) {
        // Non-fatal: log for diagnostics, UI can still rely on onAuthStateChanged

        console.warn("Firebase redirect sign-in failed", err);
      }
    })();

    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!FIREBASE_ENABLED || !auth)
      return Promise.reject(new Error("Firebase not configured"));
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    if (!FIREBASE_ENABLED || !auth)
      return Promise.reject(new Error("Firebase not configured"));
    return createUserWithEmailAndPassword(auth, email, password);
  }, []);

  // Try popup first, fallback to redirect when popups are blocked or not supported.
  const signInWithGoogle = useCallback(async () => {
    if (!FIREBASE_ENABLED || !auth || !googleProvider)
      return Promise.reject(new Error("Firebase not configured"));
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      // If popup is blocked or not supported, try redirect flow.
      const code = err?.code || err?.message || "";
      if (
        code.includes("popup") ||
        code.includes("operation-not-supported") ||
        code.includes("auth/operation-not-supported-in-this-environment")
      ) {
        return signInWithRedirect(auth, googleProvider);
      }
      // rethrow other errors (like unauthorized domain) so UI can handle them
      throw err;
    }
  }, []);

  const signInAnonymous = useCallback(async () => {
    if (!FIREBASE_ENABLED || !auth)
      return Promise.reject(new Error("Firebase not configured"));
    return fbSignInAnonymously(auth);
  }, []);

  const signOut = useCallback(async () => {
    if (!FIREBASE_ENABLED || !auth)
      return Promise.reject(new Error("Firebase not configured"));
    return fbSignOut(auth);
  }, []);

  return {
    user,
    loading,
    signIn,
    register,
    signInWithGoogle,
    signInAnonymous,
    signOut,
  } as const;
}
