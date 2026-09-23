/* ==========================================================================
   22 - SETTINGS: USERS (whole-school roles) + BACKUP + MY PROFILE
   ========================================================================== */

function renderUsersSettings(){
  var currentUserRole = state.currentUser.role;
  var currentUserId = state.currentUser.id;
  var wholeSchoolUsers = state.users.filter(function(u){return u.role!=="TEACHER";});
  var rows = wholeSchoolUsers.map(function(u){
    var protectedRow = u.role==="SUPER_ADMIN" || u.id===currentUserId;
    var actions = protectedRow
      ? '<span class="muted small">'+(u.id===currentUserId?"This is you":"Protected")+'</span>'
      : '<button class="btn btn-sm btn-ghost" onclick="toggleUserActive(\''+u.id+'\')">'+(u.active?'Deactivate':'Activate')+'</button>'+
        '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="deleteWholeSchoolUser(\''+u.id+'\')">Delete</button>';
    return '<tr><td>'+escapeHtml(u.name)+'</td><td>'+escapeHtml(u.username)+'</td><td>'+ROLE_LABELS[u.role]+'</td>'+
      '<td><span class="status-badge status-'+(u.active?'active':'inactive')+'">'+(u.active?'Active':'Inactive')+'</span></td>'+
      '<td class="actions-cell">'+actions+'</td></tr>';
  }).join("");
  var roleOptions = ["ADMIN","PRINCIPAL","ACADEMIC_SUPERVISOR"].map(function(r){return '<option value="'+r+'">'+ROLE_LABELS[r]+'</option>';}).join("");
  var canAddSuper = currentUserRole==="SUPER_ADMIN";
  return '<div class="card"><div class="card-header"><h3>Whole-School Users</h3></div>'+
    '<div class="form-grid form-grid-4">'+
      '<div><input class="field-input" id="wu-name" placeholder="Full name"/></div>'+
      '<div><input class="field-input" id="wu-username" placeholder="Username"/></div>'+
      '<div><select class="field-input" id="wu-role">'+roleOptions+(canAddSuper?'<option value="SUPER_ADMIN">Super Admin</option>':'')+'</select></div>'+
      '<div><input class="field-input" id="wu-password" placeholder="Password"/></div>'+
    '</div>'+
    '<button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="addWholeSchoolUser()">Add User</button>'+
    '<div class="table-wrap" style="margin-top:14px"><table class="data-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '</div>';
}
function addWholeSchoolUser(){
  var name = el("wu-name").value.trim(), username = el("wu-username").value.trim().toLowerCase(), role = el("wu-role").value, password = el("wu-password").value;
  if (!name || !username || !password){ toast("Fill in all fields.", "error"); return; }
  if (state.users.some(function(u){return u.username.toLowerCase()===username;})){ toast("Username already exists.", "error"); return; }
  state.users.push({ id: uid("user"), username:username, password:password, name:name, role:role, photo:"", signature:"", active:true });
  addAudit(state, "Whole-school user created", name+" ("+role+")");
  toast("User created.");
  scheduleSave(); renderApp();
}
function toggleUserActive(userId){
  var u = byId(state.users, userId);
  u.active = !u.active;
  addAudit(state, u.active?"User activated":"User deactivated", u.name);
  scheduleSave(); renderApp();
}
function deleteWholeSchoolUser(userId){
  var u = byId(state.users, userId);
  if (!u) return;
  if (u.id === state.currentUser.id){ toast("You can't delete your own account while logged in as it.", "error"); return; }
  if (u.role === "SUPER_ADMIN"){ toast("Super Admin accounts are protected and can't be deleted.", "error"); return; }
  if (!window.confirm("Permanently delete "+u.name+"'s account ("+ROLE_LABELS[u.role]+")? This cannot be undone.")) return;
  state.users = state.users.filter(function(x){return x.id!==userId;});
  addAudit(state, "User deleted", u.name);
  toast("User deleted.");
  scheduleSave(); renderApp();
}

