/* Independent x86-64 LA48 4-level paging and COW property tests.
 * Native page table reading is NOT claimed by this pure model.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),
 path=require('node:path');
const lessons=[{id:6,textbook:{l3:{checks:[]}}},{id:24,textbook:{l3:{checks:[]}}}];
const c={window:{OS_DATA:{lessons}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/paging-masterclass.js'),'utf8'),
 c,{filename:'paging-masterclass.js',timeout:4000});
const {walk,indexes,cow}=c.window.OS_PAGING,plain=x=>JSON.parse(JSON.stringify(x));
const entry=(pfn=7)=>Array.from({length:4},(_,i)=>
 ({present:true,write:true,execute:i!==3,pfn:i===3?pfn:undefined}));
const va=0x12345678,expected=[0,0,145,325,1656];
assert.deepEqual(plain(indexes(va)),expected,'manually decomposed 0x12345678');
const good=plain(walk(va,entry(),'R'));
assert.equal(good.status,'OK');assert.equal(good.pa,7*4096+1656);
assert.equal(walk(va,entry(),'X').status,'PROTECTION');
const missing=entry();missing[2].present=false;
assert.equal(walk(va,missing,'R').where,'PD');
assert.equal(walk(va,missing,'R').status,'PAGE_FAULT');
let seed=90701;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let checked=0;
for(let i=0;i<850;i++){
 const address=random(2**25)*4096+random(4096); // always within canonical lower half
 const ix=plain(indexes(address));
 const reconstructed=ix[0]*2**39+ix[1]*2**30+ix[2]*2**21+ix[3]*4096+ix[4];
 assert.equal(reconstructed,address,'Four page indexes + offset reconstruct virtual address');
 const entries=entry(1+random(1024));entries.forEach(p=>{
  p.present=random(5)!==0;p.write=random(4)!==0;p.execute=random(4)!==0;});
 for(const access of ['R','W','X']){
  const result=plain(walk(address,entries,access));
  let outcome='OK';
  for(let k=0;k<4;k++){
   if(!entries[k].present){outcome='PAGE_FAULT';break;}
   if(access==='W'&&!entries[k].write||access==='X'&&!entries[k].execute){
     outcome='PROTECTION';break;
   }
  }
  assert.equal(result.status,outcome,'First failing paging entry is authoritative');
  if(outcome==='OK')assert.equal(result.pa,entries[3].pfn*4096+address%4096);
  if(outcome!=='OK')assert.equal(result.pa,undefined,'Faulted access has no physical address');
  checked++;
 }
}
const scenarios=[
 ['PRIVATE','C',[5,9,1]],['PRIVATE','P',[9,5,1]],
 ['SHARED','C',[9,9,0]],['SHARED','P',[9,9,0]]
];
for(const [mode,writer,expectedValues] of scenarios){
 const s=plain(cow(mode,writer,5,9));
 assert.deepEqual([s.result.parent,s.result.child,s.result.cowFault],expectedValues);
}
assert.throws(()=>indexes(2**47),/canonical/);
assert.throws(()=>walk(0,[...entry().slice(0,3)],'R'),/Four levels/);
for(const l of lessons){
 assert.equal(l.textbook.stateRows.length,4);
 assert(l.textbook.algorithm.length>=4&&l.textbook.worked.includes('fork')||
    l.textbook.worked.includes('例題'));
 assert(l.textbook.counterexample&&l.textbook.invariant&&l.textbook.symbols);
}
console.log('PASS OS L2 MMU/COW: 0x12345678 manual page walk; '+
 checked+' randomized permission/index invariants; four visibility modes and fault mutants rejected.');
