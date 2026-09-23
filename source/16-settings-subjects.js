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
