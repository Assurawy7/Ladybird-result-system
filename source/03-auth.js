/* ==========================================================================
   03 - AUTH + PERMISSIONS
   MIGRATION NOTE: tryLogin()/logout() used to check/clear state entirely in
   the browser (comparing plaintext state.currentUser.password locally).
   They now call the server (netlify/functions/auth-login.js /
   auth-logout.js), which checks a bcrypt hash and issues an HTTP-only
   session cookie - see README section 8 / docs/migration.md for why that
   matters. Every permission-check function below (isWholeSchoolRole,
   canManageSettings, canEnterScores, isFormTeacherOf, assertPermission,
   etc.) is UNCHANGED: it's still simulated client-side RBAC for immediate
   UI behavior, mirrored - and actually enforced - server-side in
   netlify/functions/_auth.js and _state.js (see master prompt section 15).
   ========================================================================== */

var ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  PRINCIPAL: "Principal",
  ACADEMIC_SUPERVISOR: "Academic Supervisor",
  TEACHER: "Teacher"
};

var LOCAL_SESSION_KEY = "ladybird_local_session";

function isWholeSchoolRole(role){
  return role==="SUPER_ADMIN" || role==="ADMIN" || role==="PRINCIPAL" || role==="ACADEMIC_SUPERVISOR";
}

function currentUser(){ return state.currentUser; }

/* tryLogin() is now async (returns a Promise) because it has to ask the
   server. Callers (see bindLoginEvents() in source/06-login.js) already
   handle this as a Promise. */
function tryLogin(username, password){
  return apiLogin(username, password).then(function(res){
    if (!res.ok){
      return { ok:false, error: res.error || "Login failed." };
    }
    var authedUser = res.user; // { id, name, role, username } - server-verified
    return refreshFullStateAfterLogin(authedUser).then(function(){
      persistLocalSession(authedUser);
      addAudit(state, "Login", authedUser.username);
      state.view = "dashboard";
      scheduleSave();
      return { ok:true };
    });
  }).catch(function(err){
    console.error("Login failed", err);
    return { ok:false, error:"Could not reach the school server. Check your internet connection." };
  });
}

function logout(){
  addAudit(state, "Logout", state.currentUser ? state.currentUser.username : "");
  scheduleSave();
  stopLiveSync();
  apiLogout().catch(function(){ /* clear local state regardless */ });
  state.currentUser = null;
  state.view = "login";
  clearLocalSession();
  renderApp();
}

/* form-teacher class-arms this user is actively assigned to */
function myFormClassArmIds(userId){
  return state.formTeacherAssignments
    .filter(function(a){ return a.teacherId===userId && a.active; })
    .map(function(a){ return a.classArmId; });
}

/* subject-teacher assignments this user currently has: [{subjectId, classArmId}] */
function mySubjectAssignments(userId){
  return state.teacherAssignments.filter(function(a){ return a.teacherId===userId && a.active; });
}

/* Whether a person can browse a class's full roster/profile/report cards.
   Deliberately narrower than "can enter scores there" - a Subject Teacher
   who only teaches one subject in a class does not get the whole class's
   student roster, comments, fees, or report cards just because they teach
   one subject there. That access is Form Teacher/Admin territory; a Subject
   Teacher's access is Score Entry for their own subject only. */
function canAccessClassArm(user, classArmId){
  if (!user) return false;
  if (isWholeSchoolRole(user.role)) return true;
  return myFormClassArmIds(user.id).indexOf(classArmId) > -1;
}

function canEnterScores(user, subjectId, classArmId){
  if (!user) return false;
  if (isWholeSchoolRole(user.role)) return true;
  var mine = mySubjectAssignments(user.id);
  for (var i=0;i<mine.length;i++){
    if (mine[i].subjectId===subjectId && mine[i].classArmId===classArmId) return true;
  }
  return false;
}

function isFormTeacherOf(user, classArmId){
  if (!user) return false;
  if (isWholeSchoolRole(user.role)) return true;
  return myFormClassArmIds(user.id).indexOf(classArmId) > -1;
}

function canManageSettings(user){
  return user && (user.role==="SUPER_ADMIN" || user.role==="ADMIN");
}

function canPublish(user){
  return user && (user.role==="SUPER_ADMIN" || user.role==="ADMIN" || user.role==="PRINCIPAL");
}

/* Guard used by every data-mutating function below in other files.
   Throws a soft (caught) error and shows a toast rather than crashing. */
function assertPermission(cond, message){
  if (!cond){
    toast(message || "You don't have permission to do that.", "error");
    addAudit(state, "Permission denied", message || "");
    throw new Error("PERMISSION_DENIED");
  }
}
