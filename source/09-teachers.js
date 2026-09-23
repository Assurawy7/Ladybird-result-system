/* ==========================================================================
   09 - TEACHERS + ASSIGNMENTS
   ========================================================================== */

function renderTeachersView(){
  var user = state.currentUser;
  assertPermission(isWholeSchoolRole(user.role), "Only Admin/Principal can manage teachers.");
  var tab = (state.viewParams||{}).tab || "list";

  var tabs = [["list","Teachers"],["subject-assign","Subject Assignments"],["form-assign","Form Teacher Assignments"]];
  var tabHtml = tabs.map(function(t){
    return '<button class="tab-btn'+(tab===t[0]?' active':'')+'" onclick="switchTeacherTab(\''+t[0]+'\')">'+t[1]+'</button>';
  }).join("");

  var body = tab==="list" ? renderTeacherList() : tab==="subject-assign" ? renderSubjectAssignments() : renderFormAssignments();

  return '<div class="page-header"><h2>Teachers &amp; Assignments</h2><p>Manage teacher accounts and their class/subject assignments.</p></div>'+
    '<div class="tab-bar">'+tabHtml+'</div>'+ body;
}
function switchTeacherTab(t){ state.viewParams = { tab: t }; renderApp(); }

function renderTeacherList(){
  var teachers = state.users.filter(function(u){ return u.role==="TEACHER"; });
  var rows = teachers.map(function(t){
    var subjCount = state.teacherAssignments.filter(function(a){return a.teacherId===t.id && a.active;}).length;
    var formCount = state.formTeacherAssignments.filter(function(a){return a.teacherId===t.id && a.active;}).length;
    return '<tr><td><span class="avatar-sm">'+escapeHtml(t.name.split(" ").map(function(w){return w[0];}).slice(0,2).join(""))+'</span> '+escapeHtml(t.name)+'</td>'+
      '<td>'+escapeHtml(t.username)+'</td><td>'+subjCount+' subject assignment(s)</td><td>'+formCount+' form class(es)</td>'+
      '<td><span class="status-badge status-'+(t.active?'active':'inactive')+'">'+(t.active?'Active':'Inactive')+'</span></td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="openTeacherForm(\''+t.id+'\')">Edit</button>'+
        '<button class="btn btn-sm btn-ghost" onclick="toggleTeacherActive(\''+t.id+'\')">'+(t.active?'Deactivate':'Activate')+'</button>'+
        '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="deleteTeacher(\''+t.id+'\')">Delete</button></td></tr>';
  }).join("");
  return '<div class="card">'+
    '<div class="card-header"><h3>All Teachers</h3><button class="btn btn-primary btn-sm" onclick="openTeacherForm(null)">'+ICONS("plus")+' Add Teacher</button></div>'+
    (rows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Username</th><th>Subjects</th><th>Form Class</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-state"><h3>No teachers yet</h3></div>')+
    '</div>';
}

function openTeacherForm(teacherId){
  var t = teacherId ? byId(state.users, teacherId) : null;
  var html = ''+
  '<div class="modal-header"><h3>'+(t?"Edit Teacher":"Add Teacher")+'</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    '<div class="form-grid">'+
      '<div><label class="field-label">Full Name *</label><input class="field-input" id="t-name" value="'+escapeHtml(t?t.name:'')+'"/></div>'+
      '<div><label class="field-label">Username *</label><input class="field-input" id="t-username" value="'+escapeHtml(t?t.username:'')+'" '+(t?'disabled':'')+'/></div>'+
      '<div><label class="field-label">Password '+(t?'(leave blank to keep unchanged)':'*')+'</label><input class="field-input" type="text" id="t-password" placeholder="'+(t?'unchanged':'e.g. demo123')+'"/></div>'+
    '</div>'+
  '</div>'+
  '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
  '<button class="btn btn-primary" onclick="saveTeacherForm('+(t?"'"+t.id+"'":"null")+')">Save</button></div>';
  openModal(html);
}
function saveTeacherForm(teacherId){
  var name = el("t-name").value.trim();
  var username = el("t-username").value.trim().toLowerCase();
  var password = el("t-password").value;
  if (!name || !username){ toast("Name and username are required.", "error"); return; }
  if (!teacherId){
    if (state.users.some(function(u){return u.username.toLowerCase()===username;})){ toast("That username is already taken.", "error"); return; }
    if (!password){ toast("Please set a password for the new teacher.", "error"); return; }
    state.users.push({ id: uid("user"), username:username, password:password, name:name, role:"TEACHER", photo:"", signature:"", active:true });
    addAudit(state, "Teacher created", name);
    toast("Teacher added.");
  } else {
    var t = byId(state.users, teacherId);
    t.name = name; if (password) t.password = password;
    addAudit(state, "Teacher edited", name);
    toast("Teacher updated.");
  }
  closeModal(); scheduleSave(); renderApp();
}
function toggleTeacherActive(teacherId){
  var t = byId(state.users, teacherId);
  t.active = !t.active;
  addAudit(state, t.active?"Teacher activated":"Teacher deactivated", t.name);
  scheduleSave(); renderApp();
}
function deleteTeacher(teacherId){
  var t = byId(state.users, teacherId);
  if (!t) return;
  var subjCount = state.teacherAssignments.filter(function(a){return a.teacherId===teacherId && a.active;}).length;
  var formCount = state.formTeacherAssignments.filter(function(a){return a.teacherId===teacherId && a.active;}).length;
  var warn = (subjCount || formCount) ? " This will also remove their "+subjCount+" subject assignment(s) and "+formCount+" form-class assignment(s)." : "";
  if (!window.confirm("Permanently delete "+t.name+"'s account?"+warn+" This cannot be undone.")) return;
  state.users = state.users.filter(function(u){return u.id!==teacherId;});
  state.teacherAssignments = state.teacherAssignments.filter(function(a){return a.teacherId!==teacherId;});
  state.formTeacherAssignments = state.formTeacherAssignments.filter(function(a){return a.teacherId!==teacherId;});
  addAudit(state, "Teacher deleted", t.name);
  toast("Teacher deleted.");
  scheduleSave(); renderApp();
}

function renderSubjectAssignments(){
  var teachers = state.users.filter(function(u){return u.role==="TEACHER";});
  var rows = state.teacherAssignments.filter(function(a){return a.sessionId===state.currentSessionId;}).map(function(a){
    var t = byId(state.users, a.teacherId), su = byId(state.subjects, a.subjectId), ca = byId(state.classArms, a.classArmId), term = byId(state.terms, a.termId);
    return '<tr><td>'+escapeHtml(t?t.name:"—")+'</td><td>'+escapeHtml(su?su.name:"—")+'</td><td>'+escapeHtml(ca?ca.name:"—")+'</td><td>'+escapeHtml(term?term.name:"—")+'</td>'+
      '<td><span class="status-badge status-'+(a.active?'active':'inactive')+'">'+(a.active?'Active':'Inactive')+'</span></td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="toggleAssignment(\''+a.id+'\',\'subject\')">'+(a.active?'Pause':'Reactivate')+'</button>'+
      '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="removeAssignment(\''+a.id+'\',\'subject\')">'+ICONS("trash")+' Unassign</button></td></tr>';
  }).join("");

  var teacherOptions = teachers.map(function(t){return '<option value="'+t.id+'">'+escapeHtml(t.name)+'</option>';}).join("");
  var subjectChecks = state.subjects.filter(function(s){return s.active;}).map(function(s){
    return '<label class="check-chip"><input type="checkbox" class="sa-subject-check" value="'+s.id+'"/> '+escapeHtml(s.name)+'</label>';
  }).join("");
  var classChecks = state.classArms.filter(function(c){return c.active;}).map(function(c){
    return '<label class="check-chip"><input type="checkbox" class="sa-class-check" value="'+c.id+'"/> '+escapeHtml(c.name)+'</label>';
  }).join("");
  var termChecks = state.terms.filter(function(t){return t.sessionId===state.currentSessionId;}).map(function(t){
    return '<label class="check-chip"><input type="checkbox" class="sa-term-check" value="'+t.id+'" '+(t.id===state.currentTermId?'checked':'')+'/> '+escapeHtml(t.name)+'</label>';
  }).join("");

  return '<div class="card">'+
    '<div class="card-header"><h3>Assign Teacher &rarr; Subject(s) &rarr; Class(es) &rarr; Term(s)</h3></div>'+
    '<p class="muted small">Select one teacher, then any combination of subjects/classes/terms - every combination gets its own assignment in one click.</p>'+
    '<label class="field-label">Teacher</label><select class="field-input" id="sa-teacher">'+teacherOptions+'</select>'+
    '<label class="field-label" style="margin-top:12px">Subject(s)</label><div class="check-chip-group">'+subjectChecks+'</div>'+
    '<label class="field-label" style="margin-top:12px">Class(es)/Arm(s)</label><div class="check-chip-group">'+classChecks+'</div>'+
    '<label class="field-label" style="margin-top:12px">Term(s)</label><div class="check-chip-group">'+termChecks+'</div>'+
    '<button class="btn btn-primary" style="margin-top:14px" onclick="addSubjectAssignment()">Assign</button>'+
    (rows ? '<div class="table-wrap" style="margin-top:20px"><table class="data-table"><thead><tr><th>Teacher</th><th>Subject</th><th>Class</th><th>Term</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-state"><h3>No assignments yet</h3></div>')+
  '</div>';
}
function addSubjectAssignment(){
  var teacherId = el("sa-teacher").value;
  var subjectIds = qsa(".sa-subject-check:checked").map(function(c){return c.value;});
  var classArmIds = qsa(".sa-class-check:checked").map(function(c){return c.value;});
  var termIds = qsa(".sa-term-check:checked").map(function(c){return c.value;});
  if (!subjectIds.length || !classArmIds.length || !termIds.length){
    toast("Select at least one subject, one class, and one term.", "error"); return;
  }
  var created = 0, skipped = 0;
  subjectIds.forEach(function(subjectId){
    classArmIds.forEach(function(classArmId){
      termIds.forEach(function(termId){
        var dup = state.teacherAssignments.some(function(a){
          return a.active && a.subjectId===subjectId && a.classArmId===classArmId && a.termId===termId && a.sessionId===state.currentSessionId;
        });
        if (dup){ skipped++; return; }
        state.teacherAssignments.push({ id: uid("ta"), teacherId:teacherId, subjectId:subjectId, classArmId:classArmId, sessionId: state.currentSessionId, termId:termId, active:true });
        created++;
      });
    });
  });
  addAudit(state, "Bulk teacher assignment", userName(teacherId)+" -> "+created+" assignment(s) created"+(skipped?", "+skipped+" skipped (already assigned)":""));
  toast(created+" assignment(s) created"+(skipped?", "+skipped+" already existed and were skipped":"")+".");
  scheduleSave(); renderApp();
}
function toggleAssignment(id, kind){
  var arr = kind==="subject" ? state.teacherAssignments : state.formTeacherAssignments;
  var a = byId(arr, id); a.active = !a.active;
  addAudit(state, "Assignment "+(a.active?"activated":"deactivated"), id);
  scheduleSave(); renderApp();
}
function removeAssignment(id, kind){
  if (!window.confirm("Remove this assignment?")) return;
  if (kind==="subject") state.teacherAssignments = state.teacherAssignments.filter(function(a){return a.id!==id;});
  else state.formTeacherAssignments = state.formTeacherAssignments.filter(function(a){return a.id!==id;});
  addAudit(state, "Assignment removed", id);
  scheduleSave(); renderApp();
}

function renderFormAssignments(){
  var teachers = state.users.filter(function(u){return u.role==="TEACHER";});
  var rows = state.formTeacherAssignments.filter(function(a){return a.sessionId===state.currentSessionId;}).map(function(a){
    var t = byId(state.users, a.teacherId), ca = byId(state.classArms, a.classArmId);
    return '<tr><td>'+escapeHtml(t?t.name:"—")+'</td><td>'+escapeHtml(ca?ca.name:"—")+'</td>'+
      '<td><span class="status-badge status-'+(a.active?'active':'inactive')+'">'+(a.active?'Active':'Inactive')+'</span></td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="toggleAssignment(\''+a.id+'\',\'form\')">'+(a.active?'Deactivate':'Activate')+'</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="removeAssignment(\''+a.id+'\',\'form\')">'+ICONS("trash")+'</button></td></tr>';
  }).join("");
  var teacherOptions = teachers.map(function(t){return '<option value="'+t.id+'">'+escapeHtml(t.name)+'</option>';}).join("");
  var classOptions = state.classArms.filter(function(c){return c.active;}).map(function(c){return '<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>';}).join("");
  return '<div class="card">'+
    '<div class="card-header"><h3>Assign Form Teacher &rarr; Class</h3></div>'+
    '<div class="form-grid form-grid-3">'+
      '<div><label class="field-label">Teacher</label><select class="field-input" id="fa-teacher">'+teacherOptions+'</select></div>'+
      '<div><label class="field-label">Class/Arm</label><select class="field-input" id="fa-class">'+classOptions+'</select></div>'+
      '<div style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-block" onclick="addFormAssignment()">Assign</button></div>'+
    '</div>'+
    (rows ? '<div class="table-wrap" style="margin-top:16px"><table class="data-table"><thead><tr><th>Teacher</th><th>Class</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-state"><h3>No form teacher assignments yet</h3></div>')+
  '</div>';
}
function addFormAssignment(){
  var teacherId = el("fa-teacher").value, classArmId = el("fa-class").value;
  var dup = state.formTeacherAssignments.some(function(a){ return a.active && a.classArmId===classArmId && a.sessionId===state.currentSessionId; });
  if (dup){
    if (!window.confirm("This class already has an active Form Teacher. Assign an additional one?")) return;
  }
  state.formTeacherAssignments.push({ id: uid("fta"), teacherId:teacherId, classArmId:classArmId, sessionId: state.currentSessionId, active:true });
  addAudit(state, "Form Teacher assigned", userName(teacherId)+" -> "+classArmName(classArmId));
  toast("Form Teacher assigned.");
  scheduleSave(); renderApp();
}
