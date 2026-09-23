#!/usr/bin/env node
/* ==========================================================================
   scripts/db-migrate.js — `npm run db:migrate`
   Applies db/schema.sql to the database at DATABASE_URL. Safe to run more
   than once (every statement is IF NOT EXISTS / ON CONFLICT DO NOTHING).

   NOT YET RUN: this environment has no network access, so this has only
   been syntax-checked, never executed against a real Neon database.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("@neondatabase/serverless");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }
  const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  try {
    console.log("Applying db/schema.sql ...");
    await client.query(sql);
    console.log("Done. Tables ready: school_state, media, sessions.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error("db:migrate failed:", err); process.exit(1); });
