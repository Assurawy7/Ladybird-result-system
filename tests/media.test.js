const fs=require("fs"), vm=require("vm"), path=require("path"), Module=require("module");
const R=path.join(__dirname,"..");
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };
const tick=()=>new Promise(r=>setImmediate(r));
const settle=async()=>{ for(let i=0;i<30;i++) await tick(); };

function makeClient(){
  let timers=[]; const calls={get:[],save:[],del:[]}; let inflight=0, maxInflight=0;
  const ctx={console, Date, JSON, Promise, Object, Array, Math,
    document:{getElementById:()=>null, querySelectorAll:()=>[], activeElement:null, addEventListener(){}},
    localStorage:{setItem(){},getItem(){return null},removeItem(){}}, navigator:{onLine:true},
    window:{addEventListener(){}, confirm(){return true}}, alert(){},
    setTimeout:(f,ms)=>{timers.push(f);return timers.length}, clearTimeout(){}, setInterval(){return 1}, clearInterval(){},
    fetch:()=>Promise.reject(new Error("x"))};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(R+"/source/02-state.js","utf8"),ctx);
  ctx.__calls=calls; ctx.__timers=()=>{ const x=timers; timers=[]; x.forEach(f=>f()); };
  ctx.__max=()=>maxInflight;
  vm.runInContext(`renderApp=function(){ rendered++; }; var rendered=0; toast=function(){}; cacheStateLocally=function(){};
    var MEDIA_BEHAVIOUR = function(key){ return {ok:true,found:true,dataUrl:"data:image/png;base64,"+key}; };
    apiGetMedia=function(key){ __calls.get.push(key); __enter(); return new Promise(function(r){ setTimeout(function(){ __leave(); r(MEDIA_BEHAVIOUR(key)); },0); }); };
    apiSaveMedia=function(k,d){ __calls.save.push(k); return Promise.resolve({ok:true}); };
    apiDeleteMedia=function(k){ __calls.del.push(k); return Promise.resolve({ok:true}); };
    apiSaveState=function(p){ __lastPayload=JSON.parse(JSON.stringify(p)); return Promise.resolve({ok:true,revision:2,merged:false,state:{}}); };
    var __lastPayload=null; _lastKnownRev=1;`,ctx);
  // setTimeout inside the sandbox must really fire (used by the fake network)
  ctx.__enter=()=>{ inflight++; maxInflight=Math.max(maxInflight,inflight); }; ctx.__leave=()=>{ inflight--; };
  const realSet=ctx.setTimeout; ctx.setTimeout=(f,ms)=> ms===0 ? setImmediate(f) : realSet(f,ms);
  return ctx;
}
const students=(n,photo)=>Array.from({length:n},(_,i)=>({id:"s"+i,name:"P"+i,photo}));
const run=(ctx,code)=>vm.runInContext(code,ctx);

