/* WAL crash point oracle: committed durable marker is necessary and sufficient
 * for redo in this deliberately restricted educational model.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const l={id:26,textbook:{l3:{checks:[],steps:[]}}};
const ctx={window:{OS_DATA:{lessons:[l]}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/wal-masterclass.js'),'utf8'),
 ctx,{filename:'wal-masterclass.js',timeout:5000});
const run=ctx.window.OS_WAL.simulate,copy=x=>JSON.parse(JSON.stringify(x));
const log=val=>[{type:'LOG',tx:'T',value:val},{type:'FSYNC_LOG'},{type:'COMMIT',tx:'T'}];
const uncommitted=copy(run(10,[...log(20),{type:'CRASH'}]));
const committed=copy(run(10,[...log(20),{type:'FSYNC_COMMIT'},{type:'CRASH'}]));
assert.equal(uncommitted.recoveredIfCrash,10);
assert.equal(committed.recoveredIfCrash,20);
assert.equal(committed.trace.at(-1).durableCommits,1);
assert.throws(()=>run(10,[{type:'LOG',tx:'T',value:20},{type:'COMMIT',tx:'T'}]),/durable/);
assert.throws(()=>run(10,[...log(20),{type:'APPLY',tx:'T'}]),/durable COMMIT/);
let seed=21047;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let tested=0;
for(let i=0;i<600;i++){
 const start=rnd(1000),count=1+rnd(5),ev=[];
 let expected=start;
 for(let j=0;j<count;j++){
  const tx='T'+j,value=rnd(4000),barrier=rnd(2)===0;
  ev.push({type:'LOG',tx,value},{type:'FSYNC_LOG'},{type:'COMMIT',tx});
  if(barrier){ev.push({type:'FSYNC_COMMIT'});expected=value;}
 }
 ev.push({type:'CRASH'});
 const r=copy(run(start,ev));
 assert.equal(r.recoveredIfCrash,expected,
  'Only durable COMMIT markers may be recovered');
 const committedRecords=r.durableLog.filter(x=>x.kind==='COMMIT');
 assert(committedRecords.length<=count);
 assert.equal(r.trace.at(-1).recovered,expected);
 tested++;
}
assert(l.textbook.stateRows.length===5);
assert(l.textbook.worked.includes('Crash Point A'));
assert(l.textbook.counterexample.includes('COMMIT'));
console.log('PASS OS L2 WAL: 600 deterministic randomized crash schedules, commit marker durability, redo order and invalid early APPLY rejection.');
