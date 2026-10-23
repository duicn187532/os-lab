/* Semantic scheduling QA. Recompute all metrics from Gantt (independent of engine's
 * metric path); check FCFS/SJF/SRTF/RR manual worked example and randomized traces.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={window:{OS_DATA:{lessons:[{id:4,textbook:{l3:{checks:[],steps:[]}}}]}}};
const source=fs.readFileSync(path.join(__dirname,'../os/assets/scheduling-masterclass.js'),'utf8');
vm.runInNewContext(source,context,{filename:'scheduling-masterclass.js',timeout:3000});
const model=context.window.OS_SCHEDULER.schedule;
const copy=x=>JSON.parse(JSON.stringify(x));
const J=[{id:'P0',at:0,bt:5},{id:'P1',at:1,bt:3},{id:'P2',at:2,bt:1}];
const outputs={
 FCFS:{gantt:'0-5:P0,5-8:P1,8-9:P2',metrics:[[5,5,0,0],[8,7,4,4],[9,7,6,6]]},
 SJF:{gantt:'0-5:P0,5-6:P2,6-9:P1',metrics:[[5,5,0,0],[9,8,5,5],[6,4,3,3]]},
 SRTF:{gantt:'0-1:P0,1-2:P1,2-3:P2,3-5:P1,5-9:P0',metrics:[[9,9,4,0],[5,4,1,0],[3,1,0,0]]},
 RR:{gantt:'0-2:P0,2-4:P1,4-5:P2,5-7:P0,7-8:P1,8-9:P0',metrics:[[9,9,4,0],[8,7,4,1],[5,3,2,2]]}
};
for(const [policy,expected] of Object.entries(outputs)){
 const result=copy(model(J,policy,2));
 const gantt=result.segments.map(s=>s.start+'-'+s.end+':'+s.job).join(',');
 assert.equal(gantt,expected.gantt,policy+' must match manually derived complete Gantt');
 assert.deepEqual(result.metrics.map(m=>[m.ct,m.tat,m.wt,m.rt]),expected.metrics,
   policy+' must match independent manual metric table');
}
// Deterministic property corpus, including same-arrival, idle, burst ties and RR q boundaries.
let seed=17001;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let checked=0;
for(let k=0;k<200;k++){
 const n=1+rand(5),jobs=Array.from({length:n},(_,i)=>({id:'T'+i,at:rand(9),bt:1+rand(7)}));
 for(const policy of ['FCFS','SJF','SRTF','RR']){
  const m=copy(model(jobs,policy,1+rand(4)));
  const exec=Object.fromEntries(jobs.map(j=>[j.id,0]));
  let prevEnd=0,first={};
  for(const s of m.segments){
    assert.equal(s.start,prevEnd,'No gaps/overlap in Gantt');prevEnd=s.end;
    if(s.job==='IDLE'){
      assert(!jobs.some(j=>j.at<=s.start&&exec[j.id]<j.bt),
        'CPU must not idle with ready jobs');
    }else{
      const job=jobs.find(j=>j.id===s.job);
      assert(job,'Known job id');
      assert(s.start>=job.at,'Never schedule before arrival');
      exec[job.id]+=s.end-s.start;
      first[s.job]??=s.start;
    }
  }
  for(const [i,j] of jobs.entries()){
    const row=m.metrics[i],end=Math.max(...m.segments.filter(s=>s.job===j.id).map(s=>s.end));
    assert.equal(exec[j.id],j.bt,'Must execute exactly the required burst');
    assert.equal(row.ct,end,'Completion must equal Gantt last end');
    assert.equal(row.rt,first[j.id]-j.at,'First-response invariant');
    assert.equal(row.tat,row.ct-j.at,'Turnaround invariant');
    assert.equal(row.wt,row.tat-j.bt,'Waiting invariant');
    assert(row.wt>=0);
  }
  assert.equal(m.elapsed,prevEnd,'Elapsed time must equal final Gantt bound');
  checked++;
 }
}
// Explicitly reject plausible-but-wrong model: applying FCFS to SRTF case.
assert.notEqual(copy(model(J,'FCFS')).segments.map(s=>s.job).join(','),
  outputs.SRTF.gantt,'Mutation: non-preemptive FCFS cannot pass SRTF');
const l=context.window.OS_DATA.lessons[0].textbook;
assert(l.stateRows.length===9,'All nine SRTF ticks must be visible to students');
assert(l.worked.includes('平均等待')&&l.worked.includes('SJF')&&l.worked.includes('RR'));
assert(l.counterexample.includes('Idle')&&l.counterexample.includes('Starvation'));
console.log('PASS OS L2 Scheduling: four manually derived traces, '+checked+
  ' randomized policy traces, Gantt/metric invariants and mutation rejection.');
