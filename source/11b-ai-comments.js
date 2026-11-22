/* ==========================================================================
   11b - AI BULK COMMENTS (Class Review)
   "Generate AI Comments for Entire Class": writes a Form Teacher's comment and
   (for the Principal/Admin) a Principal's comment for every student from their
   REAL recorded results, lets the user preview / edit / regenerate / approve,
   and only then saves them into the existing studentComments records - the
   same place the report cards already read from. No database change: a few
   optional fields (ftSource, ftApproved, prSource, prApproved ...) ride along
   in the same JSON record.

   Privacy: nothing identifying is ever sent to an AI - no name, admission
   number or photo. Only anonymous marks/ratings go out; the AI writes the
   token {{NAME}} and the first name is put back here in the browser.

   If AI is not set up or is unavailable, a built-in template writer produces
   comments from the same records (never inventing attendance, behaviour or
   achievements), so the feature always works.

   Rules honoured everywhere below:
     * an APPROVED comment is never overwritten (not by bulk, not by regenerate
       unless the user explicitly un-approves it first);
     * a hand-written comment is protected unless the user ticks the box;
     * nothing is saved to the school record until "Save comments".
   ========================================================================== */

var AI_BATCH = 5;                 // students per request (Netlify stops functions at 10 s)
var AI_LIMITS = { form: 300, principal: 220 };
var _ai = null;                   // the open dialog's working state
var _aiBusyClass = {};            // classArmId -> true while a run is in progress (no duplicate runs)

