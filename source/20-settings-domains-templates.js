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
