/* ==========================================================================
   _state.js
   - sanitizeStateForClient(): strips secrets before a state row is ever
     sent to the browser.
   - hashIncomingPasswords(): the compatibility trick that lets the existing
     frontend keep doing `user.password = pw` unmodified (see
     source/22-settings-users-backup.js, source/09-teachers.js) while the
     server transparently converts any plaintext `password` field into a
     bcrypt `passwordHash` and removes the plaintext before it is ever
     written to Neon.
   - MERGE_BY_ID_COLLECTIONS / MERGE_BY_KEY_MAPS / mergeArraysById: ported
     1:1 from source/02-state.js so a stale save still merges instead of
     clobbering, exactly like the old Firestore transaction did.
   - enforceRbacOnSave(): the real backend authorization for state-save.js.
     Mirrors the intent of source/03-auth.js's client-side checks (a normal
     Teacher only touches their own subject/class/form-class data), but this
     copy cannot be bypassed from DevTools. Whole-school roles (SUPER_ADMIN/
     ADMIN/PRINCIPAL/ACADEMIC_SUPERVISOR) are broad but not unlimited:
     settings-type collections and publishing are further restricted to
     match canManageSettings()/canPublish().
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

/* ---------------- RBAC enforcement ---------------- */

const RESTRICTED_SETTINGS_KEYS = [
  "sections", "classArms", "departments", "subjects", "assessmentSchemes",
  "gradingSchemes", "sessions", "terms", "teacherAssignments",
  "formTeacherAssignments", "commentTemplates", "signatures",
  "affectiveDomains", "psychomotorDomains", "ratingLevels", "customFieldDefs",
  "reportTemplates", "school", "rankingConfig", "isDemoData",
];

const TEACHER_ALLOWED_TOP_KEYS = [
  "scores", "classSubjectStatus", "classApproval", "studentComments",
  "domainScores", "attendance", "students", "users", "auditLog",
];

function jstr(v) { return JSON.stringify(v === undefined ? null : v); }

function byId(arr, id) { return (arr || []).find((x) => x && x.id === id) || null; }

function studentClassArmId(serverState, incomingState, studentId) {
  const s = byId(incomingState.students, studentId) || byId(serverState.students, studentId);
  return s ? s.classArmId : null;
}

/**
 * Throws { status, message } if `payload` (the state the client wants to
 * save) contains changes that `user` is not allowed to make, relative to
 * `serverState` (the last-known-good state in Neon). Returns nothing on
 * success (payload is allowed as-is, or will be allowed after mergeStale()).
 */
function enforceRbacOnSave(auth, serverState, payload) {
  const { user } = auth;
  const role = user.role;

  const isWholeSchoolRole = role === "SUPER_ADMIN" || role === "ADMIN" || role === "PRINCIPAL" || role === "ACADEMIC_SUPERVISOR";
  const canManageSettings = role === "SUPER_ADMIN" || role === "ADMIN";
  const canPublish = role === "SUPER_ADMIN" || role === "ADMIN" || role === "PRINCIPAL";
  const canReopen = role === "SUPER_ADMIN" || role === "ADMIN";

  const formClassArmIds = (serverState.formTeacherAssignments || [])
    .filter((a) => a.teacherId === user.id && a.active).map((a) => a.classArmId);
  const subjectAssignments = (serverState.teacherAssignments || [])
    .filter((a) => a.teacherId === user.id && a.active);

  function isMyFormClassArm(id) { return formClassArmIds.indexOf(id) > -1; }
  function isMySubjectClassPair(subjectId, classArmId) {
    return subjectAssignments.some((a) => a.subjectId === subjectId && a.classArmId === classArmId);
  }

  function deny(message) {
    const err = new Error(message);
    err.status = 403;
    throw err;
  }

  // 1. SUPER_ADMIN / ADMIN: trusted with everything (matches canManageSettings()).
  if (role === "SUPER_ADMIN" || role === "ADMIN") return;

  // 2. Everyone else (PRINCIPAL, ACADEMIC_SUPERVISOR, TEACHER): settings-type
  //    collections are off-limits, matching canManageSettings() being false
  //    for these roles client-side.
  for (const key of RESTRICTED_SETTINGS_KEYS) {
    if (jstr(payload[key]) !== jstr(serverState[key])) {
      deny(`Your role cannot change "${key}".`);
    }
  }

  // 3. Whole-school-but-not-admin roles (PRINCIPAL, ACADEMIC_SUPERVISOR):
  //    broad academic access, but publish/reopen still gated.
  if (isWholeSchoolRole) {
    checkPublishFields(payload.classSubjectStatus, serverState.classSubjectStatus, canPublish, canReopen, deny);
    checkClassApprovalFields(payload.classApproval, serverState.classApproval, canPublish, canReopen, deny);
    checkUsersChanges(payload.users, serverState.users, user, /*canManageWholeSchoolUsers*/ false, deny);
    return; // students/scores/comments/etc. are otherwise open to whole-school roles
  }

  // 4. TEACHER: narrowest role. Only the keys below may change at all.
  const changedTopKeys = Object.keys(payload).filter((k) => jstr(payload[k]) !== jstr(serverState[k]));
  for (const k of changedTopKeys) {
    if (TEACHER_ALLOWED_TOP_KEYS.indexOf(k) === -1) {
      deny(`Your role cannot change "${k}".`);
    }
  }

  // scores: only own subject/classArm pairs
  diffArrayById(payload.scores, serverState.scores).forEach((rec) => {
    if (!isMySubjectClassPair(rec.subjectId, rec.classArmId)) {
      deny("You can only enter scores for your own assigned subject/class.");
    }
  });

  // classSubjectStatus: key = classArmId::subjectId::sessionId::termId
  diffMapKeys(payload.classSubjectStatus, serverState.classSubjectStatus).forEach((key) => {
    const [classArmId, subjectId] = key.split("::");
    const allowed = isMyFormClassArm(classArmId) || isMySubjectClassPair(subjectId, classArmId);
    if (!allowed) deny("You are not assigned to that subject/class.");
  });
  checkPublishFields(payload.classSubjectStatus, serverState.classSubjectStatus, canPublish, canReopen, deny);

  // classApproval: key = classArmId::sessionId::termId — form teacher only
  diffMapKeys(payload.classApproval, serverState.classApproval).forEach((key) => {
    const classArmId = key.split("::")[0];
    if (!isMyFormClassArm(classArmId)) deny("You are not the form teacher for that class.");
  });
  checkClassApprovalFields(payload.classApproval, serverState.classApproval, canPublish, canReopen, deny);

  // studentComments / domainScores / attendance: key = studentId::sessionId::termId
  ["studentComments", "domainScores", "attendance"].forEach((mapKey) => {
    diffMapKeys(payload[mapKey], serverState[mapKey]).forEach((key) => {
      const studentId = key.split("::")[0];
      const classArmId = studentClassArmId(serverState, payload, studentId);
      if (!classArmId || !isMyFormClassArm(classArmId)) {
        deny("You are not the form teacher for that student's class.");
      }
    });
  });

  // students: add/edit/delete only within own form class arm(s)
  const studentChanges = diffArrayById(payload.students, serverState.students)
    .concat(diffArrayById(serverState.students, payload.students)); // catches deletions too
  studentChanges.forEach((rec) => {
    if (!isMyFormClassArm(rec.classArmId)) {
      deny("You can only add/edit students in your assigned class.");
    }
  });

  // users: may only touch own record, and only profile-ish fields
  checkUsersChanges(payload.users, serverState.users, user, /*canManageWholeSchoolUsers*/ false, deny);

  // auditLog: append-only (existing entries must not be edited/removed)
  const serverLog = serverState.auditLog || [];
  const payloadLog = payload.auditLog || [];
  if (payloadLog.length < serverLog.length || jstr(payloadLog.slice(0, serverLog.length)) !== jstr(serverLog)) {
    deny("Audit log entries cannot be modified or removed.");
  }
}