/* ---------- tiny helpers ---------- */
function aiHash(s){ var h = 5381; s = String(s); for (var i=0;i<s.length;i++){ h = ((h<<5)+h+s.charCodeAt(i)) | 0; } return Math.abs(h); }
function aiPick(arr, seed){ return arr[aiHash(seed) % arr.length]; }
function aiJoin(list){
  list = list.filter(Boolean);
  if (list.length <= 1) return list[0] || "";
  return list.slice(0,-1).join(", ") + " and " + list[list.length-1];
}
function aiFirstName(full){
  var t = String(full||"").trim().split(/\s+/)[0] || "";
  t = t.replace(/[^A-Za-z\u00C0-\u024F'\u2019-]/g, "");
  if (!t) return "This student";
  if (t === t.toUpperCase() || t === t.toLowerCase()) t = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return t;
}
function aiGenderKey(g){ g = String(g||"").toLowerCase(); return g==="male" ? "male" : g==="female" ? "female" : "unknown"; }
function aiBandFor(avg){ return avg>=75 ? "excellent" : avg>=60 ? "good" : avg>=50 ? "average" : avg>=40 ? "below average" : "weak"; }
/* small status chip for the Class Review table (only for comments this feature touched) */
function aiStatusChip(c){
  c = c || {};
  var ai = c.ftSource === "ai" || c.ftSource === "template";
  if (c.formTeacherComment && c.ftApproved) return '<span class="chip chip-good">Approved</span>';
  if (c.formTeacherComment && ai) return '<span class="chip chip-warn">Draft</span>';
  return "";
}
function aiBandLabel(b){ return b==="excellent"?"Excellent":b==="good"?"Good":b==="average"?"Average":b==="below average"?"Below average":"Needs support"; }

/* ---------- facts: everything comes from the engine's own results ---------- */
function aiTraitBlock(domains, scores){
  var levels = state.ratingLevels && state.ratingLevels.length ? state.ratingLevels : [];
  var n = levels.length;
  if (!n || !scores) return null;
  var strong = [], weak = [], rated = 0;
  domains.filter(function(d){return d.active;}).forEach(function(d){
    var label = scores[d.id]; if (!label) return;
    var idx = levels.indexOf(label); if (idx < 0) return;
    rated++;
    var val = n - idx;
    if (val >= n - 1) strong.push(d.name);
    else if (n >= 4 && val <= n - 3) weak.push(d.name);
  });
  return rated ? { strong: strong.slice(0,3), weak: weak.slice(0,3) } : null;
}

function aiBuildFacts(stu, classArmId, sessionId, termId, ov){
  var row = ov.students.filter(function(r){return r.student.id===stu.id;})[0];
  var overall = row ? row.overall : computeStudentOverall(stu.id, classArmId, sessionId, termId);
  if (!overall || overall.average === null || overall.average === undefined) return null;
  var done = overall.subjectRows.filter(function(r){
    return r.calc && r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused && typeof r.calc.total === "number";
  });
  if (!done.length) return null;
  var avg = overall.average;
  var desc = done.slice().sort(function(a,b){return b.calc.total - a.calc.total;});
  var strongRows = desc.filter(function(r){return r.calc.total >= avg + 5 && r.calc.total >= 55;}).slice(0,3);
  var weakRows = desc.slice().reverse().filter(function(r){
    var pm = Number(r.subject.passMark) || 0;
    return (r.calc.total <= avg - 5 && r.calc.total < 60) || (pm > 0 && r.calc.total < pm);
  }).filter(function(r){ return strongRows.indexOf(r) < 0; }).slice(0,3);
  var failing = done.filter(function(r){ var pm = Number(r.subject.passMark)||0; return pm>0 && r.calc.total < pm; }).length;

  var key = [stu.id, sessionId, termId].join("::");
  var att = state.attendance[key] || {};
  var attendance = (typeof att.totalDays === "number" && att.totalDays > 0 && typeof att.present === "number")
    ? { percent: Math.max(0, Math.min(100, Math.round(att.present / att.totalDays * 100))) } : null;
  var dom = state.domainScores[key] || {};
  var withResults = ov.students.filter(function(r){return r.overall && r.overall.average !== null && r.overall.average !== undefined;}).length;

  return {
    gender: aiGenderKey(stu.gender),
    band: aiBandFor(avg),
    average: avg,
    classAverage: ov.classAverage,
    position: row && row.position ? row.position : null,
    classSize: withResults,
    strongest: strongRows.map(function(r){return r.subject.name;}),
    weakest: weakRows.map(function(r){return r.subject.name;}),
    failing: failing,
    subjectsCount: done.length,
    attendance: attendance,
    behaviour: aiTraitBlock(state.affectiveDomains, dom.affective),
    skills: aiTraitBlock(state.psychomotorDomains, dom.psychomotor)
  };
}

/* ---------- built-in template writer (free, offline, never invents) ---------- */
var AI_T = {
  open: {
    "excellent": [
      "{n} has achieved an outstanding result this term and deserves sincere congratulations.",
      "This has been an excellent term for {n}, with results of a consistently high standard.",
      "{n} has produced a truly impressive set of results this term.",
      "An exceptional performance this term from {n}, which reflects real ability.",
      "{n} has performed brilliantly this term and is warmly commended."],
    "good": [
      "{n} has performed well this term and has shown clear potential for even greater success.",
      "A good set of results from {n} this term, built on a sound understanding of the work.",
      "{n} has done well this term and is moving in the right direction.",
      "{n} has recorded a commendable result this term."],
    "average": [
      "{n} has recorded a fair and steady result this term, with clear room for improvement.",
      "{n} has made satisfactory progress this term, although the results show that {s} can achieve more.",
      "This term's result for {n} is average, and there is real scope to do better.",
      "{n} has performed at a satisfactory level this term and has the ability to improve."],
    "below average": [
      "{n} has made some progress this term, but the results show that more effort is needed.",
      "The result for {n} this term is below the level expected, though improvement is certainly possible.",
      "{n} has found parts of this term's work difficult and needs more support to improve.",
      "{n}'s result this term shows that {s} {is} still developing and needs to practise more."],
    "weak": [
      "{n} has found this term challenging, but with the right support {s} can improve.",
      "This has been a difficult term academically for {n}, and extra help will make a real difference.",
      "{n} needs additional support to build confidence and understanding in {p} studies.",
      "{n} has not yet reached the expected level, but steady practice and guidance can change this."]
  },
  both: [
    "{S} did especially well in {A}, but must give more attention to {B}.",
    "{P} strongest results were in {A}, while more practice is needed in {B}.",
    "{S} showed real strength in {A}; more time should now be given to {B}.",
    "Good work was seen in {A}, and {s} should now put extra effort into {B}."],
  strong: [
    "{S} did particularly well in {A}.",
    "{P} best results were in {A}, which {s} should be proud of.",
    "{S} showed real strength in {A}.",
    "Good results were recorded in {A}."],
  weak: [
    "{S} should give extra attention to {B}.",
    "More practice and regular revision are needed in {B}.",
    "{S} is encouraged to spend more time on {B}.",
    "Extra support in {B} will help {o} to improve."],
  noneHigh: [
    "{P} results are consistent across the subjects taken.",
    "{S} has maintained a steady standard across the subjects taken."],
  noneLow: [
    "{S} will benefit from regular revision and from asking for help in every subject.",
    "Regular revision and extra practice across all subjects will help {o} to improve."],
  attHigh: ["{P} attendance has been excellent.", "Excellent attendance is also commended."],
  attOk: ["{P} attendance has been good.", "{S} has attended school well."],
  attFair: ["{P} attendance can still be improved.", "{S} is encouraged to attend school more regularly."],
  attLow: ["{P} attendance must improve, as regular attendance is essential for progress.", "Regular attendance will help {o} to make better progress."],
  behStrong: ["{P} ratings in {T} are especially pleasing.", "{S} earned especially pleasing ratings in {T}."],
  behWeak: ["{S} should work on {T}.", "More attention to {T} is encouraged."],
  sklStrong: ["{S} also did well in {T}.", "{P} skills in {T} are also pleasing."],
  sklWeak: ["More practice is needed in {T}.", "{S} should practise {T} more."],
  close: {
    "excellent": ["Keep up this excellent standard.", "{S} is encouraged to keep aiming higher.", "Well done, and keep it up."],
    "good": ["With continued focus, {s} can reach the top of the class.", "Keep working hard and aim even higher next term.", "{S} is encouraged to keep improving."],
    "average": ["With more consistent study, {s} can achieve much more next term.", "Regular revision will bring better results.", "{S} is encouraged to aim higher next term."],
    "below average": ["With regular revision and support from home and school, better results are within reach.", "Steady effort next term will bring improvement."],
    "weak": ["With encouragement, extra practice and support from home, {s} will make steady progress.", "We believe in {p} ability to improve and will support {o} along the way."]
  },
  prOpen: {
    "excellent": ["An excellent result from {n}. Keep up this high standard.", "{n} has done very well and is warmly congratulated.", "Outstanding performance by {n}; this is a result to be proud of."],
    "good": ["A good result from {n}. Aim even higher next term.", "{n} has performed well and is encouraged to keep improving.", "Commendable work by {n}; continue to build on this."],
    "average": ["A fair result from {n}. More consistent effort will bring better results.", "{n} has the ability to do better and is encouraged to aim higher next term."],
    "below average": ["{n} is urged to put in more effort and to revise regularly so that next term's result will be better.", "More effort and regular revision are needed from {n} to improve on this result."],
    "weak": ["{n} needs to work much harder and to seek help in the weaker subjects. Parents are encouraged to work closely with the school.", "This result must improve. The school will support {n}, and parents are encouraged to assist at home."]
  },
  prClose: {
    "excellent": ["Well done."], "good": ["Keep it up."],
    "average": ["I believe {s} can do better."], "below average": ["Improvement is expected next term."], "weak": ["I am confident {s} can improve with support."]
  }
};

function aiFill(tpl, name, g, extra){
  var u = (g === "unknown");
  var sub = g==="male" ? "he" : g==="female" ? "she" : name;
  var pos = g==="male" ? "his" : g==="female" ? "her" : name + "'s";
  var obj = g==="male" ? "him" : g==="female" ? "her" : name;
  var cap = function(x){ return x.charAt(0).toUpperCase() + x.slice(1); };
  var out = String(tpl)
    .replace(/\{n\}/g, name).replace(/\{S\}/g, cap(sub)).replace(/\{s\}/g, sub)
    .replace(/\{P\}/g, cap(pos)).replace(/\{p\}/g, pos).replace(/\{o\}/g, obj)
    .replace(/\{is\}/g, "is").replace(/\{has\}/g, "has");
  if (extra) Object.keys(extra).forEach(function(k){ out = out.split("{"+k+"}").join(extra[k]); });
  return out;
}

function aiLocalComment(kind, f, name, variant, seed){
  var g = f.gender, b = f.band, v = variant || 0, sd = seed + "|" + kind + "|" + v;
  var P = function(arr, tag){ return aiPick(arr, sd + "|" + tag); };
  var F = function(tpl, extra){ return aiFill(tpl, name, g, extra); };
  var max = AI_LIMITS[kind === "principal" ? "principal" : "form"];
  var res;

  if (kind === "principal"){
    var s1 = F(P(AI_T.prOpen[b], "po"));
    var top = f.position && f.classSize >= 6 && f.position <= Math.ceil(f.classSize / 3) && (b === "excellent" || b === "good");
    var s2 = top ? "Position " + ordinal(f.position) + " in a class of " + f.classSize + " is commendable." : F(P(AI_T.prClose[b], "pc"));
    res = s1 + " " + s2;
    if (res.length > max) res = s1;
    return res;
  }

  var S = f.strongest.slice(0, 3), W = f.weakest.slice(0, 3);
  var open = F(P(AI_T.open[b], "o"));
  var mid;
  if (S.length && W.length) mid = F(P(AI_T.both, "m"), { A: aiJoin(S.slice(0,2)), B: aiJoin(W.slice(0,2)) });
  else if (S.length) mid = F(P(AI_T.strong, "m"), { A: aiJoin(S) });
  else if (W.length) mid = F(P(AI_T.weak, "m"), { B: aiJoin(W) });
  else mid = F(P((b === "excellent" || b === "good") ? AI_T.noneHigh : AI_T.noneLow, "m"));

  var extras = [];
  if (f.attendance){
    var pc = f.attendance.percent;
    extras.push(F(P(pc >= 95 ? AI_T.attHigh : pc >= 85 ? AI_T.attOk : pc >= 75 ? AI_T.attFair : AI_T.attLow, "a")));
  }
  var low = function(a){ return a.map(function(x){ return String(x).toLowerCase(); }); };
  if (f.behaviour && f.behaviour.strong.length) extras.push(F(P(AI_T.behStrong, "b"), { T: aiJoin(low(f.behaviour.strong.slice(0,2))) }));
  else if (f.behaviour && f.behaviour.weak.length) extras.push(F(P(AI_T.behWeak, "b"), { T: aiJoin(low(f.behaviour.weak.slice(0,2))) }));
  if (f.skills && f.skills.strong.length) extras.push(F(P(AI_T.sklStrong, "k"), { T: aiJoin(low(f.skills.strong.slice(0,2))) }));
  else if (f.skills && f.skills.weak.length) extras.push(F(P(AI_T.sklWeak, "k"), { T: aiJoin(low(f.skills.weak.slice(0,2))) }));
  var close = F(P(AI_T.close[b], "c"));

  // always: opening + middle. Then add what fits, extras before the closing line.
  res = open + " " + mid;
  var order = extras.slice(0, 1).concat([close]);
  if (extras.length > 1) order.splice(1, 0, extras[1]);
  order.forEach(function(s){ if ((res + " " + s).length <= max) res += " " + s; });
  if (res.length > max) res = open + " " + mid;
  if (res.length > max) res = open;
  return res;
}

/* ---------- who may do what (same rules the app already uses) ---------- */
function aiCanFormComment(classArmId){
  var u = state.currentUser;
  return !!u && (isWholeSchoolRole(u.role) || isFormTeacherOf(u, classArmId));
}
function aiCanPrincipalComment(){
  var r = state.currentUser && state.currentUser.role;
  return r === "PRINCIPAL" || r === "ADMIN" || r === "SUPER_ADMIN";
}

/* ---------- the dialog's working state ---------- */
function aiNewRow(stu, ctx){
  var key = [stu.id, ctx.sessionId, ctx.termId].join("::");
  var c = state.studentComments[key] || {};
  var facts = aiBuildFacts(stu, ctx.classArmId, ctx.sessionId, ctx.termId, ctx.ov);
  var mk = function(text, source, approved){
    text = text || "";
    return { text: text, source: text ? (source || "manual") : "", approved: !!(text && approved) };
  };
  return {
    id: stu.id, name: stu.name, first: aiFirstName(stu.name), facts: facts, key: key,
    average: facts ? facts.average : null, position: facts ? facts.position : null,
    ft: mk(c.formTeacherComment, c.ftSource, c.ftApproved),
    pr: mk(c.principalComment, c.prSource, c.prApproved),
    variant: 0, busy: false, changed: { ft:false, pr:false }
  };
}

function aiNeeds(row, part){
  if (!row.facts) return false;
  if (part === "pr" && !(_ai.canPr && _ai.opts.includePr)) return false;
  var cur = row[part];
  if (cur.approved) return false;                       // approved comments are never overwritten
  if (!cur.text) return true;
  if (_ai.opts.mode !== "unapproved") return false;     // default: only fill the empty ones
  if (cur.source === "manual" && !_ai.opts.replaceManual) return false;
  return true;
}
function aiPlan(){
  var plan = { rows: [], protectedCount: 0, noResults: 0 };
  _ai.rows.forEach(function(r){
    if (!r.facts){ plan.noResults++; return; }
    if (aiNeeds(r, "ft") || aiNeeds(r, "pr")) plan.rows.push(r); else plan.protectedCount++;
  });
  return plan;
}

/* ---------- talking to the server (never to an AI directly) ---------- */
function aiFactsPayload(row, ref){
  var f = row.facts;
  return { ref: ref, gender: f.gender, band: f.band, average: f.average, classAverage: f.classAverage, position: f.position, classSize: f.classSize,
    strongest: f.strongest, weakest: f.weakest, failing: f.failing, subjectsCount: f.subjectsCount, attendance: f.attendance, behaviour: f.behaviour, skills: f.skills };
}
function aiRequestBatch(rows, parts){
  var items = rows.map(function(r, i){ return aiFactsPayload(r, "s" + i); });
  var arm = byId(state.classArms, _ai.classArmId);
  var names = state.subjects.map(function(s){return s.name;});
  var timeout = new Promise(function(resolve){ setTimeout(function(){ resolve({ ok:false, code:"AI_TIMEOUT" }); }, 25000); });
  var call = apiCall("/ai-comments", { method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ classArmId: _ai.classArmId, level: sectionName(arm.sectionId), term: termName(_ai.termId), parts: parts, items: items, subjectNames: names, variant: _ai.runId + ":" + rows.map(function(r){return r.variant;}).join("") }) })
    .then(function(j){
      if (j && j._networkError) return { ok:false, code:"AI_UNAVAILABLE" };
      if (j && j._httpStatus === 401) return { ok:false, code:"SESSION" };
      if (j && j._httpStatus === 403) return { ok:false, code:"FORBIDDEN", error:j.error };
      return j || { ok:false, code:"AI_UNAVAILABLE" };
    });
  return Promise.race([call, timeout]);
}
function aiWait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