function renderBackupSettings(){
  var demoStudentCount = state.students.filter(function(s){return s.isDemo;}).length;
  var demoUserCount = state.users.filter(function(u){return u.isDemo && u.id!==state.currentUser.id;}).length;
  return '<div class="card"><div class="card-header"><h3>Backup &amp; Restore</h3></div>'+
    '<p class="muted">All school data lives in your live school database, shared across every device. Export a backup regularly and keep a copy somewhere safe, in case anything ever goes wrong with the database itself.</p>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">'+
      '<button class="btn btn-primary" onclick="exportBackup()">Export Backup (.json)</button>'+
      '<button class="btn btn-secondary" onclick="document.getElementById(\'restore-input\').click()">Import Backup</button>'+
      '<input type="file" accept="application/json" id="restore-input" style="display:none" onchange="importBackupFromFile(this.files[0])"/>'+
    '</div>'+
  '</div>'+
  '<div class="card"><div class="card-header"><h3>Demo Data</h3></div>'+
    '<p class="muted">This installation currently '+(demoStudentCount||demoUserCount ? 'still contains '+demoStudentCount+' demo student(s) and '+demoUserCount+' demo account(s).' : 'no longer contains demo data.')+'</p>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">'+
      (demoStudentCount||demoUserCount ? '<button class="btn btn-secondary" onclick="deleteDemoData()">Remove Demo Accounts &amp; Students</button>' : '')+
      '<button class="btn btn-secondary" onclick="resetToDemo()">Reload Demo Data</button>'+
      '<button class="btn btn-ghost" style="color:#8E2A3B" onclick="wipeAllData()">Wipe All Data</button>'+
    '</div>'+
  '</div>';
}

function renderMyProfileSettings(){
  var u = byId(state.users, state.currentUser.id);
  return '<div class="card"><div class="card-header"><h3>My Profile</h3></div>'+
    '<div class="form-grid">'+
      '<div><label class="field-label">Full Name</label><input class="field-input" id="mp-name" value="'+escapeHtml(u.name)+'"/></div>'+
      '<div><label class="field-label">New Password (leave blank to keep unchanged)</label><input class="field-input" type="text" id="mp-password"/></div>'+
    '</div>'+
    '<button class="btn btn-primary" style="margin-top:12px" onclick="saveMyProfile()">Save</button>'+
  '</div>';
}
function saveMyProfile(){
  var u = byId(state.users, state.currentUser.id);
  u.name = el("mp-name").value.trim() || u.name;
  var pw = el("mp-password").value;
  if (pw) u.password = pw;
  state.currentUser.name = u.name;
  addAudit(state, "Profile updated", u.name);
  toast("Profile saved.");
  scheduleSave(); renderApp();
}

function deleteDemoData(){
  var currentId = state.currentUser.id;
  var demoStudents = state.students.filter(function(s){return s.isDemo;});
  var demoUsers = state.users.filter(function(u){return u.isDemo && u.id!==currentId;});
  if (!demoStudents.length && !demoUsers.length){ toast("No demo data left to remove.", "warn"); return; }

  var keepingNote = state.users.filter(function(u){return u.isDemo && u.id===currentId;}).length
    ? " Your own currently logged-in demo account will be KEPT so you don't lose access - create yourself a real account first if you want to remove it too."
    : "";
  if (!window.confirm("Remove "+demoStudents.length+" demo student(s) and "+demoUsers.length+" demo staff account(s), plus their scores/assignments/comments?"+keepingNote+" This cannot be undone.")) return;

  var demoStudentIds = demoStudents.map(function(s){return s.id;});
  var demoUserIds = demoUsers.map(function(u){return u.id;});

  state.students = state.students.filter(function(s){return !s.isDemo;});
  state.users = state.users.filter(function(u){return !(u.isDemo && u.id!==currentId);});
  state.scores = state.scores.filter(function(s){return demoStudentIds.indexOf(s.studentId)===-1;});
  state.teacherAssignments = state.teacherAssignments.filter(function(a){return demoUserIds.indexOf(a.teacherId)===-1;});
  state.formTeacherAssignments = state.formTeacherAssignments.filter(function(a){return demoUserIds.indexOf(a.teacherId)===-1;});
  Object.keys(state.studentComments).forEach(function(k){ if (demoStudentIds.indexOf(k.split("::")[0])>-1) delete state.studentComments[k]; });
  Object.keys(state.domainScores).forEach(function(k){ if (demoStudentIds.indexOf(k.split("::")[0])>-1) delete state.domainScores[k]; });
  Object.keys(state.attendance).forEach(function(k){ if (demoStudentIds.indexOf(k.split("::")[0])>-1) delete state.attendance[k]; });
  state.isDemoData = false;

  addAudit(state, "Demo data removed", demoStudents.length+" student(s), "+demoUsers.length+" account(s)");
  toast("Demo data removed.");
  scheduleSave(); renderApp();
}
