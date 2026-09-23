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
