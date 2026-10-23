/* Independent source-level regression for ALL eight advanced OS challenges.
 * Real JavaScript solutions execute in a separate Node process through the
 * same local student verifier used for C/C++/Python submissions.
 * Do not count reference-oracle checks or TODO starters as accepted solutions.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const runner=path.join(root,'os/linux-labs/student-verify.cjs');
const raw=fs.readFileSync(path.join(root,'os/assets/algorithm-capstones.js'),'utf8');
const marker='const tasks=';
const end=';for(const t of tasks)';
const tasks=JSON.parse(raw.slice(raw.indexOf(marker)+marker.length,raw.lastIndexOf(end)));
assert.equal(tasks.length,8,'Exactly eight challenge IDs required');
const ids=tasks.map(t=>t.id);
assert.equal(new Set(ids).size,8,'Unique challenge IDs');

/* Each function consumes exactly one scenario. The generated student program
 * reads stdin and prints results, without looking at test metadata or oracles.
 * A source mutation must fail the local judge, otherwise this suite is invalid.
 */
const solutions={
 'os.capstone.srtf':function(next){
  const n=Number(next()),p=Array.from({length:n},(_,i)=>({
    i,arrival:Number(next()),burst:Number(next()),remaining:0,start:-1,finish:-1
  }));
  for(const job of p)job.remaining=job.burst;
  let time=0,complete=0;
  while(complete<n){
    const ready=p.filter(x=>x.arrival<=time&&x.remaining>0)
      .sort((a,b)=>a.remaining-b.remaining||a.arrival-b.arrival||a.i-b.i);
    if(!ready.length){time=Math.min(...p.filter(x=>x.remaining>0).map(x=>x.arrival));continue;}
    const job=ready[0];
    if(job.start===-1)job.start=time;
    job.remaining--;time++;
    if(job.remaining===0){job.finish=time;complete++;}
  }
  const wait=p.reduce((s,x)=>s+x.finish-x.arrival-x.burst,0);
  const response=p.reduce((s,x)=>s+x.start-x.arrival,0);
  return wait+' '+response;
 },
 'os.capstone.lru':function(next){
  const cap=Number(next()),n=Number(next()),order=[];
  let faults=0,hits=0;
  for(let k=0;k<n;k++){
    const page=Number(next()),index=order.indexOf(page);
    if(index>=0){hits++;order.splice(index,1);}
    else {faults++;if(order.length===cap)order.shift();}
    order.push(page);
  }
  return faults+' '+hits;
 },
 'os.capstone.banker':function(next){
  const n=Number(next()),avail=[Number(next()),Number(next())],alloc=[],need=[];
  for(let i=0;i<n;i++){
    const a=[Number(next()),Number(next())],max=[Number(next()),Number(next())];
    alloc.push(a);need.push(max.map((m,j)=>m-a[j]));
  }
  const work=[...avail],finished=Array(n).fill(false),order=[];
  for(let round=0;round<n;round++){
    let chosen=-1;
    for(let i=0;i<n;i++)
      if(!finished[i]&&need[i].every((x,j)=>x<=work[j])){chosen=i;break;}
    if(chosen<0)return 'UNSAFE';
    finished[chosen]=true;order.push(chosen);
    work[0]+=alloc[chosen][0];work[1]+=alloc[chosen][1];
  }
  return 'SAFE '+order.join(' ');
 },
 'os.capstone.pagetable':function(next){
  const size=Number(next()),vpn=Number(next()),pfn=Number(next());
  const present=Number(next()),write=Number(next()),exec=Number(next());
  const access=next(),virtualAddress=Number(next());
  if(!present||Math.floor(virtualAddress/size)!==vpn)return 'PAGE_FAULT';
  if((access==='W'&&!write)||(access==='X'&&!exec))return 'PROTECTION';
  return String(pfn*size+virtualAddress%size);
 },
 'os.capstone.clock':function(next){
  const bits=[Number(next()),Number(next()),Number(next())];
  let hand=Number(next());const m=Number(next()),victims=[];
  for(let i=0;i<m;i++){
    while(bits[hand]===1){bits[hand]=0;hand=(hand+1)%3;}
    victims.push(hand);bits[hand]=1;hand=(hand+1)%3;
  }
  return victims.join(',')+' '+bits.join('');
 },
 'os.capstone.journal':function(next){
  let value=Number(next()),commits=0;
  for(let i=0;i<3;i++){
    const proposed=Number(next()),committed=Number(next());
    if(committed===1){value=proposed;commits++;}
  }
  return value+' '+commits;
 },
 'os.capstone.alloc':function(next){
  const blocks=[Number(next()),Number(next()),Number(next())],out=[];
  for(let i=0;i<3;i++){
    const request=Number(next()),slot=blocks.findIndex(size=>size>=request);
    out.push(slot);if(slot>=0)blocks[slot]-=request;
  }
  return out.join(' ')+' | '+blocks.join(' ');
 },
 'os.capstone.epoll':function(next){
  const mode=next(),take=Number(next()),arrivals=[Number(next()),Number(next()),Number(next())];
  let buffer=0,notifications=0;
  for(const arrival of arrivals){
    buffer+=arrival;
    if(mode==='LT'?buffer>0:arrival>0){
      notifications++;buffer-=Math.min(take,buffer);
    }
  }
  return notifications+' '+buffer;
 }
};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-capstone-real-'));
try{
 let accepted=0,groups=0;
 for(const task of tasks){
  const solve=solutions[task.id];
  assert.equal(typeof solve,'function','Reference implementation missing for '+task.id);
  const pathToSource=path.join(dir,task.id.split('.').pop()+'.js');
  const studentSource=[
   "const tokens=readInput().trim().split(/\\s+/);",
   "let offset=0;const next=()=>tokens[offset++];",
   'const solve='+solve.toString()+';',
   'const scenarios=Number(next());',
   'for(let i=0;i<scenarios;i++)console.log(solve(next));'
  ].join('\n')+'\n';
  fs.writeFileSync(pathToSource,studentSource);
  const r=spawnSync('node',[runner,'--challenge',task.id,'--language','javascript','--source',pathToSource],
      {encoding:'utf8',timeout:30000});
  assert.equal(r.status,0,task.id+' real submission must pass: '+r.stdout+' '+r.stderr);
  assert.match(r.stdout,/RESULT 3\/3 groups passed, 0 failed/);
  accepted++;groups+=task.cases.length;
  console.log('AC '+task.id+': '+task.cases.length+' actual public/hidden case groups');
 }
 const bad=path.join(dir,'bad.js');fs.writeFileSync(bad,"console.log('TODO');\n");
 const rejected=spawnSync('node',[runner,'--challenge','os.capstone.srtf',
   '--language','javascript','--source',bad],{encoding:'utf8',timeout:12000});
 assert.equal(rejected.status,1,'Deliberately incorrect capstone must be rejected');
 assert.match(rejected.stdout,/WRONG ANSWER/);
 const unknown=spawnSync('node',[runner,'--challenge','os.capstone.nonexistent',
   '--language','javascript','--source',bad],{encoding:'utf8',timeout:12000});
 assert.equal(unknown.status,1,'Unknown capstone cannot pass');
 console.log('PASS: '+accepted+' independently executable advanced implementations; '+groups+
   ' public/hidden scenario groups; wrong solution and unknown ID rejected');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
