// Cross-engine OS textbook acceptance: real Chromium, Firefox, WebKit.
const {chromium,firefox,webkit}=require('playwright');
const assert=require('node:assert/strict');
const URL=process.env.TEST_URL||'http://localhost:8000/os-lab/os/';
(async()=>{
 for(const [engine,launcher] of Object.entries({chromium,firefox,webkit})){
  const browser=await launcher.launch({args:engine==='chromium'?['--no-sandbox']:[]});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:engine!=='firefox',hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL+'#/');
  await page.waitForFunction(()=>Boolean(window.OSApp&&window.OS_TEXTBOOK_READY),null,{timeout:30000});
  const ids=await page.evaluate(()=>OSApp.lessons.map(l=>l.id));
  assert.equal(ids.length,29);
  let checks=0;
  for(const skin of ['classic','maple']){
   await page.evaluate(s=>CSLabSkin.set(s),skin);
   for(const width of [375,390,1280]){
    await page.setViewportSize({width,height:844});
    for(const id of ids){
     await page.evaluate(id=>OSApp.navigate(id,'learn'),id);
     const result=await page.evaluate(()=>{
      const doc=document.documentElement, math=[...document.querySelectorAll('#stage .os-textbook math')];
      const tables=[...document.querySelectorAll('#stage .os-state-table')];
      return {scroll:doc.scrollWidth,inner:innerWidth,math:math.length,mathVisible:math.every(m=>m.getBoundingClientRect().width>0&&m.getBoundingClientRect().height>0),tables:tables.length,l3:document.querySelectorAll('#stage .os-textbook .os-io').length,steps:document.querySelectorAll('#stage .os-textbook .os-steps li').length};
     });
     assert(result.scroll<=result.inner+1,engine+' '+skin+' '+width+' ch '+id+' overflow '+JSON.stringify(result));
     assert(result.math===1&&result.mathVisible,engine+' '+skin+' '+width+' ch '+id+' MathML invalid '+JSON.stringify(result));
     assert(result.tables===1&&result.l3>=4&&result.steps>=4,engine+' '+skin+' '+width+' ch '+id+' L2/L3 absent '+JSON.stringify(result));
     checks++;
    }
   }
  }
  await page.goto(URL+'#/formulas');
  const formulas=await page.evaluate(()=>({maths:document.querySelectorAll('.formula-card math').length,visible:[...document.querySelectorAll('.formula-card math')].every(m=>m.getBoundingClientRect().height>0)}));
  assert.equal(formulas.maths,27,engine+' formula mathml count');
  assert(formulas.visible,engine+' invisible formulas');
  await page.evaluate(()=>{CSLabSkin.set('maple');OSApp.navigate(25,'lab')});
  assert(await page.locator('#labBody [data-act]').count()>0,engine+' advanced lab controls');
  assert.deepEqual(errors,[],engine+' uncaught JS exceptions');
  console.log('PASS: '+engine+' '+checks+' L2/L3 desktop/mobile checks; native MathML formulas, both skins, advanced lab and no JS exceptions');
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1);});
