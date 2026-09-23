/* ==========================================================================
   08 - STUDENTS: list, add/edit, bulk import, photo, movement, profile page
   ========================================================================== */

var REQUIRED_CORE_FIELDS = ["name","gender","dob","guardianPhone","address"];
var FIELD_LABELS = { name:"Full name", gender:"Gender", dob:"Date of birth", guardianPhone:"Parent/Guardian phone", address:"Address", photo:"Photo" };

/* Which classes show up in the Students list / Report Cards list for this
   person. Deliberately Form-Teacher-only (not subject-taught classes) - see
   canAccessClassArm's note for why. */
function accessibleClassArmIds(user){
  if (isWholeSchoolRole(user.role)) return state.classArms.map(function(c){return c.id;});
  return myFormClassArmIds(user.id);
}

function studentMissingFields(stu){
  var missing = [];
  REQUIRED_CORE_FIELDS.forEach(function(f){
    if (!stu[f] || String(stu[f]).trim()==="") missing.push(FIELD_LABELS[f]);
  });
  state.customFieldDefs.filter(function(cf){
    return cf.active && cf.required && (!cf.sectionIds || !cf.sectionIds.length || cf.sectionIds.indexOf(stu.sectionId)>-1);
  }).forEach(function(cf){
    if (!stu.customFields[cf.id] || String(stu.customFields[cf.id]).trim()==="") missing.push(cf.name);
  });
  return missing;
}

