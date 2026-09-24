/* ==========================================================================
   _state.js
   - sanitizeStateForClient(): strips secrets before a state row is ever
     sent to the browser.
   - hashIncomingPasswords() / preserveExistingPasswordHashes(): the
     compatibility trick that lets the existing frontend keep doing
     `user.password = pw` unmodified while the server transparently
     converts it to a bcrypt hash, and never lets a save that doesn't know
     about a hash accidentally erase it.
   - MERGE_BY_ID_COLLECTIONS / MERGE_BY_KEY_MAPS / mergeArraysById /
     mergeStale: ported from the old client-side merge logic, still used
     for SUPER_ADMIN/ADMIN saves (see buildAuthorizedState()).
   - buildAuthorizedState(): the real backend authorization for
     state-save.js. NOT a throw-or-reject gate — a real live multi-user
     school means a Form Teacher's copy of the shared document is almost
     never perfectly current, so comparing their whole save against the
     live database and rejecting on any mismatch (the first version of
     this file did that) meant real saves kept silently failing. Instead,
     this reconciles: it starts from the freshest server state and layers
     in only the specific, validated changes this role is allowed to make
     (own subject/class scores, own form class, own account, etc.) —
     everything else, including other people's concurrent unrelated work,
     is left exactly as it was in the database.
   ========================================================================== */
"use strict";

const { hashPassword } = require("./_auth");

/* ---------------- sanitize ---------------- */

function sanitizeStateForClient(state) {
  const clone = JSON.parse(JSON.stringify(state || {}));
  (clone.users || []).forEach((u) => {
    delete u.password;
    delete u.passwordHash;
  });
  return clone;
}

/* ---------------- password compatibility shim ---------------- */

async function hashIncomingPasswords(payload) {
  const users = payload.users || [];
  for (const u of users) {
    if (u.password) {
      u.passwordHash = await hashPassword(u.password);
      delete u.password;
    }
  }
}

/**
 * CRITICAL: sanitizeStateForClient() strips password/passwordHash before
 * the state is ever sent to the browser (correct - the browser must never
 * see a hash). But the frontend still saves the WHOLE state object back on
 * every change (see persistNow() in source/02-state.js) - including right
 * after login, when it just fetched a freshly-sanitized copy of itself
 * (see refreshFullStateAfterLogin()) and then immediately logs an audit
 * entry and saves. Without this function, that save would silently
 * overwrite every user's real passwordHash in Neon with nothing, because
 * the payload never had it to begin with.
 *
 * Fix: a passwordHash is "sticky" - once set, only an explicit new
 * plaintext `password` field (hashed above) can change it. If neither
 * `password` nor `passwordHash` is present on an existing user, restore
 * their last-known passwordHash from the database before saving.
 */
function preserveExistingPasswordHashes(serverState, payload) {
  const serverUsers = serverState.users || [];
  (payload.users || []).forEach((u) => {
    if (!u.password && !u.passwordHash) {
      const prev = serverUsers.find((su) => su.id === u.id);
      if (prev && prev.passwordHash) u.passwordHash = prev.passwordHash;
    }
  });
}

/* ---------------- stale-write merge (ported from source/02-state.js) ---------------- */

const MERGE_BY_ID_COLLECTIONS = [
  "sections", "classArms", "departments", "subjects",
  "assessmentSchemes", "gradingSchemes", "sessions", "terms", "users", "students",
  "teacherAssignments", "formTeacherAssignments", "scores", "commentTemplates",
  "signatures", "affectiveDomains", "psychomotorDomains", "customFieldDefs",
  "reportTemplates",
];
const MERGE_BY_KEY_MAPS = [
  "classSubjectStatus", "classApproval", "studentComments", "domainScores", "attendance",
];

function mergeArraysById(serverArr, localArr) {
  const map = {};
  const order = [];
  (serverArr || []).forEach((item) => {
    if (item && item.id && !(item.id in map)) order.push(item.id);
    if (item && item.id) map[item.id] = item;
  });
  (localArr || []).forEach((item) => {
    if (item && item.id && !(item.id in map)) order.push(item.id);
    if (item && item.id) map[item.id] = item;
  });
  return order.map((id) => map[id]);
}

function mergeStale(serverState, payload) {
  const merged = Object.assign({}, payload);
  MERGE_BY_ID_COLLECTIONS.forEach((key) => {
    merged[key] = mergeArraysById(serverState[key], payload[key]);
  });
  MERGE_BY_KEY_MAPS.forEach((key) => {
    merged[key] = Object.assign({}, serverState[key] || {}, payload[key] || {});
  });
  return merged;
}

/* ---------------- append-only merge (auditLog, notifications) ---------------- */

/**
 * auditLog and notifications grow from actions happening all over the
 * school constantly - "my copy doesn't match the server's right now" is
 * the NORMAL state for these, not a sign of a conflict. Always reconcile
 * them by taking the server's entries plus any genuinely new ones from the
 * payload, for every save, regardless of role - never let one person's
 * save erase entries that arrived from someone else in the meantime.
 */
