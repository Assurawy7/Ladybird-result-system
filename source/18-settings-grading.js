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
