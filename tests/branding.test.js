const fs=require("fs"), path=require("path"), os=require("os"), zlib=require("zlib"), cp=require("child_process"), crypto=require("crypto");
const R=path.join(__dirname,"..");
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };

function crc32(buf){ let c, crc=0xffffffff; for(let n=0;n<buf.length;n++){ c=(crc^buf[n])&0xff; for(let k=0;k<8;k++) c=c&1?(c>>>1)^0xedb88320:c>>>1; crc=(crc>>>8)^c; } return (crc^0xffffffff)>>>0; }
function chunk(type,data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length); const td=Buffer.concat([Buffer.from(type),data]); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len,td,crc]); }
function makePng(w,h,shade){ // a real, valid solid-colour PNG
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2;
  const row=Buffer.alloc(1+w*3, shade); row[0]=0; const raw=Buffer.concat(Array.from({length:h},()=>row));
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
}
function site(){ // a tiny copy of the project we can build in
  const d=fs.mkdtempSync(path.join(os.tmpdir(),"brand-"));
  ["scripts","source","icons","brand"].forEach(x=>fs.mkdirSync(path.join(d,x),{recursive:true}));
  fs.copyFileSync(R+"/scripts/build.js",d+"/scripts/build.js");
  ["manifest.json","index.html","styles.css","service-worker.template.js"].forEach(f=>fs.copyFileSync(R+"/"+f,d+"/"+f));
  fs.writeFileSync(d+"/source/01.js","var a=1;");
  fs.writeFileSync(d+"/icons/icon-192.png",makePng(192,192,10)); fs.writeFileSync(d+"/icons/icon-512.png",makePng(512,512,10));
  return d;
}
function build(d,env){ const r=cp.spawnSync("node",[d+"/scripts/build.js"],{env:Object.assign({PATH:process.env.PATH},env||{}),encoding:"utf8"}); return {out:r.stdout+r.stderr, code:r.status}; }
const rd=(d,f)=>fs.readFileSync(path.join(d,f),"utf8");
const hashOf=(d)=>(rd(d,"service-worker.js").match(/ladybird-school-([0-9a-f]+)/)||[])[1];

// 1. nothing set -> nothing changes (an existing school is untouched)
{ const d=site(); const m0=rd(d,"manifest.json"), h0=rd(d,"index.html"); const r=build(d);
  t("B1 with no settings the manifest, page and icons are left exactly as they were", r.code===0 && rd(d,"manifest.json")===m0 && rd(d,"index.html")===h0 && !/Branding/.test(r.out)); }
// 2. name + short name + colour
{ const d=site(); const r=build(d,{APP_NAME:"Greenfield Academy Results",APP_SHORT_NAME:"Greenfield",THEME_COLOR:"#0B6B3A"});
  const m=JSON.parse(rd(d,"manifest.json")), h=rd(d,"index.html");
  t("B2 the installed app gets the school's own name, short name and colour", m.name==="Greenfield Academy Results" && m.short_name==="Greenfield" && m.theme_color==="#0B6B3A" && m.background_color==="#0B6B3A");
  t("B3 the page title and browser colour follow", /<title>Greenfield Academy Results<\/title>/.test(h) && /content="#0B6B3A"/.test(h) && !/Ladybird/.test(h.replace(/<!--[\s\S]*?-->/g,""))); }
// 3. a short name is made from the full name when not given; names are made safe
{ const d=site(); build(d,{APP_NAME:"Al-Noor <Model> & Sons Academy"}); const m=JSON.parse(rd(d,"manifest.json")), h=rd(d,"index.html");
  t("B4 a missing short name is made from the full name (12 letters at most)", m.short_name.length<=12 && m.short_name.length>0);
  t("B5 special characters in a name cannot break the page", /<title>Al-Noor &lt;Model&gt; &amp; Sons Academy<\/title>/.test(h)); }
// 4. bad colour ignored with a warning
{ const d=site(); const r=build(d,{APP_NAME:"X School",THEME_COLOR:"green"}); const m=JSON.parse(rd(d,"manifest.json"));
  t("B6 an invalid colour is ignored with a clear warning", /THEME_COLOR must look like/.test(r.out) && m.theme_color==="#0B2545"); }
