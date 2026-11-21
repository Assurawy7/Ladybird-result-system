// Runs INSIDE the page. Builds a realistic class for one section using the app's own seed + engine.
window.__buildWorld = function(sectionName, opts){
  opts = opts || {};
  var counts = opts.counts || [5,8,10,12,15,18,20,25,30];
  var st = seedState(); state = st;
  st.users.forEach(function(u){ if (u.role==='SUPER_ADMIN') st.currentUser = u; });
  function px(draw, w, h){ var c=document.createElement('canvas'); c.width=w; c.height=h; var g=c.getContext('2d'); draw(g,w,h); return c.toDataURL('image/png'); }
  var logo = px(function(g,w,h){ g.fillStyle='#0b6b3a'; g.beginPath(); g.arc(w/2,h/2,w/2-4,0,7); g.fill(); g.fillStyle='#fff'; g.font='bold 70px Georgia'; g.textAlign='center'; g.fillText('LB',w/2,h/2+24); g.strokeStyle='#e8c15a'; g.lineWidth=6; g.beginPath(); g.arc(w/2,h/2,w/2-14,0,7); g.stroke(); },160,160);
  var photo = function(i){ return px(function(g,w,h){ var grd=g.createLinearGradient(0,0,w,h); grd.addColorStop(0,'hsl('+(i*47%360)+',45%,70%)'); grd.addColorStop(1,'hsl('+((i*47+60)%360)+',50%,45%)'); g.fillStyle=grd; g.fillRect(0,0,w,h); g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.arc(w/2,h*0.38,w*0.22,0,7); g.fill(); g.beginPath(); g.ellipse(w/2,h*0.95,w*0.38,h*0.34,0,0,7); g.fill(); },120,144); };
  var sig = px(function(g,w,h){ g.strokeStyle='#1a2a5a'; g.lineWidth=3; g.beginPath(); g.moveTo(10,60); g.bezierCurveTo(40,0,60,90,90,30); g.bezierCurveTo(110,0,130,80,170,40); g.stroke(); },180,70);
  var stamp = px(function(g,w,h){ g.strokeStyle='#b3273a'; g.lineWidth=5; g.beginPath(); g.arc(w/2,h/2,w/2-8,0,7); g.stroke(); g.lineWidth=2; g.beginPath(); g.arc(w/2,h/2,w/2-20,0,7); g.stroke(); g.fillStyle='#b3273a'; g.font='bold 17px Arial'; g.textAlign='center'; g.fillText('LADYBIRD',w/2,h/2-2); g.fillText('COLLEGE',w/2,h/2+18); },120,120);
  if (!opts.noLogo) st.school.logo = logo;
  st.school.stamp = opts.noStamp ? '' : stamp;
  if (opts.schoolName) st.school.name = opts.schoolName;
  if (opts.motto !== undefined) st.school.motto = opts.motto;
  st.terms.forEach(function(t){ t.nextTermStartDate = '2027-01-11'; });
  var sec = st.sections.filter(function(s){return s.name===sectionName;})[0];
  var arm = st.classArms.filter(function(c){return c.sectionId===sec.id;})[0];
  var names = ['English Language','Mathematics','Basic Science','Basic Technology','Social Studies','Civic Education','Computer Studies','Agricultural Science','Business Studies','Home Economics','Physical & Health Education','Cultural & Creative Arts','Islamic Studies','Christian Religious Knowledge','French','Hausa','Yoruba','Igbo','Literature-in-English','Further Mathematics','Biology','Chemistry','Physics','Geography','Economics','Government','Financial Accounting','Commerce','Technical Drawing','Data Processing'];
  var deptId = 'dept-qa';
  st.subjects = names.map(function(n,i){ return { id:'qa'+i, name:n, code:'S'+i, sectionIds:[sec.id], departmentIds: i<4?[]:[deptId], core:i<4, includeInAverage:true, includeInRanking:true, passMark:40, order:i+1, active:true }; });
  st.students = []; st.scores = [];
  var scheme = getAssessmentScheme(null, arm);
  var seedN = 11; function rnd(){ seedN = (seedN*9301+49297)%233280; return seedN/233280; }
  var fn = ['Aisha','Chinedu','Oluwaseun','Fatima','Emeka','Blessing','Ibrahim','Ngozi','Abdullahi','Chidinma','Tunde','Zainab','Uchenna','Hauwa','Babajide','Amarachi','Yusuf','Folasade','Obinna','Maryam'];
  var ln = ['Abubakar','Okonkwo','Adeyemi','Bello','Eze','Danladi','Musa','Nwosu','Ogunleye','Suleiman'];
  var longComment = 'Aisha has shown remarkable improvement across all subjects this term and consistently demonstrates diligence, respect for her teachers and colleagues, and a genuine love of learning. She should keep revising her weaker areas, participate more actively in class discussions, and maintain this impressive momentum next term.';
  counts.forEach(function(n, i){
    var stu = { id:'qs'+i, name: fn[i%fn.length]+' '+ln[i%ln.length]+(opts.longName&&i==2?' Olamilekan Chukwuemeka-Abdulrahman':''), gender: i%2?'Female':'Male', classArmId: arm.id, status:'Active', admissionNo:'LB/2026/'+(1000+i),
      dob:'2012-0'+(1+i%9)+'-1'+(i%9), religiousTrack:'ISLAMIC', photo: (opts.noPhotoFor===i)?'':photo(i), subjectIds: names.slice(4,n).map(function(x,k){return 'qa'+(k+4);}) };
    st.students.push(stu);
  });
  // the engine only lists students who take a subject via subjectIds; general (0-3) always apply
  st.students.forEach(function(stu, si){
    var subs = subjectsForStudent(stu, arm, st.currentTermId);
    subs.forEach(function(su){
      var r = ensureScoreRecord(stu.id, su.id, arm.id, st.currentSessionId, st.currentTermId); var comps = {};
      scheme.components.filter(function(c){return c.active;}).forEach(function(c){ var base = 0.35+0.6*rnd(); comps[c.id] = Math.round(c.maxScore*base*(si%5===4?0.7:1)); });
      r.components = comps; r.status='APPROVED';
    });
    var key = stu.id+'::'+st.currentSessionId+'::'+st.currentTermId;
    st.studentComments[key] = { formTeacherComment: si%2? 'Good performance. Keep it up.' : longComment, principalComment: si%3===0 ? longComment : 'An impressive result. Keep up the excellent work.', nextFees: 85000+si*5000, examFee: 7500 };
    var ds = {affective:{}, psychomotor:{}}; st.affectiveDomains.forEach(function(d,k){ ds.affective[d.id]=st.ratingLevels[(k+si)%5]; }); st.psychomotorDomains.forEach(function(d,k){ ds.psychomotor[d.id]=st.ratingLevels[(k+si+1)%5]; });
    st.domainScores[key] = ds; st.attendance[key] = { totalDays:62, present:55+si%7, absent:7-si%7, late: si%3 };
  });
  // signatures
  st.signatures.forEach(function(s){ if (s.role==='PRINCIPAL') s.image = sig; });
  var ft = st.formTeacherAssignments.filter(function(a){return a.classArmId===arm.id;})[0];
  if (ft) st.signatures.push({ id:'sigft', role:'FORM_TEACHER', userId: ft.teacherId, name: userName(ft.teacherId)||'Form Teacher', image: sig, active:true });
  if (opts.manyDomains){ for (var d=0; d<5; d++){ st.affectiveDomains.push({id:'xa'+d,name:'Extra behaviour '+(d+1),active:true}); st.psychomotorDomains.push({id:'xp'+d,name:'Extra skill '+(d+1),active:true}); } }
  return { armId: arm.id, studentIds: st.students.map(function(s){return s.id;}), sessionId: st.currentSessionId, termId: st.currentTermId,
    templateIds: Object.fromEntries(st.reportTemplates.map(function(t){return [t.style, t.id];})) };
};
