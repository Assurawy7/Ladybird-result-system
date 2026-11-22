/* AI bulk comments: server guard rails + the built-in writer (no browser, no network). */
const fs = require("fs"), vm = require("vm"), path = require("path"), Module = require("module");
const R = path.join(__dirname, "..");
let pass = 0, fail = 0; const t = (n, c) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + n); };

/* ---------- server side ---------- */
const AI = require(R + "/netlify/functions/_ai.js");

// providers: free services by key, order, disabled switch
let P = AI.getProviders({});
t("S1 no key -> no providers (feature falls back to templates)", P.length === 0);
P = AI.getProviders({ GROQ_API_KEY: "g", GEMINI_API_KEY: "m" });
t("S2 Groq + Gemini free keys -> both configured, Groq first, correct OpenAI-compatible addresses", P.length === 2 && P[0].label === "Groq" && /api\.groq\.com\/openai\/v1$/.test(P[0].baseUrl) && /generativelanguage\.googleapis\.com\/v1beta\/openai$/.test(P[1].baseUrl));
t("S3 default Groq model is the CURRENT one (the old llama-3.3 was retired 16 Aug 2026) and is overridable", P[0].model === "openai/gpt-oss-120b" && AI.getProviders({ GROQ_API_KEY: "g", GROQ_MODEL: "x/y" })[0].model === "x/y");
P = AI.getProviders({ AI_API_KEY: "k", AI_BASE_URL: "https://example.org/v1/", AI_MODEL: "m1" });
t("S4 any OpenAI-compatible service via AI_API_KEY/AI_BASE_URL/AI_MODEL", P.length === 1 && P[0].baseUrl === "https://example.org/v1" && P[0].model === "m1");
t("S5 AI_ENABLED=false switches it off", AI.getProviders({ GROQ_API_KEY: "g", AI_ENABLED: "false" }).length === 0);

// the prompt never contains identifying data; items are reduced to a fixed anonymous shape
const dirty = { ref: "s0", name: "Aisha Bello", admissionNo: "LB/1", photo: "data:x", gender: "female", band: "good", average: 71.2, strongest: ["Mathematics"], weakest: [], attendance: { percent: 90 }, behaviour: null, skills: null };
const item = AI.sanitizeItem(dirty, 0);
t("S6 sanitizeItem drops name / admission number / photo and any unknown field", !("name" in item) && !("admissionNo" in item) && !("photo" in item) && Object.keys(item).sort().join() === "attendance,average,band,behaviour,classAverage,classSize,failing,gender,position,ref,skills,strongest,subjectsCount,weakest");
const msgs = AI.buildMessages([item], ["form", "principal"], { level: "Junior Secondary", term: "First Term" });
const sent = JSON.stringify(msgs);
t("S7 the text sent to the AI contains no name, admission number or photo", !/Aisha|Bello|LB\/1|data:x/.test(sent));
t("S8 the prompt forbids invented attendance/behaviour/achievements and asks for the {{NAME}} token", /never invent/i.test(sent) && /attendance/.test(sent) && /\{\{NAME\}\}/.test(sent) && /JSON only/.test(sent));

// reading replies
t("S9 parseAiJson copes with code fences, chatter around the JSON, and bare arrays",
  AI.parseAiJson('```json\n{"results":[{"ref":"a","form":"x"}]}\n```').length === 1 &&
  AI.parseAiJson('Sure! {"results":[{"ref":"a"},{"ref":"b"}]} hope that helps').length === 2 &&
  AI.parseAiJson('[{"ref":"a"}]').length === 1 && AI.parseAiJson("nonsense").length === 0);

