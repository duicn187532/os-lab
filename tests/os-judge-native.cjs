/* OS LAB native toolchain smoke + independently computed Judge test corpus.
 * Runs all 29 starters through C11, C++17, Python 3 and JavaScript (Node).
 * Also checks every public/hidden expected output using a separate compact model.
 * No external packages. Not a substitute for browser WASM runner tests.
 */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),data=[];
const ctx={CSLab:{code:{add:p=>data.push(p)}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'os/assets/advanced-code.js'),'utf8'),ctx,{filename:'advanced-code.js'});
assert.equal(data.length,29,'One challenge per OS chapter');

function answer(id,t) {
 const a=t.map(Number),v=i=>a[i];
 switch(id) {
 case 0: return String(v(0)+v(1));
 case 1: return v(0)<0?'ERROR':v(0)===0?'ZERO':'SUCCESS';
 case 2: case 14: return String(2**v(0));
 case 3: return ['STACK','PC','REG'].includes(t[0])?'PRIVATE':'SHARED';
 case 4: {const jobs=[0,1,2].map(i=>({i,at:v(i*2),bt:v(i*2+1)})).sort((x,y)=>x.at-y.at||x.i-y.i);let time=0,out=[];for(const j of jobs){const start=Math.max(time,j.at);out[j.i]=start-j.at;time=start+j.bt;}return out.join(' ');}
 
 case 5: return String(v(0)+1);
 case 6: return String(Math.floor(v(0)/v(1))+' '+v(0)%v(1));
 case 7: {const capacity=v(0),refs=a.slice(2,2+v(1)),frames=[];let misses=0;for(const page of refs){if(frames.includes(page))continue;misses++;if(frames.length===capacity)frames.shift();frames.push(page)}return String(misses);}
 
 case 8: return String(v(0)+v(1)-v(2));
 case 9: return v(0)>0?'READ':v(1)===1?'EAGAIN':'BLOCK';
 case 10: { const digit=v(t[3]==='O'?0:t[3]==='G'?1:2),mask=({R:4,W:2,X:1})[t[4]];return digit&mask?'ALLOW':'DENY'; }
 
 case 11: return String(Math.floor(100*v(0)/v(1)));
 case 12: return String(v(0)*v(1));
 case 13: {const spans=[];for(let i=0;i<8;i+=2)spans.push([v(i),v(i+1)]);spans.sort((a,b)=>a[0]-b[0]);let total=0,end=-1;for(const [from,to] of spans){total+=Math.max(0,to-Math.max(end,from));end=Math.max(end,to)}return String(total);}
 
 case 15: return ({SAVE:'STORAGE',RUN:'SCHED',LOCK:'SYNC',FSYNC:'SYNCIO',WAIT:'PROCESS',MAP:'MEMORY'})[t[0]];
 case 16: return String(v(0)-v(1))+' '+String(v(1));
 case 17: {let work=[v(0),v(1)],alloc=[[v(2),v(3)],[v(6),v(7)]],max=[[v(4),v(5)],[v(8),v(9)]],done=[false,false],order=[];for(let round=0;round<2;round++){let chosen=-1;for(let i=0;i<2;i++){if(!done[i]&&max[i].every((m,j)=>m-alloc[i][j]<=work[j])){chosen=i;break}}if(chosen<0)return 'UNSAFE';done[chosen]=true;order.push('P'+chosen);work=work.map((w,j)=>w+alloc[chosen][j]);}return 'SAFE '+order.join('');}
 
 case 18: {const blocks=a.slice(0,3),chosen=[];for(const req of a.slice(3)){const i=blocks.findIndex(x=>x>=req);chosen.push(i);if(i>=0)blocks[i]-=req;}return chosen.join(' ');}
 
 case 19: {let h=v(0),fcfs=0;for(let i=1;i<5;i++){fcfs+=Math.abs(v(i)-h);h=v(i)}let pending=a.slice(1),head=v(0),sstf=0;while(pending.length){pending.sort((x,y)=>Math.abs(x-head)-Math.abs(y-head)||x-y);const next=pending.shift();sstf+=Math.abs(next-head);head=next;}return fcfs+' '+sstf;}
 
 case 20: return String(v(2)?0:v(1)?Math.min(2,v(0)+1):v(0));
 case 21: return String(({FW:0,BOOT:1,KERNEL:2,ROOT:3,INIT:4})[t[0]]);
 case 22: return v(1)>0?'DATA':v(0)===0?'EOF':'BLOCK';
 case 23: {const first=a.indexOf(1);return first<0?'WAIT':String(first);}
 
 case 24: {
   const priv=t[0]==='PRIVATE',writer=t[1],old=t[2],newVal=t[3];
   return !priv?newVal+' '+newVal:writer==='P'?newVal+' '+old:old+' '+newVal;
 }
 case 25: {const bits=a.slice(0,3),picked=[];let hand=v(3);for(let miss=0;miss<3;miss++){let scans=0;while(bits[hand]===1){bits[hand]=0;hand=(hand+1)%3;if(++scans>6)throw Error('Clock loop');}picked.push(hand);bits[hand]=1;hand=(hand+1)%3;}return picked.concat(hand).join(' ');}
 
 case 26: {let state=0;for(const e of t.slice(2)){if(e==='X')break;if(e==='L'&&state===0){state=1;continue}if(e==='C'&&state===1){state=2;continue}if(e==='A'&&state===2){state=3;continue}return 'INVALID';}return String(state>=2?v(1):v(0));}
 
 case 27: return (t[0]==='LT'?v(1)>0:v(2)===1)?'NOTIFY':'NO';
 case 28: return ({MEMORY:'PROC',CPU_QUOTA:'CGROUP',SYSCALL:'STRACE',IO_WAIT:'IOSTAT',CPU_HOT:'PERF'})[t[0]];
 default: throw Error('No oracle for chapter '+id);
 }
}

