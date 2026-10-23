/* Queueing L2: deterministic FCFS sample, metrics, finite-window Little
 * identity, and analytic M/M/1 (only when its stochastic assumptions hold).
 * Percentiles follow nearest-rank; never infer p99 from an average alone.
 */
'use strict';
(function(global){
 function server(input){
  if(!Array.isArray(input)||!input.length||input.length>250||
    input.some(j=>!Number.isInteger(j.at)||j.at<0||!Number.isInteger(j.service)||
      j.service<1||j.service>10000))
   throw Error('Expected 1..250 nonnegative arrivals and positive service times');
  const jobs=input.map((x,i)=>({id:String(x.id??('J'+i)),i,at:x.at,service:x.service}))
   .sort((a,b)=>a.at-b.at||a.i-b.i);
  let nextAvailable=0,busy=0;
  const trace=jobs.map((j,i)=>{
   const start=Math.max(nextAvailable,j.at),ct=start+j.service;
   const ahead=jobs.slice(0,i).filter(k=>k.ct>j.at).length;
   // Prior jobs in array have been processed; ct always exists on them.
   const z={...j,ahead,start,ct,wait:start-j.at,
    latency:ct-j.at,response:start-j.at};
   jobs[i]={...z};nextAvailable=ct;busy+=j.service;
   return z;
  });
  const first=trace[0].at,end=trace.at(-1).ct;
  const horizon=end-first,latencies=trace.map(j=>j.latency).sort((a,b)=>a-b);
  const mean=(k)=>trace.reduce((s,j)=>s+j[k],0)/trace.length;
  const p=percentile=>latencies[Math.ceil(percentile/100*latencies.length)-1];
  const lambda=trace.length/horizon;
  const W=mean('latency'),L=trace.reduce((s,j)=>s+j.latency,0)/horizon;
  return {trace,horizon,busy,idle:horizon-busy,meanWait:mean('wait'),
   meanLatency:W,p50:p(50),p95:p(95),p99:p(99),
   throughputPerMs:lambda,averageInSystem:L,
   littlesRHS:lambda*W};
 }
 function mm1(lambda,mu){
  if(!Number.isFinite(lambda)||!Number.isFinite(mu)||
     lambda<0||mu<=0||lambda>=mu)
    throw Error('M/M/1 stable queue requires 0<=lambda<mu');
  return {lambda,mu,rho:lambda/mu,meanSystemTime:1/(mu-lambda),
   meanInSystem:lambda/(mu-lambda)};
 }
 global.OS_QUEUEING={server,mm1};
 const t=global.OS_DATA?.lessons.find(l=>l.id===12)?.textbook;
 if(!t)return;
 const inputs=[{id:'J0',at:0,service:3},{id:'J1',at:1,service:2},
  {id:'J2',at:2,service:1},{id:'J3',at:3,service:4}];
 const v=server(inputs),stable=mm1(80,100),near=mm1(99,100);
 t.preconditions='單一 FCFS 伺服器，四個工作抵達 (AT=0/1/2/3 ms)、服務需求 (3/2/1/4 ms)。不可搶先，無 context-switch cost，前一工作完成前不能啟動下一工作。平均在系統數與 Little 等式使用完整觀測窗 [第一筆到達,最後一筆完成)，沒有窗外未完成工作；隨機 M/M/1 則另假設 Poisson arrival、Exponential service、單服務器、穩態且 λ<μ，與前述確定性 trace 並非同一模型。';
 t.symbols='AT=arrival time；S=service time；start=開始服務；CT=completion；WT=start−AT（佇列等待）；W_i=CT_i−AT_i（wall-clock 逗留時間）；λ=完成作業數/觀測時間；L̄=觀測區間內平均系統工作數；ρ=λ/μ（M/M/1 利用率）；μ=平均服務率；p95=以 nearest-rank 定義的第 95 百分位延遲。';
 t.algorithm=[
  '將工作依到達時間排序，相同 AT 以原始輸入索引排序；設 nextAvailable=0。對第 i 個工作求 start_i=max(AT_i,nextAvailable)，CT_i=start_i+S_i，並更新 nextAvailable=CT_i。',
  '逐工作計算 WT_i=start_i−AT_i、W_i=CT_i−AT_i；對 FIFO 等待前方尚未完成工作可依 CT_j>AT_i 計數。',
  '觀測窗 T=最後 CT−首次 AT，求 throughput=N/T、CPU busy=ΣS_i、idle=T−busy；算平均 W 和平均 WT，別把 queue delay 與 service time 重複相加。',
  '以各工作在系統的 [AT_i,CT_i) 區間長度累加，算時間積分面積 ΣW_i，再除以 T 得到平均在系統工作數 L̄；核對 L̄=λ×平均 W（有限窗完整工作集合下的代數恆等式）。',
  '為延遲由小到大排序，Nearest Rank p95 為第 ceil(0.95×N) 個（1-based）觀測值；平均與尾端百分位不同，N=4 的 p95 只能當示範，不能當可靠 SLO 統計估計。',
  '獨立的 M/M/1 分析需驗證 λ<μ：ρ=λ/μ、穩態平均 W=1/(μ−λ)、L=λW；λ 趨近 μ 時平均逗留時間急增，不能用它直接推導任意實務服務的 p99。'
 ];
 t.stateHeaders=['作業','AT / S (ms)','Ahead','start / CT (ms)','WT (ms)','W (ms)'];
 t.stateRows=v.trace.map(j=>[
  j.id,j.at+' / '+j.service,String(j.ahead),j.start+' / '+j.ct,
  String(j.wait),String(j.latency)
 ]);
 t.worked=[
  'Worked Example：J0(AT=0,S=3)→start=0,CT=3,WT=0,W=3；J1(AT=1,S=2)→start=3,CT=5,WT=2,W=4；J2(AT=2,S=1)→start=5,CT=6,WT=3,W=4；J3(AT=3,S=4)→start=6,CT=10,WT=3,W=7。',
  '總服務忙碌 ΣS=10 ms，視窗 T=10 ms，吞吐量 4/0.010=400 requests/s；平均等待 (0+2+3+3)/4=2 ms，平均逗留 W̄=(3+4+4+7)/4=4.5 ms。',
  '面積 ΣW_i=18 job×ms，平均系統內工作數 L̄=18/10=1.8；λ=400/s、W=0.0045s，Little identity 得 λW=400×0.0045=1.8（單位須統一）。',
  '排序延遲 [3,4,4,7] ms，p50=4ms、p95=7ms、p99=7ms（Nearest Rank）；四筆樣本太少，僅展示百分位算法，不應據以對實際服務承諾 p99。',
  '獨立 M/M/1：λ=80/s、μ=100/s，ρ='+stable.rho+'，W=1/(100−80)='+stable.meanSystemTime+'s；若 λ 升到 99/s 而 μ 不變，W='+near.meanSystemTime+'s，這是模型負載接近 1 的排隊敏感性，不能無條件當真實 Linux 延遲預測。',
  'L4 實際量測請使用 python3 os/linux-labs/l4/selftest.py；收集每個模式多次 throughput 與 p50/p95/p99，再以 /proc、strace/perf、CPU quota 作交叉取證。'
 ].join('\n\n');
 t.invariant='FCFS start_i≥AT_i 且 start_i≥CT_(i−1)，CT_i=start_i+S_i，WT_i=start_i−AT_i≥0，W_i=WT_i+S_i；完整觀測窗下 Σ[CT_i−AT_i]/T = (N/T)×(ΣW_i/N)；每筆 job 的時間區間不得錯誤重複當成單一工作時間。';
 t.counterexample='平均 4.5 ms 不能推出 p99 也是 4.5ms：本例 p99=7ms；只觀察 CPU busy=100% 也無法判定瓶頸必然出現在 kernel。M/M/1 λ≥μ 不存在穩定有限平均 W；若拿 λ=120、μ=100 硬代得到負時間是模型適用前提錯誤。';
 t.l3.checks.unshift('以同一組四請求逐步計算 queue start、CT、WT/W、p50/p95/p99、throughput 及 Little identity；對 λ≥μ 拒絕套用 M/M/1，實際 SLO 應增加樣本量。');
 t.l3.steps.push('真實 L4 應提交至少三次 A/B 執行輸出、尾延遲分布、可反駁假說與對照取證，見 os/linux-labs/l4/README.md。');
})(window);