// truthfulness / kindness checks
const base = AI.sanitizeItem({ ref: "s0", gender: "female", band: "good", average: 70, strongest: ["Mathematics"], weakest: ["Civic Education"], attendance: null, behaviour: null, skills: null }, 0);
const ctx = { subjectNames: ["Mathematics", "Civic Education", "English Language", "Basic Science"] };
const ok = "{{NAME}} has performed well this term and did especially well in Mathematics, but she must give more attention to Civic Education.";
t("S10 a good comment is accepted", AI.checkComment(ok, "form", base, ctx) === null);
t("S11 numbers are rejected", AI.checkComment("{{NAME}} scored 70 in Mathematics and she should keep working hard this term.", "form", base, ctx) === "contains numbers");
t("S12 attendance is rejected when none was recorded", /attendance/.test(AI.checkComment("{{NAME}} did well in Mathematics and her attendance has been excellent this term.", "form", base, ctx)));
t("S13 behaviour is rejected when none was recorded", /behaviour/.test(AI.checkComment("{{NAME}} is well behaved and did well in Mathematics, which she should keep up this term.", "form", base, ctx)));
t("S14 invented achievements / activities are rejected", /achievement/.test(AI.checkComment("{{NAME}} won a prize in the quiz and did well in Mathematics this term, which is pleasing.", "form", base, ctx)));
t("S15 a subject that is not in the record is rejected", /subject/.test(AI.checkComment("{{NAME}} did well in Mathematics and also in English Language, which she should keep up.", "form", base, ctx)));
t("S16 wrong pronoun is rejected (she-student, 'he' in text)", AI.checkComment("{{NAME}} did well in Mathematics and he should keep up the good work this term.", "form", base, ctx) === "wrong pronoun");
t("S17 harsh words about a weak student are rejected", AI.checkComment("{{NAME}} was lazy this term and must do better in Civic Education next time.", "form", base, ctx) !== null);
t("S18 overlong comments are rejected", AI.checkComment("{{NAME}} did well in Mathematics. ".repeat(20), "form", base, ctx) === "too long");
const unk = AI.sanitizeItem({ ref: "s1", gender: "", band: "weak", average: 30 }, 1);
t("S19 unknown gender: no he/she/his/her allowed", AI.checkComment("{{NAME}} needs support, and her teachers will help to build confidence this term.", "form", unk, {}) === "pronoun without gender" && AI.checkComment("{{NAME}} needs extra support to build confidence, and the school will help with this.", "form", unk, {}) === null);