function mergeAppendOnly(serverArr, payloadArr) {
  const server = serverArr || [];
  const incoming = payloadArr || [];
  const known = new Set(server.map((x) => jstr(x)));
  const additions = incoming.filter((x) => !known.has(jstr(x)));
  return server.concat(additions);
}

/* ---------------- authorization: reconcile, don't reject ---------------- */

const RESTRICTED_SETTINGS_KEYS = [
  "sections", "classArms", "departments", "subjects", "assessmentSchemes",
  "gradingSchemes", "sessions", "terms", "teacherAssignments",
  "formTeacherAssignments", "commentTemplates", "signatures",
  "affectiveDomains", "psychomotorDomains", "ratingLevels", "customFieldDefs",
  "reportTemplates", "school", "rankingConfig", "isDemoData",
];

function jstr(v) { return JSON.stringify(v === undefined ? null : v); }

function byId(arr, id) { return (arr || []).find((x) => x && x.id === id) || null; }

function studentClassArmId(serverState, incomingState, studentId) {
  const s = byId(incomingState.students, studentId) || byId(serverState.students, studentId);
  return s ? s.classArmId : null;
}

function deepClone(v) { return JSON.parse(JSON.stringify(v)); }

/**
 * Overlay changes onto an id-keyed array, but only where `isAllowed`
 * (given the record in question) says the acting user may touch it.
 * Anything they're not allowed to touch (an edit, an addition, or a
 * deletion) is silently kept at the server's current value instead of
 * failing the whole save - a Form Teacher's legitimate save should never
 * be blocked by, say, a different teacher's unrelated record having moved
 * on since this teacher's browser last fetched.
 */
function overlayArrayById(serverArr, payloadArr, isAllowed) {
  serverArr = serverArr || []; payloadArr = payloadArr || [];
  const payloadMap = {};
  payloadArr.forEach((r) => { if (r && r.id) payloadMap[r.id] = r; });
  const result = {};
  const order = [];

  serverArr.forEach((rec) => {
    if (!rec || !rec.id) return;
    order.push(rec.id);
    const incoming = payloadMap[rec.id];
    if (incoming === undefined) {
      // payload wants to delete this record
      result[rec.id] = isAllowed(rec) ? null : rec;
      return;
    }
    if (jstr(incoming) === jstr(rec)) { result[rec.id] = rec; return; }
    result[rec.id] = (isAllowed(incoming) || isAllowed(rec)) ? incoming : rec;
  });

  payloadArr.forEach((rec) => {
    if (!rec || !rec.id || rec.id in result) return; // new record
    if (isAllowed(rec)) { result[rec.id] = rec; order.push(rec.id); }
  });

  return order.map((id) => result[id]).filter((r) => r !== null);
}

/**
 * Same idea as overlayArrayById, for the key -> value maps
 * (classSubjectStatus, classApproval, studentComments, domainScores,
 * attendance). `isAllowed(key)` decides whether this actor may touch that
 * key at all; the optional publish-gate params additionally block a
 * disallowed PUBLISHED/reopen transition even on a key the actor otherwise
 * owns (e.g. their own form class), keeping just that transition at the
 * server's current value instead of failing the whole save.
 */
function overlayMapByKey(serverMap, payloadMap, isAllowed, publishGate) {
  serverMap = serverMap || {}; payloadMap = payloadMap || {};
  const result = Object.assign({}, serverMap);
  const keys = new Set([...Object.keys(serverMap), ...Object.keys(payloadMap)]);
  keys.forEach((key) => {
    const before = serverMap[key];
    const after = payloadMap[key];
    if (jstr(before) === jstr(after)) return;
    if (!isAllowed(key)) return; // not theirs - keep server's value
    if (publishGate && !publishGate(before, after)) return; // disallowed publish/reopen - keep server's value
    if (after === undefined) delete result[key];
    else result[key] = after;
  });
  return result;
}

function publishGateForStatusString(canPublish, canReopen) {
  return function (before, after) {
    const beforeStatus = before || "PENDING";
    if (after === "PUBLISHED" && !canPublish) return false;
    if (beforeStatus === "PUBLISHED" && after !== "PUBLISHED" && !canReopen) return false;
    return true;
  };
}
function publishGateForApprovalObject(canPublish, canReopen) {
  return function (before, after) {
    const beforeStatus = (before && before.status) || "IN_PROGRESS";
    const afterStatus = after && after.status;
    if (afterStatus === "PUBLISHED" && !canPublish) return false;
    if (beforeStatus === "PUBLISHED" && afterStatus !== "PUBLISHED" && !canReopen) return false;
    return true;
  };
}

/** A user may only ever change their OWN record, and only these fields. */
function overlayOwnUserRecord(serverUsers, payloadUsers, actingUser) {
  serverUsers = serverUsers || [];
  const payloadMap = {};
  (payloadUsers || []).forEach((u) => { if (u && u.id) payloadMap[u.id] = u; });
  const allowedFields = ["name", "password", "passwordHash", "photo", "signature"];
  return serverUsers.map((u) => {
    if (u.id !== actingUser.id) return u; // everyone else's record: untouched
    const incoming = payloadMap[u.id];
    if (!incoming) return u;
    const merged = Object.assign({}, u);
    allowedFields.forEach((f) => { if (f in incoming) merged[f] = incoming[f]; });
    return merged;
  });
}

