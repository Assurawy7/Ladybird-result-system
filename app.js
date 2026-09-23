/* ==========================================================================
   LADYBIRD WHOLE-SCHOOL ACADEMIC RESULT MANAGEMENT SYSTEM
   01 - SEED DATA
   All of this is DEMO data. It is clearly marked with isDemo:true where
   relevant and can be wiped from Settings > Backup > "Clear demo data".
   ========================================================================== */

var STORAGE_KEY = "ladybird_whole_school_v1";


function seedState(){
  var sectionNursery = uid("sec"), sectionPrimary = uid("sec"), sectionJSS = uid("sec"), sectionSS = uid("sec");

  var deptScience = uid("dept"), deptArts = uid("dept"), deptCommercial = uid("dept");

  // Class-Arms: a "ClassArm" is a concrete teachable group, e.g. "JSS1A" or "SS1 Science A"
  function ca(section, name, dept){ return { id: uid("ca"), sectionId: section, name: name, departmentId: dept || null, active: true }; }

  var classArms = [
    ca(sectionNursery, "Nursery 1"),
    ca(sectionNursery, "Nursery 2"),
    ca(sectionPrimary, "Primary 1A"),
    ca(sectionPrimary, "Primary 1B"),
    ca(sectionPrimary, "Primary 2A"),
    ca(sectionJSS, "JSS1A"),
    ca(sectionJSS, "JSS1B"),
    ca(sectionJSS, "JSS2A"),
    ca(sectionSS, "SS1 Science A", deptScience),
    ca(sectionSS, "SS1 Arts A", deptArts),
    ca(sectionSS, "SS2 Commercial A", deptCommercial)
  ];

  var sessionId = uid("sess");
  var term1 = uid("term"), term2 = uid("term"), term3 = uid("term");

  var schemeSecondary = uid("ascheme");
  var schemePrimary = uid("ascheme");
  var schemeNursery = uid("ascheme");

  var gradingSecondary = uid("gscheme");
  var gradingNursery = uid("gscheme");

  function findCA(name){ for (var i=0;i<classArms.length;i++){ if (classArms[i].name===name) return classArms[i]; } return null; }

  var subjects = [
    { id: uid("subj"), name:"English Language", code:"ENG", sectionIds:[sectionJSS,sectionSS], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:40, order:1, active:true },
    { id: uid("subj"), name:"Mathematics", code:"MTH", sectionIds:[sectionJSS,sectionSS], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:40, order:2, active:true },
    { id: uid("subj"), name:"Biology", code:"BIO", sectionIds:[sectionSS], departmentIds:[deptScience], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:3, active:true },
    { id: uid("subj"), name:"Physics", code:"PHY", sectionIds:[sectionSS], departmentIds:[deptScience], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:4, active:true },
    { id: uid("subj"), name:"Commerce", code:"COM", sectionIds:[sectionSS], departmentIds:[deptCommercial], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:5, active:true },
    { id: uid("subj"), name:"Literature-in-English", code:"LIT", sectionIds:[sectionSS], departmentIds:[deptArts], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:6, active:true },
    { id: uid("subj"), name:"Islamic Studies", code:"ISL", sectionIds:[sectionJSS,sectionSS], departmentIds:[], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:7, active:true },
    { id: uid("subj"), name:"Basic Science", code:"BSC", sectionIds:[sectionJSS], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:40, order:8, active:true },
    { id: uid("subj"), name:"Number Work", code:"NUM", sectionIds:[sectionNursery,sectionPrimary], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:0, order:1, active:true },
    { id: uid("subj"), name:"Letter Work", code:"LET", sectionIds:[sectionNursery,sectionPrimary], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:0, order:2, active:true }
  ];

  var teacherA = uid("user"), teacherB = uid("user"), formTeacherC = uid("user"),
      admin1 = uid("user"), principal1 = uid("user"), superAdmin1 = uid("user"), supervisor1 = uid("user");

  var users = [
    { id: superAdmin1, username:"superadmin", password:"demo123", name:"Super Admin", role:"SUPER_ADMIN", photo:"", signature:"", active:true, isDemo:true },
    { id: admin1, username:"admin", password:"demo123", name:"Mrs. Grace Okoro", role:"ADMIN", photo:"", signature:"", active:true, isDemo:true },
    { id: principal1, username:"principal", password:"demo123", name:"Dr. Musa Ibrahim", role:"PRINCIPAL", photo:"", signature:"", active:true, isDemo:true },
    { id: supervisor1, username:"supervisor", password:"demo123", name:"Mr. Femi Adewale", role:"ACADEMIC_SUPERVISOR", photo:"", signature:"", active:true, isDemo:true },
    { id: teacherA, username:"teachera", password:"demo123", name:"Mr. Ahmad Sule", role:"TEACHER", photo:"", signature:"", active:true, isDemo:true },
    { id: teacherB, username:"teacherb", password:"demo123", name:"Mrs. Bimpe Alade", role:"TEACHER", photo:"", signature:"", active:true, isDemo:true },
    { id: formTeacherC, username:"teacherc", password:"demo123", name:"Mrs. Aisha Bello", role:"TEACHER", photo:"", signature:"", active:true, isDemo:true }
  ];

  var engSubj = subjects.filter(function(s){return s.code==="ENG";})[0];
  var mthSubj = subjects.filter(function(s){return s.code==="MTH";})[0];
  var jss1a = findCA("JSS1A"), jss1b = findCA("JSS1B");

  var teacherAssignments = [
    { id: uid("ta"), teacherId: teacherA, subjectId: engSubj.id, classArmId: jss1a.id, sessionId: sessionId, termId: term1, active:true },
    { id: uid("ta"), teacherId: teacherA, subjectId: engSubj.id, classArmId: jss1b.id, sessionId: sessionId, termId: term1, active:true },
    { id: uid("ta"), teacherId: teacherB, subjectId: mthSubj.id, classArmId: jss1a.id, sessionId: sessionId, termId: term1, active:true }
  ];

  var formTeacherAssignments = [
    { id: uid("fta"), teacherId: formTeacherC, classArmId: jss1a.id, sessionId: sessionId, active:true },
    { id: uid("fta"), teacherId: teacherA, classArmId: jss1a.id, sessionId: sessionId, active:false }
  ];

  function stu(name, gender, classArmId, sectionId, dept){
    return {
      id: uid("stu"), admissionNo: "LB/" + Math.floor(1000+Math.random()*9000),
      name:name, gender:gender, dob:"", photo:"",
      sectionId:sectionId, classArmId:classArmId, departmentId: dept||null,
      status:"Active", guardianPhone:"", address:"", customFields:{},
      enrollmentHistory:[{ sessionId:sessionId, classArmId:classArmId, sectionId:sectionId, departmentId: dept||null }],
      createdAt: Date.now(), isDemo:true
    };
  }

  var students = [
    stu("Ahmad Musa","Male", jss1a.id, sectionJSS),
    stu("Aisha Ali","Female", jss1a.id, sectionJSS),
    stu("Umar Bello","Male", jss1a.id, sectionJSS),
    stu("Chidinma Eze","Female", jss1a.id, sectionJSS),
    stu("Tunde Bakare","Male", jss1b.id, sectionJSS),
    stu("Grace Danladi","Female", findCA("SS1 Science A").id, sectionSS, deptScience),
    stu("Peter Obi","Male", findCA("SS1 Arts A").id, sectionSS, deptArts)
  ];
  students[1].customFields = {}; // Aisha profile intentionally incomplete (no DOB/photo/guardian phone)
  students[0].dob = "2013-04-12"; students[0].guardianPhone="0803 000 1111"; students[0].address="12 Palm Street, Kano";
  students[2].dob = "2013-01-02"; students[2].guardianPhone="0803 222 3333"; students[2].address="4 Zoo Road, Kano";
  students[3].dob = "2013-06-19"; students[3].guardianPhone="0803 444 5555"; students[3].address="9 Ring Road, Kano";

  var commentTemplates = [
    { id: uid("ct"), text:"Excellent performance. Keep it up.", category:"positive", sectionId:null, active:true },
    { id: uid("ct"), text:"Very good performance this term.", category:"positive", sectionId:null, active:true },
    { id: uid("ct"), text:"Good effort; continue working hard.", category:"neutral", sectionId:null, active:true },
    { id: uid("ct"), text:"Shows good potential; needs more consistency.", category:"neutral", sectionId:null, active:true },
    { id: uid("ct"), text:"Needs more concentration in class.", category:"improvement", sectionId:null, active:true },
    { id: uid("ct"), text:"Needs improvement in academic performance.", category:"improvement", sectionId:null, active:true },
    { id: uid("ct"), text:"Must improve class participation.", category:"improvement", sectionId:null, active:true }
  ];

  return {
    __app: "ladybird-whole-school", __version: 1,
    currentUser: null,
    view: "login",
    viewParams: {},
    school: {
      name: "Ladybird College",
      motto: "Knowledge, Character, Excellence",
      address: "12 Unity Road, Kano, Nigeria",
      phone: "0800 000 0000",
      email: "info@ladybirdcollege.example",
      website: "www.ladybirdcollege.example",
      logo: "",
      stamp: ""
    },
    sessions: [{ id: sessionId, name: "2026/2027", active:true }],
    currentSessionId: sessionId,
    terms: [
      { id: term1, sessionId: sessionId, name:"First Term", order:1, nextTermStartDate:"" },
      { id: term2, sessionId: sessionId, name:"Second Term", order:2, nextTermStartDate:"" },
      { id: term3, sessionId: sessionId, name:"Third Term", order:3, nextTermStartDate:"" }
    ],
    currentTermId: term1,
    sections: [
      { id: sectionNursery, name:"Nursery", order:1 },
      { id: sectionPrimary, name:"Primary", order:2 },
      { id: sectionJSS, name:"Junior Secondary", order:3 },
      { id: sectionSS, name:"Senior Secondary", order:4 }
    ],
    departments: [
      { id: deptScience, sectionId: sectionSS, name:"Science", active:true },
      { id: deptArts, sectionId: sectionSS, name:"Arts", active:true },
      { id: deptCommercial, sectionId: sectionSS, name:"Commercial", active:true }
    ],
    classArms: classArms,
    subjects: subjects,
    assessmentSchemes: [
      { id: schemeSecondary, name:"Secondary Standard", scope:"section", sectionIds:[sectionJSS,sectionSS],
        components:[
          { id: uid("comp"), name:"CA1", maxScore:15, weight:15, order:1, active:true },
          { id: uid("comp"), name:"CA2", maxScore:15, weight:15, order:2, active:true },
          { id: uid("comp"), name:"Exam", maxScore:70, weight:70, order:3, active:true }
        ] },
      { id: schemePrimary, name:"Primary Standard", scope:"section", sectionIds:[sectionPrimary],
        components:[
          { id: uid("comp"), name:"Test 1", maxScore:20, weight:20, order:1, active:true },
          { id: uid("comp"), name:"Test 2", maxScore:20, weight:20, order:2, active:true },
          { id: uid("comp"), name:"Exam", maxScore:60, weight:60, order:3, active:true }
        ] },
      { id: schemeNursery, name:"Nursery Descriptive", scope:"section", sectionIds:[sectionNursery],
        components:[
          { id: uid("comp"), name:"Continuous Assessment", maxScore:100, weight:100, order:1, active:true }
        ] }
    ],
    gradingSchemes: [
      { id: gradingSecondary, name:"WAEC-Style A1-F9", scope:"section", sectionIds:[sectionJSS,sectionSS,sectionPrimary],
        bands:[
          {grade:"A1",min:75,max:100,point:1,remark:"Excellent"},
          {grade:"B2",min:70,max:74,point:2,remark:"Very Good"},
          {grade:"B3",min:65,max:69,point:3,remark:"Good"},
          {grade:"C4",min:60,max:64,point:4,remark:"Credit"},
          {grade:"C5",min:55,max:59,point:5,remark:"Credit"},
          {grade:"C6",min:50,max:54,point:6,remark:"Credit"},
          {grade:"D7",min:45,max:49,point:7,remark:"Pass"},
          {grade:"E8",min:40,max:44,point:8,remark:"Pass"},
          {grade:"F9",min:0,max:39,point:9,remark:"Fail"}
        ]},
      { id: gradingNursery, name:"Descriptive Only", scope:"section", sectionIds:[sectionNursery],
        bands:[
          {grade:"Excellent",min:90,max:100,point:1,remark:"Excellent"},
          {grade:"Very Good",min:75,max:89,point:2,remark:"Very Good"},
          {grade:"Good",min:60,max:74,point:3,remark:"Good"},
          {grade:"Developing",min:40,max:59,point:4,remark:"Developing"},
          {grade:"Needs Improvement",min:0,max:39,point:5,remark:"Needs Improvement"}
        ]}
    ],
    rankingConfig: { basis:"average", scope:"classArm", tieMethod:"competition", requireCompleteResults:true },
    users: users,
    teacherAssignments: teacherAssignments,
    formTeacherAssignments: formTeacherAssignments,
    students: students,
    scores: [], // { id, studentId, subjectId, classArmId, sessionId, termId, components:{compId:val|'ABS'|'EXC'|null}, status }
    classSubjectStatus: {}, // key `${classArmId}_${subjectId}_${sessionId}_${termId}` -> status
    classApproval: {}, // key `${classArmId}_${sessionId}_${termId}` -> {status, reviewedBy, approvedBy, publishedAt}
    studentComments: {}, // key `${studentId}_${sessionId}_${termId}` -> {formTeacherComment, principalComment, nextFees, examFee}
    commentTemplates: commentTemplates,
    signatures: [
      { id: uid("sig"), role:"PRINCIPAL", userId: principal1, name:"Dr. Musa Ibrahim", image:"", active:true }
    ],
    affectiveDomains: [
      {id:uid("dom"), name:"Punctuality", active:true}, {id:uid("dom"), name:"Neatness", active:true},
      {id:uid("dom"), name:"Cooperation", active:true}, {id:uid("dom"), name:"Leadership", active:true},
      {id:uid("dom"), name:"Honesty", active:true}
    ],
    psychomotorDomains: [
      {id:uid("dom"), name:"Handwriting", active:true}, {id:uid("dom"), name:"Sports", active:true},
      {id:uid("dom"), name:"Creativity", active:true}
    ],
    ratingLevels: ["Excellent","Very Good","Good","Fair","Poor"],
    domainScores: {}, // key `${studentId}_${sessionId}_${termId}` -> {affective:{domId:rating}, psychomotor:{domId:rating}}
    attendance: {}, // key `${studentId}_${sessionId}_${termId}` -> {totalDays, present, absent, late}
    reportTemplates: [
      { id: uid("rt"), name:"SS Premium Academic", sectionIds:[sectionSS], style:"classic-navy", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:true, active:true },
      { id: uid("rt"), name:"SS Modern Executive", sectionIds:[sectionSS], style:"modern-teal", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"SS Royal Premium", sectionIds:[sectionSS], style:"royal-purple", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"JSS Premium Academic", sectionIds:[sectionJSS], style:"crimson-gold", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:true, active:true },
      { id: uid("rt"), name:"JSS Corporate Slate", sectionIds:[sectionJSS], style:"corporate-slate", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"JSS Elegant Serif", sectionIds:[sectionJSS], style:"elegant-serif", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"Primary Child-Friendly", sectionIds:[sectionPrimary], style:"sunburst-orange", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:true, active:true },
      { id: uid("rt"), name:"Primary Forest Green", sectionIds:[sectionPrimary], style:"forest-green", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"Nursery Early Learning", sectionIds:[sectionNursery], style:"minimal-mono", showPhoto:true, showAttendance:false, showAffective:true, showFees:true, isDefault:true, active:true },
      { id: uid("rt"), name:"Nursery Elegant Maroon", sectionIds:[sectionNursery], style:"double-frame-formal", showPhoto:true, showAttendance:false, showAffective:true, showFees:true, isDefault:false, active:true }
    ],
    customFieldDefs: [], // {id,name,type,required,sectionIds,order,active}
    auditLog: [],
    notifications: [],
    isDemoData: true
  };
}

