/* ==========================================================================
   10 - SCORE ENTRY (Subject Teacher)
   Score inputs update only their own row's total/grade cells directly in the
   DOM (no full re-render) so fast keyboard/tab entry never loses focus.
   ========================================================================== */

function renderScoreEntryView(){
  var user = state.currentUser;
  var sessionId = state.currentSessionId, termId = state.currentTermId;
  var vp = state.viewParams || {};
  var myAssigns = isWholeSchoolRole(user.role)
    ? state.teacherAssignments.filter(function(a){return a.active && a.sessionId===sessionId && a.termId===termId;})
    : state.teacherAssignments.filter(function(a){return a.active && a.teacherId===user.id && a.sessionId===sessionId && a.termId===termId;});

  if (!myAssigns.length){
    return '<div class="page-header"><h2>Score Entry</h2></div><div class="empty-state"><h3>No subject assignments for this term</h3><p>Ask your Admin to assign you to a subject and class first.</p></div>';
  }

  var subjectId = vp.subjectId || myAssigns[0].subjectId;
  var classArmId = vp.classArmId || myAssigns[0].classArmId;
  var validPair = myAssigns.some(function(a){return a.subjectId===subjectId && a.classArmId===classArmId;});
  if (!validPair){ subjectId = myAssigns[0].subjectId; classArmId = myAssigns[0].classArmId; }
  assertPermission(canEnterScores(user, subjectId, classArmId), "You are not assigned to this subject/class.");

  var pairOptions = myAssigns.map(function(a){
    var label = subjectName(a.subjectId)+" — "+classArmName(a.classArmId);
    var val = a.subjectId+"::"+a.classArmId;
    var selected = (a.subjectId===subjectId && a.classArmId===classArmId) ? ' selected' : '';
    return '<option value="'+val+'"'+selected+'>'+escapeHtml(label)+'</option>';
  }).join("");

  var classArm = byId(state.classArms, classArmId);
  var subject = byId(state.subjects, subjectId);
  var scheme = getAssessmentScheme(subject, classArm);
  var grading = getGradingScheme(subject, classArm);
  var students = studentsForSubject(subject, classArmId).sort(function(a,b){return a.name.localeCompare(b.name);});
  var statusKey = [classArmId, subjectId, sessionId, termId].join("::");
  var currentStatus = state.classSubjectStatus[statusKey] || "PENDING";
  var locked = ["PUBLISHED","LOCKED"].indexOf(currentStatus) > -1;

  var activeComponents = scheme.components.filter(function(c){return c.active;}).sort(function(a,b){return a.order-b.order;});
  var headerCols = activeComponents.map(function(c){ return '<th>'+escapeHtml(c.name)+'<div class="muted small">/'+c.maxScore+'</div></th>'; }).join("");

  var rows = students.map(function(stu){
    var rec = ensureScoreRecord(stu.id, subjectId, classArmId, sessionId, termId);
    var calc = computeSubjectTotal(rec, scheme);
    var band = calc.isComplete && !calc.hasAbsent && !calc.hasExcused ? gradeFor(calc.total, grading) : {grade:"-"};
    var attendanceState = rec.attendanceState || "";
    var disabled = locked ? "disabled" : "";
    var cellDisabled = (locked || attendanceState) ? "disabled" : "";

    var compCells = activeComponents.map(function(c){
      var v = rec.components[c.id];
      var displayVal = (v===undefined||v===null) ? "" : v;
      return '<td><input type="number" inputmode="decimal" min="0" max="'+c.maxScore+'" class="score-input" '+cellDisabled+
        ' value="'+escapeHtml(displayVal)+'" data-student="'+stu.id+'" data-component="'+c.id+'" onchange="handleScoreInput(this,\''+subjectId+'\',\''+classArmId+'\')"/></td>';
    }).join("");

    var totalDisplay = attendanceState ? '<span class="chip chip-warn">'+attendanceState+'</span>' : (calc.isComplete ? calc.total : '<span class="muted">incomplete</span>');
    var photoHtml = stu.photo ? '<img src="'+stu.photo+'" class="avatar-photo avatar-xs"/>' : '<div class="avatar-photo avatar-xs avatar-fallback">'+escapeHtml(stu.name[0])+'</div>';

    return '<tr id="row-'+stu.id+'">'+
      '<td class="sticky-col">'+photoHtml+' <span>'+escapeHtml(stu.name)+'</span></td>'+
      compCells+
      '<td id="total-'+stu.id+'"><strong>'+totalDisplay+'</strong></td>'+
      '<td id="grade-'+stu.id+'">'+band.grade+'</td>'+
      '<td><select class="field-input field-input-sm" '+disabled+' data-student="'+stu.id+'" onchange="handleAttendanceState(this,\''+subjectId+'\',\''+classArmId+'\')">'+
        '<option value="">Present</option>'+
        '<option value="ABSENT"'+(attendanceState==="ABSENT"?' selected':'')+'>Absent</option>'+
        '<option value="EXCUSED"'+(attendanceState==="EXCUSED"?' selected':'')+'>Excused</option>'+
      '</select></td>'+
    '</tr>';
  }).join("");

  var incompleteCount = students.filter(function(stu){
    var rec = getScoreRecord(stu.id, subjectId, classArmId, sessionId, termId);
    var calc = computeSubjectTotal(rec, scheme);
    return !calc.isComplete;
  }).length;

  return ''+
  '<div class="page-header page-header-row">'+
    '<div><h2>Score Entry</h2><p>'+escapeHtml(sessionName(sessionId))+' &middot; '+escapeHtml(termName(termId))+'</p></div>'+
    '<span class="status-badge status-'+currentStatus.toLowerCase()+'" style="align-self:flex-start">'+statusLabel(currentStatus)+'</span>'+
  '</div>'+
  '<div class="filter-bar">'+
    '<select onchange="switchScorePair(this.value)">'+pairOptions+'</select>'+
    '<span class="chip'+(incompleteCount>0?' chip-warn':' chip-good')+'" id="incomplete-chip">'+(incompleteCount>0 ? incompleteCount+' student(s) incomplete' : 'All scores complete')+'</span>'+
  '</div>'+
  '<div class="card">'+
    '<div class="table-wrap score-table-wrap"><table class="data-table score-table"><thead><tr><th class="sticky-col">Student</th>'+headerCols+'<th>Total</th><th>Grade</th><th>Attendance</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="card-footer">'+
      '<span class="muted small" id="save-indicator">All changes saved</span>'+
      (locked ? '<span class="chip">Locked for editing — status: '+statusLabel(currentStatus)+'</span>' :
        '<button class="btn btn-primary" onclick="submitSubjectResults(\''+subjectId+'\',\''+classArmId+'\')">Submit to Form Teacher</button>')+
    '</div>'+
  '</div>';
}

