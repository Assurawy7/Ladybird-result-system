/* Report-card structure tests (no browser needed). The one-A4-page guarantee
   itself is verified in a real browser by tests/print-a4.test.js (npm run test:print). */
const fs=require("fs"), vm=require("vm"), path=require("path");
const R=path.join(__dirname,"..");
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };
const ctx={console,Date,JSON,Promise,Object,Array,Math,Set,String,Number,
  document:{getElementById:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({style:{}}),body:{appendChild(){}}},
  localStorage:{setItem(){},getItem(){return null},removeItem(){}}, navigator:{onLine:true},
  window:{addEventListener(){},confirm:()=>true,prompt:()=>""}, alert(){}, setTimeout:()=>0,clearTimeout(){},setInterval(){return 1},clearInterval(){},
  fetch:()=>Promise.reject(new Error("x"))};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(R+"/app.js","utf8"),ctx);
const run=c=>vm.runInContext(c,ctx);
const css=fs.readFileSync(R+"/styles.css","utf8");

run('state=seedState(); state.users.forEach(function(u){ if(u.role==="SUPER_ADMIN") state.currentUser=u; });');
const tpls=JSON.parse(run('JSON.stringify(state.reportTemplates.map(function(t){return {id:t.id,name:t.name,style:t.style};}))'));
t("R1 all 10 templates are still there, with their names",
  tpls.length===10 && ["SS Premium Academic","SS Modern Executive","SS Royal Premium","JSS Premium Academic","JSS Corporate Slate","JSS Elegant Serif","Primary Child-Friendly","Primary Forest Green","Nursery Early Learning","Nursery Elegant Maroon"].every(n=>tpls.some(x=>x.name===n)));
t("R2 all 10 theme keys are still offered in Settings", run('RC_THEMES.length')===10);
const styles=[...new Set(tpls.map(x=>x.style))];
t("R3 every theme has its own stylesheet block", styles.length===10 && styles.every(s=>(css.match(new RegExp("\\.rc-theme-"+s+"\\b","g"))||[]).length>=4));

const stu=JSON.parse(run('JSON.stringify((function(){ var s=state.students[0]; return {id:s.id,ca:s.classArmId,ses:state.currentSessionId,term:state.currentTermId,adm:s.admissionNo}; })())'));
const html=tpls.map(x=>run(`generateReportCardHtml("${stu.id}","${stu.ca}","${stu.ses}","${stu.term}","${x.id}")`));
t("R4 every template renders exactly one A4 card and no error", html.every((h,i)=>(h.match(/class="report-card /g)||[]).length===1 && h.indexOf("rc-theme-"+tpls[i].style)>-1 && !/ERR|undefined|NaN/.test(h)));
t("R5 the template's settings name is no longer printed on the card", html.every((h,i)=>h.indexOf("TERMINAL REPORT \u2014")===-1 && h.indexOf(">"+tpls[i].name+"<")===-1));
t("R6 student identity, watermark, results, comments and signatures are all present", html.every(h=>h.indexOf(stu.adm)>-1 && /rc-watermark/.test(h) && /rc-subject-table/.test(h) && /rc-comments/.test(h) && /rc-sign-cap/.test(h) && /rc-info-grid/.test(h)));
const multi=run(`[1,2,3].map(function(){return generateReportCardHtml("${stu.id}","${stu.ca}","${stu.ses}","${stu.term}");}).join("")`);
t("R7 no blank-page separators are emitted between cards", multi.indexOf("rc-page-break")===-1);
t("R8 a photo that has not loaded ('@media' marker) never draws a broken <img>", (function(){ run('state.students[0].photo="@media"'); const h=run(`generateReportCardHtml("${stu.id}","${stu.ca}","${stu.ses}","${stu.term}")`); return !/src="@media"/.test(h) && /rc-photo-fallback/.test(h); })());
t("R9 the card is sized in mm to A4 (210 x 296.6) and printed with @page A4, margin 0", /width:210mm;\s*height:296\.6mm/.test(css) && /@page\{size:A4 portrait;margin:0;\}/.test(css));
t("R10 print hides the app with display:none (visibility:hidden left blank pages)", /body > \*:not\(#print-area\)\{display:none !important;\}/.test(css) && !/body \*\{visibility:hidden/.test(css));
t("R11 backgrounds are forced to print (table headers were white-on-white)", /print-color-adjust:exact/.test(css));
t("R12 the fit engine is shipped and used by preview and print", /function fitReportCards/.test(fs.readFileSync(R+"/app.js","utf8")) && /fitInPrintArea\(printArea\)/.test(fs.readFileSync(R+"/app.js","utf8")));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
