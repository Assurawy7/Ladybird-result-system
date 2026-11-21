/* ==========================================================================
   13 - REPORT CARDS: generation, preview, print
   Every report card is ONE fixed A4 portrait sheet (210 x 296.6 mm). The HTML
   is the same structure for all ten visual themes (colours, fonts, borders and
   header treatment live in styles.css as .rc-theme-* classes - see Settings ->
   Report Templates). A small "fit engine" (fitReportCards, below) measures the
   real rendered sheet in the user's own browser and picks the largest readable
   type size so that 5, 10, 15 or 25 subjects all fill the page neatly without
   ever spilling onto a second page. Academic calculations are NOT done here:
   everything comes from the engine (computeStudentOverall etc.).
   ========================================================================== */

function renderReportsView(){
  var user = state.currentUser;
  var allowedIds = accessibleClassArmIds(user);
  var vp = state.viewParams || {};
  var arms = state.classArms.filter(function(c){return c.active && allowedIds.indexOf(c.id)>-1;});
  var classArmId = vp.classArmId && allowedIds.indexOf(vp.classArmId)>-1 ? vp.classArmId : (arms[0]?arms[0].id:"");
  if (!classArmId) return '<div class="page-header"><h2>Report Cards</h2></div><div class="empty-state"><h3>No accessible class</h3></div>';

  var classOptions = arms.map(function(c){return '<option value="'+c.id+'"'+(c.id===classArmId?' selected':'')+'>'+escapeHtml(c.name)+'</option>';}).join("");
  var students = studentsInClassArm(classArmId).sort(function(a,b){return a.name.localeCompare(b.name);});
  var classArm = byId(state.classArms, classArmId);

  var sectionTemplates = state.reportTemplates.filter(function(t){return t.active && t.sectionIds.indexOf(classArm.sectionId)>-1;});
  var templateOptions = sectionTemplates.map(function(t){
    return '<option value="'+t.id+'"'+(t.isDefault?' selected':'')+'>'+escapeHtml(t.name)+'</option>';
  }).join("");

  var rows = students.map(function(stu){
    var overall = computeStudentOverall(stu.id, classArmId, state.currentSessionId, state.currentTermId);
    return '<tr><td><input type="checkbox" class="report-check" value="'+stu.id+'"/></td>'+
      '<td>'+escapeHtml(stu.name)+'</td><td>'+escapeHtml(stu.admissionNo)+'</td>'+
      '<td>'+(overall.average!==null?overall.average+"%":"—")+'</td>'+
      '<td><button class="btn btn-sm btn-primary" onclick="previewReport(\''+stu.id+'\',\''+classArmId+'\')">Preview</button></td></tr>';
  }).join("");

  return ''+
  '<div class="page-header page-header-row"><div><h2>Report Cards</h2><p>'+escapeHtml(sessionName(state.currentSessionId))+' &middot; '+escapeHtml(termName(state.currentTermId))+'</p></div>'+
    '<select onchange="goto(\'reports\',{classArmId:this.value})">'+classOptions+'</select></div>'+
  '<div class="card">'+
    '<div class="card-header"><h3>'+classArmName(classArmId)+' — '+students.length+' student(s)</h3>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
      '<label class="muted small">Template:</label><select class="field-input field-input-sm" id="report-template-select">'+templateOptions+'</select>'+
      '<button class="btn btn-sm btn-secondary" onclick="printBulkReports(\''+classArmId+'\')">Print Selected</button>'+
      '<button class="btn btn-sm btn-primary" onclick="printWholeClass(\''+classArmId+'\')">Print Whole Class</button></div>'+
    '</div>'+
    (rows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Name</th><th>Admission No.</th><th>Average</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      : '<div class="empty-state"><h3>No students in this class</h3></div>')+
  '</div>';
}

function selectedTemplateId(){
  var sel = el("report-template-select");
  return sel ? sel.value : null;
}

function pickReportTemplate(sectionId, forcedId){
  if (forcedId){
    var forced = byId(state.reportTemplates, forcedId);
    if (forced) return forced;
  }
  var t = state.reportTemplates.filter(function(t){return t.active && t.sectionIds.indexOf(sectionId)>-1 && t.isDefault;})[0];
  return t || state.reportTemplates.filter(function(t){return t.active && t.sectionIds.indexOf(sectionId)>-1;})[0] || state.reportTemplates[0];
}