function renderStudentsView(){
  var user = state.currentUser;
  var allowedIds = accessibleClassArmIds(user);
  var vp = state.viewParams || {};
  var filterSection = vp.filterSection || "";
  var filterClass = vp.filterClass || "";
  var filterStatus = vp.filterStatus || "";
  var search = vp.search || "";

  var arms = state.classArms.filter(function(c){ return c.active && allowedIds.indexOf(c.id)>-1; });
  var armsFiltered = arms.filter(function(c){ return !filterSection || c.sectionId===filterSection; });

  var students = state.students.filter(function(s){ return allowedIds.indexOf(s.classArmId)>-1; });
  if (filterSection) students = students.filter(function(s){return s.sectionId===filterSection;});
  if (filterClass) students = students.filter(function(s){return s.classArmId===filterClass;});
  if (filterStatus) students = students.filter(function(s){return s.status===filterStatus;});
  if (search) {
    var q = search.toLowerCase();
    students = students.filter(function(s){ return s.name.toLowerCase().indexOf(q)>-1 || s.admissionNo.toLowerCase().indexOf(q)>-1; });
  }
  students = students.sort(function(a,b){ return a.name.localeCompare(b.name); });

  var sectionOptions = '<option value="">All Sections</option>' + state.sections.map(function(s){
    return '<option value="'+s.id+'"'+(filterSection===s.id?' selected':'')+'>'+escapeHtml(s.name)+'</option>';
  }).join("");
  var classOptions = '<option value="">All Classes</option>' + armsFiltered.map(function(c){
    return '<option value="'+c.id+'"'+(filterClass===c.id?' selected':'')+'>'+escapeHtml(c.name)+'</option>';
  }).join("");
  var statusOptions = ["Active","Inactive","Graduated","Transferred","Repeated"].map(function(s){
    return '<option value="'+s+'"'+(filterStatus===s?' selected':'')+'>'+s+'</option>';
  }).join("");

  var canAddAny = arms.some(function(c){ return isFormTeacherOf(user, c.id) || isWholeSchoolRole(user.role); });

  var rows = students.map(function(stu){
    var missing = studentMissingFields(stu);
    var ca = byId(state.classArms, stu.classArmId);
    var canEdit = isFormTeacherOf(user, stu.classArmId);
    var photoHtml = stu.photo ? '<img src="'+stu.photo+'" class="avatar-photo"/>' : '<div class="avatar-photo avatar-fallback">'+escapeHtml(stu.name[0])+'</div>';
    return '<tr>'+
      '<td>'+photoHtml+'</td>'+
      '<td><strong>'+escapeHtml(stu.name)+'</strong><div class="muted small">'+escapeHtml(stu.admissionNo)+'</div></td>'+
      '<td>'+escapeHtml(stu.gender||"—")+'</td>'+
      '<td>'+escapeHtml(ca?ca.name:"—")+(stu.departmentId?'<div class="muted small">'+escapeHtml(departmentName(stu.departmentId))+'</div>':'')+'</td>'+
      '<td><span class="status-badge status-'+stu.status.toLowerCase()+'">'+stu.status+'</span></td>'+
      '<td>'+(missing.length===0 ? '<span class="chip chip-good">Complete</span>' : '<span class="chip chip-warn">'+missing.length+' field'+(missing.length>1?'s':'')+' missing</span>')+'</td>'+
      '<td class="actions-cell">'+
        '<button class="btn btn-sm btn-ghost" onclick="viewStudentProfile(\''+stu.id+'\')">View</button>'+
        (canEdit ? '<button class="btn btn-sm btn-ghost" onclick="openStudentForm(\''+stu.id+'\')">Edit</button>' : '')+
        (canEdit ? '<button class="btn btn-sm btn-ghost" style="color:#8E2A3B" onclick="deleteStudent(\''+stu.id+'\')">Delete</button>' : '')+
      '</td>'+
    '</tr>';
  }).join("");

  return ''+
  '<div class="page-header page-header-row">'+
    '<div><h2>Students</h2><p>'+students.length+' student'+(students.length===1?'':'s')+' visible to you</p></div>'+
    (canAddAny ? '<div class="page-header-actions">'+
      '<button class="btn btn-secondary" onclick="openBulkImport()">Import / Bulk Add</button>'+
      '<button class="btn btn-primary" onclick="openStudentForm(null)">'+ICONS("plus")+' Add Student</button>'+
    '</div>' : '')+
  '</div>'+
  '<div class="filter-bar">'+
    '<select onchange="updateStudentFilter(\'filterSection\', this.value)">'+sectionOptions+'</select>'+
    '<select onchange="updateStudentFilter(\'filterClass\', this.value)">'+classOptions+'</select>'+
    '<select onchange="updateStudentFilter(\'filterStatus\', this.value)">'+'<option value="">All Statuses</option>'+statusOptions+'</select>'+
    '<input type="search" placeholder="Search name or admission no." value="'+escapeHtml(search)+'" oninput="updateStudentFilter(\'search\', this.value)"/>'+
  '</div>'+
  '<div class="card">'+
    (students.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Photo</th><th>Name</th><th>Gender</th><th>Class</th><th>Status</th><th>Profile</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
     : '<div class="empty-state"><h3>No students found</h3><p>Try adjusting your filters, or add a new student.</p></div>')+
  '</div>';
}

function updateStudentFilter(key, value){
  state.viewParams = state.viewParams || {};
  state.viewParams[key] = value;
  renderApp();
}

function viewStudentProfile(id){ goto("student-profile", { studentId: id }); }

function deleteStudent(studentId){
  var user = state.currentUser;
  var stu = byId(state.students, studentId);
  if (!stu) return;
  assertPermission(isFormTeacherOf(user, stu.classArmId), "You can only delete students in your assigned class.");
  if (!window.confirm("Permanently delete "+stu.name+"? This removes their profile and all recorded scores/comments. This cannot be undone.")) return;
  if (!window.confirm("Are you absolutely sure? Historical results for this student will be lost.")) return;

  state.students = state.students.filter(function(s){ return s.id !== studentId; });
  state.scores = state.scores.filter(function(s){ return s.studentId !== studentId; });
  Object.keys(state.studentComments).forEach(function(k){ if (k.indexOf(studentId+"::")===0) delete state.studentComments[k]; });
  Object.keys(state.domainScores).forEach(function(k){ if (k.indexOf(studentId+"::")===0) delete state.domainScores[k]; });
  Object.keys(state.attendance).forEach(function(k){ if (k.indexOf(studentId+"::")===0) delete state.attendance[k]; });

  addAudit(state, "Student deleted", stu.name);
  toast("Student deleted.");
  if (state.view==="student-profile") goto("students");
  else { scheduleSave(); renderApp(); }
}

