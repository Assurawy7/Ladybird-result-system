/* ==========================================================================
   02 - LIVE STATE SYNC (Netlify Functions -> Neon PostgreSQL) + GENERIC HELPERS
   ==========================================================================
   MIGRATION NOTE: this file used to talk to Firebase Firestore directly.
   It now talks to a small set of Netlify Functions (see netlify/functions/)
   which talk to Neon. Every OTHER source file (03-auth.js through
   23-boot.js) is UNCHANGED and still just reads/writes the module-level
   `state` object and calls scheduleSave()/persistNow() exactly as before -
   see master prompt section 62/63 ("keep the state object"). All Firebase
   references were confined to this one file plus firebase-config.js and
   the <script> tags in index.html (now removed).

   All shared school data still lives in ONE JSON document (school_state.state
   in Neon), mirroring the old records/core Firestore document. Photos/
   logo/signatures are still stored separately (Neon `media` table), one row
   per image, for the same reason as before (keep the main document small).

   Sync strategy: Firestore pushed changes to the browser (onSnapshot).
   Neon/Netlify Functions have no equivalent for a static frontend, so this
   file instead POLLS state-get.js every ~2s while the tab is visible and
   the user is logged in (see startLiveSync()). Revisions still work the
   same way: a poll that comes back with the same revision we already have
   is ignored; a newer revision is merged in and re-rendered - same "live"
   feel as before, just pull instead of push.
   ========================================================================== */

var state = null;
var saveTimer = null;
var _mediaCache = {};
var _lastKnownRev = -1;
var _firstSnapshotReceived = false;
var MEDIA_MARKER = "@media";
var _liveSyncTimer = null;
var _pendingSave = false;
var _saveInFlight = false;
var LOCAL_STATE_CACHE_KEY = "ladybird_state_cache_v1";

function uid(prefix){
  return (prefix||"id") + "_" + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
}

var API_BASE = "/.netlify/functions";

function apiCall(path, options){
  return fetch(API_BASE + path, Object.assign({ credentials: "same-origin" }, options))
    .then(function(resp){
      return resp.json().catch(function(){ return {}; }).then(function(json){
        if (!resp.ok && json.ok === undefined) json.ok = false;
        if (!resp.ok && !json.error) json.error = "Request failed (" + resp.status + ")";
        json._httpStatus = resp.status;
        return json;
      });
    })
    .catch(function(err){
      return { ok:false, error:"Network error - check your internet connection.", _networkError:true };
    });
}

function apiLogin(username, password){
  return apiCall("/auth-login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username:username, password:password }) });
}
function apiLogout(){
  return apiCall("/auth-logout", { method:"POST" });
}
function apiGetSession(){
  return apiCall("/auth-session", { method:"GET" });
}
function apiGetState(since){
  return apiCall("/state-get?since=" + encodeURIComponent(since), { method:"GET" });
}
function apiSaveState(payload, baseRevision){
  return apiCall("/state-save", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ state: payload, baseRevision: baseRevision }) });
}
function apiGetMedia(key){
  return apiCall("/media-get?key=" + encodeURIComponent(key), { method:"GET" });
}
function apiSaveMedia(key, dataUrl){
  return apiCall("/media-save", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ key:key, dataUrl:dataUrl }) });
}
function apiDeleteMedia(key){
  return apiCall("/media-delete", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ key:key }) });
}

/* ---------- media (photos/logo/signatures) field registry ---------- */
function collectMediaFields(s){
  var fields = [];
  fields.push({ key:"logo", get:function(){return s.school.logo;}, set:function(v){s.school.logo=v;} });
  fields.push({ key:"stamp", get:function(){return s.school.stamp;}, set:function(v){s.school.stamp=v;} });
  (s.signatures||[]).forEach(function(sig){
    fields.push({ key:"sig_"+sig.id, get:function(){return sig.image;}, set:function(v){sig.image=v;} });
  });
  (s.students||[]).forEach(function(stu){
    fields.push({ key:"student_"+stu.id, get:function(){return stu.photo;}, set:function(v){stu.photo=v;} });
  });
  return fields;
}