function switchScorePair(value){
  var parts = value.split("::");
  goto("score-entry", { subjectId: parts[0], classArmId: parts[1] });
}

/* Recomputes and patches just one student's total/grade cells + the
   incomplete-count chip, so entering scores never re-renders the whole
   table (keeps focus, keeps scroll position, works well for fast entry). */
function refreshScoreRow(studentId, subjectId, classArmId){
  var classArm = byId(state.classArms, classArmId);
  var subject = byId(state.subjects, subjectId);
  var scheme = getAssessmentScheme(subject, classArm);
  var grading = getGradingScheme(subject, classArm);
  var rec = getScoreRecord(studentId, subjectId, classArmId, state.currentSessionId, state.currentTermId);
  var calc = computeSubjectTotal(rec, scheme);
  var band = calc.isComplete && !calc.hasAbsent && !calc.hasExcused ? gradeFor(calc.total, grading) : {grade:"-"};
  var attendanceState = rec.attendanceState || "";
  var totalDisplay = attendanceState ? '<span class="chip chip-warn">'+attendanceState+'</span>' : (calc.isComplete ? calc.total : '<span class="muted">incomplete</span>');
  var totalCell = el("total-"+studentId), gradeCell = el("grade-"+studentId);
  if (totalCell) totalCell.innerHTML = "<strong>"+totalDisplay+"</strong>";
  if (gradeCell) gradeCell.textContent = band.grade;

  var students = studentsForSubject(subject, classArmId);
  var incompleteCount = students.filter(function(stu){
    var r = getScoreRecord(stu.id, subjectId, classArmId, state.currentSessionId, state.currentTermId);
    return !computeSubjectTotal(r, scheme).isComplete;
  }).length;
  var chip = el("incomplete-chip");
  if (chip){
    chip.textContent = incompleteCount>0 ? incompleteCount+" student(s) incomplete" : "All scores complete";
    chip.className = "chip" + (incompleteCount>0 ? " chip-warn" : " chip-good");
  }
}

function handleScoreInput(input, subjectId, classArmId){
  var studentId = input.dataset.student, componentId = input.dataset.component;
  var rec = ensureScoreRecord(studentId, subjectId, classArmId, state.currentSessionId, state.currentTermId);
  var raw = input.value;
  var max = Number(input.max);
  if (raw === ""){ delete rec.components[componentId]; }
  else {
    var num = Number(raw);
    if (isNaN(num) || num < 0 || num > max){ toast("Score must be between 0 and "+max+".", "error"); input.value = rec.components[componentId] !== undefined ? rec.components[componentId] : ""; return; }
    rec.components[componentId] = num;
  }
  rec.updatedAt = Date.now();
  var indicator = el("save-indicator");
  if (indicator) indicator.textContent = "Saving…";
  refreshScoreRow(studentId, subjectId, classArmId);
  scheduleSave();
  setTimeout(function(){ var ind = el("save-indicator"); if (ind) ind.textContent = "All changes saved"; }, 300);
}

function handleAttendanceState(select, subjectId, classArmId){
  var studentId = select.dataset.student;
  var rec = ensureScoreRecord(studentId, subjectId, classArmId, state.currentSessionId, state.currentTermId);
  rec.attendanceState = select.value || null;
  scheduleSave(); renderApp();
}

function submitSubjectResults(subjectId, classArmId){
  var user = state.currentUser;
  assertPermission(canEnterScores(user, subjectId, classArmId), "You are not assigned to this subject/class.");
  var classArm = byId(state.classArms, classArmId);
  var subject = byId(state.subjects, subjectId);
  var scheme = getAssessmentScheme(subject, classArm);
  var students = studentsForSubject(subject, classArmId);
  var incomplete = students.filter(function(stu){
    var rec = getScoreRecord(stu.id, subjectId, classArmId, state.currentSessionId, state.currentTermId);
    return !computeSubjectTotal(rec, scheme).isComplete;
  });
  if (incomplete.length){
    if (!window.confirm(incomplete.length+" student(s) still have incomplete scores. Submit anyway? (You can still edit until the Form Teacher returns it.)")) return;
  }
  var key = [classArmId, subjectId, state.currentSessionId, state.currentTermId].join("::");
  state.classSubjectStatus[key] = "SUBMITTED";
  addAudit(state, "Result submitted", subject.name+" / "+classArm.name);
  toast("Submitted to Form Teacher for review.");
  scheduleSave(); renderApp();
}
