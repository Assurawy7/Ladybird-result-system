/* ==========================================================================
   POST /.netlify/functions/auth-login
   body: { username, password }
   Replaces the old client-side `tryLogin()` password check in
   source/03-auth.js (which compared plaintext state.users[].password in
   the browser). The frontend keeps calling a function with the same job —
   see apiLogin() in the updated source/02-state.js — but the actual check
   now happens here, server-side, against a bcrypt hash.
   ========================================================================== */
"use strict";

const { query } = require("./_db");
const { verifyPassword, createSession, sessionCookieHeader } = require("./_auth");
const { sanitizeStateForClient } = require("./_state");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) }; }

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !password) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Username and password are required." }) };
  }

  let row;
  try {
    const res = await query("SELECT state FROM school_state WHERE id = 1");
    row = res.rows[0];
  } catch (err) {
    console.error("auth-login DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
  const state = (row && row.state) || {};
  const user = (state.users || []).find((u) => (u.username || "").toLowerCase() === username && u.active);

  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "No account found with that username." }) };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Incorrect password." }) };
  }

  const { token, expiresAt } = await createSession(user.id, (event.headers || {})["user-agent"]);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookieHeader(token, expiresAt) },
    body: JSON.stringify({
      ok: true,
      user: { id: user.id, name: user.name, role: user.role, username: user.username },
    }),
  };
};