function rehydrateMediaFields(target){
  collectMediaFields(target).forEach(function(f){
    if (f.get() === MEDIA_MARKER) f.set(_mediaCache[f.key] || "");
  });
}

/* Fetches (in parallel) any media referenced by @media markers in `target`
   that isn't already in _mediaCache. Old Firestore code kept _mediaCache
   fully in sync via a live collection listener; the static-hosting
   equivalent here is to fetch on demand right before we need it. */
function prefetchMedia(target){
  var toFetch = collectMediaFields(target).filter(function(f){
    return f.get() === MEDIA_MARKER && !(f.key in _mediaCache);
  });
  if (!toFetch.length) return Promise.resolve();
  return Promise.all(toFetch.map(function(f){
    return apiGetMedia(f.key).then(function(res){
      if (res.ok && res.found) _mediaCache[f.key] = res.dataUrl;
    }).catch(function(){ /* ignore - field just stays blank */ });
  }));
}

/* Uploads/deletes any changed media based on the LIVE (unclonded) state,
   comparing against what we already know is stored (_mediaCache), so we
   never re-upload an unchanged photo just because something else changed. */
function syncMediaFromState(liveState){
  collectMediaFields(liveState).forEach(function(f){
    var current = f.get();
    var cached = _mediaCache[f.key];
    if (current && current.indexOf("data:") === 0 && current !== cached){
      _mediaCache[f.key] = current;
      apiSaveMedia(f.key, current).then(function(res){
        if (!res.ok) console.error("Media upload failed for "+f.key, res.error);
      });
    } else if ((!current || current === "") && cached !== undefined){
      delete _mediaCache[f.key];
      apiDeleteMedia(f.key).then(function(res){
        if (!res.ok) console.error("Media delete failed for "+f.key, res.error);
      });
    }
  });
}

function applyMediaMarkers(payload){
  collectMediaFields(payload).forEach(function(f){
    f.set(_mediaCache[f.key] ? MEDIA_MARKER : "");
  });
}

