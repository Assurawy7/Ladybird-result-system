const Module = require("module");
const path = require("path");
const FN = path.join(__dirname, "..", "netlify", "functions");

// ---------- fake world ----------
let W;
function reset(){
  W = { stateEmpty:false, users:[
      {id:"u1",username:"Admin",name:"Ada",role:"ADMIN",active:true,passwordHash:"H:secret1"},
      {id:"u2",username:"teacher",name:"Tee",role:"TEACHER",active:true,passwordHash:"H:secret2"},
      {id:"u3",username:"gone",name:"Gone",role:"TEACHER",active:false,passwordHash:"H:pw"} ],
    sessions:{}, attempts:{}, log:[], bcryptCalls:0, throttleBroken:false, media:{} };
}
reset();
const sha = (t)=>require("crypto").createHash("sha256").update(t).digest("hex");
async function query(sql, p){
  W.log.push(sql);
  if (/login_attempts/.test(sql) && W.throttleBroken) throw new Error("throttle table broken");
  if (/SELECT state FROM school_state|SELECT state, revision/.test(sql)) throw new Error("WHOLE-STATE READ: "+sql);
  if (/JOIN LATERAL/.test(sql)) {
    const s = W.sessions[p[0]]; if (!s || s.expires < Date.now()) return {rows:[]};
    const u = W.users.find(x=>x.id===s.user_id && x.active); return {rows: u?[{user_id:u.id, usr:JSON.parse(JSON.stringify(u))}]:[]};
  }
  if (/SELECT u\.usr FROM school_state/.test(sql)) { const u=W.users.find(x=>x.username.toLowerCase()===p[0] && x.active); return {rows:u?[{usr:JSON.parse(JSON.stringify(u))}]:[]}; }
  if (/INSERT INTO sessions/.test(sql)) { W.sessions[p[0]]={user_id:p[1],expires:+new Date(p[2])}; return {rows:[]}; }
  if (/DELETE FROM sessions WHERE expires_at/.test(sql)) { for (const k in W.sessions) if (W.sessions[k].expires<Date.now()) delete W.sessions[k]; return {rows:[]}; }
  if (/CREATE TABLE IF NOT EXISTS login_attempts/.test(sql)) return {rows:[]};
  if (/SELECT fails, first_fail FROM login_attempts/.test(sql)) { const a=W.attempts[p[0]]; return {rows:a?[{fails:a.fails,first_fail:a.first}]:[]}; }
  if (/INSERT INTO login_attempts/.test(sql)) { const a=W.attempts[p[0]]; if(!a||Date.now()-a.first>15*60000) W.attempts[p[0]]={fails:1,first:new Date()}; else a.fails++; return {rows:[]}; }
  if (/DELETE FROM login_attempts WHERE key/.test(sql)) { delete W.attempts[p[0]]; return {rows:[]}; }
  if (/DELETE FROM login_attempts/.test(sql)) return {rows:[]};
  if (/SELECT \(state = /.test(sql)) return {rows:[{empty:W.stateEmpty}]};
  throw new Error("unmocked SQL: "+sql);
}
const mocks = {
  "bcryptjs": { hashSync:(x)=>"H:"+x, hash:async(x)=>"H:"+x, compare:async(x,h)=>{ W.bcryptCalls++; return h==="H:"+x; } },
  "./_db": { query, withTransaction: async (fn)=> fn({ query: async (sql)=> ({rows:[{ state: W.stateEmpty?{}:{users:W.users}, revision: 0 }]}) }) },
  "./_r2": { getMedia: async(k)=> W.media[k]?{found:true,dataUrl:W.media[k]}:{found:false}, putMedia: async(k,d)=>{W.media[k]=d;}, deleteMedia: async(k)=>{delete W.media[k];} },
};
const orig = Module._load;
Module._load = function(req, ...a){ return mocks[req] || orig.call(this, req, ...a); };
const load = (f)=> require(path.join(FN,f));
const login = load("auth-login.js").handler, session = load("auth-session.js").handler;
const mget = load("media-get.js").handler, msave = load("media-save.js").handler, mdel = load("media-delete.js").handler;
const ssave = load("state-save.js").handler;

let pass=0, fail=0;
const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };
const H=(ip,cookie)=>({ "x-nf-client-connection-ip":ip, ...(cookie?{cookie:"ladybird_session="+cookie}:{}) });
const L=(u,p,ip="1.1.1.1")=> login({httpMethod:"POST",headers:H(ip),body:JSON.stringify({username:u,password:p})});
const cookieOf=(r)=> (r.headers["Set-Cookie"].match(/ladybird_session=([^;]+)/)||[])[1];

