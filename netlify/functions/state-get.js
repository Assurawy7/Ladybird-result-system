/* ==========================================================================
   GET /.netlify/functions/state-get?since=123
   Replaces Firestore's coreRef.onSnapshot() (see startFirestoreSync() in the
   old source/02-state.js). Firestore pushed changes to the browser; Neon has
   no equivalent for a static frontend, so the updated frontend instead polls
   this endpoint every ~2s while the tab is visible (see startLiveSync() in
   the new source/02-state.js) and only gets a body back when something
   actually changed.

   { changed:false, revision:123 }                    — nothing new
   { changed:true,  revision:124, state:{...} }        — new state, sanitized

   Requires a valid session, UNLESS the database has never been seeded yet
   (state is still the empty '{}' placeholder row from db/schema.sql) — in
   that case the browser is allowed to read (and, in state-save.js, write)
   the very first seed so a brand-new deployment can boot itself, exactly
   like the old app's "Firestore doc doesn't exist yet -> seed it" path.
   ========================================================================== */
"use strict";

const { query } = require("./_db");
const { getAuthedUser } = require("./_auth");
const { sanitizeStateForClient } = require("./_state");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let row;
  try {
    const res = await query("SELECT state, revision FROM school_state WHERE id = 1");
    row = res.rows[0];
  } catch (err) {
    console.error("state-get DB error", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Could not reach the database." }) };
  }
  if (!row) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "school_state row is missing — run db/schema.sql." }) };
  }

  const state = row.state || {};
  const isUnseeded = !state || Object.keys(state).length === 0;

  if (!isUnseeded) {
    const auth = await getAuthedUser(event, state);
    if (!auth) {
      // Not signed in yet: the login screen still needs the school's own
      // branding (name/logo/motto — see renderLoginView() in
      // source/06-login.js), so return ONLY that, never the rest of the
      // school's data. Full state is only sent once authenticated.
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          changed: true,
          revision: Number(row.revision),
          authenticated: false,
          state: { school: state.school || {} },
        }),
      };
    }
  }

  const since = Number((event.queryStringParameters || {}).since || -1);
  if (since === Number(row.revision)) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, changed: false, revision: Number(row.revision) }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      changed: true,
      revision: Number(row.revision),
      state: sanitizeStateForClient(state),
    }),
  };
};
