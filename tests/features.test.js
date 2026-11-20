const fs=require("fs"), vm=require("vm"), path=require("path"), Module=require("module");
const R=path.join(__dirname,"..");
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };

function app(){
  const ctx={console,Date,JSON,Promise,Object,Array,Math,Set,String,Number,
    document:{getElementById:()=>null,querySelectorAll:()=>[],activeElement:null,addEventListener(){},createElement:()=>({style:{}}),body:{appendChild(){}}},
    localStorage:{setItem(){},getItem(){return null},removeItem(){}}, navigator:{onLine:true},
    window:{addEventListener(){},confirm:()=>true,prompt:()=>""}, alert(){}, setTimeout:()=>0,clearTimeout(){},setInterval(){return 1},clearInterval(){},
    fetch:()=>Promise.reject(new Error("x"))};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(R+"/app.js","utf8"),ctx); return ctx;
}
const comp=(id,name,max,w,o)=>({id,name,maxScore:max,weight:w,active:true,order:o});
function world(){
  const subj=(id,name,o,extra)=>Object.assign({id,name,code:id.toUpperCase(),sectionIds:["prim"],departmentIds:[],core:true,active:true,order:o,includeInAverage:true,includeInRanking:true,passMark:40},extra||{});
  return { currentSessionId:"s1", currentTermId:"t1", sessions:[{id:"s1",name:"2026/2027"}],
    terms:[{id:"t1",sessionId:"s1",name:"First Term"},{id:"t2",sessionId:"s1",name:"Second Term"}],
    sections:[{id:"prim",name:"Primary"}], departments:[],
    classArms:[{id:"p1",name:"Primary 1",sectionId:"prim",active:true},{id:"p2",name:"Primary 2",sectionId:"prim",active:true}],
    subjects:[subj("eng","English",1), subj("hau","Hausa",2), subj("isl","Islamic Studies",3,{religiousTrack:"ISLAMIC"}), subj("crk","CRK",4,{religiousTrack:"CRK"})],
    assessmentSchemes:[{id:"as",sectionIds:["prim"],components:[comp("ca1","CA1",20,20,1),comp("ca2","CA2",20,20,2),comp("ex","Exam",60,60,3)]}],
    gradingSchemes:[{id:"g",sectionIds:["prim"],bands:[{grade:"A",min:75,max:100,remark:"Excellent"},{grade:"F",min:0,max:74,remark:"Fair"}]}],
    students:[{id:"m1",name:"Musa",classArmId:"p1",status:"Active"},{id:"m2",name:"Amina",classArmId:"p1",status:"Active",religiousTrack:"ISLAMIC"},{id:"c1",name:"Grace",classArmId:"p1",status:"Active",religiousTrack:"CRK"},{id:"m3",name:"Sani",classArmId:"p2",status:"Active"}],
    scores:[], teacherAssignments:[], formTeacherAssignments:[], classSubjectStatus:{}, subjectProgress:{}, classApproval:{}, studentComments:{}, domainScores:{}, attendance:{}, notifications:[], customFieldDefs:[], rankingConfig:{tieMethod:"competition"}, auditLog:[], users:[] };
}
function setScore(ctx, stu, subj, cls, term, comps){
  vm.runInContext(`(function(){ var r=ensureScoreRecord(${JSON.stringify(stu)},${JSON.stringify(subj)},${JSON.stringify(cls)},"s1",${JSON.stringify(term)}); r.components=${JSON.stringify(comps)}; })()`,ctx);
}
const run=(c,code)=>vm.runInContext(code,c);
const ids=(c,expr)=>run(c,`(${expr}).map(function(x){return x.id})`).join();

