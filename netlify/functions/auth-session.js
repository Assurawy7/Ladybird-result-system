/* ==========================================================================
   GET /.netlify/functions/auth-session
   Used on boot (replaces the old restoreLocalSession() trusting localStorage
   alone) to ask the server "is this cookie still a valid session, and who
   is it for?". The browser still keeps a small localStorage convenience
   copy for instant UI restore, but it's the server's answer here that's
   actually trusted for anything sensitive.
   ========================================================================== */
"use strict";

const { query } = require("./_db");
const { getAuthedUser } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let row;
  try {
    const res = await query("SELECT state FROM school_state WHERE id = 1");
    row = res.rows[0];
  } catch (err) {
    console.error("auth-session DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
  const state = (row && row.state) || {};
  const auth = await getAuthedUser(event, state);
  if (!auth) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, authenticated: false }) };
  }
  const { user } = auth;
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      authenticated: true,
      user: { id: user.id, name: user.name, role: user.role, username: user.username },
    }),
  };
};
