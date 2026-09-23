/* ==========================================================================
   11 - FORM TEACHER CLASS REVIEW
   ========================================================================== */

function renderFormReviewView(){
  var user = state.currentUser;
  var vp = state.viewParams || {};
  var myClasses = isWholeSchoolRole(user.role) ? state.classArms.filter(function(c){return c.active;}) :
    myFormClassArmIds(user.id).map(function(id){return byId(state.classArms,id);}).filter(Boolean);

  if (!myClasses.length){
    return '<div class="page-header"><h2>Class Review</h2></div><div class="empty-state"><h3>No class assigned</h3><p>You are not currently assigned as a Form Teacher for any class.</p></div>';
  }
  var classArmId = vp.classArmId && myClasses.some(function(c){return c.id===vp.classArmId;}) ? vp.classArmId : myClasses[0].id;
  assertPermission(isFormTeacherOf(user, classArmId) || isWholeSchoolRole(user.role), "You can only review your assigned class.");

  var sessionId = state.currentSessionId, termId = state.currentTermId;
  var classOptions = myClasses.map(function(c){return '<option value="'+c.id+'"'+(c.id===classArmId?' selected':'')+'>'+escapeHtml(c.name)+'</option>';}).join("");
  var ov = computeClassOverview(classArmId, sessionId, termId);

  var approvalKey = [classArmId, sessionId, termId].join("::");
  var approval = state.classApproval[approvalKey] || { status: "IN_PROGRESS" };

  var subjectRows = ov.subjectStatuses.map(function(s){
    var canAct = (s.status==="SUBMITTED") && (isFormTeacherOf(user, classArmId) || isWholeSchoolRole(user.role));
    return '<tr><td>'+escapeHtml(s.subject.name)+'</td><td>'+escapeHtml(s.teacherId?userName(s.teacherId):"Unassigned")+'</td>'+
      '<td>'+s.entered+' / '+s.totalStudents+'</td>'+
      '<td><span class="status-badge status-'+s.status.toLowerCase()+'">'+statusLabel(s.status)+'</span></td>'+
      '<td class="actions-cell">'+(canAct ? '<button class="btn btn-sm btn-secondary" onclick="returnSubjectForCorrection(\''+classArmId+'\',\''+s.subject.id+'\')">Return</button>'+
        '<button class="btn btn-sm btn-primary" onclick="approveSubjectResult(\''+classArmId+'\',\''+s.subject.id+'\')">Approve</button>' : '')+'</td></tr>';
  }).join("");

  var unassignedSubjects = ov.subjectStatuses.filter(function(s){return s.status==="UNASSIGNED";});
  var actionable = ov.subjectStatuses.filter(function(s){return s.status!=="UNASSIGNED";});
  var allSubjectsApproved = actionable.length>0 && actionable.every(function(s){return s.status==="APPROVED" || s.status==="ADMIN_REVIEW" || s.status==="PUBLISHED" || s.status==="LOCKED";});
  var canApproveClass = allSubjectsApproved && approval.status!=="FORM_APPROVED" && approval.status!=="PUBLISHED" && approval.status!=="LOCKED" && (isFormTeacherOf(user, classArmId) || isWholeSchoolRole(user.role));

  var studentRows = ov.students.map(function(row){
    var stu = row.student;
    var commentKey = [stu.id, sessionId, termId].join("::");
    var c = state.studentComments[commentKey] || {};
    var photoHtml = stu.photo ? '<img src="'+stu.photo+'" class="avatar-photo avatar-xs"/>' : '<div class="avatar-photo avatar-xs avatar-fallback">'+escapeHtml(stu.name[0])+'</div>';
    return '<tr>'+
      '<td class="sticky-col">'+photoHtml+' '+escapeHtml(stu.name)+'</td>'+
      '<td>'+(row.overall.average!==null?row.overall.average:'<span class="muted">—</span>')+'</td>'+
      '<td>'+(row.position||'—')+'</td>'+
      '<td><button class="btn btn-sm btn-ghost" onclick="openCommentEditor(\''+stu.id+'\')">'+(c.formTeacherComment?'Edit Comment':'Add Comment')+'</button></td>'+
      '<td><button class="btn btn-sm btn-ghost" onclick="openFeesEditor(\''+stu.id+'\')">'+(c.nextFees||c.examFee?'Edit Fees':'Set Fees')+'</button></td>'+
      '<td><button class="btn btn-sm btn-ghost" onclick="openDomainEditor(\''+stu.id+'\')">Skills/Behaviour</button></td>'+
      '<td><button class="btn btn-sm btn-ghost" onclick="viewStudentProfile(\''+stu.id+'\')">View</button></td>'+
    '</tr>';
  }).join("");

  return ''+
  '<div class="page-header page-header-row"><div><h2>Class Review</h2><p>'+escapeHtml(sessionName(sessionId))+' &middot; '+escapeHtml(termName(termId))+'</p></div>'+
    '<select onchange="goto(\'form-review\',{classArmId:this.value})">'+classOptions+'</select></div>'+
  '<div class="stat-grid stat-grid-compact">'+
    statCard("Students", ov.students.length)+
    statCard("Class Average", ov.classAverage!==null?ov.classAverage+"%":"—")+
    statCard("Class Status", statusLabel(approval.status), approval.status==="FORM_APPROVED"?"good":"warn")+
  '</div>'+
  '<div class="card">'+
    '<div class="card-header"><h3>Subject Submission Status</h3></div>'+
    (unassignedSubjects.length ? '<div class="banner banner-warn">'+unassignedSubjects.length+' subject(s) have no teacher assigned yet: '+unassignedSubjects.map(function(s){return escapeHtml(s.subject.name);}).join(", ")+'. Ask Admin to assign a teacher.</div>' : '')+
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>Subject</th><th>Teacher</th><th>Entered</th><th>Status</th><th></th></tr></thead><tbody>'+subjectRows+'</tbody></table></div>'+
  '</div>'+
  '<div class="card">'+
    '<div class="card-header"><h3>Students — Comments, Fees &amp; Ratings</h3></div>'+
    '<div class="table-wrap"><table class="data-table"><thead><tr><th class="sticky-col">Student</th><th>Average</th><th>Position</th><th>Comment</th><th>Fees</th><th>Skills/Behaviour</th><th></th></tr></thead><tbody>'+studentRows+'</tbody></table></div>'+
    '<div class="card-footer">'+
      (canApproveClass ? '<button class="btn btn-primary" onclick="approveClass(\''+classArmId+'\')">Approve Class &amp; Send to Admin/Principal</button>' :
        '<span class="muted small">'+(approval.status==="FORM_APPROVED"||approval.status==="PUBLISHED"||approval.status==="LOCKED" ? "Class already approved." : "Approve every subject above before approving the class.")+'</span>')+
    '</div>'+
  '</div>';
}

