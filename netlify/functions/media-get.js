/* ==========================================================================
   GET /.netlify/functions/media-get?key=student_xxxx
   MIGRATION NOTE: now reads from Cloudflare R2 instead of the Neon `media`
   table - see _r2.js. Still fetched lazily/on-demand per key from the
   browser (see apiGetMedia() in source/02-state.js) - unchanged behavior,
   only the storage backend moved, and R2 reads never count toward Neon's
   transfer limit at all.
   ========================================================================== */
"use strict";

const { query } = require("./_db");
const { getAuthedUserLight } = require("./_auth");
const { getMedia } = require("./_r2");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }
  const key = (event.queryStringParameters || {}).key;
  if (!key) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "key is required." }) };

  // Same rule as before (signed in, or the school is not set up yet), but
  // checked with tiny queries instead of reading the whole school database
  // out of Neon for every single photo.
  try {
    const auth = await getAuthedUserLight(event);
    if (!auth) {
      const e = await query("SELECT (state = '{}'::jsonb) AS empty FROM school_state WHERE id = 1");
      const isUnseeded = !!(e.rows[0] && e.rows[0].empty);
      if (!isUnseeded) return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Not signed in." }) };
    }
  } catch (err) {
    console.error("media-get DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }

  try {
    const result = await getMedia(key);
    if (!result.found) return { statusCode: 200, body: JSON.stringify({ ok: true, found: false }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true, found: true, dataUrl: result.dataUrl }) };
  } catch (err) {
    console.error("media-get R2 error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
};
