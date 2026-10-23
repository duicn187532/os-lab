/* Cross-engine OS semantic and responsive QA.
 * ENGINE=chromium|firefox|webkit TEST_URL=http://localhost:8000/os-lab/os/ node tests/os-crossbrowser-semantic.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const PW=require('playwright'),engine=process.env.ENGINE||'chromium',URL=process.env.TEST_URL||'http://localhost:8000/os-lab/os/';
(async()=>{
const browser=await PW[engine].launch({headless:true,args:engine==='chromium'?['--no-sandbox']:[]});
const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
const page=await ctx.newPage(),errs=[];
page.on('pageerror',e=>errs.push(e.message));
try{
 await page.goto(URL+'#/');
 await page.waitForFunction(()=>window.OSApp?.lessons.length===29&&window.OS_TEXTBOOK_READY&&window.OS_MATHML_COUNT===27);
 const catalog=await page.evaluate(()=>({
  chapters:OSApp.lessons.length,quiz:OSApp.lessons.reduce((n,l)=>n+l.quiz.length,0),
  advanced:CSLab.code.list().filter(p=>p.id.startsWith('os.capstone.')).length
 }));
 assert.deepEqual(catalog,{chapters:29,quiz:174,advanced:8});
 let formulas=0,mathCards=0,rows=0;
 for(const id of OSApp.lessons.map(l=>l.id)){
   await page.evaluate(id=>OSApp.navigate(id,'learn'),id);
   const status=await page.evaluate(()=>{
     const root=document.querySelector('.os-textbook'),math=root?.querySelector('math'),state=root?.querySelector('.os-state-table');
     return {section:!!root,math:!!math,visible:math?.getBoundingClientRect().height||0,
       data:state?.querySelectorAll('tbody tr').length||0,
       headers:state?.querySelectorAll('thead th[scope=col]').length||0,
       equations:root?.querySelectorAll('msub,mfrac,msup').length||0,
       l3:root?.textContent.includes('L3｜可執行規格與驗收'),
       commands:root?.textContent.includes('l3-verify.cjs --chapter '+OSApp.state.lesson),
       extra:OSApp.byId[OSApp.state.lesson].quiz.slice(4).length};
   });
   assert(status.section&&status.math&&status.visible>0&&status.data>=3&&status.headers>=3&&status.l3&&status.commands&&status.extra===2,'L2/L3 '+engine+' ch '+id+JSON.stringify(status));
   formulas++;rows+=status.data;
 }
 await page.goto(URL+'#/formulas');
 mathCards=await page.locator('.formula-card math').count();
 assert.equal(mathCards,27,'All 27 formulas render as native MathML');
 assert(await page.locator('.formula-card mfrac').count()>=5,'Fractions in native MathML');
 // Verify the advanced simulators model actual boundary semantics, not just that the UI exists.
 const semantics=await page.evaluate(()=>{
 const all=CSLab.sim.osAdvanced, frames=(name,v)=>all[name].frames(v),last=(name,v)=>frames(name,v).at(-1).desc;
 const checks={
  pipeEOF:last('os-ipc',{writers:0,bytes:0,read:5,mode:'block'}).includes('EOF'),
  pipeWriterWait:frames('os-ipc',{writers:1,bytes:0,read:5,mode:'block'})[1].visual.includes('等待'),
  condWhile:last('os-condvar',{ready:'no',wake:'spurious',check:'while'}).includes('繼續 wait'),
  condIfUnsafe:last('os-condvar',{ready:'no',wake:'spurious',check:'if'}).includes('錯誤'),
  cowPrivate:last('os-cow',{mode:'private',write:'child',initial:5,changed:9}).includes('父子'),
  cowShared:last('os-cow',{mode:'shared',write:'child',initial:5,changed:9}).includes('父子'),
  clockTerminates:frames('os-clock',{bits:'111',hand:1,page:4}).at(-1).label.includes('Victim'),
  journalNoCommit:last('os-journal',{crash:'after_log',old:10,new:20}).includes('10'),
  journalCommit:last('os-journal',{crash:'after_commit',old:10,new:20}).includes('20'),
  etEdge:frames('os-epoll',{mode:'et',pending:100,read:30,newdata:'no'})[2].visual.includes('不保證'),
  ltReady:frames('os-epoll',{mode:'lt',pending:100,read:30,newdata:'no'})[2].visual.includes('通知')
 };
 return checks;
 });
 assert(Object.values(semantics).every(Boolean),'Simulator invariant regressions '+JSON.stringify(semantics));
 let screens=0;
 for(const width of [375,390,1280]){
  await page.setViewportSize({width,height:844});
  for(const skin of ['classic','maple']){
   await page.evaluate(s=>CSLabSkin.set(s),skin);
   for(const id of [0,4,6,17,22,23,24,25,26,27,28]){
    for(const tab of ['learn','lab','quiz','code']){
     await page.evaluate(([id,tab])=>OSApp.navigate(id,tab),[id,tab]);
     const widthCheck=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
     assert(widthCheck.doc<=widthCheck.view+1,'Overflow '+engine+' '+skin+' '+id+' '+tab+' width='+width+JSON.stringify(widthCheck));
     screens++;
    }
   }
  }
 }
 assert.deepEqual(errs,[],'Unhandled JS '+engine);
 console.log('PASS '+engine+': 29 L2/L3 math+state tables, 27 MathML formulas, 174 quiz questions, eight capstones, '+rows+' state rows, 11 simulator semantics, '+screens+' responsive screens in two skins.');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