function addAudit(state, action, details){
  state.auditLog.unshift({
    id: uid("log"), time: new Date().toISOString(),
    user: state.currentUser ? state.currentUser.name : "System",
    role: state.currentUser ? state.currentUser.role : "",
    action: action, details: details || ""
  });
  if (state.auditLog.length > 500) state.auditLog.length = 500;
}
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
  }, 2000);
}
function stopLiveSync(){
  if (_liveSyncTimer){ clearInterval(_liveSyncTimer); _liveSyncTimer = null; }
}

function pollOnce(){
  apiGetState(_lastKnownRev).then(function(res){
    if (!res.ok){
      if (res._httpStatus === 401){ sessionExpired(); }
      return;
    }
    if (res.authenticated === false){ sessionExpired(); return; }
    if (!res.changed) return;
    return prefetchMedia(res.state).then(function(){
      rehydrateMediaFields(res.state);
      var keepUser = state.currentUser, keepView = state.view, keepParams = state.viewParams;
      state = res.state;
      state.currentUser = keepUser; state.view = keepView; state.viewParams = keepParams;
      _lastKnownRev = res.revision;
      cacheStateLocally();
      toast("Updated from another device.");
      renderApp();
    });
  }).catch(function(){ /* transient network hiccup - next poll will retry */ });
}

function sessionExpired(){
  stopLiveSync();
  if (state) { state.currentUser = null; state.view = "login"; state.viewParams = {}; }
  clearLocalSession();
  toast("Your session has expired - please sign in again.", "warn");
  renderApp();
}

function scheduleSave(){
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 500);
}

function persistNow(){
  if (!state) return Promise.resolve();
  syncMediaFromState(state);
  var payload;
  try{ payload = JSON.parse(JSON.stringify(state)); }
  catch(e){ console.error("Could not serialize state for saving", e); return Promise.resolve(); }
  delete payload.currentUser; delete payload.view; delete payload.viewParams;
  applyMediaMarkers(payload);

  if (_saveInFlight){ _pendingSave = true; return Promise.resolve(); }
  _saveInFlight = true;

  return apiSaveState(payload, _lastKnownRev).then(function(result){
    _saveInFlight = false;
    if (!result.ok){
      if (result._httpStatus === 401){ sessionExpired(); return; }
      if (result._httpStatus === 403){
        toast(result.error || "You don't have permission to save that change.", "error");
        return;
      }
      toast("Could not save to the school server - check your internet connection.", "error");
      _pendingSave = true;
      return;
    }
    _lastKnownRev = result.revision;
    if (result.merged){
      rehydrateMediaFields(result.state);
      var keepUser = state.currentUser, keepView = state.view, keepParams = state.viewParams;
      state = result.state;
      state.currentUser = keepUser; state.view = keepView; state.viewParams = keepParams;
      toast("Some changes made elsewhere while you were away have been merged in alongside yours.", "warn");
      renderApp();
    }
    cacheStateLocally();
    if (_pendingSave){ _pendingSave = false; persistNow(); }
  }).catch(function(err){
    _saveInFlight = false;
    console.error("Save failed", err);
    toast("Could not save to the school server - check your internet connection.", "error");
    _pendingSave = true;
  });
}

window.addEventListener("online", function(){
  if (_pendingSave) persistNow();
});

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
/* ==========================================================================
   04 - ASSESSMENT / GRADING / RESULT CALCULATION ENGINE
   Handles: configurable assessment components & weights, configurable
   grading bands, blank vs absent vs excused vs zero, weighted totals,
   class averages and configurable ranking (competition/dense/ordinal).
   ========================================================================== */

var SCORE_STATES = { NONE:null, ABSENT:"ABSENT", EXCUSED:"EXCUSED" };

function getAssessmentScheme(subject, classArm){
  if (subject && subject.assessmentSchemeId){
    var forced = byId(state.assessmentSchemes, subject.assessmentSchemeId);
    if (forced) return forced;
  }
  var candidates = state.assessmentSchemes.filter(function(sc){
    return sc.sectionIds && sc.sectionIds.indexOf(classArm.sectionId) > -1;
  });
  return candidates[0] || state.assessmentSchemes[0];
}

function getGradingScheme(subject, classArm){
  if (subject && subject.gradingSchemeId){
    var forced = byId(state.gradingSchemes, subject.gradingSchemeId);
    if (forced) return forced;
  }
  var candidates = state.gradingSchemes.filter(function(sc){
    return sc.sectionIds && sc.sectionIds.indexOf(classArm.sectionId) > -1;
  });
  return candidates[0] || state.gradingSchemes[0];
}

function gradeFor(total, gradingScheme){
  if (!gradingScheme) return { grade:"-", remark:"", point:null };
  for (var i=0;i<gradingScheme.bands.length;i++){
    var b = gradingScheme.bands[i];
    if (total >= b.min && total <= b.max) return b;
  }
  return { grade:"-", remark:"", point:null };
}

function scoreKey(studentId, subjectId, classArmId, sessionId, termId){
  return [studentId, subjectId, classArmId, sessionId, termId].join("::");
}

function getScoreRecord(studentId, subjectId, classArmId, sessionId, termId){
  return state.scores.filter(function(s){
    return s.studentId===studentId && s.subjectId===subjectId && s.classArmId===classArmId &&
           s.sessionId===sessionId && s.termId===termId;
  })[0] || null;
}

function ensureScoreRecord(studentId, subjectId, classArmId, sessionId, termId){
  var rec = getScoreRecord(studentId, subjectId, classArmId, sessionId, termId);
  if (rec) return rec;
  rec = { id: uid("score"), studentId:studentId, subjectId:subjectId, classArmId:classArmId,
          sessionId:sessionId, termId:termId, components:{}, status:"DRAFT", updatedAt:Date.now() };
  state.scores.push(rec);
  return rec;
}

/* Computes the weighted total for one student's subject score record.
   Returns isComplete=false if any active component is blank (null/undefined) -
   blank never silently becomes 0. ABSENT/EXCUSED count as "complete" (handled)
   but contribute 0 to the total and are flagged separately. */
function computeSubjectTotal(rec, scheme){
  var total = 0, missing = [], hasAbsent = false, hasExcused = false, anyEntered = false;
  if (rec && rec.attendanceState==="ABSENT"){ return { total:0, isComplete:true, missingComponents:[], hasAbsent:true, hasExcused:false, anyEntered:false }; }
  if (rec && rec.attendanceState==="EXCUSED"){ return { total:0, isComplete:true, missingComponents:[], hasAbsent:false, hasExcused:true, anyEntered:false }; }
  scheme.components.filter(function(c){return c.active;}).forEach(function(c){
    var v = rec ? rec.components[c.id] : undefined;
    if (v === SCORE_STATES.ABSENT){ hasAbsent = true; return; }
    if (v === SCORE_STATES.EXCUSED){ hasExcused = true; return; }
    if (v === undefined || v === null || v === ""){ missing.push(c.name); return; }
    var num = Number(v);
    if (isNaN(num)) { missing.push(c.name); return; }
    anyEntered = true;
    var weighted = (num / c.maxScore) * c.weight;
    total += weighted;
  });
  total = Math.round(total * 100) / 100;
  return {
    total: total,
    isComplete: missing.length === 0,
    missingComponents: missing,
    hasAbsent: hasAbsent,
    hasExcused: hasExcused,
    anyEntered: anyEntered
  };
}

/* All students currently enrolled in a class-arm (active status only by default) */
function studentsInClassArm(classArmId, includeInactive){
  return state.students.filter(function(s){
    return s.classArmId === classArmId && (includeInactive || s.status==="Active" || s.status==="Repeated");
  });
}

/* subjects applicable to a class-arm in general (used for class-level lists
   like "which subjects does this class have" - not tied to one student) */
function subjectsForClassArm(classArm){
  return state.subjects.filter(function(su){
    if (!su.active) return false;
    var sectionOk = su.sectionIds.indexOf(classArm.sectionId) > -1;
    if (!sectionOk) return false;
    if (su.departmentIds && su.departmentIds.length){
      return classArm.departmentId && su.departmentIds.indexOf(classArm.departmentId) > -1;
    }
    return true;
  }).sort(function(a,b){ return (a.order||0)-(b.order||0); });
}

/* Whether a specific student takes a specific subject. Subjects with no
   department restriction apply to everyone. Department-restricted subjects
   use the student's own explicit subject selections if the Form Teacher has
   set any (student.subjectIds); otherwise they fall back to a simple
   department match, so students who've only had a Department set (not yet
   fine-tuned subject-by-subject) still work sensibly. */
function studentTakesSubject(student, subject){
  if (!subject.departmentIds || !subject.departmentIds.length) return true;
  if (student.subjectIds !== undefined && student.subjectIds !== null){
    return student.subjectIds.indexOf(subject.id) > -1;
  }
  return !!(student.departmentId && subject.departmentIds.indexOf(student.departmentId) > -1);
}

/* Subjects a SPECIFIC student takes. This is the one that matters for a
   student's own average/report card/score entry - it uses the STUDENT's own
   subject selections (falling back to department), not the class's. This is
   what makes mixed classes (e.g. one SS1 class with Science/Arts/Commercial
   students together) work correctly: a subject with no department
   restriction applies to everyone (general/compulsory subjects); a subject
   restricted to one or more departments only applies to students who
   personally take it, regardless of what department (if any) the class
   itself is tagged with. */
function subjectsForStudent(student, classArm){
  return state.subjects.filter(function(su){
    if (!su.active) return false;
    if (su.sectionIds.indexOf(classArm.sectionId) === -1) return false;
    return studentTakesSubject(student, su);
  }).sort(function(a,b){ return (a.order||0)-(b.order||0); });
}

/* Which students in a class-arm actually take a given subject. */
function studentsForSubject(subject, classArmId){
  var all = studentsInClassArm(classArmId);
  if (!subject.departmentIds || !subject.departmentIds.length) return all;
  return all.filter(function(stu){ return studentTakesSubject(stu, subject); });
}

/* Builds a full results table for one class-arm/subject/session/term:
   rows = [{student, rec, scheme, total, grade, ...}], with class average
   and position computed with the configured tie method. */
function computeSubjectClassResults(classArmId, subjectId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var subject = byId(state.subjects, subjectId);
  var scheme = getAssessmentScheme(subject, classArm);
  var grading = getGradingScheme(subject, classArm);
  var students = studentsForSubject(subject, classArmId);

  var rows = students.map(function(stu){
    var rec = getScoreRecord(stu.id, subjectId, classArmId, sessionId, termId);
    var calc = computeSubjectTotal(rec, scheme);
    var band = calc.isComplete && !calc.hasAbsent && !calc.hasExcused ? gradeFor(calc.total, grading) : { grade:"-", remark:"", point:null };
    return { student: stu, rec: rec, calc: calc, grade: band.grade, remark: band.remark };
  });

  var completeRows = rows.filter(function(r){ return r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused; });
  var classAverage = completeRows.length
    ? Math.round((completeRows.reduce(function(a,r){return a+r.calc.total;},0) / completeRows.length) * 100) / 100
    : null;

  assignPositions(rows, function(r){ return r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused ? r.calc.total : null; });

  return { classArm: classArm, subject: subject, scheme: scheme, grading: grading, rows: rows, classAverage: classAverage };
}

/* Generic position assignment supporting competition/dense/ordinal tie methods.
   valueFn(row) should return a number to rank by, or null to exclude from ranking. */
function assignPositions(rows, valueFn){
  var method = (state.rankingConfig && state.rankingConfig.tieMethod) || "competition";
  var ranked = rows.map(function(r, idx){ return { r:r, v: valueFn(r), idx: idx }; })
                   .filter(function(x){ return x.v !== null && x.v !== undefined; })
                   .sort(function(a,b){ return b.v - a.v; });

  var lastValue = null, lastPosition = 0;
  ranked.forEach(function(entry, i){
    var position;
    if (method === "ordinal"){
      position = i + 1;
    } else if (method === "dense"){
      if (entry.v !== lastValue){ lastPosition += 1; }
      position = lastPosition;
    } else { // competition (1,2,2,4)
      if (entry.v !== lastValue){ lastPosition = i + 1; }
      position = lastPosition;
    }
    lastValue = entry.v;
    entry.r.position = position;
  });
  rows.forEach(function(r){ if (r.position === undefined) r.position = null; });
}

/* Full student overall summary across all applicable subjects for a term,
   used on report cards and the Form Teacher review screen. */
function computeStudentOverall(studentId, classArmId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var student = byId(state.students, studentId);
  var applicable = subjectsForStudent(student, classArm);
  var subjectRows = applicable.map(function(subject){
    var scheme = getAssessmentScheme(subject, classArm);
    var grading = getGradingScheme(subject, classArm);
    var rec = getScoreRecord(studentId, subject.id, classArmId, sessionId, termId);
    var calc = computeSubjectTotal(rec, scheme);
    var band = calc.isComplete && !calc.hasAbsent && !calc.hasExcused ? gradeFor(calc.total, grading) : { grade:"-", remark:"", point:null };
    return { subject: subject, calc: calc, grade: band.grade, remark: band.remark };
  });

  var forAverage = subjectRows.filter(function(r){ return r.subject.includeInAverage; });
  var complete = forAverage.filter(function(r){ return r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused; });
  var grandTotal = complete.reduce(function(a,r){ return a + r.calc.total; }, 0);
  var average = complete.length ? Math.round((grandTotal / complete.length) * 100) / 100 : null;
  var allComplete = forAverage.length > 0 && complete.length === forAverage.length;

  return { subjectRows: subjectRows, grandTotal: Math.round(grandTotal*100)/100, average: average, allComplete: allComplete,
           totalSubjects: forAverage.length, completedSubjects: complete.length };
}

