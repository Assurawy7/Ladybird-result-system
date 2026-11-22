/* ==========================================================================
   _ai.js - everything the AI-comments function needs that does NOT touch the
   database or HTTP: provider configuration, the prompt, calling an
   OpenAI-compatible chat endpoint, and - most importantly - the checks that
   stop an AI from putting something untrue or unkind on a report card.

   Works with any OpenAI-compatible service, so a FREE one can be used:
     * Groq    -> set GROQ_API_KEY            (free plan, fast)
     * Gemini  -> set GEMINI_API_KEY          (free tier, Google AI Studio key)
     * Other   -> set AI_API_KEY + AI_BASE_URL + AI_MODEL
   Up to three can be set; they are tried in the order above, so a second free
   service quietly covers for the first one's daily limit.
   The key is read from the environment here, on the server, and never leaves it.
   ========================================================================== */
"use strict";

const LIMITS = { batchMax: 6, formMax: 300, principalMax: 220 };
const BANDS = ["excellent", "good", "average", "below average", "weak"];

/* ---------------- provider configuration ---------------- */

function getProviders(env) {
  env = env || process.env;
  if (String(env.AI_ENABLED || "").toLowerCase() === "false") return [];
  const out = [];
  const add = (label, baseUrl, apiKey, model) => {
    if (!apiKey || !baseUrl || !model) return;
    baseUrl = String(baseUrl).replace(/\/+$/, "");
    if (out.some((p) => p.apiKey === apiKey && p.baseUrl === baseUrl)) return;
    out.push({ label, baseUrl, apiKey: String(apiKey).trim(), model: String(model).trim() });
  };
  // Generic: any OpenAI-compatible service (Groq by default)
  if (env.AI_API_KEY) {
    const base = env.AI_BASE_URL || "https://api.groq.com/openai/v1";
    let label = env.AI_PROVIDER_LABEL;
    if (!label) { try { label = new URL(base).hostname.replace(/^api\./, ""); } catch (e) { label = "AI"; } }
    add(label, base, env.AI_API_KEY, env.AI_MODEL || "openai/gpt-oss-120b");
  }
  // Convenience keys: just paste the key, the address and a current model are built in.
  // (Model names get retired by the providers - override with GROQ_MODEL / GEMINI_MODEL.)
  add("Groq", "https://api.groq.com/openai/v1", env.GROQ_API_KEY, env.GROQ_MODEL || "openai/gpt-oss-120b");
  add("Gemini", "https://generativelanguage.googleapis.com/v1beta/openai", env.GEMINI_API_KEY, env.GEMINI_MODEL || "gemini-2.5-flash");
  return out;
}

/* ---------------- request hygiene ---------------- */

const str = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n || 80);
const num = (v, lo, hi) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; };
const strList = (v, max, n) => (Array.isArray(v) ? v : []).map((x) => str(x, n || 60)).filter(Boolean).slice(0, max || 4);
const traitBlock = (v) => (v && typeof v === "object") ? { strong: strList(v.strong, 3), weak: strList(v.weak, 3) } : null;

/* Whatever the browser sends is reduced to this fixed, anonymous shape. */
function sanitizeItem(raw, i) {
  raw = raw || {};
  const gender = raw.gender === "male" || raw.gender === "female" ? raw.gender : "unknown";
  const att = raw.attendance && typeof raw.attendance === "object" ? num(raw.attendance.percent, 0, 100) : null;
  return {
    ref: /^[A-Za-z0-9_-]{1,16}$/.test(String(raw.ref)) ? String(raw.ref) : "r" + i,
    gender,
    band: BANDS.indexOf(raw.band) > -1 ? raw.band : "average",
    average: num(raw.average, 0, 100),
    classAverage: num(raw.classAverage, 0, 100),
    position: num(raw.position, 1, 500),
    classSize: num(raw.classSize, 1, 500),
    strongest: strList(raw.strongest, 3),
    weakest: strList(raw.weakest, 3),
    failing: num(raw.failing, 0, 60),
    subjectsCount: num(raw.subjectsCount, 0, 60),
    attendance: att === null ? null : { percent: Math.round(att) },
    behaviour: traitBlock(raw.behaviour),
    skills: traitBlock(raw.skills),
  };
}

