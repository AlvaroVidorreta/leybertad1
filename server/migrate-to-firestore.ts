#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

async function main() {
  const DATA_FILE = path.resolve(process.cwd(), "server", "data", "db.json");
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);

    // dynamic import firebase-admin
    const admin = await import("firebase-admin");
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!svc) {
      console.error("FIREBASE_SERVICE_ACCOUNT env var not found");
      process.exit(1);
    }
    let svcObj: any = null;
    try {
      svcObj = JSON.parse(svc);
    } catch (e) {
      svcObj = JSON.parse(Buffer.from(svc, "base64").toString("utf-8"));
    }
    admin.initializeApp({
      credential: admin.credential.cert(svcObj),
      projectId: svcObj.project_id || process.env.FIREBASE_PROJECT_ID,
    });
    const firestore = admin.firestore();

    console.log("Starting migration to Firestore...");

    // Migrate laws
    const laws = data.laws || [];
    for (const l of laws) {
      const docRef = firestore.collection("laws").doc(l.id);
      const payload = { ...l, authorVisitor: l.authorVisitor || null };
      await docRef.set(payload);
      console.log("Migrated law", l.id);
    }

    // Migrate profiles
    const profiles = data.profiles || {};
    for (const k of Object.keys(profiles)) {
      await firestore.collection("profiles").doc(k).set(profiles[k]);
      console.log("Migrated profile", k);
    }

    console.log("Migration complete. Verify data in Firestore console.");
  } catch (err) {
    console.error("Migration failed", err);
    process.exit(1);
  }
}

main();
