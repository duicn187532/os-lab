/* Independent exhaustive Banker validation, including rejected Request rollback. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const win={OS_DATA:{lessons:[{id:17,textbook:{l3:{checks:[],steps:[]}}}]}};
const src=fs.readFileSync(path.join(__dirname,'../os/assets/banker-masterclass.js'),'utf8');
vm.runInNewContext(src,{window:win},{filename:'banker-masterclass.js',timeout:4000});
const banker=win.OS_BANKER,plain=x=>JSON.parse(JSON.stringify(x));
const initial={available:[3,3,2],
 allocation:[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],
 max:[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]};
const safe=plain(banker.safety(initial));
assert.equal(safe.safe,true);
assert.deepEqual(safe.order,[1,3,0,2,4]);
assert.deepEqual(safe.need,[[7,4,3],[1,2,2],[6,0,0],[0,1,1],[4,3,1]]);
assert.deepEqual(safe.trace.map(x=>x.after),[[5,3,2],[7,4,3],[7,5,3],[10,5,5],[10,5,7]]);
for(const [p,r,status] of [[1,[1,0,2],'GRANTED'],[1,[2,0,0],'ILLEGAL'],[0,[4,0,0],'WAIT'],[4,[3,3,0],'UNSAFE']]){
 const original=plain(initial),result=banker.request(initial,p,r);
 assert.equal(result.status,status);
 assert.deepEqual(plain(initial),original,'Request trial must never mutate caller state');
 if(status==='GRANTED'){
   assert.deepEqual(plain(result.trial.available),[2,3,0]);
   assert.equal(result.result.safe,true);
 }
}
function brute(s){
 const n=s.max.length,m=s.available.length,need=s.max.map((v,i)=>v.map((x,j)=>x-s.allocation[i][j]));
 const search=(work,mask)=>{
   if(mask===(1<<n)-1)return true;
   for(let i=0;i<n;i++){
     if((mask>>i)&1)continue;
     if(need[i].every((v,j)=>v<=work[j])&&
        search(work.map((v,j)=>v+s.allocation[i][j]),mask|(1<<i)))return true;
   }
   return false;
 };
 return search(s.available,0);
}
let seed=20374;
const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
let safetyRuns=0,requestRuns=0;
for(let k=0;k<250;k++){
 const n=1+rand(5),m=1+rand(3),alloc=Array.from({length:n},()=>Array.from({length:m},()=>rand(4)));
 const state={
 available:Array.from({length:m},()=>rand(6)),
 allocation:alloc,
 max:alloc.map(row=>row.map(a=>a+rand(6)))
 };
 const expected=brute(state),actual=plain(banker.safety(state));
 assert.equal(actual.safe,expected,'Engine safety must match independent exhaustive search');
 for(const step of actual.trace){
   assert(step.need.every((v,j)=>v<=step.before[j]),'Work must satisfy Need');
   assert.deepEqual(step.after,step.before.map((v,j)=>v+step.release[j]),'Release conservation');
 }
 safetyRuns++;
 const i=rand(n),request=state.max[i].map((v,j)=>rand(v+2));
 const needs=state.max[i].map((v,j)=>v-state.allocation[i][j]);
 let wanted;
 if(request.some((v,j)=>v>needs[j]))wanted='ILLEGAL';
 else if(request.some((v,j)=>v>state.available[j]))wanted='WAIT';
 else{
   const tentative=plain(state);
   tentative.available=tentative.available.map((v,j)=>v-request[j]);
   tentative.allocation[i]=tentative.allocation[i].map((v,j)=>v+request[j]);
   wanted=brute(tentative)?'GRANTED':'UNSAFE';
 }
 const unchanged=plain(state);
 assert.equal(banker.request(state,i,request).status,wanted,'Request vs independent exhaustive reference');
 assert.deepEqual(plain(state),unchanged);
 requestRuns++;
}
const counter={available:[2,100],allocation:[[0,0]],max:[[3,1]]};
assert.equal(banker.safety(counter).safe,false,
  'Mutation: summing resource counts rather than component-wise comparison must be rejected');
const textbook=win.OS_DATA.lessons[0].textbook;
assert.equal(textbook.stateRows.length,5);
assert(textbook.worked.includes('不安全')&&textbook.worked.includes('合法'));
console.log('PASS OS Banker: five manual safety rounds, four request outcomes, '+
  safetyRuns+' brute-force safety and '+requestRuns+' independent request trials.');
