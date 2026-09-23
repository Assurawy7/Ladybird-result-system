/* ==========================================================================
   GET /.netlify/functions/media-get?key=student_xxxx
   Replaces window.firebaseDb.collection("media").doc(key) reads. The old
   app actually listened to the WHOLE media collection live (see
   startFirestoreSync() -> collection("media").onSnapshot()); the
   compatibility layer instead fetches media lazily/on-demand per key from
   the browser (see apiGetMedia() in the new source/02-state.js) since Neon
   has no equivalent always-on collection listener for a static frontend.
   ========================================================================== */
"use strict";

const { query } = require("./_db");
const { getAuthedUser } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }
  const key = (event.queryStringParameters || {}).key;
  if (!key) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "key is required." }) };

  let stateRow;
  try {
    stateRow = (await query("SELECT state FROM school_state WHERE id = 1")).rows[0];
  } catch (err) {
    console.error("media-get DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
  const state = (stateRow && stateRow.state) || {};
  const isUnseeded = !state || Object.keys(state).length === 0;
  if (!isUnseeded) {
    const auth = await getAuthedUser(event, state);
    if (!auth) return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Not signed in." }) };
  }

  try {
    const res = await query("SELECT data_url, updated_at FROM media WHERE key = $1", [key]);
    if (!res.rows.length) return { statusCode: 200, body: JSON.stringify({ ok: true, found: false }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true, found: true, dataUrl: res.rows[0].data_url }) };
  } catch (err) {
    console.error("media-get DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
};
