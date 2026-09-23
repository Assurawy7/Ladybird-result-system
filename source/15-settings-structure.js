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
