/* ==========================================================================
   POST /.netlify/functions/auth-login
   body: { username, password }
   Checks the password server-side against a bcrypt hash.

   PHASE 0 CHANGES
   - Reads only the matching user from Neon, not the whole school database.
   - Wrong password and unknown username now give the SAME message, and
     take the same time, so nobody can discover which usernames exist.
   - Password guessing is slowed down: 8 wrong tries per username from one
     connection, or 40 from one connection overall, locks logins for the
     rest of a 15-minute window (see _throttle.js).
   ========================================================================== */
"use strict";

const bcrypt = require("bcryptjs");
const { query } = require("./_db");
const { verifyPassword, createSession, sessionCookieHeader, getClientIp } = require("./_auth");
const throttle = require("./_throttle");

const USER_LIMIT = 8;
const IP_LIMIT = 40;
const BAD_LOGIN = "Incorrect username or password.";

let dummyHash = null;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync("not-a-real-password", 10);
  return dummyHash;
}

const json = (statusCode, obj, extraHeaders) => ({
  statusCode,
  headers: Object.assign({ "Content-Type": "application/json" }, extraHeaders || {}),
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return json(400, { ok: false, error: "Invalid JSON" }); }

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !password) return json(400, { ok: false, error: "Username and password are required." });

  const ip = getClientIp(event);
  const userKey = "u:" + username + "|" + ip;
  const ipKey = "ip:" + ip;

  // ---- 1. Is this connection locked out? (fails open if the counter table is unavailable) ----
  try {
    await throttle.ensureTable();
    const wait = Math.max(
      await throttle.lockedSeconds(userKey, USER_LIMIT),
      await throttle.lockedSeconds(ipKey, IP_LIMIT)
    );
    if (wait > 0) {
      const mins = Math.ceil(wait / 60);
      return json(
        429,
        { ok: false, error: "Too many failed attempts. Please wait about " + mins + " minute" + (mins === 1 ? "" : "s") + " and try again." },
        { "Retry-After": String(wait) }
      );
    }
  } catch (err) {
    console.error("login throttle check failed (continuing)", err);
  }

  // ---- 2. Fetch ONLY this user's record ----
  let user = null;
  try {
    const res = await query(
      "SELECT u.usr FROM school_state, jsonb_array_elements(COALESCE(school_state.state->'users', '[]'::jsonb)) AS u(usr) " +
      "WHERE school_state.id = 1 AND lower(u.usr->>'username') = $1 AND (u.usr->>'active')::boolean IS TRUE LIMIT 1",
      [username]
    );
    user = res.rows[0] ? res.rows[0].usr : null;
  } catch (err) {
    console.error("auth-login DB error", err);
    return json(500, { ok: false, error: "Could not reach the database." });
  }

  // ---- 3. Check the password (always do the same amount of work) ----
  const ok = await verifyPassword(password, user ? user.passwordHash : getDummyHash());
  if (!user || !ok) {
    try { await throttle.recordFailure(userKey); await throttle.recordFailure(ipKey); }
    catch (err) { console.error("login throttle record failed", err); }
    return json(401, { ok: false, error: BAD_LOGIN });
  }

  try { await throttle.clearKey(userKey); } catch (err) { console.error("login throttle clear failed", err); }

  const { token, expiresAt } = await createSession(user.id, (event.headers || {})["user-agent"]);
  return json(
    200,
    { ok: true, user: { id: user.id, name: user.name, role: user.role, username: user.username } },
    { "Set-Cookie": sessionCookieHeader(token, expiresAt) }
  );
};
