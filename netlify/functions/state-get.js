/* ==========================================================================
   GET /.netlify/functions/state-get?since=123
   Live-sync poll. TRANSFER-SAVING VERSION: the browser asks this every few
   seconds. The old version read the WHOLE school_state row (the entire
   school's data) from Neon on every single poll just to compare a revision
   number - so every open phone pulled the full database out of Neon
   ~12 times a minute even when nothing had changed. That is what burned
   through Neon's monthly data-transfer allowance.

   Now: step 1 reads ONLY the revision number (a few bytes). If it matches
   what the browser already has and the session is valid, we answer
   "unchanged" without ever reading the big state document. The full state
   is read only when something really changed (or on first load/login).

   { changed:false, revision:123 }                    - nothing new
   { changed:true,  revision:124, state:{...} }        - new state, sanitized
   ========================================================================== */
"use strict";

const { query } = require("./_db");
const { getAuthedUser, getUserIdForToken, parseCookies, SESSION_COOKIE } = require("./_auth");
const { sanitizeStateForClient } = require("./_state");

const json = (statusCode, obj) => ({ statusCode, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { ok: false, error: "Method not allowed" });

  const since = Number((event.queryStringParameters || {}).since || -1);

  try {
    // ---- Step 1: tiny query - revision only ----
    const revRes = await query("SELECT revision FROM school_state WHERE id = 1");
    if (!revRes.rows[0]) return json(500, { ok: false, error: "school_state row is missing - run db/schema.sql." });
    const revision = Number(revRes.rows[0].revision);

    // ---- Fast path: nothing changed AND the caller is a valid, active user ----
    if (since === revision) {
      const token = parseCookies(event.headers || {})[SESSION_COOKIE];
      const userId = token ? await getUserIdForToken(token) : null;
      if (userId) {
        // Fetch only THIS user's record out of the JSONB, not the whole state.
        const u = await query(
          "SELECT 1 FROM school_state, jsonb_array_elements(COALESCE(state->'users', '[]'::jsonb)) AS usr " +
          "WHERE id = 1 AND usr->>'id' = $1 AND (usr->>'active')::boolean IS TRUE LIMIT 1",
          [userId]
        );
        if (u.rows.length) return json(200, { ok: true, changed: false, revision });
      }
      // Not signed in / unknown user: fall through to the normal full path,
      // which keeps the exact old behaviour (401, or public branding subset).
    }

    // ---- Full path: something changed, first load, or login check ----
    const res = await query("SELECT state, revision FROM school_state WHERE id = 1");
    const row = res.rows[0];
    const state = row.state || {};
    const isUnseeded = !state || Object.keys(state).length === 0;

    if (!isUnseeded) {
      const auth = await getAuthedUser(event, state);
      if (!auth) {
        // First load of the page while signed out (since = -1): the login
        // screen needs the school's name and motto, so send ONLY those two
        // public fields. Nothing else leaves the database for a signed-out
        // visitor. A later poll (since >= 0) with no valid session still
        // gets 401 so the app knows the session ended.
        if (since === -1) {
          const sch = state.school || {};
          return json(200, {
            ok: true,
            changed: true,
            authenticated: false,
            revision: Number(row.revision),
            state: { school: { name: sch.name || "", motto: sch.motto || "" } },
          });
        }
        return json(401, { ok: false, error: "Not signed in." });
      }
    }

    if (since === Number(row.revision)) {
      return json(200, { ok: true, changed: false, revision: Number(row.revision) });
    }
    return json(200, {
      ok: true,
      changed: true,
      revision: Number(row.revision),
      state: sanitizeStateForClient(state),
    });
  } catch (err) {
    console.error("state-get DB error", err);
    return json(500, { ok: false, error: "Could not reach the database." });
  }
};
