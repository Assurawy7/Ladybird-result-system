/* Test helper (Node vm AND browser): builds a class of N students with real
   scores through the app's own seed + engine. Spread of ability from weak to
   excellent; some students have no attendance / behaviour data on purpose. */
function __buildClass(sectionName, n, opts){
  opts = opts || {};
  var st = seedState(); state = st;
  st.users.forEach(function(u){ if (u.role === "SUPER_ADMIN") st.currentUser = u; });
  var sec = st.sections.filter(function(s){ return s.name === sectionName; })[0];
  var arm = st.classArms.filter(function(c){ return c.sectionId === sec.id; })[0];
  var subjectNames = ["English Language","Mathematics","Basic Science","Basic Technology","Social Studies","Civic Education","Computer Studies","Agricultural Science","Business Studies","Home Economics","Islamic Studies","Cultural & Creative Arts"];
  st.subjects = subjectNames.map(function(nm, i){ return { id:"cw"+i, name:nm, code:"S"+i, sectionIds:[sec.id], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:40, order:i+1, active:true }; });
  st.students = []; st.scores = []; st.studentComments = {}; st.domainScores = {}; st.attendance = {};
  var scheme = getAssessmentScheme(null, arm);
  var seed = opts.seed || 7; function rnd(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  var first = ["Aisha","Chinedu","Oluwaseun","Fatima","Emeka","Blessing","Ibrahim","Ngozi","Abdullahi","Chidinma","Tunde","Zainab","Uchenna","Hauwa","Babajide","Amarachi","Yusuf","Folasade","Obinna","Maryam","Sani","Kemi","Musa","Ada","Garba","Titi","Nasir","Ifeoma","Bala","Yetunde"];
  var last = ["Abubakar","Okonkwo","Adeyemi","Bello","Eze","Danladi","Musa","Nwosu","Ogunleye","Suleiman","Lawal","Ibe","Yakubu","Afolabi","Umar"];
  var levels = st.ratingLevels;
  for (var i = 0; i < n; i++){
    var r = i % 20;                                   // ability spread: 15% excellent, 30% good, 30% average, 15% below, 10% weak
    var ability = r < 3 ? 0.88 : r < 9 ? 0.72 : r < 15 ? 0.58 : r < 18 ? 0.46 : 0.30;
    var stu = { id:"cs"+i, name:first[i%first.length]+" "+last[(i*7+3)%last.length]+(i>=30?" "+(Math.floor(i/30)+1):""), gender: i%7===6 ? "" : (i%2 ? "Female" : "Male"),
      classArmId: arm.id, status:"Active", admissionNo:"LB/2026/"+(2000+i), dob:"2012-0"+(1+i%9)+"-1"+(i%9), religiousTrack:"ISLAMIC", photo:"", subjectIds:[] };
    st.students.push(stu);
    st.subjects.forEach(function(su, si){
      var rec = ensureScoreRecord(stu.id, su.id, arm.id, st.currentSessionId, st.currentTermId), comps = {};
      var bump = (si % 4 === 0 ? 0.12 : si % 4 === 2 ? -0.14 : 0);   // some subjects stronger / weaker than the student's level
      scheme.components.filter(function(c){return c.active;}).forEach(function(c){ var f = Math.max(0.05, Math.min(1, ability + bump + (rnd()-0.5)*0.12)); comps[c.id] = Math.round(c.maxScore * f); });
      rec.components = comps; rec.status = "APPROVED";
    });
    var key = stu.id+"::"+st.currentSessionId+"::"+st.currentTermId;
    if (i % 3 !== 2) st.attendance[key] = { totalDays:62, present: Math.round(62 * (i%5===4 ? 0.7 : i%2 ? 0.93 : 0.99)), absent:0 };
    if (i % 4 !== 3){ var ds = { affective:{}, psychomotor:{} };
      st.affectiveDomains.forEach(function(d,k){ ds.affective[d.id] = levels[(k + i) % levels.length]; });
      st.psychomotorDomains.forEach(function(d,k){ ds.psychomotor[d.id] = levels[(k + 2*i) % levels.length]; });
      st.domainScores[key] = ds; }
  }
  return { armId: arm.id, sessionId: st.currentSessionId, termId: st.currentTermId, studentIds: st.students.map(function(s){return s.id;}), templateIds: Object.fromEntries(st.reportTemplates.map(function(t){return [t.style, t.id];})) };
}
