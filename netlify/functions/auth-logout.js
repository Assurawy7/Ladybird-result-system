"use strict";

const { parseCookies, SESSION_COOKIE, destroySessionByToken, clearSessionCookieHeader } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }
  const cookies = parseCookies(event.headers || {});
  const token = cookies[SESSION_COOKIE];
  try {
    await destroySessionByToken(token);
  } catch (err) {
    console.error("auth-logout DB error", err);
    // Still clear the cookie client-side even if the DB delete failed.
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookieHeader() },
    body: JSON.stringify({ ok: true }),
  };
};