// ===== A. Religion groups (already in the app; proving it behaves as you need) =====
{ const c=app(); c.state=world(); run(c,"state=this.state");
  t("A1 Islamic Studies goes to Muslim students (default) only", ids(c,'studentsForSubject(byId(state.subjects,"isl"),"p1","t1")')==="m1,m2");
  t("A2 CRK goes to CRK students only", ids(c,'studentsForSubject(byId(state.subjects,"crk"),"p1","t1")')==="c1");
  t("A3 a CRK student's own subject list has CRK, not Islamic Studies", ids(c,'subjectsForStudent(byId(state.students,"c1"),byId(state.classArms,"p1"),"t1")')==="eng,hau,crk");
  t("A4 a Muslim student's list has Islamic Studies, not CRK", ids(c,'subjectsForStudent(byId(state.students,"m1"),byId(state.classArms,"p1"),"t1")')==="eng,hau,isl");
  t("A5 report average/rows follow the student's own subjects", run(c,'computeStudentOverall("c1","p1","s1","t1").subjectRows.map(function(r){return r.subject.id}).join()')==="eng,hau,crk");
  t("A6 CRK is listed for a class only where some student takes it", run(c,'computeClassOverview("p1","s1","t1").subjects.map(function(s){return s.id}).join()')==="eng,hau,isl,crk" && run(c,'computeClassOverview("p2","s1","t1").subjects.map(function(s){return s.id}).join()')==="eng,hau,isl");
}

// ===== B. Admin switches a subject off for a class =====
{ const c=app(); c.state=world(); run(c,"state=this.state; byId(state.subjects,'hau').notTaken=[{classArmId:'p1',termId:'t1'}];");
  t("B1 Hausa is gone from Primary 1 this term", ids(c,'subjectsForClassArm(byId(state.classArms,"p1"),"t1")')==="eng,isl,crk");
  t("B2 ...but is still there for Primary 2 and for Primary 1 next term", ids(c,'subjectsForClassArm(byId(state.classArms,"p2"),"t1")').indexOf("hau")>-1 && ids(c,'subjectsForClassArm(byId(state.classArms,"p1"),"t2")').indexOf("hau")>-1);
  t("B3 no students are listed for it in the switched-off class/term, but all 3 are next term", run(c,'studentsForSubject(byId(state.subjects,"hau"),"p1","t1").length')===0 && run(c,'studentsForSubject(byId(state.subjects,"hau"),"p1","t2").length')===3);
  t("B4 a pupil's report rows and average skip it", run(c,'computeStudentOverall("m1","p1","s1","t1").subjectRows.map(function(r){return r.subject.id}).join()')==="eng,isl");
  t("B5 the class overview and dashboard counts skip it", run(c,'computeClassOverview("p1","s1","t1").subjects.map(function(s){return s.id}).indexOf("hau")')===-1);
  // scores already entered are kept, and return when switched back on
  setScore(c,"m1","hau","p1","t1",{ca1:10});
  run(c,"byId(state.subjects,'hau').notTaken=[]");
  t("B6 nothing is deleted: switching back on restores the entered scores", run(c,'getScoreRecord("m1","hau","p1","s1","t1").components.ca1')===10 && ids(c,'subjectsForClassArm(byId(state.classArms,"p1"),"t1")').indexOf("hau")>-1);
}
// B7-B10: the admin form
{ const c=app(); c.state=world(); run(c,"state=this.state; byId(state.subjects,'hau').notTaken=[{classArmId:'p2',termId:'t1'},{classArmId:'p1',termId:'oldterm'}];");
  const calls={confirm:0,saved:0,audit:[]}; let confirmAnswer=true;
  const box=(cls,term,checked)=>({dataset:{cls,term},checked});
  c.el=(id)=>({"sub-name":{value:"Hausa"},"sub-code":{value:"HAU"},"sub-pass":{value:"40"},"sub-core":{value:"true"},"sub-reli":{value:""},"sub-avg":{checked:true},"sub-rank":{checked:true}}[id]);
  let boxes=[];
  c.qsa=(sel)=> sel===".subj-section-check:checked" ? [{value:"prim"}] : sel===".subj-dept-check:checked" ? [] : sel===".subj-off-check" ? boxes : [];
  c.window.confirm=()=>{calls.confirm++; return confirmAnswer;}; c.toast=()=>{}; c.closeModal=()=>{}; c.scheduleSave=()=>{calls.saved++;}; c.renderApp=()=>{};
  boxes=[box("p1","t1",true),box("p1","t2",true),box("p2","t1",false),box("p2","t2",false)];
  run(c,'saveSubjectForm("hau")');
  const nt=run(c,'JSON.stringify(byId(state.subjects,"hau").notTaken)');
  const arr=JSON.parse(nt);
  t("B7 ticking classes/terms switches the subject off exactly there", arr.some(x=>x.classArmId==="p1"&&x.termId==="t1") && arr.some(x=>x.classArmId==="p1"&&x.termId==="t2"));
  t("B8 unticking removes the old switch-off (Primary 2 now takes it again)", !arr.some(x=>x.classArmId==="p2"));
  t("B9 entries for another session are never disturbed", arr.some(x=>x.classArmId==="p1"&&x.termId==="oldterm"));
  // scores exist -> confirmation required; Cancel changes nothing
  run(c,"byId(state.subjects,'hau').notTaken=[]"); setScore(c,"m1","hau","p1","t1",{ca1:12});
  boxes=[box("p1","t1",true)]; confirmAnswer=false; calls.confirm=0;
  run(c,'saveSubjectForm("hau")');
  t("B10 if scores are already entered it asks first, and Cancel changes nothing", calls.confirm===1 && run(c,'byId(state.subjects,"hau").notTaken.length')===0);
  confirmAnswer=true; run(c,'saveSubjectForm("hau")');
  t("B11 OK applies it (and the scores stay stored)", run(c,'byId(state.subjects,"hau").notTaken.length')===1 && run(c,'getScoreRecord("m1","hau","p1","s1","t1").components.ca1')===12);
}

