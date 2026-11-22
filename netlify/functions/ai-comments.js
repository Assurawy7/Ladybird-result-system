/* ==========================================================================
   /.netlify/functions/ai-comments
     GET  -> { ok, configured, providers:[labels], batchMax }      (is AI set up?)
     POST -> body { classArmId, level, term, parts:["form","principal"],
                    subjectNames:[...], items:[ anonymous student facts ] }
          -> { ok:true, provider, results:[{ref,form,principal}], failed:[refs] }
          or { ok:false, code:"AI_NOT_CONFIGURED|AI_AUTH|AI_MODEL|AI_RATE_LIMIT|
                              AI_TIMEOUT|AI_UNAVAILABLE", ... }

   Security:
   * Same session cookie as every other function; same role rules as the app
     (whole-school roles, or the Form Teacher of THAT class; only Principal /
     Admin / Super Admin may generate Principal's comments).
   * The API key is read from the environment here and is never sent to the
     browser. The browser only ever talks to this function (the site's
     Content-Security-Policy allows nothing else).
   * Student names, admission numbers and photos are never part of a request:
     the facts are anonymous and the browser puts the first name back in.
   * Light on the database: one tiny query at most (a Form Teacher's own
     class assignment) - the whole school document is never read here.
   * Netlify stops synchronous functions at 10 s, so each call handles a small
     batch and gives up cleanly (the browser then uses its built-in writer).
   ========================================================================== */
"use strict";

const crypto = require("crypto");
const { query } = require("./_db");
const { getAuthedUserLight, isWholeSchoolRole } = require("./_auth");
const AI = require("./_ai");

const json = (statusCode, obj) => ({ statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });
const MAX_BODY = 60000;
const RATE_WINDOW_MS = 10 * 60 * 1000, RATE_MAX = 90;       // per user, per function instance
const CACHE_MS = 2 * 60 * 1000;                              // identical request within 2 minutes = same answer, no second AI call

const rate = new Map();        // userId -> [timestamps]
const cache = new Map();       // key -> { at, value }
const inflight = new Map();    // key -> Promise  (a double-click joins the first request)

function tooMany(userId) {
  const now = Date.now();
  const list = (rate.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) { rate.set(userId, list); return true; }
  list.push(now); rate.set(userId, list);
  return false;
}
function sweep() {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.at > CACHE_MS) cache.delete(k);
  if (rate.size > 500) rate.clear();
}

async function isFormTeacherOf(userId, classArmId) {
  const r = await query(
    "SELECT 1 FROM school_state ss, jsonb_array_elements(COALESCE(ss.state->'formTeacherAssignments','[]'::jsonb)) AS a(x) " +
    "WHERE ss.id = 1 AND a.x->>'teacherId' = $1 AND a.x->>'classArmId' = $2 AND COALESCE((a.x->>'active')::boolean, false) LIMIT 1",
    [userId, classArmId]
  );
  return r.rows.length > 0;
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  if (method !== "GET" && method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  let auth;
  try { auth = await getAuthedUserLight(event); }
  catch (e) { console.error("ai-comments auth error", e); return json(500, { ok: false, error: "Could not reach the database." }); }
  if (!auth) return json(401, { ok: false, error: "Not signed in." });
  const user = auth.user;

  const providers = AI.getProviders(process.env);

  if (method === "GET") {
    return json(200, { ok: true, configured: providers.length > 0, providers: providers.map((p) => p.label), batchMax: AI.LIMITS.batchMax });
  }

  if (String(event.body || "").length > MAX_BODY) return json(413, { ok: false, error: "Request too large." });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { ok: false, error: "Invalid JSON" }); }

  const classArmId = AI.str(body.classArmId, 80);
  const parts = (Array.isArray(body.parts) ? body.parts : []).filter((p) => p === "form" || p === "principal");
  const items = Array.isArray(body.items) ? body.items : [];
  if (!classArmId || !parts.length) return json(400, { ok: false, error: "classArmId and parts are required." });
  if (!items.length || items.length > AI.LIMITS.batchMax) return json(400, { ok: false, error: "Send between 1 and " + AI.LIMITS.batchMax + " students per request." });

  // ---- who may do this (same rules as the app) ----
  const canPrincipal = user.role === "PRINCIPAL" || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (parts.indexOf("principal") > -1 && !canPrincipal) {
    return json(403, { ok: false, error: "Only the Principal or an Admin can generate Principal's comments." });
  }
  try {
    if (!isWholeSchoolRole(user.role) && !(await isFormTeacherOf(user.id, classArmId))) {
      return json(403, { ok: false, error: "You can only generate comments for the class you are Form Teacher of." });
    }
  } catch (e) {
    console.error("ai-comments permission check failed", e);
    return json(500, { ok: false, error: "Could not check permissions." });
  }

  if (!providers.length) return json(200, { ok: false, code: "AI_NOT_CONFIGURED" });
  if (tooMany(user.id)) return json(429, { ok: false, code: "AI_RATE_LIMIT", retryAfter: 30, error: "Too many AI requests - wait a moment." });

  const clean = items.map(AI.sanitizeItem);
  const ctx = { level: AI.str(body.level, 40), term: AI.str(body.term, 30), subjectNames: AI.strList(body.subjectNames, 80, 60) };
  const key = user.id + ":" + crypto.createHash("sha256").update(JSON.stringify([classArmId, parts, clean, ctx.level, ctx.term, body.variant || 0])).digest("hex");

  sweep();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return json(200, hit.value);
  if (inflight.has(key)) return json(200, await inflight.get(key));

  const work = (async () => {
    const r = await AI.generate({ providers, items: clean, parts, ctx, deadline: Date.now() + 8500 });
    if (r.ok) cache.set(key, { at: Date.now(), value: r });
    return r;
  })();
  inflight.set(key, work);
  try {
    const r = await work;
    if (!r.ok) console.warn("ai-comments: " + r.code);   // never log keys, names or comments
    return json(200, r);
  } catch (e) {
    console.error("ai-comments error", e && e.message);
    return json(200, { ok: false, code: "AI_UNAVAILABLE" });
  } finally { inflight.delete(key); }
};