/* ---------- local offline cache (best-effort, see master prompt #21) ---------- */
function cacheStateLocally(){
  try{
    var copy = Object.assign({}, state, { currentUser:null, view:"login", viewParams:{} });
    localStorage.setItem(LOCAL_STATE_CACHE_KEY, JSON.stringify({ rev:_lastKnownRev, state:copy }));
  }catch(e){ /* storage full/unavailable - offline fallback just won't be as fresh */ }
}
function loadCachedStateLocally(){
  try{
    var raw = localStorage.getItem(LOCAL_STATE_CACHE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    return parsed && parsed.state ? parsed.state : null;
  }catch(e){ return null; }
}

/* ---------- boot / sync ---------- */
function loadState(callback){
  apiGetSession().then(function(sessionRes){
    var authedUser = (sessionRes && sessionRes.ok && sessionRes.authenticated) ? sessionRes.user : null;
    return apiGetState(-1).then(function(res){
      if (!res.ok) { var e = new Error(res.error || "Could not load school data."); e._res = res; throw e; }

      var incoming = res.state || {};
      var neverSeeded = Object.keys(incoming).length === 0 && !res.authenticated && authedUser === null && res.revision === 0;

      if (neverSeeded){
        // Brand new deployment: db/schema.sql inserted an empty state row.
        // Seed it now, exactly like the old "Firestore doc doesn't exist
        // yet" path did. This one save is allowed unauthenticated by
        // state-save.js because the row is still empty.
        state = seedState();
        _lastKnownRev = 0;
        _firstSnapshotReceived = true;
        return persistNow().then(function(){
          state.currentUser = null; state.view = "login"; state.viewParams = {};
        });
      }

      _lastKnownRev = res.revision;
      _firstSnapshotReceived = true;

      if (!authedUser){
        // Not logged in: only school branding is available pre-auth (see
        // state-get.js). Fill in empty collections so renderLoginView()
        // and friends don't have to special-case a half-populated state.
        state = Object.assign({
          students:[], scores:[], users:[], subjects:[], classArms:[], sections:[],
          departments:[], sessions:[], terms:[], teacherAssignments:[],
          formTeacherAssignments:[], commentTemplates:[], signatures:[],
          affectiveDomains:[], psychomotorDomains:[], customFieldDefs:[],
          reportTemplates:[], auditLog:[], notifications:[],
          classSubjectStatus:{}, classApproval:{}, studentComments:{},
          domainScores:{}, attendance:{}, school:{}
        }, incoming);
        state.currentUser = null; state.view = "login"; state.viewParams = {};
        return;
      }

      return prefetchMedia(incoming).then(function(){
        rehydrateMediaFields(incoming);
        state = incoming;
        state.currentUser = authedUser;
        state.view = "dashboard";
        state.viewParams = {};
        cacheStateLocally();
        startLiveSync();
      });
    });
  }).then(function(){
    if (callback) callback();
  }).catch(function(err){
    console.error("Could not load state", err);
    var cached = loadCachedStateLocally();
    if (cached){
      state = cached;
      state.currentUser = null; state.view = "login"; state.viewParams = {};
      if (callback) callback();
      setTimeout(function(){ toast("You're offline - showing the last data saved on this device.", "warn"); }, 300);
    } else {
      alert("Could not connect to the school server. Check your internet connection, then reload this page.");
    }
  });
}

/* Called after a successful login (see tryLogin() in source/03-auth.js) to
   pull the REAL full state now that we're authenticated - before login we
   only ever had the public school-branding subset. */
function refreshFullStateAfterLogin(authedUser){
  return apiGetState(-1).then(function(res){
    if (!res.ok) throw new Error(res.error || "Could not load school data.");
    var incoming = res.state || {};
    return prefetchMedia(incoming).then(function(){
      rehydrateMediaFields(incoming);
      var keepView = state ? state.view : "dashboard";
      var keepParams = state ? state.viewParams : {};
      state = incoming;
      state.currentUser = authedUser;
      state.view = keepView;
      state.viewParams = keepParams;
      _lastKnownRev = res.revision;
      cacheStateLocally();
      startLiveSync();
    });
  });
}

/* Restores "who's logged in on THIS device" after loadState() has already
   run (see window.addEventListener("DOMContentLoaded", ...) in
   source/23-boot.js: `loadState(function(){ restoreLocalSession(); ... })`.
   The real authentication already happened inside loadState() via the
   server session cookie (apiGetSession()) - this function just reports
   whether that succeeded, so 23-boot.js's existing call sequence keeps
   working unmodified. */
function restoreLocalSession(){
  return !!(state && state.currentUser);
}

/* Kept for the same "stay logged in" feel as before, though the actual
   auth boundary is now the server-side session cookie (see _auth.js),
   not this value. */
function persistLocalSession(user){
  try{ localStorage.setItem("ladybird_local_session", JSON.stringify({ userId: user.id })); }catch(e){}
}
function clearLocalSession(){
  try{ localStorage.removeItem("ladybird_local_session"); }catch(e){}
  try{ localStorage.removeItem(LOCAL_STATE_CACHE_KEY); }catch(e){}
}

function startLiveSync(){
  stopLiveSync();
  _liveSyncTimer = setInterval(function(){
    if (!state || !state.currentUser) return;
    if (document.visibilityState === "hidden") return;
    if (navigator.onLine === false) return;
    pollOnce();
  }, 5000); // was 2000ms - eased off to reduce Neon data-transfer volume; still feels live for a result-management app
}
function stopLiveSync(){
  if (_liveSyncTimer){ clearInterval(_liveSyncTimer); _liveSyncTimer = null; }
}

/* ---------- unsaved-work guard ----------
   Live-sync must NEVER replace what is on this screen while the person is
   typing, has a modal form open, or has a save that hasn't finished.
   Otherwise another device's save wipes out what they were filling in. */
var _lastInputAt = 0;
var _editedDuringFlight = false;
var _pollInFlight = false;
var _pollStartedAt = 0;
var _lastPollAt = 0;
var _retryTimer = null;
var _lastSaveFailToastAt = 0;
var TEXTLIKE = { text:1, number:1, tel:1, email:1, date:1, url:1, password:1, "":1 };

function fieldIsTextLike(f){
  if (!f || !f.tagName) return false;
  if (f.tagName === "TEXTAREA") return true;
  if (f.tagName !== "INPUT") return false;
  return !!TEXTLIKE[(f.type || "").toLowerCase()];
}

function userIsBusy(){
  // A form/dialog is open (add student, edit teacher, etc.)
  var mr = document.getElementById("modal-root");
  if (mr && mr.children && mr.children.length > 0) return true;
  var active = document.activeElement;
  var fields = document.querySelectorAll("input, textarea");
  for (var i = 0; i < fields.length; i++){
    var f = fields[i];
    if (!fieldIsTextLike(f)) continue;
    if (f.value === f.defaultValue) continue;          // nothing typed here
    if (f === active) return true;                      // typing right now
    if (Date.now() - _lastInputAt < 90000) return true; // typed in the last 90s
  }
  return false;
}

function hasUnsavedLocalWork(){
  return !!(saveTimer || _saveInFlight || _pendingSave || userIsBusy());
}

document.addEventListener("input", function(){ _lastInputAt = Date.now(); }, true);
document.addEventListener("change", function(){ _lastInputAt = Date.now(); }, true);

function pollOnce(){
  if (_pollInFlight && Date.now() - _pollStartedAt < 20000) return;
  // Don't even ask the server while there is unsaved work: it saves a full
  // download of the school data on slow connections, and we could not apply
  // the answer safely anyway. We catch up as soon as the work is saved.
  if (hasUnsavedLocalWork()) return;
  if (Date.now() - _lastPollAt < 2500) return;
  _lastPollAt = Date.now();
  _pollInFlight = true; _pollStartedAt = Date.now();
  apiGetState(_lastKnownRev).then(function(res){
    if (!res.ok){
      if (res._httpStatus === 401){ sessionExpired(); }
      return;
    }
    if (res.authenticated === false){ sessionExpired(); return; }
    if (!res.changed) return;
    return prefetchMedia(res.state).then(function(){
      // The person may have started typing while this was downloading.
      // If so, throw this copy away - we will fetch a fresh one later.
      if (hasUnsavedLocalWork()) return;
      rehydrateMediaFields(res.state);
      var keepUser = state.currentUser, keepView = state.view, keepParams = state.viewParams;
      state = res.state;
      state.currentUser = keepUser; state.view = keepView; state.viewParams = keepParams;
      _lastKnownRev = res.revision;
      cacheStateLocally();
      toast("Updated from another device.");
      renderApp();
    });
  }).catch(function(){ /* transient network hiccup - next poll will retry */ })
    .then(function(){ _pollInFlight = false; });
}

function sessionExpired(){
  stopLiveSync();
  if (state) { state.currentUser = null; state.view = "login"; state.viewParams = {}; }
  clearLocalSession();
  toast("Your session has expired - please sign in again.", "warn");
  renderApp();
}

function scheduleSave(){
  if (_saveInFlight) _editedDuringFlight = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){ saveTimer = null; persistNow(); }, 500);
}

