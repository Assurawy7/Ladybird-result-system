#!/usr/bin/env node
/* ==========================================================================
   scripts/verify-migration.js
   Run AFTER scripts/migrate-firebase-to-neon.js. Re-reads Firestore
   records/core and media/*, re-reads the Neon school_state row, and prints
   a side-by-side count comparison plus a referential-integrity check
   (broken foreign-key-style references would mean something was dropped
   or malformed during migration) - see master prompt sections 84/85.

   This performs no writes. Usage is identical to the migration script:
     FIREBASE_SERVICE_ACCOUNT=./service-account.json \
     DATABASE_URL=postgresql://... \
     node scripts/verify-migration.js

   NOT YET RUN: this environment has no network access, so this script has
   only been syntax-checked, never executed against real data.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("@neondatabase/serverless");

const COLLECTIONS_TO_COUNT = [
  "students", "users", "subjects", "classArms", "sections", "departments",
  "sessions", "terms", "assessmentSchemes", "gradingSchemes",
  "teacherAssignments", "formTeacherAssignments", "scores",
  "commentTemplates", "signatures", "affectiveDomains", "psychomotorDomains",
  "customFieldDefs", "reportTemplates", "auditLog",
];
const MAPS_TO_COUNT = ["classSubjectStatus", "classApproval", "studentComments", "domainScores", "attendance"];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!dbUrl || !saPath) {
    console.error("DATABASE_URL and FIREBASE_SERVICE_ACCOUNT are both required.");
    process.exit(1);
  }

  const admin = require("firebase-admin");
  const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(saPath), "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const firestore = admin.firestore();

  const coreSnap = await firestore.collection("records").doc("core").get();
  const fbState = coreSnap.exists ? coreSnap.data() : {};
  const mediaSnap = await firestore.collection("media").get();
  const fbMediaCount = mediaSnap.size;

  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  let neonState, neonMediaCount;
  try {
    const stateRes = await client.query("SELECT state, revision FROM school_state WHERE id = 1");
    neonState = (stateRes.rows[0] && stateRes.rows[0].state) || {};
    const mediaRes = await client.query("SELECT COUNT(*)::int AS n FROM media");
    neonMediaCount = mediaRes.rows[0].n;
  } finally {
    client.release();
    await pool.end();
  }

  console.log("Firebase vs Neon record counts:\n");
  let anyMismatch = false;
  function report(label, fbCount, neonCount) {
    const match = fbCount === neonCount;
    if (!match) anyMismatch = true;
    console.log(`  ${label.padEnd(26)} Firebase: ${String(fbCount).padEnd(6)} Neon: ${String(neonCount).padEnd(6)} MATCH: ${match ? "YES" : "NO"}`);
  }

  COLLECTIONS_TO_COUNT.forEach((key) => {
    report(key, (fbState[key] || []).length, (neonState[key] || []).length);
  });
  MAPS_TO_COUNT.forEach((key) => {
    report(key, Object.keys(fbState[key] || {}).length, Object.keys(neonState[key] || {}).length);
  });
  report("media", fbMediaCount, neonMediaCount);

  console.log("\nReferential integrity check (Neon state only):\n");
  const byId = (arr, id) => (arr || []).find((x) => x && x.id === id);
  const problems = [];

  (neonState.students || []).forEach((s) => {
    if (s.classArmId && !byId(neonState.classArms, s.classArmId)) problems.push(`student ${s.id} -> missing classArm ${s.classArmId}`);
    if (s.sectionId && !byId(neonState.sections, s.sectionId)) problems.push(`student ${s.id} -> missing section ${s.sectionId}`);
    if (s.departmentId && !byId(neonState.departments, s.departmentId)) problems.push(`student ${s.id} -> missing department ${s.departmentId}`);
  });
  (neonState.scores || []).forEach((sc) => {
    if (!byId(neonState.students, sc.studentId)) problems.push(`score ${sc.id} -> missing student ${sc.studentId}`);
    if (!byId(neonState.subjects, sc.subjectId)) problems.push(`score ${sc.id} -> missing subject ${sc.subjectId}`);
    if (!byId(neonState.classArms, sc.classArmId)) problems.push(`score ${sc.id} -> missing classArm ${sc.classArmId}`);
  });
  (neonState.teacherAssignments || []).forEach((a) => {
    if (!byId(neonState.users, a.teacherId)) problems.push(`teacherAssignment ${a.id} -> missing user ${a.teacherId}`);
    if (!byId(neonState.subjects, a.subjectId)) problems.push(`teacherAssignment ${a.id} -> missing subject ${a.subjectId}`);
    if (!byId(neonState.classArms, a.classArmId)) problems.push(`teacherAssignment ${a.id} -> missing classArm ${a.classArmId}`);
  });
  (neonState.formTeacherAssignments || []).forEach((a) => {
    if (!byId(neonState.users, a.teacherId)) problems.push(`formTeacherAssignment ${a.id} -> missing user ${a.teacherId}`);
    if (!byId(neonState.classArms, a.classArmId)) problems.push(`formTeacherAssignment ${a.id} -> missing classArm ${a.classArmId}`);
  });

  if (problems.length) {
    console.log(`  ${problems.length} broken reference(s) found:`);
    problems.forEach((p) => console.log("   - " + p));
  } else {
    console.log("  No broken references found.");
  }

  console.log("\nOverall: " + (anyMismatch || problems.length ? "ISSUES FOUND - review above before cutting over." : "counts match, no broken references."));
  process.exitCode = (anyMismatch || problems.length) ? 1 : 0;
}

main().catch((err) => { console.error(err); process.exit(1); });
