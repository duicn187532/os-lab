const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const extract=s=>JSON.parse(s.match(/const lessons = (.*);\n/)[1]);
assert.deepEqual(extract(fs.readFileSync('os/index.html','utf8')),extract(execFileSync('git',['show','2186e4d:os/index.html'],{encoding:'utf8'})),'All original lesson content and quiz questions are preserved');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://localhost:8000/os/');
 for(let i=0;i<16;i++){
   await page.evaluate(i=>navigate(i),i);
   assert(await page.locator('#noteArea').count());
   await page.locator('#noteArea').fill('檢查筆記 '+i);
   await page.evaluate(()=>setTab('lab'));
   assert(await page.locator('#labspace').innerText());
   await page.evaluate(()=>setTab('quiz'));
   for(let j=0;j<2;j++){
     const answer=await page.evaluate(()=>lessons[state.lesson].quiz[state.quiz.i][2]);
     await page.locator(`[data-answer="${answer}"]`).click();await page.locator('#nextQuiz').click();
   }
   assert((await page.locator('#lessonStage').innerText()).includes('2 / 2'));
 }
 assert.equal(await page.evaluate(()=>countDone()),16);
 await page.evaluate(()=>navigate(0,'lab'));
 for(let i=0;i<7;i++)await page.locator('[data-lab=next]').click();
 assert.equal(await page.evaluate(()=>state.lab.t),7);
 assert((await page.locator('#labspace').innerText()).includes('12'));
 await page.locator('#rewindLab').click();assert.equal(await page.evaluate(()=>state.lab.t),6);
 await page.evaluate(()=>setTab('learn'));await page.evaluate(()=>setTab('lab'));assert.equal(await page.evaluate(()=>state.lab.t),6);
 await page.locator('#playSpeed').selectOption('500');await page.locator('#playLab').click();await page.waitForTimeout(650);await page.locator('#playLab').click();assert.equal(await page.evaluate(()=>state.lab.t),7);
 await page.locator('#playLab').click();await page.evaluate(()=>setTab('quiz'));await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>state.lab.t),7);
 const wrong=await page.evaluate(()=>1-lessons[0].quiz[0][2]);await page.locator(`[data-answer="${wrong}"]`).click();await page.evaluate(()=>setTab('learn'));await page.evaluate(()=>setTab('quiz'));assert.equal(await page.evaluate(()=>state.quiz.tries),1);
 await page.evaluate(()=>navigate(4,'lab'));assert.deepEqual(await page.locator('.slice strong').allTextContents(),Array(13).fill('?'));
 await page.locator('[data-setting=quantum]').fill('2.5');await page.locator('[data-setting=quantum]').dispatchEvent('change');assert.equal(await page.evaluate(()=>state.lab.quantum),2);
 const results=await page.evaluate(()=>['FCFS','SJF','SRTF','RR'].map(a=>scheduleSim([{id:'A',arr:0,burst:5},{id:'B',arr:1,burst:2}],a,2)));
 assert.deepEqual(results.map(r=>r.trace.join('')),['AAAAABB','AAAAABB','ABBAAAA','AABBAAA']);
 assert.deepEqual(results[2].rows.map(r=>[r.tat,r.wt,r.rt]),[[7,2,0],[2,0,0]]);
 assert.deepEqual(await page.evaluate(()=>[calcRace(false,6).x,calcRace(true,6).x]),[1,2]);
 assert.deepEqual(await page.evaluate(()=>['FIFO','LRU'].map(algo=>simulateReplacement({...createLabState('replacement'),algo,t:8}).fault)),[7,6]);
 await page.evaluate(()=>navigate(0));await page.screenshot({path:'/workspace/os-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
 await page.locator('#menu').click();assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'false');
 for(let i=0;i<16;i++){await page.evaluate(i=>navigate(i,'lab'),i);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Mobile overflow chapter ${i}`)}
 await page.screenshot({path:'/workspace/os-mobile.png'});
 await page.reload();assert.equal(await page.evaluate(()=>countDone()),16);assert.equal(await page.evaluate(()=>store.notes[0]),'檢查筆記 0');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 16 chapters, 32 quiz answers, preserved content, notes, tab state, playback, algorithms, keyboard, mobile overflow, reload; no browser errors');
})().catch(e=>{console.error(e);process.exit(1)});
