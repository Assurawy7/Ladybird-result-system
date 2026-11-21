/* Real-browser print verification: boots app.js in headless Chromium, builds
   classes of students taking 5..30 subjects for Nursery/Primary/JSS/SS, renders
   all ten templates through the app's own fit + print code, prints to PDF and
   checks every card is exactly ONE A4 portrait page (595 x 842 pt).
   Needs Playwright:  npm i -D playwright pdf-lib && npx playwright install chromium
   Run with:          npm run test:print            (skips if Playwright is absent) */
const fs=require("fs"), path=require("path");
const R=path.join(__dirname,"..");
let pw; try { pw=require("playwright"); } catch(e){ try { pw=require("/opt/npm-tools/node_modules/playwright"); } catch(e2){ console.log("SKIP print-a4: Playwright is not installed (npm i -D playwright)."); process.exit(0); } }
const THEMES=["classic-navy","modern-teal","royal-purple","crimson-gold","corporate-slate","elegant-serif","sunburst-orange","forest-green","minimal-mono","double-frame-formal"];
let PDFDocument; try { PDFDocument=require("pdf-lib").PDFDocument; } catch(e){ try { PDFDocument=require("/opt/npm-tools/node_modules/pdf-lib").PDFDocument; } catch(e2){ console.log("SKIP print-a4: pdf-lib is not installed (npm i -D pdf-lib)."); process.exit(0); } }
const pageSizes=async b=>(await PDFDocument.load(b)).getPages().map(p=>p.getSize());
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };
(async()=>{
  const browser=await pw.chromium.launch({args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errs=[]; page.on("pageerror",e=>errs.push(e.message));
  await page.goto("file://"+R+"/index.html"); await page.waitForTimeout(400);
  await page.addScriptTag({path:path.join(__dirname,"helpers","report-world.js")});
  const worlds=[["Nursery",{}],["Primary",{}],["Junior Secondary",{}],["Senior Secondary",{}],
    ["Junior Secondary",{noLogo:true,noStamp:true,noPhotoFor:0}],["Senior Secondary",{schoolName:"DARUL IMAMU AHMAD BUN HAMBAL ISLAMIC SCHOOL AND ACADEMY OF EXCELLENCE, KANO",longName:true,manyDomains:true}]];
  for (const [section,opts] of worlds){
    const info=await page.evaluate(({s,o})=>window.__buildWorld(s,o),{s:section,o:opts});
    const meta=await page.evaluate(({info,themes})=>{ var pa=document.getElementById("print-area"),h="";
      info.studentIds.forEach(function(sid){themes.forEach(function(th){h+=generateReportCardHtml(sid,info.armId,info.sessionId,info.termId,info.templateIds[th]);});});
      pa.innerHTML=h; fitInPrintArea(pa);
      return [].slice.call(pa.querySelectorAll(".report-card")).map(function(c){return {fit:c.dataset.fit,fs:+c.dataset.fs,n:+c.dataset.n};}); },{info,themes:THEMES});
    await page.emulateMedia({media:"print"}); const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true}); await page.emulateMedia({media:"screen"});
    const label=section+(Object.keys(opts).length?" ("+Object.keys(opts).join(",")+")":"");
    const sizes=await pageSizes(pdf);
    t(`${label}: ${meta.length} cards -> exactly ${meta.length} A4 portrait pages`, sizes.length===meta.length && sizes.every(z=>Math.abs(z.width-595.3)<1.5 && Math.abs(z.height-841.9)<1.5));
    t(`${label}: nothing needed down-scaling and text stays >= 8.5px`, meta.every(m=>m.fit==="ok"||m.fit==="compact") && Math.min(...meta.map(m=>m.fs))>=8.5);
  }
  t("no JavaScript errors", errs.length===0);
  await browser.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