let oracleCases=0;
for(const p of data){
 const id=p.lesson;
 for(const c of p.cases) {
   const input=c.input.trim().split(/\r?\n/),q=Number(input[0]);
   const actual=input.slice(1).map(line=>answer(id,line.trim().split(/\s+/))).join('\n')+'\n';
   assert.equal(input.length-1,q,'Input row count '+p.id+' '+c.name);
   assert.equal(actual,c.output,'Reference mismatch '+p.id+' '+c.name);
   oracleCases+=q;
 }
}

function run(cmd,args,input,where){
 const r=spawnSync(cmd,args,{input,encoding:'utf8',timeout:12000,maxBuffer:1024*1024});
 assert.ifError(r.error);
 assert.equal(r.status,0,where+': '+r.stderr);
 return r.stdout;
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-lab-code-smoke-'));
try{
 let count=0;
 for(const p of data) {
  const sample=p.cases.find(x=>x.visible);
  const q=Number(sample.input.split(/\r?\n/)[0]);
  const placeholder=Array(q).fill('TODO').join('\n')+'\n';
  for(const lang of ['c','cpp','python','javascript']){
    const src=p.starter[lang];
    let stdout;
    if(lang==='python')stdout=run('python3',['-c',src],sample.input,p.id+'/python');
    else if(lang==='javascript')stdout=run('node',['-e',"const readInput=()=>require('node:fs').readFileSync(0,'utf8');\n"+src],sample.input,p.id+'/js');
    else {
      const cfile=path.join(dir,'starter.'+(lang==='c'?'c':'cpp'));
      const bin=path.join(dir,'starter-'+lang);
      fs.writeFileSync(cfile,src,'utf8');
      run(lang==='c'?'cc':'c++',[lang==='c'?'-std=c11':'-std=c++17','-Wall','-Wextra','-Werror',cfile,'-o',bin],undefined,p.id+'/'+lang+' compile');
      stdout=run(bin,[],sample.input,p.id+'/'+lang+' exec');
    }
    assert.equal(stdout,placeholder,p.id+'/'+lang+': starter should emit TODO for all '+q+' queries');
    assert.notEqual(stdout,sample.output,p.id+'/'+lang+' starter unexpectedly accepted');
    count++;
  }
 }
 console.log('PASS: '+data.length+' OS problems; '+oracleCases+' public/hidden rows match an independent reference; '+count+' real C/C++/Python/JS starter compilation/executions (all intentionally WA).');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
