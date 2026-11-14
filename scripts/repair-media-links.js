#!/usr/bin/env node
/* ==========================================================================
   scripts/repair-media-links.js        (npm run repair:media)

   Repairs school photos/signatures that "disappeared". Two separate things
   can go wrong, and this fixes both:

   A. The shared school data lost its photo LINKS (the small "@media" marker
      on each student/signature/logo) because one device failed to load the
      pictures and then saved. The pictures themselves are usually still in
      storage. This puts the links back for every picture that exists.
   B. Some pictures are missing from Cloudflare R2 but still exist in the
      original copy in Neon's `media` table (the migration never deleted it).
      This copies them back into R2 under the same names.

   DRY RUN BY DEFAULT: with no option it only REPORTS what it would do and
   changes nothing. Add --apply to actually repair.

   Before changing anything it saves a copy of the current school data to
   state-backup-<time>.json (this file contains pupil information - delete it
   when you are done; it is ignored by git).

   Usage (set the same variables you used for the R2 migration):
     DATABASE_URL=... R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... \
     R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=... \
     node scripts/repair-media-links.js            # report only
     node scripts/repair-media-links.js --apply    # repair
   ========================================================================== */
"use strict";

const fs = require("fs");
const { Pool } = require("@neondatabase/serverless");
const { putMedia, listKeys } = require("../netlify/functions/_r2");

const APPLY = process.argv.includes("--apply");
const MARKER = "@media";

// Same list of picture fields the app uses (collectMediaFields in source/02-state.js).
function mediaFields(s) {
  const out = [];
  const school = (s.school = s.school || {});
  out.push({ key: "logo", label: "school logo", get: () => school.logo, set: (v) => { school.logo = v; } });
  out.push({ key: "stamp", label: "school stamp", get: () => school.stamp, set: (v) => { school.stamp = v; } });
  (s.signatures || []).forEach((sig) => out.push({ key: "sig_" + sig.id, label: "signature " + (sig.name || sig.id), get: () => sig.image, set: (v) => { sig.image = v; } }));
  (s.students || []).forEach((stu) => out.push({ key: "student_" + stu.id, label: "student " + (stu.name || stu.id), get: () => stu.photo, set: (v) => { stu.photo = v; } }));
  return out;
}

async function main() {
  const need = ["DATABASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) { console.error("Missing environment variable(s): " + missing.join(", ")); process.exit(1); }

  console.log(APPLY ? "MODE: APPLY (will change data)\n" : "MODE: DRY RUN (nothing will be changed)\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    // ---- what exists where ----
    const r2Keys = new Set(await listKeys());
    const neonKeys = (await client.query("SELECT key FROM media")).rows.map((r) => r.key);
    const toRestore = neonKeys.filter((k) => !r2Keys.has(k));
    console.log("Pictures in Cloudflare R2:            " + r2Keys.size);
    console.log("Original copies in Neon (media table): " + neonKeys.length);
    console.log("In Neon but MISSING from R2:           " + toRestore.length);

    // ---- A. restore missing pictures into R2 (before taking the data lock) ----
    const restored = [];
    if (APPLY) {
      for (const key of toRestore) {
        const row = (await client.query("SELECT data_url FROM media WHERE key = $1", [key])).rows[0];
        if (!row || !row.data_url) { console.log("  skip (no data): " + key); continue; }
        try { await putMedia(key, row.data_url); restored.push(key); console.log("  restored " + key); }
        catch (e) { console.log("  FAILED to restore " + key + ": " + e.message); }
      }
    }
    const available = new Set([...r2Keys, ...(APPLY ? restored : toRestore)]);

    // ---- B. fix the links in the shared school data ----
    await client.query("BEGIN");
    const res = await client.query("SELECT state, revision FROM school_state WHERE id = 1 FOR UPDATE");
    if (!res.rows[0]) throw new Error("school_state row not found.");
    const state = res.rows[0].state || {};
    const revision = Number(res.rows[0].revision);
    const fields = mediaFields(state);

    const linked = fields.filter((f) => f.get() === MARKER);
    const relink = fields.filter((f) => !f.get() && available.has(f.key));
    const dangling = fields.filter((f) => f.get() === MARKER && !available.has(f.key));
    const photosRelink = relink.filter((f) => f.key.startsWith("student_")).length;

    console.log("\nStudents in the school data:           " + (state.students || []).length);
    console.log("Picture links currently present:       " + linked.length);
    console.log("Links to RESTORE (picture exists):     " + relink.length + "  (" + photosRelink + " student photos)");
    console.log("Links pointing at a MISSING picture:   " + dangling.length);
    if (dangling.length) {
      console.log("  (these pictures are in neither R2 nor Neon - they must be uploaded again)");
      dangling.slice(0, 10).forEach((f) => console.log("   - " + f.label));
      if (dangling.length > 10) console.log("   ... and " + (dangling.length - 10) + " more");
    }

    if (!APPLY) {
      await client.query("ROLLBACK");
      console.log("\nDry run finished. Nothing was changed. Run again with --apply to repair.");
      return;
    }

    // ---- backup, then write ----
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = "state-backup-" + stamp + ".json";
    fs.writeFileSync(backupFile, JSON.stringify(state));
    console.log("\nSaved a copy of the current school data to " + backupFile);

    relink.forEach((f) => f.set(MARKER));
    if (relink.length) {
      await client.query(
        "UPDATE school_state SET state = $1, revision = $2, updated_at = NOW(), updated_by = $3 WHERE id = 1",
        [JSON.stringify(state), revision + 1, "repair-media-links"]
      );
    }
    await client.query("COMMIT");
    console.log("Restored " + relink.length + " picture link(s) and " + restored.length + " missing picture(s).");
    console.log("Open the app on a phone - pictures appear within a minute as devices pick up the change.");
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) { /* ignore */ }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error("Repair failed:", err); process.exit(1); });
