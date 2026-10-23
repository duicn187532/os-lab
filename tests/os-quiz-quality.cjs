/* Entire 174-quiz static data / answer identity / plausibility audit.
 * Human psychometric discrimination needs actual student responses and
 * MUST NOT be inferred from these structural checks alone.
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),
 assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const load=(file,ctx)=>vm.runInNewContext(fs.readFileSync(path.join(root,'os/assets',file),'utf8'),ctx,{filename:file,timeout:5000});
const ctx={window:{}};
load('content.js',ctx);
const original=JSON.parse(JSON.stringify(ctx.window.OS_DATA));
load('depth.js',ctx);load('advanced-content.js',ctx);
const baseline=JSON.parse(JSON.stringify(ctx.window.OS_DATA));
load('assessment-rigor.js',ctx);load('assessment-quality.js',ctx);
const lesson=JSON.parse(JSON.stringify(ctx.window.OS_DATA)),seen=new Set();
assert.equal(lesson.lessons.length,29);
assert.equal(lesson.lessons.reduce((n,l)=>n+l.quiz.length,0),174);
assert.equal(ctx.window.OS_ASSESSMENT_QUALITY.revised,58);
assert.equal(ctx.window.OS_ASSESSMENT_QUALITY.legacyRevised,32);
assert.equal(ctx.window.OS_ASSESSMENT_QUALITY.baseRevised,48);
const forbidden=/只影響程式碼顏色|只改變字型|瀏覽器 Cookie|RAM 壞掉|只在 root 下可用|只有在 C 語言中|一定重開機|硬碟變成藍色/;
let structural=0,binary=0;
for(const l of lesson.lessons){
 assert.equal(l.quiz.length,6);
 const reference=baseline.lessons.find(x=>x.id===l.id);
 assert(reference);
 for(let i=0;i<l.quiz.length;i++){
  const q=l.quiz[i],key=l.id+':'+i;
  assert(!seen.has(key));seen.add(key);
  assert(Array.isArray(q)&&q.length===5);
  assert.equal(q[0],(i<4?reference.quiz[i][0]:q[0]),'Legacy question identity '+key);
  assert(typeof q[0]==='string'&&q[0].length>8,'Nonempty prompt '+key);
  assert(Array.isArray(q[1])&&q[1].length>=2&&q[1].length<=4);
  assert(Number.isInteger(q[2])&&q[2]>=0&&q[2]<q[1].length);
  assert.equal(new Set(q[1].map(s=>s.trim())).size,q[1].length,'Unique answer/distractors '+key);
  assert(q[1].every(s=>typeof s==='string'&&s.trim().length>=1));
  assert(q[3]?.length>=4&&q[4]?.length>=12,'Must explain why answer is right '+key);
  assert(q[1].every(s=>!forbidden.test(s)),key+' implausible choice');
  if(i<4){
   const old=reference.quiz[i];
   assert.equal(q[2],old[2],'Stable first-four answer index '+key);
   assert.equal(q[1][q[2]],old[1][old[2]],'Correct answer wording preserved '+key);
   assert.equal(q[1].length,old[1].length,'Legacy choice count preserved '+key);
  }else{
   // The original 58 extra questions have their entire new correct option
   // present verbatim inside the rationale.
   assert(q[4].includes(q[1][q[2]]),'Answer/rationale mismatch '+key);
  }
  if(q[1].length===2)binary++;
  structural++;
 }
}
assert.equal(structural,174);assert.equal(binary,15);
assert.equal(original.lessons.length,21);
console.log('PASS quiz audit: 174 unique identity-stable questions, 138 revised distractor sets, 15 true/false-like items, zero blocked nonsense.');
console.log('NOT VERIFIED: empirical item discrimination, student pilot responses, teacher independent correctness sign-off.');
