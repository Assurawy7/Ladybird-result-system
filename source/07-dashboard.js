/* ==========================================================================
   07 - DASHBOARDS (role-specific)
   ========================================================================== */

function statCard(label, value, tone){
  return '<div class="stat-card'+(tone?(' tone-'+tone):'')+'"><div class="stat-value">'+value+'</div><div class="stat-label">'+label+'</div></div>';
}

function renderDashboard(){
  var user = state.currentUser;
  if (isWholeSchoolRole(user.role)) return renderAdminDashboard();
  return renderTeacherDashboard();
}

function renderAdminDashboard(){
  var user = state.currentUser;
  var sessionId = state.currentSessionId, termId = state.currentTermId;
  var totalStudents = state.students.filter(function(s){return s.status==="Active"||s.status==="Repeated";}).length;
  var totalTeachers = state.users.filter(function(u){return u.role==="TEACHER" && u.active;}).length;
  var totalClasses = state.classArms.filter(function(c){return c.active;}).length;

  var allKeys = [];
  state.classArms.forEach(function(ca){
    subjectsForClassArm(ca).forEach(function(su){
      allKeys.push([ca.id, su.id, sessionId, termId].join("::"));
    });
  });
  var submitted=0, approved=0, published=0, pending=0;
  allKeys.forEach(function(k){
    var st = state.classSubjectStatus[k] || "PENDING";
    if (st==="PENDING") pending++;
    else if (st==="SUBMITTED") submitted++;
    else if (st==="APPROVED" || st==="ADMIN_REVIEW") approved++;
    else if (st==="PUBLISHED") published++;
  });

  var gradeDist = {};
  state.classArms.forEach(function(ca){
    subjectsForClassArm(ca).forEach(function(su){
      var res = computeSubjectClassResults(ca.id, su.id, sessionId, termId);
      res.rows.forEach(function(r){
        if (r.grade && r.grade!=="-"){ gradeDist[r.grade] = (gradeDist[r.grade]||0)+1; }
      });
    });
  });
  var gradeBars = Object.keys(gradeDist).sort().map(function(g){
    var max = Math.max.apply(null, Object.values(gradeDist).concat([1]));
    var pct = Math.round((gradeDist[g]/max)*100);
    return '<div class="bar-row"><span class="bar-label">'+g+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div><span class="bar-value">'+gradeDist[g]+'</span></div>';
  }).join("") || '<div class="empty-inline">No scores entered yet this term.</div>';

  var classArmRows = state.classArms.filter(function(c){return c.active;}).map(function(ca){
    var ov = computeClassOverview(ca.id, sessionId, termId);
    var doneSubjects = ov.subjectStatuses.filter(function(s){return s.status!=="PENDING";}).length;
    return '<tr>'+
      '<td>'+escapeHtml(ca.name)+' <span class="muted">('+sectionName(ca.sectionId)+')</span></td>'+
      '<td>'+ov.students.length+'</td>'+
      '<td>'+doneSubjects+' / '+ov.subjectStatuses.length+' subjects</td>'+
      '<td>'+(ov.classAverage!==null ? ov.classAverage+'%' : '<span class="muted">—</span>')+'</td>'+
      '<td><button class="btn btn-sm btn-ghost" data-action="goto" data-view="form-review" data-id="'+ca.id+'" onclick="event.stopPropagation();openClassReview(\''+ca.id+'\')">Review</button></td>'+
    '</tr>';
  }).join("");

  return ''+
  '<div class="page-header"><h2>Welcome back, '+escapeHtml(user.name.split(" ")[0])+'</h2><p>'+ROLE_LABELS[user.role]+' &middot; '+escapeHtml(sessionName(sessionId))+' &middot; '+escapeHtml(termName(termId))+'</p></div>'+
  '<div class="stat-grid">'+
    statCard("Total Students", totalStudents)+
    statCard("Total Teachers", totalTeachers)+
    statCard("Classes", totalClasses)+
    statCard("Pending Subjects", pending, pending>0?"warn":"")+
    statCard("Submitted", submitted, "info")+
    statCard("Approved", approved, "info")+
    statCard("Published", published, "good")+
  '</div>'+
  '<div class="grid-2">'+
    '<div class="card">'+
      '<div class="card-header"><h3>Class Result Completion</h3></div>'+
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Class</th><th>Students</th><th>Subjects Done</th><th>Class Avg</th><th></th></tr></thead><tbody>'+classArmRows+'</tbody></table></div>'+
    '</div>'+
    '<div class="card">'+
      '<div class="card-header"><h3>Grade Distribution (this term)</h3></div>'+
      '<div class="bar-chart">'+gradeBars+'</div>'+
    '</div>'+
  '</div>';
}

