#!/usr/bin/env node
/* ==========================================================================
   scripts/new-school.js        (npm run new-school -- --name "School Name")

   Creates a CLEAN school in an EMPTY Neon database, ready to hand over:
   - the standard structure (sections, classes, subjects, grading, report
     templates) that the school can then change in Settings;
   - NO demo students, NO demo teachers and NO "demo123" accounts;
   - ONE Super Admin whose password is generated here and shown once.

   Use this instead of opening the site and letting it seed itself. It runs
   on your own computer with the new school's DATABASE_URL, so the school's
   website never has to be open to the public while it is being set up
   (you do not need the ALLOW_SEED setting at all).

   It REFUSES to touch a database that already contains a school.

   Usage:
     node --env-file=.env.local scripts/new-school.js \
          --name "Greenfield Academy" --motto "Knowledge and Character" \
          --address "12 Example Road, Kano" --phone "0803 000 0000" \
          --email "office@school.example" --admin-name "Mrs. A. Bello" \
          --username headadmin
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Pool } = require("@neondatabase/serverless");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { out[argv[i].slice(2)] = argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? argv[++i] : "true"; }
  }
  return out;
}

// Easy to read aloud and type on a phone: no 0/O, 1/l/I lookalikes.
function makePassword(len) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < len; i++) p += alphabet[crypto.randomInt(alphabet.length)];
  return p;
}

// The app's own starting data, with every demo person and record removed.
function buildCleanState(opts, hash) {
  const ctx = {
    console, Date, JSON, Math, Object, Array, Set, Promise, String, Number,
    document: { getElementById: () => null, querySelectorAll: () => [], addEventListener() {} },
    localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} },
    navigator: {}, window: { addEventListener() {} }, setTimeout() {}, setInterval() {}, fetch() {},
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8"), ctx);
  const s = vm.runInContext("seedState()", ctx);
  const adminId = vm.runInContext('uid("user")', ctx);

  s.school = Object.assign({}, s.school, {
    name: opts.name, motto: opts.motto || "", address: opts.address || "",
    phone: opts.phone || "", email: opts.email || "", website: opts.website || "", logo: "", stamp: "",
  });
  s.users = [{
    id: adminId, username: opts.username, passwordHash: hash, name: opts.adminName,
    role: "SUPER_ADMIN", photo: "", signature: "", active: true,
  }];
  s.students = []; s.scores = []; s.teacherAssignments = []; s.formTeacherAssignments = [];
  s.signatures = []; s.studentComments = {}; s.classApproval = {}; s.classSubjectStatus = {};
  s.subjectProgress = {}; s.domainScores = {}; s.attendance = {}; s.auditLog = []; s.notifications = [];
  s.isDemoData = false; s.currentUser = null; s.view = "login"; s.viewParams = {};
  return s;
}

async function main() {
  const a = parseArgs(process.argv);
  const name = (a.name || "").trim();
  const username = (a.username || "admin").trim().toLowerCase();
  const adminName = (a["admin-name"] || "School Administrator").trim();
  if (!name) { console.error('Please give the school name, for example:  --name "Greenfield Academy"'); process.exit(1); }
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) { console.error("--username must be 3-30 letters/numbers (a-z, 0-9, . _ -)."); process.exit(1); }
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set (put it in .env.local and run with --env-file=.env.local)."); process.exit(1); }

  const password = makePassword(14);
  const state = buildCleanState({ name, motto: a.motto, address: a.address, phone: a.phone, email: a.email, website: a.website, username, adminName }, bcrypt.hashSync(password, 10));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query("SELECT state, revision FROM school_state WHERE id = 1 FOR UPDATE");
    if (cur.rows[0]) {
      const existing = cur.rows[0].state || {};
      if (Object.keys(existing).length > 0) {
        await client.query("ROLLBACK");
        console.error("STOPPED: this database already contains a school (" + ((existing.school && existing.school.name) || "unnamed") + "). Nothing was changed.");
        process.exit(1);
      }
      await client.query("UPDATE school_state SET state = $1, revision = 1, updated_at = NOW(), updated_by = $2 WHERE id = 1", [JSON.stringify(state), "new-school"]);
    } else {
      await client.query("INSERT INTO school_state (id, state, revision, updated_by) VALUES (1, $1, 1, $2)", [JSON.stringify(state), "new-school"]);
    }
    await client.query("COMMIT");
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) { /* ignore */ }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\nSchool created: " + name);
  console.log("-------------------------------------------");
  console.log("Sign-in name : " + username);
  console.log("Password     : " + password);
  console.log("-------------------------------------------");
  console.log("Write the password down NOW - it is not stored anywhere and cannot be shown again.");
  console.log("Next: sign in, change the password, then add the logo, sessions, classes, subjects and staff.");
}

if (require.main === module) {
  main().catch((err) => { console.error("Could not create the school:", err); process.exit(1); });
}
module.exports = { buildCleanState, makePassword, main };
