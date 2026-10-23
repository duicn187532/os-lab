/* Fresh, deterministic cases NOT shipped inside advanced-code.js.
 * Execute actual Python source, compare 1200 random scenarios from independent
 * JS reference models. This extends the finite public/hidden sample groups.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),{spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),original=fs.readFileSync(path.join(repo,'os/linux-labs/python-reference.py'),'utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-python-property-'));
let seed=20261024;
const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
function gen4(){
 const arr=Array.from({length:3},(_,i)=>({i,at:rand(20),bt:rand(8)}));
 let at=0;const ans=[0,0,0];
 for(const job of [...arr].sort((a,b)=>a.at-b.at||a.i-b.i)){
  const start=Math.max(job.at,at);ans[job.i]=start-job.at;at=start+job.bt;
 }
 return [arr.flatMap(x=>[x.at,x.bt]),ans.join(' ')];
}
function gen7(){
 const cap=1+rand(5),refs=Array.from({length:1+rand(20)},()=>rand(8)),q=[],hits=0;
 for(const p of refs){
  if(q.includes(p)){hits++;continue;}
  if(q.length===cap)q.shift();q.push(p);
 }
 return [[cap,refs.length,...refs],String(refs.length-hits)];
}
function gen13(){
 const ints=Array.from({length:4},()=>{const a=rand(30);return [a,a+rand(15)]});
 const joined=ints.slice().sort((a,b)=>a[0]-b[0]);
 let end=-1,total=0;
 for(const [from,to] of joined){
  total+=Math.max(0,to-Math.max(end,from));end=Math.max(end,to);
 }
 return [ints.flat(),String(total)];
}
function gen17(){
 const avail=[rand(5),rand(5)],alloc=Array.from({length:2},()=>[rand(4),rand(4)]);
 const max=alloc.map(v=>v.map(x=>x+rand(6)));
 const work=avail.slice(),complete=new Set(),order=[];
 for(let n=0;n<2;n++){
  let picked=-1;
  for(let i=0;i<2;i++){
   if(complete.has(i))continue;
   if(max[i].every((x,j)=>x-alloc[i][j]<=work[j])){picked=i;break;}
  }
  if(picked<0)break;
  complete.add(picked);order.push('P'+picked);
  for(let j=0;j<2;j++)work[j]+=alloc[picked][j];
 }
 return [[...avail,...alloc[0],...max[0],...alloc[1],...max[1]],
  order.length===2?'SAFE '+order.join(''):'UNSAFE'];
}
function gen19(){
 const start=rand(200),req=Array.from({length:4},()=>rand(200));
 let position=start,fcfs=0;
 for(const next of req){fcfs+=Math.abs(next-position);position=next;}
 const pending=req.slice();position=start;let sstf=0;
 while(pending.length){
  const next=pending.slice().sort((a,b)=>Math.abs(a-position)-Math.abs(b-position)||a-b)[0];
  sstf+=Math.abs(next-position);position=next;pending.splice(pending.indexOf(next),1);
 }
 return [[start,...req],fcfs+' '+sstf];
}
// Clock initial hand must be preserved independent of final hand.
function clockScenario(){
 const bits=[rand(2),rand(2),rand(2)],state=bits.slice(),initial=rand(3);
 let hand=initial;const victims=[];
 for(let i=0;i<3;i++){
  while(state[hand]===1){state[hand]=0;hand=(hand+1)%3;}
  victims.push(hand);state[hand]=1;hand=(hand+1)%3;
 }
 return [[...bits,initial],victims.concat(hand).join(' ')];
}
const problems=[[4,gen4],[7,gen7],[13,gen13],[17,gen17],[19,gen19],[25,clockScenario]];
try{
 for(const [id,make] of problems){
  const samples=Array.from({length:200},make),src=path.join(dir,id+'.py');
  fs.writeFileSync(src,original.replace(/^CHAPTER = -1$/m,'CHAPTER = '+id));
  const input='200\n'+samples.map(s=>s[0].join(' ')).join('\n')+'\n';
  const expected=samples.map(s=>s[1]).join('\n')+'\n';
  const r=spawnSync('python3',[src],{input,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  assert.ifError(r.error);assert.equal(r.status,0,'ch '+id+': '+r.stderr);
  assert.equal(r.stdout,expected,'ch '+id+' mismatch vs independent randomized oracle');
  console.log('PASS chapter '+id+': 200 novel randomized scenarios on actual Python code');
 }
 console.log('PASS: 1200 independent unseen FCFS/FIFO/interval/Banker/SSTF/Clock algorithm inputs');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