/* ---------- small display helpers (presentation only) ---------- */

/* Only ever put a real picture in an <img>: "@media" markers (photo exists but
   has not loaded on this device yet) and junk must not draw a broken image. */
function rcImgSrc(v){
  return (typeof v === "string" && /^(data:image\/|https?:|blob:|\/|\.\/)/i.test(v)) ? escapeHtml(v) : "";
}
function rcInitial(s){ s = String(s||"").trim(); return s ? escapeHtml(s.charAt(0).toUpperCase()) : "&bull;"; }
function rcFormatDate(s){
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));
  if (!m) return s || "";
  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var mo = Number(m[2]);
  if (mo < 1 || mo > 12) return s;
  return Number(m[3]) + " " + months[mo-1] + " " + m[1];
}
function rcFormTeacherName(classArmId, sig){
  if (sig && sig.name) return sig.name;
  var a = (state.formTeacherAssignments||[]).filter(function(x){return x.classArmId===classArmId && x.active;})[0];
  return a ? userName(a.teacherId) : "";
}
function rcTier(n){ return n<=7 ? "a" : n<=11 ? "b" : n<=15 ? "c" : n<=20 ? "d" : "e"; }

/* Watermark used when the school has not uploaded a logo: a quiet crest. */
var RC_CREST_SVG = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">'+
  '<path d="M50 5 89 19v29c0 22-16 38-39 47C27 86 11 70 11 48V19z"/>'+
  '<path d="M26 40c8-4 16-4 24 2 8-6 16-6 24-2v27c-8-4-16-4-24 2-8-6-16-6-24-2z"/><path d="M50 42v27"/>'+
  '<path d="M50 20l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" stroke-width="1.6"/></svg>';

/* Renders the Skills/Behaviours rating grid: one row per domain, a tick under
   whichever column matches the student's rating (rating labels map to columns
   by position in state.ratingLevels: first label = highest number). The number
   of columns follows the school's own rating levels (5 by default). */