var AI_REASON = {
  AI_NOT_CONFIGURED: "AI is not set up yet",
  AI_AUTH: "the AI key was rejected - ask the administrator to check it",
  AI_MODEL: "the AI model name is no longer available - ask the administrator to update it",
  AI_RATE_LIMIT: "the free AI limit was reached",
  AI_TIMEOUT: "the AI service was too slow",
  AI_UNAVAILABLE: "the AI service could not be reached"
};

/* writes a comment into a row part */
function aiSetPart(row, part, text, source){
  row[part] = { text: text, source: source, approved: false };
  row.changed[part] = true;
}
function aiUseTemplate(row, part){
  var kind = part === "pr" ? "principal" : "form";
  var text = aiLocalComment(kind, row.facts, row.first, row.variant, row.id + "|" + _ai.runId);
  // keep the class's comments different from one another
  var tries = 0;
  while (tries < 6 && aiDuplicateOf(row, part, text)){ row.variant++; text = aiLocalComment(kind, row.facts, row.first, row.variant, row.id + "|" + _ai.runId); tries++; }
  aiSetPart(row, part, text, "template");
}
function aiDuplicateOf(row, part, text){
  var low = text.toLowerCase();
  return _ai.rows.some(function(o){ return o !== row && o[part].text && o[part].text.toLowerCase() === low; });
}
function aiApplyAi(row, part, text){
  text = String(text).replace(/\{\{NAME\}\}/g, row.first).trim();
  var max = AI_LIMITS[part === "pr" ? "principal" : "form"];
  if (!text || text.length > max || aiDuplicateOf(row, part, text)) return false;
  aiSetPart(row, part, text, "ai");
  return true;
}

