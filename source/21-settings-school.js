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