function domainGridHtml(title, domains, ratings){
  var levels = state.ratingLevels && state.ratingLevels.length ? state.ratingLevels : ["Excellent","Very Good","Good","Fair","Poor"];
  var cols = []; for (var v = levels.length; v >= 1; v--) cols.push(v);
  var headerCols = cols.map(function(v){ return '<th>'+v+'</th>'; }).join("");
  var rows = domains.filter(function(d){return d.active;}).map(function(d, i){
    var label = ratings ? ratings[d.id] : null;
    var idx = label ? levels.indexOf(label) : -1;
    var ratingValue = idx > -1 ? (levels.length - idx) : null;
    var cells = cols.map(function(v){
      return ratingValue===v ? '<td class="on">&#10003;</td>' : '<td></td>';
    }).join("");
    return '<tr><td>'+(i+1)+'. '+escapeHtml(d.name)+'</td>'+cells+'</tr>';
  }).join("");
  if (!rows) return "";
  return '<div class="rc-domain-block">'+
    '<table class="rc-domain-table"><thead><tr><th class="rc-domain-title">'+escapeHtml(title)+'</th>'+headerCols+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function generateReportCardHtml(studentId, classArmId, sessionId, termId, forcedTemplateId){
  var stu = byId(state.students, studentId);
  var classArm = byId(state.classArms, classArmId);
  var template = pickReportTemplate(classArm.sectionId, forcedTemplateId);
  var overall = computeStudentOverall(studentId, classArmId, sessionId, termId);
  var classOv = computeClassOverview(classArmId, sessionId, termId);
  var myPosRow = classOv.students.filter(function(r){return r.student.id===studentId;})[0];
  var commentKey = [studentId, sessionId, termId].join("::");
  var comments = state.studentComments[commentKey] || {};
  var domScores = state.domainScores[commentKey] || { affective:{}, psychomotor:{} };
  var attendance = state.attendance[commentKey] || {};
  var principalSig = state.signatures.filter(function(s){return s.role==="PRINCIPAL" && s.active;})[0];
  var formTeacherSig = formTeacherSignatureFor(classArmId);
  var grading = getGradingScheme(null, classArm);
  var term = byId(state.terms, termId);

  /* ---- subject table: which columns to show ---- */
  var classScheme = getAssessmentScheme(null, classArm);
  function activeComps(sch){
    return sch ? sch.components.filter(function(c){return c.active;}).sort(function(a,b){return a.order-b.order;}) : [];
  }
  var perSubject = overall.subjectRows.map(function(r){
    var sch = getAssessmentScheme(r.subject, classArm);
    return { row:r, comps:activeComps(sch) };
  });
  /* Header columns: the class scheme's components, unless some subject uses a
     scheme with MORE components - then the longest one, so no row is ever wider
     than its header. */
  var headerComps = activeComps(classScheme);
  perSubject.forEach(function(p){ if (p.comps.length > headerComps.length) headerComps = p.comps; });
  var hideComps = headerComps.length <= 1; // one column would just repeat the Total
  var compHeaderCols = hideComps ? "" : headerComps.map(function(c, i){
    var sameMax = perSubject.every(function(p){ return !p.comps[i] || p.comps[i].maxScore === c.maxScore; });
    return '<th>'+escapeHtml(c.name)+(sameMax && c.maxScore ? '<small>'+escapeHtml(String(c.maxScore))+'</small>' : '')+'</th>';
  }).join("");
  var showRemark = overall.subjectRows.some(function(r){
    return r.remark && String(r.remark).toLowerCase() !== String(r.grade).toLowerCase();
  });

  var subjectRows = perSubject.map(function(p){
    var r = p.row;
    var display = r.calc.hasAbsent ? "ABS" : r.calc.hasExcused ? "EXC" : (r.calc.isComplete ? r.calc.total : "—");
    var rec = getScoreRecord(studentId, r.subject.id, classArmId, sessionId, termId);
    var compCells = hideComps ? "" : headerComps.map(function(hc, i){
      var c = p.comps[i];
      if (!c) return '<td class="rc-na"></td>';
      var v = rec ? rec.components[c.id] : undefined;
      return '<td>'+((v===undefined||v===null)?"—":escapeHtml(String(v)))+'</td>';
    }).join("");
    var stat = getSubjectStatForStudent(classArmId, r.subject.id, sessionId, termId, studentId);
    var failed = r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused && typeof r.calc.total === "number" &&
                 Number(r.subject.passMark) > 0 && r.calc.total < Number(r.subject.passMark);
    return '<tr><td class="rc-subject-name">'+escapeHtml(r.subject.name)+'</td>'+compCells+
      '<td class="rc-total'+(failed?' rc-fail':'')+'"><strong>'+display+'</strong></td><td class="rc-grade'+(failed?' rc-fail':'')+'">'+escapeHtml(r.grade)+'</td>'+
      '<td>'+(stat.classAverage!==null?stat.classAverage:"—")+'</td>'+
      '<td>'+(stat.position?ordinal(stat.position):"—")+'</td>'+
      (showRemark ? '<td class="rc-remark">'+escapeHtml(r.remark||"")+'</td>' : '')+'</tr>';
  }).join("");
  var colCount = 1 + (hideComps?0:headerComps.length) + 4 + (showRemark?1:0);
  if (!subjectRows) subjectRows = '<tr><td colspan="'+colCount+'" class="rc-empty-row">No subjects recorded for this term.</td></tr>';

  /* ---- grading key ---- */
  var bands = grading ? grading.bands.slice().sort(function(a,b){return b.min-a.min;}) : [];
  var gradingLegend = bands.length ?
    '<table class="rc-key-table"><tbody>'+
      '<tr class="rc-key-grade"><th>Grade</th>'+bands.map(function(b){return '<td>'+escapeHtml(b.grade)+'</td>';}).join("")+'</tr>'+
      '<tr><th>Score</th>'+bands.map(function(b){return '<td>'+b.min+'&ndash;'+b.max+'</td>';}).join("")+'</tr>'+
      '<tr><th>Remark</th>'+bands.map(function(b){return '<td>'+escapeHtml(b.remark||"")+'</td>';}).join("")+'</tr>'+
    '</tbody></table>' : '';

  /* ---- skills / behaviours ---- */
  var skillsHtml = template.showAffective ? domainGridHtml("Skills", state.psychomotorDomains, domScores.psychomotor) : "";
  var behavHtml  = template.showAffective ? domainGridHtml("Behaviours", state.affectiveDomains, domScores.affective) : "";
  var levels = state.ratingLevels && state.ratingLevels.length ? state.ratingLevels : [];
  var ratingKey = levels.length ? '<div class="rc-rating-key"><b>Rating key:</b> '+levels.map(function(l,i){return (levels.length-i)+' = '+escapeHtml(l);}).join(" &nbsp;&bull;&nbsp; ")+'</div>' : '';
  var domainsHtml = (skillsHtml || behavHtml) ?
    '<div class="rc-domains"><div class="rc-two-col'+((skillsHtml && behavHtml)?'':' rc-one-col')+'">'+skillsHtml+behavHtml+'</div>'+ratingKey+'</div>' : '';

  /* ---- images ---- */
  var photoSrc = rcImgSrc(stu.photo), logoSrc = rcImgSrc(state.school.logo), stampSrc = rcImgSrc(state.school.stamp);
  var photoHtml = photoSrc ? '<img src="'+photoSrc+'" class="rc-photo" alt=""/>' : '<div class="rc-photo rc-photo-fallback">'+rcInitial(stu.name)+'</div>';
  var logoHtml = logoSrc ? '<img src="'+logoSrc+'" class="rc-logo" alt=""/>' : '<div class="rc-logo rc-logo-fallback">'+rcInitial(state.school.name||"L")+'</div>';
  var themeClass = "rc-theme-" + (template.style || "classic-navy");

  var totalFees = (Number(comments.nextFees)||0) + (Number(comments.examFee)||0);
  var nStudents = classOv.students.length;
  var posText = myPosRow && myPosRow.position ? ordinal(myPosRow.position) : "—";
  var ftName = rcFormTeacherName(classArmId, formTeacherSig);
  var deptName = classArm.departmentId ? departmentName(classArm.departmentId) : "";
  var sectionLabel = sectionName(classArm.sectionId) + (deptName ? " — " + deptName : "");
  var contact = [state.school.phone ? 'Tel: '+state.school.phone : '', state.school.email||'', state.school.website||''].filter(Boolean).map(escapeHtml).join(' &nbsp;&bull;&nbsp; ');

  function cell(label, value, span){ return '<div class="rc-c'+(span?' rc-s'+span:'')+'"><span>'+label+'</span><strong>'+value+'</strong></div>'; }
  function tile(label, value, cls){ return '<div class="rc-tile'+(cls?' '+cls:'')+'"><strong>'+value+'</strong><span>'+label+'</span></div>'; }

  var absent = attendance.absent;
  if ((absent===undefined||absent===null||absent==="") && typeof attendance.totalDays==="number" && typeof attendance.present==="number") absent = attendance.totalDays - attendance.present;
  var attVal = function(v){ return (v!==undefined && v!==null && v!=="") ? escapeHtml(String(v)) : "—"; };

  var perfTiles =
    tile("Total Score", (overall.allComplete ? overall.grandTotal : "—")) +
    tile("Average", (overall.average!==null ? overall.average+"%" : "—")) +
    tile("Position", posText, "rc-tile-hero") +
    tile("In Class", nStudents);
  var attTiles = template.showAttendance ?
    tile("Days Open", attVal(attendance.totalDays), "rc-tile-att") +
    tile("Present", attVal(attendance.present), "rc-tile-att") +
    tile("Absent", attVal(absent), "rc-tile-att") +
    (attendance.late ? tile("Late", attVal(attendance.late), "rc-tile-att") : "") : "";

  function signBlock(img, name, caption, extra){
    return '<div class="rc-sign">'+
      '<div class="rc-sign-art">'+(img ? '<img src="'+img+'" class="sig-img" alt=""/>' : '<div class="sig-line"></div>')+(extra||"")+'</div>'+
      '<div class="rc-sign-line"></div>'+
      (name ? '<b class="rc-sign-name">'+escapeHtml(name)+'</b>' : '')+
      '<span class="rc-sign-cap">'+caption+'</span></div>';
  }
  var ftImg = formTeacherSig && formTeacherSig.image ? rcImgSrc(formTeacherSig.image) : "";
  var prImg = principalSig && principalSig.image ? rcImgSrc(principalSig.image) : "";

  return ''+
  '<div class="report-card '+themeClass+'" data-tier="'+rcTier(overall.subjectRows.length)+'" data-n="'+overall.subjectRows.length+'" data-section="'+escapeHtml(sectionName(classArm.sectionId))+'">'+
    '<div class="rc-watermark">'+(logoSrc ? '<img src="'+logoSrc+'" alt=""/>' : RC_CREST_SVG)+'</div>'+
    '<div class="rc-frame">'+
      '<i class="rc-corner rc-c-tl"></i><i class="rc-corner rc-c-tr"></i><i class="rc-corner rc-c-bl"></i><i class="rc-corner rc-c-br"></i>'+
      '<div class="rc-sheet">'+
        '<div class="rc-header">'+
          '<div class="rc-logo-wrap">'+logoHtml+'</div>'+
          '<div class="rc-school-info'+(String(state.school.name||"").length>46?' rc-name-xl':String(state.school.name||"").length>30?' rc-name-l':'')+'"><h1>'+escapeHtml(state.school.name)+'</h1>'+
            (state.school.address?'<p class="rc-address">'+escapeHtml(state.school.address)+'</p>':'')+
            (contact?'<p class="rc-contact">'+contact+'</p>':'')+
            (state.school.motto?'<p class="rc-motto">'+escapeHtml(state.school.motto)+'</p>':'')+'</div>'+
          '<div class="rc-photo-wrap'+(template.showPhoto?'':' rc-photo-off')+'">'+(template.showPhoto ? photoHtml : '')+'</div>'+
        '</div>'+
        '<div class="rc-title"><span class="rc-title-main">'+escapeHtml(termName(termId))+' Report Card</span>'+
          '<span class="rc-title-sub">'+escapeHtml(sectionName(classArm.sectionId))+' &middot; '+escapeHtml(sessionName(sessionId))+' Academic Session</span></div>'+
        '<div class="rc-info-grid">'+
          cell("Student's Name", escapeHtml(stu.name), 5)+
          cell("Admission No.", escapeHtml(stu.admissionNo||"—"), 3)+
          cell("Class", escapeHtml(classArm.name), 4)+
          cell("Sex", escapeHtml(stu.gender||"—"), 2)+
          cell("Age", (calcAge(stu.dob)||"—"), 2)+
          cell("Term", escapeHtml(termName(termId)), 4)+
          cell("Session", escapeHtml(sessionName(sessionId)), 4)+
          cell("Next Term Begins", escapeHtml(rcFormatDate(term&&term.nextTermStartDate)||"—"), 4)+
          cell("Form Teacher", escapeHtml(ftName||"—"), 4)+
          cell("Section", escapeHtml(sectionLabel||"—"), 4)+
        '</div>'+
        '<div class="rc-summary"><div class="rc-tiles rc-tiles-perf">'+perfTiles+'</div>'+(attTiles?'<div class="rc-tiles rc-tiles-att">'+attTiles+'</div>':'')+'</div>'+
        '<div class="rc-results"><table class="rc-subject-table"><thead><tr><th class="rc-subject-head">Subject</th>'+compHeaderCols+'<th>Total</th><th>Grade</th><th>Class Avg</th><th>Position</th>'+(showRemark?'<th>Remark</th>':'')+'</tr></thead><tbody>'+subjectRows+'</tbody></table></div>'+
        (gradingLegend ? '<div class="rc-legend">'+gradingLegend+'</div>' : '')+
        domainsHtml+
        '<div class="rc-comments">'+
          '<div class="rc-comment"><span class="rc-label">Form Teacher\'s Comment</span><p>'+escapeHtml(comments.formTeacherComment||"—")+'</p>'+
            signBlock(ftImg, ftName, "Form Teacher's Signature")+'</div>'+
          '<div class="rc-comment"><span class="rc-label">Principal\'s Comment</span><p>'+escapeHtml(comments.principalComment||"—")+'</p>'+
            signBlock(prImg, principalSig&&principalSig.name, "Principal's Signature", stampSrc?'<img src="'+stampSrc+'" class="rc-stamp" alt=""/>':'')+'</div>'+
        '</div>'+
        (template.showFees ? '<div class="rc-fees"><span class="rc-fees-title">Fees for Next Term</span><span>School Fee: <b>'+formatNaira(comments.nextFees||0)+'</b></span><span>Exam Fee: <b>'+formatNaira(comments.examFee||0)+'</b></span><span class="rc-fees-total">Total: <b>'+formatNaira(totalFees)+'</b></span></div>' : '')+
        '<div class="rc-footer"><span>Not valid without the Principal\'s signature or the school stamp.</span><span>'+escapeHtml(state.school.name)+'</span></div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function ordinal(n){
  var s = ["th","st","nd","rd"], v = n%100;
  return n + (s[(v-20)%10]||s[v]||s[0]);
}

/* ==========================================================================
   FIT ENGINE - keeps every report card on exactly one A4 page.
   The sheet (.rc-sheet) is a flex column inside a fixed-size A4 card. We
   measure its real height in this browser (so the school's actual fonts and
   text lengths are taken into account) and choose, in this order:
     1. the largest font size (up to 12.6px) at which everything fits;
     2. if even 9.4px is too big (very many subjects), a "compact" layout with
        a slimmer header and tighter rhythm, down to a 7.6px floor;
     3. only past that floor (about 30+ subjects) a gentle uniform scale-down.
   Then spare height is shared out: table/skill rows get taller (capped) and
   the rest is spread evenly between sections - no big empty gaps at the foot.
   ========================================================================== */
var RC_FIT = { fsMax:12.6, fsComfort:9.4, fsMin:7.6, zMin:0.55 };

/* Fits = no vertical overflow, and nothing wider than the sheet. Header bands
   may deliberately bleed sideways into the frame's own padding (full-width
   banners), so that much horizontal spill is allowed; anything more is real. */
function rcFits(sheet, bleed){
  return sheet.scrollHeight <= sheet.clientHeight + 0.5 && sheet.scrollWidth <= sheet.clientWidth + (bleed||0) + 0.5;
}
function fitReportCard(card){
  var sheet = card.querySelector(".rc-sheet");
  if (!sheet) return null;
  var frame = sheet.parentNode, bleed = 0;
  try { bleed = parseFloat(window.getComputedStyle(frame).paddingRight) || 0; } catch (e) {}
  function set(k, v){ card.style.setProperty(k, v); }
  function clear(){ ["--fs","--rg","--cg","--z"].forEach(function(k){ card.style.removeProperty(k); }); card.removeAttribute("data-compact"); }
  /* largest value in [lo,hi] (to 0.1) for which fits() is true; null if even lo fails */
  function largest(lo, hi, apply){
    apply(hi); if (rcFits(sheet, bleed)) return hi;
    apply(lo); if (!rcFits(sheet, bleed)) return null;
    for (var i=0; i<7 && hi-lo>0.1; i++){
      var mid = (lo+hi)/2; apply(mid);
      if (rcFits(sheet, bleed)) lo = mid; else hi = mid;
    }
    apply(lo); return lo;
  }
  var applyFs = function(v){ set("--fs", v.toFixed(2)+"px"); };
  clear();
  var mode = "ok", fs = largest(RC_FIT.fsComfort, RC_FIT.fsMax, applyFs);
  if (fs === null){
    card.setAttribute("data-compact","1"); mode = "compact";
    fs = largest(RC_FIT.fsMin, RC_FIT.fsComfort, applyFs);
    if (fs === null){
      fs = RC_FIT.fsMin; applyFs(fs);
      var z = largest(RC_FIT.zMin, 1, function(v){ set("--z", v.toFixed(3)); });
      if (z === null){ set("--z", String(RC_FIT.zMin)); mode = "overflow"; } else mode = "scaled";
    }
  }
  /* spend spare height on roomier rows (never beyond ~3 lines per row) */
  var cap = fs * 0.55;
  if (mode === "ok" || mode === "compact"){
    var rg = largest(0, cap, function(v){ set("--rg", v.toFixed(2)+"px"); });
    if (rg === null) set("--rg", "0px");
    /* then more writing room in the comment boxes (capped); whatever is left
       is spread evenly between the sections by the flex layout */
    var cg = largest(0, fs * 4.5, function(v){ set("--cg", v.toFixed(2)+"px"); });
    if (cg === null) set("--cg", "0px");
  }
  card.setAttribute("data-fit", mode);
  card.setAttribute("data-fs", String(parseFloat(card.style.getPropertyValue("--fs"))||fs));
  return mode;
}
function fitReportCards(root){
  if (!root || !root.querySelectorAll) return;
  Array.prototype.slice.call(root.querySelectorAll(".report-card")).forEach(fitReportCard);
}

/* Cards must be laid out to be measured, but #print-area is display:none on
   screen. Measure them off-screen at the exact print width instead. */
function fitInPrintArea(pa){
  pa.classList.add("rc-measuring");
  try { fitReportCards(pa); } finally { pa.classList.remove("rc-measuring"); }
}

/* On-screen preview shows the true A4 sheet, scaled down to fit the window. */
function scaleReportPreview(){
  var body = qs(".report-preview-body");
  if (!body) return;
  var stage = qs(".rc-preview-stage", body), card = qs(".report-card", body);
  if (!stage || !card) return;
  var w = card.offsetWidth, h = card.offsetHeight;
  var avail = body.clientWidth - 24;
  var k = Math.max(0.3, Math.min(1, avail / w));
  card.style.transform = "scale("+k+")";
  card.style.transformOrigin = "top left";
  stage.style.width = Math.round(w*k)+"px";
  stage.style.height = Math.round(h*k)+"px";
}
if (typeof window !== "undefined" && window.addEventListener){
  window.addEventListener("resize", scaleReportPreview);
  /* Ctrl+P / browser Print while a preview is open: print THAT card on one A4
     sheet instead of the whole app (previews and prints stay identical). */
  window.addEventListener("beforeprint", function(){
    var pa = el("print-area"), prev = qs(".report-preview-body .report-card");
    if (!pa || !prev) return;
    pa.innerHTML = prev.outerHTML;
    var c = pa.querySelector(".report-card");
    if (c){ c.style.removeProperty("transform"); c.style.removeProperty("transform-origin"); }
  });
}

function previewReport(studentId, classArmId){
  var templateId = selectedTemplateId();
  var html = generateReportCardHtml(studentId, classArmId, state.currentSessionId, state.currentTermId, templateId);
  openModal('<div class="modal-header"><h3>Report Preview <span class="muted small">A4 &middot; 1 page</span></h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
    '<div class="modal-body report-preview-body"><div class="rc-preview-stage">'+html+'</div></div>'+
    '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Close</button>'+
    '<button class="btn btn-primary" onclick="printReportsNow([\''+studentId+'\'],\''+classArmId+'\')">Print</button></div>', {wide:true});
  fitReportCards(el("modal-root"));
  scaleReportPreview();
}

function printBulkReports(classArmId){
  var ids = qsa(".report-check:checked").map(function(cb){return cb.value;});
  if (!ids.length){ toast("Select at least one student first.", "warn"); return; }
  printReportsNow(ids, classArmId);
}
function printWholeClass(classArmId){
  var ids = studentsInClassArm(classArmId).map(function(s){return s.id;});
  printReportsNow(ids, classArmId);
}
function printReportsNow(studentIds, classArmId){
  var templateId = selectedTemplateId();
  /* No separator <div>s between cards: the stylesheet starts each card after
     the first on a new page, so there is never a blank page before or after. */
  var html = studentIds.map(function(id){ return generateReportCardHtml(id, classArmId, state.currentSessionId, state.currentTermId, templateId); }).join("");
  var printArea = el("print-area");
  printArea.innerHTML = html;
  fitInPrintArea(printArea);
  addAudit(state, "Report card(s) printed", studentIds.length+" student(s) — "+classArmName(classArmId));
  scheduleSave();
  /* let logos/photos/signatures finish decoding so they print, then print */
  var imgs = Array.prototype.slice.call(printArea.querySelectorAll("img"));
  var waits = imgs.map(function(im){ return im.decode ? im.decode().catch(function(){}) : Promise.resolve(); });
  var go = function(){ window.print(); };
  var done = false; var once = function(){ if (done) return; done = true; go(); };
  Promise.all(waits).then(once, once);
  setTimeout(once, 1500);
}
