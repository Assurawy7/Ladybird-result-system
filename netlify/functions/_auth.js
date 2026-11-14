/* ==========================================================================
   _auth.js — session cookies, password hashing, and the SAME role logic
   that source/03-auth.js already implements client-side (isWholeSchoolRole,
   canManageSettings, canPublish, myFormClassArmIds, mySubjectAssignments,
   canEnterScores, isFormTeacherOf). Kept 1:1 with the frontend so "what the
   UI lets you click" and "what the server accepts" agree (see master prompt
   section 15) — the frontend copies are UI convenience, this file is the
   real enforcement.
   ========================================================================== */
"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { query } = require("./_db");

const SESSION_COOKIE = "ladybird_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, matches the old "stay logged in" local session behavior

/* ---------------- password hashing ---------------- */

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}
async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(plain), hash);
}

/* ---------------- session tokens ---------------- */

function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createSession(userId, userAgent) {
  const token = newSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query(
    "INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES ($1, $2, $3, $4)",
    [tokenHash, userId, expiresAt, userAgent || null]
  );
  // Housekeeping: expired sessions were previously only removed when someone
  // happened to use them. Failure here must never block a login.
  try { await query("DELETE FROM sessions WHERE expires_at < NOW()"); } catch (e) { console.error("session purge failed", e); }
  return { token, expiresAt };
}

async function destroySessionByToken(token) {
  if (!token) return;
  await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

async function getUserIdForToken(token) {
  if (!token) return null;
  const res = await query(
    "SELECT user_id, expires_at FROM sessions WHERE token_hash = $1",
    [hashToken(token)]
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
    return null;
  }
  return row.user_id;
}

/* ---------------- cookies ---------------- */

function parseCookies(headers) {
  const raw = (headers && (headers.cookie || headers.Cookie)) || "";
  const out = {};
  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function sessionCookieHeader(token, expiresAt) {
  const secure = process.env.NETLIFY_DEV ? "" : "Secure; ";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${secure}SameSite=Lax; Expires=${expiresAt.toUTCString()}`;
}

function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Resolve the authenticated user (fresh from the given state, never trusted
 * from the client) for a Netlify Functions `event`. Returns { userId, user }
 * or null if there is no valid session.
 */
async function getAuthedUser(event, state) {
  const cookies = parseCookies(event.headers || {});
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const userId = await getUserIdForToken(token);
  if (!userId) return null;
  const user = (state.users || []).find((u) => u.id === userId && u.active);
  if (!user) return null;
  return { userId, user, token };
}

/* ---------------- role logic (ported 1:1 from source/03-auth.js) ---------------- */

function isWholeSchoolRole(role) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "PRINCIPAL" || role === "ACADEMIC_SUPERVISOR";
}
function canManageSettings(user) {
  return !!user && (user.role === "SUPER_ADMIN" || user.role === "ADMIN");
}
function canPublish(user) {
  return !!user && (user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "PRINCIPAL");
}
function myFormClassArmIds(state, userId) {
  return (state.formTeacherAssignments || [])
    .filter((a) => a.teacherId === userId && a.active)
    .map((a) => a.classArmId);
}
function mySubjectAssignments(state, userId) {
  return (state.teacherAssignments || []).filter((a) => a.teacherId === userId && a.active);
}
function canAccessClassArm(state, user, classArmId) {
  if (!user) return false;
  if (isWholeSchoolRole(user.role)) return true;
  return myFormClassArmIds(state, user.id).indexOf(classArmId) > -1;
}
function canEnterScores(state, user, subjectId, classArmId) {
  if (!user) return false;
  if (isWholeSchoolRole(user.role)) return true;
  return mySubjectAssignments(state, user.id).some(
    (a) => a.subjectId === subjectId && a.classArmId === classArmId
  );
}
function isFormTeacherOf(state, user, classArmId) {
  if (!user) return false;
  if (isWholeSchoolRole(user.role)) return true;
  return myFormClassArmIds(state, user.id).indexOf(classArmId) > -1;
}


/* --------------------------------------------------------------------------
   getAuthedUserLight(event)
   Same answer as getAuthedUser(), but WITHOUT reading the whole school
   database out of Neon. One query joins the session row to just this one
   user's record inside the JSON, so only that single user crosses the
   network (previously every photo, login and page-load pulled the entire
   school state, which is what exhausted the Neon transfer allowance).
   Who is allowed in is unchanged: a valid, unexpired session whose user is
   still active. Returns { userId, user } (never includes password fields)
   or null.
   -------------------------------------------------------------------------- */
async function getAuthedUserLight(event) {
  const token = parseCookies(event.headers || {})[SESSION_COOKIE];
  if (!token) return null;
  const res = await query(
    "SELECT s.user_id, u.usr FROM sessions s " +
    "JOIN school_state ss ON ss.id = 1 " +
    "JOIN LATERAL jsonb_array_elements(COALESCE(ss.state->'users', '[]'::jsonb)) AS u(usr) ON u.usr->>'id' = s.user_id " +
    "WHERE s.token_hash = $1 AND s.expires_at > NOW() AND (u.usr->>'active')::boolean IS TRUE LIMIT 1",
    [hashToken(token)]
  );
  if (!res.rows.length) return null;
  const user = res.rows[0].usr;
  delete user.passwordHash; delete user.password;
  return { userId: user.id, user };
}

function getClientIp(event) {
  const h = (event && event.headers) || {};
  const direct = h["x-nf-client-connection-ip"] || h["client-ip"];
  if (direct) return String(direct).trim();
  const fwd = h["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return "unknown";
}

module.exports = {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  createSession,
  destroySessionByToken,
  getUserIdForToken,
  parseCookies,
  sessionCookieHeader,
  clearSessionCookieHeader,
  getAuthedUser,
  getAuthedUserLight,
  getClientIp,
  isWholeSchoolRole,
  canManageSettings,
  canPublish,
  myFormClassArmIds,
  mySubjectAssignments,
  canAccessClassArm,
  canEnterScores,
  isFormTeacherOf,
};
