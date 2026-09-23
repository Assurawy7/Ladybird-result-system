/* ==========================================================================
   12 - ADMIN / PRINCIPAL APPROVAL QUEUE
   ========================================================================== */

function renderApprovalsView(){
  var user = state.currentUser;
  assertPermission(isWholeSchoolRole(user.role), "Only Admin/Principal can access approvals.");
  var sessionId = state.currentSessionId, termId = state.currentTermId;

  var rows = state.classArms.filter(function(c){return c.active;}).map(function(ca){
    var key = [ca.id, sessionId, termId].join("::");
    var approval = state.classApproval[key] || { status:"IN_PROGRESS" };
    var ov = computeClassOverview(ca.id, sessionId, termId);
    return { ca:ca, approval:approval, ov:ov, key:key };
  });

  rows.sort(function(a,b){
    var order = { FORM_APPROVED:0, PUBLISHED:1, LOCKED:2, IN_PROGRESS:3 };
    return (order[a.approval.status]||9) - (order[b.approval.status]||9);
  });

  var eligibleCount = rows.filter(function(r){return r.approval.status==="FORM_APPROVED";}).length;

  var tableRows = rows.map(function(r){
    var canPublishRow = r.approval.status==="FORM_APPROVED" && canPublish(user);
    var canReopen = (r.approval.status==="PUBLISHED" || r.approval.status==="LOCKED") && (user.role==="SUPER_ADMIN" || user.role==="ADMIN");
    return '<tr><td>'+(canPublishRow ? '<input type="checkbox" class="approval-check" value="'+r.ca.id+'"/>' : '')+'</td>'+
      '<td>'+escapeHtml(r.ca.name)+' <span class="muted small">('+sectionName(r.ca.sectionId)+')</span></td>'+
      '<td>'+r.ov.students.length+'</td>'+
      '<td>'+(r.ov.classAverage!==null?r.ov.classAverage+"%":"—")+'</td>'+
      '<td><span class="status-badge status-'+r.approval.status.toLowerCase()+'">'+statusLabel(r.approval.status)+'</span></td>'+
      '<td class="actions-cell">'+
        '<button class="btn btn-sm btn-ghost" onclick="goto(\'form-review\',{classArmId:\''+r.ca.id+'\'})">View</button>'+
        (canPublishRow ? '<button class="btn btn-sm btn-primary" onclick="publishClass(\''+r.ca.id+'\')">Publish</button>' : '')+
        (canReopen ? '<button class="btn btn-sm btn-secondary" onclick="reopenClass(\''+r.ca.id+'\')">Reopen</button>' : '')+
      '</td></tr>';
  }).join("");

  return ''+
  '<div class="page-header"><h2>Result Approvals</h2><p>'+escapeHtml(sessionName(sessionId))+' &middot; '+escapeHtml(termName(termId))+' &middot; '+eligibleCount+' class(es) awaiting final approval</p></div>'+
  (eligibleCount && canPublish(user) ? '<div class="filter-bar">'+
      '<button class="btn btn-secondary" onclick="publishSelectedClasses()">Publish Selected</button>'+
      '<button class="btn btn-primary" onclick="publishAllEligible()">Publish All Eligible ('+eligibleCount+')</button>'+
    '</div>' : '')+
  '<div class="card">'+
    '<div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Class</th><th>Students</th><th>Class Avg</th><th>Status</th><th></th></tr></thead><tbody>'+tableRows+'</tbody></table></div>'+
  '</div>';
}

/* Core publish action with no confirm/toast of its own, so bulk actions can
   loop it once and show a single summary instead of one dialog per class. */
function publishClassCore(classArmId){
  var user = state.currentUser;
  var key = [classArmId, state.currentSessionId, state.currentTermId].join("::");
  state.classApproval[key] = Object.assign(state.classApproval[key]||{}, { status:"PUBLISHED", publishedBy:user.id, publishedAt: Date.now() });
  subjectsForClassArm(byId(state.classArms, classArmId)).forEach(function(su){
    var k = [classArmId, su.id, state.currentSessionId, state.currentTermId].join("::");
    if (state.classSubjectStatus[k]==="ADMIN_REVIEW") state.classSubjectStatus[k] = "PUBLISHED";
  });
  addAudit(state, "Results published", classArmName(classArmId));
}

function publishClass(classArmId){
  assertPermission(canPublish(state.currentUser), "Only Admin/Principal/Super Admin can publish results.");
  if (!window.confirm("Publish this class's results? This will lock scores from further teacher edits.")) return;
  publishClassCore(classArmId);
  toast("Results published and locked.");
  scheduleSave(); renderApp();
}

function publishSelectedClasses(){
  assertPermission(canPublish(state.currentUser), "Only Admin/Principal/Super Admin can publish results.");
  var ids = qsa(".approval-check:checked").map(function(cb){return cb.value;});
  if (!ids.length){ toast("Select at least one class first.", "warn"); return; }
  if (!window.confirm("Publish "+ids.length+" selected class(es)? This will lock their scores from further teacher edits.")) return;
  ids.forEach(publishClassCore);
  toast(ids.length+" class(es) published and locked.");
  scheduleSave(); renderApp();
}

function publishAllEligible(){
  assertPermission(canPublish(state.currentUser), "Only Admin/Principal/Super Admin can publish results.");
  var sessionId = state.currentSessionId, termId = state.currentTermId;
  var eligible = state.classArms.filter(function(ca){
    var key = [ca.id, sessionId, termId].join("::");
    var approval = state.classApproval[key] || { status:"IN_PROGRESS" };
    return ca.active && approval.status==="FORM_APPROVED";
  });
  if (!eligible.length){ toast("No classes are currently ready to publish.", "warn"); return; }
  if (!window.confirm("Publish ALL "+eligible.length+" eligible class(es)? This will lock their scores from further teacher edits.")) return;
  eligible.forEach(function(ca){ publishClassCore(ca.id); });
  toast(eligible.length+" class(es) published and locked.");
  scheduleSave(); renderApp();
}

function reopenClass(classArmId){
  var user = state.currentUser;
  assertPermission(user.role==="SUPER_ADMIN" || user.role==="ADMIN", "Only Admin/Super Admin can reopen published results.");
  var reason = window.prompt("Reason for reopening this class's results (required):", "");
  if (!reason){ toast("A reason is required to reopen results.", "error"); return; }
  var key = [classArmId, state.currentSessionId, state.currentTermId].join("::");
  var prev = state.classApproval[key];
  state.classApproval[key] = Object.assign({}, prev, { status:"FORM_APPROVED", reopenedBy:user.id, reopenedAt: Date.now(), reopenReason: reason,
    previousStatus: prev ? prev.status : null });
  subjectsForClassArm(byId(state.classArms, classArmId)).forEach(function(su){
    var k = [classArmId, su.id, state.currentSessionId, state.currentTermId].join("::");
    if (state.classSubjectStatus[k]==="PUBLISHED") state.classSubjectStatus[k] = "ADMIN_REVIEW";
  });
  addAudit(state, "Results reopened", classArmName(classArmId)+" — reason: "+reason);
  toast("Results reopened for correction.");
  scheduleSave(); renderApp();
}
