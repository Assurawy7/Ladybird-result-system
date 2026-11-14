/* ==========================================================================
   _throttle.js - slows down password guessing.
   After too many wrong passwords for the same username from the same
   connection (or too many from one connection overall) logins are refused
   for the rest of a 15-minute window. A correct login clears the counter.
   If the counter table can't be reached, logins still work (fail open): a
   database hiccup must never lock a whole school out.
   ========================================================================== */
"use strict";
const { query } = require("./_db");

const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await query(
    "CREATE TABLE IF NOT EXISTS login_attempts (" +
    "key TEXT PRIMARY KEY, fails INTEGER NOT NULL DEFAULT 0, " +
    "first_fail TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_fail TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );
  tableReady = true;
}

// Returns seconds still locked (0 = not locked).
async function lockedSeconds(key, limit) {
  const r = await query("SELECT fails, first_fail FROM login_attempts WHERE key = $1", [key]);
  if (!r.rows.length) return 0;
  const age = Date.now() - new Date(r.rows[0].first_fail).getTime();
  if (age > WINDOW_MS) return 0;
  if (Number(r.rows[0].fails) >= limit) return Math.max(1, Math.ceil((WINDOW_MS - age) / 1000));
  return 0;
}

async function recordFailure(key) {
  await query(
    "INSERT INTO login_attempts (key, fails, first_fail, last_fail) VALUES ($1, 1, NOW(), NOW()) " +
    "ON CONFLICT (key) DO UPDATE SET " +
    "fails = CASE WHEN login_attempts.first_fail < NOW() - INTERVAL '" + WINDOW_MINUTES + " minutes' THEN 1 ELSE login_attempts.fails + 1 END, " +
    "first_fail = CASE WHEN login_attempts.first_fail < NOW() - INTERVAL '" + WINDOW_MINUTES + " minutes' THEN NOW() ELSE login_attempts.first_fail END, " +
    "last_fail = NOW()",
    [key]
  );
  if (Math.random() < 0.02) {
    await query("DELETE FROM login_attempts WHERE last_fail < NOW() - INTERVAL '1 day'");
  }
}

async function clearKey(key) {
  await query("DELETE FROM login_attempts WHERE key = $1", [key]);
}

module.exports = { ensureTable, lockedSeconds, recordFailure, clearKey };
