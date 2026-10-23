/* Deterministic MLFQ: manual 9-tick trace, priority preemption, boost,
 * arrival safety, queue uniqueness and 1200 randomized property scenarios.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),
path=require('node:path');
const lesson={id:20,textbook:{l3:{checks:[],steps:[]}}};
const ctx={window:{OS_DATA:{lessons:[lesson]}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/mlfq-masterclass.js'),'utf8'),
 ctx,{filename:'mlfq-masterclass.js',timeout:5000});
const model=ctx.window.OS_MLFQ.simulate,copy=x=>JSON.parse(JSON.stringify(x));
const inputs=[{id:'P0',at:0,bt:6},{id:'P1',at:1,bt:2},{id:'P2',at:3,bt:1}];
const v=copy(model(inputs,{boostEvery:0}));
assert.equal(v.trace.map(x=>x.running).join(''),
 'P0P1P0P2P0P1P0P0P0','Nine-tick MLFQ hand trace');
assert.deepEqual(v.metrics.map(x=>[x.ct,x.tat,x.wt,x.rt]),
 [[9,9,3,0],[6,5,3,0],[4,1,0,0]]);
assert.deepEqual(v.trace.map(x=>x.level),[0,0,1,0,1,1,2,2,2]);
assert.equal(v.trace[3].preempted,'P0','Higher-priority arrival preempts unfinished Q1');
const boosted=copy(model(inputs,{boostEvery:4}));
assert(boosted.trace.some(s=>s.boosted),'Must test global boost');
assert(boosted.trace[4].boosted,'At time=4 priority reset must apply');
assert(boosted.trace[4].ready[1].length===0&&boosted.trace[4].ready[2].length===0,
 'Boost must clear lower queues');
let seed=871122;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let checks=0;
for(let k=0;k<400;k++){
 const n=1+rnd(5),jobs=Array.from({length:n},(_,i)=>
  ({id:'J'+i,at:rnd(13),bt:1+rnd(7)}));
 for(const boostEvery of [0,4,11]){
  const result=copy(model(jobs,{boostEvery}));
  const counts=Object.fromEntries(jobs.map(j=>[j.id,0])),first={};
  assert.equal(result.trace.length,result.elapsed,'Full Gantt covers all elapsed ticks');
  for(const step of result.trace){
   const seen=new Set(),ready=step.ready.flat();
   for(const id of ready){
    assert(!seen.has(id),'Queue may never contain duplicate owner');seen.add(id);
    const j=jobs.find(x=>x.id===id);
    assert(j&&j.at<=step.t,'No unarrived process in ready queue');
   }
   if(step.running!=='IDLE'){
    assert(!seen.has(step.running),'A process cannot be both ready and running');
    const job=jobs.find(x=>x.id===step.running);
    assert(job&&job.at<=step.t,'No running before arrival');
    counts[job.id]++;
    if(first[job.id]===undefined)first[job.id]=step.t;
   }else{
    assert.equal(ready.length,0,'Idle CPU cannot have ready jobs');
   }
   if(step.boosted)assert.equal(step.t%boostEvery,0,'Boost only at period boundaries');
  }
  result.metrics.forEach((r,i)=>{
   const j=jobs[i];
   assert.equal(counts[j.id],j.bt,'Burst conservation per process');
   assert.equal(r.tat,r.ct-j.at,'Turnaround identity');
   assert.equal(r.wt,r.ct-j.at-j.bt,'Waiting identity');
   assert.equal(r.rt,first[j.id]-j.at,'Response time identity');
  });
  checks++;
 }
}
assert(v.trace.some(s=>s.preempted)&&boosted.trace.some(s=>s.boosted));
assert(lesson.textbook.stateRows.length>=9);
assert(lesson.textbook.algorithm.length>=6);
assert(lesson.textbook.counterexample.includes('CFS'));
assert.throws(()=>model([{id:'x',at:0,bt:0}]),/Arrival/);
console.log('PASS OS L2 MLFQ: manual 9-tick Gantt and metrics, priority preemption, '+
  checks+' randomized queue ownership / CPU conservation checks and global boost.');
