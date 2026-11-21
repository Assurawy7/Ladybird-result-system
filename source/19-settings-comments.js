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
      '<td class="actions-cell"><button class="btn btn-sm btn-ghost" onclick="uploadSignature(\''+s.id+'\')">'+(s.image?'Replace':'Upload')+'</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="renameSignature(\''+s.id+'\')">Rename</button>'+
      (s.image?'<button class="btn btn-sm btn-ghost" onclick="clearSignatureImage(\''+s.id+'\')">Remove image</button>':'')+
      '<button class="btn btn-sm btn-ghost" onclick="toggleActive(\'signatures\',\''+s.id+'\')">'+(s.active?'Deactivate':'Activate')+'</button>'+
      '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="deleteEntity(\'signatures\',\''+s.id+'\')">'+ICONS("trash")+'</button></td></tr>';
  }).join("");

  var teachersWithoutSig = state.users.filter(function(u){
    return u.role==="TEACHER" && !state.signatures.some(function(s){return s.userId===u.id;});
  });
  var teacherOptions = teachersWithoutSig.map(function(t){return '<option value="'+t.id+'">'+escapeHtml(t.name)+'</option>';}).join("");

  /* Principal's signature: always has a place to add / replace / rename, even
     when the Principal slot was never created or was deleted. */
  var principalSig = state.signatures.filter(function(x){return x.role==="PRINCIPAL";})[0] || null;
  var principalUser = state.users.filter(function(u){return u.role==="PRINCIPAL" && u.active;})[0];
  var principalName = principalSig ? principalSig.name : (principalUser ? principalUser.name : "");
  var principalPanel =
    '<div class="card"><div class="card-header"><h3>Principal\'s Signature</h3></div>'+
      '<p class="muted small">Printed above the Principal\'s name on every report card. Upload a clear photo or scan of the signature on white paper.</p>'+
      '<div class="inline-add inline-add-wrap" style="align-items:center">'+
        '<div style="min-width:180px;min-height:64px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--border,#C3CBD8);border-radius:8px;padding:6px;background:#fff">'+
          (principalSig && principalSig.image ? '<img src="'+principalSig.image+'" class="sig-thumb" style="max-height:64px"/>' : '<span class="muted small">No signature uploaded</span>')+'</div>'+
        '<input class="field-input" id="principal-sig-name" placeholder="Principal\'s name (printed under the signature)" value="'+escapeHtml(principalName)+'"/>'+
        '<button class="btn btn-primary btn-sm" onclick="uploadPrincipalSignature()">'+(principalSig && principalSig.image ? 'Replace Signature' : 'Upload Signature')+'</button>'+
        '<button class="btn btn-secondary btn-sm" onclick="savePrincipalSignatureName()">Save Name</button>'+
        (principalSig && principalSig.image ? '<button class="btn btn-ghost btn-sm" onclick="clearSignatureImage(\''+principalSig.id+'\')">Remove image</button>' : '')+
        (principalSig && !principalSig.active ? '<button class="btn btn-ghost btn-sm" onclick="toggleActive(\'signatures\',\''+principalSig.id+'\')">Activate (currently hidden on reports)</button>' : '')+
      '</div>'+
    '</div>';

  return ''+
  principalPanel+
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
/* Finds the Principal's signature slot, creating it when missing. */
function ensurePrincipalSlot(){
  var sig = state.signatures.filter(function(x){return x.role==="PRINCIPAL";})[0];
  if (sig) return sig;
  var pu = state.users.filter(function(u){return u.role==="PRINCIPAL" && u.active;})[0];
  var nameEl = el("principal-sig-name");
  var nm = (nameEl && nameEl.value.trim()) || (pu ? pu.name : "Principal");
  sig = { id: uid("sig"), role:"PRINCIPAL", userId: pu ? pu.id : null, name:nm, image:"", active:true };
  state.signatures.push(sig);
  addAudit(state, "Signature slot added", nm + " (Principal)");
  return sig;
}
function uploadPrincipalSignature(){
  var sig = ensurePrincipalSlot();
  _sigTargetId = sig.id;
  el("sig-file-input").click();
}
function savePrincipalSignatureName(){
  var nm = el("principal-sig-name").value.trim();
  if (!nm){ toast("Enter the Principal's name.", "error"); return; }
  var sig = ensurePrincipalSlot();
  sig.name = nm; sig.active = true;
  addAudit(state, "Signature name updated", nm + " (Principal)");
  toast("Principal's name saved.");
  scheduleSave(); renderApp();
}
function renameSignature(sigId){
  var sig = byId(state.signatures, sigId); if (!sig) return;
  var nm = window.prompt("Name printed under this signature:", sig.name || "");
  if (nm === null) return;
  nm = nm.trim(); if (!nm){ toast("Name cannot be empty.", "error"); return; }
  sig.name = nm;
  addAudit(state, "Signature name updated", nm);
  scheduleSave(); renderApp();
}
function clearSignatureImage(sigId){
  var sig = byId(state.signatures, sigId); if (!sig) return;
  sig.image = "";
  addAudit(state, "Signature image removed", sig.name);
  toast("Signature image removed.");
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
      if (!sig) return;
      sig.image = compressed;
      addAudit(state, "Signature uploaded", sig.name);
      toast("Signature uploaded.");
      scheduleSave(); renderApp();
    });
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}

/* Looks up the actual signature image for whoever is the current Form
   Teacher of a given class-arm (used by the report card generator). */
function formTeacherSignatureFor(classArmId){
  var assign = state.formTeacherAssignments.filter(function(a){return a.classArmId===classArmId && a.active;})[0];
  if (!assign) return null;
  return state.signatures.filter(function(s){return s.role==="FORM_TEACHER" && s.userId===assign.teacherId && s.active;})[0] || null;
}
