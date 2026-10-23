/* Contiguous-memory allocator: independent conservation, coalescing and
 * policy selection checks, plus deterministic adversarial split/free cases.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const book={id:18,textbook:{l3:{checks:[],steps:[]}}};
const ctx={window:{OS_DATA:{lessons:[book]}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/allocation-masterclass.js'),'utf8'),
 ctx,{filename:'allocation-masterclass.js',timeout:5000});
const {simulate,choose}=ctx.window.OS_ALLOCATOR,copy=x=>JSON.parse(JSON.stringify(x));
const ops=[
 {type:'ALLOC',id:'A',size:8},{type:'ALLOC',id:'B',size:6},
 {type:'ALLOC',id:'C',size:10},{type:'FREE',id:'B'},
 {type:'ALLOC',id:'D',size:5},{type:'FREE',id:'A'},
 {type:'FREE',id:'C'},{type:'FREE',id:'D'}
];
const ex=copy(simulate(32,ops));
assert.deepEqual(ex.holes,[{start:0,size:32}], 'All allocated memory recovered');
assert.deepEqual(ex.blocks,[]);
assert.equal(ex.trace[3].holes.length,2);
assert.equal(ex.trace[5].holes.length,3);
assert.equal(ex.trace.at(-1).used,0);
const holes=[{start:0,size:10},{start:20,size:16},{start:42,size:6}];
assert.equal(choose(holes,5,'FIRST'),0);
assert.equal(choose(holes,5,'BEST'),2);
assert.equal(choose(holes,5,'WORST'),1);
const failure=copy(simulate(10,[{type:'ALLOC',id:'A',size:7},{type:'ALLOC',id:'B',size:5}]));
assert.equal(failure.trace[1].result,'FAIL_FRAGMENTED_OR_INSUFFICIENT');
assert.deepEqual(failure.trace[1].holes,failure.trace[0].holes);
let seed=112233;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let cases=0;
for(let count=0;count<300;count++){
 const total=1+random(100),ops=[],active=[];let ids=0;
 for(let i=0;i<25;i++){
  if(active.length&&random(3)===0){
   const k=random(active.length);ops.push({type:'FREE',id:active.splice(k,1)[0]});
  }else{
   const id='X'+ids++,size=1+random(30);
   ops.push({type:'ALLOC',id,size});active.push(id);
  }
 }
 // Some allocation attempts may fail: only free ids that actually succeeded.
 const valid=[],live=new Set();
 let holes=[{start:0,size:total}];
 for(const op of ops){
  if(op.type==='FREE'){
   if(live.has(op.id)){valid.push(op);live.delete(op.id);}
  }else{
   valid.push(op);
   const capacity=holes.reduce((s,x)=>s+x.size,0);
   // Simulate using the reference allocator for membership only.
   const snapshot=copy(simulate(total,valid));
   live.clear();snapshot.blocks.forEach(([id])=>live.add(id));
   holes=snapshot.holes;
  }
 }
 for(const policy of ['FIRST','BEST','WORST']){
  // Build a fresh sequence with no attempted frees of rejected IDs.
  const sequence=[],allocation=new Set();
  for(const op of valid){
   if(op.type==='ALLOC'){
    sequence.push(op);
    const result=copy(simulate(total,sequence,policy));
    if(result.blocks.some(([id])=>id===op.id))allocation.add(op.id);
   }else if(allocation.has(op.id)){
    sequence.push(op);allocation.delete(op.id);
   }
  }
  const result=copy(simulate(total,sequence,policy));
  for(const frame of result.trace){
   const free=frame.holes.reduce((s,h)=>s+h.size,0);
   assert.equal(free+frame.used,total);
   assert(frame.holes.every((h,j)=>j===0||frame.holes[j-1].start+frame.holes[j-1].size<h.start));
   if(frame.result==='FAIL_FRAGMENTED_OR_INSUFFICIENT')
    assert.deepEqual(frame.before,frame.holes,'Failure is side-effect free');
   cases++;
  }
 }
}
assert(book.textbook.stateRows.length===8);
assert(book.textbook.worked.includes('Worked Example'));
assert(book.textbook.counterexample.includes('雙重配置'));
console.log('PASS OS L2 Allocation: split/coalesce full trace, 3-fit manual tie cases, '+
 cases+' randomized allocation events and address invariants.');