function renderTeacherDashboard(){
  var user = state.currentUser;
  var sessionId = state.currentSessionId, termId = state.currentTermId;
  var formClasses = myFormClassArmIds(user.id).map(function(id){ return byId(state.classArms, id); }).filter(Boolean);
  var subjectAssigns = mySubjectAssignments(user.id).filter(function(a){ return a.sessionId===sessionId && a.termId===termId; });

  var formCards = formClasses.map(function(ca){
    var ov = computeClassOverview(ca.id, sessionId, termId);
    var pendingSubjects = ov.subjectStatuses.filter(function(s){return s.status==="PENDING";}).length;
    return '<div class="card">'+
      '<div class="card-header"><h3>'+escapeHtml(ca.name)+' &middot; My Class</h3>'+
        '<button class="btn btn-sm btn-primary" data-action="goto" data-view="form-review" onclick="setFormReviewClass(\''+ca.id+'\')">Open Review</button></div>'+
      '<div class="stat-grid stat-grid-compact">'+
        statCard("Students", ov.students.length)+
        statCard("Class Average", ov.classAverage!==null?ov.classAverage+"%":"—")+
        statCard("Pending Subjects", pendingSubjects, pendingSubjects>0?"warn":"good")+
      '</div>'+
    '</div>';
  }).join("");

  var subjectRows = subjectAssigns.map(function(a){
    var ca = byId(state.classArms, a.classArmId);
    var su = byId(state.subjects, a.subjectId);
    var students = studentsInClassArm(a.classArmId);
    var entered = students.filter(function(stu){
      var rec = getScoreRecord(stu.id, a.subjectId, a.classArmId, sessionId, termId);
      return rec && Object.keys(rec.components).length>0;
    }).length;
    var key = [a.classArmId, a.subjectId, sessionId, termId].join("::");
    var status = state.classSubjectStatus[key] || "PENDING";
    return '<tr>'+
      '<td>'+escapeHtml(su.name)+'</td><td>'+escapeHtml(ca.name)+'</td>'+
      '<td>'+entered+' / '+students.length+'</td>'+
      '<td><span class="status-badge status-'+status.toLowerCase()+'">'+statusLabel(status)+'</span></td>'+
      '<td><button class="btn btn-sm btn-primary" onclick="openScoreEntry(\''+a.subjectId+'\',\''+a.classArmId+'\')">Enter Scores</button></td>'+
    '</tr>';
  }).join("");

  return ''+
  '<div class="page-header"><h2>Welcome back, '+escapeHtml(user.name.split(" ")[0])+'</h2><p>'+escapeHtml(sessionName(sessionId))+' &middot; '+escapeHtml(termName(termId))+'</p></div>'+
  (formCards ? formCards : '')+
  '<div class="card">'+
    '<div class="card-header"><h3>My Teaching Workload</h3></div>'+
    (subjectRows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Subject</th><th>Class</th><th>Entered</th><th>Status</th><th></th></tr></thead><tbody>'+subjectRows+'</tbody></table></div>'
      : '<div class="empty-state"><h3>No subject assignments yet</h3><p>Ask your Admin to assign you to a subject and class for this session/term.</p></div>')+
  '</div>';
}

function statusLabel(s){
  var map = { PENDING:"Pending", UNASSIGNED:"Unassigned", DRAFT:"Draft", SUBMITTED:"Submitted", RETURNED:"Returned", FORM_APPROVED:"Form Approved",
              ADMIN_REVIEW:"Admin Review", APPROVED:"Approved", PUBLISHED:"Published", LOCKED:"Locked" };
  return map[s] || s;
}

function openScoreEntry(subjectId, classArmId){
  goto("score-entry", { subjectId: subjectId, classArmId: classArmId });
}
function openClassReview(classArmId){
  goto("form-review", { classArmId: classArmId });
}
function setFormReviewClass(classArmId){
  goto("form-review", { classArmId: classArmId });
}