function diffArrayById(incoming, server) {
  const serverMap = {};
  (server || []).forEach((r) => { if (r && r.id) serverMap[r.id] = r; });
  return (incoming || []).filter((r) => r && r.id && jstr(r) !== jstr(serverMap[r.id]));
}

function diffMapKeys(incoming, server) {
  incoming = incoming || {};
  server = server || {};
  const keys = new Set([...Object.keys(incoming), ...Object.keys(server)]);
  return [...keys].filter((k) => jstr(incoming[k]) !== jstr(server[k]));
}

function checkPublishFields(incomingMap, serverMap, canPublish, canReopen, deny) {
  diffMapKeys(incomingMap, serverMap).forEach((key) => {
    const before = (serverMap || {})[key];
    const after = (incomingMap || {})[key];
    const beforeStatus = before || "PENDING";
    const afterStatus = after;
    if (afterStatus === "PUBLISHED" && !canPublish) deny("Only Admin/Principal/Super Admin can publish results.");
    if (beforeStatus === "PUBLISHED" && afterStatus !== "PUBLISHED" && !canReopen) deny("Only Admin/Super Admin can reopen published results.");
  });
}

function checkClassApprovalFields(incomingMap, serverMap, canPublish, canReopen, deny) {
  diffMapKeys(incomingMap, serverMap).forEach((key) => {
    const before = (serverMap || {})[key] || { status: "IN_PROGRESS" };
    const after = (incomingMap || {})[key] || { status: "IN_PROGRESS" };
    if (after.status === "PUBLISHED" && !canPublish) deny("Only Admin/Principal/Super Admin can publish results.");
    if (before.status === "PUBLISHED" && after.status !== "PUBLISHED" && !canReopen) deny("Only Admin/Super Admin can reopen published results.");
  });
}

function checkUsersChanges(incomingUsers, serverUsers, actingUser, canManageWholeSchoolUsers, deny) {
  diffArrayById(incomingUsers, serverUsers).forEach((rec) => {
    const before = byId(serverUsers, rec.id);
    const isNew = !before;
    const isOwnRecord = rec.id === actingUser.id;
    if (canManageWholeSchoolUsers) return; // ADMIN/SUPER_ADMIN handled earlier and never reach here
    if (!isOwnRecord) deny("You can only edit your own account.");
    if (isNew) deny("You cannot create new accounts.");
    // Own record: only these fields may change.
    const allowedFields = ["name", "password", "passwordHash", "photo", "signature"];
    Object.keys(rec).forEach((f) => {
      if (jstr(rec[f]) !== jstr(before[f]) && allowedFields.indexOf(f) === -1) {
        deny(`You cannot change your own "${f}".`);
      }
    });
  });
  // deletions of user records
  diffArrayById(serverUsers, incomingUsers).forEach(() => {
    deny("You cannot delete accounts.");
  });
}

module.exports = {
  sanitizeStateForClient,
  hashIncomingPasswords,
  mergeStale,
  enforceRbacOnSave,
};
