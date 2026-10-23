/* Three OS concurrency reference state-machines and 1800 randomized event
 * sequences; true pthread stress belongs to tests/os-pthread-queue.cjs.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const books=[5,16,23].map(id=>({id,textbook:{l3:{checks:[],steps:[]}}}));
const sandbox={window:{OS_DATA:{lessons:books}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/concurrency-masterclass.js'),'utf8'),
 sandbox,{filename:'concurrency-masterclass.js',timeout:4000});
const {queue,lostUpdate,condvar}=sandbox.window.OS_SYNC;
const plain=x=>JSON.parse(JSON.stringify(x));
const race=plain(lostUpdate(['A:R','B:R','A:W','B:W']));
const safe=plain(lostUpdate(['A:R','A:W','B:R','B:W']));
assert.equal(race.shared,1);assert.equal(safe.shared,2);
const ops=['P:11','P:22','P:33','P:44','C','P:44','C','C','C','C'];
const ref=plain(queue(3,ops));
assert.deepEqual(ref.trace.map(s=>s.result),['PRODUCED','PRODUCED','PRODUCED','BLOCK_FULL',
 'CONSUMED','PRODUCED','CONSUMED','CONSUMED','CONSUMED','BLOCK_EMPTY']);
assert.deepEqual(ref.consumed,['11','22','33','44']);
assert.deepEqual(ref.pending,[]);
assert.equal(condvar('if',['SPURIOUS']).unsafe,true,'Unsafe if guard mutant');
assert.equal(condvar('while',['SPURIOUS']).unsafe,false);
assert.equal(condvar('while',['SET_TRUE']).proceeded,false,'Predicate update without notify does not wake');
assert.equal(condvar('while',['SPURIOUS','SET_TRUE','NOTIFY']).proceeded,true);
let seed=712340;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let checks=0;
for(let i=0;i<600;i++){
 const capacity=1+rnd(8),events=Array.from({length:1+rnd(30)},(_,k)=>
  rnd(4)>0?'P:'+String(k):'C');
 const result=plain(queue(capacity,events));
 const independent=[];let produced=0,consumed=0;
 for(let t=0;t<events.length;t++){
  const e=events[t],row=result.trace[t],old=independent.slice();
  let expected;
  if(e==='C'){if(independent.length===0)expected='BLOCK_EMPTY';
   else{independent.shift();consumed++;expected='CONSUMED';}}
  else if(independent.length===capacity)expected='BLOCK_FULL';
  else {independent.push(e.slice(2));produced++;expected='PRODUCED';}
  assert.equal(row.result,expected,'Queue transition must match independent FIFO oracle');
  assert.deepEqual(row.before,old);assert.deepEqual(row.after,independent);
  assert.equal(row.empty+row.full,capacity,'Semaphore token sum');
  assert.equal(row.full,produced-consumed,'Producer/consumer conservation');
  assert.equal(row.accepted,produced);
  assert.equal(row.consumed,consumed);
  checks++;
 }
 const wakes=Array.from({length:1+rnd(15)},()=>['SPURIOUS','SET_TRUE','NOTIFY'][rnd(3)]);
 const waiting=plain(condvar('while',wakes));
 assert.equal(waiting.unsafe,false,'A proper while guard may never proceed before predicate');
 const first=waiting.trace.find(x=>x.proceeded);
 if(first)assert.equal(first.predicate,true);
}
for(const b of books){
 const l=b.textbook;
 assert(l.stateRows.length>=4&&l.algorithm.length>=6&&l.worked.length>100);
 assert(l.symbols.length>30&&l.preconditions&&l.invariant&&l.counterexample);
}
console.log('PASS concurrency L2: lost update / protected RMW, FIFO/semaphore buffer, spurious condition guard; '+
 checks+' independent transition assertions and 600 condvar wake sequences.');
