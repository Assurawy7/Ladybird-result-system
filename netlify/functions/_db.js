/* ==========================================================================
   _db.js — shared Neon PostgreSQL connection helper.
   Uses @neondatabase/serverless's Pool (websocket-based, works inside
   Netlify Functions) so we can run real transactions (BEGIN / SELECT ...
   FOR UPDATE / COMMIT), which the plain neon() tagged-template client
   cannot do. process.env.DATABASE_URL must be set — see .env.example.
   ========================================================================== */
"use strict";

const { Pool } = require("@neondatabase/serverless");

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

/**
 * Run `fn(client)` inside a single transaction (BEGIN/COMMIT/ROLLBACK).
 * Always releases the client back to the pool.
 */
async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

/** Convenience one-off query outside a transaction. */
async function query(text, params) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = { getPool, withTransaction, query };