/* Whole-class overview used by Form Teacher review + Admin approval screens */
function computeClassOverview(classArmId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var subjects = subjectsForClassArm(classArm);
  var students = studentsInClassArm(classArmId);

  var subjectStatuses = subjects.map(function(su){
    var key = [classArmId, su.id, sessionId, termId].join("::");
    var teacherAssign = state.teacherAssignments.filter(function(a){
      return a.subjectId===su.id && a.classArmId===classArmId && a.active && a.sessionId===sessionId && a.termId===termId;
    })[0];
    var status = state.classSubjectStatus[key] || (teacherAssign ? "PENDING" : "UNASSIGNED");
    var eligible = studentsForSubject(su, classArmId);
    var entered = eligible.filter(function(stu){
      var rec = getScoreRecord(stu.id, su.id, classArmId, sessionId, termId);
      return rec && (Object.keys(rec.components).length > 0);
    }).length;
    return { subject: su, status: status, teacherId: teacherAssign ? teacherAssign.teacherId : null,
              entered: entered, totalStudents: eligible.length };
  });

  var overallRows = students.map(function(stu){
    var overall = computeStudentOverall(stu.id, classArmId, sessionId, termId);
    return { student: stu, overall: overall };
  });
  assignPositions(overallRows, function(r){ return r.overall.allComplete ? r.overall.average : null; });

  var classAverage = null;
  var completeOverall = overallRows.filter(function(r){ return r.overall.allComplete; });
  if (completeOverall.length){
    classAverage = Math.round((completeOverall.reduce(function(a,r){return a+r.overall.average;},0)/completeOverall.length)*100)/100;
  }

  return { classArm: classArm, subjects: subjects, subjectStatuses: subjectStatuses, students: overallRows, classAverage: classAverage };
}

/* One subject's class-average + this specific student's position within it
   (used on the report card's per-subject Class Average / Position columns) */
function getSubjectStatForStudent(classArmId, subjectId, sessionId, termId, studentId){
  var res = computeSubjectClassResults(classArmId, subjectId, sessionId, termId);
  var row = res.rows.filter(function(r){ return r.student.id === studentId; })[0];
  return { classAverage: res.classAverage, position: row ? row.position : null, totalStudents: res.rows.length };
}

function calcAge(dobStr){
  if (!dobStr) return "";
  var dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return "";
  var diffMs = Date.now() - dob.getTime();
  var age = Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
  return age >= 0 && age < 100 ? age : "";
}
/* ==========================================================================
   05 - APP SHELL: layout, navigation, router, global event delegation
   ========================================================================== */

var NAV_ITEMS = [
  { id:"dashboard", label:"Dashboard", icon:"grid", roles:"ALL" },
  { id:"students", label:"Students", icon:"users", roles:"ALL" },
  { id:"teachers", label:"Teachers", icon:"id", roles:["SUPER_ADMIN","ADMIN","PRINCIPAL","ACADEMIC_SUPERVISOR"] },
  { id:"score-entry", label:"Score Entry", icon:"pencil", roles:"ALL" },
  { id:"form-review", label:"Class Review", icon:"check", roles:"ALL" },
  { id:"approvals", label:"Approvals", icon:"stamp", roles:["SUPER_ADMIN","ADMIN","PRINCIPAL","ACADEMIC_SUPERVISOR"] },
  { id:"reports", label:"Report Cards", icon:"doc", roles:"ALL" },
  { id:"analytics", label:"Analytics", icon:"chart", roles:["SUPER_ADMIN","ADMIN","PRINCIPAL","ACADEMIC_SUPERVISOR"] },
  { id:"settings", label:"Settings", icon:"gear", roles:["SUPER_ADMIN","ADMIN"] },
  { id:"audit", label:"Audit Log", icon:"clock", roles:["SUPER_ADMIN","ADMIN"] }
];

var ADMIN_MOBILE_PRIORITY = ["dashboard","approvals","reports","teachers","students","settings","analytics","audit"];
var TEACHER_MOBILE_PRIORITY = ["dashboard","students","score-entry","form-review","reports","settings"];

function mobileNavIdsFor(user){
  var visible = navVisibleFor(user);
  var priority = isWholeSchoolRole(user.role) ? ADMIN_MOBILE_PRIORITY : TEACHER_MOBILE_PRIORITY;
  return priority.filter(function(id){ return visible.some(function(n){ return n.id===id; }); }).slice(0,5);
}

function navVisibleFor(user){
  return NAV_ITEMS.filter(function(n){
    if (n.roles==="ALL") return true;
    return n.roles.indexOf(user.role) > -1;
  });
}

function ICONS(name){
  var paths = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c2.7.2 4.8 2.6 4.8 5.8"/>',
    id:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.5-1.8 1.8-2.8 3-2.8s2.5 1 3 2.8"/><path d="M14 9h5M14 13h5"/>',
    pencil:'<path d="M4 20l1-4 11-11 3 3-11 11-4 1z"/><path d="M14 6l3 3"/>',
    check:'<path d="M4 12l5 5L20 6"/>',
    stamp:'<rect x="6" y="14" width="12" height="6" rx="1"/><path d="M9 14v-3a3 3 0 016 0v3"/><path d="M4 20h16"/>',
    doc:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h6"/>',
    chart:'<path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2 20h20"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.6 1z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    logout:'<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    camera:'<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="14" r="3.5"/>',
    trash:'<path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/>',
    x:'<path d="M5 5l14 14M19 5L5 19"/>'
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="icon">'+(paths[name]||'')+'</svg>';
}

function renderApp(){
  var root = el("app-root");
  if (!state.currentUser || state.view==="login"){
    root.innerHTML = renderLoginView();
    bindLoginEvents();
    return;
  }
  root.innerHTML = renderShell();
  var content = el("view-content");
  content.innerHTML = renderCurrentView();
  bindGlobalEvents();
  if (typeof afterRenderHook === "function") afterRenderHook();
}

function renderShell(){
  var user = state.currentUser;
  var nav = navVisibleFor(user);
  var navHtml = nav.map(function(n){
    var active = state.view===n.id ? " active" : "";
    return '<button class="nav-item'+active+'" data-action="goto" data-view="'+n.id+'">'+ICONS(n.icon)+'<span>'+n.label+'</span></button>';
  }).join("");

  var mobileNav = mobileNavIdsFor(user)
    .map(function(id){
      var n = NAV_ITEMS.filter(function(x){return x.id===id;})[0];
      var active = state.view===id ? " active" : "";
      return '<button class="mnav-item'+active+'" data-action="goto" data-view="'+id+'">'+ICONS(n.icon)+'<span>'+n.label+'</span></button>';
    }).join("");

  var sessionOptions = state.sessions.map(function(s){
    return '<option value="'+s.id+'"'+(s.id===state.currentSessionId?' selected':'')+'>'+escapeHtml(s.name)+'</option>';
  }).join("");
  var termOptions = state.terms.filter(function(t){return t.sessionId===state.currentSessionId;}).map(function(t){
    return '<option value="'+t.id+'"'+(t.id===state.currentTermId?' selected':'')+'>'+escapeHtml(t.name)+'</option>';
  }).join("");

  return ''+
  '<header class="topbar">'+
    '<div class="topbar-left">'+
      '<button class="icon-btn hide-desktop" data-action="toggle-sidebar" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>'+
      '<div class="brand">'+
        (state.school.logo ? '<img src="'+state.school.logo+'" class="brand-logo"/>' : '<div class="brand-logo brand-logo-fallback">'+escapeHtml((state.school.name||"L")[0])+'</div>')+
        '<div class="brand-text"><strong>'+escapeHtml(state.school.name)+'</strong><span>Result Management</span></div>'+
      '</div>'+
    '</div>'+
    '<div class="topbar-right">'+
      '<select class="pill-select hide-mobile" data-action="change-session">'+sessionOptions+'</select>'+
      '<select class="pill-select hide-mobile" data-action="change-term">'+termOptions+'</select>'+
      '<div class="user-menu">'+
        '<button class="user-chip" data-action="toggle-user-menu">'+
          '<span class="avatar-sm">'+escapeHtml(user.name.split(" ").map(function(w){return w[0];}).slice(0,2).join(""))+'</span>'+
          '<span class="hide-mobile">'+escapeHtml(user.name)+'</span>'+
        '</button>'+
        '<div class="user-dropdown" id="user-dropdown" style="display:none">'+
          '<div class="user-dropdown-role">'+ROLE_LABELS[user.role]+'</div>'+
          '<button class="dropdown-item" data-action="goto" data-view="settings" data-tab="profile">My Profile</button>'+
          '<button class="dropdown-item install-app-btn" style="display:'+(installPromptAvailable?'':'none')+'" onclick="triggerInstall()">'+ICONS("plus")+' Install App</button>'+
          '<button class="dropdown-item danger" data-action="logout">'+ICONS("logout")+' Logout</button>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</header>'+
  '<div class="app-body">'+
    '<nav class="sidebar" id="sidebar">'+navHtml+'</nav>'+
    '<main class="content" id="view-content"></main>'+
  '</div>'+
  '<nav class="mobile-nav">'+mobileNav+'</nav>';
}

function renderCurrentView(){
  try{
    switch(state.view){
      case "dashboard": return renderDashboard();
      case "students": return renderStudentsView();
      case "student-profile": return renderStudentProfile();
      case "teachers": return renderTeachersView();
      case "score-entry": return renderScoreEntryView();
      case "form-review": return renderFormReviewView();
      case "approvals": return renderApprovalsView();
      case "reports": return renderReportsView();
      case "analytics": return renderAnalyticsView();
      case "settings": return renderSettingsView();
      case "audit": return renderAuditView();
      default: return renderDashboard();
    }
  }catch(err){
    console.error(err);
    if (err && err.message==="PERMISSION_DENIED"){
      return '<div class="empty-state"><h3>Access denied</h3><p>You do not have permission to view this page.</p></div>';
    }
    return '<div class="empty-state"><h3>Something went wrong rendering this page.</h3><p>'+escapeHtml(err.message)+'</p></div>';
  }
}

/* ---------- global event delegation ---------- */
function bindGlobalEvents(){
  var root = el("app-root");
  root.onclick = function(e){
    var t = e.target.closest("[data-action]");
    if (!t) return;
    var action = t.dataset.action;
    if (GLOBAL_ACTIONS[action]) { GLOBAL_ACTIONS[action](t, e); return; }
    if (typeof window[action] === "function") { window[action](t, e); return; }
  };
  root.onchange = function(e){
    var t = e.target.closest("[data-action]");
    if (!t) return;
    var action = t.dataset.action;
    if (GLOBAL_ACTIONS[action]) { GLOBAL_ACTIONS[action](t, e); return; }
    if (typeof window[action] === "function") { window[action](t, e); return; }
  };
}

var GLOBAL_ACTIONS = {
  "goto": function(t){ goto(t.dataset.view, { tab: t.dataset.tab }); },
  "toggle-sidebar": function(){ el("sidebar").classList.toggle("open"); },
  "toggle-user-menu": function(){
    var d = el("user-dropdown");
    d.style.display = d.style.display==="none" ? "block" : "none";
  },
  "logout": function(){ logout(); },
  "change-session": function(t){
    state.currentSessionId = t.value;
    var firstTerm = state.terms.filter(function(x){return x.sessionId===t.value;})[0];
    if (firstTerm) state.currentTermId = firstTerm.id;
    scheduleSave(); renderApp();
  },
  "change-term": function(t){ state.currentTermId = t.value; scheduleSave(); renderApp(); }
};

document.addEventListener("click", function(e){
  if (!e.target.closest(".user-menu")){
    var d = el("user-dropdown");
    if (d) d.style.display = "none";
  }
});
/* ==========================================================================
   05b - GENERIC MODAL SYSTEM
   ========================================================================== */

function openModal(innerHtml, opts){
  var root = el("modal-root");
  root.innerHTML = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal-card'+(opts&&opts.wide?' modal-wide':'')+'">'+innerHtml+'</div></div>';
  root.style.display = "block";
  document.body.style.overflow = "hidden";
}
function closeModal(){
  var root = el("modal-root");
  root.innerHTML = "";
  root.style.display = "none";
  document.body.style.overflow = "";
}
/* ==========================================================================
   06 - LOGIN VIEW
   ========================================================================== */

var DEMO_ACCOUNTS_DISPLAY = [
  { u:"superadmin", label:"Super Admin" },
  { u:"admin", label:"Admin" },
  { u:"principal", label:"Principal" },
  { u:"supervisor", label:"Academic Supervisor" },
  { u:"teachera", label:"Teacher (Mr. Ahmad - English, JSS1A/B)" },
  { u:"teacherb", label:"Teacher (Mrs. Bimpe - Maths, JSS1A)" },
  { u:"teacherc", label:"Teacher + Form Teacher (Mrs. Aisha - JSS1A)" }
];

function renderLoginView(){
  var demoRows = DEMO_ACCOUNTS_DISPLAY.map(function(a){
    return '<button class="demo-account" data-action="fill-demo" data-username="'+a.u+'">'+
      '<strong>'+a.u+'</strong><span>'+a.label+'</span></button>';
  }).join("");

  return ''+
  '<div class="login-screen">'+
    '<div class="login-card">'+
      '<div class="login-brand">'+
        (state.school.logo ? '<img src="'+state.school.logo+'" class="login-logo"/>' : '<div class="login-logo login-logo-fallback">'+escapeHtml((state.school.name||"L")[0])+'</div>')+
        '<h1>'+escapeHtml(state.school.name)+'</h1>'+
        '<p>'+escapeHtml(state.school.motto||"")+'</p>'+
      '</div>'+
      '<form id="login-form">'+
        '<label class="field-label">Username</label>'+
        '<input type="text" id="login-username" class="field-input" placeholder="e.g. admin" autocomplete="username" required/>'+
        '<label class="field-label">Password</label>'+
        '<div class="password-wrap">'+
          '<input type="password" id="login-password" class="field-input" placeholder="Enter password" autocomplete="current-password" required/>'+
          '<button type="button" class="password-toggle" id="pw-toggle">Show</button>'+
        '</div>'+
        '<div id="login-error" class="login-error" style="display:none"></div>'+
        '<button type="submit" class="btn btn-primary btn-block" id="login-submit">Sign In</button>'+
      '</form>'+
      '<div class="login-demo-note">Tap an account to autofill (password: <code>demo123</code>)</div>'+
      '<div class="demo-accounts">'+demoRows+'</div>'+
      '<button class="btn btn-secondary btn-block install-app-btn" style="display:'+(installPromptAvailable?'':'none')+';margin-top:14px" onclick="triggerInstall()">'+ICONS("plus")+' Install App</button>'+
    '</div>'+
    '<div class="login-footer">Live shared database — changes sync across every device in real time.</div>'+
  '</div>';
}

