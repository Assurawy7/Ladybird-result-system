const fs=require("fs"), vm=require("vm"), path=require("path");
const R=path.join(__dirname,"..");
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };
const tick=()=>new Promise(r=>setImmediate(r));

// ---------- 1. grading ----------
{
  const ctx={console}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(R+"/source/04-engine.js","utf8"),ctx);
  const gs={bands:[{grade:"A1",min:75,max:100},{grade:"B2",min:70,max:74},{grade:"B3",min:65,max:69},{grade:"C4",min:60,max:64},{grade:"C5",min:55,max:59},{grade:"C6",min:50,max:54},{grade:"D7",min:45,max:49},{grade:"E8",min:40,max:44},{grade:"F9",min:0,max:39}]};
  const g=(x)=>vm.runInContext("gradeFor("+x+","+JSON.stringify(gs)+").grade",ctx);
  t("74.5 -> B2 (was '-')", g(74.5)==="B2");
  t("69.5 -> B3, 59.5 -> C5, 44.5 -> E8, 39.5 -> F9 (a fraction stays in the band it has not left)", g(69.5)==="B3" && g(59.5)==="C5" && g(44.5)==="E8" && g(39.5)==="F9");
  t("74.99 -> B2 and 75 -> A1", g(74.99)==="B2" && g(75)==="A1");
  // whole numbers: identical to the old exact-range answers for every integer 0..100
  let same=true; for(let i=0;i<=100;i++){ const old=gs.bands.find(b=>i>=b.min&&i<=b.max); if(!old||g(i)!==old.grade) same=false; }
  t("every whole number 0-100 gives exactly the same grade as before", same);
  t("band order in settings doesn't matter", vm.runInContext("gradeFor(72.5,{bands:"+JSON.stringify(gs.bands.slice().reverse())+"}).grade",ctx)==="B2");
  t("no/invalid total -> '-' (no crash)", vm.runInContext("gradeFor(null,"+JSON.stringify(gs)+").grade",ctx)==="-" && vm.runInContext("gradeFor(NaN,"+JSON.stringify(gs)+").grade",ctx)==="-" && vm.runInContext("gradeFor(50,null).grade",ctx)==="-");
}

// ---------- 2. login screen demo panel ----------
{
  const ctx={console, installPromptAvailable:false, ICONS:()=>"", escapeHtml:(s)=>String(s==null?"":s), state:{school:{name:"Ladybird",motto:"m"}}};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(R+"/source/06-login.js","utf8"),ctx);
  let h=vm.runInContext("renderLoginView()",ctx);
  t("no demo panel or demo123 hint when the server reports no demo accounts", !/demo123|demo-accounts|superadmin/.test(h));
  ctx.state.publicInfo={demo:true}; h=vm.runInContext("renderLoginView()",ctx);
  t("demo panel appears while demo accounts exist", /demo123/.test(h) && /demo-accounts/.test(h));
  t("sign-in form always present", /id="login-form"/.test(h) && /login-username/.test(h));
}

// ---------- 3. Reload Demo Data guard + backup screen ----------
{
  let alerts=[], prompts=[], confirms=0, persisted=0, answer="RELOAD";
  const ctx={console, document:{getElementById(){return null}, querySelectorAll:()=>[], addEventListener(){}}, alert:(m)=>alerts.push(m), localStorage:{setItem(){},getItem(){return null},removeItem(){}},
    setTimeout, clearTimeout, setInterval(){return 1}, clearInterval(){}, navigator:{onLine:true},
    window:{confirm:()=>{confirms++;return true}, prompt:(m)=>{prompts.push(m);return answer}, addEventListener(){}}, fetch:()=>Promise.reject(new Error("x")), Date, JSON, Promise, Object};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(R+"/source/02-state.js","utf8"),ctx);
  vm.runInContext(`seedState=function(){ return {students:[{id:"d1",isDemo:true}],users:[]}; }; persistNow=function(){ persisted++; }; renderApp=function(){}; var persisted=0;
    state={currentUser:{id:"u"},students:[{id:"s1",isDemo:false,name:"Real Pupil"}],users:[]};`,ctx);
  vm.runInContext("resetToDemo()",ctx);
  t("Reload Demo Data is refused when real students exist", alerts.length===1 && confirms===0 && vm.runInContext("persisted",ctx)===0 && vm.runInContext("state.students[0].name",ctx)==="Real Pupil");
  vm.runInContext(`state={currentUser:{id:"u"},students:[{id:"d1",isDemo:true}],users:[]};`,ctx);
  answer="nope"; vm.runInContext("resetToDemo()",ctx);
  t("wrong typed word cancels (demo-only school)", vm.runInContext("persisted",ctx)===0 && alerts.length===2);
  answer="RELOAD"; vm.runInContext("resetToDemo()",ctx);
  t("typing RELOAD on a demo-only school proceeds", vm.runInContext("persisted",ctx)===1);
}
{
  const ctx={console,escapeHtml:(s)=>s,ICONS:()=>"",state:{students:[],users:[],currentUser:{id:"u"}}}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(R+"/source/22-settings-users-backup.js","utf8"),ctx);
  let h=vm.runInContext("renderBackupSettings()",ctx); t("backup screen shows Reload Demo Data when no real students", /resetToDemo/.test(h));
  ctx.state.students=[{id:"s",isDemo:false}]; h=vm.runInContext("renderBackupSettings()",ctx); t("...and hides it once a real student exists", !/resetToDemo/.test(h) && /exportBackup/.test(h) && /wipeAllData/.test(h));
}

