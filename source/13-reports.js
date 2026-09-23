/* ==========================================================================
   13 - REPORT CARDS: generation, preview, print
   Redesigned to match a traditional Nigerian terminal-report layout: bordered
   frame, watermark crest, per-subject CA/Exam/Total/Grade/Class-Avg/Position/
   Remark columns, a 5-4-3-2-1 Skills/Behaviours rating grid, fee box, and
   signatures. Ten selectable visual themes (colors/fonts/borders) live in
   styles.css as .rc-theme-* classes - see Settings -> Report Templates.
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

/* Renders the Skills/Behaviours rating grid in the classic 5-4-3-2-1 style:
   one row per domain, a checkmark under whichever column matches the
   student's current rating (rating labels map to columns by their position
   in state.ratingLevels: first label = 5, ... last label = 1). */
function domainGridHtml(title, domains, ratings){
  var levels = state.ratingLevels;
  var headerCols = [5,4,3,2,1].map(function(v){ return '<th>'+v+'</th>'; }).join("");
  var rows = domains.filter(function(d){return d.active;}).map(function(d, i){
    var label = ratings ? ratings[d.id] : null;
    var idx = label ? levels.indexOf(label) : -1;
    var ratingValue = idx > -1 ? (levels.length - idx) : null;
    var cells = [5,4,3,2,1].map(function(v){
      return '<td>'+(ratingValue===v ? '&#10003;' : '')+'</td>';
    }).join("");
    return '<tr><td>'+(i+1)+'. '+escapeHtml(d.name)+'</td>'+cells+'</tr>';
  }).join("");
  if (!rows) return "";
  return '<div class="rc-domain-block"><h4>'+escapeHtml(title)+'</h4>'+
    '<table class="rc-domain-table"><thead><tr><th></th>'+headerCols+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
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

  var scheme = getAssessmentScheme(null, classArm);
  var componentNames = scheme ? scheme.components.filter(function(c){return c.active;}).sort(function(a,b){return a.order-b.order;}).map(function(c){return c.name;}) : [];
  var compHeaderCols = componentNames.map(function(n){ return '<th>'+escapeHtml(n)+'</th>'; }).join("");

  var subjectRows = overall.subjectRows.map(function(r){
    var display = r.calc.hasAbsent ? "ABS" : r.calc.hasExcused ? "EXC" : (r.calc.isComplete ? r.calc.total : "—");
    var subjScheme = getAssessmentScheme(r.subject, classArm);
    var rec = getScoreRecord(studentId, r.subject.id, classArmId, sessionId, termId);
    var compCells = (subjScheme ? subjScheme.components.filter(function(c){return c.active;}).sort(function(a,b){return a.order-b.order;}) : []).map(function(c){
      var v = rec ? rec.components[c.id] : undefined;
      return '<td>'+((v===undefined||v===null)?"—":v)+'</td>';
    }).join("");
    var stat = getSubjectStatForStudent(classArmId, r.subject.id, sessionId, termId, studentId);
    return '<tr><td class="rc-subject-name">'+escapeHtml(r.subject.name)+'</td>'+compCells+
      '<td><strong>'+display+'</strong></td><td>'+r.grade+'</td>'+
      '<td>'+(stat.classAverage!==null?stat.classAverage:"—")+'</td>'+
      '<td>'+(stat.position?ordinal(stat.position):"—")+'</td>'+
      '<td>'+escapeHtml(r.remark||"")+'</td></tr>';
  }).join("");

  var gradingLegend = grading ? grading.bands.map(function(b){return '<span class="legend-chip">'+escapeHtml(b.grade)+': '+b.min+'-'+b.max+' ('+escapeHtml(b.remark)+')</span>';}).join(" ") : "";

  var domainsHtml = template.showAffective ? '<div class="rc-two-col">'+
      domainGridHtml("Skills", state.psychomotorDomains, domScores.psychomotor)+
      domainGridHtml("Behaviours", state.affectiveDomains, domScores.affective)+
    '</div>' : '';

  var photoHtml = stu.photo ? '<img src="'+stu.photo+'" class="rc-photo"/>' : '<div class="rc-photo rc-photo-fallback">'+escapeHtml(stu.name[0])+'</div>';
  var logoHtml = state.school.logo ? '<img src="'+state.school.logo+'" class="rc-logo"/>' : '<div class="rc-logo rc-logo-fallback">'+escapeHtml((state.school.name||"L")[0])+'</div>';
  var themeClass = "rc-theme-" + (template.style || "classic-navy");

  var totalFees = (Number(comments.nextFees)||0) + (Number(comments.examFee)||0);

  return ''+
  '<div class="report-card '+themeClass+'">'+
    '<div class="rc-watermark">'+(state.school.logo ? '<img src="'+state.school.logo+'"/>' : '')+'</div>'+
    '<div class="rc-frame">'+
      '<div class="rc-header">'+logoHtml+
        '<div class="rc-school-info"><h1>'+escapeHtml(state.school.name)+'</h1>'+
        '<p>'+escapeHtml(state.school.address)+'</p>'+
        (state.school.phone?'<p>Tel: '+escapeHtml(state.school.phone)+'</p>':'')+
        '<p class="rc-motto">Motto: '+escapeHtml(state.school.motto||"")+'</p></div>'+
        (template.showPhoto ? photoHtml : '')+
      '</div>'+
      '<div class="rc-title">TERMINAL REPORT — '+escapeHtml(template.name)+'</div>'+
      '<div class="rc-info-grid">'+
        '<div><span>Name</span><strong>'+escapeHtml(stu.name)+'</strong></div>'+
        '<div><span>Sex</span><strong>'+escapeHtml(stu.gender||"—")+'</strong></div>'+
        '<div><span>Age</span><strong>'+(calcAge(stu.dob)||"—")+'</strong></div>'+
        '<div><span>Class</span><strong>'+escapeHtml(classArm.name)+'</strong></div>'+
        '<div><span>No. in Class</span><strong>'+classOv.students.length+'</strong></div>'+
        '<div><span>Term</span><strong>'+escapeHtml(termName(termId))+'</strong></div>'+
        '<div><span>Session</span><strong>'+escapeHtml(sessionName(sessionId))+'</strong></div>'+
        '<div><span>Next Term Begins</span><strong>'+escapeHtml((term&&term.nextTermStartDate)||"—")+'</strong></div>'+
        '<div><span>Average</span><strong>'+(overall.average!==null?overall.average+"%":"—")+'</strong></div>'+
        '<div><span>Position</span><strong>'+(myPosRow&&myPosRow.position?ordinal(myPosRow.position):"—")+' of '+classOv.students.length+'</strong></div>'+
      '</div>'+
      '<div class="table-wrap"><table class="rc-subject-table"><thead><tr><th>Subject</th>'+compHeaderCols+'<th>Total</th><th>Grade</th><th>Class Avg</th><th>Position</th><th>Remark</th></tr></thead><tbody>'+subjectRows+'</tbody></table></div>'+
      '<div class="rc-legend">'+gradingLegend+'</div>'+
      domainsHtml+
      (template.showAttendance ? '<div class="rc-attendance">Class Attendance: <strong>'+(attendance.present!==undefined?attendance.present:"—")+'</strong> / <strong>'+(attendance.totalDays!==undefined?attendance.totalDays:"—")+'</strong> days present'+(attendance.late?' &middot; Late: '+attendance.late:'')+'</div>' : '')+
      '<div class="rc-comments">'+
        '<div><span>Form Teacher\'s Comment</span><p>'+escapeHtml(comments.formTeacherComment||"—")+'</p></div>'+
        '<div><span>Principal\'s Comment</span><p>'+escapeHtml(comments.principalComment||"—")+'</p></div>'+
      '</div>'+
      (template.showFees ? '<div class="rc-fees"><span>School Fee: '+formatNaira(comments.nextFees||0)+'</span><span>Exam Fee: '+formatNaira(comments.examFee||0)+'</span><span>Total: '+formatNaira(totalFees)+'</span></div>' : '')+
      '<div class="rc-signatures">'+
        '<div>'+(formTeacherSig&&formTeacherSig.image?'<img src="'+formTeacherSig.image+'" class="sig-img"/>':'<div class="sig-line"></div>')+'<span>Form Teacher\'s Signature</span></div>'+
        '<div>'+(principalSig&&principalSig.image?'<img src="'+principalSig.image+'" class="sig-img"/>':'<div class="sig-line"></div>')+'<span>Principal\'s Signature</span></div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function ordinal(n){
  var s = ["th","st","nd","rd"], v = n%100;
  return n + (s[(v-20)%10]||s[v]||s[0]);
}

function previewReport(studentId, classArmId){
  var templateId = selectedTemplateId();
  var html = generateReportCardHtml(studentId, classArmId, state.currentSessionId, state.currentTermId, templateId);
  openModal('<div class="modal-header"><h3>Report Preview</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
    '<div class="modal-body report-preview-body">'+html+'</div>'+
    '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Close</button>'+
    '<button class="btn btn-primary" onclick="printReportsNow([\''+studentId+'\'],\''+classArmId+'\')">Print</button></div>', {wide:true});
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
  var html = studentIds.map(function(id){ return generateReportCardHtml(id, classArmId, state.currentSessionId, state.currentTermId, templateId); }).join('<div class="rc-page-break"></div>');
  var printArea = el("print-area");
  printArea.innerHTML = html;
  addAudit(state, "Report card(s) printed", studentIds.length+" student(s) — "+classArmName(classArmId));
  scheduleSave();
  setTimeout(function(){ window.print(); }, 50);
}
