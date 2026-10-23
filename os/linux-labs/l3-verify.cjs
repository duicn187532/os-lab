#!/usr/bin/env node
/* OS LAB L3 reproducible command-line reference and semantic validator.
 * Usage: node os/linux-labs/l3-verify.cjs --chapter 17
 *        printf '1\n...\n' | node os/linux-labs/l3-verify.cjs --chapter 17 --stdin
 *        node os/linux-labs/l3-verify.cjs --all
 * Classroom oracle is an algorithm, not a lookup of expected strings.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..');
const issues=[],tasks=[];
const ctx={CSLab:{code:{add:p=>tasks.push(p)}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'os/assets/advanced-code.js'),'utf8'),ctx);
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
const args=process.argv.slice(2),ci=args.indexOf('--chapter'),all=args.includes('--all'),stdin=args.includes('--stdin');
if(!all && (ci<0||!Number.isInteger(Number(args[ci+1]))||Number(args[ci+1])<0||Number(args[ci+1])>28)){
 console.error('Usage: node os/linux-labs/l3-verify.cjs --chapter ID [--stdin] | --all');
 process.exit(2);
}
const chapter=all?null:Number(args[ci+1]),chosen=tasks.filter(t=>all||t.lesson===chapter);
function solve(id,input){
 const lines=input.trim().split(/\r?\n/),count=Number(lines.shift());
 assert.equal(lines.length,count,'Input first line must match number of cases');
 return lines.map(line=>String(answer(id,line.trim().split(/\s+/)))).join('\n')+'\n';
}
try{
 if(stdin){
  if(chosen.length!==1)throw Error('--stdin requires one --chapter');
  process.stdout.write(solve(chosen[0].lesson,fs.readFileSync(0,'utf8')));
 }else{
  let validated=0;
  for(const t of chosen){
   const samples=t.cases;
   console.log('CHAPTER '+t.lesson+' — '+t.title);
   for(const c of samples){
     const result=solve(t.lesson,c.input);
     assert.equal(result,c.output,'Semantic mismatch: '+t.id+' '+c.name);
     validated+=Number(c.input.split('\n')[0]);
     console.log('CASE '+c.name+' ✓');
     if(!all){console.log('INPUT\n'+c.input.trimEnd());console.log('EXPECTED OUTPUT\n'+c.output.trimEnd());console.log('ALGORITHM OUTPUT\n'+result.trimEnd());}
   }
  }
  console.log('PASS: '+chosen.length+' chapter(s), '+validated+' independently calculated input row(s).');
 }
}catch(e){console.error('FAIL: '+e.message);process.exit(1)}