// ===== C. Partial submission progress =====
{ const c=app(); c.state=world(); run(c,"state=this.state");
  const prog=()=>JSON.parse(run(c,'JSON.stringify(computeSubjectProgress("p1","eng","s1","t1"))'));
  t("C1 nothing entered = 0% recorded, 100% remaining", prog().percentRecorded===0 && prog().percentRemaining===100);
  ["m1","m2","c1"].forEach(s=>setScore(c,s,"eng","p1","t1",{ca1:15}));
  t("C2 CA1 finished for every pupil = 20% recorded, 80% remaining", prog().percentRecorded===20 && prog().percentRemaining===80);
  setScore(c,"c1","eng","p1","t1",{});
  t("C3 CA1 missing for one pupil = that column does not count yet", prog().percentRecorded===0);
  setScore(c,"c1","eng","p1","t1",{ca1:"ABSENT"});
  t("C4 a pupil marked absent counts as handled", prog().percentRecorded===20);
  ["m1","m2","c1"].forEach(s=>setScore(c,s,"eng","p1","t1",{ca1:15,ca2:12}));
  t("C5 CA1 + CA2 = 40% recorded, 60% remaining", prog().percentRecorded===40 && prog().percentRemaining===60);
  ["m1","m2","c1"].forEach(s=>setScore(c,s,"eng","p1","t1",{ca1:15,ca2:12,ex:40}));
  t("C6 all columns = 100% recorded, 0% remaining", prog().percentRecorded===100 && prog().percentRemaining===0);

  // submitting progress
  const c2=app(); c2.state=world(); run(c2,"state=this.state");
  const alerts=[]; c2.alert=(m)=>alerts.push(m); c2.window.confirm=()=>true; c2.toast=()=>{}; c2.scheduleSave=()=>{}; c2.renderApp=()=>{};
  run(c2,`state.users=[{id:"u1",name:"Teacher",role:"TEACHER",active:true}]; state.currentUser=state.users[0]; state.teacherAssignments=[{id:"a1",teacherId:"u1",subjectId:"eng",classArmId:"p1",sessionId:"s1",termId:"t1",active:true}];`);
  run(c2,'submitSubjectProgress("eng","p1")');
  t("C7 submitting progress with nothing entered is refused with a clear message", alerts.length===1 && /Nothing to submit/.test(alerts[0]) && !Object.keys(run(c2,"state.subjectProgress")).length);
  ["m1","m2","c1"].forEach(s=>setScore(c2,s,"eng","p1","t1",{ca1:15}));
  run(c2,'submitSubjectProgress("eng","p1")');
  const snap=JSON.parse(run(c2,'JSON.stringify(state.subjectProgress["p1::eng::s1::t1"])'));
  t("C8 submitting CA1 records 20% for the Form Teacher", snap && snap.percent===20 && snap.names.join()==="CA1");
  // the Form Teacher's view
  const sv=(status)=>{ run(c2,`state.classSubjectStatus={}; ${status?`state.classSubjectStatus["p1::eng::s1::t1"]="${status}";`:""}`); return JSON.parse(run(c2,'JSON.stringify(computeClassOverview("p1","s1","t1").subjectStatuses.filter(function(s){return s.subject.id==="eng"})[0].submitted)')); };
  t("C9 before approval (pending): shows 20% submitted, 80% remaining", sv(null).percent===20 && sv(null).remaining===80);
  ["m1","m2","c1"].forEach(s=>setScore(c2,s,"eng","p1","t1",{ca1:15,ca2:12,ex:40}));
  t("C10 typing more without submitting does not change what the Form Teacher sees", sv(null).percent===20);
  t("C11 after the subject is submitted/approved it shows 100% and 0% remaining", sv("SUBMITTED").percent===100 && sv("APPROVED").remaining===0);
  t("C12 a subject nobody has submitted shows 'Nothing submitted yet · Remaining 100%'", (function(){ run(c2,'state.teacherAssignments.push({id:"a2",teacherId:"u1",subjectId:"hau",classArmId:"p1",sessionId:"s1",termId:"t1",active:true})'); const h=run(c2,'progressCellHtml(computeClassOverview("p1","s1","t1").subjectStatuses.filter(function(s){return s.subject.id==="hau"})[0])'); return /Nothing submitted yet/.test(h) && /Remaining <strong>100%/.test(h); })());
  t("C12b a subject with no teacher assigned shows a dash, not a percentage", (function(){ const h=run(c2,'progressCellHtml(computeClassOverview("p1","s1","t1").subjectStatuses.filter(function(s){return s.subject.id==="isl"})[0])'); return /—/.test(h) && !/Remaining/.test(h); })());
  run(c2,'state.classSubjectStatus={}'); setScore(c2,"m1","eng","p1","t1",{ca1:15}); ["m2","c1"].forEach(s=>setScore(c2,s,"eng","p1","t1",{ca1:15}));
  t("C13 the pending screen text reads 'Submitted 20% · Remaining 80%'", (function(){ const h=run(c2,'progressCellHtml(computeClassOverview("p1","s1","t1").subjectStatuses.filter(function(s){return s.subject.id==="eng"})[0])'); return />20%<\/strong>/.test(h) && />80%<\/strong>/.test(h) && /width:20%/.test(h); })());
  t("C14 the class summary averages every subject", /% submitted · \d+% remaining/.test(run(c2,'classMarksSubmittedText(computeClassOverview("p1","s1","t1"))')));
  // full result can still only be submitted when complete (existing safeguard kept)
  alerts.length=0; run(c2,'state.classSubjectStatus={}'); ["m1","m2","c1"].forEach(s=>setScore(c2,s,"eng","p1","t1",{ca1:15}));
  run(c2,'submitSubjectResults("eng","p1")');
  t("C15 the full 'Submit to Form Teacher' still needs every column complete", alerts.length===1 && !run(c2,'state.classSubjectStatus["p1::eng::s1::t1"]'));
}

