/* ==========================================================================
   14 - ANALYTICS + 15 - AUDIT LOG
   ========================================================================== */

function renderAnalyticsView(){
  var user = state.currentUser;
  assertPermission(isWholeSchoolRole(user.role), "Only Admin/Principal can view analytics.");
  var sessionId = state.currentSessionId, termId = state.currentTermId;

  var subjectStats = {};
  state.classArms.forEach(function(ca){
    subjectsForClassArm(ca).forEach(function(su){
      var res = computeSubjectClassResults(ca.id, su.id, sessionId, termId);
      var complete = res.rows.filter(function(r){return r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused;});
      if (!complete.length) return;
      if (!subjectStats[su.id]) subjectStats[su.id] = { name: su.name, totals:[], pass:0, count:0 };
      complete.forEach(function(r){
        subjectStats[su.id].totals.push(r.calc.total);
        subjectStats[su.id].count++;
        if (r.calc.total >= (su.passMark||40)) subjectStats[su.id].pass++;
      });
    });
  });
  var subjectRows = Object.keys(subjectStats).map(function(id){
    var s = subjectStats[id];
    var avg = Math.round((s.totals.reduce(function(a,b){return a+b;},0)/s.totals.length)*100)/100;
    var passRate = Math.round((s.pass/s.count)*100);
    return '<tr><td>'+escapeHtml(s.name)+'</td><td>'+s.count+'</td><td>'+avg+'%</td><td>'+passRate+'%</td></tr>';
  }).join("");

  var teacherRows = state.users.filter(function(u){return u.role==="TEACHER";}).map(function(t){
    var assigns = state.teacherAssignments.filter(function(a){return a.teacherId===t.id && a.active && a.sessionId===sessionId && a.termId===termId;});
    var submitted = assigns.filter(function(a){
      var key = [a.classArmId, a.subjectId, sessionId, termId].join("::");
      var st = state.classSubjectStatus[key];
      return st && st!=="PENDING" && st!=="RETURNED";
    }).length;
    return '<tr><td>'+escapeHtml(t.name)+'</td><td>'+assigns.length+'</td><td>'+submitted+'</td>'+
      '<td>'+(assigns.length ? Math.round((submitted/assigns.length)*100)+"%" : "—")+'</td></tr>';
  }).join("");

  return ''+
  '<div class="page-header"><h2>Analytics</h2><p>'+escapeHtml(sessionName(sessionId))+' &middot; '+escapeHtml(termName(termId))+'</p></div>'+
  '<div class="grid-2">'+
    '<div class="card"><div class="card-header"><h3>Subject Performance</h3></div>'+
      (subjectRows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Subject</th><th>Results</th><th>Average</th><th>Pass Rate</th></tr></thead><tbody>'+subjectRows+'</tbody></table></div>' : '<div class="empty-inline">No complete results yet.</div>')+
    '</div>'+
    '<div class="card"><div class="card-header"><h3>Teacher Submission Status</h3></div>'+
      (teacherRows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Teacher</th><th>Assignments</th><th>Submitted</th><th>%</th></tr></thead><tbody>'+teacherRows+'</tbody></table></div>' : '<div class="empty-inline">No teacher assignments this term.</div>')+
    '</div>'+
  '</div>';
}

function renderAuditView(){
  var user = state.currentUser;
  assertPermission(user.role==="SUPER_ADMIN" || user.role==="ADMIN", "Only Admin/Super Admin can view the audit log.");
  var rows = state.auditLog.slice(0,200).map(function(l){
    var d = new Date(l.time);
    return '<tr><td>'+d.toLocaleString()+'</td><td>'+escapeHtml(l.user)+'</td><td>'+escapeHtml(ROLE_LABELS[l.role]||l.role||"")+'</td><td>'+escapeHtml(l.action)+'</td><td>'+escapeHtml(l.details)+'</td></tr>';
  }).join("");
  return ''+
  '<div class="page-header"><h2>Audit Log</h2><p>Most recent 200 actions across the whole school.</p></div>'+
  '<div class="card">'+
    (rows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-state"><h3>No activity recorded yet</h3></div>')+
  '</div>';
}
