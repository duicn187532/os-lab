/* Independent FCFS arrival-ordered queue metrics, Little finite-sample
 * identity, percentile estimates, and M/M/1 preconditions.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const lesson={id:12,textbook:{l3:{checks:[],steps:[]}}};
const ctx={window:{OS_DATA:{lessons:[lesson]}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/queueing-masterclass.js'),'utf8'),
 ctx,{filename:'queueing-masterclass.js',timeout:5000});
const {server,mm1}=ctx.window.OS_QUEUEING,copy=x=>JSON.parse(JSON.stringify(x));
const v=copy(server([{at:0,service:3},{at:1,service:2},
 {at:2,service:1},{at:3,service:4}]));
assert.deepEqual(v.trace.map(x=>[x.start,x.ct,x.wait,x.latency]),
 [[0,3,0,3],[3,5,2,4],[5,6,3,4],[6,10,3,7]]);
assert.equal(v.meanWait,2);assert.equal(v.meanLatency,4.5);
assert.equal(v.p95,7);assert.equal(v.averageInSystem,1.8);
assert(Math.abs(v.littlesRHS-1.8)<1e-12);
const m=mm1(80,100);assert.equal(m.rho,.8);
assert(Math.abs(m.meanSystemTime-.05)<1e-12);
assert.throws(()=>mm1(100,100),/stable/);
assert.throws(()=>mm1(120,100),/stable/);
let seed=12489;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let checks=0;
for(let k=0;k<700;k++){
 const n=1+rnd(16),input=Array.from({length:n},(_,i)=>({
  id:'J'+i,at:rnd(40),service:1+rnd(8)
 }));
 const result=copy(server(input));
 const rows=result.trace;
 let last=0;
 for(let i=0;i<rows.length;i++){
  const j=rows[i];
  assert(j.start>=j.at&&j.start>=last);
  assert.equal(j.ct,j.start+j.service);
  assert.equal(j.wait,j.start-j.at);
  assert.equal(j.latency,j.ct-j.at);
  last=j.ct;
 }
 const observations=rows.map(r=>r.latency).sort((a,b)=>a-b);
 assert.equal(result.p95,observations[Math.ceil(.95*n)-1]);
 assert.equal(result.p99,observations[Math.ceil(.99*n)-1]);
 assert.equal(result.busy,rows.reduce((s,j)=>s+j.service,0));
 assert.equal(result.horizon,result.busy+result.idle);
 assert(Math.abs(result.averageInSystem-result.littlesRHS)<1e-9);
 checks++;
}
assert(lesson.textbook.stateRows.length===4);
assert(lesson.textbook.worked.includes('Worked Example'));
assert(lesson.textbook.counterexample.includes('p99'));
console.log('PASS OS L2 Queueing: manual four-job Little/p95 trace, 700 randomized FCFS time and area invariants, stable/unstable M/M/1 rejections.');