function returnSubjectForCorrection(classArmId, subjectId){
  var reason = window.prompt("Reason for returning this subject for correction (optional):", "");
  var key = [classArmId, subjectId, state.currentSessionId, state.currentTermId].join("::");
  state.classSubjectStatus[key] = "RETURNED";
  addAudit(state, "Result returned for correction", subjectName(subjectId)+" / "+classArmName(classArmId)+(reason?(" — "+reason):""));
  toast("Returned to subject teacher for correction.");
  scheduleSave(); renderApp();
}
function approveSubjectResult(classArmId, subjectId){
  var key = [classArmId, subjectId, state.currentSessionId, state.currentTermId].join("::");
  state.classSubjectStatus[key] = "APPROVED";
  addAudit(state, "Subject result approved", subjectName(subjectId)+" / "+classArmName(classArmId));
  toast("Subject approved.");
  scheduleSave(); renderApp();
}
function approveClass(classArmId){
  var key = [classArmId, state.currentSessionId, state.currentTermId].join("::");
  state.classApproval[key] = { status:"FORM_APPROVED", reviewedBy: state.currentUser.id, reviewedAt: Date.now() };
  // move all approved subjects into ADMIN_REVIEW so principal/admin queue picks them up
  subjectsForClassArm(byId(state.classArms, classArmId)).forEach(function(su){
    var k = [classArmId, su.id, state.currentSessionId, state.currentTermId].join("::");
    if (state.classSubjectStatus[k]==="APPROVED") state.classSubjectStatus[k] = "ADMIN_REVIEW";
  });
  addAudit(state, "Class approved by Form Teacher", classArmName(classArmId));
  toast("Class sent to Admin/Principal for final approval.");
  scheduleSave(); renderApp();
}