// ===== D. Server: who may write progress notes =====
{ const orig=Module._load; Module._load=function(req,...a){ return req==="bcryptjs"?{hashSync:()=>"h",compare:async()=>false}:(req==="@neondatabase/serverless"?{Pool:function(){return {query:async()=>({rows:[]})};},neonConfig:{}}:orig.call(this,req,...a)); };
  const { buildAuthorizedState } = require(R+"/netlify/functions/_state.js");
  const server={ users:[], teacherAssignments:[{teacherId:"u1",subjectId:"eng",classArmId:"p1",active:true}], formTeacherAssignments:[], scores:[], classSubjectStatus:{}, classApproval:{}, studentComments:{}, domainScores:{}, attendance:{}, students:[], subjectProgress:{}, auditLog:[], notifications:[] };
  const payload=JSON.parse(JSON.stringify(server)); payload.subjectProgress={"p1::eng::s1::t1":{percent:20},"p1::hau::s1::t1":{percent:99}};
  const out=buildAuthorizedState({user:{id:"u1",role:"TEACHER"}},server,payload,false);
  t("D1 a teacher's progress note is saved for their OWN subject/class", out.subjectProgress["p1::eng::s1::t1"] && out.subjectProgress["p1::eng::s1::t1"].percent===20);
  t("D2 ...and ignored for a subject/class that is not theirs", !out.subjectProgress["p1::hau::s1::t1"]);
  const adm=buildAuthorizedState({user:{id:"a",role:"ADMIN"}},server,payload,false);
  t("D3 administrators can still save everything", adm.subjectProgress["p1::hau::s1::t1"].percent===99);
  Module._load=orig;
}

