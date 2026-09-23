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