// 5. icons from brand/<name>/
{ const d=site(); fs.mkdirSync(d+"/brand/greenfield"); fs.writeFileSync(d+"/brand/greenfield/icon-192.png",makePng(192,192,200)); fs.writeFileSync(d+"/brand/greenfield/icon-512.png",makePng(512,512,200));
  const before=hashOf((build(d),d)); const r=build(d,{BRAND:"greenfield",APP_NAME:"Greenfield"});
  t("B7 the school's own icons replace the default ones", r.code===0 && fs.readFileSync(d+"/icons/icon-192.png").equals(fs.readFileSync(d+"/brand/greenfield/icon-192.png")) && fs.readFileSync(d+"/icons/icon-512.png").equals(fs.readFileSync(d+"/brand/greenfield/icon-512.png")));
  t("B8 the update code changes so installed apps pick up the new icon", hashOf(d)!==before); }
// 6. only an icon changed (nothing else) must still bump the version
{ const d=site(); fs.mkdirSync(d+"/brand/g"); fs.writeFileSync(d+"/brand/g/icon-192.png",makePng(192,192,50)); fs.writeFileSync(d+"/brand/g/icon-512.png",makePng(512,512,50));
  build(d,{BRAND:"g"}); const h1=hashOf(d); fs.writeFileSync(d+"/brand/g/icon-192.png",makePng(192,192,90)); build(d,{BRAND:"g"});
  t("B9 changing only an icon file changes the cache version", hashOf(d)!==h1); }
// 7. bad icon files are skipped, with a warning, and the build still succeeds
{ const d=site(); fs.mkdirSync(d+"/brand/bad"); const orig=fs.readFileSync(d+"/icons/icon-192.png");
  fs.writeFileSync(d+"/brand/bad/icon-192.png",makePng(100,100,1)); fs.writeFileSync(d+"/brand/bad/icon-512.png",Buffer.from("not a png"));
  const r=build(d,{BRAND:"bad"});
  t("B10 a wrong-size or non-PNG icon is skipped with a warning; the build still works", r.code===0 && /100x100 but should be exactly 192x192/.test(r.out) && /not a PNG/.test(r.out) && fs.readFileSync(d+"/icons/icon-192.png").equals(orig)); }
// 8. brand folder missing / unsafe name
{ const d=site(); const r=build(d,{BRAND:"nothere"}); t("B11 a missing brand folder keeps the default icons and warns", r.code===0 && /icon-192.png not found - keeping the default/.test(r.out));
  const r2=build(d,{BRAND:"../etc"}); t("B12 an unsafe brand name is refused", r2.code===0 && /may only use lowercase letters/.test(r2.out)); }
// 9. maskable icon
{ const d=site(); fs.mkdirSync(d+"/brand/m"); ["192","512"].forEach(s=>fs.writeFileSync(d+"/brand/m/icon-"+s+".png",makePng(+s,+s,70))); fs.writeFileSync(d+"/brand/m/icon-maskable-512.png",makePng(512,512,70));
  build(d,{BRAND:"m"}); const m=JSON.parse(rd(d,"manifest.json"));
  t("B13 an optional maskable icon gets its own manifest entry", m.icons.some(i=>i.purpose==="maskable"&&i.src==="icons/icon-maskable-512.png") && m.icons.filter(i=>i.purpose==="any").length===2); }
// 10. the same settings twice give the same result
{ const d=site(); const env={APP_NAME:"Same School",THEME_COLOR:"#123456"}; build(d,env); const a=rd(d,"manifest.json")+rd(d,"index.html"), h=hashOf(d); build(d,env);
  t("B14 building twice with the same settings is stable", rd(d,"manifest.json")+rd(d,"index.html")===a && hashOf(d)===h); }
// 11. the real project: the school's name appears as the page title once it is known
{ const app=fs.readFileSync(R+"/app.js","utf8"); t("B15 the app sets the tab/window title from the school's name", /document\.title = state\.school\.name/.test(app)); }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