// ===== E. The real screens draw correctly =====
{ const c=app(); c.state=world(); run(c,"state=this.state");
  c.toast=()=>{}; let modal=""; c.openModal=(h)=>{modal=h;};
  run(c,`state.users=[{id:"u1",name:"Ada Teacher",role:"TEACHER",active:true},{id:"ad",name:"Admin",role:"ADMIN",active:true}];
    state.teacherAssignments=[{id:"a1",teacherId:"u1",subjectId:"eng",classArmId:"p1",sessionId:"s1",termId:"t1",active:true},{id:"a2",teacherId:"u1",subjectId:"hau",classArmId:"p1",sessionId:"s1",termId:"t1",active:true},{id:"a3",teacherId:"u1",subjectId:"crk",classArmId:"p1",sessionId:"s1",termId:"t1",active:true}];
    state.currentUser=state.users[0]; state.viewParams={subjectId:"eng",classArmId:"p1"};`);
  ["m1","m2","c1"].forEach(s=>setScore(c,s,"eng","p1","t1",{ca1:15}));
  let h=run(c,"renderScoreEntryView()");
  t("E1 score entry shows the recorded/remaining chip and the Submit progress button", /id="progress-chip"/.test(h) && /Recorded: <strong>20%/.test(h) && /Remaining: <strong>80%/.test(h) && /Submit progress \(20%\)/.test(h));
  run(c,'state.viewParams={subjectId:"crk",classArmId:"p1"}'); h=run(c,"renderScoreEntryView()");
  t("E2 the CRK teacher sees only the CRK student", /Grace/.test(h) && !/Musa/.test(h) && !/Amina/.test(h));
  run(c,"byId(state.subjects,'hau').notTaken=[{classArmId:'p1',termId:'t1'}]; state.viewParams={subjectId:'eng',classArmId:'p1'}"); h=run(c,"renderScoreEntryView()");
  t("E3 a subject switched off for the class is not offered to the teacher", !/Hausa/.test(h) && /English/.test(h));
  h=run(c,"renderTeacherDashboard()");
  t("E4 the teacher dashboard hides it and counts only the CRK pupils for CRK", !/Hausa/.test(h) && /CRK<\/td><td>Primary 1<\/td><td>0 \/ 1</.test(h));
  run(c,'state.currentUser=state.users[1]; state.viewParams={classArmId:"p1"}'); h=run(c,"renderFormReviewView()");
  t("E5 the Form Teacher's review shows Marks submitted + class summary", /Marks submitted/.test(h) && /% submitted · \d+% remaining/.test(h) && /progress-bar/.test(h) && !/Hausa/.test(h));
  h=run(c,"renderSubjectSettings()");
  t("E6 the subjects list flags a subject that is switched off this term", /Off for 1 class this term/.test(h) && /CRK students only/.test(h));
  run(c,'openSubjectForm("hau")');
  t("E7 the subject form shows the class/term switch-off boxes", /subj-off-check/.test(modal) && /Primary 1/.test(modal) && /Second Term/.test(modal) && /checked/.test(modal));
  run(c,'openSubjectForm(null)');
  t("E8 a new subject explains it can be switched off after saving", /After saving, edit the subject/.test(modal));
}