function scheduleRetry(){
  if (_retryTimer) return;
  _retryTimer = setTimeout(function(){
    _retryTimer = null;
    if (_pendingSave && !_saveInFlight && navigator.onLine !== false){ _pendingSave = false; persistNow(); }
  }, 8000);
}

function persistNow(){
  if (!state) return Promise.resolve();
  if (saveTimer){ clearTimeout(saveTimer); saveTimer = null; }
  if (_saveInFlight){ _pendingSave = true; _editedDuringFlight = true; return Promise.resolve(); }
  syncMediaFromState(state);
  var payload;
  try{ payload = JSON.parse(JSON.stringify(state)); }
  catch(e){ console.error("Could not serialize state for saving", e); return Promise.resolve(); }
  delete payload.currentUser; delete payload.view; delete payload.viewParams;
  applyMediaMarkers(payload);

  _saveInFlight = true;
  _editedDuringFlight = false; // anything changed from now on is newer than this payload

  return apiSaveState(payload, _lastKnownRev).then(function(result){
    _saveInFlight = false;
    if (!result.ok){
      if (result._httpStatus === 401){ sessionExpired(); return; }
      if (result._httpStatus === 403){
        toast(result.error || "You don't have permission to save that change.", "error");
        return;
      }
      if (Date.now() - _lastSaveFailToastAt > 30000){
        _lastSaveFailToastAt = Date.now();
        toast("Could not save to the school server - will keep retrying. Please keep this page open.", "error");
      }
      _pendingSave = true;
      scheduleRetry();
      return;
    }

    var newerLocalEdits = _editedDuringFlight || !!saveTimer;

    if (!result.merged){
      _lastKnownRev = result.revision;
    } else if (newerLocalEdits){
      // Others changed things AND the person kept editing while this save was
      // on its way. Replacing the screen now would erase those newer edits.
      // Keep the old base revision (so the next save is merged again by the
      // server) and save again right away; the merged result is applied once
      // the person has stopped editing.
      _pendingSave = true;
    } else if (userIsBusy()){
      // Person is typing/has a form open: don't touch the screen. The next
      // poll applies the server's copy as soon as they finish.
    } else {
      _lastKnownRev = result.revision;
      rehydrateMediaFields(result.state);
      var keepUser = state.currentUser, keepView = state.view, keepParams = state.viewParams;
      state = result.state;
      state.currentUser = keepUser; state.view = keepView; state.viewParams = keepParams;
      toast("Some changes made elsewhere while you were away have been merged in alongside yours.", "warn");
      renderApp();
    }
    cacheStateLocally();
    if (_pendingSave){ _pendingSave = false; persistNow(); }
    else { setTimeout(pollOnce, 400); }
  }).catch(function(err){
    _saveInFlight = false;
    console.error("Save failed", err);
    if (Date.now() - _lastSaveFailToastAt > 30000){
      _lastSaveFailToastAt = Date.now();
      toast("Could not save to the school server - will keep retrying. Please keep this page open.", "error");
    }
    _pendingSave = true;
    scheduleRetry();
  });
}

