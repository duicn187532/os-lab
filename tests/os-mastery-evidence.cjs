/* OS-only academic evidence E2E in actual Chromium, including legacy storage
 * protection, first-score immutability, L2 local evidence and reload survival.
 */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const URL=process.env.TEST_URL||'http://localhost:8000/os-lab/os/';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL+'#/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await page.waitForFunction(()=>Boolean(window.OS_ACADEMIC));
  assert.equal(await page.locator('.os-mastery-summary').count(),1,'Academic progress visible at home');
  await page.evaluate(()=>OSApp.navigate(7,'learn'));
  const initial=await page.evaluate(()=>OS_ACADEMIC.status(7));
  assert.equal(initial.mastered,false);
  assert.equal(initial.completed,false);
  const untouched=await page.evaluate(()=>localStorage.getItem('os_lab_2026_v1'));
  assert(untouched,'Legacy storage exists after visit');
  // Old completions are NOT trusted evidence of the first quiz attempt.
  const legacy=await page.evaluate(()=>{
   OSApp.store.learn[7]={at:'2026-01-01'};
   OSApp.store.lab[7]={at:'2026-01-01'};
   OSApp.store.done[7]={first:6,total:6,at:'2026-01-01'};
   for(const task of CSLab.code.forLesson(7))OSApp.store.code[task.id]={solved:true};
   localStorage.setItem('os_lab_2026_v1',JSON.stringify(OSApp.store));
   return OS_ACADEMIC.status(7);
  });
  assert.equal(legacy.completed,true);
  assert.equal(legacy.quiz,false,'Legacy done must not become first-quiz evidence');
  assert.equal(legacy.mastered,false);
  assert.equal(legacy.readyForReview,false);
  await page.locator('.os-mastery details summary').click();
  await page.locator('.os-mastery [data-field=total]').fill('8');
  await page.locator('.os-mastery [data-field=derivation]').fill('3');
  await page.locator('.os-mastery [data-field=note]').fill(
    '輸入 FIFO 參照序列，逐步記錄 frame 狀態；再檢查 Belady anomaly 反例並附上可重現命令。');
  await page.locator('.os-mastery [data-save]').click();
  assert.equal(await page.evaluate(()=>OS_ACADEMIC.status(7).l2),true);
  assert.equal(await page.evaluate(()=>OS_ACADEMIC.status(7).readyForReview),false);
  await page.evaluate(()=>{
   document.dispatchEvent(new CustomEvent('cslab:progress',{
    detail:{kind:'done',lesson:7,first:5,total:6}
   }));
  });
  const candidate=await page.evaluate(()=>OS_ACADEMIC.status(7));
  assert.equal(candidate.quiz,true,'New 5/6 first score passes 80 percent');
  assert.equal(candidate.l3,true);
  assert.equal(candidate.readyForReview,true,'Only complete + new quiz + L2 + Judge gives review readiness');
  assert.equal(candidate.mastered,false,'No automatic Mastered, ever');
  await page.evaluate(()=>{
   document.dispatchEvent(new CustomEvent('cslab:progress',{
    detail:{kind:'done',lesson:7,first:0,total:6}
   }));
  });
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('os_lab_academic_v1')).records[7].quiz.first),5,
    'Original first quiz must never be overwritten');
  await page.reload();
  await page.waitForFunction(()=>Boolean(window.OS_ACADEMIC));
  const saved=await page.evaluate(()=>OS_ACADEMIC.status(7));
  assert.equal(saved.readyForReview,true,'Academic records survive reload');
  assert.equal(saved.mastered,false);
  const report=await page.evaluate(()=>JSON.parse(OS_ACADEMIC.exportEvidence()));
  assert.equal(report.schema,'os-lab-academic-v1');
  assert.equal(report.chapters.length,29);
  assert(report.warning.includes('NOT AN ACADEMIC CERTIFICATE'));
  assert(report.chapters.every(x=>x.mastered===false));
  assert.deepEqual(errors,[],'No browser uncaught errors');
  console.log('PASS OS Mastery: legacy progress isolation, 80% first-ever capture, L2 evidence, Judge prerequisite, reload and never false Mastered');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
