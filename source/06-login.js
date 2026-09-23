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