/* One batch: ask the AI, fall back to templates for anything it could not do. */
function aiProcessBatch(rows, tries){
  tries = tries || 0;
  var needFt = rows.some(function(r){return aiNeeds(r,"ft");}), needPr = rows.some(function(r){return aiNeeds(r,"pr");});
  var parts = []; if (needFt) parts.push("form"); if (needPr) parts.push("principal");
  var useTemplates = function(reasonCode){
    rows.forEach(function(r){
      ["ft","pr"].forEach(function(p){ if (aiNeeds(r,p)){ aiUseTemplate(r,p); _ai.usedLocal++; } });
    });
    if (reasonCode) _ai.notes[reasonCode] = (_ai.notes[reasonCode] || 0) + rows.length;
  };
  if (!parts.length || _ai.aiOff) { useTemplates(_ai.aiOff ? _ai.aiOffCode : null); return Promise.resolve(); }

  return aiRequestBatch(rows, parts).then(function(res){
    if (res && res.ok){
      _ai.provider = res.provider || _ai.provider; _ai.failStreak = 0;
      var by = {}; (res.results || []).forEach(function(x){ by[x.ref] = x; });
      rows.forEach(function(r, i){
        var got = by["s" + i] || {};
        [["ft","form"],["pr","principal"]].forEach(function(pp){
          var part = pp[0], key = pp[1];
          if (!aiNeeds(r, part)) return;
          if (got[key] && aiApplyAi(r, part, got[key])) _ai.usedAi++;
          else { aiUseTemplate(r, part); _ai.usedLocal++; _ai.notes.AI_CHECK = (_ai.notes.AI_CHECK || 0) + 1; }
        });
      });
      return;
    }
    var code = (res && res.code) || "AI_UNAVAILABLE";
    if (code === "SESSION"){ _ai.cancel = true; _ai.sessionLost = true; return; }
    if (code === "FORBIDDEN"){ _ai.cancel = true; _ai.forbidden = (res && res.error) || "You do not have permission for this."; return; }
    if (code === "AI_NOT_CONFIGURED" || code === "AI_AUTH" || code === "AI_MODEL"){ _ai.aiOff = true; _ai.aiOffCode = code; useTemplates(code); return; }
    if (code === "AI_RATE_LIMIT" && tries < 2){
      var secs = Math.min(20, Math.max(4, Number(res.retryAfter) || 10));
      _ai.waitNote = "AI limit reached - waiting " + secs + "s before continuing...";
      aiUpdateProgress();
      return aiWait(secs * 1000).then(function(){ _ai.waitNote = ""; return aiProcessBatch(rows, tries + 1); });
    }
    if (tries < 1 && (code === "AI_TIMEOUT" || code === "AI_UNAVAILABLE")) return aiWait(1200).then(function(){ return aiProcessBatch(rows, tries + 1); });
    _ai.failStreak++;
    if (_ai.failStreak >= 3){ _ai.aiOff = true; _ai.aiOffCode = code; }
    useTemplates(code);
  });
}