(async()=>{
  // ---- 1. THE BUG: loads fail on this device, then it saves ----
  let c=makeClient(); run(c,`MEDIA_BEHAVIOUR=function(){ return {ok:false,error:"busy"}; };`);
  c.state={currentUser:{id:"u"},school:{},signatures:[],students:students(5,"@media")}; run(c,"state=this.state||state");
  run(c,`state={currentUser:{id:"u"},school:{},signatures:[],students:${JSON.stringify(students(5,"@media"))}}; rehydrateMediaFields(state);`);
  c.__timers(); await settle();
  t("failed photo loads leave pictures blank on screen", run(c,"state.students.every(function(s){return s.photo===''})"));
  run(c,"persistNow()"); await settle();
  t("...but SAVING STILL KEEPS EVERY PHOTO LINK (this erased them before)", run(c,"__lastPayload.students.every(function(s){return s.photo==='@media'})"));
  t("...and nothing is deleted from storage", c.__calls.del.length===0);

  // ---- 2. partial success ----
  c=makeClient(); run(c,`MEDIA_BEHAVIOUR=function(k){ return k==="student_s1" ? {ok:false} : {ok:true,found:true,dataUrl:"data:image/png;base64,"+k}; };
    state={currentUser:{id:"u"},school:{},signatures:[],students:${JSON.stringify(students(3,"@media"))}}; rehydrateMediaFields(state);`);
  c.__timers(); await settle();
  t("photos that load appear, the failed one stays blank", run(c,"state.students[0].photo.indexOf('data:')===0 && state.students[1].photo==='' && state.students[2].photo.indexOf('data:')===0"));
  run(c,"persistNow()"); await settle();
  t("all three links kept when saving", run(c,"__lastPayload.students.every(function(s){return s.photo==='@media'})"));

  // ---- 3. no cascade deletion ----
  c=makeClient(); run(c,`state={currentUser:{id:"u"},school:{},signatures:[],students:${JSON.stringify(students(2,"@media"))}}; rehydrateMediaFields(state);`);
  c.__timers(); await settle();
  run(c,`var incoming={school:{},signatures:[],students:[{id:"s0",name:"P0",photo:""},{id:"s1",name:"P1",photo:"@media"}]}; rehydrateMediaFields(incoming); incoming.currentUser=state.currentUser; state=incoming;`);
  c.__timers(); await settle(); c.__calls.del.length=0;
  run(c,"persistNow()"); await settle();
  t("another device's empty photo does NOT make this device delete the stored picture", c.__calls.del.length===0);

  // ---- 4. a real removal still works ----
  c=makeClient(); run(c,`state={currentUser:{id:"u"},school:{},signatures:[],students:${JSON.stringify(students(2,"@media"))}}; rehydrateMediaFields(state);`);
  c.__timers(); await settle();
  run(c,`state.students[0].photo="";`); run(c,"persistNow()"); await settle();
  t("deliberately removing a loaded photo deletes it", c.__calls.del.join()==="student_s0");
  t("...and its link is cleared while the other stays", run(c,"__lastPayload.students[0].photo===''&&__lastPayload.students[1].photo==='@media'"));

  // ---- 5. upload ----
  c=makeClient(); run(c,`state={currentUser:{id:"u"},school:{},signatures:[],students:${JSON.stringify(students(1,""))}};`);
  run(c,`state.students[0].photo="data:image/png;base64,NEW";`); run(c,"persistNow()"); await settle();
  t("uploading a new photo saves it and writes a link", c.__calls.save.join()==="student_s0" && run(c,"__lastPayload.students[0].photo==='@media'"));

  // ---- 6. never more than 6 at once ----
  c=makeClient(); run(c,`state={currentUser:{id:"u"},school:{},signatures:[],students:${JSON.stringify(students(60,"@media"))}}; rehydrateMediaFields(state);`);
  c.__timers(); await settle(); await new Promise(r=>setTimeout(r,50)); await settle();
  t("60 photos load, never more than 6 requests at once", c.__calls.get.length===60 && c.__max()<=6);
  t("every photo ends up on screen", run(c,"state.students.every(function(s){return s.photo.indexOf('data:')===0})"));

  // ---- 7. picture really missing in storage ----
  c=makeClient(); run(c,`MEDIA_BEHAVIOUR=function(){ return {ok:true,found:false}; };
    state={currentUser:{id:"u"},school:{},signatures:[],students:${JSON.stringify(students(2,"@media"))}}; rehydrateMediaFields(state);`);
  c.__timers(); await settle();
  t("a link to a picture that no longer exists stops being retried", Object.keys(run(c,"_mediaUnloaded")).length===0);

  // ---- 8. retry later from the regular poll ----
  c=makeClient(); run(c,`MEDIA_BEHAVIOUR=function(){ return {ok:false}; };
    state={currentUser:{id:"u"},school:{},signatures:[],students:${JSON.stringify(students(2,"@media"))}}; rehydrateMediaFields(state);`);
  c.__timers(); await settle();
  run(c,`MEDIA_BEHAVIOUR=function(k){ return {ok:true,found:true,dataUrl:"data:image/png;base64,"+k}; }; _mediaLastTry=0; apiGetState=function(){ return Promise.resolve({ok:true,changed:false,revision:1}); }; _lastPollAt=0; pollOnce();`);
  await settle(); await settle();
  t("photos that failed earlier are retried automatically and then appear", run(c,"state.students.every(function(s){return s.photo.indexOf('data:')===0})"));

  // ---- 9. repair script ----
  const calls=[]; let dbState, dbRev, media, r2, written, files={};
  const mocks={
    "@neondatabase/serverless":{ Pool:function(){ return { connect:async()=>({ release(){}, query: async(sql,p)=>{ calls.push(sql.split(" ")[0]);
        if(/SELECT key FROM media/.test(sql)) return {rows:Object.keys(media).map(k=>({key:k}))};
        if(/SELECT data_url FROM media/.test(sql)) return {rows:[{data_url:media[p[0]]}]};
        if(/SELECT state, revision/.test(sql)) return {rows:[{state:JSON.parse(JSON.stringify(dbState)),revision:dbRev}]};
        if(/UPDATE school_state/.test(sql)){ written=JSON.parse(p[0]); dbRev=p[1]; return {rows:[]}; }
        return {rows:[]}; } }), end:async()=>{} }; } },
    "../netlify/functions/_r2":{ listKeys:async()=>Object.keys(r2), putMedia:async(k,d)=>{ r2[k]=d; } } };
  const orig=Module._load; Module._load=function(req,...a){ return mocks[req]||orig.call(this,req,...a); };
  const realWrite=fs.writeFileSync; fs.writeFileSync=(f,d)=>{ if(/state-backup/.test(f)) files[f]=d; else realWrite(f,d); };
  const script=fs.readFileSync(R+"/scripts/repair-media-links.js","utf8").replace(/^#!.*\n/,"");
  async function runScript(args){
    calls.length=0; written=null; Object.keys(files).forEach(k=>delete files[k]);
    Object.assign(process.env,{DATABASE_URL:"x",R2_ACCOUNT_ID:"a",R2_ACCESS_KEY_ID:"b",R2_SECRET_ACCESS_KEY:"c",R2_BUCKET_NAME:"d"});
    const logs=[]; const origLog=console.log; console.log=(...a)=>logs.push(a.join(" "));
    const sb={require:(m)=>mocks[m]?mocks[m]:(m==="fs"?fs:require(m)), process:{argv:["node","x",...args],env:process.env,exit(){},exitCode:0}, console, Buffer, JSON, Date, Set, Promise, Array, Object, Number, String};
    sb.module={exports:{}}; sb.__dirname=R+"/scripts";
    vm.createContext(sb); const done=new Promise(r=>{ sb.setImmediate=setImmediate; }); 
    try{ vm.runInContext(script,sb); }finally{}
    await new Promise(r=>setTimeout(r,80)); console.log=origLog; return logs;
  }
  // world: 5 students; links erased for s0..s3; R2 has s0,s1 pictures; Neon has s0..s3 originals (s2,s3 missing from R2); s4 has no photo anywhere; s5 dangling marker
  dbRev=10; media={student_s0:"data:image/png;base64,0",student_s1:"data:image/png;base64,1",student_s2:"data:image/png;base64,2",student_s3:"data:image/png;base64,3"};
  r2={student_s0:"x",student_s1:"x"};
  dbState={school:{name:"L"},signatures:[],students:[{id:"s0",photo:""},{id:"s1",photo:""},{id:"s2",photo:""},{id:"s3",photo:""},{id:"s4",photo:""},{id:"s5",photo:"@media"}]};
  let logs=await runScript([]);
  t("DRY RUN changes nothing (no update, no copy, no backup file)", !written && Object.keys(r2).length===2 && Object.keys(files).length===0 && calls.includes("ROLLBACK") && !calls.includes("COMMIT"));
  t("dry run reports 4 links to restore and 1 dangling", logs.some(l=>/RESTORE.*:\s+4/.test(l)) && logs.some(l=>/MISSING picture:\s+1/.test(l)));
  logs=await runScript(["--apply"]);
  t("APPLY copies the 2 missing pictures from Neon into R2", r2.student_s2 && r2.student_s3 && Object.keys(r2).length===4);
  t("APPLY relinks exactly the 4 students that have a picture", written && ["s0","s1","s2","s3"].every(id=>written.students.find(s=>s.id===id).photo==="@media") && written.students.find(s=>s.id==="s4").photo==="");
  t("APPLY leaves the dangling marker and bumps the revision", written.students.find(s=>s.id==="s5").photo==="@media" && dbRev===11);
  t("APPLY saved a backup of the old data first", Object.keys(files).length===1 && JSON.parse(Object.values(files)[0]).students[0].photo==="");
  t("APPLY committed", calls.includes("COMMIT"));
  fs.writeFileSync=realWrite;

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error("HARNESS ERROR",e);process.exit(2);});
