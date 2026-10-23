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
 case 4: return String(2*v(0)+v(1));
 case 5: return String(v(0)+1);
 case 6: return String(Math.floor(v(0)/v(1))+' '+v(0)%v(1));
 case 7: {
   const frames=[]; let faults=0;
   for(const page of a){ if(frames.includes(page))continue;faults++;if(frames.length===3)frames.shift();frames.push(page); }
   return String(faults);
 }
 case 8: return String(v(0)+v(1)-v(2));
 case 9: return v(0)>0?'READ':v(1)===1?'EAGAIN':'BLOCK';
 case 10: return (v(0)&({R:4,W:2,X:1})[t[1]])?'ALLOW':'DENY';
 case 11: return String(Math.floor(100*v(0)/v(1)));
 case 12: return String(v(0)*v(1));
 case 13: return String(a.reduce((x,y)=>x+y,0));
 case 15: return ({SAVE:'STORAGE',RUN:'SCHED',LOCK:'SYNC',FSYNC:'SYNCIO',WAIT:'PROCESS',MAP:'MEMORY'})[t[0]];
 case 16: return String(v(0)-v(1))+' '+String(v(1));
 case 17: return String(v(0)-v(1));
 case 18: return String(a.slice(0,3).findIndex(x=>x>=v(3)));
 case 19: return String(Math.abs(v(0)-v(1))+Math.abs(v(1)-v(2))+Math.abs(v(2)-v(3)));
 case 20: return String(v(2)?0:v(1)?Math.min(2,v(0)+1):v(0));
 case 21: return String(({FW:0,BOOT:1,KERNEL:2,ROOT:3,INIT:4})[t[0]]);
 case 22: return v(1)>0?'DATA':v(0)===0?'EOF':'BLOCK';
 case 23: return v(0)?'PROCEED':'WAIT';
 case 24: {
   const priv=t[0]==='PRIVATE',writer=t[1],old=t[2],newVal=t[3];
   return !priv?newVal+' '+newVal:writer==='P'?newVal+' '+old:old+' '+newVal;
 }
 case 25: {
   const bits=a.slice(0,3), hand=[v(3)];
   for(let i=0;i<6;i++){if(bits[hand[0]]===0)return String(hand[0]);bits[hand[0]]=0;hand[0]=(hand[0]+1)%3;}
   throw Error('Clock victim not found');
 }
 case 26: return String(v(2)?v(1):v(0));
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
