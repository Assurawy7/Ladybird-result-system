const fs=require("fs"), path=require("path"), os=require("os"), zlib=require("zlib"), cp=require("child_process");
const R=path.join(__dirname,"..");
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };
function crc32(buf){ let c, crc=0xffffffff; for(let n=0;n<buf.length;n++){ c=(crc^buf[n])&0xff; for(let k=0;k<8;k++) c=c&1?(c>>>1)^0xedb88320:c>>>1; crc=(crc>>>8)^c; } return (crc^0xffffffff)>>>0; }
function chunk(type,data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length); const td=Buffer.concat([Buffer.from(type),data]); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len,td,crc]); }
function makePng(w,h,shade){ const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2; const row=Buffer.alloc(1+w*3,shade); row[0]=0; return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(Buffer.concat(Array.from({length:h},()=>row)))),chunk("IEND",Buffer.alloc(0))]); }
function project(){
  const d=fs.mkdtempSync(path.join(os.tmpdir(),"pkg-"));
  ["scripts","source","icons","brand/test"].forEach(x=>fs.mkdirSync(path.join(d,x),{recursive:true}));
  ["scripts/build.js","scripts/package-school.js","manifest.json","index.html","styles.css","service-worker.template.js","netlify.toml","package.json",".env.example"].forEach(f=>{ if(fs.existsSync(R+"/"+f)) fs.copyFileSync(R+"/"+f,d+"/"+f); });
  fs.writeFileSync(d+"/source/01.js","var a=1;"); fs.writeFileSync(d+"/app.js","x");
  fs.writeFileSync(d+"/icons/icon-192.png",makePng(192,192,10)); fs.writeFileSync(d+"/icons/icon-512.png",makePng(512,512,10));
  fs.writeFileSync(d+"/brand/test/icon-192.png",makePng(192,192,150)); fs.writeFileSync(d+"/brand/test/icon-512.png",makePng(512,512,150)); fs.writeFileSync(d+"/brand/test/icon-maskable-512.png",makePng(512,512,160));
  // things that must NEVER be packed
  fs.writeFileSync(d+"/.env.local","DATABASE_URL=secret"); fs.writeFileSync(d+"/.env","X=1"); fs.mkdirSync(d+"/node_modules/x",{recursive:true}); fs.writeFileSync(d+"/node_modules/x/i.js","1");
  fs.mkdirSync(d+"/.git",{recursive:true}); fs.writeFileSync(d+"/.git/HEAD","ref"); fs.writeFileSync(d+"/state-backup-1.json","{}"); fs.writeFileSync(d+"/old.zip","z"); fs.writeFileSync(d+"/service-account-x.json","{}");
  fs.mkdirSync(d+"/dist/old",{recursive:true}); fs.writeFileSync(d+"/dist/old/leftover.txt","l");
  return d;
}
function pack(d,args){ const r=cp.spawnSync("node",[d+"/scripts/package-school.js",...args],{cwd:d,encoding:"utf8",env:{PATH:process.env.PATH}}); return {out:r.stdout+r.stderr,code:r.status}; }
const rd=(d,f)=>fs.readFileSync(path.join(d,f),"utf8");
const ARGS=["--brand","test","--name","Test School Results","--short","Test School","--color","#123456"];
const listing=(z)=>cp.spawnSync("unzip",["-Z1",z],{encoding:"utf8"}).stdout.split("\n").filter(Boolean);

{ const d=project(); const m0=rd(d,"manifest.json"), h0=rd(d,"index.html"), i0=fs.readFileSync(d+"/icons/icon-192.png");
  const r=pack(d,ARGS); const z=d+"/dist/test/test-upload.zip"; const names=fs.existsSync(z)?listing(z):[];
  t("P1 the packager succeeds and creates the zip", r.code===0 && fs.existsSync(z) && /READY/.test(r.out));
  t("P2 secrets and clutter are NEVER packed (.env files, node_modules, .git, backups, zips, old dist)", !names.some(n=>/\.env(\.local)?$|node_modules|\.git\/|state-backup|\.zip$|service-account|\/dist\//.test(n)) && names.length>0);
  t("P3 normal project files ARE packed", ["app.js","manifest.json","index.html","netlify.toml","brand/test/icon-512.png",".env.example"].every(f=>names.indexOf("test-site/"+f)>-1));
  const ex=fs.mkdtempSync(path.join(os.tmpdir(),"ex-")); cp.spawnSync("unzip",["-q",z,"-d",ex]); const site=ex+"/test-site";
  const man=JSON.parse(rd(site,"manifest.json"));
  t("P4 the zip carries the school's own name, short name and colour", man.name==="Test School Results" && man.short_name==="Test School" && man.theme_color==="#123456");
  t("P5 the zip's page title and icons are the school's", /<title>Test School Results<\/title>/.test(rd(site,"index.html")) && fs.readFileSync(site+"/icons/icon-192.png").equals(fs.readFileSync(d+"/brand/test/icon-192.png")) && man.icons.some(i=>i.purpose==="maskable"));
  t("P6 YOUR OWN files are untouched (other schools keep their branding)", rd(d,"manifest.json")===m0 && rd(d,"index.html")===h0 && fs.readFileSync(d+"/icons/icon-192.png").equals(i0));
  const swPackaged=(rd(site,"service-worker.js").match(/ladybird-school-([0-9a-f]+)/)||[])[1];
  const plain=cp.spawnSync("node",[d+"/scripts/build.js"],{cwd:d,encoding:"utf8",env:{PATH:process.env.PATH}});
  const swPlain=(rd(d,"service-worker.js").match(/ladybird-school-([0-9a-f]+)/)||[])[1];
  t("P7 the packaged site gets its own update code (phones pick up the new name/icon)", swPackaged && swPlain && swPackaged!==swPlain);
  fs.mkdirSync(d+"/dist/test/test-site",{recursive:true}); fs.writeFileSync(d+"/dist/test/test-site/stale.txt","old");
  pack(d,ARGS); t("P8 running it again replaces the old output (no stale files)", !fs.existsSync(d+"/dist/test/test-site/stale.txt")); }
{ const d=project(); fs.rmSync(d+"/brand/test",{recursive:true}); const r=pack(d,ARGS);
  t("P9 a missing brand folder stops with a clear message and makes no zip", r.code!==0 && /brand\/test\/icon-192\.png is missing/.test(r.out) && !fs.existsSync(d+"/dist/test/test-upload.zip")); }
{ const d=project(); const r=pack(d,["--brand","test","--name","X","--color","green"]); t("P10 a bad colour is refused", r.code!==0 && /--color must look like/.test(r.out)); }
{ const d=project(); const r=pack(d,["--brand","test"]); t("P11 a missing name shows how to use it", r.code!==0 && /Usage:/.test(r.out)); }
{ const d=project(); const r=pack(d,["--brand","../x","--name","X"]); t("P12 an unsafe brand name is refused", r.code!==0 && /lowercase letters/.test(r.out)); }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
