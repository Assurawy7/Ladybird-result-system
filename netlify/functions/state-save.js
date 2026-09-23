/* ==========================================================================
   POST /.netlify/functions/state-save
   body: { state: {...}, baseRevision: <number the client last saw> }

   Replaces the Firestore runTransaction() in the old persistNow()
   (source/02-state.js). Does the same job, on Neon:
     1. authenticate the caller (unless this is the very first, unseeded save)
     2. authorize the operation (enforceRbacOnSave — see _state.js)
     3. lock the row (SELECT ... FOR UPDATE), detect staleness
     4. if stale, merge by id/key exactly like the old client-side merge did
     5. hash any plaintext password fields before they ever touch disk
     6. increment revision, write, return the (possibly merged) state
   ========================================================================== */
"use strict";

const { withTransaction } = require("./_db");
const { getAuthedUser } = require("./_auth");
const { sanitizeStateForClient, hashIncomingPasswords, preserveExistingPasswordHashes, mergeStale, enforceRbacOnSave } = require("./_state");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) }; }

  const payload = body.state;
  if (!payload || typeof payload !== "object") {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing state." }) };
  }
  // Device-local fields never belong in the shared document (see
  // applyIncomingCoreDoc() in the old code, which kept these out too).
  delete payload.currentUser;
  delete payload.view;
  delete payload.viewParams;
  // Never trust a client-supplied revision/writer/password hash directly.
  delete payload._rev;
  delete payload._lastWriter;
  (payload.users || []).forEach((u) => { delete u.passwordHash; });

  try {
    const result = await withTransaction(async (client) => {
      const res = await client.query("SELECT state, revision FROM school_state WHERE id = 1 FOR UPDATE");
      const row = res.rows[0];
      if (!row) {
        const err = new Error("school_state row is missing — run db/schema.sql.");
        err.status = 500;
        throw err;
      }
      const serverState = row.state || {};
      const serverRevision = Number(row.revision);
      const isUnseeded = !serverState || Object.keys(serverState).length === 0;

      let auth = null;
      if (isUnseeded) {
        if (!payload.users || !payload.users.length || !payload.school) {
          const err = new Error("Initial seed payload looks incomplete.");
          err.status = 400;
          throw err;
        }
        // First-ever save: no one can be logged in yet, so this one save is
        // allowed unauthenticated — same trust boundary as the old
        // Firestore code, which seeded on first snapshot with no auth
        // check beyond "signed in anonymously".
      } else {
        auth = await getAuthedUser(event, serverState);
        if (!auth) {
          const err = new Error("Not signed in.");
          err.status = 401;
          throw err;
        }
        enforceRbacOnSave(auth, serverState, payload);
      }

      const baseRevision = Number(body.baseRevision);
      const wasStale = !isUnseeded && Number.isFinite(baseRevision) && baseRevision < serverRevision;
      const finalState = wasStale ? mergeStale(serverState, payload) : payload;

      // A save that came from a browser which only ever had the sanitized
      // (hash-stripped) state must never be allowed to erase real password
      // hashes already in the database - see preserveExistingPasswordHashes().
      if (!isUnseeded) preserveExistingPasswordHashes(serverState, finalState);

      await hashIncomingPasswords(finalState);

      const nextRevision = serverRevision + 1;
      const updatedBy = auth ? auth.user.username : "seed";
      await client.query(
        "UPDATE school_state SET state = $1, revision = $2, updated_at = NOW(), updated_by = $3 WHERE id = 1",
        [JSON.stringify(finalState), nextRevision, updatedBy]
      );

      return { revision: nextRevision, merged: wasStale, state: finalState };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        revision: result.revision,
        merged: result.merged,
        state: sanitizeStateForClient(result.state),
      }),
    };
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error("state-save error", err);
    return { statusCode: status, body: JSON.stringify({ ok: false, error: err.message || "Save failed." }) };
  }
};
