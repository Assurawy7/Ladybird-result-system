#!/usr/bin/env node
/* ==========================================================================
   scripts/migrate-media-to-r2.js
   COPIES (does not delete) every row already in Neon's `media` table -
   real student photos, signatures, the school logo/stamp - into the new
   Cloudflare R2 bucket, using the SAME keys (e.g. "student_abc123",
   "sig_xyz789", "logo", "stamp"). Run this BEFORE switching
   media-get.js/media-save.js/media-delete.js over to R2 (Phase D in the
   deploy guide), so no existing photo/signature goes missing the moment
   the app starts reading from R2 instead of Postgres.

   Usage (run locally, e.g. in your Codespaces terminal):
     DATABASE_URL=... R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... \
     R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=ladybird-media \
     node scripts/migrate-media-to-r2.js

   Safe to re-run - re-uploading the same key just overwrites it with the
   same bytes. The original Neon `media` table rows are left untouched -
   this is a copy, not a move (same caution as migrate-firebase-to-neon.js:
   keep the old copy around as a rollback option until you've verified the
   new one works).

   NOT YET RUN: this environment has no network access, so this has only
   been syntax-checked, never executed against real data. Watch the
   per-row output as it runs and check the summary counts match what you
   expect for your school.
   ========================================================================== */
"use strict";

const { Pool } = require("@neondatabase/serverless");
const { putMedia } = require("../netlify/functions/_r2");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const requiredR2 = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  const missing = requiredR2.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Missing required R2 environment variable(s): " + missing.join(", "));
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  let rows;
  try {
    console.log("Reading existing media rows from Neon...");
    const res = await client.query("SELECT key, data_url FROM media ORDER BY key");
    rows = res.rows;
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`Found ${rows.length} media row(s) in Neon. Uploading to R2 bucket "${process.env.R2_BUCKET_NAME}"...\n`);

  let succeeded = 0;
  const failed = [];

  for (const row of rows) {
    const { key, data_url: dataUrl } = row;
    try {
      if (!dataUrl || !dataUrl.startsWith("data:")) {
        failed.push({ key, reason: "not a valid data: URL in Neon - skipped" });
        console.log(`  SKIP  ${key} (not a valid data: URL)`);
        continue;
      }
      await putMedia(key, dataUrl);
      succeeded++;
      console.log(`  OK    ${key}`);
    } catch (err) {
      failed.push({ key, reason: err.message });
      console.log(`  FAIL  ${key} - ${err.message}`);
    }
  }

  console.log("\n---- Summary ----");
  console.log(`Neon media rows found: ${rows.length}`);
  console.log(`Uploaded to R2:        ${succeeded}`);
  console.log(`Failed/skipped:        ${failed.length}`);
  if (failed.length) {
    console.log("\nFailed/skipped keys:");
    failed.forEach((f) => console.log(`  - ${f.key}: ${f.reason}`));
  }

  if (succeeded === rows.length) {
    console.log("\nAll media rows copied successfully. You can now proceed with");
    console.log("Phase D (swap media-get.js/media-save.js/media-delete.js to the");
    console.log("R2-backed versions), then push and redeploy.");
  } else {
    console.log("\nSome rows did not migrate - review the failures above before");
    console.log("switching the app over to R2, or those specific photos/signatures");
    console.log("would stop displaying.");
  }

  process.exitCode = failed.length ? 1 : 0;
}

main().catch((err) => { console.error("Migration failed:", err); process.exit(1); });