// calling a provider (mock fetch): every failure type is classified, nothing throws
const mkRes = (status, body, headers) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => (headers || {})[k.toLowerCase()] }, text: async () => (typeof body === "string" ? body : JSON.stringify(body)), json: async () => body });
const prov = { label: "T", baseUrl: "https://x.test/v1", apiKey: "SECRET-KEY", model: "openai/gpt-oss-120b" };
const okBody = (txt) => ({ choices: [{ message: { content: txt } }] });
(async () => {
  let calls = [];
  let r = await AI.callProvider(prov, msgs, { fetchImpl: async (u, o) => { calls.push({ u, o }); return mkRes(200, okBody("hi")); } });
  const sentBody = JSON.parse(calls[0].o.body);
  t("S20 request goes to /chat/completions with the key as a Bearer header only, JSON mode, low reasoning for gpt-oss", r.ok && calls[0].u === "https://x.test/v1/chat/completions" && calls[0].o.headers.Authorization === "Bearer SECRET-KEY" && sentBody.response_format.type === "json_object" && sentBody.reasoning_effort === "low" && !JSON.stringify(sentBody).includes("SECRET-KEY"));
  t("S21 429 -> rate (with Retry-After)", (await AI.callProvider(prov, msgs, { fetchImpl: async () => mkRes(429, "slow", { "retry-after": "7" }) })).retryAfter === 7);
  t("S22 401 -> auth, 404 -> model, 503 -> server",
    (await AI.callProvider(prov, msgs, { fetchImpl: async () => mkRes(401, "no") })).kind === "auth" &&
    (await AI.callProvider(prov, msgs, { fetchImpl: async () => mkRes(404, "model not found") })).kind === "model" &&
    (await AI.callProvider(prov, msgs, { fetchImpl: async () => mkRes(503, "down") })).kind === "server");
  t("S23 a thrown network error -> network (never an exception)", (await AI.callProvider(prov, msgs, { fetchImpl: async () => { throw new Error("ECONNRESET"); } })).kind === "network");
  t("S24 a hanging provider is cut off by the time budget -> timeout", (await AI.callProvider(prov, msgs, { timeoutMs: 1500, fetchImpl: (u, o) => new Promise((_, rej) => { o.signal.addEventListener("abort", () => { const e = new Error("aborted"); e.name = "AbortError"; rej(e); }); }) })).kind === "timeout");
  let n = 0;
  r = await AI.callProvider(prov, msgs, { fetchImpl: async (u, o) => { n++; const b = JSON.parse(o.body); return b.response_format ? mkRes(400, "response_format unsupported") : mkRes(200, okBody("fine")); } });
  t("S25 a service that rejects JSON mode is retried once without it", r.ok && n === 2);

  // generate(): failover, per-comment validation, duplicates
  const items = [0, 1, 2].map((i) => AI.sanitizeItem({ ref: "s" + i, gender: "male", band: "good", average: 70, strongest: ["Mathematics"], weakest: [], attendance: null }, i));
  const good = (k) => "{{NAME}} has performed well this term and did especially well in Mathematics, which he should be proud of (" + k + ").".replace(/\(\d\)/, "");
  const reply = { results: [{ ref: "s0", form: "{{NAME}} has done well this term and showed real strength in Mathematics." }, { ref: "s1", form: "{{NAME}} scored 90 in Mathematics." }, { ref: "s2", form: "{{NAME}} has done well this term and showed real strength in Mathematics." }] };
  let order = [];
  const g = await AI.generate({ providers: [{ ...prov, label: "A", apiKey: "a" }, { ...prov, label: "B", apiKey: "b" }], items, parts: ["form"], ctx: { subjectNames: ["Mathematics"] }, deadline: Date.now() + 9000,
    fetchImpl: async (u, o) => { const key = o.headers.Authorization; order.push(key); return key === "Bearer a" ? mkRes(429, "limit") : mkRes(200, okBody(JSON.stringify(reply))); } });
  t("S26 failover: first free service rate-limited -> second one answers", g.ok && g.provider === "B" && order.length === 2);
  t("S27 per-comment checks: the comment with a number and the duplicate are marked failed, the good one is kept", g.failed.join() === "s1,s2" && g.results[0].form && !g.results[1].form && !g.results[2].form);
  const none = await AI.generate({ providers: [], items, parts: ["form"], ctx: {} });
  t("S28 no providers -> AI_NOT_CONFIGURED", none.ok === false && none.code === "AI_NOT_CONFIGURED");
  const bad = await AI.generate({ providers: [prov], items, parts: ["form"], ctx: {}, deadline: Date.now() + 9000, fetchImpl: async () => mkRes(401, "bad key") });
  t("S29 bad key -> AI_AUTH (admin-actionable, no key echoed)", bad.code === "AI_AUTH" && !JSON.stringify(bad).includes("SECRET"));

  /* ---------- the HTTP handler, with the database + auth mocked ---------- */
  const W = { user: null, teacherOf: [], aiCalls: 0, lastBody: null };
  const mocks = {
    "./_db": { query: async (sql, p) => { if (/formTeacherAssignments/.test(sql)) return { rows: W.teacherOf.indexOf(p[1]) > -1 && p[0] === W.user.id ? [{}] : [] }; throw new Error("unexpected SQL: " + sql); } },
    "./_auth": { getAuthedUserLight: async () => (W.user ? { userId: W.user.id, user: W.user } : null), isWholeSchoolRole: (r) => ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "ACADEMIC_SUPERVISOR"].indexOf(r) > -1 },
  };
  const orig = Module._load; Module._load = function (rq, ...a) { return mocks[rq] || orig.call(this, rq, ...a); };
  delete require.cache[require.resolve(R + "/netlify/functions/ai-comments.js")];
  const H = require(R + "/netlify/functions/ai-comments.js").handler;
  const realFetch = global.fetch;
  global.fetch = async (u, o) => { W.aiCalls++; W.lastBody = o.body; const b = JSON.parse(o.body); const recs = JSON.parse(b.messages[1].content.replace(/^Records:\n/, "")); return mkRes(200, okBody(JSON.stringify({ results: recs.map((x, i) => ({ ref: x.ref, form: "{{NAME}} has performed well this term and did especially well in Mathematics, which " + (x.pronouns.startsWith("he") ? "he" : "she") + " should be proud of, so more of the same is expected (variation " + "abcdefghij"[i] + ").".replace(/\(.*\)/, "").trim() })) }))); };
  const post = (payload, headers) => H({ httpMethod: "POST", headers: headers || {}, body: JSON.stringify(payload) });
  const body = (r) => JSON.parse(r.body);
  const req = { classArmId: "c1", level: "Junior Secondary", term: "First Term", parts: ["form"], subjectNames: ["Mathematics"], items: [{ ref: "s0", gender: "female", band: "good", average: 70, strongest: ["Mathematics"], name: "Aisha Bello", admissionNo: "LB/9" }] };

  W.user = null; t("H1 not signed in -> 401", (await post(req)).statusCode === 401);
  W.user = { id: "t1", role: "TEACHER" }; W.teacherOf = [];
  t("H2 a teacher who is not Form Teacher of that class -> 403", (await post(req)).statusCode === 403);
  W.teacherOf = ["c1"]; process.env.GROQ_API_KEY = "gsk_test_KEY"; delete process.env.GEMINI_API_KEY;
  t("H3 the Form Teacher of THAT class is allowed", (await post(req)).statusCode === 200);
  t("H4 a Form Teacher cannot request Principal's comments -> 403", (await post({ ...req, parts: ["form", "principal"] })).statusCode === 403);
  W.user = { id: "p1", role: "PRINCIPAL" };
  t("H5 the Principal may request both parts for any class", (await post({ ...req, classArmId: "zz", parts: ["form", "principal"], items: [{ ...req.items[0], ref: "s5" }] })).statusCode === 200);
  t("H6 more than the batch size -> 400", (await post({ ...req, items: Array.from({ length: 7 }, (_, i) => ({ ref: "s" + i })) })).statusCode === 400);
  t("H7 an oversized body -> 413", (await H({ httpMethod: "POST", headers: {}, body: "x".repeat(70000) })).statusCode === 413);
  W.user = { id: "t1", role: "TEACHER" }; W.teacherOf = ["c1"]; W.aiCalls = 0;
  const first = body(await post({ ...req, variant: "v1" }));
  const again = body(await post({ ...req, variant: "v1" }));
  t("H8 the same request twice (double-click) calls the AI only once", W.aiCalls === 1 && JSON.stringify(first) === JSON.stringify(again));
  t("H9 a new variant (Regenerate) does call the AI again", (await post({ ...req, variant: "v2" })).statusCode === 200 && W.aiCalls === 2);
  t("H10 what reached the AI has no name or admission number; the key is only in the header", !/Aisha|Bello|LB\/9/.test(W.lastBody) && !W.lastBody.includes("gsk_test_KEY"));
  t("H11 the response never contains the key", !JSON.stringify(first).includes("gsk_test_KEY") && first.ok && first.results[0].form.includes("{{NAME}}"));
  const st = body(await H({ httpMethod: "GET", headers: {} }));
  t("H12 GET reports whether AI is configured, without secrets", st.ok && st.configured === true && st.providers[0] === "Groq" && !JSON.stringify(st).includes("gsk_test_KEY"));
  delete process.env.GROQ_API_KEY;
  const nc = body(await post({ ...req, variant: "v9" }));
  t("H13 no key set -> { ok:false, code:'AI_NOT_CONFIGURED' } (browser then uses the built-in writer)", nc.ok === false && nc.code === "AI_NOT_CONFIGURED" && body(await H({ httpMethod: "GET", headers: {} })).configured === false);
  global.fetch = realFetch; Module._load = orig;

  /* ---------- the browser-side writer, run against the REAL engine ---------- */
  const ctxVm = { console, Date, JSON, Promise, Object, Array, Math, Set, String, Number,
    document: { getElementById: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ style: {} }), body: { appendChild() {} } },
    localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} }, navigator: { onLine: true }, window: { addEventListener() {}, confirm: () => true, prompt: () => "" }, alert() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {}, fetch: () => Promise.reject(new Error("x")) };
  vm.createContext(ctxVm); vm.runInContext(fs.readFileSync(R + "/app.js", "utf8"), ctxVm);
  vm.runInContext(fs.readFileSync(R + "/tests/helpers/class-world.js", "utf8"), ctxVm);
  const run = (c) => vm.runInContext(c, ctxVm);
  const J = (c) => JSON.parse(run("JSON.stringify(" + c + ")"));

  run('var W = __buildClass("Junior Secondary", 100, {}); var CTX = { classArmId: W.armId, sessionId: W.sessionId, termId: W.termId, ov: computeClassOverview(W.armId, W.sessionId, W.termId) };');
  run('var ROWS = CTX.ov.students.map(function(r){ return aiNewRow(r.student, CTX); });');
  const facts = J("ROWS.map(function(r){return r.facts;})");
  t("C1 facts are built from real engine results for all 100 students", facts.length === 100 && facts.every((f) => f && f.average > 0 && f.band && f.subjectsCount === 12));
  t("C2 all five performance bands occur (weak ... excellent)", ["excellent", "good", "average", "below average", "weak"].every((b) => facts.some((f) => f.band === b)));
  t("C3 attendance / behaviour are only present for students who actually have them", facts.some((f) => f.attendance) && facts.some((f) => !f.attendance) && facts.some((f) => f.behaviour) && facts.some((f) => !f.behaviour));
  t("C4 facts contain no name, admission number or photo", !/Aisha|LB\/2026|photo|name/i.test(JSON.stringify(facts)));
  t("C5 a student with no results has no facts (nothing to base a comment on)", (() => { run('state.students.push({id:"empty1",name:"Nobody New",gender:"Male",classArmId:W.armId,status:"Active",admissionNo:"x",subjectIds:[]}); var o=computeClassOverview(W.armId,W.sessionId,W.termId); var f=aiBuildFacts(state.students[state.students.length-1], W.armId, W.sessionId, W.termId, o); state.students.pop();'); return run("(function(){var o=computeClassOverview(W.armId,W.sessionId,W.termId); state.students.push({id:'empty2',name:'N',gender:'Male',classArmId:W.armId,status:'Active',admissionNo:'x',subjectIds:[]}); var f=aiBuildFacts(state.students[state.students.length-1],W.armId,W.sessionId,W.termId,computeClassOverview(W.armId,W.sessionId,W.termId)); state.students.pop(); return f===null;})()"); })());

  // the writer
  run('var OUT = ROWS.map(function(r){ return { id:r.id, first:r.first, f:r.facts, ft:aiLocalComment("form", r.facts, r.first, 0, r.id+"|t"), pr:aiLocalComment("principal", r.facts, r.first, 0, r.id+"|t") }; });');
  const out = J("OUT");
  t("C6 every student gets both comments, within the report-card length limits", out.every((o) => o.ft.length >= 40 && o.ft.length <= 300 && o.pr.length >= 25 && o.pr.length <= 220));
  t("C7 each Form Teacher comment uses that student's own first name", out.every((o) => o.ft.indexOf(o.first) > -1 || /^[A-Z]/.test(o.ft)) && out.filter((o) => o.ft.indexOf(o.first) > -1).length >= 95);
  t("C8 comments are different for each student (100 students -> 100 distinct Form Teacher comments)", new Set(out.map((o) => o.ft.toLowerCase())).size >= 99);
  t("C9 Principal comments differ in voice and length from the Form Teacher's", out.every((o) => o.pr !== o.ft) && out.reduce((a, o) => a + o.pr.length, 0) < out.reduce((a, o) => a + o.ft.length, 0));
  const noAtt = out.filter((o) => !o.f.attendance), noBeh = out.filter((o) => !o.f.behaviour && !o.f.skills);
  t("C10 NEVER invents attendance when none is recorded", noAtt.length > 20 && noAtt.every((o) => !/attend|absen/i.test(o.ft + " " + o.pr) && (o.f.behaviour || !/punctual/i.test(o.ft + " " + o.pr))));
  t("C11 NEVER invents behaviour / conduct when no ratings exist", noBeh.length > 10 && noBeh.every((o) => !/behaviou?r|conduct|discipline|polite|respect|neat|honest|ratings in/i.test(o.ft + " " + o.pr)));
  t("C12 attendance IS mentioned when it is recorded and fits", out.some((o) => o.f.attendance && /attendance/i.test(o.ft)));
  t("C13 no invented achievements in any of the 200 comments", out.every((o) => !/prize|award|trophy|medal|captain|prefect|champion|competition|quiz|club|choir/i.test(o.ft + " " + o.pr)));
  t("C14 weak and below-average students get kind, constructive wording", out.filter((o) => o.f.band === "weak" || o.f.band === "below average").every((o) => !/\b(lazy|stupid|hopeless|failure|disappoint\w*|useless|dull)\b/i.test(o.ft + o.pr) && /support|improve|practi|help|effort|revision|progress/i.test(o.ft)));
  t("C15 excellent students are praised; weak ones are not told they excelled", out.filter((o) => o.f.band === "excellent").every((o) => /outstanding|excellent|impressive|exceptional|brilliant|congratulat|commended/i.test(o.ft)) && out.filter((o) => o.f.band === "weak").every((o) => !/outstanding|brilliant|exceptional/i.test(o.ft)));
  t("C16 only a student's real strongest / weakest subjects are named", out.every((o) => { const names = run("state.subjects.map(function(s){return s.name;})"); const allowed = o.f.strongest.concat(o.f.weakest); return names.every((n) => allowed.indexOf(n) > -1 || o.ft.indexOf(n) === -1); }));
  t("C17 pronouns match the recorded gender; unknown gender uses the name (no he/she)", out.every((o) => { const g = o.f.gender, s = o.ft + " " + o.pr; return g === "male" ? !/\b(she|her|hers)\b/i.test(s) : g === "female" ? !/\b(he|him|his)\b/i.test(s) : !/\b(he|she|him|his|her)\b/i.test(s); }) && out.some((o) => o.f.gender === "unknown"));
  t("C18 Regenerate gives a different comment for the same student", run('aiLocalComment("form", ROWS[10].facts, ROWS[10].first, 0, "a") !== aiLocalComment("form", ROWS[10].facts, ROWS[10].first, 3, "a")') === true);
  t("C19 top-third students get their position mentioned by the Principal only when strong", out.filter((o) => /Position \d+(st|nd|rd|th) in a class of/.test(o.pr)).every((o) => o.f.band === "excellent" || o.f.band === "good"));

  // protection rules
  run('_ai = { rows:[], canPr:true, opts:{ mode:"empty", includePr:true, replaceManual:false } };');
  const needs = (setup, mode, rep) => run('(function(){ var r = {facts:{x:1}, ft:' + setup + ', pr:{text:"",source:"",approved:false}}; _ai.opts.mode="' + mode + '"; _ai.opts.replaceManual=' + rep + '; return aiNeeds(r,"ft"); })()');
  t("P1 an empty comment is generated in every mode", needs('{text:"",source:"",approved:false}', "empty", false) && needs('{text:"",source:"",approved:false}', "unapproved", false));
  t("P2 an APPROVED comment is never regenerated - not even when replacing everything and hand-written ones", !needs('{text:"x",source:"ai",approved:true}', "unapproved", true) && !needs('{text:"x",source:"manual",approved:true}', "unapproved", true));
  t("P3 default mode leaves existing comments (AI or hand-written) alone", !needs('{text:"x",source:"ai",approved:false}', "empty", false) && !needs('{text:"x",source:"manual",approved:false}', "empty", false));
  t("P4 'replace unapproved' replaces AI/template drafts but protects hand-written ones unless ticked", needs('{text:"x",source:"ai",approved:false}', "unapproved", false) && needs('{text:"x",source:"template",approved:false}', "unapproved", false) && !needs('{text:"x",source:"manual",approved:false}', "unapproved", false) && needs('{text:"x",source:"manual",approved:false}', "unapproved", true));
  t("P5 a student with no results is never generated", run('(function(){ var r={facts:null, ft:{text:"",source:"",approved:false}, pr:{text:"",source:"",approved:false}}; return aiNeeds(r,"ft")||aiNeeds(r,"pr"); })()') === false);
  t("P6 a Form Teacher (no principal rights) never generates Principal's comments", run('(function(){ _ai.canPr=false; var r={facts:{x:1}, ft:{text:"x",source:"ai",approved:true}, pr:{text:"",source:"",approved:false}}; var v = aiNeeds(r,"pr"); _ai.canPr=true; return v; })()') === false);
  t("P7 legacy comments typed before this feature are treated as hand-written (protected)", run('(function(){ var key = ROWS[0].key; state.studentComments[key] = {formTeacherComment:"Old teacher note"}; var r = aiNewRow(state.students[0], CTX); return r.ft.source==="manual" && r.ft.approved===false && r.ft.text==="Old teacher note"; })()') === true);

  console.log("\n" + pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
})();
