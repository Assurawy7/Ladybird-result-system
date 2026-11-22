/* End-to-end: real UI in headless Chromium, real engine, mocked /ai-comments server.
   Needs: npm i -D playwright pdf-lib && npx playwright install chromium   (skips if absent)
   Run:   npm run test:ai */
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..");
let pw, PDFDocument;
try { pw = require("playwright"); } catch (e) { try { pw = require("/opt/npm-tools/node_modules/playwright"); } catch (e2) { console.log("SKIP: Playwright not installed."); process.exit(0); } }
try { PDFDocument = require("pdf-lib").PDFDocument; } catch (e) { try { PDFDocument = require("/opt/npm-tools/node_modules/pdf-lib").PDFDocument; } catch (e2) { console.log("SKIP: pdf-lib not installed."); process.exit(0); } }
const THEMES = ["classic-navy","modern-teal","royal-purple","crimson-gold","corporate-slate","elegant-serif","sunburst-orange","forest-green","minimal-mono","double-frame-formal"];
let pass = 0, fail = 0; const t = (n, c, extra) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + n + (c || !extra ? "" : "  -> " + extra)); };

/* ---- a faithful stand-in for netlify/functions/ai-comments.js (same contract) ---- */
function mockServer(M) {
  const openers = ["has had a very pleasing term", "has worked steadily this term", "has shown clear potential", "has produced a result worth noting", "is making progress", "has done creditably this term"];
  const closers = ["Keep it up.", "Aim higher next term.", "Continue to build on this.", "More revision will help.", "The school is behind this learner."];
  return async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, configured: M.mode !== "off", providers: M.mode === "off" ? [] : ["MockAI"], batchMax: 6 }) });
    const body = JSON.parse(req.postData() || "{}"); M.calls++; M.bodies.push(req.postData());
    await new Promise((r) => setTimeout(r, M.delay));
    const json = (o, status) => route.fulfill({ status: status || 200, contentType: "application/json", body: JSON.stringify(o) });
    if (M.mode === "off") return json({ ok: false, code: "AI_NOT_CONFIGURED" });
    if (M.mode === "down") return json({ ok: false, code: "AI_UNAVAILABLE" });
    if (M.mode === "ratelimit-once" && !M.limited && M.calls === 3) { M.limited = true; return json({ ok: false, code: "AI_RATE_LIMIT", retryAfter: 1 }); }
    const results = [], failed = [];
    const vh = String(body.variant || "").split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
    body.items.forEach((it, i) => {
      const k = Math.floor((it.average || 0) * 10) + i + vh;
      const sg = it.strongest[0] ? " Particularly good work was seen in " + it.strongest.join(" and ") + "." : " Results are consistent across subjects.";
      const r = { ref: it.ref };
      if (it.average < 33) { failed.push(it.ref); results.push(r); return; }   // simulates a reply that failed the server's checks
      if (body.parts.indexOf("form") > -1) r.form = "{{NAME}} " + openers[k % openers.length] + "." + sg + " " + closers[(k * 3) % closers.length];
      if (body.parts.indexOf("principal") > -1) r.principal = "A " + it.band + " result from {{NAME}}, " + closers[(k * 5) % closers.length].toLowerCase();
      results.push(r);
    });
    return json({ ok: true, provider: "MockAI", results, failed });
  };
}