function bindLoginEvents(){
  var form = el("login-form");
  form.addEventListener("submit", function(e){
    e.preventDefault();
    var u = el("login-username").value.trim();
    var p = el("login-password").value;
    var submitBtn = el("login-submit");
    var err = el("login-error");
    err.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing In...";
    tryLogin(u, p).then(function(result){
      if (result.ok){ renderApp(); return; }
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
      err.textContent = result.error;
      err.style.display = "block";
    });
  });
  el("pw-toggle").addEventListener("click", function(){
    var pw = el("login-password");
    var showing = pw.type === "text";
    pw.type = showing ? "password" : "text";
    this.textContent = showing ? "Show" : "Hide";
  });
  qsa(".demo-account").forEach(function(btn){
    btn.addEventListener("click", function(){
      el("login-username").value = btn.dataset.username;
      el("login-password").value = "demo123";
    });
  });
}
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
/* ==========================================================================
   08 - STUDENTS: list, add/edit, bulk import, photo, movement, profile page
   ========================================================================== */

var REQUIRED_CORE_FIELDS = ["name","gender","dob","guardianPhone","address"];
var FIELD_LABELS = { name:"Full name", gender:"Gender", dob:"Date of birth", guardianPhone:"Parent/Guardian phone", address:"Address", photo:"Photo" };

/* Which classes show up in the Students list / Report Cards list for this
   person. Deliberately Form-Teacher-only (not subject-taught classes) - see
   canAccessClassArm's note for why. */
function accessibleClassArmIds(user){
  if (isWholeSchoolRole(user.role)) return state.classArms.map(function(c){return c.id;});
  return myFormClassArmIds(user.id);
}

function studentMissingFields(stu){
  var missing = [];
  REQUIRED_CORE_FIELDS.forEach(function(f){
    if (!stu[f] || String(stu[f]).trim()==="") missing.push(FIELD_LABELS[f]);
  });
  state.customFieldDefs.filter(function(cf){
    return cf.active && cf.required && (!cf.sectionIds || !cf.sectionIds.length || cf.sectionIds.indexOf(stu.sectionId)>-1);
  }).forEach(function(cf){
    if (!stu.customFields[cf.id] || String(stu.customFields[cf.id]).trim()==="") missing.push(cf.name);
  });
  return missing;
}

function renderStudentsView(){
  var user = state.currentUser;
  var allowedIds = accessibleClassArmIds(user);
  var vp = state.viewParams || {};
  var filterSection = vp.filterSection || "";
  var filterClass = vp.filterClass || "";
  var filterStatus = vp.filterStatus || "";
  var search = vp.search || "";

  var arms = state.classArms.filter(function(c){ return c.active && allowedIds.indexOf(c.id)>-1; });
  var armsFiltered = arms.filter(function(c){ return !filterSection || c.sectionId===filterSection; });

  var students = state.students.filter(function(s){ return allowedIds.indexOf(s.classArmId)>-1; });
  if (filterSection) students = students.filter(function(s){return s.sectionId===filterSection;});
  if (filterClass) students = students.filter(function(s){return s.classArmId===filterClass;});
  if (filterStatus) students = students.filter(function(s){return s.status===filterStatus;});
  if (search) {
    var q = search.toLowerCase();
    students = students.filter(function(s){ return s.name.toLowerCase().indexOf(q)>-1 || s.admissionNo.toLowerCase().indexOf(q)>-1; });
  }
  students = students.sort(function(a,b){ return a.name.localeCompare(b.name); });

  var sectionOptions = '<option value="">All Sections</option>' + state.sections.map(function(s){
    return '<option value="'+s.id+'"'+(filterSection===s.id?' selected':'')+'>'+escapeHtml(s.name)+'</option>';
  }).join("");
  var classOptions = '<option value="">All Classes</option>' + armsFiltered.map(function(c){
    return '<option value="'+c.id+'"'+(filterClass===c.id?' selected':'')+'>'+escapeHtml(c.name)+'</option>';
  }).join("");
  var statusOptions = ["Active","Inactive","Graduated","Transferred","Repeated"].map(function(s){
    return '<option value="'+s+'"'+(filterStatus===s?' selected':'')+'>'+s+'</option>';
  }).join("");

  var canAddAny = arms.some(function(c){ return isFormTeacherOf(user, c.id) || isWholeSchoolRole(user.role); });

  var rows = students.map(function(stu){
    var missing = studentMissingFields(stu);
    var ca = byId(state.classArms, stu.classArmId);
    var canEdit = isFormTeacherOf(user, stu.classArmId);
    var photoHtml = stu.photo ? '<img src="'+stu.photo+'" class="avatar-photo"/>' : '<div class="avatar-photo avatar-fallback">'+escapeHtml(stu.name[0])+'</div>';
    return '<tr>'+
      '<td>'+photoHtml+'</td>'+
      '<td><strong>'+escapeHtml(stu.name)+'</strong><div class="muted small">'+escapeHtml(stu.admissionNo)+'</div></td>'+
      '<td>'+escapeHtml(stu.gender||"—")+'</td>'+
      '<td>'+escapeHtml(ca?ca.name:"—")+(stu.departmentId?'<div class="muted small">'+escapeHtml(departmentName(stu.departmentId))+'</div>':'')+'</td>'+
      '<td><span class="status-badge status-'+stu.status.toLowerCase()+'">'+stu.status+'</span></td>'+
      '<td>'+(missing.length===0 ? '<span class="chip chip-good">Complete</span>' : '<span class="chip chip-warn">'+missing.length+' field'+(missing.length>1?'s':'')+' missing</span>')+'</td>'+
      '<td class="actions-cell">'+
        '<button class="btn btn-sm btn-ghost" onclick="viewStudentProfile(\''+stu.id+'\')">View</button>'+
        (canEdit ? '<button class="btn btn-sm btn-ghost" onclick="openStudentForm(\''+stu.id+'\')">Edit</button>' : '')+
        (canEdit ? '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="deleteStudent(\''+stu.id+'\')">Delete</button>' : '')+
      '</td>'+
    '</tr>';
  }).join("");

  return ''+
  '<div class="page-header page-header-row">'+
    '<div><h2>Students</h2><p>'+students.length+' student'+(students.length===1?'':'s')+' visible to you</p></div>'+
    (canAddAny ? '<div class="page-header-actions">'+
      '<button class="btn btn-secondary" onclick="openBulkImport()">Import / Bulk Add</button>'+
      '<button class="btn btn-primary" onclick="openStudentForm(null)">'+ICONS("plus")+' Add Student</button>'+
    '</div>' : '')+
  '</div>'+
  '<div class="filter-bar">'+
    '<select onchange="updateStudentFilter(\'filterSection\', this.value)">'+sectionOptions+'</select>'+
    '<select onchange="updateStudentFilter(\'filterClass\', this.value)">'+classOptions+'</select>'+
    '<select onchange="updateStudentFilter(\'filterStatus\', this.value)">'+'<option value="">All Statuses</option>'+statusOptions+'</select>'+
    '<input type="search" placeholder="Search name or admission no." value="'+escapeHtml(search)+'" oninput="updateStudentFilter(\'search\', this.value)"/>'+
  '</div>'+
  '<div class="card">'+
    (students.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Photo</th><th>Name</th><th>Gender</th><th>Class</th><th>Status</th><th>Profile</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
     : '<div class="empty-state"><h3>No students found</h3><p>Try adjusting your filters, or add a new student.</p></div>')+
  '</div>';
}

function updateStudentFilter(key, value){
  state.viewParams = state.viewParams || {};
  state.viewParams[key] = value;
  renderApp();
}

function viewStudentProfile(id){ goto("student-profile", { studentId: id }); }

function deleteStudent(studentId){
  var user = state.currentUser;
  var stu = byId(state.students, studentId);
  if (!stu) return;
  assertPermission(isFormTeacherOf(user, stu.classArmId), "You can only delete students in your assigned class.");
  if (!window.confirm("Permanently delete "+stu.name+"? This removes their profile and all recorded scores/comments. This cannot be undone.")) return;
  if (!window.confirm("Are you absolutely sure? Historical results for this student will be lost.")) return;

  state.students = state.students.filter(function(s){ return s.id !== studentId; });
  state.scores = state.scores.filter(function(s){ return s.studentId !== studentId; });
  Object.keys(state.studentComments).forEach(function(k){ if (k.indexOf(studentId+"::")===0) delete state.studentComments[k]; });
  Object.keys(state.domainScores).forEach(function(k){ if (k.indexOf(studentId+"::")===0) delete state.domainScores[k]; });
  Object.keys(state.attendance).forEach(function(k){ if (k.indexOf(studentId+"::")===0) delete state.attendance[k]; });

  addAudit(state, "Student deleted", stu.name);
  toast("Student deleted.");
  if (state.view==="student-profile") goto("students");
  else { scheduleSave(); renderApp(); }
}

/* ---------- Add / Edit student modal ---------- */
function openStudentForm(studentId){
  var user = state.currentUser;
  var stu = studentId ? byId(state.students, studentId) : null;
  if (stu){ assertPermission(isFormTeacherOf(user, stu.classArmId), "You can only edit students in your assigned class."); }

  var allowedIds = accessibleClassArmIds(user);
  var myArms = state.classArms.filter(function(c){ return c.active && (isWholeSchoolRole(user.role) || myFormClassArmIds(user.id).indexOf(c.id)>-1); });
  var classArmId = stu ? stu.classArmId : (myArms[0] ? myArms[0].id : "");
  var section = byId(state.classArms, classArmId) ? byId(state.classArms, classArmId).sectionId : "";

  var classOptions = myArms.map(function(c){
    return '<option value="'+c.id+'" data-section="'+c.sectionId+'"'+(c.id===classArmId?' selected':'')+'>'+escapeHtml(c.name)+' ('+sectionName(c.sectionId)+')</option>';
  }).join("");

  var deptOptions = renderDeptOptionsFor(section, stu ? stu.departmentId : null);

  var html = ''+
  '<div class="modal-header"><h3>'+(stu?"Edit Student":"Add Student")+'</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    '<div class="photo-uploader">'+
      '<div class="photo-preview" id="photo-preview">'+(stu&&stu.photo?'<img src="'+stu.photo+'"/>':'<span>'+ICONS("camera")+'</span>')+'</div>'+
      '<input type="file" accept="image/*" id="photo-input" style="display:none" onchange="handlePhotoSelect(event)"/>'+
      '<div class="photo-actions">'+
        '<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById(\'photo-input\').click()">Upload Photo</button>'+
        (stu&&stu.photo?'<button type="button" class="btn btn-sm btn-ghost" onclick="clearPhotoPreview()">Remove</button>':'')+
      '</div>'+
    '</div>'+
    '<div class="form-grid">'+
      '<div><label class="field-label">Full Name *</label><input class="field-input" id="f-name" value="'+escapeHtml(stu?stu.name:'')+'"/></div>'+
      '<div><label class="field-label">Admission No.</label><input class="field-input" id="f-adm" value="'+escapeHtml(stu?stu.admissionNo:'LB/'+Math.floor(1000+Math.random()*9000))+'"/></div>'+
      '<div><label class="field-label">Gender *</label><select class="field-input" id="f-gender">'+
        '<option value="">Select</option><option value="Male"'+(stu&&stu.gender==="Male"?' selected':'')+'>Male</option><option value="Female"'+(stu&&stu.gender==="Female"?' selected':'')+'>Female</option></select></div>'+
      '<div><label class="field-label">Date of Birth *</label><input type="date" class="field-input" id="f-dob" value="'+(stu?stu.dob:'')+'"/></div>'+
      '<div><label class="field-label">Class / Arm *</label><select class="field-input" id="f-classarm" onchange="onFormClassChange(this.value)">'+classOptions+'</select></div>'+
      '<div id="f-dept-wrap">'+deptOptions+'</div>'+
      '<div><label class="field-label">Parent/Guardian Phone *</label><input class="field-input" id="f-phone" value="'+escapeHtml(stu?stu.guardianPhone:'')+'"/></div>'+
      '<div><label class="field-label">Status</label><select class="field-input" id="f-status">'+
        ["Active","Inactive","Graduated","Transferred","Repeated"].map(function(s){return '<option value="'+s+'"'+(stu&&stu.status===s?' selected':(!stu&&s==="Active"?' selected':''))+'>'+s+'</option>';}).join("")+
      '</select></div>'+
      '<div class="span-2"><label class="field-label">Address *</label><input class="field-input" id="f-address" value="'+escapeHtml(stu?stu.address:'')+'"/></div>'+
    '</div>'+
    '<div id="f-subjects-wrap">'+renderSubjectChecklistFor(section, stu?stu.departmentId:null, stu?stu.subjectIds:undefined)+'</div>'+
  '</div>'+
  '<div class="modal-footer">'+
    '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveStudentForm('+(stu?"'"+stu.id+"'":"null")+')">Save</button>'+
  '</div>';
  openModal(html, {wide:true});
}

function renderDeptOptionsFor(sectionId, selectedDeptId){
  var depts = state.departments.filter(function(d){ return d.active && d.sectionId===sectionId; });
  if (!depts.length) return "";
  return '<div><label class="field-label">Department / Category</label><select class="field-input" id="f-dept" onchange="onFormDeptChange(this.value)">'+
    '<option value="">None</option>'+
    depts.map(function(d){ return '<option value="'+d.id+'"'+(d.id===selectedDeptId?' selected':'')+'>'+escapeHtml(d.name)+'</option>'; }).join("")+
    '</select></div>';
}

/* Checklist of department-restricted subjects a student can individually
   take/not-take - lets a Form Teacher fine-tune beyond just "Department"
   (e.g. a Science student who also takes Government, or skips Chemistry).
   Compulsory/general subjects (no department restriction) aren't shown here
   since they always apply to everyone automatically. */
function renderSubjectChecklistFor(sectionId, deptId, explicitSubjectIds){
  var deptSubjects = state.subjects.filter(function(su){
    return su.active && su.sectionIds.indexOf(sectionId)>-1 && su.departmentIds && su.departmentIds.length;
  });
  if (!deptSubjects.length) return "";
  var byDept = {};
  deptSubjects.forEach(function(su){
    su.departmentIds.forEach(function(dId){
      if (!byDept[dId]) byDept[dId] = [];
      byDept[dId].push(su);
    });
  });
  var groupsHtml = Object.keys(byDept).map(function(dId){
    var dept = byId(state.departments, dId);
    var checks = byDept[dId].map(function(su){
      var checked = explicitSubjectIds !== undefined && explicitSubjectIds !== null
        ? explicitSubjectIds.indexOf(su.id) > -1
        : (deptId === dId);
      return '<label class="check-chip"><input type="checkbox" class="stu-subject-check" value="'+su.id+'" '+(checked?'checked':'')+'/> '+escapeHtml(su.name)+'</label>';
    }).join("");
    return '<div><span class="muted small">'+escapeHtml(dept?dept.name:"")+'</span><div class="check-chip-group">'+checks+'</div></div>';
  }).join("");
  return '<label class="field-label" style="margin-top:14px">Individual Subjects (fine-tune beyond Department - useful for mixed classes)</label>'+groupsHtml;
}

