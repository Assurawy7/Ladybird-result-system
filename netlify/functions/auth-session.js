/* ==========================================================================
   GET /.netlify/functions/auth-session
   Used on boot to ask the server "is this cookie still a valid session, and
   who is it for?". Now answered with one tiny query (see
   getAuthedUserLight in _auth.js) instead of reading the whole school
   database. Result is identical.
   ========================================================================== */
"use strict";

const { getAuthedUserLight } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let auth;
  try {
    auth = await getAuthedUserLight(event);
  } catch (err) {
    console.error("auth-session DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
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