/* ---------- the run ---------- */
function aiStartRun(){
  if (!_ai || _ai.phase === "running") return;                 // no duplicate generation
  if (_aiBusyClass[_ai.classArmId]){ toast("A generation is already running for this class.", "warn"); return; }
  var plan = aiPlan();
  if (!plan.rows.length){ toast("Nothing to generate - every student already has an approved or protected comment.", "warn"); return; }
  _aiBusyClass[_ai.classArmId] = true;
  _ai.phase = "running"; _ai.cancel = false; _ai.done = 0; _ai.total = plan.rows.length;
  _ai.usedAi = 0; _ai.usedLocal = 0; _ai.notes = {}; _ai.failStreak = 0; _ai.aiOff = !_ai.status.configured; _ai.aiOffCode = "AI_NOT_CONFIGURED";
  _ai.runId = Date.now().toString(36);
  aiRender();
  var queue = plan.rows.slice(), batches = [];
  while (queue.length) batches.push(queue.splice(0, AI_BATCH));
  var i = 0;
  var next = function(){
    if (!_ai || _ai.cancel || i >= batches.length) return Promise.resolve();
    var b = batches[i++];
    return aiProcessBatch(b).then(function(){
      if (_ai && !_ai.sessionLost && !_ai.forbidden){ _ai.done += b.length; aiUpdateProgress(); }
      return aiWait(_ai && !_ai.aiOff ? 700 : 0).then(next);
    });
  };
  return next().then(aiFinishRun, function(err){ console.error(err); aiFinishRun(); });
}
function aiFinishRun(){
  _aiBusyClass[_ai ? _ai.classArmId : ""] = false;
  if (!_ai) return;
  _ai.phase = "review";
  if (_ai.sessionLost) toast("Your session has expired - sign in again. Nothing was lost on this screen.", "error");
  else if (_ai.forbidden) toast(_ai.forbidden, "error");
  aiRender();
}
function aiCancelRun(){ if (_ai) { _ai.cancel = true; _ai.waitNote = "Stopping after this batch..."; aiUpdateProgress(); } }

/* ---------- dialog ---------- */
function openAiCommentsDialog(classArmId){
  if (!aiCanFormComment(classArmId)){ toast("You can only generate comments for your own class.", "error"); return; }
  var sessionId = state.currentSessionId, termId = state.currentTermId;
  var ov = computeClassOverview(classArmId, sessionId, termId);
  var ctx = { classArmId: classArmId, sessionId: sessionId, termId: termId, ov: ov };
  _ai = {
    classArmId: classArmId, sessionId: sessionId, termId: termId, ov: ov, canPr: aiCanPrincipalComment(),
    rows: ov.students.map(function(r){ return aiNewRow(r.student, ctx); }).sort(function(a,b){ return a.name.localeCompare(b.name); }),
    opts: { mode: "empty", includePr: aiCanPrincipalComment(), replaceManual: false },
    phase: "setup", done: 0, total: 0, status: { checked:false, configured:false, providers:[] },
    usedAi: 0, usedLocal: 0, notes: {}, runId: "x", dirty: false, provider: ""
  };
  openModal('<div id="ai-shell"></div>', { wide:true });
  var overlay = el("modal-root").querySelector(".modal-overlay");
  if (overlay) overlay.onclick = function(e){ if (e.target === this) aiClose(); };
  aiRender();
  apiCall("/ai-comments", { method:"GET" }).then(function(j){
    if (!_ai) return;
    _ai.status = { checked:true, configured: !!(j && j.ok && j.configured), providers: (j && j.providers) || [] };
    if (_ai.phase === "setup") aiRender();
  });
}
function aiClose(){
  if (_ai && _ai.phase === "running"){ toast("Generation is running - press Stop first.", "warn"); return; }
  if (_ai && _ai.dirty && !window.confirm("You have comments that are not saved yet. Close without saving?")) return;
  _ai = null; closeModal();
}

