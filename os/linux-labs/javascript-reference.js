/* OS LAB instructor JavaScript ES2022 answer reference for 29 chapter tasks.
 * Generate single-chapter source by replacing "const CHAPTER=-1;".
 * The browser Judge supplies readInput(), and the native student grader
 * provides the same helper. No repo oracle is imported.
 */
'use strict';
const CHAPTER=-1;
function solve(t){
 const a=t.map(Number);
 if(CHAPTER===0)return String(a[0]+a[1]);
 if(CHAPTER===1)return a[0]<0?'ERROR':a[0]===0?'ZERO':'SUCCESS';
 if(CHAPTER===2||CHAPTER===14)return String(2**a[0]);
 if(CHAPTER===3)return ['STACK','PC','REG'].includes(t[0])?'PRIVATE':'SHARED';
 if(CHAPTER===4){
  const jobs=[0,1,2].map(i=>({i,at:a[2*i],bt:a[2*i+1]}))
   .sort((x,y)=>x.at-y.at||x.i-y.i),wait=[0,0,0];
  let now=0;
  for(const j of jobs){const start=Math.max(now,j.at);wait[j.i]=start-j.at;now=start+j.bt;}
  return wait.join(' ');
 }
 if(CHAPTER===5)return String(a[0]+1);
 if(CHAPTER===6)return Math.floor(a[0]/a[1])+' '+a[0]%a[1];
 if(CHAPTER===7){
  const cap=a[0],frames=[];let miss=0;
  for(const p of a.slice(2,2+a[1])){
   if(frames.includes(p))continue;
   miss++;if(frames.length===cap)frames.shift();frames.push(p);
  }
  return String(miss);
 }
 if(CHAPTER===8)return String(a[0]+a[1]-a[2]);
 if(CHAPTER===9)return a[0]>0?'READ':a[1]===1?'EAGAIN':'BLOCK';
 if(CHAPTER===10){
  const index=t[3]==='O'?0:t[3]==='G'?1:2;
  const mask=({R:4,W:2,X:1})[t[4]];
  return (a[index]&mask)?'ALLOW':'DENY';
 }
 if(CHAPTER===11)return String(Math.floor(100*a[0]/a[1]));
 if(CHAPTER===12)return String(a[0]*a[1]);
 if(CHAPTER===13){
  const intervals=[];for(let i=0;i<8;i+=2)intervals.push([a[i],a[i+1]]);
  intervals.sort((x,y)=>x[0]-y[0]);
  let total=0,end=-1;
  for(const [from,to] of intervals){
   total+=Math.max(0,to-Math.max(from,end));end=Math.max(end,to);
  }
  return String(total);
 }
 if(CHAPTER===15)return ({
  SAVE:'STORAGE',RUN:'SCHED',LOCK:'SYNC',FSYNC:'SYNCIO',WAIT:'PROCESS',MAP:'MEMORY'})[t[0]];
 if(CHAPTER===16)return (a[0]-a[1])+' '+a[1];
 if(CHAPTER===17){
  const work=a.slice(0,2),allocation=[[a[2],a[3]],[a[6],a[7]]],
    maximum=[[a[4],a[5]],[a[8],a[9]]],finished=[false,false],order=[];
  for(let round=0;round<2;round++){
   let selected=-1;
   for(let i=0;i<2;i++){
    if(finished[i])continue;
    if(maximum[i].every((v,j)=>v-allocation[i][j]<=work[j])){selected=i;break;}
   }
   if(selected<0)return 'UNSAFE';
   finished[selected]=true;order.push('P'+selected);
   for(let j=0;j<2;j++)work[j]+=allocation[selected][j];
  }
  return 'SAFE '+order.join('');
 }
 if(CHAPTER===18){
  const blocks=a.slice(0,3),selected=[];
  for(const req of a.slice(3)){
   const i=blocks.findIndex(v=>v>=req);
   selected.push(i);if(i>=0)blocks[i]-=req;
  }
  return selected.join(' ');
 }
 if(CHAPTER===19){
  const request=a.slice(1),start=a[0];
  let current=start,fcfs=0;
  for(const target of request){fcfs+=Math.abs(target-current);current=target;}
  const pending=request.slice();current=start;let sstf=0;
  while(pending.length){
   pending.sort((x,y)=>Math.abs(x-current)-Math.abs(y-current)||x-y);
   const next=pending.shift();sstf+=Math.abs(next-current);current=next;
  }
  return fcfs+' '+sstf;
 }
 if(CHAPTER===20)return String(a[2]?0:a[1]?Math.min(2,a[0]+1):a[0]);
 if(CHAPTER===21)return String(({FW:0,BOOT:1,KERNEL:2,ROOT:3,INIT:4})[t[0]]);
 if(CHAPTER===22)return a[1]>0?'DATA':a[0]===0?'EOF':'BLOCK';
 if(CHAPTER===23){const pos=a.indexOf(1);return pos<0?'WAIT':String(pos);}
 if(CHAPTER===24){
  const old=t[2],value=t[3];
  return t[0]!=='PRIVATE'?value+' '+value:t[1]==='P'?
   value+' '+old:old+' '+value;
 }
 if(CHAPTER===25){
  const r=a.slice(0,3),selected=[];let hand=a[3];
  for(let i=0;i<3;i++){
   while(r[hand]===1){r[hand]=0;hand=(hand+1)%3;}
   selected.push(hand);r[hand]=1;hand=(hand+1)%3;
  }
  return selected.concat(hand).join(' ');
 }
 if(CHAPTER===26){
  let state=0;
  for(const e of t.slice(2)){
   if(e==='X')break;
   if(e==='L'&&state===0)state=1;
   else if(e==='C'&&state===1)state=2;
   else if(e==='A'&&state===2)state=3;
   else return 'INVALID';
  }
  return String(state>=2?a[1]:a[0]);
 }
 if(CHAPTER===27)return (t[0]==='LT'?a[1]>0:a[2]===1)?'NOTIFY':'NO';
 if(CHAPTER===28)return ({
  MEMORY:'PROC',CPU_QUOTA:'CGROUP',SYSCALL:'STRACE',IO_WAIT:'IOSTAT',CPU_HOT:'PERF'})[t[0]];
 throw Error('Unexpected chapter '+CHAPTER);
}
const lines=readInput().trim().split(/\r?\n/),count=Number(lines[0]);
if(!Number.isInteger(count)||lines.length!==count+1)throw Error('Bad input row count');
for(let i=1;i<=count;i++)console.log(solve(lines[i].trim().split(/\s+/)));
