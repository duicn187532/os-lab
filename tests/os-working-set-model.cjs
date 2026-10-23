/* Working set reference-window properties and independent last-seen oracle. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={window:{OS_DATA:{lessons:[{id:25,textbook:{
 algorithm:[],symbols:'',worked:'',invariant:'',counterexample:'',
 l3:{checks:[],steps:[]}}}]}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/working-set-masterclass.js'),'utf8'),
 ctx,{filename:'working-set-masterclass.js',timeout:4000});
const {trace,demand}=ctx.window.OS_WORKING_SET,plain=x=>JSON.parse(JSON.stringify(x));
const P=[1,2,1,3,4,2,5,2,3,6],Q=[7,7,8,9,7,8,10,11,8,7];
assert.deepEqual(plain(trace(P,4)).map(x=>x.size),[1,2,2,3,4,4,4,3,3,4]);
assert.deepEqual(plain(trace(P,4)[7].pages),[4,2,5],'Step 8 latest 4 references distinct pages');
const d=plain(demand([P,Q],4,6));
assert.deepEqual(d[4],{step:5,sizes:[4,3],total:7,frames:6,shortage:1,capacityPressure:true});
let seed=101824;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let checked=0;
for(let rep=0;rep<350;rep++){
 const n=1+rnd(28),refs=Array.from({length:n},()=>rnd(11));
 for(let delta=1;delta<=12;delta++){
  const actual=plain(trace(refs,delta));
  let lastSeen=new Map();
  for(let i=0;i<refs.length;i++){
   lastSeen.set(refs[i],i);
   const expected=[...lastSeen].filter(([,last])=>last>i-delta).map(([page])=>page).sort((a,b)=>a-b);
   assert.deepEqual(actual[i].pages.slice().sort((a,b)=>a-b),expected,
    'Working-set last-seen oracle');
   assert.equal(actual[i].size,expected.length);
   assert(actual[i].size>=1&&actual[i].size<=Math.min(delta,i+1));
   const wider=plain(trace(refs,delta+1))[i];
   assert(wider.size>=actual[i].size,'Larger same-end window cannot have smaller WSS');
   checked++;
  }
 }
}
for(const frames of [1,3,6,9,12]){
 const snapshots=plain(demand([P,Q],4,frames));
 snapshots.forEach((s,i)=>{
  assert.equal(s.total,s.sizes[0]+s.sizes[1]);
  assert.equal(s.capacityPressure,s.total>frames);
  assert.equal(s.shortage,Math.max(0,s.total-frames));
  assert.equal(s.step,i+1);
 });
}
const t=ctx.window.OS_DATA.lessons[0].textbook;
assert.equal(t.extraTables.length,2);
assert.deepEqual(t.extraTables.map(x=>x.rows.length),[10,10]);
assert(t.worked.includes('容量缺口=1'));
assert(t.counterexample.includes('thrashing'));
assert.throws(()=>trace([1,2,3],0),/positive window/);
assert.throws(()=>demand([[1]],1,0),/Invalid demand/);
console.log('PASS Working Set: '+checked+' independent sliding-window and set-inclusion checks; '+(d.length*5)+' multi-process capacity checks');