window.addEventListener("online", function(){
  if (_pendingSave) persistNow();
});

document.addEventListener("visibilitychange", function(){
  if (document.visibilityState === "hidden"){
    if (saveTimer) persistNow();                       // flush before the phone suspends the page
  } else if (state && state.currentUser){
    pollOnce();                                        // catch up the moment the app is reopened
  }
});

document.addEventListener("focusout", function(){
  setTimeout(function(){
    if (state && state.currentUser && !hasUnsavedLocalWork()) pollOnce();
  }, 1500);
}, true);

function resetToDemo(){
  if (!window.confirm("This will erase everything for the WHOLE SCHOOL (all devices) and reload the built-in demo data. Continue?")) return;
  var keepUser = state.currentUser;
  state = seedState();
  state.currentUser = keepUser;
  persistNow();
  renderApp();
}

function wipeAllData(){
  if (!window.confirm("This will PERMANENTLY erase all school data for EVERYONE (students, scores, settings, everything, on every device). This cannot be undone. Continue?")) return;
  if (!window.confirm("Are you absolutely sure? This affects the live database used by the whole school.")) return;
  var confirmText = window.prompt("Type WIPE to confirm total data deletion:");
  if (confirmText !== "WIPE") { alert("Cancelled - no changes made."); return; }
  var keepUser = state.currentUser;
  state = seedState();
  state.students = []; state.scores = []; state.studentComments = {}; state.classApproval = {};
  state.classSubjectStatus = {}; state.auditLog = []; state.isDemoData = false;
  state.currentUser = keepUser;
  persistNow();
  renderApp();
}