/* ---------------- the prompt ---------------- */

function pronounsFor(g) {
  return g === "male" ? "he/him/his" : g === "female" ? "she/her/her" : "none - do not use he/she/him/her/his; use the {{NAME}} token or rephrase";
}

function buildMessages(items, parts, ctx) {
  ctx = ctx || {};
  const wantPrincipal = parts.indexOf("principal") > -1, wantForm = parts.indexOf("form") > -1;
  const spec = [];
  if (wantForm) spec.push('"form": the Form Teacher\'s comment - exactly 2 or 3 sentences, 30 to 45 words');
  if (wantPrincipal) spec.push('"principal": the Principal\'s comment - 1 or 2 formal sentences, 15 to 28 words, a different voice from the form teacher');
  const system =
    "You write end-of-term report-card remarks for a Nigerian school (" + str(ctx.level || "school", 40) + ", " + str(ctx.term || "this term", 30) + "). " +
    "You will receive anonymous student records as JSON. For EACH record write:\n- " + spec.join("\n- ") + "\n\n" +
    "STRICT RULES:\n" +
    "1. Use ONLY the facts in the record. Never invent or imply anything that is not there: no attendance, punctuality, behaviour, character, effort, attitude, leadership, prizes, clubs, sports, competitions or improvement over earlier terms.\n" +
    "2. If \"attendance\" is null say nothing about attendance or punctuality. If \"behaviour\" and \"skills\" are null say nothing about conduct, behaviour, manners, discipline or character.\n" +
    "3. Mention a subject only if it appears in that record's \"strongest\" or \"weakest\" list.\n" +
    "4. Do not write any digits or marks (no \"75%\", no positions like \"3rd\"). Describe performance in words only.\n" +
    "5. Never write a student's name. Where a name belongs write the exact token {{NAME}} (at most once per comment) and otherwise use the pronouns given in \"pronouns\". If pronouns say none, never use he/she/him/her/his.\n" +
    "6. Be professional, warm and honest, in clear British/Nigerian English. Encourage every student. For \"weak\" and \"below average\" students be kind and constructive, name concrete next steps, and never use words like lazy, stupid, hopeless, failure or disappointing.\n" +
    "7. Fit the performance \"band\": excellent = high praise; good = praise with a push to aim higher; average = fair, steady, room to grow; below average / weak = gentle, supportive and specific.\n" +
    "8. Every comment must read differently from the others in the batch - vary sentence openings and wording. No emojis, no bullet points, no quotation marks, no headings.\n\n" +
    'Reply with JSON only, in exactly this shape: {"results":[{"ref":"<same ref>"' + (wantForm ? ',"form":"..."' : "") + (wantPrincipal ? ',"principal":"..."' : "") + "}]}";
  const records = items.map((it) => ({
    ref: it.ref, pronouns: pronounsFor(it.gender), band: it.band,
    average_percent: it.average, class_average_percent: it.classAverage,
    position: it.position, class_size: it.classSize,
    strongest_subjects: it.strongest, weakest_subjects: it.weakest,
    subjects_below_pass_mark: it.failing, subjects_taken: it.subjectsCount,
    attendance_percent: it.attendance ? it.attendance.percent : null,
    behaviour: it.behaviour, skills: it.skills,
  }));
  return [
    { role: "system", content: system },
    { role: "user", content: "Records:\n" + JSON.stringify(records) },
  ];
}

/* ---------------- reading the reply ---------------- */

function parseAiJson(text) {
  text = String(text || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const tryParse = (s) => { try { return JSON.parse(s); } catch (e) { return undefined; } };
  let v = tryParse(text);
  if (v === undefined) {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a > -1 && b > a) v = tryParse(text.slice(a, b + 1));
  }
  if (v === undefined) {
    const a = text.indexOf("["), b = text.lastIndexOf("]");
    if (a > -1 && b > a) v = tryParse(text.slice(a, b + 1));
  }
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object");
  if (v && Array.isArray(v.results)) return v.results.filter((x) => x && typeof x === "object");
  return [];
}