/* ---------- Add / Edit student modal ---------- */
function openStudentForm(studentId){
  var user = state.currentUser;
  var stu = studentId ? byId(state.students, studentId) : null;
  if (stu){ assertPermission(isFormTeacherOf(user, stu.classArmId), "You can only edit students in your assigned class."); }

  var allowedIds = accessibleClassArmIds(user);
  var myArms = state.classArms.filter(function(c){ return c.active && (isWholeSchoolRole(user.role) || myFormClassArmIds(user.id).indexOf(c.id)>-1); });
  var classArmId = stu ? stu.classArmId : (myArms[0] ? myArms[0].id : "");
  var section = byId(state.classArms, classArmId) ? byId(state.classArms, classArmId).sectionId : "";

  var classOptions = myArms.map(function(c){
    return '<option value="'+c.id+'" data-section="'+c.sectionId+'"'+(c.id===classArmId?' selected':'')+'>'+escapeHtml(c.name)+' ('+sectionName(c.sectionId)+')</option>';
  }).join("");

  var deptOptions = renderDeptOptionsFor(section, stu ? stu.departmentId : null);

  var html = ''+
  '<div class="modal-header"><h3>'+(stu?"Edit Student":"Add Student")+'</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    '<div class="photo-uploader">'+
      '<div class="photo-preview" id="photo-preview">'+(stu&&stu.photo?'<img src="'+stu.photo+'"/>':'<span>'+ICONS("camera")+'</span>')+'</div>'+
      '<input type="file" accept="image/*" id="photo-input" style="display:none" onchange="handlePhotoSelect(event)"/>'+
      '<div class="photo-actions">'+
        '<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById(\'photo-input\').click()">Upload Photo</button>'+
        (stu&&stu.photo?'<button type="button" class="btn btn-sm btn-ghost" onclick="clearPhotoPreview()">Remove</button>':'')+
      '</div>'+
    '</div>'+
    '<div class="form-grid">'+
      '<div><label class="field-label">Full Name *</label><input class="field-input" id="f-name" value="'+escapeHtml(stu?stu.name:'')+'"/></div>'+
      '<div><label class="field-label">Admission No.</label><input class="field-input" id="f-adm" value="'+escapeHtml(stu?stu.admissionNo:'LB/'+Math.floor(1000+Math.random()*9000))+'"/></div>'+
      '<div><label class="field-label">Gender *</label><select class="field-input" id="f-gender">'+
        '<option value="">Select</option><option value="Male"'+(stu&&stu.gender==="Male"?' selected':'')+'>Male</option><option value="Female"'+(stu&&stu.gender==="Female"?' selected':'')+'>Female</option></select></div>'+
      '<div><label class="field-label">Date of Birth *</label><input type="date" class="field-input" id="f-dob" value="'+(stu?stu.dob:'')+'"/></div>'+
      '<div><label class="field-label">Class / Arm *</label><select class="field-input" id="f-classarm" onchange="onFormClassChange(this.value)">'+classOptions+'</select></div>'+
      '<div id="f-dept-wrap">'+deptOptions+'</div>'+
      '<div><label class="field-label">Parent/Guardian Phone *</label><input class="field-input" id="f-phone" value="'+escapeHtml(stu?stu.guardianPhone:'')+'"/></div>'+
      '<div><label class="field-label">Status</label><select class="field-input" id="f-status">'+
        ["Active","Inactive","Graduated","Transferred","Repeated"].map(function(s){return '<option value="'+s+'"'+(stu&&stu.status===s?' selected':(!stu&&s==="Active"?' selected':''))+'>'+s+'</option>';}).join("")+
      '</select></div>'+
      '<div class="span-2"><label class="field-label">Address *</label><input class="field-input" id="f-address" value="'+escapeHtml(stu?stu.address:'')+'"/></div>'+
    '</div>'+
    '<div id="f-subjects-wrap">'+renderSubjectChecklistFor(section, stu?stu.departmentId:null, stu?stu.subjectIds:undefined)+'</div>'+
  '</div>'+
  '<div class="modal-footer">'+
    '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveStudentForm('+(stu?"'"+stu.id+"'":"null")+')">Save</button>'+
  '</div>';
  openModal(html, {wide:true});
}

