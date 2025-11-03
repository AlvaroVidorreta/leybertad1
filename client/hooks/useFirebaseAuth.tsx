import { useEffect, useState, useCallback } from "react";
import React, { useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously as fbSignInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  }, []);

  // Try popup first, fallback to redirect when popups are blocked or not supported.
  const signInWithGoogle = useCallback(async () => {
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
    return fbSignInAnonymously(auth);
  }, []);

  const signOut = useCallback(async () => {
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