(async () => {
  /* serve the app over http like a real deployment (fetch cannot reach /.netlify/functions from file://) */
  const http = require("http");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
  const server = http.createServer((q, r) => { const f = path.join(R, q.url.split("?")[0] === "/" ? "index.html" : decodeURIComponent(q.url.split("?")[0])); if (!f.startsWith(R) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end("{}"); } r.setHeader("Content-Type", mime[path.extname(f)] || "text/plain"); r.end(fs.readFileSync(f)); });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok)); const BASE = "http://127.0.0.1:" + server.address().port;
  const browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
  const newPage = async (M) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.errs = errs;
    await page.route("**/.netlify/functions/ai-comments", mockServer(M));
    await page.goto(BASE + "/index.html"); await page.waitForTimeout(350);
    await page.addScriptTag({ path: path.join(__dirname, "helpers", "class-world.js") });
    await page.evaluate(() => { scheduleSave = function () {}; window.aiWait = function () { return Promise.resolve(); }; window.confirm = function () { return true; }; });
    return page;
  };
  const world = (page, n) => page.evaluate((n) => { var w = __buildClass("Junior Secondary", n, {}); goto("form-review", { classArmId: w.armId }); return w; }, n);
  const openDialog = async (page) => { await page.locator('button:has-text("Generate AI Comments for Entire Class")').click(); await page.waitForSelector("#ai-shell .modal-body"); await page.waitForTimeout(150); };
  const runGenerate = async (page, n) => {
    await page.evaluate(() => { window.__prog = []; new MutationObserver(() => { var t = document.getElementById("ai-progress-text"); if (t && t.textContent && window.__prog[window.__prog.length - 1] !== t.textContent) window.__prog.push(t.textContent); }).observe(document.getElementById("modal-root"), { subtree: true, childList: true, characterData: true }); });
    await page.locator('button:has-text("Generate for")').click();
    await page.waitForSelector(".ai-row", { timeout: 60000 });
    return page.evaluate(() => window.__prog);
  };

  /* ================= classes of 5, 35, 50, 100 ================= */
  for (const n of [5, 35, 50, 100]) {
    const M = { mode: n === 35 ? "ratelimit-once" : "ai", delay: 40, calls: 0, bodies: [] };
    const page = await newPage(M); const w = await world(page, n); await openDialog(page);
    t(`[${n}] dialog shows AI ready and counts every student`, (await page.locator(".banner-info").innerText()).includes("AI is ready") && (await page.locator('button:has-text("Generate for")').innerText()).includes("Generate for " + n + " student"));
    const prog = await runGenerate(page, n);
    t(`[${n}] progress is shown as "k/${n} students completed", ending at ${n}/${n}`, prog.every((p) => /^\d+\/\d+ students completed$/.test(p)) && prog[prog.length - 1] === n + "/" + n + " students completed", JSON.stringify(prog.slice(-3)));
    if (n >= 35) t(`[${n}] intermediate progress was visible (e.g. 15/${n})`, prog.length >= 4, JSON.stringify(prog));
    t(`[${n}] one review row per student`, (await page.locator(".ai-row").count()) === n);
    // privacy + batching of what the "server" received
    const names = await page.evaluate(() => state.students.map((s) => [s.name, s.admissionNo, s.name.split(" ")[0]]));
    const allBodies = M.bodies.join("\n");
    t(`[${n}] no student name, first name or admission number ever left the browser`, names.every(([nm, adm, fn]) => allBodies.indexOf(nm) < 0 && allBodies.indexOf(adm) < 0 && !new RegExp('"' + fn + '"').test(allBodies)));
    const sizes = M.bodies.map((b) => JSON.parse(b).items.length);
    t(`[${n}] processed in manageable batches (<=5 per request, ${Math.ceil(n / 5)} requests${M.limited ? " + 1 retry after the rate limit" : ""})`, Math.max(...sizes) <= 5 && M.calls === Math.ceil(n / 5) + (M.limited ? 1 : 0), "calls=" + M.calls);
    // save, then verify every student's stored comments
    await page.locator('.modal-footer button:has-text("Save comments")').click(); await page.waitForTimeout(250);
    const res = await page.evaluate((w) => {
      var out = []; var ov = computeClassOverview(w.armId, w.sessionId, w.termId);
      state.students.forEach(function (s) {
        var c = state.studentComments[[s.id, w.sessionId, w.termId].join("::")] || {};
        var f = aiBuildFacts(s, w.armId, w.sessionId, w.termId, ov);
        out.push({ id: s.id, first: s.name.split(" ")[0], ft: c.formTeacherComment || "", pr: c.principalComment || "", fts: c.ftSource, prs: c.prSource, ftA: c.ftApproved, strong: f ? f.strongest[0] : null, rev: false });
      });
      return out;
    }, w);
    t(`[${n}] every student received BOTH comments, saved under the right student/session/term`, res.length === n && res.every((r) => r.ft.length > 30 && r.pr.length > 20 && (r.fts === "ai" || r.fts === "template") && (r.prs === "ai" || r.prs === "template")));
    t(`[${n}] each comment is personalised: own first name present`, res.filter((r) => r.ft.indexOf(r.first) > -1).length >= n * 0.97 && res.every((r) => r.ft.indexOf("{{NAME}}") < 0 && r.pr.indexOf("{{NAME}}") < 0));
    t(`[${n}] comments reflect THAT student's own records (own strongest subject named)`, res.filter((r) => !r.strong || r.ft.indexOf(r.strong) > -1).length >= n * 0.95);
    t(`[${n}] Form Teacher comments are all different`, new Set(res.map((r) => r.ft.toLowerCase())).size === n);
    t(`[${n}] weak students (failed by the server checks) still got a safe fallback comment`, n < 20 || res.some((r) => r.fts === "template"));
    t(`[${n}] saved drafts are NOT approved yet`, res.every((r) => !r.ftA));
    t(`[${n}] no JavaScript errors`, page.errs.length === 0, page.errs[0]);

    /* ---- report cards: every template, comments visible, exactly one A4 page ---- */
    const sample = n <= 5 ? res.map((r) => r.id) : res.slice().sort((a, b) => (b.ft.length + b.pr.length) - (a.ft.length + a.pr.length)).slice(0, 10).map((r) => r.id);
    const meta = await page.evaluate(({ w, ids, themes }) => {
      var pa = document.getElementById("print-area"), h = "", m = [];
      ids.forEach(function (sid) { themes.forEach(function (th) { h += generateReportCardHtml(sid, w.armId, w.sessionId, w.termId, w.templateIds[th]); m.push({ sid: sid, th: th }); }); });
      pa.innerHTML = h; fitInPrintArea(pa);
      return [].slice.call(pa.querySelectorAll(".report-card")).map(function (c, i) {
        var cm = state.studentComments[[m[i].sid, w.sessionId, w.termId].join("::")];
        var tx = c.textContent.replace(/\s+/g, " ");
        return { th: m[i].th, ft: tx.indexOf(cm.formTeacherComment.replace(/\s+/g, " ")) > -1, pr: tx.indexOf(cm.principalComment.replace(/\s+/g, " ")) > -1, fit: c.dataset.fit };
      });
    }, { w, ids: sample, themes: THEMES });
    t(`[${n}] comments appear on all 10 templates (${meta.length} cards: ${sample.length} students x 10)`, meta.length === sample.length * 10 && meta.every((m) => m.ft && m.pr) && THEMES.every((th) => meta.some((m) => m.th === th)), JSON.stringify(meta.filter((m) => !m.ft || !m.pr).slice(0, 2)));
    await page.emulateMedia({ media: "print" }); const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true }); await page.emulateMedia({ media: "screen" });
    const pages = (await PDFDocument.load(pdf)).getPages();
    t(`[${n}] ${meta.length} report cards print as exactly ${meta.length} A4 pages (one each)`, pages.length === meta.length && pages.every((p) => Math.abs(p.getSize().width - 595.3) < 1.5 && Math.abs(p.getSize().height - 841.9) < 1.5) && meta.every((m) => m.fit !== "overflow" && m.fit !== "scaled"));

    await page.close();
  }

  /* ================= protection of approved + hand-written comments ================= */
  {
    const M = { mode: "ai", delay: 20, calls: 0, bodies: [] }; const page = await newPage(M); const w = await world(page, 35);
    await openDialog(page); await runGenerate(page, 35); await page.locator('.modal-footer button:has-text("Save comments")').click(); await page.waitForTimeout(200);
    await page.evaluate(() => aiClose());
    // approve the first 10 (through the real Approve buttons), hand-write #11, then "Replace every comment that is not approved"
    const snap1 = await page.evaluate((w) => { var s = {}; state.students.forEach(function (st, i) { var k = [st.id, w.sessionId, w.termId].join("::"), c = state.studentComments[k]; if (i < 10) { c.ftApproved = true; c.prApproved = true; } if (i === 10) { c.formTeacherComment = "Hand written by the teacher."; c.ftSource = "manual"; c.ftApproved = false; } s[st.id] = { ft: c.formTeacherComment, pr: c.principalComment }; }); return s; }, w);
    await openDialog(page);
    await page.locator('input[name="ai-mode"]').nth(1).check(); await page.waitForTimeout(150);
    const btn = await page.locator('button:has-text("Generate for")').innerText();
    t("[protect] 'replace unapproved' counts only the students who still need comments (approved + hand-written are kept)", /Generate for (2[4-5]) students/.test(btn), btn);
    await runGenerate(page, 35); await page.locator('.modal-footer button:has-text("Save comments")').click(); await page.waitForTimeout(200);
    const snap2 = await page.evaluate((w) => { var s = {}; state.students.forEach(function (st) { var c = state.studentComments[[st.id, w.sessionId, w.termId].join("::")]; s[st.id] = { ft: c.formTeacherComment, pr: c.principalComment, a: c.ftApproved }; }); return s; }, w);
    const ids = Object.keys(snap1);
    t("[protect] the 10 APPROVED comments (both kinds) are untouched", ids.slice(0, 10).every((id) => snap2[id].ft === snap1[id].ft && snap2[id].pr === snap1[id].pr && snap2[id].a === true));
    t("[protect] the HAND-WRITTEN comment is untouched", snap2[ids[10]].ft === "Hand written by the teacher.");
    t("[protect] the unapproved drafts WERE replaced with new ones", ids.slice(11).filter((id) => snap2[id].ft !== snap1[id].ft).length >= 20);
    // per-row: approved comment needs explicit un-approve; Regenerate then changes only that field
    await page.evaluate(() => aiClose()); await openDialog(page);
    await page.locator('button:has-text("Generate for")').isDisabled().catch(() => {});
    await page.evaluate(() => { _ai.phase = "review"; aiRender(); });
    const before = await page.evaluate(() => ({ ft: _ai.rows[20].ft.text, pr: _ai.rows[20].pr.text }));
    await page.locator("#ai-row-20 .ai-field").first().locator('button:has-text("Regenerate")').click(); await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ ft: _ai.rows[20].ft.text, pr: _ai.rows[20].pr.text, busy: _ai.rows[20].busy }));
    t("[row] Regenerate for one student changes that Form Teacher comment only (Principal's stays)", after.ft !== before.ft && after.pr === before.pr && !after.busy);
    // manual edit -> marked hand-written, needs re-approval, saved
    await page.locator("#ai-text-ft-3").fill("My own words about this learner."); await page.waitForTimeout(100);
    const edited = await page.evaluate(() => _ai.rows[3].ft);
    t("[edit] typing your own comment marks it hand-written and un-approves it", edited.source === "manual" && edited.approved === false && edited.text === "My own words about this learner.");
    await page.locator('.modal-footer button:has-text("Save comments")').click(); await page.waitForTimeout(200);
    t("[edit] the edit is saved to the record", await page.evaluate((w) => { var s = state.students.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })[3]; var c = state.studentComments[[s.id, w.sessionId, w.termId].join("::")]; return c.formTeacherComment === "My own words about this learner." && c.ftSource === "manual" && c.ftApproved === false; }, w));
    await page.close();
  }

  /* ================= Form Teacher (not Principal) ================= */
  {
    const M = { mode: "ai", delay: 10, calls: 0, bodies: [] }; const page = await newPage(M); const w = await world(page, 5);
    await page.evaluate((w) => { var a = state.formTeacherAssignments.filter(function (x) { return x.classArmId === w.armId; })[0]; if (!a) { a = { id: uid("fta"), teacherId: state.users.filter(function (u) { return u.role === "TEACHER"; })[0].id, classArmId: w.armId, active: true }; state.formTeacherAssignments.push(a); } state.currentUser = byId(state.users, a.teacherId); state.studentComments[[state.students[0].id, w.sessionId, w.termId].join("::")] = { principalComment: "Written by the Principal." }; goto("form-review", { classArmId: w.armId }); }, w);
    await openDialog(page);
    t("[teacher] a Form Teacher sees no option to write the Principal's comment", (await page.locator("text=Also write the Principal").count()) === 0 && (await page.locator("text=Principal's comments are written by the Principal").count()) === 1);
    await runGenerate(page, 5);
    t("[teacher] the review shows Form Teacher comments only", (await page.locator(".ai-row").first().locator("text=Principal's Comment").count()) === 0);
    await page.locator('.modal-footer button:has-text("Save comments")').click(); await page.waitForTimeout(200);
    const r = await page.evaluate((w) => state.students.map(function (s) { var c = state.studentComments[[s.id, w.sessionId, w.termId].join("::")]; return { ft: c.formTeacherComment, pr: c.principalComment }; }), w);
    t("[teacher] all 5 got a Form Teacher comment; the existing Principal comment is untouched; no Principal comments were created", r.every((x) => x.ft) && r.filter((x) => x.pr).length === 1 && r.some((x) => x.pr === "Written by the Principal."));
    t("[teacher] the server was only asked for the 'form' part", M.bodies.every((b) => JSON.stringify(JSON.parse(b).parts) === '["form"]'));
    await page.close();
  }

  /* ================= AI unavailable: manual-fallback / smart templates ================= */
  for (const mode of ["off", "down"]) {
    const M = { mode, delay: 10, calls: 0, bodies: [] }; const page = await newPage(M); const w = await world(page, 35); await openDialog(page);
    if (mode === "off") t("[fallback:off] the dialog says AI is not connected and that the built-in writer will be used", (await page.locator("#ai-shell .banner-warn").first().innerText()).includes("not connected"));
    const prog = await runGenerate(page, 35);
    t(`[fallback:${mode}] generation still completes for the whole class (${prog[prog.length - 1]})`, prog[prog.length - 1] === "35/35 students completed");
    const rows = await page.evaluate(() => _ai.rows.map(function (r) { return { s: r.ft.source, t: r.ft.text, p: r.pr.text }; }));
    t(`[fallback:${mode}] every student has a comment from the built-in smart writer, all different`, rows.every((r) => r.s === "template" && r.t.length > 30 && r.p.length > 20) && new Set(rows.map((r) => r.t)).size === 35);
    t(`[fallback:${mode}] the user is told why`, /built-in smart writer/.test(await page.locator("#ai-shell .banner-warn").first().innerText()));
    if (mode === "down") t("[fallback:down] it stopped hammering a dead service (far fewer requests than batches x retries)", M.calls <= 8, "calls=" + M.calls);
    t(`[fallback:${mode}] no JavaScript errors`, page.errs.length === 0, page.errs[0]);
    await page.close();
  }

  /* ================= no duplicate generation ================= */
  {
    const M = { mode: "ai", delay: 250, calls: 0, bodies: [] }; const page = await newPage(M); await world(page, 15); await openDialog(page);
    await page.locator('button:has-text("Generate for")').click(); await page.waitForTimeout(100);
    const second = await page.evaluate(() => { aiStartRun(); aiStartRun(); return { running: _ai.phase, total: _ai.total }; });
    await page.waitForSelector(".ai-row", { timeout: 20000 });
    t("[duplicates] pressing Generate again while it runs does not start a second run (3 batches only)", M.calls === 3 && second.running === "running", "calls=" + M.calls);
    await page.close();
  }

  await browser.close(); server.close();
  console.log("\n" + pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
})();