function onFormClassChange(classArmId){
  var ca = byId(state.classArms, classArmId);
  el("f-dept-wrap").innerHTML = renderDeptOptionsFor(ca.sectionId, null);
  el("f-subjects-wrap").innerHTML = renderSubjectChecklistFor(ca.sectionId, null, undefined);
}
function onFormDeptChange(deptId){
  var classArmId = el("f-classarm").value;
  var ca = byId(state.classArms, classArmId);
  el("f-subjects-wrap").innerHTML = renderSubjectChecklistFor(ca.sectionId, deptId, undefined);
}

var _pendingPhotoDataUrl = null;
function handlePhotoSelect(e){
  var file = e.target.files[0];
  if (!file) return;
  if (!file.type.match(/^image\//)){ toast("Please select an image file.", "error"); return; }
  if (file.size > 3*1024*1024){ toast("Image is too large (max 3MB).", "error"); return; }
  var reader = new FileReader();
  reader.onload = function(){
    compressImage(reader.result, 300, function(compressed){
      _pendingPhotoDataUrl = compressed;
      el("photo-preview").innerHTML = '<img src="'+compressed+'"/>';
    });
  };
  reader.readAsDataURL(file);
}
function clearPhotoPreview(){
  _pendingPhotoDataUrl = "REMOVE";
  el("photo-preview").innerHTML = '<span>'+ICONS("camera")+'</span>';
}
function compressImage(dataUrl, maxDim, cb){
  var img = new Image();
  img.onload = function(){
    var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    var canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width*scale); canvas.height = Math.round(img.height*scale);
    var ctx = canvas.getContext("2d");
    // Fill white first: JPEG has no transparency, so any transparent pixels
    // (common in signature/logo scans) would otherwise flatten to BLACK.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    cb(canvas.toDataURL("image/jpeg", 0.82));
  };
  img.src = dataUrl;
}

function saveStudentForm(studentId){
  var user = state.currentUser;
  var name = el("f-name").value.trim();
  if (!name){ toast("Full name is required.", "error"); return; }
  var classArmId = el("f-classarm").value;
  if (!classArmId){ toast("Please select a class.", "error"); return; }
  assertPermission(isFormTeacherOf(user, classArmId), "You can only add/edit students in your assigned class.");
  var ca = byId(state.classArms, classArmId);
  var deptEl = el("f-dept");

  var data = {
    name: name,
    admissionNo: el("f-adm").value.trim(),
    gender: el("f-gender").value,
    dob: el("f-dob").value,
    classArmId: classArmId,
    sectionId: ca.sectionId,
    departmentId: deptEl ? (deptEl.value||null) : null,
    guardianPhone: el("f-phone").value.trim(),
    address: el("f-address").value.trim(),
    status: el("f-status").value
  };
  var subjectChecks = qsa(".stu-subject-check");
  if (subjectChecks.length){
    data.subjectIds = subjectChecks.filter(function(c){return c.checked;}).map(function(c){return c.value;});
  }

  if (studentId){
    var stu = byId(state.students, studentId);
    var moved = stu.classArmId !== classArmId;
    Object.assign(stu, data);
    if (_pendingPhotoDataUrl==="REMOVE"){ stu.photo=""; }
    else if (_pendingPhotoDataUrl){ stu.photo = _pendingPhotoDataUrl; }
    if (moved){
      stu.enrollmentHistory.push({ sessionId: state.currentSessionId, classArmId: classArmId, sectionId: ca.sectionId, departmentId: data.departmentId });
      addAudit(state, "Student moved", stu.name+" -> "+ca.name);
    }
    addAudit(state, "Student edited", stu.name);
    toast("Student updated.");
  } else {
    var newStu = Object.assign({
      id: uid("stu"), customFields:{}, createdAt: Date.now(),
      enrollmentHistory: [{ sessionId: state.currentSessionId, classArmId: classArmId, sectionId: ca.sectionId, departmentId: data.departmentId }]
    }, data);
    if (_pendingPhotoDataUrl && _pendingPhotoDataUrl!=="REMOVE") newStu.photo = _pendingPhotoDataUrl; else newStu.photo="";
    state.students.push(newStu);
    addAudit(state, "Student created", newStu.name);
    toast("Student added.");
  }
  _pendingPhotoDataUrl = null;
  closeModal();
  scheduleSave();
  renderApp();
}

/* ---------- Bulk import ---------- */
function openBulkImport(){
  var user = state.currentUser;
  var myArms = state.classArms.filter(function(c){ return c.active && (isWholeSchoolRole(user.role) || myFormClassArmIds(user.id).indexOf(c.id)>-1); });
  var classOptions = myArms.map(function(c){ return '<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>'; }).join("");
  var html = ''+
  '<div class="modal-header"><h3>Bulk Add Students</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    '<label class="field-label">Target Class</label>'+
    '<select class="field-input" id="bulk-classarm">'+classOptions+'</select>'+
    '<label class="field-label" style="margin-top:12px">Paste rows (one student per line)</label>'+
    '<p class="muted small">Format: Full Name | Gender | Date of Birth (YYYY-MM-DD) | Parent Phone | Address</p>'+
    '<textarea class="field-input" id="bulk-text" rows="8" placeholder="Ahmad Musa | Male | 2013-04-12 | 0803 000 1111 | 12 Palm Street'+"\n"+'Aisha Ali | Female | 2013-05-01 | 0803 111 2222 | 4 Zoo Road"></textarea>'+
    '<div id="bulk-preview"></div>'+
  '</div>'+
  '<div class="modal-footer">'+
    '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-secondary" onclick="previewBulkImport()">Preview</button>'+
    '<button class="btn btn-primary" id="bulk-confirm" style="display:none" onclick="confirmBulkImport()">Import Valid Rows</button>'+
  '</div>';
  openModal(html);
}

var _bulkParsedRows = [];
function previewBulkImport(){
  var text = el("bulk-text").value.trim();
  var lines = text.split("\n").map(function(l){return l.trim();}).filter(Boolean);
  _bulkParsedRows = lines.map(function(line){
    var parts = line.split("|").map(function(p){return p.trim();});
    var row = { name:parts[0]||"", gender:parts[1]||"", dob:parts[2]||"", guardianPhone:parts[3]||"", address:parts[4]||"" };
    var errors = [];
    if (!row.name) errors.push("Missing name");
    if (row.gender && ["Male","Female"].indexOf(row.gender)===-1) errors.push("Gender must be Male or Female");
    row.errors = errors;
    return row;
  });
  var rowsHtml = _bulkParsedRows.map(function(r,i){
    var ok = r.errors.length===0;
    return '<tr class="'+(ok?'':'row-error')+'"><td>'+(i+1)+'</td><td>'+escapeHtml(r.name)+'</td><td>'+escapeHtml(r.gender)+'</td><td>'+escapeHtml(r.dob)+'</td><td>'+escapeHtml(r.guardianPhone)+'</td>'+
      '<td>'+(ok?'<span class="chip chip-good">Valid</span>':'<span class="chip chip-error">'+escapeHtml(r.errors.join(", "))+'</span>')+'</td></tr>';
  }).join("");
  var validCount = _bulkParsedRows.filter(function(r){return r.errors.length===0;}).length;
  el("bulk-preview").innerHTML = '<div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>#</th><th>Name</th><th>Gender</th><th>DOB</th><th>Phone</th><th>Status</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>'+
    '<p class="muted small">'+validCount+' of '+_bulkParsedRows.length+' rows are valid and will be imported.</p>';
  if (validCount>0) el("bulk-confirm").style.display = "inline-flex";
}

function confirmBulkImport(){
  var classArmId = el("bulk-classarm").value;
  assertPermission(isFormTeacherOf(state.currentUser, classArmId), "You can only add students to your assigned class.");
  var ca = byId(state.classArms, classArmId);
  var count = 0;
  _bulkParsedRows.filter(function(r){return r.errors.length===0;}).forEach(function(r){
    state.students.push({
      id: uid("stu"), admissionNo: "LB/"+Math.floor(1000+Math.random()*9000),
      name:r.name, gender:r.gender, dob:r.dob, photo:"",
      sectionId: ca.sectionId, classArmId: classArmId, departmentId:null,
      status:"Active", guardianPhone:r.guardianPhone, address:r.address, customFields:{},
      enrollmentHistory:[{ sessionId: state.currentSessionId, classArmId: classArmId, sectionId: ca.sectionId, departmentId:null }],
      createdAt: Date.now()
    });
    count++;
  });
  addAudit(state, "Bulk student import", count+" students into "+ca.name);
  toast(count+" students imported.");
  closeModal(); scheduleSave(); renderApp();
}

/* ---------- Student profile / academic history page ---------- */
function renderStudentProfile(){
  var user = state.currentUser;
  var stu = byId(state.students, (state.viewParams||{}).studentId);
  if (!stu) return '<div class="empty-state"><h3>Student not found</h3></div>';
  assertPermission(canAccessClassArm(user, stu.classArmId), "You cannot view students outside your assigned classes.");

  var missing = studentMissingFields(stu);
  var ca = byId(state.classArms, stu.classArmId);
  var historyRows = stu.enrollmentHistory.slice().reverse().map(function(h){
    var hca = byId(state.classArms, h.classArmId);
    return '<tr><td>'+escapeHtml(sessionName(h.sessionId))+'</td><td>'+escapeHtml(hca?hca.name:"—")+'</td><td>'+escapeHtml(sectionName(h.sectionId))+'</td><td>'+escapeHtml(departmentName(h.departmentId))+'</td></tr>';
  }).join("");

  var termResultsHtml = state.terms.filter(function(t){return t.sessionId===state.currentSessionId;}).map(function(t){
    var overall = computeStudentOverall(stu.id, stu.classArmId, state.currentSessionId, t.id);
    var rows = overall.subjectRows.map(function(r){
      var display = r.calc.hasAbsent ? "ABSENT" : r.calc.hasExcused ? "EXCUSED" : (r.calc.isComplete ? r.calc.total : "—");
      return '<tr><td>'+escapeHtml(r.subject.name)+'</td><td>'+display+'</td><td>'+r.grade+'</td></tr>';
    }).join("");
    return '<div class="card">'+
      '<div class="card-header"><h3>'+escapeHtml(t.name)+'</h3>'+(overall.average!==null?'<span class="chip chip-good">Average: '+overall.average+'%</span>':'<span class="chip">Incomplete</span>')+'</div>'+
      (rows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Subject</th><th>Score</th><th>Grade</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-inline">No scores recorded.</div>')+
    '</div>';
  }).join("");

  var canEdit = isFormTeacherOf(user, stu.classArmId);
  var photoHtml = stu.photo ? '<img src="'+stu.photo+'" class="profile-photo"/>' : '<div class="profile-photo avatar-fallback">'+escapeHtml(stu.name[0])+'</div>';

  return ''+
  '<button class="btn btn-ghost btn-sm" onclick="goto(\'students\')">&larr; Back to Students</button>'+
  '<div class="page-header page-header-row">'+
    '<div class="profile-header">'+photoHtml+
      '<div><h2>'+escapeHtml(stu.name)+'</h2><p>'+escapeHtml(stu.admissionNo)+' &middot; '+escapeHtml(ca?ca.name:"")+(stu.departmentId?' · '+escapeHtml(departmentName(stu.departmentId)):'')+'</p>'+
      '<span class="status-badge status-'+stu.status.toLowerCase()+'">'+stu.status+'</span></div>'+
    '</div>'+
    (canEdit ? '<button class="btn btn-primary" onclick="openStudentForm(\''+stu.id+'\')">Edit Profile</button>' : '')+
    (canEdit ? '<button class="btn btn-ghost" style="color:#8E2A3B" onclick="deleteStudent(\''+stu.id+'\')">Delete Student</button>' : '')+
  '</div>'+
  (missing.length ? '<div class="banner banner-warn">Profile incomplete — missing: '+missing.join(", ")+'</div>' : '')+
  '<div class="grid-2">'+
    '<div class="card">'+
      '<div class="card-header"><h3>Basic Information</h3></div>'+
      '<div class="detail-list">'+
        '<div><span>Gender</span><strong>'+escapeHtml(stu.gender||"—")+'</strong></div>'+
        '<div><span>Date of Birth</span><strong>'+escapeHtml(stu.dob||"—")+'</strong></div>'+
        '<div><span>Parent/Guardian Phone</span><strong>'+escapeHtml(stu.guardianPhone||"—")+'</strong></div>'+
        '<div><span>Address</span><strong>'+escapeHtml(stu.address||"—")+'</strong></div>'+
      '</div>'+
    '</div>'+
    '<div class="card">'+
      '<div class="card-header"><h3>Academic History</h3></div>'+
      (historyRows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Session</th><th>Class</th><th>Section</th><th>Department</th></tr></thead><tbody>'+historyRows+'</tbody></table></div>' : '<div class="empty-inline">No history yet.</div>')+
    '</div>'+
  '</div>'+
  '<h3 class="section-title">Results — '+escapeHtml(sessionName(state.currentSessionId))+'</h3>'+
  termResultsHtml;
}
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
/* ==========================================================================
   15 - SETTINGS: shell + School Structure (sections/classArms/departments)
   ========================================================================== */

var SETTINGS_TABS = [
  ["structure","School Structure"],
  ["subjects","Subjects"],
  ["assessment","Assessment"],
  ["grading","Grading &amp; Ranking"],
  ["comments","Comments &amp; Signatures"],
  ["domains","Affective / Psychomotor"],
  ["templates","Report Templates"],
  ["fields","Custom Fields"],
  ["school","School Profile"],
  ["sessions","Sessions &amp; Terms"],
  ["users","Users"],
  ["backup","Backup &amp; Data"],
  ["profile","My Profile"]
];

function renderSettingsView(){
  var user = state.currentUser;
  assertPermission(canManageSettings(user) || (state.viewParams&&state.viewParams.tab==="profile"), "Only Admin/Super Admin can access Settings.");
  var tab = (state.viewParams||{}).tab || "structure";
  var isAdmin = canManageSettings(user);
  var tabs = isAdmin ? SETTINGS_TABS : [["profile","My Profile"]];

  var tabHtml = tabs.map(function(t){ return '<button class="tab-btn'+(tab===t[0]?' active':'')+'" onclick="switchSettingsTab(\''+t[0]+'\')">'+t[1]+'</button>'; }).join("");

  var body;
  switch(tab){
    case "structure": body = renderStructureSettings(); break;
    case "subjects": body = renderSubjectSettings(); break;
    case "assessment": body = renderAssessmentSettings(); break;
    case "grading": body = renderGradingSettings(); break;
    case "comments": body = renderCommentsSignaturesSettings(); break;
    case "domains": body = renderDomainsSettings(); break;
    case "templates": body = renderTemplatesSettings(); break;
    case "fields": body = renderCustomFieldsSettings(); break;
    case "school": body = renderSchoolProfileSettings(); break;
    case "sessions": body = renderSessionsSettings(); break;
    case "users": body = renderUsersSettings(); break;
    case "backup": body = renderBackupSettings(); break;
    case "profile": body = renderMyProfileSettings(); break;
    default: body = renderStructureSettings();
  }
  return '<div class="page-header"><h2>Settings</h2></div><div class="tab-bar tab-bar-wrap">'+tabHtml+'</div>'+body;
}
function switchSettingsTab(t){ state.viewParams = { tab:t }; renderApp(); }

/* ---------- School Structure ---------- */
function renderStructureSettings(){
  var sectionRows = state.sections.sort(function(a,b){return a.order-b.order;}).map(function(s){
    var classCount = state.classArms.filter(function(c){return c.sectionId===s.id;}).length;
    return '<tr><td>'+escapeHtml(s.name)+'</td><td>'+classCount+' class(es)</td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="renameEntity(\'sections\',\''+s.id+'\')">Rename</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="deleteEntity(\'sections\',\''+s.id+'\')">'+ICONS("trash")+'</button></td></tr>';
  }).join("");

  var deptRows = state.departments.map(function(d){
    return '<tr><td>'+escapeHtml(d.name)+'</td><td>'+escapeHtml(sectionName(d.sectionId))+'</td>'+
      '<td><span class="status-badge status-'+(d.active?'active':'inactive')+'">'+(d.active?'Active':'Inactive')+'</span></td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="renameEntity(\'departments\',\''+d.id+'\')">Rename</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="toggleActive(\'departments\',\''+d.id+'\')">'+(d.active?'Deactivate':'Activate')+'</button></td></tr>';
  }).join("");

  var classRows = state.classArms.map(function(c){
    return '<tr><td>'+escapeHtml(c.name)+'</td><td>'+escapeHtml(sectionName(c.sectionId))+'</td><td>'+escapeHtml(departmentName(c.departmentId))+'</td>'+
      '<td><span class="status-badge status-'+(c.active?'active':'inactive')+'">'+(c.active?'Active':'Inactive')+'</span></td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="renameEntity(\'classArms\',\''+c.id+'\')">Rename</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="toggleActive(\'classArms\',\''+c.id+'\')">'+(c.active?'Deactivate':'Activate')+'</button></td></tr>';
  }).join("");

  var sectionOptionsForClass = state.sections.map(function(s){return '<option value="'+s.id+'">'+escapeHtml(s.name)+'</option>';}).join("");
  var sectionOptionsForDept = state.sections.map(function(s){return '<option value="'+s.id+'">'+escapeHtml(s.name)+'</option>';}).join("");

  return ''+
  '<div class="grid-2">'+
    '<div class="card"><div class="card-header"><h3>Sections / Levels</h3></div>'+
      '<div class="inline-add"><input class="field-input" id="new-section-name" placeholder="e.g. Nursery, Vocational Wing"/><button class="btn btn-primary btn-sm" onclick="addSection()">Add Section</button></div>'+
      (sectionRows?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Classes</th><th></th></tr></thead><tbody>'+sectionRows+'</tbody></table></div>':'')+
    '</div>'+
    '<div class="card"><div class="card-header"><h3>Departments / Categories</h3></div>'+
      '<div class="inline-add inline-add-wrap">'+
        '<input class="field-input" id="new-dept-name" placeholder="e.g. Science, Technical"/>'+
        '<select class="field-input" id="new-dept-section">'+sectionOptionsForDept+'</select>'+
        '<button class="btn btn-primary btn-sm" onclick="addDepartment()">Add</button></div>'+
      (deptRows?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Section</th><th>Status</th><th></th></tr></thead><tbody>'+deptRows+'</tbody></table></div>':'<div class="empty-inline">No departments yet.</div>')+
    '</div>'+
  '</div>'+
  '<div class="card"><div class="card-header"><h3>Classes / Arms</h3></div>'+
    '<div class="inline-add inline-add-wrap">'+
      '<input class="field-input" id="new-class-name" placeholder="e.g. JSS1A, SS1 Science A"/>'+
      '<select class="field-input" id="new-class-section" onchange="refreshClassDeptOptions(this.value)">'+sectionOptionsForClass+'</select>'+
      '<select class="field-input" id="new-class-dept"><option value="">No department</option></select>'+
      '<button class="btn btn-primary btn-sm" onclick="addClassArm()">Add Class</button></div>'+
    (classRows?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Section</th><th>Department</th><th>Status</th><th></th></tr></thead><tbody>'+classRows+'</tbody></table></div>':'')+
  '</div>';
}
function afterRenderHook(){
  var sel = el("new-class-section");
  if (sel) refreshClassDeptOptions(sel.value);
}
function refreshClassDeptOptions(sectionId){
  var target = el("new-class-dept"); if (!target) return;
  var depts = state.departments.filter(function(d){return d.active && d.sectionId===sectionId;});
  target.innerHTML = '<option value="">No department</option>' + depts.map(function(d){return '<option value="'+d.id+'">'+escapeHtml(d.name)+'</option>';}).join("");
}
function addSection(){
  var name = el("new-section-name").value.trim();
  if (!name){ toast("Enter a section name.", "error"); return; }
  state.sections.push({ id: uid("sec"), name:name, order: state.sections.length+1 });
  addAudit(state, "Section created", name);
  scheduleSave(); renderApp();
}
function addDepartment(){
  var name = el("new-dept-name").value.trim();
  var sectionId = el("new-dept-section").value;
  if (!name){ toast("Enter a department name.", "error"); return; }
  state.departments.push({ id: uid("dept"), name:name, sectionId:sectionId, active:true });
  addAudit(state, "Department created", name);
  scheduleSave(); renderApp();
}
function addClassArm(){
  var name = el("new-class-name").value.trim();
  var sectionId = el("new-class-section").value;
  var deptId = el("new-class-dept").value || null;
  if (!name){ toast("Enter a class/arm name.", "error"); return; }
  state.classArms.push({ id: uid("ca"), name:name, sectionId:sectionId, departmentId:deptId, active:true });
  addAudit(state, "Class/Arm created", name);
  scheduleSave(); renderApp();
}
function renameEntity(collection, id){
  var arr = state[collection];
  var item = byId(arr, id);
  var val = window.prompt("New name:", item.name);
  if (!val) return;
  var old = item.name;
  item.name = val.trim();
  addAudit(state, "Renamed", old+" -> "+item.name);
  scheduleSave(); renderApp();
}
function deleteEntity(collection, id){
  if (!window.confirm("Delete this? This cannot be undone if nothing depends on it.")) return;
  state[collection] = state[collection].filter(function(x){return x.id!==id;});
  addAudit(state, "Deleted "+collection, id);
  scheduleSave(); renderApp();
}
function toggleActive(collection, id){
  var item = byId(state[collection], id);
  item.active = !item.active;
  addAudit(state, (item.active?"Activated":"Deactivated")+" "+collection, item.name);
  scheduleSave(); renderApp();
}
/* ==========================================================================
   16 - SETTINGS: SUBJECTS
   Subjects are grouped visually by department so Admin can see at a glance
   which subjects are compulsory for everyone vs. specific to a department
   (e.g. Science/Arts/Commercial) - this matters most for mixed classes where
   students of different departments share one class-arm: each student only
   sees/needs the subjects in "Compulsory/General" plus their own department.
   ========================================================================== */

function subjectRowHtml(su){
  return '<tr><td>'+escapeHtml(su.name)+' <span class="muted small">('+escapeHtml(su.code)+')</span></td>'+
    '<td>'+su.sectionIds.map(sectionName).join(", ")+'</td>'+
    '<td>'+(su.core?'<span class="chip chip-good">Core</span>':'<span class="chip">Elective</span>')+'</td>'+
    '<td>'+(su.includeInAverage?"Yes":"No")+' / '+(su.includeInRanking?"Yes":"No")+'</td>'+
    '<td><span class="status-badge status-'+(su.active?'active':'inactive')+'">'+(su.active?'Active':'Inactive')+'</span></td>'+
    '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="openSubjectForm(\''+su.id+'\')">Edit</button>'+
    '<button class="btn btn-sm btn-ghost" onclick="toggleActive(\'subjects\',\''+su.id+'\')">'+(su.active?'Deactivate':'Activate')+'</button>'+
    '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="deleteSubject(\''+su.id+'\')">Delete</button></td></tr>';
}

function subjectGroupCard(label, sub, addDeptId, subjects){
  var rows = subjects.sort(function(a,b){return (a.order||0)-(b.order||0);}).map(subjectRowHtml).join("");
  return '<div class="card">'+
    '<div class="card-header"><div><h3>'+escapeHtml(label)+'</h3><p class="muted small">'+escapeHtml(sub)+'</p></div>'+
      '<button class="btn btn-sm btn-secondary" onclick="openSubjectForm(null,'+(addDeptId?"'"+addDeptId+"'":"null")+')">'+ICONS("plus")+' Add</button></div>'+
    (rows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Subject</th><th>Sections</th><th>Type</th><th>In Avg / Ranking</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      : '<div class="empty-inline">No subjects in this group yet.</div>')+
  '</div>';
}

function renderSubjectSettings(){
  var general = state.subjects.filter(function(su){ return !su.departmentIds || !su.departmentIds.length; });
  var groupsHtml = subjectGroupCard(
    "Compulsory / General",
    "Shown to every student in the applicable section(s), regardless of department.",
    null, general
  );

  state.departments.filter(function(d){ return d.active; }).forEach(function(d){
    var subs = state.subjects.filter(function(su){ return su.departmentIds && su.departmentIds.indexOf(d.id) > -1; });
    groupsHtml += subjectGroupCard(
      d.name + " (" + sectionName(d.sectionId) + ")",
      "Only shown to students personally assigned to " + d.name + " - even in a mixed class where other students are in different departments.",
      d.id, subs
    );
  });

  return '<div class="banner">Subjects are grouped by department. A student only sees Compulsory/General subjects plus whichever department group matches their own profile - set per student in Students &rarr; Edit Profile &rarr; Department.</div>'
    + groupsHtml;
}

function openSubjectForm(subjectId, presetDeptId){
  var su = subjectId ? byId(state.subjects, subjectId) : null;
  var sectionChecks = state.sections.map(function(s){
    var checked = su && su.sectionIds.indexOf(s.id)>-1;
    return '<label class="check-chip"><input type="checkbox" value="'+s.id+'" class="subj-section-check" '+(checked?'checked':'')+'/> '+escapeHtml(s.name)+'</label>';
  }).join("");
  var deptChecks = state.departments.map(function(d){
    var checked = su ? (su.departmentIds && su.departmentIds.indexOf(d.id)>-1) : (presetDeptId===d.id);
    return '<label class="check-chip"><input type="checkbox" value="'+d.id+'" class="subj-dept-check" '+(checked?'checked':'')+'/> '+escapeHtml(d.name)+' ('+escapeHtml(sectionName(d.sectionId))+')</label>';
  }).join("");

  var html = ''+
  '<div class="modal-header"><h3>'+(su?"Edit Subject":"Add Subject")+'</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    '<div class="form-grid">'+
      '<div><label class="field-label">Subject Name *</label><input class="field-input" id="sub-name" value="'+escapeHtml(su?su.name:'')+'"/></div>'+
      '<div><label class="field-label">Subject Code</label><input class="field-input" id="sub-code" value="'+escapeHtml(su?su.code:'')+'"/></div>'+
      '<div><label class="field-label">Pass Mark</label><input class="field-input" type="number" id="sub-pass" value="'+(su?su.passMark:40)+'"/></div>'+
      '<div><label class="field-label">Type</label><select class="field-input" id="sub-core">'+
        '<option value="true"'+((su?su.core:!presetDeptId)?' selected':'')+'>Core (compulsory)</option>'+
        '<option value="false"'+((su?!su.core:!!presetDeptId)?' selected':'')+'>Elective</option>'+
      '</select></div>'+
    '</div>'+
    '<label class="field-label" style="margin-top:12px">Applicable Sections *</label><div class="check-chip-group">'+sectionChecks+'</div>'+
    '<label class="field-label" style="margin-top:12px">Applicable Departments (leave blank = Compulsory/General, shown to everyone)</label><div class="check-chip-group">'+(deptChecks||'<span class="muted small">No departments configured.</span>')+'</div>'+
    '<div class="form-grid" style="margin-top:12px">'+
      '<div><label class="checkbox-row"><input type="checkbox" id="sub-avg" '+(!su||su.includeInAverage?'checked':'')+'/> Include in average</label></div>'+
      '<div><label class="checkbox-row"><input type="checkbox" id="sub-rank" '+(!su||su.includeInRanking?'checked':'')+'/> Include in ranking</label></div>'+
    '</div>'+
  '</div>'+
  '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveSubjectForm('+(su?"'"+su.id+"'":"null")+')">Save</button></div>';
  openModal(html, {wide:true});
}
function saveSubjectForm(subjectId){
  var name = el("sub-name").value.trim();
  if (!name){ toast("Subject name is required.", "error"); return; }
  var sectionIds = qsa(".subj-section-check:checked").map(function(c){return c.value;});
  if (!sectionIds.length){ toast("Select at least one applicable section.", "error"); return; }
  var departmentIds = qsa(".subj-dept-check:checked").map(function(c){return c.value;});
  var data = {
    name:name, code: el("sub-code").value.trim() || name.slice(0,3).toUpperCase(),
    passMark: Number(el("sub-pass").value)||0,
    core: el("sub-core").value==="true",
    sectionIds: sectionIds, departmentIds: departmentIds,
    includeInAverage: el("sub-avg").checked, includeInRanking: el("sub-rank").checked
  };
  if (subjectId){
    Object.assign(byId(state.subjects, subjectId), data);
    addAudit(state, "Subject edited", name);
  } else {
    state.subjects.push(Object.assign({ id: uid("subj"), order: state.subjects.length+1, active:true }, data));
    addAudit(state, "Subject created", name);
  }
  toast("Subject saved.");
  closeModal(); scheduleSave(); renderApp();
}
function deleteSubject(subjectId){
  var su = byId(state.subjects, subjectId);
  if (!su) return;
  var hasScores = state.scores.some(function(s){return s.subjectId===subjectId;});
  var msg = "Delete \""+su.name+"\"? This cannot be undone."+
    (hasScores ? " Note: some scores have already been recorded for this subject - they will remain in the system but will no longer be linked to a visible subject." : "");
  if (!window.confirm(msg)) return;
  state.subjects = state.subjects.filter(function(s){return s.id!==subjectId;});
  addAudit(state, "Subject deleted", su.name);
  toast("Subject deleted.");
  scheduleSave(); renderApp();
}
/* ==========================================================================
   17 - SETTINGS: ASSESSMENT SCHEMES
   ========================================================================== */

function renderAssessmentSettings(){
  var rows = state.assessmentSchemes.map(function(sc){
    var totalWeight = sc.components.filter(function(c){return c.active;}).reduce(function(a,c){return a+c.weight;},0);
    var compList = sc.components.map(function(c){return escapeHtml(c.name)+" ("+c.weight+"%)";}).join(", ");
    return '<div class="card">'+
      '<div class="card-header"><h3>'+escapeHtml(sc.name)+'</h3>'+
        '<span class="chip '+(totalWeight===100?'chip-good':'chip-warn')+'">Total weight: '+totalWeight+'%</span></div>'+
      '<p class="muted small">Applies to: '+(sc.sectionIds.map(sectionName).join(", ")||"—")+'</p>'+
      '<p>'+compList+'</p>'+
      '<div class="component-editor" id="comp-editor-'+sc.id+'">'+renderComponentRows(sc)+'</div>'+
      '<div class="inline-add"><input class="field-input" placeholder="Component name" id="new-comp-name-'+sc.id+'"/>'+
        '<input class="field-input" type="number" placeholder="Max score" style="max-width:110px" id="new-comp-max-'+sc.id+'"/>'+
        '<input class="field-input" type="number" placeholder="Weight %" style="max-width:110px" id="new-comp-weight-'+sc.id+'"/>'+
        '<button class="btn btn-primary btn-sm" onclick="addComponent(\''+sc.id+'\')">Add Component</button></div>'+
      '<div class="card-footer"><button class="btn btn-sm btn-ghost" onclick="renameEntity(\'assessmentSchemes\',\''+sc.id+'\')">Rename Scheme</button></div>'+
    '</div>';
  }).join("");

  var sectionChecks = state.sections.map(function(s){return '<label class="check-chip"><input type="checkbox" class="new-scheme-section" value="'+s.id+'"/> '+escapeHtml(s.name)+'</label>';}).join("");

  return rows + '<div class="card"><div class="card-header"><h3>Create New Assessment Scheme</h3></div>'+
    '<input class="field-input" id="new-scheme-name" placeholder="Scheme name e.g. Vocational Standard"/>'+
    '<label class="field-label" style="margin-top:10px">Applies to sections</label><div class="check-chip-group">'+sectionChecks+'</div>'+
    '<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="addAssessmentScheme()">Create Scheme</button>'+
  '</div>';
}
function renderComponentRows(sc){
  return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Component</th><th>Max Score</th><th>Weight %</th><th>Status</th><th></th></tr></thead><tbody>'+
    sc.components.map(function(c){
      return '<tr><td>'+escapeHtml(c.name)+'</td><td>'+c.maxScore+'</td><td>'+c.weight+'</td>'+
        '<td><span class="status-badge status-'+(c.active?'active':'inactive')+'">'+(c.active?'Active':'Inactive')+'</span></td>'+
        '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="toggleComponentActive(\''+sc.id+'\',\''+c.id+'\')">'+(c.active?'Disable':'Enable')+'</button>'+
        '<button class="btn btn-sm btn-ghost" onclick="removeComponent(\''+sc.id+'\',\''+c.id+'\')">'+ICONS("trash")+'</button></td></tr>';
    }).join("") + '</tbody></table></div>';
}
function addComponent(schemeId){
  var sc = byId(state.assessmentSchemes, schemeId);
  var name = el("new-comp-name-"+schemeId).value.trim();
  var max = Number(el("new-comp-max-"+schemeId).value);
  var weight = Number(el("new-comp-weight-"+schemeId).value);
  if (!name || !max || !weight){ toast("Fill in component name, max score, and weight.", "error"); return; }
  sc.components.push({ id: uid("comp"), name:name, maxScore:max, weight:weight, order: sc.components.length+1, active:true });
  addAudit(state, "Assessment component added", name+" -> "+sc.name);
  scheduleSave(); renderApp();
}
function toggleComponentActive(schemeId, compId){
  var sc = byId(state.assessmentSchemes, schemeId);
  var c = byId(sc.components, compId);
  c.active = !c.active;
  scheduleSave(); renderApp();
}
function removeComponent(schemeId, compId){
  if (!window.confirm("Remove this assessment component?")) return;
  var sc = byId(state.assessmentSchemes, schemeId);
  sc.components = sc.components.filter(function(c){return c.id!==compId;});
  scheduleSave(); renderApp();
}
function addAssessmentScheme(){
  var name = el("new-scheme-name").value.trim();
  var sectionIds = qsa(".new-scheme-section:checked").map(function(c){return c.value;});
  if (!name || !sectionIds.length){ toast("Enter a name and select at least one section.", "error"); return; }
  state.assessmentSchemes.push({ id: uid("ascheme"), name:name, scope:"section", sectionIds:sectionIds, components:[] });
  addAudit(state, "Assessment scheme created", name);
  toast("Scheme created — now add components.");
  scheduleSave(); renderApp();
}
/* ==========================================================================
   18 - SETTINGS: GRADING SCHEMES + RANKING CONFIG
   ========================================================================== */

function renderGradingSettings(){
  var schemeCards = state.gradingSchemes.map(function(gs){
    var bandRows = gs.bands.map(function(b, i){
      return '<tr><td><input class="field-input field-input-sm" value="'+escapeHtml(b.grade)+'" onchange="updateBand(\''+gs.id+'\','+i+',\'grade\',this.value)"/></td>'+
        '<td><input class="field-input field-input-sm" type="number" value="'+b.min+'" onchange="updateBand(\''+gs.id+'\','+i+',\'min\',this.value)"/></td>'+
        '<td><input class="field-input field-input-sm" type="number" value="'+b.max+'" onchange="updateBand(\''+gs.id+'\','+i+',\'max\',this.value)"/></td>'+
        '<td><input class="field-input field-input-sm" value="'+escapeHtml(b.remark)+'" onchange="updateBand(\''+gs.id+'\','+i+',\'remark\',this.value)"/></td>'+
        '<td><button class="btn btn-sm btn-ghost" onclick="removeBand(\''+gs.id+'\','+i+')">'+ICONS("trash")+'</button></td></tr>';
    }).join("");
    return '<div class="card"><div class="card-header"><h3>'+escapeHtml(gs.name)+'</h3></div>'+
      '<p class="muted small">Applies to: '+(gs.sectionIds.map(sectionName).join(", ")||"—")+'</p>'+
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Grade</th><th>Min</th><th>Max</th><th>Remark</th><th></th></tr></thead><tbody>'+bandRows+'</tbody></table></div>'+
      '<button class="btn btn-sm btn-secondary" style="margin-top:8px" onclick="addBand(\''+gs.id+'\')">'+ICONS("plus")+' Add Band</button>'+
    '</div>';
  }).join("");

  var tieOptions = ["competition","dense","ordinal"].map(function(m){
    return '<option value="'+m+'"'+(state.rankingConfig.tieMethod===m?' selected':'')+'>'+m.charAt(0).toUpperCase()+m.slice(1)+' ranking</option>';
  }).join("");
  var basisOptions = ["average","total"].map(function(m){
    return '<option value="'+m+'"'+(state.rankingConfig.basis===m?' selected':'')+'>Position by '+m+'</option>';
  }).join("");

  return schemeCards + '<div class="card"><div class="card-header"><h3>Ranking Configuration</h3></div>'+
    '<div class="form-grid form-grid-3">'+
      '<div><label class="field-label">Rank Basis</label><select class="field-input" onchange="updateRankingConfig(\'basis\',this.value)">'+basisOptions+'</select></div>'+
      '<div><label class="field-label">Tie Method</label><select class="field-input" onchange="updateRankingConfig(\'tieMethod\',this.value)">'+tieOptions+'</select></div>'+
      '<div><label class="checkbox-row" style="margin-top:28px"><input type="checkbox" '+(state.rankingConfig.requireCompleteResults?'checked':'')+' onchange="updateRankingConfig(\'requireCompleteResults\',this.checked)"/> Only rank students with complete results</label></div>'+
    '</div>'+
  '</div>';
}
function updateBand(schemeId, idx, field, value){
  var gs = byId(state.gradingSchemes, schemeId);
  gs.bands[idx][field] = (field==="min"||field==="max") ? Number(value) : value;
  scheduleSave(); renderApp();
}
function addBand(schemeId){
  var gs = byId(state.gradingSchemes, schemeId);
  gs.bands.push({ grade:"NEW", min:0, max:0, remark:"" });
  scheduleSave(); renderApp();
}
function removeBand(schemeId, idx){
  var gs = byId(state.gradingSchemes, schemeId);
  gs.bands.splice(idx,1);
  scheduleSave(); renderApp();
}
function updateRankingConfig(key, value){
  state.rankingConfig[key] = value;
  addAudit(state, "Ranking configuration changed", key+" = "+value);
  scheduleSave(); renderApp();
}
/* ==========================================================================
   19 - SETTINGS: COMMENTS + SIGNATURES
   Signature uploads are Admin-only (Settings is admin-gated already) - Form
   Teachers never get a self-service upload button. Admin can add a
   signature "slot" for the Principal (one, role-based) and for individual
   teachers (one per teacher, so each Form Teacher's actual signature can
   appear on their own class's report cards).
   ========================================================================== */

function renderCommentsSignaturesSettings(){
  var commentRows = state.commentTemplates.map(function(c){
    return '<tr><td>'+escapeHtml(c.text)+'</td><td>'+c.category+'</td>'+
      '<td><span class="status-badge status-'+(c.active?'active':'inactive')+'">'+(c.active?'Active':'Inactive')+'</span></td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="toggleActive(\'commentTemplates\',\''+c.id+'\')">'+(c.active?'Deactivate':'Activate')+'</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="deleteEntity(\'commentTemplates\',\''+c.id+'\')">'+ICONS("trash")+'</button></td></tr>';
  }).join("");

  var sigRows = state.signatures.map(function(s){
    var label = s.role==="PRINCIPAL" ? "Principal" : "Form Teacher";
    return '<tr><td>'+label+'</td><td>'+escapeHtml(s.name)+'</td>'+
      '<td>'+(s.image?'<img src="'+s.image+'" class="sig-thumb"/>':'<span class="muted">None</span>')+'</td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="uploadSignature(\''+s.id+'\')">Upload</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="toggleActive(\'signatures\',\''+s.id+'\')">'+(s.active?'Deactivate':'Activate')+'</button>'+
      '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="deleteEntity(\'signatures\',\''+s.id+'\')">'+ICONS("trash")+'</button></td></tr>';
  }).join("");

  var teachersWithoutSig = state.users.filter(function(u){
    return u.role==="TEACHER" && !state.signatures.some(function(s){return s.userId===u.id;});
  });
  var teacherOptions = teachersWithoutSig.map(function(t){return '<option value="'+t.id+'">'+escapeHtml(t.name)+'</option>';}).join("");

  return ''+
  '<div class="card"><div class="card-header"><h3>Comment Library</h3></div>'+
    '<div class="inline-add inline-add-wrap">'+
      '<input class="field-input" id="new-comment-text" placeholder="e.g. Shows great improvement this term."/>'+
      '<select class="field-input" id="new-comment-cat"><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="improvement">Needs Improvement</option></select>'+
      '<button class="btn btn-primary btn-sm" onclick="addCommentTemplate()">Add</button></div>'+
    (commentRows?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Comment</th><th>Category</th><th>Status</th><th></th></tr></thead><tbody>'+commentRows+'</tbody></table></div>':'')+
  '</div>'+
  '<div class="card"><div class="card-header"><h3>Signatures</h3></div>'+
    '<p class="muted small">Signatures are managed here by Admin only - teachers never get a self-upload option. Add one slot per Form Teacher so their actual signature appears on their class\'s report cards.</p>'+
    (sigRows?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Type</th><th>Name</th><th>Signature</th><th></th></tr></thead><tbody>'+sigRows+'</tbody></table></div>':'<div class="empty-inline">No signatures added yet.</div>')+
    (teacherOptions ? '<div class="inline-add" style="margin-top:12px"><select class="field-input" id="new-sig-teacher">'+teacherOptions+'</select>'+
      '<button class="btn btn-primary btn-sm" onclick="addTeacherSignatureSlot()">Add Teacher Signature Slot</button></div>' : '')+
    '<input type="file" accept="image/*" id="sig-file-input" style="display:none" onchange="handleSignatureUpload(event)"/>'+
  '</div>';
}
function addCommentTemplate(){
  var text = el("new-comment-text").value.trim();
  if (!text){ toast("Enter comment text.", "error"); return; }
  state.commentTemplates.push({ id: uid("ct"), text:text, category: el("new-comment-cat").value, sectionId:null, active:true });
  addAudit(state, "Comment template added", text);
  scheduleSave(); renderApp();
}
function addTeacherSignatureSlot(){
  var teacherId = el("new-sig-teacher").value;
  var t = byId(state.users, teacherId);
  if (!t) return;
  state.signatures.push({ id: uid("sig"), role:"FORM_TEACHER", userId:teacherId, name:t.name, image:"", active:true });
  addAudit(state, "Signature slot added", t.name);
  toast("Signature slot added - upload their signature image now.");
  scheduleSave(); renderApp();
}
var _sigTargetId = null;
function uploadSignature(sigId){ _sigTargetId = sigId; el("sig-file-input").click(); }
function handleSignatureUpload(e){
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(){
    compressImage(reader.result, 260, function(compressed){
      var sig = byId(state.signatures, _sigTargetId);
      sig.image = compressed;
      addAudit(state, "Signature uploaded", sig.name);
      toast("Signature uploaded.");
      scheduleSave(); renderApp();
    });
  };
  reader.readAsDataURL(file);
}

/* Looks up the actual signature image for whoever is the current Form
   Teacher of a given class-arm (used by the report card generator). */
function formTeacherSignatureFor(classArmId){
  var assign = state.formTeacherAssignments.filter(function(a){return a.classArmId===classArmId && a.active;})[0];
  if (!assign) return null;
  return state.signatures.filter(function(s){return s.role==="FORM_TEACHER" && s.userId===assign.teacherId && s.active;})[0] || null;
}
/* ==========================================================================
   20 - SETTINGS: DOMAINS + REPORT TEMPLATES + CUSTOM FIELDS
   ========================================================================== */

function renderDomainsSettings(){
  function domainCard(title, key, inputId){
    var rows = state[key].map(function(d){
      return '<tr><td>'+escapeHtml(d.name)+'</td><td><span class="status-badge status-'+(d.active?'active':'inactive')+'">'+(d.active?'Active':'Inactive')+'</span></td>'+
        '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="toggleActive(\''+key+'\',\''+d.id+'\')">'+(d.active?'Deactivate':'Activate')+'</button>'+
        '<button class="btn btn-sm btn-ghost" onclick="deleteEntity(\''+key+'\',\''+d.id+'\')">'+ICONS("trash")+'</button></td></tr>';
    }).join("");
    return '<div class="card"><div class="card-header"><h3>'+title+'</h3></div>'+
      '<div class="inline-add"><input class="field-input" id="'+inputId+'" placeholder="e.g. Punctuality"/><button class="btn btn-primary btn-sm" onclick="addDomain(\''+key+'\',\''+inputId+'\')">Add</button></div>'+
      (rows?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Domain</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'')+
    '</div>';
  }
  return domainCard("Affective Domains", "affectiveDomains", "new-affective") +
         domainCard("Psychomotor Domains", "psychomotorDomains", "new-psychomotor") +
    '<div class="card"><div class="card-header"><h3>Rating Levels</h3></div><p>'+state.ratingLevels.join(" &middot; ")+'</p>'+
    '<p class="muted small">Used across affective/psychomotor rating dropdowns.</p></div>';
}
function addDomain(key, inputId){
  var name = el(inputId).value.trim();
  if (!name){ toast("Enter a domain name.", "error"); return; }
  state[key].push({ id: uid("dom"), name:name, active:true });
  addAudit(state, "Domain added", name);
  scheduleSave(); renderApp();
}

var RC_THEMES = [
  ["classic-navy","Classic Navy (double border, gold accent)"],
  ["modern-teal","Modern Teal (clean, solid border)"],
  ["royal-purple","Royal Purple (formal, gold accent)"],
  ["crimson-gold","Crimson & Gold (bold, formal)"],
  ["corporate-slate","Corporate Slate (minimal, professional)"],
  ["elegant-serif","Elegant Serif (traditional, understated)"],
  ["sunburst-orange","Sunburst Orange (playful, child-friendly)"],
  ["forest-green","Forest Green (warm, natural)"],
  ["minimal-mono","Minimal Monochrome (clean, modern)"],
  ["double-frame-formal","Double Frame Formal (ornate border)"]
];

function renderTemplatesSettings(){
  var themeOptions = function(current){
    return RC_THEMES.map(function(t){
      return '<option value="'+t[0]+'"'+(current===t[0]?' selected':'')+'>'+t[1]+'</option>';
    }).join("");
  };
  var rows = state.reportTemplates.map(function(t){
    return '<div class="card"><div class="card-header"><h3>'+escapeHtml(t.name)+'</h3>'+
      '<span class="status-badge status-'+(t.active?'active':'inactive')+'">'+(t.active?'Active':'Inactive')+'</span></div>'+
      '<p class="muted small">Sections: '+t.sectionIds.map(sectionName).join(", ")+'</p>'+
      '<label class="field-label">Visual Theme</label><select class="field-input" onchange="updateTemplateStyle(\''+t.id+'\',this.value)">'+themeOptions(t.style)+'</select>'+
      '<div class="form-grid form-grid-4" style="margin-top:12px">'+
        checkToggle(t.id,'showPhoto','Show student photo',t.showPhoto)+
        checkToggle(t.id,'showAttendance','Show attendance',t.showAttendance)+
        checkToggle(t.id,'showAffective','Show skills/behaviours',t.showAffective)+
        checkToggle(t.id,'showFees','Show fees',t.showFees)+
      '</div>'+
      '<div class="card-footer">'+
        '<label class="checkbox-row"><input type="radio" name="default-template-'+t.sectionIds[0]+'" '+(t.isDefault?'checked':'')+' onchange="setDefaultTemplate(\''+t.id+'\')"/> Set as default for this section</label>'+
        '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="deleteReportTemplate(\''+t.id+'\')">'+ICONS("trash")+' Delete</button>'+
      '</div>'+
    '</div>';
  }).join("");

  var sectionChecks = state.sections.map(function(s){return '<label class="check-chip"><input type="checkbox" class="new-template-section" value="'+s.id+'"/> '+escapeHtml(s.name)+'</label>';}).join("");

  return rows +
  '<div class="card"><div class="card-header"><h3>Create New Report Template</h3></div>'+
    '<input class="field-input" id="new-template-name" placeholder="e.g. SS Executive Slate"/>'+
    '<label class="field-label" style="margin-top:10px">Visual Theme</label><select class="field-input" id="new-template-style">'+themeOptions(null)+'</select>'+
    '<label class="field-label" style="margin-top:10px">Applies to sections</label><div class="check-chip-group">'+sectionChecks+'</div>'+
    '<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="addReportTemplate()">Create Template</button>'+
  '</div>'+
  '<div class="banner">Preview any theme from the Report Cards page — pick a class, choose a template from the dropdown, then Preview a student.</div>';
}
function checkToggle(templateId, field, label, checked){
  return '<label class="checkbox-row"><input type="checkbox" '+(checked?'checked':'')+' onchange="toggleTemplateFlag(\''+templateId+'\',\''+field+'\',this.checked)"/> '+label+'</label>';
}
function toggleTemplateFlag(templateId, field, value){
  var t = byId(state.reportTemplates, templateId);
  t[field] = value;
  scheduleSave(); renderApp();
}
function updateTemplateStyle(templateId, style){
  var t = byId(state.reportTemplates, templateId);
  t.style = style;
  addAudit(state, "Report template style changed", t.name+" -> "+style);
  scheduleSave(); renderApp();
}
function setDefaultTemplate(templateId){
  var t = byId(state.reportTemplates, templateId);
  state.reportTemplates.filter(function(x){return x.sectionIds.some(function(s){return t.sectionIds.indexOf(s)>-1;});}).forEach(function(x){x.isDefault=false;});
  t.isDefault = true;
  scheduleSave(); renderApp();
}
function addReportTemplate(){
  var name = el("new-template-name").value.trim();
  var style = el("new-template-style").value;
  var sectionIds = qsa(".new-template-section:checked").map(function(c){return c.value;});
  if (!name || !sectionIds.length){ toast("Enter a name and select at least one section.", "error"); return; }
  state.reportTemplates.push({ id: uid("rt"), name:name, sectionIds:sectionIds, style:style,
    showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true });
  addAudit(state, "Report template created", name);
  toast("Template created.");
  scheduleSave(); renderApp();
}
function deleteReportTemplate(templateId){
  var t = byId(state.reportTemplates, templateId);
  if (t.isDefault){ toast("This is a section's default template. Set another template as default first.", "error"); return; }
  if (!window.confirm("Delete the \""+t.name+"\" template? This cannot be undone.")) return;
  state.reportTemplates = state.reportTemplates.filter(function(x){return x.id!==templateId;});
  addAudit(state, "Report template deleted", t.name);
  toast("Template deleted.");
  scheduleSave(); renderApp();
}

function renderCustomFieldsSettings(){
  var rows = state.customFieldDefs.map(function(cf){
    return '<tr><td>'+escapeHtml(cf.name)+'</td><td>'+cf.type+'</td><td>'+(cf.required?"Required":"Optional")+'</td>'+
      '<td>'+(cf.sectionIds&&cf.sectionIds.length?cf.sectionIds.map(sectionName).join(", "):"All sections")+'</td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="toggleActive(\'customFieldDefs\',\''+cf.id+'\')">'+(cf.active?'Deactivate':'Activate')+'</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="deleteEntity(\'customFieldDefs\',\''+cf.id+'\')">'+ICONS("trash")+'</button></td></tr>';
  }).join("");
  return '<div class="card"><div class="card-header"><h3>Custom Student Fields</h3></div>'+
    '<div class="form-grid form-grid-4">'+
      '<div><input class="field-input" id="cf-name" placeholder="Field name e.g. House"/></div>'+
      '<div><select class="field-input" id="cf-type"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Dropdown</option></select></div>'+
      '<div><label class="checkbox-row"><input type="checkbox" id="cf-required"/> Required</label></div>'+
      '<div><button class="btn btn-primary btn-block" onclick="addCustomField()">Add Field</button></div>'+
    '</div>'+
    (rows?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Required?</th><th>Sections</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty-inline">No custom fields defined yet.</div>')+
  '</div>';
}
function addCustomField(){
  var name = el("cf-name").value.trim();
  if (!name){ toast("Enter a field name.", "error"); return; }
  state.customFieldDefs.push({ id: uid("cf"), name:name, type: el("cf-type").value, required: el("cf-required").checked, sectionIds:[], order: state.customFieldDefs.length+1, active:true });
  addAudit(state, "Custom field added", name);
  scheduleSave(); renderApp();
}
/* ==========================================================================
   21 - SETTINGS: SCHOOL PROFILE/BRANDING + SESSIONS/TERMS
   ========================================================================== */

function renderSchoolProfileSettings(){
  var s = state.school;
  return '<div class="card"><div class="card-header"><h3>School Profile</h3></div>'+
    '<div class="photo-uploader">'+
      '<div class="photo-preview" id="logo-preview">'+(s.logo?'<img src="'+s.logo+'"/>':'<span>'+ICONS("camera")+'</span>')+'</div>'+
      '<input type="file" accept="image/*" id="logo-input" style="display:none" onchange="handleLogoSelect(event)"/>'+
      '<div class="photo-actions"><button class="btn btn-sm btn-secondary" onclick="document.getElementById(\'logo-input\').click()">Upload Logo</button></div>'+
    '</div>'+
    '<div class="form-grid">'+
      '<div><label class="field-label">School Name</label><input class="field-input" id="school-name" value="'+escapeHtml(s.name)+'"/></div>'+
      '<div><label class="field-label">Motto</label><input class="field-input" id="school-motto" value="'+escapeHtml(s.motto)+'"/></div>'+
      '<div class="span-2"><label class="field-label">Address</label><input class="field-input" id="school-address" value="'+escapeHtml(s.address)+'"/></div>'+
      '<div><label class="field-label">Phone</label><input class="field-input" id="school-phone" value="'+escapeHtml(s.phone)+'"/></div>'+
      '<div><label class="field-label">Email</label><input class="field-input" id="school-email" value="'+escapeHtml(s.email)+'"/></div>'+
      '<div><label class="field-label">Website</label><input class="field-input" id="school-website" value="'+escapeHtml(s.website)+'"/></div>'+
    '</div>'+
    '<button class="btn btn-primary" style="margin-top:12px" onclick="saveSchoolProfile()">Save Profile</button>'+
  '</div>';
}
var _pendingLogo = null;
function handleLogoSelect(e){
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(){
    compressImage(reader.result, 240, function(compressed){
      _pendingLogo = compressed;
      el("logo-preview").innerHTML = '<img src="'+compressed+'"/>';
    });
  };
  reader.readAsDataURL(file);
}
function saveSchoolProfile(){
  state.school.name = el("school-name").value.trim();
  state.school.motto = el("school-motto").value.trim();
  state.school.address = el("school-address").value.trim();
  state.school.phone = el("school-phone").value.trim();
  state.school.email = el("school-email").value.trim();
  state.school.website = el("school-website").value.trim();
  if (_pendingLogo) state.school.logo = _pendingLogo;
  addAudit(state, "School profile updated", state.school.name);
  toast("School profile saved.");
  _pendingLogo = null;
  scheduleSave(); renderApp();
}

function renderSessionsSettings(){
  var sessionRows = state.sessions.map(function(s){
    var termCount = state.terms.filter(function(t){return t.sessionId===s.id;}).length;
    return '<tr><td>'+escapeHtml(s.name)+'</td><td>'+termCount+' term(s)</td>'+
      '<td><span class="status-badge status-'+(s.active?'active':'inactive')+'">'+(s.active?'Active':'Inactive')+'</span></td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="renameEntity(\'sessions\',\''+s.id+'\')">Rename</button></td></tr>';
  }).join("");
  var termRows = state.terms.filter(function(t){return t.sessionId===state.currentSessionId;}).sort(function(a,b){return a.order-b.order;}).map(function(t){
    return '<tr><td>'+escapeHtml(t.name)+'</td><td>'+t.order+'</td>'+
      '<td><input type="date" class="field-input field-input-sm" value="'+(t.nextTermStartDate||'')+'" onchange="updateTermStartDate(\''+t.id+'\',this.value)"/></td>'+
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="renameEntity(\'terms\',\''+t.id+'\')">Rename</button></td></tr>';
  }).join("");
  return '<div class="grid-2">'+
    '<div class="card"><div class="card-header"><h3>Academic Sessions</h3></div>'+
      '<div class="inline-add"><input class="field-input" id="new-session-name" placeholder="e.g. 2027/2028"/><button class="btn btn-primary btn-sm" onclick="addSession()">Add Session</button></div>'+
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Session</th><th>Terms</th><th>Status</th><th></th></tr></thead><tbody>'+sessionRows+'</tbody></table></div>'+
    '</div>'+
    '<div class="card"><div class="card-header"><h3>Terms — current session</h3></div>'+
      '<div class="inline-add"><input class="field-input" id="new-term-name" placeholder="e.g. Fourth Term"/><button class="btn btn-primary btn-sm" onclick="addTerm()">Add Term</button></div>'+
      '<p class="muted small">"Next Term Begins" prints on report cards.</p>'+
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Term</th><th>Order</th><th>Next Term Begins</th><th></th></tr></thead><tbody>'+termRows+'</tbody></table></div>'+
    '</div>'+
  '</div>';
}
function addSession(){
  var name = el("new-session-name").value.trim();
  if (!name){ toast("Enter a session name.", "error"); return; }
  var newSession = { id: uid("sess"), name:name, active:true };
  state.sessions.push(newSession);
  ["First Term","Second Term","Third Term"].forEach(function(n,i){
    state.terms.push({ id: uid("term"), sessionId:newSession.id, name:n, order:i+1, nextTermStartDate:"" });
  });
  addAudit(state, "Session created", name);
  scheduleSave(); renderApp();
}
function addTerm(){
  var name = el("new-term-name").value.trim();
  if (!name){ toast("Enter a term name.", "error"); return; }
  var count = state.terms.filter(function(t){return t.sessionId===state.currentSessionId;}).length;
  state.terms.push({ id: uid("term"), sessionId: state.currentSessionId, name:name, order: count+1, nextTermStartDate:"" });
  addAudit(state, "Term created", name);
  scheduleSave(); renderApp();
}
function updateTermStartDate(termId, value){
  var t = byId(state.terms, termId);
  t.nextTermStartDate = value;
  scheduleSave(); renderApp();
}
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
/* ==========================================================================
   23 - BOOT
   ========================================================================== */

var deferredInstallPrompt = null;
var installPromptAvailable = false;
window.addEventListener("beforeinstallprompt", function(e){
  e.preventDefault();
  deferredInstallPrompt = e;
  installPromptAvailable = true;
  qsa(".install-app-btn").forEach(function(btn){ btn.style.display = ""; });
});
function triggerInstall(){
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(function(){
    deferredInstallPrompt = null;
    installPromptAvailable = false;
    qsa(".install-app-btn").forEach(function(btn){ btn.style.display = "none"; });
  });
}

window.addEventListener("DOMContentLoaded", function(){
  var root = el("app-root");
  if (root) root.innerHTML = '<div class="boot-loading"><div class="boot-spinner"></div><p>Connecting to the live school database…</p></div>';
  loadState(function(){ restoreLocalSession(); renderApp(); });
  if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js").catch(function(){ /* offline install optional */ });
  }
  window.addEventListener("online", function(){ toast("Back online — syncing with the live database."); });
  window.addEventListener("offline", function(){ toast("You're offline — changes will sync once you're back online.", "warn"); });
});