function aiChip(part, row){
  var c = row[part], out = "";
  if (c.source === "ai") out += '<span class="chip">AI</span> ';
  else if (c.source === "template") out += '<span class="chip">Smart template</span> ';
  else if (c.source === "manual" && c.text) out += '<span class="chip chip-warn">Hand-written</span> ';
  if (c.approved) out += '<span class="chip chip-good">Approved</span>';
  else if (c.text) out += '<span class="chip chip-warn">Not approved</span>';
  return out;
}

function aiRender(){
  var shell = el("ai-shell"); if (!shell || !_ai) return;
  var arm = byId(state.classArms, _ai.classArmId);
  var head = '<div class="modal-header"><h3>AI Comments &mdash; '+escapeHtml(arm ? arm.name : "")+'</h3><button class="icon-btn" onclick="aiClose()">'+ICONS("x")+'</button></div>';
  if (_ai.phase === "setup") shell.innerHTML = head + aiSetupHtml();
  else if (_ai.phase === "running") shell.innerHTML = head + aiRunningHtml();
  else shell.innerHTML = head + aiReviewHtml();
}

function aiSetupHtml(){
  var plan = aiPlan(), st = _ai.status;
  var banner = !st.checked ? '<div class="banner">Checking the AI service...</div>' :
    st.configured ? '<div class="banner banner-info"><strong>AI is ready</strong> ('+escapeHtml(st.providers.join(" + "))+'). Student names, admission numbers and photos are <strong>never</strong> sent &mdash; only anonymous marks and ratings.</div>' :
    '<div class="banner banner-warn"><strong>AI is not connected yet.</strong> The built-in smart writer will be used instead &mdash; it works offline and uses the same records. An administrator can connect a free AI service (see docs/ai-comments.md).</div>';
  var o = _ai.opts;
  var n = plan.rows.length;
  return '<div class="modal-body">'+banner+
    '<div class="stat-grid stat-grid-compact">'+statCard("Students", _ai.rows.length)+statCard("To generate", n, n?"info":"")+statCard("Kept as they are", plan.protectedCount, "")+statCard("No results yet", plan.noResults, plan.noResults?"warn":"")+'</div>'+
    '<h4 class="section-title" style="margin-top:18px">What should be generated?</h4>'+
    '<label class="checkbox-row"><input type="radio" name="ai-mode" '+(o.mode==="empty"?'checked':'')+' onchange="aiSetOpt(\'mode\',\'empty\')"/> Only students who have no comment yet <span class="muted small">(recommended)</span></label>'+
    '<label class="checkbox-row" style="margin-top:8px"><input type="radio" name="ai-mode" '+(o.mode==="unapproved"?'checked':'')+' onchange="aiSetOpt(\'mode\',\'unapproved\')"/> Replace every comment that is not approved</label>'+
    (o.mode==="unapproved" ? '<label class="checkbox-row" style="margin:8px 0 0 26px"><input type="checkbox" '+(o.replaceManual?'checked':'')+' onchange="aiSetOpt(\'replaceManual\',this.checked)"/> Also replace comments that were typed by hand</label>' : '')+
    (_ai.canPr ? '<label class="checkbox-row" style="margin-top:14px"><input type="checkbox" '+(o.includePr?'checked':'')+' onchange="aiSetOpt(\'includePr\',this.checked)"/> Also write the Principal\'s comment</label>' : '<p class="muted small" style="margin-top:14px">Principal\'s comments are written by the Principal or an Admin.</p>')+
    '<p class="muted small" style="margin-top:14px">Approved comments are <strong>never</strong> overwritten. Nothing is saved until you press <em>Save comments</em>, so you can read, edit and approve everything first.</p>'+
  '</div>'+
  '<div class="modal-footer"><button class="btn btn-ghost" onclick="aiClose()">Cancel</button>'+
    '<button class="btn btn-primary" '+((n && st.checked)?'':'disabled')+' onclick="aiStartRun()">Generate for '+n+' student'+(n===1?'':'s')+'</button></div>';
}
function aiSetOpt(k, v){ _ai.opts[k] = v; aiRender(); }

function aiRunningHtml(){
  return '<div class="modal-body"><div class="ai-progress">'+
    '<div class="ai-progress-text" id="ai-progress-text"></div>'+
    '<div class="progress-bar ai-bar"><span id="ai-progress-bar" style="width:0%"></span></div>'+
    '<div class="muted small" id="ai-progress-note"></div></div>'+
    '<p class="muted small">Please keep this window open. Comments are prepared in small groups; you can stop at any time and keep what is done.</p></div>'+
    '<div class="modal-footer"><button class="btn btn-secondary" onclick="aiCancelRun()">Stop</button></div>';
}
function aiUpdateProgress(){
  var t = el("ai-progress-text"); if (!t || !_ai) return;
  t.textContent = _ai.done + "/" + _ai.total + " students completed";
  var b = el("ai-progress-bar"); if (b) b.style.width = (_ai.total ? Math.round(_ai.done / _ai.total * 100) : 0) + "%";
  var n = el("ai-progress-note");
  if (n) n.textContent = _ai.waitNote || (_ai.aiOff ? "Using the built-in smart writer..." : _ai.provider ? "Writing with " + _ai.provider + "..." : "Starting...");
}

