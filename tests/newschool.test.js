const fs=require("fs"), vm=require("vm"), path=require("path"), Module=require("module");
const R=path.join(__dirname,"..");
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };

// ---- fake database + bcrypt ----
let row=null, writes=[], failedWith=null;
const mocks={
  "bcryptjs":{ hashSync:(p)=>"H:"+p },
  "@neondatabase/serverless":{ Pool:function(){ return { connect:async()=>({ release(){}, query:async(sql,p)=>{
      writes.push(sql.split(" ")[0]);
      if(/SELECT state, revision/.test(sql)) return {rows: row?[row]:[]};
      if(/^UPDATE school_state/.test(sql)){ row={state:JSON.parse(p[0]),revision:1}; return {rows:[]}; }
      if(/^INSERT INTO school_state/.test(sql)){ row={state:JSON.parse(p[0]),revision:1}; return {rows:[]}; }
      return {rows:[]}; } }), end:async()=>{} }; } } };
const orig=Module._load; Module._load=function(req,...a){ return mocks[req]||orig.call(this,req,...a); };
const mod=require(R+"/scripts/new-school.js");

async function runMain(args){
  const logs=[]; const ol=console.log, oe=console.error, ox=process.exit, oa=process.argv;
  console.log=(...a)=>logs.push(a.join(" ")); console.error=(...a)=>logs.push("ERR "+a.join(" "));
  let exited=null; process.exit=(c)=>{ exited=c; throw new Error("EXIT"); };
  process.argv=["node","x",...args]; process.env.DATABASE_URL="postgres://fake";
  try{ await mod.main(); }catch(e){ if(e.message!=="EXIT") logs.push("THROW "+e.message); }
  console.log=ol; console.error=oe; process.exit=ox; process.argv=oa; return {logs,exited};
}

(async()=>{
  // ---- the clean state ----
  const s=mod.buildCleanState({name:"Greenfield Academy",motto:"Truth",username:"head",adminName:"Mrs. Bello",address:"1 Road",phone:"0803",email:"a@b.c"},"HASH");
  const json=JSON.stringify(s);
  t("N1 exactly one user, a Super Admin, with a password hash and no plain password", s.users.length===1 && s.users[0].role==="SUPER_ADMIN" && s.users[0].passwordHash==="HASH" && !("password" in s.users[0]) && !s.users[0].isDemo);
  t("N2 no demo123 and no demo people anywhere", !/demo123/.test(json) && s.students.length===0 && s.teacherAssignments.length===0 && s.signatures.length===0 && s.isDemoData===false);
  t("N3 the school details are the new school's, not Ladybird's placeholders", s.school.name==="Greenfield Academy" && !/ladybird/i.test(JSON.stringify(s.school)) && s.school.motto==="Truth");
  t("N4 the standard structure is kept for the school to adjust", s.sections.length===4 && s.classArms.length>0 && s.subjects.length>0 && s.gradingSchemes.length>0 && s.assessmentSchemes.length>0 && s.reportTemplates.length>0);
  t("N5 nothing in the state still refers to a demo person", !s.users.some(u=>u.isDemo) && !JSON.stringify(s.formTeacherAssignments).includes("user_") );

  // ---- the app opens it without errors ----
  const ctx={console,Date,JSON,Promise,Object,Array,Math,Set,String,Number,
    document:{getElementById:()=>null,querySelectorAll:()=>[],activeElement:null,addEventListener(){},createElement:()=>({style:{}}),body:{appendChild(){}}},
    localStorage:{setItem(){},getItem(){return null},removeItem(){}}, navigator:{onLine:true}, window:{addEventListener(){},confirm:()=>true,prompt:()=>""}, alert(){},
    setTimeout:()=>0,clearTimeout(){},setInterval(){return 1},clearInterval(){},fetch:()=>Promise.reject(new Error("x"))};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(R+"/app.js","utf8"),ctx);
  ctx.state=JSON.parse(json); vm.runInContext("state.currentUser=state.users[0];",ctx);
  let errs=[]; ["renderDashboard()","renderStudentsView()","renderTeachersView()","renderApprovalsView()","renderReportsView()","renderSubjectSettings()","renderBackupSettings()","renderLoginView()"].forEach(fn=>{ try{ vm.runInContext(fn,ctx); }catch(e){ errs.push(fn+": "+e.message); } });
  t("N6 the dashboard, students, teachers, approvals, reports, subjects, backup and login screens all draw on an empty school", errs.length===0);
  if(errs.length) console.log(errs.join("\n"));

  // ---- password ----
  const pws=new Set(); for(let i=0;i<200;i++) pws.add(mod.makePassword(14));
  t("N7 passwords are 14 characters, unique, and avoid look-alike characters", pws.size===200 && [...pws].every(p=>p.length===14 && !/[0OIl1]/.test(p)));

  // ---- the database step ----
  row=null; writes=[]; let r=await runMain(["--name","Greenfield Academy","--username","head","--admin-name","Mrs. Bello"]);
  const pw=(r.logs.find(l=>/^Password/.test(l))||"").split(":")[1]?.trim();
  t("N8 an empty database gets the new school (created in one transaction)", row && row.state.school.name==="Greenfield Academy" && row.revision===1 && writes.includes("BEGIN") && writes.includes("COMMIT"));
  t("N9 the password shown once is the one that was stored (as a hash)", pw && row.state.users[0].passwordHash==="H:"+pw);
  row={state:{},revision:0}; writes=[]; r=await runMain(["--name","X School"]);
  t("N10 an empty row ('{}') is filled in", row.state.school && row.state.school.name==="X School");
  row={state:{school:{name:"Existing School"},users:[{id:"u"}]},revision:7}; writes=[]; const before=JSON.stringify(row); r=await runMain(["--name","Overwrite Attempt"]);
  t("N11 a database that already has a school is REFUSED and left untouched", r.exited===1 && JSON.stringify(row)===before && writes.includes("ROLLBACK") && !writes.includes("COMMIT") && r.logs.some(l=>/already contains a school \(Existing School\)/.test(l)));
  row=null; writes=[]; r=await runMain(["--name","Bad","--username","a b"]);
  t("N12 a bad username is rejected before anything is written", r.exited===1 && writes.length===0);
  row=null; writes=[]; r=await runMain([]);
  t("N13 the school name is required", r.exited===1 && writes.length===0);
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error("HARNESS ERROR",e);process.exit(2);});
