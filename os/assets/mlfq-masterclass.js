/* Deterministic single-CPU MLFQ for chapter 20, based on a specified
 * educational policy (NOT Linux CFS/EEVDF). Three queues (high to low),
 * time slices [1,2,4]; new jobs enter highest queue, exhausted slice
 * demotes, higher queue arrival preempts while preserving unused slice;
 * periodic global boost starts every runnable job at highest priority.
 */
'use strict';
(function(global){
function simulate(input,opts={}){
 const quanta=opts.quanta||[1,2,4],boostEvery=opts.boostEvery??12;
 if(!Array.isArray(quanta)||quanta.length!==3||
   quanta.some(q=>!Number.isInteger(q)||q<1||q>100)||
   !Number.isInteger(boostEvery)||boostEvery<0||boostEvery>100000)
   throw Error('Expected three positive quanta and nonnegative boost interval');
 if(!Array.isArray(input)||input.length<1||input.length>32)throw Error('Expected 1..32 jobs');
 const jobs=input.map((x,i)=>{
  if(!Number.isInteger(x.at)||x.at<0||!Number.isInteger(x.bt)||x.bt<1||x.bt>5000)
    throw Error('Arrival must be nonnegative, burst in 1..5000');
  return {id:String(x.id??('P'+i)),i,at:x.at,bt:x.bt,remaining:x.bt,
    level:0,used:0,first:null,ct:null};
 });
 if(new Set(jobs.map(j=>j.id)).size!==jobs.length)throw Error('IDs must be unique');
 const horizon=Math.max(...jobs.map(j=>j.at))+jobs.reduce((s,j)=>s+j.bt,0);
 if(horizon>100000)throw Error('Trace too large');
 let t=0,completed=0,running=null;
 const ready=[[],[],[]],trace=[];
 while(completed<jobs.length){
  const arrivals=jobs.filter(j=>j.at===t).sort((a,b)=>a.i-b.i);
  arrivals.forEach(j=>ready[0].push(j));
  let boosted=false,preempted=null;
  if(boostEvery>0&&t>0&&t%boostEvery===0){
   const waiting=ready.flat();
   if(running)waiting.push(running);
   ready.forEach(q=>q.length=0);
   // Fixed tie rule: boost order is original arrival, then original index.
   waiting.sort((a,b)=>a.at-b.at||a.i-b.i).forEach(j=>{
    j.level=0;j.used=0;ready[0].push(j);
   });
   running=null;boosted=true;
  }
  if(running && ready.slice(0,running.level).some(q=>q.length)){
   preempted=running.id;
   ready[running.level].unshift(running);running=null;
  }
  if(!running){
   const level=ready.findIndex(q=>q.length>0);
   if(level>=0)running=ready[level].shift();
  }
  const label=running?running.id:'IDLE';
  const level=running?running.level:null;
  const snapshot=ready.map(q=>q.map(j=>j.id));
  if(running){
   if(running.first===null)running.first=t;
   running.remaining--;running.used++;
  }
  const ended=running&&running.remaining===0?running:null;
  trace.push({t,running:label,level,arrivals:arrivals.map(x=>x.id),
   boosted,preempted,ready:snapshot,
   remaining:jobs.map(j=>j.remaining),finish:ended?ended.id:null});
  t++;
  if(ended){ended.ct=t;completed++;running=null;}
  else if(running&&running.used===quanta[running.level]){
   running.used=0;
   running.level=Math.min(2,running.level+1);
   ready[running.level].push(running);
   running=null;
  }
  if(t>horizon)throw Error('MLFQ failed to terminate');
 }
 const metrics=jobs.map(j=>({id:j.id,at:j.at,bt:j.bt,ct:j.ct,
   tat:j.ct-j.at,wt:j.ct-j.at-j.bt,rt:j.first-j.at}));
 if(metrics.some(m=>m.wt<0||m.rt<0))throw Error('MLFQ metrics invalid');
 const executed=Object.fromEntries(jobs.map(j=>[j.id,0]));
 for(const step of trace)if(step.running!=='IDLE')executed[step.running]++;
 if(jobs.some(j=>executed[j.id]!==j.bt))throw Error('CPU time conservation failed');
 return {quanta:quanta.slice(),boostEvery,trace,metrics,elapsed:t};
}
global.OS_MLFQ={simulate};
const lesson=global.OS_DATA?.lessons.find(l=>l.id===20)?.textbook;
if(!lesson)return;
const jobs=[{id:'P0',at:0,bt:6},{id:'P1',at:1,bt:2},{id:'P2',at:3,bt:1}];
const result=simulate(jobs,{boostEvery:0});
const gantt=result.trace.map(s=>s.running).join(' → ');
lesson.preconditions='教學 MLFQ（不是 Linux CFS/EEVDF）：單 CPU、三級 queue Q0/Q1/Q2，quantum=(1,2,4) ticks。所有工作有整數 AT/BT、無 I/O 或 context-switch cost；新工作進 Q0；用完時間片而未完成才降一級（Q2 保持 Q2）；高優先新工作可搶先低級並保留它尚未用完的原級時間片；同級 FIFO；可每 B ticks 全體 boost 回 Q0。';
lesson.symbols='Q_i：第 i 級 ready queue，i 越小優先權越高；q_i：該級 quantum；R_j：工作 j 剩餘 CPU burst；used_j：在目前級別累計已使用 quantum；B：boost 週期，0 代表停用；CT/TAT/WT/RT 同 CPU Scheduling 章，單位 ticks。';
lesson.algorithm=[
 '每個 tick t 開始，將恰好在 t 到達的工作依原索引放入 Q0。工作保存 remaining、level、used、first、CT。',
 '若 t 是非零的 B 的倍數，將所有 ready 和 running 的尚未完成工作依 AT 與索引放入 Q0，level=0、used=0。此步是教育模型的 deterministic boost 規則。',
 '若當前 running 比任何已非空 queue 的優先級更低，將它放回自己 queue 前端（未耗完的時片保留），並選擇最高非空 queue 的首個工作。',
 '執行一 tick，R-=1，used+=1。R=0 即 CT=t+1 並離開系統；否則若 used 等於當級 quantum，清零 used、降一級並排至新 queue 隊尾。',
 '全無 ready/running 時記錄 IDLE，直到下一筆工作到達；最後用 CT 算出 TAT/WT/RT，並檢查 CPU time 與 burst 總和守恆。',
 '額外反例：持續短工作到達可能造成低優先工作飢餓；啟用 boost 可改善但會造成排程與負載成本，應比較 B=0 與 B=4 的完整 trace。'
];
lesson.stateHeaders=['tick','新抵達','Q0 / Q1 / Q2（不含 running）','Running / Level','執行後剩餘 R0/R1/R2'];
lesson.stateRows=result.trace.map(s=>[
 String(s.t),s.arrivals.join(',')||'—',s.ready.map(q=>'['+q.join(',')+']').join(' / '),
 s.running+' / '+(s.level===null?'IDLE':s.level),s.remaining.join(' / ')
]);
lesson.worked=[
 'Worked Example：P0(AT=0,BT=6)，P1(AT=1,BT=2)，P2(AT=3,BT=1)；Q0/Q1/Q2 量子 1/2/4，boost B=0。',
 't=0 P0 在 Q0 跑 1 tick、R0=5，時間片結束下降 Q1；t=1 P1 剛到達 Q0，先跑 1 tick、R1=1 並降 Q1。',
 't=2 P0 進入 Q1 開始 2-tick 量子；t=3 P2 抵達 Q0，使 P0 被搶先並保留 Q1 的 used=1；P2 在 t=3 跑完 CT2=4。',
 't=4 P0 繼續之前剩下的 Q1 時片，結束後降 Q2；t=5 P1 在 Q1 跑完 CT1=6；t=6..8 P0 在 Q2 跑完 CT0=9。',
 '逐時執行序列：'+gantt+'。',
 '最終 P0 CT=9,TAT=9,WT=3,RT=0；P1 CT=6,TAT=5,WT=3,RT=0；P2 CT=4,TAT=1,WT=0,RT=0。',
 '檢查 P0 執行 6 ticks、P1 執行 2 ticks、P2 執行 1 tick，共 9 ticks；每個 t 至多一個 running，未到達者不可執行。'
].join('\n\n');
lesson.invariant='CPU 每個 tick 至多執行一個工作；所有 ready/running 的工作必須已抵達、未完成且恰有一處擁有權；任何工作實際執行 ticks 恰等於 BT；0≤used≤對應 quantum；搶先前的用量在未 boost 時保留；全體 boost 只改 queue 優先級與 quantum 狀態，不會改 BT。';
lesson.counterexample='如果把每次被搶先都重設 used=0，P0 可超額使用 Q1 量子而不降級。若優先工作可無限到達又沒有 boost，低優先工作可能無界等待；如果把這個教學政策誤當 Linux CFS，則結論沒有實作證據。';
lesson.l3.checks.unshift('實作 Q0/Q1/Q2 的完整 ready/running/used/remaining trace；提交 B=0 與 B=4 的 idle、搶先、升級／降級反例，並驗證 no-duplicate、burst conservation、CT/WT/RT。');
lesson.l3.steps.push('本章進階 L3：根據此固定政策自行實作事件追蹤器，使用 tests/os-mlfq-model.cjs 的手算與 500+ 隨機不變量測試交叉驗證。');
})(window);
