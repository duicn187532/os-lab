/* OS Scheduling L2 masterclass: one independent, deterministic event/tick model.
 * All times are nonnegative integers in abstract CPU time units; NOT Linux CFS.
 * FCFS/SJF are non-preemptive. SRTF is preemptive. RR is FIFO with quantum.
 * At a quantum boundary, new arrivals join the queue before the expired task.
 */
'use strict';
(function(global){
  const schedule=(input,policy,quantum=2)=>{
    if(!['FCFS','SJF','SRTF','RR'].includes(policy))throw Error('Unknown policy');
    if(!Array.isArray(input)||!input.length||input.length>64)throw Error('Expected 1..64 jobs');
    if(policy==='RR'&&(!Number.isInteger(quantum)||quantum<1))throw Error('Quantum must be positive integer');
    const jobs=input.map((j,i)=>{
      if(!Number.isSafeInteger(j.at)||j.at<0||!Number.isSafeInteger(j.bt)||j.bt<1||j.bt>10000)
        throw Error('Arrival must be >=0 and burst must be 1..10000');
      return {id:String(j.id??('P'+i)),index:i,at:j.at,bt:j.bt,remaining:j.bt,first:null,ct:null};
    });
    if(new Set(jobs.map(j=>j.id)).size!==jobs.length)throw Error('Duplicate job ids');
    const horizon=jobs.reduce((a,j)=>a+j.bt,0)+Math.max(...jobs.map(j=>j.at));
    if(horizon>150000)throw Error('Trace too long');
    const queue=[],trace=[],segments=[];
    let now=0,completed=0,running=null,slice=0;
    const cmpFCFS=(a,b)=>a.at-b.at||a.index-b.index;
    const cmpShortest=(a,b)=>a.remaining-b.remaining||a.at-b.at||a.index-b.index;
    while(completed<jobs.length){
      const arrived=jobs.filter(j=>j.at===now).sort(cmpFCFS);
      if(policy==='RR'){
        arrived.forEach(j=>queue.push(j));
        if(running&&slice===quantum){queue.push(running);running=null;slice=0;}
        if(!running&&queue.length){running=queue.shift();slice=0;}
      }else if(policy==='SRTF'){
        const candidates=jobs.filter(j=>j.at<=now&&j.remaining>0).sort(cmpShortest);
        running=candidates[0]||null;
      }else if(!running){
        const candidates=jobs.filter(j=>j.at<=now&&j.remaining>0)
          .sort(policy==='FCFS'?cmpFCFS:cmpShortest);
        running=candidates[0]||null;
      }
      if(running&&(running.at>now||running.remaining<1))throw Error('Invalid scheduler state');
      const label=running?.id||'IDLE';
      const ready=policy==='RR'?queue.map(j=>j.id):
        jobs.filter(j=>j.at<=now&&j.remaining>0&&j!==running)
          .sort(policy==='FCFS'?cmpFCFS:cmpShortest).map(j=>j.id);
      if(running){
        if(running.first===null)running.first=now;
        running.remaining--;slice++;
      }
      const last=segments[segments.length-1];
      if(last&&last.job===label&&last.end===now)last.end++;
      else segments.push({start:now,end:now+1,job:label});
      trace.push({
        t:now,arrivals:arrived.map(j=>j.id),ready,running:label,
        remaining:jobs.map(j=>j.id+':'+j.remaining),
        finish:running&&running.remaining===0?running.id:null
      });
      now++;
      if(running&&running.remaining===0){
        running.ct=now;completed++;running=null;slice=0;
      }
      if(now>horizon)throw Error('Non-terminating scheduler trace');
    }
    const metrics=jobs.map(j=>({
      id:j.id,at:j.at,bt:j.bt,ct:j.ct,first:j.first,
      tat:j.ct-j.at,wt:j.ct-j.at-j.bt,rt:j.first-j.at
    }));
    if(metrics.some(j=>j.wt<0||j.rt<0||j.tat<j.bt))throw Error('Scheduling invariant violated');
    if(segments.reduce((s,x)=>s+x.end-x.start,0)!==now)throw Error('Gantt time conservation failed');
    return {policy,quantum,trace,segments,metrics,elapsed:now,
      meanWT:metrics.reduce((a,j)=>a+j.wt,0)/metrics.length};
  };
  global.OS_SCHEDULER={schedule};
  // Authored case: same input shared by the four algorithms, but distinct policies.
  const data=global.OS_DATA;
  if(!data?.lessons)return;
  const lesson=data.lessons.find(l=>l.id===4);
  if(!lesson?.textbook)throw Error('Load scheduling-masterclass after textbook-rigor');
  const jobs=[{id:'P0',at:0,bt:5},{id:'P1',at:1,bt:3},{id:'P2',at:2,bt:1}];
  const fcfs=schedule(jobs,'FCFS'),sjf=schedule(jobs,'SJF');
  const srtf=schedule(jobs,'SRTF'),rr=schedule(jobs,'RR',2);
  const x=lesson.textbook;
  x.preconditions='單核心、CPU burst 均為正整數、無 I/O 與上下文切換成本；以 [start,end) 記錄執行區間。FCFS/SJF 不搶先、SRTF 每個整數時刻可以搶先、RR quantum=2。同步到達按輸入索引；RR 時片邊界先接納新到達者，再把被搶先者排入隊尾。';
  x.symbols='AT_i (arrival)=到達時間、BT_i (burst)=所需 CPU 時間、CT_i (completion)=完成時刻、TAT_i=CT_i−AT_i (周轉時間)、WT_i=TAT_i−BT_i (等待時間)、RT_i=firstStart_i−AT_i (第一次回應時間)、R_i=剩餘 CPU 時間。單位皆為抽象時間單位，工作數 n=3。';
  x.algorithm=[
    '共用狀態：t=0；每個工作 remaining=BT、firstStart=空、CT=空；等待集合只包含 AT≤t 且 remaining>0 的工作。直到所有 CT 已設定。',
    'FCFS：若 CPU idle，選已到達且尚未完成者中 AT 最早、再依索引小者；選定後持續執行直到完成；若無 ready 工作就產生 IDLE 區間。',
    'SJF（不搶先）：只在 CPU 空閒時選當時已到達者中 BT 最短、同分依 AT/輸入索引；此模型假設可事先知道實際 CPU burst。',
    'SRTF：每個時間刻度選 remaining 最短的已到達工作；同分按 AT 與索引；若選擇不同工作便搶先（不含 context-switch cost）；完成時寫 CT=t+1。',
    'RR：新到達工作入 FIFO ready queue；時片到期且尚未完成的工作回隊尾，取隊頭執行至完成或用完 quantum。若無工作則 idle。',
    '所有政策執行完後：逐工作計算 TAT=CT−AT、WT=TAT−BT、RT=firstStart−AT；手算與 Gantt timeline 總時間對照。'
  ];
  x.stateHeaders=['時間 [t,t+1)','新到達','Ready Queue（排除 Running）','SRTF 執行','執行後剩餘 R0/R1/R2'];
  x.stateRows=srtf.trace.map(z=>[
    '['+z.t+','+(z.t+1)+')',z.arrivals.join(', ')||'—',
    z.ready.join(' → ')||'空',z.running,
    z.remaining.map(r=>r.split(':')[1]).join(' / ')
  ]);
  const gantt=r=>r.segments.map(s=>'['+s.start+','+s.end+') '+s.job).join(' → ');
  const line=r=>r.metrics.map(m=>m.id+': CT='+m.ct+', TAT='+m.tat+', WT='+m.wt+', RT='+m.rt).join('；');
  x.worked=[
    '完整 Worked Example：P0(AT=0,BT=5)、P1(AT=1,BT=3)、P2(AT=2,BT=1)；初始 remaining=(5,3,1)。',
    'SRTF 每步見上表：t=0 P0 先跑、R0=4；t=1 P1 抵達且 3<4，因此 P0 搶先；t=2 P2 抵達且 1<2，因此 P1 搶先。P2 完成 CT2=3；P1 在 [3,5) 跑完 CT1=5；P0 在 [5,9) 跑完 CT0=9。',
    'SRTF Gantt：'+gantt(srtf)+'。'+line(srtf)+'。平均等待 WT=(4+1+0)/3=5/3≈1.667。',
    'FCFS Gantt：'+gantt(fcfs)+'。'+line(fcfs)+'。平均等待 WT=(0+4+6)/3=10/3≈3.333。',
    'SJF（不搶先）Gantt：'+gantt(sjf)+'。'+line(sjf)+'。平均等待 WT=(0+5+3)/3=8/3≈2.667。',
    'RR(q=2) Gantt：'+gantt(rr)+'。'+line(rr)+'。平均等待 WT=(4+4+2)/3=10/3≈3.333。',
    '驗證：對所有工作 WT=TAT−BT 且 RT≥0；各 Gantt 都恰好執行 P0 五、P1 三、P2 一個時間單位；SRTF 不允許未到達工作被執行。'
  ].join('\n\n');
  x.invariant='對任意 t：CPU 最多執行一個工作，未到達者不能進入 ready/running；0≤remaining_i≤BT_i；一個工作所有執行區間的長度之和恰為 BT_i；CT_i≥AT_i+BT_i。完成後必須對上 Gantt 執行量與 CT、TAT、WT、RT。若無切換成本且無 I/O，WT_i=TAT_i−BT_i。';
  x.counterexample='Idle：若只有 P0(AT=4,BT=2)，Gantt 應先有 [0,4) IDLE 再執行 [4,6) P0；WT=RT=0，不可讓 P0 在 t=0 執行。Tie：同 AT/BT 依索引決策。Context switch：若每次換到不同工作耗 1 單位，以上 Gantt/CT 全須重算，不能直接加個常數到全部 WT。Starvation：連續短工作可能讓 SRTF 的長工作長期等待；不能從這個有限例子宣稱公平。RR quantum 過短可能增加 context-switch overhead；量化比較須指定是否計入 idle/初次 dispatch 和 arrival-during-switch 的規則。';
  x.l3.checks.unshift('由原始到達時間及 CPU burst 建立完整事件序列，分別求 FCFS/SJF/SRTF/RR；核對每一格 ready/running/remaining、Gantt CT/TAT/WT/RT，不能僅輸出平均等待。');
  x.l3.steps.push('延伸作業：以本章的 P0/P1/P2 與新增 idle/tie/context switch cases 實作四政策排程器，提交 trace 與自動化不變量驗證（見 tests/os-scheduling-model.cjs）。');
})(window);
