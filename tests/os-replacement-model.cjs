/* L2 semantic proofs for FIFO/LRU/OPT replacement and Clock Second Chance:
 * manual traces, independent exhaustive optimality, frame conservation,
 * LRU stack inclusion, deterministic randomized Clock transitions.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
      vm=require('node:vm'),path=require('node:path');
const textbook={l3:{checks:[],steps:[]}};
const ctx={window:{OS_DATA:{lessons:[
  {id:7,textbook:JSON.parse(JSON.stringify(textbook))},
  {id:25,textbook:JSON.parse(JSON.stringify(textbook))}
]}}};
const source=fs.readFileSync(path.join(__dirname,'../os/assets/replacement-masterclass.js'),'utf8');
vm.runInNewContext(source,ctx,{filename:'replacement-masterclass.js',timeout:4000});
const {replacement,clock}=ctx.window.OS_REPLACEMENT;
const copy=x=>JSON.parse(JSON.stringify(x));
const refs=[7,0,1,2,0,3,0,4,2,3,0,3,2];
const expected={
 FIFO:{faults:10,victims:[null,null,null,7,null,0,1,2,3,0,4,null,null]},
 LRU:{faults:9,victims:[null,null,null,7,null,1,null,2,3,0,4,null,null]},
 OPT:{faults:7,victims:[null,null,null,7,null,1,null,0,null,null,4,null,null]}
};
for(const [policy,manual] of Object.entries(expected)){
 const result=copy(replacement(refs,3,policy));
 assert.equal(result.faults,manual.faults,policy+' manually counted faults');
 assert.deepEqual(result.trace.map(x=>x.victim),manual.victims,policy+' victim-by-victim proof');
 assert.equal(result.hits+result.faults,refs.length,policy+' count conservation');
 assert(result.trace.every(x=>x.frames.length<=3 &&
   new Set(x.frames).size===x.frames.length),policy+' unique frame invariant');
}
const anomaly=[1,2,3,4,1,2,5,1,2,3,4,5];
assert.equal(replacement(anomaly,3,'FIFO').faults,9);
assert.equal(replacement(anomaly,4,'FIFO').faults,10);
// Independent exhaustive oracle: enumerate every possible victim choice.
// State is unordered resident set; OPT must attain its global minimum.
function minFaults(a,k,i=0,frames=[],memo=new Map()){
 if(i===a.length)return 0;
 const key=i+'|'+frames.slice().sort((x,y)=>x-y).join(',');
 if(memo.has(key))return memo.get(key);
 const p=a[i];let value;
 if(frames.includes(p))value=minFaults(a,k,i+1,frames,memo);
 else if(frames.length<k)value=1+minFaults(a,k,i+1,[...frames,p],memo);
 else value=1+Math.min(...frames.map(v=>
    minFaults(a,k,i+1,frames.filter(x=>x!==v).concat(p),memo)));
 memo.set(key,value);return value;
}
let seed=893221;
const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let checked=0;
for(let i=0;i<280;i++){
 const len=1+rnd(8),a=Array.from({length:len},()=>rnd(5));
 let previousLRU=Infinity;
 for(let cap=1;cap<=4;cap++){
  const f=copy(replacement(a,cap,'FIFO')),
        l=copy(replacement(a,cap,'LRU')),
        o=copy(replacement(a,cap,'OPT'));
  assert.equal(o.faults,minFaults(a,cap),'OPT matches exhaustive offline minimum');
  assert(o.faults<=f.faults && o.faults<=l.faults,'OPT is global lower bound');
  assert(l.faults<=previousLRU,'LRU stack property');
  previousLRU=l.faults;
  for(const r of [f,l,o]){
   assert.equal(r.faults+r.hits,a.length);
   r.trace.forEach((t,k)=>{
    assert.equal(t.faults+t.hits,k+1);
    assert(t.frames.length<=cap);
    assert(new Set(t.frames).size===t.frames.length);
    assert(t.frames.includes(t.reference),'Every referenced page is resident after handling');
    if(t.hit)assert.equal(t.victim,null,'Hit cannot evict a page');
    if(t.victim!==null)assert(!t.frames.includes(t.victim),'Evicted page cannot remain');
   });
  }
  checked++;
 }
}
const clockRun=copy(clock([1,1,0],0,4));
assert.deepEqual(clockRun.victims,[2,0,1,2]);
assert.deepEqual(clockRun.bits,[0,0,1]);
assert.equal(clockRun.hand,0);
assert.deepEqual(clockRun.steps.map(s=>s.cleared),[[0,1],[],[],[2,0,1]]);
let clockCases=0;
for(let k=1;k<=7;k++){
 for(let rep=0;rep<45;rep++){
  const bits=Array.from({length:k},()=>rnd(2)),hand=rnd(k),m=rnd(15);
  const s=copy(clock(bits,hand,m));
  let local=bits.slice(),cursor=hand;
  assert.equal(s.steps.length,m);
  for(let j=0;j<m;j++){
   const before=local.slice(),start=cursor,cleared=[];
   for(let hops=0;hops<=k;hops++){
    if(local[cursor]===0)break;
    local[cursor]=0;cleared.push(cursor);cursor=(cursor+1)%k;
   }
   const victim=cursor;local[victim]=1;cursor=(cursor+1)%k;
   const step=s.steps[j];
   assert.deepEqual(step.before,before);
   assert.equal(step.startHand,start);
   assert.deepEqual(step.cleared,cleared);
   assert.equal(step.victim,victim);
   assert.deepEqual(step.after,local);
   assert.equal(step.nextHand,cursor);
  }
  assert.deepEqual(s.bits,local);
  assert.equal(s.hand,cursor);
  clockCases++;
 }
}
for(const lesson of ctx.window.OS_DATA.lessons){
 const x=lesson.textbook;
 assert(x.stateRows.length>3,'Detailed step-by-step table required');
 assert(x.algorithm.length>=4 && x.worked.includes('Worked Example'));
 assert(x.invariant && x.counterexample && x.symbols && x.preconditions);
}
assert.notEqual(replacement(refs,3,'FIFO').faults,
                replacement(refs,3,'LRU').faults,'A fake LRU=FIFO mutant must fail');
console.log('PASS OS L2 Page Replacement: 13-row manual FIFO/LRU/OPT traces; '+
  checked+' exhaustive/randomized optimality+invariant checks; '+clockCases+
  ' independent Clock transition scenarios and mutation rejection.');