function aiRowHtml(i){
  var r = _ai.rows[i];
  var field = function(part, label, max, allowed){
    if (!allowed) return "";
    var c = r[part];
    var over = c.text.length > max;
    return '<div class="ai-field">'+
      '<div class="ai-field-head"><span class="field-label">'+label+'</span><span id="ai-chips-'+part+'-'+i+'">'+aiChip(part, r)+'</span></div>'+
      '<textarea class="field-input" rows="3" id="ai-text-'+part+'-'+i+'" oninput="aiEdit('+i+',\''+part+'\',this)" placeholder="'+(r.facts?'Write a comment, or press Regenerate...':'Write a comment by hand...')+'">'+escapeHtml(c.text)+'</textarea>'+
      '<div class="ai-actions">'+
        '<button class="btn btn-sm btn-ghost" '+((r.facts && !r.busy)?'':'disabled')+' onclick="aiRegen('+i+',\''+part+'\')">'+(c.text?'Regenerate':'Generate')+'</button>'+
        '<button class="btn btn-sm '+(c.approved?'btn-secondary':'btn-primary')+'" '+(c.text?'':'disabled')+' onclick="aiToggleApprove('+i+',\''+part+'\')">'+(c.approved?'Unapprove':'Approve')+'</button>'+
        '<span class="ai-count'+(over?' ai-over':'')+'" id="ai-count-'+part+'-'+i+'">'+c.text.length+'/'+max+'</span></div></div>';
  };
  return '<div class="ai-row" id="ai-row-'+i+'">'+
    '<div class="ai-row-head"><strong>'+escapeHtml(r.name)+'</strong>'+
      (r.facts ? '<span class="muted small">Average '+r.average+'% &middot; '+aiBandLabel(r.facts.band)+(r.position?' &middot; Position '+ordinal(r.position):'')+'</span>' : '<span class="chip chip-warn">No results yet</span>')+'</div>'+
    field("ft", "Form Teacher's Comment", AI_LIMITS.form, true)+
    field("pr", "Principal's Comment", AI_LIMITS.principal, _ai.canPr)+'</div>';
}

function aiCounts(){
  var c = { ai:0, tpl:0, approved:0, total:0, unsaved:0 };
  _ai.rows.forEach(function(r){
    ["ft","pr"].forEach(function(p){
      if (p === "pr" && !_ai.canPr) return;
      var x = r[p]; if (!x.text) return;
      c.total++; if (x.source==="ai") c.ai++; else if (x.source==="template") c.tpl++; if (x.approved) c.approved++;
      if (r.changed[p]) c.unsaved++;
    });
  });
  return c;
}
function aiReviewHtml(){
  var c = aiCounts(), notes = [];
  var N = _ai.notes || {};
  var fallbackN = 0; Object.keys(N).forEach(function(k){ fallbackN += N[k]; });
  if (_ai.usedLocal || fallbackN){
    var why = Object.keys(N).filter(function(k){return AI_REASON[k];}).map(function(k){return AI_REASON[k];});
    notes.push('<div class="banner banner-warn">'+(_ai.usedAi? _ai.usedAi+' comment(s) were written by AI and ':'')+_ai.usedLocal+' by the built-in smart writer'+(why.length?' because '+escapeHtml(why[0]):'')+'. Please read them, and use <em>Regenerate</em> later to try the AI again.</div>');
  }
  if (_ai.cancel && !_ai.sessionLost && !_ai.forbidden) notes.push('<div class="banner">Generation was stopped early. Students not yet done keep their existing comments.</div>');
  var list = _ai.rows.map(function(r, i){ return aiRowHtml(i); }).join("");
  return '<div class="modal-body">'+notes.join("")+
    '<div class="ai-summary" id="ai-summary">'+aiSummaryHtml(c)+'</div>'+
    '<div class="ai-bulk"><button class="btn btn-sm btn-secondary" onclick="aiApproveAll()">Approve all</button>'+
      '<button class="btn btn-sm btn-secondary" onclick="aiRegenAll()">Regenerate all not approved</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="aiBackToSetup()">Options</button></div>'+
    '<div class="ai-list">'+list+'</div></div>'+
    '<div class="modal-footer"><span class="muted small" id="ai-footnote">'+(c.unsaved? c.unsaved+' unsaved change(s)':'All saved')+'</span>'+
      '<button class="btn btn-ghost" onclick="aiClose()">Close</button>'+
      '<button class="btn btn-primary" onclick="aiSave()">Save comments</button></div>';
}
function aiSummaryHtml(c){
  return '<span class="chip">'+c.total+' comments</span> <span class="chip">'+c.ai+' AI</span> <span class="chip">'+c.tpl+' smart template</span> <span class="chip chip-good">'+c.approved+' approved</span>';
}
function aiBackToSetup(){ _ai.phase = "setup"; aiRender(); }