// ---------- 4. honest save indicator ----------
(async()=>{
  const ind={textContent:"All changes saved"}; let timers=[];
  const ctx={console, document:{getElementById:(id)=>id==="save-indicator"?ind:null, querySelectorAll:()=>[], activeElement:null, addEventListener(){}},
    localStorage:{setItem(){},getItem(){return null},removeItem(){}}, navigator:{onLine:true},
    window:{addEventListener(){}, confirm(){return true}}, setTimeout:(f,ms)=>{timers.push({f,ms});return timers.length}, clearTimeout(){}, setInterval(){return 1}, clearInterval(){},
    fetch:()=>Promise.reject(new Error("x")), Date, JSON, Promise, Object};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(R+"/source/02-state.js","utf8"),ctx);
  vm.runInContext(`renderApp=function(){}; toast=function(){}; cacheStateLocally=function(){}; syncMediaFromState=function(){}; applyMediaMarkers=function(){}; rehydrateMediaFields=function(){};
    state={currentUser:{id:"u"},students:[],users:[]}; _lastKnownRev=1;`,ctx);
  vm.runInContext(`apiSaveState=function(){ return Promise.resolve({ok:false,_networkError:true,error:"x"}); };`,ctx);
  ind.textContent="Saving…"; vm.runInContext("persistNow()",ctx); await tick(); await tick();
  t("failed save shows 'Not saved yet - retrying…' (never 'All changes saved')", /Not saved yet/.test(ind.textContent));
  vm.runInContext(`_pendingSave=false; apiSaveState=function(){ return Promise.resolve({ok:true,revision:2,merged:false,state:{}}); };`,ctx);
  ind.textContent="Saving…"; vm.runInContext("persistNow()",ctx); await tick(); await tick();
  t("successful save shows 'All changes saved'", ind.textContent==="All changes saved");
  vm.runInContext(`apiSaveState=function(){ return Promise.resolve({ok:false,_httpStatus:403,error:"no"}); };`,ctx);
  vm.runInContext("persistNow()",ctx); await tick(); await tick();
  t("permission-denied save is flagged, not reported as saved", /no permission/.test(ind.textContent));

  // ---------- 5. service worker ----------
  const swsrc=fs.readFileSync(R+"/service-worker.js","utf8");
  const listeners={}; const store={}; const fetched=[];
  const mkResp=(ok,type="basic")=>({ok,type,status:ok?200:404,clone(){return mkResp(ok,type)}});
  let net=(req)=>Promise.resolve(mkResp(true));
  const swctx={ console, Response:{error:()=>({err:true})}, Request:function(u,o){this.url=u;this.cache=o&&o.cache;},
    self:{addEventListener:(n,f)=>{listeners[n]=f}, skipWaiting(){}, clients:{claim(){}}},
    caches:{ open:async()=>({put:async(k,v)=>{store[typeof k==="string"?k:k.url]=v}}), match:async(k)=>store[typeof k==="string"?k:k.url]||undefined, keys:async()=>[], delete:async()=>true },
    fetch:(req)=>{ fetched.push(req); return net(req); } };
  vm.createContext(swctx); vm.runInContext(swsrc,swctx);
  let p; listeners.install({waitUntil:(x)=>{p=x}}); await p;
  t("install fetches every file fresh (cache: 'reload')", fetched.length===6 && fetched.every(r=>r.cache==="reload"));
  net=(req)=>Promise.resolve(req.url.includes("app.js")?mkResp(false):mkResp(true)); fetched.length=0;
  let failed=false; listeners.install({waitUntil:(x)=>{p=x}}); try{ await p; }catch(e){ failed=true; }
  t("a failed download aborts the install (no half-cached app)", failed);
  // fetch handler
  const respond=async(req)=>{ let out; listeners.fetch({request:req,respondWith:(x)=>{out=x}}); return out&&await out; };
  net=()=>Promise.resolve(mkResp(false)); Object.keys(store).forEach(k=>delete store[k]);
  const r404=await respond({method:"GET",url:"https://x/missing.png",mode:"no-cors"}); await tick();
  t("error responses are not cached", !store["https://x/missing.png"]);
  net=()=>Promise.resolve(mkResp(true)); await respond({method:"GET",url:"https://x/ok.png",mode:"no-cors"}); await tick();
  t("good same-origin responses are cached", !!store["https://x/ok.png"]);
  store["./index.html"]={shell:true}; net=()=>Promise.reject(new Error("offline"));
  const nav=await respond({method:"GET",url:"https://x/",mode:"navigate"});
  t("offline page load falls back to the app shell", nav&&nav.shell===true);
  const off=await respond({method:"GET",url:"https://x/other.js",mode:"no-cors"});
  t("offline non-page request fails cleanly (no undefined crash)", off&&off.err===true);
  let called=false; listeners.fetch({request:{method:"GET",url:"https://x/.netlify/functions/state-get",mode:"cors"},respondWith:()=>{called=true}});
  t("API calls are still never intercepted", called===false);

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