/* ---------- comment editor ---------- */
function openCommentEditor(studentId){
  var key = [studentId, state.currentSessionId, state.currentTermId].join("::");
  var existing = state.studentComments[key] || {};
  var stu = byId(state.students, studentId);
  var libraryOptions = '<option value="">— Choose predefined comment —</option>' + state.commentTemplates.filter(function(c){return c.active;}).map(function(c){
    return '<option value="'+c.id+'">'+escapeHtml(c.text)+'</option>';
  }).join("");
  var isPrincipal = state.currentUser.role==="PRINCIPAL" || state.currentUser.role==="ADMIN" || state.currentUser.role==="SUPER_ADMIN";

  var html = ''+
  '<div class="modal-header"><h3>Comment — '+escapeHtml(stu.name)+'</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    '<label class="field-label">Form Teacher Comment</label>'+
    '<select class="field-input" id="ft-comment-select" onchange="el(\'ft-comment-text\').value=this.options[this.selectedIndex].text==this.options[0].text?el(\'ft-comment-text\').value:this.options[this.selectedIndex].dataset.text||this.value">'+libraryOptions+'</select>'+
    '<textarea class="field-input" id="ft-comment-text" rows="3" style="margin-top:8px" placeholder="Write or edit the comment...">'+escapeHtml(existing.formTeacherComment||"")+'</textarea>'+
    (isPrincipal ? '<label class="field-label" style="margin-top:14px">Principal\'s Comment</label>'+
      '<textarea class="field-input" id="principal-comment-text" rows="3" placeholder="Principal\'s remark...">'+escapeHtml(existing.principalComment||"")+'</textarea>' : '')+
  '</div>'+
  '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveComment(\''+studentId+'\')">Save</button></div>';
  openModal(html);
  // populate select->text properly (simpler binding after render)
  el("ft-comment-select").onchange = function(){
    var opt = this.options[this.selectedIndex];
    if (opt.value) el("ft-comment-text").value = opt.textContent;
  };
}
function saveComment(studentId){
  var key = [studentId, state.currentSessionId, state.currentTermId].join("::");
  var existing = state.studentComments[key] || {};
  existing.formTeacherComment = el("ft-comment-text").value.trim();
  var pc = el("principal-comment-text");
  if (pc) existing.principalComment = pc.value.trim();
  state.studentComments[key] = existing;
  addAudit(state, "Comment updated", byId(state.students,studentId).name);
  toast("Comment saved.");
  closeModal(); scheduleSave(); renderApp();
}

/* ---------- fees editor ---------- */
function openFeesEditor(studentId){
  var key = [studentId, state.currentSessionId, state.currentTermId].join("::");
  var existing = state.studentComments[key] || {};
  var stu = byId(state.students, studentId);
  var html = ''+
  '<div class="modal-header"><h3>Next Term Fees — '+escapeHtml(stu.name)+'</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    '<label class="field-label">Next Term School Fees (₦)</label><input class="field-input" type="number" min="0" id="fee-school" value="'+(existing.nextFees||"")+'"/>'+
    '<label class="field-label" style="margin-top:12px">Next Examination Fee (₦)</label><input class="field-input" type="number" min="0" id="fee-exam" value="'+(existing.examFee||"")+'"/>'+
  '</div>'+
  '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveFees(\''+studentId+'\')">Save</button></div>';
  openModal(html);
}
function saveFees(studentId){
  var key = [studentId, state.currentSessionId, state.currentTermId].join("::");
  var existing = state.studentComments[key] || {};
  existing.nextFees = Number(el("fee-school").value)||0;
  existing.examFee = Number(el("fee-exam").value)||0;
  state.studentComments[key] = existing;
  addAudit(state, "Fees updated", byId(state.students,studentId).name);
  toast("Fees saved.");
  closeModal(); scheduleSave(); renderApp();
}