function aiRefreshRow(i){
  var node = el("ai-row-" + i); if (!node) return;
  node.outerHTML = aiRowHtml(i);
  aiRefreshSummary();
}
function aiRefreshSummary(){
  var s = el("ai-summary"), c = aiCounts();
  if (s) s.innerHTML = aiSummaryHtml(c);
  var f = el("ai-footnote"); if (f) f.textContent = c.unsaved ? c.unsaved + " unsaved change(s)" : "All saved";
}

/* ---------- editing, approving, regenerating ---------- */
function aiEdit(i, part, ta){
  var r = _ai.rows[i], c = r[part], v = ta.value;
  if (v === c.text) return;
  r[part] = { text: v.trim() ? v : "", source: v.trim() ? "manual" : "", approved: false };   // an edit always needs re-approval
  r.changed[part] = true; _ai.dirty = true;
  var chips = el("ai-chips-" + part + "-" + i); if (chips) chips.innerHTML = aiChip(part, r);
  var max = AI_LIMITS[part === "pr" ? "principal" : "form"];
  var cnt = el("ai-count-" + part + "-" + i);
  if (cnt){ cnt.textContent = v.length + "/" + max; cnt.className = "ai-count" + (v.length > max ? " ai-over" : ""); }
  aiRefreshSummary();
}
function aiToggleApprove(i, part){
  var r = _ai.rows[i], c = r[part]; if (!c.text) return;
  c.approved = !c.approved; r.changed[part] = true; _ai.dirty = true;
  aiRefreshRow(i);
}
function aiApproveAll(){
  _ai.rows.forEach(function(r){
    ["ft","pr"].forEach(function(p){
      if (p === "pr" && !_ai.canPr) return;
      if (r[p].text && !r[p].approved){ r[p].approved = true; r.changed[p] = true; _ai.dirty = true; }
    });
  });
  aiRender();
  toast("All comments approved - press Save comments to keep them.");
}
function aiRegen(i, part){
  var r = _ai.rows[i], c = r[part];
  if (!r.facts || r.busy) return;
  if (c.approved && !window.confirm("This comment is approved. Un-approve it and write a new one?")) return;
  if (c.text && c.source === "manual" && !window.confirm("Replace the comment you wrote by hand?")) return;
  if (_aiBusyClass[_ai.classArmId]) { toast("Please wait for the current generation to finish.", "warn"); return; }
  r.busy = true; _aiBusyClass[_ai.classArmId] = true;
  r.variant++; c.approved = false; r[part] = { text: c.text, source: c.source, approved: false };
  var savedMode = _ai.opts.mode, savedManual = _ai.opts.replaceManual, savedPr = _ai.opts.includePr;
  _ai.opts.mode = "unapproved"; _ai.opts.replaceManual = true; _ai.opts.includePr = _ai.canPr;
  // generate only the requested part for this one student
  var other = part === "ft" ? "pr" : "ft", keepOther = r[other];
  r[other] = { text: keepOther.text, source: keepOther.source, approved: true };   // approved = untouched by this run
  aiRefreshRow(i);
  aiProcessBatch([r]).then(function(){
    r[other] = keepOther;
    r.busy = false; _aiBusyClass[_ai.classArmId] = false;
    _ai.opts.mode = savedMode; _ai.opts.replaceManual = savedManual; _ai.opts.includePr = savedPr;
    _ai.dirty = true; aiRefreshRow(i);
  });
}
function aiRegenAll(){
  var n = 0;
  _ai.rows.forEach(function(r){ ["ft","pr"].forEach(function(p){ if (r.facts && !(p==="pr" && !_ai.canPr) && !r[p].approved && !(r[p].source==="manual" && r[p].text)) n++; }); });
  if (!n){ toast("Nothing to regenerate - everything is approved or hand-written.", "warn"); return; }
  if (!window.confirm("Write new comments for " + n + " comment(s) that are not approved? Approved and hand-written comments are kept.")) return;
  _ai.opts.mode = "unapproved"; _ai.opts.replaceManual = false;
  _ai.rows.forEach(function(r){ r.variant++; });
  aiStartRun();
}

/* ---------- saving into the school record (the existing studentComments) ---------- */
function aiSave(){
  if (!_ai) return;
  var changedStudents = 0, now = Date.now();
  var tooLong = 0;
  _ai.rows.forEach(function(r){
    var key = r.key, cur = state.studentComments[key] || {}, touched = false;
    if (r.changed.ft){
      cur.formTeacherComment = r.ft.text; cur.ftSource = r.ft.source || ""; cur.ftApproved = !!r.ft.approved; cur.ftAt = now; touched = true;
      if (r.ft.text.length > AI_LIMITS.form) tooLong++;
    }
    if (r.changed.pr && _ai.canPr){
      cur.principalComment = r.pr.text; cur.prSource = r.pr.source || ""; cur.prApproved = !!r.pr.approved; cur.prAt = now; touched = true;
      if (r.pr.text.length > AI_LIMITS.principal) tooLong++;
    }
    if (touched){ state.studentComments[key] = cur; changedStudents++; r.changed = { ft:false, pr:false }; }
  });
  if (!changedStudents){ toast("No changes to save."); return; }
  addAudit(state, "Class comments saved", classArmName(_ai.classArmId) + " - " + changedStudents + " student(s)");
  _ai.dirty = false;
  toast("Comments saved for " + changedStudents + " student(s)." + (tooLong ? " Some are long and may look crowded on the report card." : ""));
  scheduleSave();
  aiRefreshSummary();
  renderApp();
  // renderApp rebuilds the page behind the dialog; keep the dialog open for further edits
}