function cleanComment(t) {
  t = String(t == null ? "" : t);
  t = t.replace(/<[^>]*>/g, " ").replace(/[*_`#>]+/g, "");
  t = t.replace(/\[NAME\]|<NAME>|\{NAME\}|\{\{\s*name\s*\}\}/gi, "{{NAME}}");
  t = t.replace(/^\s*(form teacher'?s?|principal'?s?)\s*(comment|remark)?\s*[:\-]\s*/i, "");
  t = t.replace(/^["'\u201c\u2018]+|["'\u201d\u2019]+$/g, "");
  return t.replace(/\s+/g, " ").trim();
}

/* ---------------- the truthfulness / kindness checks ---------------- */

const RX = {
  attendance: /\b(attend\w*|absen\w*|punctual\w*|truan\w*|lateness|regular(?:ly)? in school)\b/i,
  behaviour: /\b(behaviou?r\w*|behav\w*|conduct|disciplin\w*|polite\w*|respect\w*|cooperat\w*|co-operat\w*|obedien\w*|well-mannered|manners|character|attitude\w*|leadership|neat\w*|honest\w*|diligen\w*|hard-?working|hardworking|punctual\w*)\b/i,
  achievements: /\b(prize\w*|award\w*|trophy|trophies|medal\w*|captain|prefect|champion\w*|competition\w*|winner|won|scholarship|debate\w*|quiz\w*|sport\w*|club|clubs|choir|olympiad|improv\w*)\b/i,
  harsh: /\b(lazy|stupid|dull|hopeless|useless|pathetic|disgrac\w*|shameful|dunce|failure|disappoint\w*|careless|poor performance)\b/i,
  male: /\b(she|her|hers|herself)\b/i,
  female: /\b(he|him|his|himself)\b/i,
  anyGendered: /\b(he|she|him|her|his|hers|himself|herself)\b/i,
};

/* Returns null when the comment is acceptable, otherwise a short reason. */
function checkComment(text, kind, item, ctx) {
  ctx = ctx || {};
  if (!text) return "empty";
  const max = kind === "principal" ? LIMITS.principalMax : LIMITS.formMax;
  const shown = text.replace(/\{\{NAME\}\}/g, "Ayo");
  if (shown.length > max) return "too long";
  if (shown.length < 25) return "too short";
  if ((text.match(/\{\{NAME\}\}/g) || []).length > 1) return "name repeated";
  if (/\{\{|\}\}/.test(text.replace(/\{\{NAME\}\}/g, ""))) return "stray placeholder";
  if (/\d/.test(text)) return "contains numbers";
  if (RX.harsh.test(text)) return "unkind wording";
  if (RX.achievements.test(text)) return "claims an achievement or activity";
  if (!item.attendance && RX.attendance.test(text)) return "mentions attendance without data";
  if (!item.behaviour && !item.skills && RX.behaviour.test(text)) return "mentions behaviour without data";
  if (item.gender === "male" && RX.male.test(text)) return "wrong pronoun";
  if (item.gender === "female" && RX.female.test(text)) return "wrong pronoun";
  if (item.gender === "unknown" && RX.anyGendered.test(text)) return "pronoun without gender";
  // subjects: only this student's strongest / weakest may be named
  const low = shown.toLowerCase();
  const allowed = item.strongest.concat(item.weakest).map((s) => s.toLowerCase());
  const known = (ctx.subjectNames || []).map((s) => String(s).toLowerCase()).filter((s) => s.length >= 4);
  for (const s of known) {
    if (allowed.some((a) => a === s || a.indexOf(s) > -1 || s.indexOf(a) > -1)) continue;
    if (new RegExp("\\b" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(low)) return "names a subject that is not in the record";
  }
  return null;
}

/* ---------------- calling one provider ---------------- */

async function callProvider(p, messages, opts) {
  opts = opts || {};
  const fetchImpl = opts.fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!fetchImpl) return { ok: false, kind: "network", status: 0 };
  const isOss = /gpt-oss/i.test(p.model);
  const attempt = async (jsonMode, timeoutMs) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const body = { model: p.model, messages, temperature: 0.85, max_tokens: 1800 };
      if (jsonMode) body.response_format = { type: "json_object" };
      if (isOss) body.reasoning_effort = "low";
      const res = await fetchImpl(p.baseUrl + "/chat/completions", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + p.apiKey },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = ""; try { msg = String(await res.text()).slice(0, 300); } catch (e) {}
        const ra = Number(res.headers && res.headers.get && res.headers.get("retry-after"));
        return { ok: false, status: res.status, msg, retryAfter: Number.isFinite(ra) ? ra : null };
      }
      const data = await res.json();
      const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!text) return { ok: false, status: 502, msg: "empty reply" };
      return { ok: true, text: String(text) };
    } catch (e) {
      return { ok: false, status: 0, aborted: e && e.name === "AbortError", msg: String(e && e.message).slice(0, 120) };
    } finally { clearTimeout(timer); }
  };
  const budget = Math.max(1500, opts.timeoutMs || 8000);
  const started = Date.now();
  let r = await attempt(true, budget);
  // some services reject JSON mode / reasoning options: retry once without them
  if (!r.ok && r.status === 400 && !/model/i.test(r.msg || "") && budget - (Date.now() - started) > 2500) {
    r = await attempt(false, budget - (Date.now() - started));
  }
  if (r.ok) return r;
  const kind = r.aborted ? "timeout" : r.status === 0 ? "network" : (r.status === 401 || r.status === 403) ? "auth" :
    (r.status === 404 || (r.status === 400 && /model/i.test(r.msg || ""))) ? "model" : r.status === 429 ? "rate" : r.status >= 500 ? "server" : "bad";
  return { ok: false, kind, status: r.status, retryAfter: r.retryAfter || null };
}

/* ---------------- one batch, with failover between providers ---------------- */

const ERROR_CODE = { auth: "AI_AUTH", model: "AI_MODEL", rate: "AI_RATE_LIMIT", timeout: "AI_TIMEOUT", network: "AI_UNAVAILABLE", server: "AI_UNAVAILABLE", bad: "AI_UNAVAILABLE" };

async function generate(opts) {
  const providers = opts.providers || [];
  if (!providers.length) return { ok: false, code: "AI_NOT_CONFIGURED" };
  const items = opts.items, parts = opts.parts, ctx = opts.ctx || {};
  const deadline = opts.deadline || (Date.now() + 8500);
  const messages = buildMessages(items, parts, ctx);
  let last = null;
  for (const p of providers) {
    const left = deadline - Date.now();
    if (left < 2500) break;
    const r = await callProvider(p, messages, { timeoutMs: left - 400, fetchImpl: opts.fetchImpl });
    if (!r.ok) { last = r; continue; }
    const parsed = parseAiJson(r.text);
    const byRef = {};
    parsed.forEach((x) => { if (x && x.ref != null) byRef[String(x.ref)] = x; });
    const results = [], failed = [], seen = {};
    for (const it of items) {
      const got = byRef[it.ref];
      const out = { ref: it.ref };
      let bad = false;
      if (!got) bad = true;
      else {
        for (const kind of parts) {
          const text = cleanComment(got[kind]);
          const why = checkComment(text, kind, it, ctx);
          const dupKey = kind + "|" + text.toLowerCase();
          if (why || seen[dupKey]) { bad = true; out[kind] = null; out[kind + "Reason"] = why || "duplicate"; }
          else { out[kind] = text; seen[dupKey] = 1; }
        }
      }
      if (bad) failed.push(it.ref);
      results.push(out);
    }
    return { ok: true, provider: p.label, results, failed };
  }
  const code = last ? (ERROR_CODE[last.kind] || "AI_UNAVAILABLE") : "AI_TIMEOUT";
  return { ok: false, code, retryAfter: last && last.retryAfter || null };
}

module.exports = { LIMITS, BANDS, getProviders, sanitizeItem, buildMessages, parseAiJson, cleanComment, checkComment, callProvider, generate, str, strList };
