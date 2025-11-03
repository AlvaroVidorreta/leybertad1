import { useEffect } from "react";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";

// Keeps React Query cache keys 'recientes' and 'ranking' in sync with Realtime Database '/laws'
export default function useFirebaseSync() {
  const qc = useQueryClient();

  useEffect(() => {
    try {
      const r = dbRef(db, "laws");
      const unsub = onValue(r, (snap) => {
        const val = snap.val();
        if (!val) {
          qc.setQueryData(["recientes"], []);
          qc.setQueryData(["ranking"], []);
          return;
        }
        // val expected to be { id: { ...law } }
        const items = Object.entries(val).map(([id, data]) => ({ id, ...(data as any) }));
        // sort by createdAt desc if present
        items.sort((a: any, b: any) => (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0));
        qc.setQueryData(["recientes"], items);
        qc.setQueryData(["ranking"], items.slice().sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0)));
      });
      return () => unsub();
    } catch (err) {
      // ignore
    }
  }, [qc]);
}