(async()=>{
  // --- login basics ---
  reset(); let r = await L("ADMIN","secret1");
  t("correct login works (case-insensitive username)", r.statusCode===200 && JSON.parse(r.body).user.id==="u1" && !!r.headers["Set-Cookie"]);
  t("login never read the whole state", !W.log.some(s=>/WHOLE/.test(s)));
  reset(); const rBad = await L("admin","nope"); const bcA=W.bcryptCalls; const rNo = await L("nobody","nope"); const bcB=W.bcryptCalls-bcA;
  t("wrong password -> 401 generic message", rBad.statusCode===401 && JSON.parse(rBad.body).error==="Incorrect username or password.");
  t("unknown user -> SAME message", rNo.statusCode===401 && JSON.parse(rNo.body).error===JSON.parse(rBad.body).error);
  t("unknown user still does a password check (same timing)", bcB===1 && bcA===1);
  reset(); r = await L("gone","pw"); t("deactivated user cannot log in", r.statusCode===401);

  // --- throttling ---
  reset(); let last; for(let i=0;i<8;i++) last=await L("admin","wrong"+i);
  r = await L("admin","secret1");
  t("after 8 wrong tries even the CORRECT password is refused (429)", r.statusCode===429 && /wait about/.test(JSON.parse(r.body).error) && !!r.headers["Retry-After"]);
  r = await L("teacher","secret2"); t("a different username from the same connection still works", r.statusCode===200);
  r = await L("admin","secret1","9.9.9.9"); t("same username from a different connection is unaffected", r.statusCode===200);
  reset(); for(let i=0;i<5;i++) await L("admin","bad"); r=await L("admin","secret1"); t("correct login clears the counter", r.statusCode===200 && !W.attempts["u:admin|1.1.1.1"]);
  reset(); for(let i=0;i<40;i++) await L("user"+i,"bad"); r=await L("teacher","secret2"); t("40 failures from one connection locks that connection", r.statusCode===429);
  reset(); W.throttleBroken=true; r=await L("admin","secret1"); t("if the counter table is broken, logins still work (fail open)", r.statusCode===200);

  // --- sessions / light auth ---
  reset(); r=await L("admin","secret1"); const tok=cookieOf(r);
  let s=await session({httpMethod:"GET",headers:H("1.1.1.1",tok)}); t("auth-session accepts a valid session", JSON.parse(s.body).authenticated===true && JSON.parse(s.body).user.role==="ADMIN");
  t("session response never contains a password hash", !/passwordHash|H:secret/.test(s.body));
  s=await session({httpMethod:"GET",headers:H("1.1.1.1")}); t("no cookie -> not authenticated", JSON.parse(s.body).authenticated===false);
  W.sessions[sha(tok)].expires=Date.now()-1000; s=await session({httpMethod:"GET",headers:H("1.1.1.1",tok)}); t("expired session rejected", JSON.parse(s.body).authenticated===false);
  reset(); r=await L("teacher","secret2"); const tt=cookieOf(r); W.users[1].active=false; s=await session({httpMethod:"GET",headers:H("1.1.1.1",tt)}); t("deactivating a user ends their access immediately", JSON.parse(s.body).authenticated===false);
  reset(); await L("admin","secret1"); const old=Object.keys(W.sessions)[0]; W.sessions[old].expires=Date.now()-5; await L("teacher","secret2"); t("expired sessions are purged when a new login happens", !W.sessions[old]);

  // --- media: same rules as before, no whole-state reads ---
  reset(); r=await L("teacher","secret2"); const mt=cookieOf(r); W.log=[];
  let m=await msave({httpMethod:"POST",headers:H("1.1.1.1",mt),body:JSON.stringify({key:"student_1",dataUrl:"data:image/png;base64,AAA"})});
  t("signed-in user can still save media (rule unchanged)", m.statusCode===200 && W.media["student_1"]);
  m=await mget({httpMethod:"GET",headers:H("1.1.1.1",mt),queryStringParameters:{key:"student_1"}}); t("signed-in user can read media", JSON.parse(m.body).found===true);
  m=await mdel({httpMethod:"POST",headers:H("1.1.1.1",mt),body:JSON.stringify({key:"student_1"})}); t("signed-in user can delete media (rule unchanged)", m.statusCode===200 && !W.media["student_1"]);
  t("media calls never read the whole state", !W.log.some(x=>/WHOLE/.test(x)));
  m=await mget({httpMethod:"GET",headers:H("1.1.1.1"),queryStringParameters:{key:"student_1"}}); t("signed-out media read -> 401 on a set-up school", m.statusCode===401);
  m=await msave({httpMethod:"POST",headers:H("1.1.1.1"),body:JSON.stringify({key:"k",dataUrl:"data:image/png;base64,A"})}); t("signed-out media save -> 401", m.statusCode===401);
  m=await mdel({httpMethod:"POST",headers:H("1.1.1.1"),body:JSON.stringify({key:"k"})}); t("signed-out media delete -> 401", m.statusCode===401);
  W.stateEmpty=true; m=await mget({httpMethod:"GET",headers:H("1.1.1.1"),queryStringParameters:{key:"x"}}); t("media read allowed before the school is set up (as before)", m.statusCode===200);

  // --- first-run lock ---
  reset(); W.stateEmpty=true; delete process.env.ALLOW_SEED;
  const seedBody=JSON.stringify({baseRevision:0,state:{users:[{id:"s",username:"x",role:"SUPER_ADMIN",active:true,password:"p"}],school:{name:"N"}}});
  let ss=await ssave({httpMethod:"POST",headers:H("2.2.2.2"),body:seedBody});
  t("first-run seeding is refused by default (403, clear message)", ss.statusCode===403 && /ALLOW_SEED/.test(JSON.parse(ss.body).error));
  process.env.ALLOW_SEED="true"; ss=await ssave({httpMethod:"POST",headers:H("2.2.2.2"),body:seedBody});
  t("with ALLOW_SEED=true the lock is open (not 403)", ss.statusCode!==403);
  delete process.env.ALLOW_SEED;

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error("HARNESS ERROR",e);process.exit(2);});
