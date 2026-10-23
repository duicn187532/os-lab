// Chromium smoke: run the actual sandboxed JavaScript Judge on all 29 OS chapter quests.
// Uses an independent model from tests/os-judge-native.cjs, not canned expected outputs.
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const URL=process.env.TEST_URL||'http://localhost:8000/os-lab/os/';
const native=fs.readFileSync(path.join(__dirname,'os-judge-native.cjs'),'utf8');
const start=native.indexOf('function answer(id,t) {'),end=native.indexOf('\n\nlet oracleCases',start);
assert(start>=0&&end>start,'Native independent reference function must exist');
const answerJS=native.slice(start,end);
const source=(id)=>'const input=readInput().trim().split(/\\r?\\n/);\n'+answerJS+'\nconsole.log(input.slice(1).map(line=>answer('+id+',line.trim().split(/\\s+/))).join("\\n"));\n';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try {
   await page.goto(URL+'#/');
   await page.waitForFunction(()=>window.OSApp&&window.CSLab?.code);
   const meta=await page.evaluate(()=>CSLab.code.list().map(p=>({id:p.id,lesson:p.lesson})));
   assert.equal(meta.length,29);
   await page.evaluate(async()=>{window.__OS_JUDGE__=(await CSLab.code.load()).judge;});
   let passed=0,caseGroups=0;
   for(const p of meta){
     const result=await page.evaluate(async ({id,program})=>{
       const item=CSLab.code.get(id);
       const cases=CSLab.code.cases(item);
       const r=await window.__OS_JUDGE__({...item,cases},'javascript',program);
       return {verdict:r.verdict,passed:r.passed,total:r.total,bad:r.results.filter(t=>t.verdict!=='AC').map(t=>t.name+':'+t.verdict)};
     },{id:p.id,program:source(p.lesson)});
     assert.equal(result.verdict,'AC',p.id+' '+JSON.stringify(result));
     assert.equal(result.passed,result.total,p.id+' case count');
     passed++;caseGroups+=result.total;
   }
   // A starter that prints TODO must compile but receive Wrong Answer, not a sandbox error.
   const first=await page.evaluate(async()=>{
     const p=CSLab.code.list()[0];
     const r=await window.__OS_JUDGE__({...p,cases:CSLab.code.cases(p)},'javascript',p.starter.javascript);
     return r.verdict;
   });
   assert.equal(first,'WA','A starter produces WA (not RE/CE/IE)');
   // Test actual application submit route and persistence. The run above used the same sandbox Judge.
   await page.evaluate(()=>OSApp.navigate(24,'code'));
   await page.waitForSelector('.code-editor textarea');
   await page.click('[data-code-lang="javascript"]');
   await page.waitForSelector('.code-editor textarea');
   const target=meta.find(p=>p.lesson===24);
   await page.locator('.code-editor textarea').fill(source(24));
   await page.click('[data-code="submit"]');
   await page.waitForFunction(()=>Boolean(CSApp.store.code['os.textbook.24']?.solved),null,{timeout:120000});
   assert(await page.evaluate(()=>CSApp.store.code['os.textbook.24'].solved),'Application submit persists accepted result');
   assert.equal(errors.length,0,'No uncaught browser errors: '+errors.join(' / '));
   console.log('PASS: '+passed+' OS chapter problems accepted through sandboxed JavaScript Judge, '+caseGroups+' test groups, starter WA, actual lesson submit persists solved state.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
