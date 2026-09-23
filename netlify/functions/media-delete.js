"use strict";

const { query } = require("./_db");
const { getAuthedUser } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) }; }

  const key = String(body.key || "");
  if (!key) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "key is required." }) };

  let stateRow;
  try {
    stateRow = (await query("SELECT state FROM school_state WHERE id = 1")).rows[0];
  } catch (err) {
    console.error("media-delete DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
  const state = (stateRow && stateRow.state) || {};
  const auth = await getAuthedUser(event, state);
  if (!auth) return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Not signed in." }) };

  try {
    await query("DELETE FROM media WHERE key = $1", [key]);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("media-delete DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not delete media." }) };
  }
};
