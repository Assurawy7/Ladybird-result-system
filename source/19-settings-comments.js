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