/* ---------- skills / behaviour (affective + psychomotor) rating editor ---------- */
function ratingSelectHtml(inputId, currentLabel){
  var options = '<option value="">Not rated</option>' + state.ratingLevels.map(function(lvl){
    return '<option value="'+escapeHtml(lvl)+'"'+(currentLabel===lvl?' selected':'')+'>'+escapeHtml(lvl)+'</option>';
  }).join("");
  return '<select class="field-input field-input-sm" id="'+inputId+'">'+options+'</select>';
}
function openDomainEditor(studentId){
  var stu = byId(state.students, studentId);
  var key = [studentId, state.currentSessionId, state.currentTermId].join("::");
  var existing = state.domainScores[key] || { affective:{}, psychomotor:{} };

  var affectiveRows = state.affectiveDomains.filter(function(d){return d.active;}).map(function(d){
    return '<div class="form-grid" style="grid-template-columns:1fr 1fr;align-items:center;margin-bottom:6px">'+
      '<label class="field-label" style="margin:0">'+escapeHtml(d.name)+'</label>'+
      ratingSelectHtml("aff-"+d.id, existing.affective[d.id])+
    '</div>';
  }).join("");
  var psychoRows = state.psychomotorDomains.filter(function(d){return d.active;}).map(function(d){
    return '<div class="form-grid" style="grid-template-columns:1fr 1fr;align-items:center;margin-bottom:6px">'+
      '<label class="field-label" style="margin:0">'+escapeHtml(d.name)+'</label>'+
      ratingSelectHtml("psy-"+d.id, existing.psychomotor[d.id])+
    '</div>';
  }).join("");

  if (!affectiveRows && !psychoRows){
    openModal('<div class="modal-header"><h3>Skills/Behaviour</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
      '<div class="modal-body"><div class="empty-state"><h3>No domains configured</h3><p>Ask Admin to add Affective/Psychomotor domains in Settings first.</p></div></div>'+
      '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>');
    return;
  }

  var html = ''+
  '<div class="modal-header"><h3>Skills/Behaviour — '+escapeHtml(stu.name)+'</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    (psychoRows ? '<h4 class="section-title" style="margin-top:0">Skills (Psychomotor)</h4>'+psychoRows : '')+
    (affectiveRows ? '<h4 class="section-title">Behaviours (Affective)</h4>'+affectiveRows : '')+
  '</div>'+
  '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveDomainScores(\''+studentId+'\')">Save</button></div>';
  openModal(html, {wide:true});
}
function saveDomainScores(studentId){
  var key = [studentId, state.currentSessionId, state.currentTermId].join("::");
  var existing = state.domainScores[key] || { affective:{}, psychomotor:{} };
  state.affectiveDomains.filter(function(d){return d.active;}).forEach(function(d){
    var v = el("aff-"+d.id).value;
    if (v) existing.affective[d.id] = v; else delete existing.affective[d.id];
  });
  state.psychomotorDomains.filter(function(d){return d.active;}).forEach(function(d){
    var v = el("psy-"+d.id).value;
    if (v) existing.psychomotor[d.id] = v; else delete existing.psychomotor[d.id];
  });
  state.domainScores[key] = existing;
  addAudit(state, "Skills/behaviour ratings updated", byId(state.students,studentId).name);
  toast("Ratings saved.");
  closeModal(); scheduleSave(); renderApp();
}
