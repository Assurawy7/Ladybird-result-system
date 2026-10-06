/* ==========================================================================
   POST /.netlify/functions/media-save   body: { key, dataUrl }
   MIGRATION NOTE: now writes to Cloudflare R2 instead of the Neon `media`
   table - see _r2.js for why (zero egress fees, same auth boundary).
   source/02-state.js's apiSaveMedia() is UNCHANGED - same request/response
   shape as before, only the storage backend moved.
   ========================================================================== */
"use strict";

const { query } = require("./_db");
const { getAuthedUser } = require("./_auth");
const { putMedia } = require("./_r2");

const MAX_DATA_URL_LENGTH = 8 * 1024 * 1024; // ~8MB of base64, generous ceiling for a compressed photo/signature

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) }; }

  const key = String(body.key || "");
  const dataUrl = String(body.dataUrl || "");
  if (!key || !dataUrl.startsWith("data:")) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "key and a data: URL are required." }) };
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return { statusCode: 413, body: JSON.stringify({ ok: false, error: "Image too large." }) };
  }

  let stateRow;
  try {
    stateRow = (await query("SELECT state FROM school_state WHERE id = 1")).rows[0];
  } catch (err) {
    console.error("media-save DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
  const state = (stateRow && stateRow.state) || {};
  const auth = await getAuthedUser(event, state);
  if (!auth) return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Not signed in." }) };

  try {
    await putMedia(key, dataUrl);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("media-save R2 error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not save media." }) };
  }
};