function exportBackup(){
  var payload = Object.assign({}, state, { currentUser: null, view:"login" });
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  var dateStr = new Date().toISOString().slice(0,10);
  var safeSchool = (state.school.name || "Ladybird").replace(/[^a-z0-9]+/gi,"-");
  a.href = url; a.download = safeSchool + "-Backup-" + dateStr + ".json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  addAudit(state, "Backup exported", "");
  scheduleSave();
}

function importBackupFromFile(file){
  var reader = new FileReader();
  reader.onload = function(){
    try{
      var data = JSON.parse(reader.result);
      if (!data || data.__app !== "ladybird-whole-school"){
        alert("This file doesn't look like a valid backup for this system.");
        return;
      }
      if (!window.confirm("Import this backup? This will REPLACE all data for the WHOLE SCHOOL (all devices) with the contents of this file.")) return;
      var keepUser = state.currentUser;
      data.currentUser = keepUser; data.view = state.view; data.viewParams = {};
      state = data;
      persistNow();
      renderApp();
      alert("Backup imported successfully.");
    }catch(e){
      alert("Could not read that file. Please make sure it's a valid exported backup .json file.");
      console.error(e);
    }
  };
  reader.readAsText(file);
}

/* ---------- generic lookup helpers ---------- */
function byId(arr, id){ for (var i=0;i<arr.length;i++){ if (arr[i].id===id) return arr[i]; } return null; }
function whereEq(arr, key, val){ return arr.filter(function(x){ return x[key]===val; }); }

function sectionName(id){ var s = byId(state.sections, id); return s ? s.name : ""; }
function classArmName(id){ var c = byId(state.classArms, id); return c ? c.name : ""; }
function departmentName(id){ if(!id) return ""; var d = byId(state.departments, id); return d ? d.name : ""; }
function subjectName(id){ var s = byId(state.subjects, id); return s ? s.name : ""; }
function userName(id){ var u = byId(state.users, id); return u ? u.name : ""; }
function termName(id){ var t = byId(state.terms, id); return t ? t.name : ""; }
function sessionName(id){ var s = byId(state.sessions, id); return s ? s.name : ""; }

function formatNaira(n){
  n = Number(n)||0;
  return "\u20A6" + n.toLocaleString("en-NG", {maximumFractionDigits:2});
}

function escapeHtml(str){
  if (str===undefined || str===null) return "";
  return String(str).replace(/[&<>"']/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
  });
}

function el(id){ return document.getElementById(id); }
function qs(sel, root){ return (root||document).querySelector(sel); }
function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

function toast(msg, kind){
  var host = el("toast-host");
  if (!host){
    host = document.createElement("div");
    host.id = "toast-host";
    host.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;";
    document.body.appendChild(host);
  }
  var t = document.createElement("div");
  t.textContent = msg;
  var bg = kind==="error" ? "#8E2A3B" : (kind==="warn" ? "#B8860B" : "#0F4C3A");
  t.style.cssText = "background:"+bg+";color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.2);opacity:0;transition:opacity .2s;max-width:88vw;text-align:center;";
  host.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity = "1"; });
  setTimeout(function(){ t.style.opacity="0"; setTimeout(function(){ t.remove(); }, 250); }, 2600);
}

function goto(view, params){
  state.view = view;
  state.viewParams = params || {};
  renderApp();
  window.scrollTo(0,0);
}