function renderDeptOptionsFor(sectionId, selectedDeptId){
  var depts = state.departments.filter(function(d){ return d.active && d.sectionId===sectionId; });
  if (!depts.length) return "";
  return '<div><label class="field-label">Department / Category</label><select class="field-input" id="f-dept" onchange="onFormDeptChange(this.value)">'+
    '<option value="">None</option>'+
    depts.map(function(d){ return '<option value="'+d.id+'"'+(d.id===selectedDeptId?' selected':'')+'>'+escapeHtml(d.name)+'</option>'; }).join("")+
    '</select></div>';
}

/* Checklist of department-restricted subjects a student can individually
   take/not-take - lets a Form Teacher fine-tune beyond just "Department"
   (e.g. a Science student who also takes Government, or skips Chemistry).
   Compulsory/general subjects (no department restriction) aren't shown here
   since they always apply to everyone automatically. */
function renderSubjectChecklistFor(sectionId, deptId, explicitSubjectIds){
  var deptSubjects = state.subjects.filter(function(su){
    return su.active && su.sectionIds.indexOf(sectionId)>-1 && su.departmentIds && su.departmentIds.length;
  });
  if (!deptSubjects.length) return "";
  var byDept = {};
  deptSubjects.forEach(function(su){
    su.departmentIds.forEach(function(dId){
      if (!byDept[dId]) byDept[dId] = [];
      byDept[dId].push(su);
    });
  });
  var groupsHtml = Object.keys(byDept).map(function(dId){
    var dept = byId(state.departments, dId);
    var checks = byDept[dId].map(function(su){
      var checked = explicitSubjectIds !== undefined && explicitSubjectIds !== null
        ? explicitSubjectIds.indexOf(su.id) > -1
        : (deptId === dId);
      return '<label class="check-chip"><input type="checkbox" class="stu-subject-check" value="'+su.id+'" '+(checked?'checked':'')+'/> '+escapeHtml(su.name)+'</label>';
    }).join("");
    return '<div><span class="muted small">'+escapeHtml(dept?dept.name:"")+'</span><div class="check-chip-group">'+checks+'</div></div>';
  }).join("");
  return '<label class="field-label" style="margin-top:14px">Individual Subjects (fine-tune beyond Department - useful for mixed classes)</label>'+groupsHtml;
}

function onFormClassChange(classArmId){
  var ca = byId(state.classArms, classArmId);
  el("f-dept-wrap").innerHTML = renderDeptOptionsFor(ca.sectionId, null);
  el("f-subjects-wrap").innerHTML = renderSubjectChecklistFor(ca.sectionId, null, undefined);
}
function onFormDeptChange(deptId){
  var classArmId = el("f-classarm").value;
  var ca = byId(state.classArms, classArmId);
  el("f-subjects-wrap").innerHTML = renderSubjectChecklistFor(ca.sectionId, deptId, undefined);
}

