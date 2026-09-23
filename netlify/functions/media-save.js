/* ==========================================================================
   POST /.netlify/functions/media-save   body: { key, dataUrl }
   Replaces window.firebaseDb.collection("media").doc(key).set({dataUrl,...})
   from the old syncMediaFromState() in source/02-state.js. Requires a
   signed-in session — media (student photos, signatures, school logo/stamp)
   is not public.
   ========================================================================== */
"use strict";

const { query } = require("./_db");
const { getAuthedUser } = require("./_auth");

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
    await query(
      `INSERT INTO media (key, data_url, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET data_url = EXCLUDED.data_url, updated_at = NOW()`,
      [key, dataUrl]
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("media-save DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not save media." }) };
  }
};
