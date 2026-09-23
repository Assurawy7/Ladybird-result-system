#!/usr/bin/env node
/* ==========================================================================
   scripts/migrate-firebase-to-neon.js
   COPIES (does not delete) the live Firebase data into Neon:
     Firestore records/core  -> Neon school_state (id=1)
     Firestore media/*       -> Neon media

   This is a one-time cutover tool, run locally by you (never deployed to
   Netlify - it needs a Firebase service-account key, which must never be
   committed or set as a public environment variable). See docs/migration.md
   for the full walkthrough.

   Usage:
     FIREBASE_SERVICE_ACCOUNT=./service-account.json \
     DATABASE_URL=postgresql://... \
     node scripts/migrate-firebase-to-neon.js

   Preserves every existing ID exactly as-is (master prompt section 26/27) -
   this script does not regenerate a single id. Existing plaintext
   `password` fields on state.users are converted to bcrypt `passwordHash`
   here (never written to Neon as plaintext) - see hashIncomingPasswords()
   in netlify/functions/_state.js for the equivalent runtime shim used for
   any *new* password afterwards.

   NOT YET TESTED AGAINST A REAL FIREBASE PROJECT OR NEON DATABASE: this
   environment has no network access, so this script has only been
   syntax-checked (`node --check`), never run end-to-end. Please run it
   first against a COPY/staging Neon database and compare against
   verify-migration.js's report before pointing it at production.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Pool } = require("@neondatabase/serverless");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }

  const admin = require("firebase-admin");
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saPath) {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT is not set. Point it at a local Firebase\n" +
      "service-account JSON key file (Firebase console -> Project settings ->\n" +
      "Service accounts -> Generate new private key). Never commit this file."
    );
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(saPath), "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const firestore = admin.firestore();

  console.log("Connecting to Neon...");
  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    console.log("Reading Firestore records/core ...");
    const coreSnap = await firestore.collection("records").doc("core").get();
    if (!coreSnap.exists) {
      console.error("records/core does not exist in this Firebase project - nothing to migrate.");
      process.exit(1);
    }
    const coreData = coreSnap.data();

    // Device-local / sync-internal fields never belonged in the shared
    // document, and _rev/_lastWriter are superseded by Neon's own
    // `revision` column (see db/schema.sql).
    delete coreData.currentUser;
    delete coreData.view;
    delete coreData.viewParams;
    delete coreData._rev;
    delete coreData._lastWriter;

    console.log("Reading Firestore media/* ...");
    const mediaSnap = await firestore.collection("media").get();
    const mediaDocs = [];
    mediaSnap.forEach((doc) => mediaDocs.push({ key: doc.id, data: doc.data() }));
    console.log(`Found ${mediaDocs.length} media document(s).`);

    // Convert plaintext passwords to bcrypt hashes before anything touches Neon.
    const users = coreData.users || [];
    let hashedCount = 0;
    for (const u of users) {
      if (u.password) {
        u.passwordHash = await bcrypt.hash(String(u.password), 10);
        delete u.password;
        hashedCount++;
      }
    }
    console.log(`Hashed ${hashedCount} plaintext password(s).`);

    await client.query("BEGIN");

    console.log("Writing school_state (revision 1) ...");
    await client.query(
      `INSERT INTO school_state (id, state, revision, updated_at, updated_by)
       VALUES (1, $1, 1, NOW(), 'migration')
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, revision = school_state.revision + 1,
         updated_at = NOW(), updated_by = 'migration'`,
      [JSON.stringify(coreData)]
    );

    console.log("Writing media rows ...");
    for (const m of mediaDocs) {
      if (!m.data || !m.data.dataUrl) continue;
      await client.query(
        `INSERT INTO media (key, data_url, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET data_url = EXCLUDED.data_url, updated_at = NOW()`,
        [m.key, m.data.dataUrl]
      );
    }

    await client.query("COMMIT");
    console.log("Migration committed.");

    // ---- summary report (compare against verify-migration.js output) ----
    const counts = {
      students: (coreData.students || []).length,
      users: (coreData.users || []).length,
      subjects: (coreData.subjects || []).length,
      classArms: (coreData.classArms || []).length,
      departments: (coreData.departments || []).length,
      teacherAssignments: (coreData.teacherAssignments || []).length,
      formTeacherAssignments: (coreData.formTeacherAssignments || []).length,
      scores: (coreData.scores || []).length,
      studentComments: Object.keys(coreData.studentComments || {}).length,
      auditLog: (coreData.auditLog || []).length,
      media: mediaDocs.length,
    };
    console.log("\nFirebase -> Neon record counts (source of truth for verify-migration.js):");
    Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log(
      "\nFirebase data was NOT deleted (this is a copy, not a move - see master\n" +
      "prompt section 86). Run scripts/verify-migration.js next to confirm counts\n" +
      "and referential integrity, then test login/live-sync/reports before\n" +
      "removing the Firebase SDK from index.html (already done in this repo) and\n" +
      "eventually decommissioning the Firebase project itself."
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Migration failed, rolled back:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