// ===== F. Marking a student as CRK =====
{ const c=app(); c.state=world(); let modal=""; run(c,"state=this.state");
  c.openModal=(h)=>{modal=h;}; c.toast=()=>{}; c.closeModal=()=>{}; c.scheduleSave=()=>{}; c.renderApp=()=>{}; c.alert=()=>{};
  run(c,`state.users=[{id:"ad",name:"Admin",role:"SUPER_ADMIN",active:true}]; state.currentUser=state.users[0]; state.viewParams={};`);
  run(c,'openStudentForm("m1")');
  t("F1 the Edit Student form has the Religious Studies dropdown with a CRK option", /id="f-reli"/.test(modal) && /CRK \(Christian Religious Knowledge\)/.test(modal) && /Islamic Studies \(default\)/.test(modal));
  run(c,'openStudentForm("c1")');
  t("F2 a CRK student's form opens with CRK selected", /<option value="CRK" selected>/.test(modal));
  const form={ "f-name":{value:"Musa"},"f-adm":{value:"LB/1"},"f-gender":{value:"Male"},"f-dob":{value:"2015-01-01"},"f-classarm":{value:"p1"},"f-phone":{value:"08000000000"},"f-address":{value:"Kano"},"f-status":{value:"Active"},"f-reli":{value:"CRK"} };
  c.el=(id)=>form[id]||null; c.qsa=()=>[];
  run(c,'saveStudentForm("m1")');
  t("F3 saving with CRK selected stores the student as CRK", run(c,'byId(state.students,"m1").religiousTrack')==="CRK");
  t("F4 the CRK subject now includes that student, Islamic Studies does not", ids(c,'studentsForSubject(byId(state.subjects,"crk"),"p1","t1")').split(",").indexOf("m1")>-1 && ids(c,'studentsForSubject(byId(state.subjects,"isl"),"p1","t1")').split(",").indexOf("m1")===-1);
  form["f-reli"].value=""; run(c,'saveStudentForm("m1")');
  t("F5 choosing Islamic Studies again puts them back", run(c,'byId(state.students,"m1").religiousTrack')==="" && ids(c,'studentsForSubject(byId(state.subjects,"isl"),"p1","t1")').split(",").indexOf("m1")>-1);
  run(c,'state.viewParams={}; '); let h=run(c,"renderStudentsView()");
  t("F6 the student list marks CRK students with a CRK tag", /Grace<\/strong> <span class="chip">CRK<\/span>/.test(h) && !/Musa<\/strong> <span class="chip">CRK/.test(h));
  run(c,'state.viewParams={filterReli:"CRK"}'); h=run(c,"renderStudentsView()");
  t("F7 the CRK filter lists only CRK students", /Grace/.test(h) && !/Musa/.test(h) && !/Amina/.test(h));
}

// ===== G. Report cards show real results only =====
{ const c=app(); run(c,"state=seedState(); state.scores=[]; state.classSubjectStatus={}; state.users.forEach(function(u){ if(u.role==='SUPER_ADMIN') state.currentUser=u; });");
  const info=JSON.parse(run(c,'(function(){ var stu=state.students[0]; var ca=byId(state.classArms,stu.classArmId); var subs=subjectsForStudent(stu,ca,state.currentTermId); return JSON.stringify({id:stu.id,ca:ca.id,ses:state.currentSessionId,term:state.currentTermId,subs:subs.map(function(x){return x.id;})}); })()'));
  const comps=JSON.parse(run(c,'JSON.stringify(getAssessmentScheme(byId(state.subjects,"'+info.subs[0]+'"),byId(state.classArms,"'+info.ca+'")).components.filter(function(x){return x.active;}).map(function(x){return {id:x.id,max:x.maxScore};}))'));
  const full={}, part={}; comps.forEach((x,i)=>{ full[x.id]=Math.round(x.max*0.7); if(i===0) part[x.id]=Math.round(x.max*0.7); });
  const put=(subj,vals)=>run(c,`(function(){ var r=ensureScoreRecord("${info.id}","${subj}","${info.ca}","${info.ses}","${info.term}"); r.components=${JSON.stringify(vals)}; })()`);
  put(info.subs[0], part);
  let h=""; try{ h=run(c,`generateReportCardHtml("${info.id}","${info.ca}","${info.ses}","${info.term}")`); }catch(e){ h="ERR:"+e.message; }
  t("G1 a report card built from partial scores shows no total, no star and no provisional banner", !/ERR:/.test(h) && !/PROVISIONAL/.test(h) && !/\d\*/.test(h) && />—</.test(h));
  info.subs.forEach(su=>put(su, full));
  try{ h=run(c,`generateReportCardHtml("${info.id}","${info.ca}","${info.ses}","${info.term}")`); }catch(e){ h="ERR:"+e.message; }
  t("G2 once every subject is complete the report card still builds, with real figures", !/ERR:/.test(h) && !/PROVISIONAL RESULT/.test(h));
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
