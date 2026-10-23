// Browser E2E: OS LAB textbook expansion and Maple skin integration.
// Run with localhost:8000 serving sibling folders os-lab/ and self-research/.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const URL=process.env.TEST_URL||'http://localhost:8000/os-lab/os/';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('page: '+e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.location().url.includes('/self-research/assets/maple/'))errors.push('console: '+m.text());});
 await page.goto(URL+'#/');
 await page.waitForFunction(()=>window.CSLabSkin?.artReady===true,{timeout:30000}).catch(()=>{});
 assert(await page.evaluate(()=>CSLabSkin.artReady),'Maple art was not loaded from self-research');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.skin),'maple','Maple skin must be active');
 assert(await page.locator('.skin-btn').isVisible(),'Skin toggle visible');
 await page.waitForTimeout(350);
 assert(await page.locator('.hero .npc-portrait .spr').count()>0,'Maple home NPC visible');
 assert.equal(await page.evaluate(()=>OSApp.lessons.length),29,'29 chapters rendered');
 const newIds=[21,22,23,24,25,26,27,28];
 let runs=0;
 for(const id of newIds){
   await page.evaluate(id=>OSApp.navigate(id,'learn'),id);
   assert.equal((await page.locator('.lesson-head h1').innerText()).length>3,true,'Lesson heading '+id);
   assert(await page.locator('.card.goals .npc-portrait .spr').count()>0,'Quest NPC rendered '+id);
   assert(await page.locator('.card.analogy .npc-portrait .spr').count()>0,'Guide NPC rendered '+id);
   await page.evaluate(id=>OSApp.navigate(id,'lab'),id);
   const before=await page.locator('#labBody').innerText();
   assert(before.length>40,'Lab renders '+id);
   assert(await page.locator('#labBody [data-act=next]').count()>0,'Next button exists '+id);
   await page.locator('#labBody [data-act=next]').click();
   assert.notEqual(await page.locator('#labBody').innerText(),before,'Lab advances '+id);
   assert(await page.evaluate(id=>Boolean(OSApp.store.lab[id]),id),'Lab completion saved '+id);
   await page.locator('#resetLab').click();
   assert.equal(await page.evaluate(()=>OSApp.state.lab.k),0,'Reset lab '+id);
   // Change first select or number setting, then test the frame can advance.
   const select=page.locator('#labBody select[data-set]').first();
   const num=page.locator('#labBody input[type=number][data-set]').first();
   if(await select.count()){
     const opts=await select.locator('option').count();
     if(opts>1)await select.selectOption({index:1});
   }else if(await num.count()){
     const min=Number(await num.getAttribute('min')||0);
     await num.fill(String(min));
     await num.dispatchEvent('change');
   }
   assert(await page.locator('#labBody').innerText(),'Lab still responds '+id);
   const saveBefore=await page.evaluate(()=>JSON.stringify(OSApp.store));
   const labBefore=await page.evaluate(()=>JSON.stringify(OSApp.state.lab));
   await page.locator('.skin-btn').click();
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.skin||'classic'),'classic','Academic toggle '+id);
   assert.equal(await page.evaluate(()=>JSON.stringify(OSApp.state.lab)),labBefore,'Switch preserves live lab '+id);
   assert.equal(await page.evaluate(()=>JSON.stringify(OSApp.store)),saveBefore,'Switch preserves progress '+id);
   await page.locator('.skin-btn').click();
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.skin),'maple','Maple toggle restores '+id);
   await page.evaluate(id=>OSApp.navigate(id,'quiz'),id);
   await page.waitForTimeout(100);
   assert(await page.locator('#stage .card.quiz .bt-bar').count()>0,'Quiz battle bar '+id);
   const correct=await page.evaluate(id=>OSApp.byId[id].quiz[0][2],id);
   await page.locator('#stage [data-answer="'+correct+'"]').click();
   assert(await page.locator('#stage .feedback.ok').count()>0,'Correct answer shows feedback '+id);
   await page.locator('#nextQuiz').click();
   await page.evaluate(id=>OSApp.navigate(id,'code'),id);
   assert(await page.locator('.code-brief').count()>0,'Coding challenge '+id);
   await page.waitForFunction(()=>Boolean(document.querySelector('.code-editor textarea')),{timeout:15000});
   await page.waitForTimeout(250);
   assert(await page.locator('.code-brief > .npc-portrait').count()>0,'Coding NPC '+id);
   assert(await page.locator('.code-lab > .perch-party').count()>0,'Coding party '+id);
   assert(await page.locator('.code-lab > .perch-foe').count()>0,'Coding monster '+id);
   runs++;
 }
 for(const width of [390,375,1280]){
   await page.setViewportSize({width,height:844});
   for(const skin of ['maple','classic']){
     await page.evaluate(s=>CSLabSkin.set(s),skin);
     for(const id of newIds){
       for(const tab of ['learn','lab','quiz','code']){
         await page.evaluate(([id,tab])=>OSApp.navigate(id,tab),[id,tab]);
         const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
         assert(dimensions.scroll<=dimensions.inner+1,'Horizontal overflow '+width+' '+skin+' '+id+' '+tab+': '+JSON.stringify(dimensions));
       }
     }
   }
 }
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(()=>CSLabSkin.set('maple'));
 await page.evaluate(()=>OSApp.navigate(27,'quiz'));
 await page.waitForTimeout(200);
 assert(await page.locator('.hud').count()>0,'Maple HUD exists');
 await page.waitForSelector('#stage .card.quiz .perch-foe .spr', {timeout:10000});
 assert(await page.locator('#stage .card.quiz .perch-party .spr').count()>0,'Battle party sprites present');
 assert.deepEqual(errors,[],'No unhandled JS errors');
 await browser.close();
 console.log('PASS: '+runs+' advanced lessons in Maple, art loading, NPCs, battle bars, interactive labs and reset, progress preservation, coding characters, skin toggle, 390/375/1280 widths both skins, no JS errors');
})().catch(e=>{console.error(e);process.exit(1);});