var _pendingPhotoDataUrl = null;
function handlePhotoSelect(e){
  var file = e.target.files[0];
  if (!file) return;
  if (!file.type.match(/^image\//)){ toast("Please select an image file.", "error"); return; }
  if (file.size > 3*1024*1024){ toast("Image is too large (max 3MB).", "error"); return; }
  var reader = new FileReader();
  reader.onload = function(){
    compressImage(reader.result, 300, function(compressed){
      _pendingPhotoDataUrl = compressed;
      el("photo-preview").innerHTML = '<img src="'+compressed+'"/>';
    });
  };
  reader.readAsDataURL(file);
}
function clearPhotoPreview(){
  _pendingPhotoDataUrl = "REMOVE";
  el("photo-preview").innerHTML = '<span>'+ICONS("camera")+'</span>';
}
function compressImage(dataUrl, maxDim, cb){
  var img = new Image();
  img.onload = function(){
    var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    var canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width*scale); canvas.height = Math.round(img.height*scale);
    var ctx = canvas.getContext("2d");
    // Fill white first: JPEG has no transparency, so any transparent pixels
    // (common in signature/logo scans) would otherwise flatten to BLACK.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    cb(canvas.toDataURL("image/jpeg", 0.82));
  };
  img.src = dataUrl;
}

function saveStudentForm(studentId){
  var user = state.currentUser;
  var name = el("f-name").value.trim();
  if (!name){ toast("Full name is required.", "error"); return; }
  var classArmId = el("f-classarm").value;
  if (!classArmId){ toast("Please select a class.", "error"); return; }
  assertPermission(isFormTeacherOf(user, classArmId), "You can only add/edit students in your assigned class.");
  var ca = byId(state.classArms, classArmId);
  var deptEl = el("f-dept");

  var data = {
    name: name,
    admissionNo: el("f-adm").value.trim(),
    gender: el("f-gender").value,
    dob: el("f-dob").value,
    classArmId: classArmId,
    sectionId: ca.sectionId,
    departmentId: deptEl ? (deptEl.value||null) : null,
    guardianPhone: el("f-phone").value.trim(),
    address: el("f-address").value.trim(),
    status: el("f-status").value
  };
  var subjectChecks = qsa(".stu-subject-check");
  if (subjectChecks.length){
    data.subjectIds = subjectChecks.filter(function(c){return c.checked;}).map(function(c){return c.value;});
  }

  if (studentId){
    var stu = byId(state.students, studentId);
    var moved = stu.classArmId !== classArmId;
    Object.assign(stu, data);
    if (_pendingPhotoDataUrl==="REMOVE"){ stu.photo=""; }
    else if (_pendingPhotoDataUrl){ stu.photo = _pendingPhotoDataUrl; }
    if (moved){
      stu.enrollmentHistory.push({ sessionId: state.currentSessionId, classArmId: classArmId, sectionId: ca.sectionId, departmentId: data.departmentId });
      addAudit(state, "Student moved", stu.name+" -> "+ca.name);
    }
    addAudit(state, "Student edited", stu.name);
    toast("Student updated.");
  } else {
    var newStu = Object.assign({
      id: uid("stu"), customFields:{}, createdAt: Date.now(),
      enrollmentHistory: [{ sessionId: state.currentSessionId, classArmId: classArmId, sectionId: ca.sectionId, departmentId: data.departmentId }]
    }, data);
    if (_pendingPhotoDataUrl && _pendingPhotoDataUrl!=="REMOVE") newStu.photo = _pendingPhotoDataUrl; else newStu.photo="";
    state.students.push(newStu);
    addAudit(state, "Student created", newStu.name);
    toast("Student added.");
  }
  _pendingPhotoDataUrl = null;
  closeModal();
  scheduleSave();
  renderApp();
}

/* ---------- Bulk import ---------- */
function openBulkImport(){
  var user = state.currentUser;
  var myArms = state.classArms.filter(function(c){ return c.active && (isWholeSchoolRole(user.role) || myFormClassArmIds(user.id).indexOf(c.id)>-1); });
  var classOptions = myArms.map(function(c){ return '<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>'; }).join("");
  var html = ''+
  '<div class="modal-header"><h3>Bulk Add Students</h3><button class="icon-btn" onclick="closeModal()">'+ICONS("x")+'</button></div>'+
  '<div class="modal-body">'+
    '<label class="field-label">Target Class</label>'+
    '<select class="field-input" id="bulk-classarm">'+classOptions+'</select>'+
    '<label class="field-label" style="margin-top:12px">Paste rows (one student per line)</label>'+
    '<p class="muted small">Format: Full Name | Gender | Date of Birth (YYYY-MM-DD) | Parent Phone | Address</p>'+
    '<textarea class="field-input" id="bulk-text" rows="8" placeholder="Ahmad Musa | Male | 2013-04-12 | 0803 000 1111 | 12 Palm Street'+"\n"+'Aisha Ali | Female | 2013-05-01 | 0803 111 2222 | 4 Zoo Road"></textarea>'+
    '<div id="bulk-preview"></div>'+
  '</div>'+
  '<div class="modal-footer">'+
    '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-secondary" onclick="previewBulkImport()">Preview</button>'+
    '<button class="btn btn-primary" id="bulk-confirm" style="display:none" onclick="confirmBulkImport()">Import Valid Rows</button>'+
  '</div>';
  openModal(html);
}

var _bulkParsedRows = [];
function previewBulkImport(){
  var text = el("bulk-text").value.trim();
  var lines = text.split("\n").map(function(l){return l.trim();}).filter(Boolean);
  _bulkParsedRows = lines.map(function(line){
    var parts = line.split("|").map(function(p){return p.trim();});
    var row = { name:parts[0]||"", gender:parts[1]||"", dob:parts[2]||"", guardianPhone:parts[3]||"", address:parts[4]||"" };
    var errors = [];
    if (!row.name) errors.push("Missing name");
    if (row.gender && ["Male","Female"].indexOf(row.gender)===-1) errors.push("Gender must be Male or Female");
    row.errors = errors;
    return row;
  });
  var rowsHtml = _bulkParsedRows.map(function(r,i){
    var ok = r.errors.length===0;
    return '<tr class="'+(ok?'':'row-error')+'"><td>'+(i+1)+'</td><td>'+escapeHtml(r.name)+'</td><td>'+escapeHtml(r.gender)+'</td><td>'+escapeHtml(r.dob)+'</td><td>'+escapeHtml(r.guardianPhone)+'</td>'+
      '<td>'+(ok?'<span class="chip chip-good">Valid</span>':'<span class="chip chip-error">'+escapeHtml(r.errors.join(", "))+'</span>')+'</td></tr>';
  }).join("");
  var validCount = _bulkParsedRows.filter(function(r){return r.errors.length===0;}).length;
  el("bulk-preview").innerHTML = '<div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>#</th><th>Name</th><th>Gender</th><th>DOB</th><th>Phone</th><th>Status</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>'+
    '<p class="muted small">'+validCount+' of '+_bulkParsedRows.length+' rows are valid and will be imported.</p>';
  if (validCount>0) el("bulk-confirm").style.display = "inline-flex";
}

function confirmBulkImport(){
  var classArmId = el("bulk-classarm").value;
  assertPermission(isFormTeacherOf(state.currentUser, classArmId), "You can only add students to your assigned class.");
  var ca = byId(state.classArms, classArmId);
  var count = 0;
  _bulkParsedRows.filter(function(r){return r.errors.length===0;}).forEach(function(r){
    state.students.push({
      id: uid("stu"), admissionNo: "LB/"+Math.floor(1000+Math.random()*9000),
      name:r.name, gender:r.gender, dob:r.dob, photo:"",
      sectionId: ca.sectionId, classArmId: classArmId, departmentId:null,
      status:"Active", guardianPhone:r.guardianPhone, address:r.address, customFields:{},
      enrollmentHistory:[{ sessionId: state.currentSessionId, classArmId: classArmId, sectionId: ca.sectionId, departmentId:null }],
      createdAt: Date.now()
    });
    count++;
  });
  addAudit(state, "Bulk student import", count+" students into "+ca.name);
  toast(count+" students imported.");
  closeModal(); scheduleSave(); renderApp();
}

/* ---------- Student profile / academic history page ---------- */
function renderStudentProfile(){
  var user = state.currentUser;
  var stu = byId(state.students, (state.viewParams||{}).studentId);
  if (!stu) return '<div class="empty-state"><h3>Student not found</h3></div>';
  assertPermission(canAccessClassArm(user, stu.classArmId), "You cannot view students outside your assigned classes.");

  var missing = studentMissingFields(stu);
  var ca = byId(state.classArms, stu.classArmId);
  var historyRows = stu.enrollmentHistory.slice().reverse().map(function(h){
    var hca = byId(state.classArms, h.classArmId);
    return '<tr><td>'+escapeHtml(sessionName(h.sessionId))+'</td><td>'+escapeHtml(hca?hca.name:"—")+'</td><td>'+escapeHtml(sectionName(h.sectionId))+'</td><td>'+escapeHtml(departmentName(h.departmentId))+'</td></tr>';
  }).join("");

  var termResultsHtml = state.terms.filter(function(t){return t.sessionId===state.currentSessionId;}).map(function(t){
    var overall = computeStudentOverall(stu.id, stu.classArmId, state.currentSessionId, t.id);
    var rows = overall.subjectRows.map(function(r){
      var display = r.calc.hasAbsent ? "ABSENT" : r.calc.hasExcused ? "EXCUSED" : (r.calc.isComplete ? r.calc.total : "—");
      return '<tr><td>'+escapeHtml(r.subject.name)+'</td><td>'+display+'</td><td>'+r.grade+'</td></tr>';
    }).join("");
    return '<div class="card">'+
      '<div class="card-header"><h3>'+escapeHtml(t.name)+'</h3>'+(overall.average!==null?'<span class="chip chip-good">Average: '+overall.average+'%</span>':'<span class="chip">Incomplete</span>')+'</div>'+
      (rows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Subject</th><th>Score</th><th>Grade</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-inline">No scores recorded.</div>')+
    '</div>';
  }).join("");

  var canEdit = isFormTeacherOf(user, stu.classArmId);
  var photoHtml = stu.photo ? '<img src="'+stu.photo+'" class="profile-photo"/>' : '<div class="profile-photo avatar-fallback">'+escapeHtml(stu.name[0])+'</div>';

  return ''+
  '<button class="btn btn-ghost btn-sm" onclick="goto(\'students\')">&larr; Back to Students</button>'+
  '<div class="page-header page-header-row">'+
    '<div class="profile-header">'+photoHtml+
      '<div><h2>'+escapeHtml(stu.name)+'</h2><p>'+escapeHtml(stu.admissionNo)+' &middot; '+escapeHtml(ca?ca.name:"")+(stu.departmentId?' · '+escapeHtml(departmentName(stu.departmentId)):'')+'</p>'+
      '<span class="status-badge status-'+stu.status.toLowerCase()+'">'+stu.status+'</span></div>'+
    '</div>'+
    (canEdit ? '<button class="btn btn-primary" onclick="openStudentForm(\''+stu.id+'\')">Edit Profile</button>' : '')+
    (canEdit ? '<button class="btn btn-ghost" style="color:#8E2A3B" onclick="deleteStudent(\''+stu.id+'\')">Delete Student</button>' : '')+
  '</div>'+
  (missing.length ? '<div class="banner banner-warn">Profile incomplete — missing: '+missing.join(", ")+'</div>' : '')+
  '<div class="grid-2">'+
    '<div class="card">'+
      '<div class="card-header"><h3>Basic Information</h3></div>'+
      '<div class="detail-list">'+
        '<div><span>Gender</span><strong>'+escapeHtml(stu.gender||"—")+'</strong></div>'+
        '<div><span>Date of Birth</span><strong>'+escapeHtml(stu.dob||"—")+'</strong></div>'+
        '<div><span>Parent/Guardian Phone</span><strong>'+escapeHtml(stu.guardianPhone||"—")+'</strong></div>'+
        '<div><span>Address</span><strong>'+escapeHtml(stu.address||"—")+'</strong></div>'+
      '</div>'+
    '</div>'+
    '<div class="card">'+
      '<div class="card-header"><h3>Academic History</h3></div>'+
      (historyRows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Session</th><th>Class</th><th>Section</th><th>Department</th></tr></thead><tbody>'+historyRows+'</tbody></table></div>' : '<div class="empty-inline">No history yet.</div>')+
    '</div>'+
  '</div>'+
  '<h3 class="section-title">Results — '+escapeHtml(sessionName(state.currentSessionId))+'</h3>'+
  termResultsHtml;
}
