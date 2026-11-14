"use strict";

const { getAuthedUserLight } = require("./_auth");
const { deleteMedia } = require("./_r2");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) }; }

  const key = String(body.key || "");
  if (!key) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "key is required." }) };

  let auth;
  try {
    auth = await getAuthedUserLight(event);
  } catch (err) {
    console.error("media-delete DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
  if (!auth) return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Not signed in." }) };

  try {
    await deleteMedia(key);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("media-delete R2 error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not delete media." }) };
  }
};