/**
 * The real backend authorization for state-save.js. Returns the state that
 * will actually be written - NOT a throw-or-allow gate. Starts from the
 * freshest server state and layers in only the specific, validated changes
 * this role is allowed to make; everything else (including other people's
 * concurrent, unrelated work) is left exactly as it was in the database.
 * This is what makes it safe to run on every save, every time, regardless
 * of whether the caller's copy of the shared document happens to be
 * perfectly current - which, in a real live multi-user school, it almost
 * never is.
 */
function buildAuthorizedState(auth, serverState, payload, wasStale) {
  const { user } = auth;
  const role = user.role;

  const appendOnly = {
    auditLog: mergeAppendOnly(serverState.auditLog, payload.auditLog),
    notifications: mergeAppendOnly(serverState.notifications, payload.notifications),
  };

  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    const base = wasStale ? mergeStale(serverState, payload) : payload;
    return Object.assign({}, base, appendOnly);
  }

  const canPublish = role === "PRINCIPAL"; // SUPER_ADMIN/ADMIN handled above
  const canReopen = false; // only SUPER_ADMIN/ADMIN, handled above

  const formClassArmIds = (serverState.formTeacherAssignments || [])
    .filter((a) => a.teacherId === user.id && a.active).map((a) => a.classArmId);
  const subjectAssignments = (serverState.teacherAssignments || [])
    .filter((a) => a.teacherId === user.id && a.active);
  function isMyFormClassArm(id) { return formClassArmIds.indexOf(id) > -1; }
  function isMySubjectClassPair(subjectId, classArmId) {
    return subjectAssignments.some((a) => a.subjectId === subjectId && a.classArmId === classArmId);
  }

  const finalState = deepClone(serverState);
  Object.assign(finalState, appendOnly);

  if (role === "PRINCIPAL" || role === "ACADEMIC_SUPERVISOR") {
    // Whole-school academic access, but settings-type collections and
    // publish/reopen are still gated - matches canManageSettings()/
    // canPublish() being false for these roles client-side.
    Object.keys(payload).forEach((key) => {
      if (key === "auditLog" || key === "notifications") return; // handled above
      if (RESTRICTED_SETTINGS_KEYS.indexOf(key) > -1) return; // not theirs - keep server's
      if (key === "users") { finalState.users = overlayOwnUserRecord(serverState.users, payload.users, user); return; }
      if (key === "classSubjectStatus") {
        finalState.classSubjectStatus = overlayMapByKey(
          serverState.classSubjectStatus, payload.classSubjectStatus,
          () => true, publishGateForStatusString(canPublish, canReopen)
        );
        return;
      }
      if (key === "classApproval") {
        finalState.classApproval = overlayMapByKey(
          serverState.classApproval, payload.classApproval,
          () => true, publishGateForApprovalObject(canPublish, canReopen)
        );
        return;
      }
      if (MERGE_BY_ID_COLLECTIONS.indexOf(key) > -1) { finalState[key] = mergeArraysById(serverState[key], payload[key]); return; }
      if (MERGE_BY_KEY_MAPS.indexOf(key) > -1) { finalState[key] = Object.assign({}, serverState[key] || {}, payload[key] || {}); return; }
      finalState[key] = payload[key];
    });
    return finalState;
  }

  // TEACHER: narrowest role - only these collections, each validated
  // record-by-record against real assignments in serverState (never the
  // client's own possibly-stale claim about its assignments).
  finalState.scores = overlayArrayById(serverState.scores, payload.scores, (rec) => isMySubjectClassPair(rec.subjectId, rec.classArmId));
  finalState.classSubjectStatus = overlayMapByKey(
    serverState.classSubjectStatus, payload.classSubjectStatus,
    (key) => { const [classArmId, subjectId] = key.split("::"); return isMyFormClassArm(classArmId) || isMySubjectClassPair(subjectId, classArmId); },
    publishGateForStatusString(canPublish, canReopen)
  );
  finalState.classApproval = overlayMapByKey(
    serverState.classApproval, payload.classApproval,
    (key) => isMyFormClassArm(key.split("::")[0]),
    publishGateForApprovalObject(canPublish, canReopen)
  );
  ["studentComments", "domainScores", "attendance"].forEach((mapKey) => {
    finalState[mapKey] = overlayMapByKey(serverState[mapKey], payload[mapKey], (key) => {
      const studentId = key.split("::")[0];
      const classArmId = studentClassArmId(serverState, payload, studentId);
      return !!classArmId && isMyFormClassArm(classArmId);
    });
  });
  finalState.students = overlayArrayById(serverState.students, payload.students, (rec) => isMyFormClassArm(rec.classArmId));
  finalState.users = overlayOwnUserRecord(serverState.users, payload.users, user);

  return finalState;
}


module.exports = {
  sanitizeStateForClient,
  hashIncomingPasswords,
  preserveExistingPasswordHashes,
  mergeStale,
  mergeAppendOnly,
  buildAuthorizedState,
};
