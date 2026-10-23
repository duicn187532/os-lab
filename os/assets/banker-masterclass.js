/* Complete Banker safety and request trial for OS LAB chapter 17.
 * Vector comparisons are component-wise; no mutation on rejected request.
 * Pure reference model supports instructor-authored derivations & invariant QA.
 */
'use strict';
(function(global){
const copy=x=>x.map(r=>r.slice());
const validVector=v=>Array.isArray(v)&&v.length>0&&v.every(n=>Number.isSafeInteger(n)&&n>=0);
const check=s=>{
 if(!validVector(s.available)||!Array.isArray(s.max)||!Array.isArray(s.allocation)||
    s.max.length===0||s.max.length!==s.allocation.length||s.max.length>32)
   throw Error('Malformed Banker state');
 const m=s.available.length;
 if(s.max.some((r,i)=>!validVector(r)||r.length!==m||
       !validVector(s.allocation[i])||s.allocation[i].length!==m||
       r.some((v,j)=>v<s.allocation[i][j])))
   throw Error('0 <= Allocation <= Max required with same resource dimensions');
};
const le=(a,b)=>a.every((v,j)=>v<=b[j]);
const plus=(a,b)=>a.map((v,j)=>v+b[j]);
const minus=(a,b)=>a.map((v,j)=>v-b[j]);
const safety=s=>{
 check(s);
 const n=s.max.length,need=s.max.map((m,i)=>minus(m,s.allocation[i]));
 let work=s.available.slice();
 const finish=Array(n).fill(false),order=[],trace=[];
 for(let round=0;round<n;round++){
   const i=need.findIndex((row,j)=>!finish[j]&&le(row,work));
   if(i<0)return {safe:false,order,need,work,finish,trace};
   const before=work.slice();
   work=plus(work,s.allocation[i]);finish[i]=true;order.push(i);
   trace.push({round:round+1,process:'P'+i,before,need:need[i].slice(),
               release:s.allocation[i].slice(),after:work.slice(),finish:finish.slice()});
 }
 return {safe:true,order,need,work,finish,trace};
};
const request=(s,i,r)=>{
 check(s);
 if(!Number.isInteger(i)||i<0||i>=s.max.length||!validVector(r)||r.length!==s.available.length)
   throw Error('Malformed process index or request vector');
 const original=safety(s),total=s.available.map((v,j)=>v+s.allocation.reduce((a,x)=>a+x[j],0));
 if(!le(r,original.need[i]))return {status:'ILLEGAL',reason:'Request exceeds declared Need'};
 if(!le(r,s.available))return {status:'WAIT',reason:'Insufficient Available resources at this moment'};
 const trial={available:minus(s.available,r),allocation:copy(s.allocation),max:copy(s.max)};
 trial.allocation[i]=plus(trial.allocation[i],r);
 const result=safety(trial);
 if(!result.safe)return {status:'UNSAFE',trial,result,reason:'Trial has no complete safe sequence'};
 if(total.some((v,j)=>v!==trial.available[j]+trial.allocation.reduce((a,x)=>a+x[j],0)))
   throw Error('Conservation invariant violated');
 return {status:'GRANTED',trial,result};
};
global.OS_BANKER={safety,request};
// Original textbook test data: resource totals [10,5,7], Available=[3,3,2].
const initial={
 available:[3,3,2],
 allocation:[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],
 max:[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]
};
const run=safety(initial);
const granted=request(initial,1,[1,0,2]);
const illegal=request(initial,1,[2,0,0]);
const wait=request(initial,0,[4,0,0]);
const unsafe=request(initial,4,[3,3,0]);
if(run.order.join(',')!=='1,3,0,2,4'||granted.status!=='GRANTED'||
   illegal.status!=='ILLEGAL'||wait.status!=='WAIT'||unsafe.status!=='UNSAFE')
  throw Error('Banker authored example inconsistent with reference state');
const lesson=global.OS_DATA?.lessons.find(l=>l.id===17);
if(!lesson)return;
if(!lesson.textbook)throw Error('Load banker masterclass after textbook-rigor');
const t=lesson.textbook;
const vec=a=>'['+a.join(', ')+']';
t.preconditions='Banker 模型：五個 process P0..P4、三種可重複使用資源 A/B/C，每種類型有固定總量 [10,5,7]，初始 Available=[3,3,2]。所有 Max 事先已知、Allocation 不超過 Max、資源最後可釋回。Need=Max−Allocation 為逐維向量，並非把三種資源加總；本章安全檢查採固定最小索引優先尋找可完成者。';
t.symbols='Available_j：目前第 j 類可用資源量；Max_ij：Pi 宣告的最大資源需求；Allocation_ij：已配置；Need_ij=Max_ij−Allocation_ij；Work：安全性檢查用暫存可用資源向量；Finish_i∈{false,true}；Request_i：Pi 的新請求向量。所有資源數均為非負整數，向量 ≤ 為逐維比較。';
t.algorithm=[
 '建表：初始 Available=[3,3,2]，按各 P_i 的 Max 與 Allocation 逐維做 Need_i=Max_i−Allocation_i。全部 Finish[i]=false、Work=Available。',
 '安全檢查：從小索引掃描所有尚未 Finish 的行程；找第一個 Need_i≤Work（每個資源維度都滿足），假設它能完成並釋放當前 Allocation_i。',
 '狀態轉移：Work←Work+Allocation_i；Finish_i←true；將 Pi 加進 safe sequence，重掃尚未完成者。若所有 Finish=true 則 SAFE；否則若某一輪沒有任何可完成者則 UNSAFE。',
 'Request Trial：先判斷 Request_i≤Need_i，違反則 ILLEGAL；再判斷 Request_i≤Available，否則 WAIT；不得對此兩類拒絕修改原始狀態。',
 '若兩個條件皆滿足，建立暫時 Allocation_i+=Request_i、Available-=Request_i、Need_i-=Request_i，執行 Safety Algorithm。安全則 GRANTED，不安全則回復原狀並標 UNSAFE。',
 '正確性不變量：對每種資源 j，Available_j+Σ_i Allocation_ij=Total_j；0≤Allocation_ij≤Max_ij；Need_ij≥0；Work 每次釋放只能逐維增加。'
];
t.stateHeaders=['回合','先前 Work','可完成 P_i / Need_i','釋回 Allocation_i','更新 Work'];
t.stateRows=run.trace.map(z=>[
 String(z.round),vec(z.before),z.process+' / '+vec(z.need),vec(z.release),vec(z.after)
]);
t.worked=[
 '完整資源矩陣（順序 A,B,C）：P0 Alloc[0,1,0] Max[7,5,3] Need[7,4,3]；P1 Alloc[2,0,0] Max[3,2,2] Need[1,2,2]；P2 Alloc[3,0,2] Max[9,0,2] Need[6,0,0]；P3 Alloc[2,1,1] Max[2,2,2] Need[0,1,1]；P4 Alloc[0,0,2] Max[4,3,3] Need[4,3,1]。',
 'Safety Algorithm 如狀態表：Work=[3,3,2]，先選 P1→[5,3,2]；選 P3→[7,4,3]；選 P0→[7,5,3]；選 P2→[10,5,5]；選 P4→[10,5,7]；Finish 全 true，Safe Sequence = P1→P3→P0→P2→P4。最後 Work 等於全部 [10,5,7]，不代表作業系統真的逐個依此順序執行。',
 '合法 Request Trial：P1 要求 Request=[1,0,2]；逐維小於 Need(P1)=[1,2,2] 與 Available=[3,3,2]。假配後 Available=[2,3,0]、Alloc(P1)=[3,0,2]、Need(P1)=[0,2,0]；安全檢查先完成 P1，使 Work=[5,3,2]，其餘依序可完成；因此 GRANTED。',
 '非法 Request：P1 的 [2,0,0] 大於剩餘 Need=[1,2,2] 中第一維，ILLEGAL（不是 WAIT）。',
 '暫時不足：P0 的 [4,0,0] 在 Need 內，但 Available 僅 [3,3,2]，因此 WAIT；不得試圖分配負資源。',
 '會造成不安全的 Request：P4 的 [3,3,0] 在 Need(P4)=[4,3,1] 與 Available=[3,3,2] 之內，但試分配後 Work=[0,0,2]，所有 Need_i 都至少在 A 或 B 資源維度超過 Work，找不到任何可完成者，因此 UNSAFE，需回復原配置。'
].join('\n\n');
t.invariant='安全狀態表示「存在」至少一組能依 Max 完成的次序，並非死結一定發生的預言。每一步檢查 Need_i≤Work 都是向量逐維比較；釋回 Allocation 之後 Work 不會變小。Request Trial 不論因 ILLEGAL、WAIT 或 UNSAFE 拒絕，都不能改寫原始配置；GRANTED 前後每種資源總量守恆。';
t.counterexample='Request(P4)=[3,3,0] 雖符合 Need 與 Available，試配置後沒有可完成者，證明只看可用資源不等於安全。Request(P1)=[2,0,0] 超過 Need，是非法請求，不能混稱 UNSAFE；Request(P0)=[4,0,0] 僅因暫時資源不足，應 WAIT。即使一個 Need 的總和很小，若任一維超過 Work，仍不可通過。';
t.l3.checks.unshift('用 5×3 的 Max/Allocation、Available 進行完整 Safety 與 Request Trial；須分辨 ILLEGAL/WAIT/UNSAFE/GRANTED 並證明拒絕不會汙染原始資源狀態。');
t.l3.steps.push('延伸作業：依 Banker 整體輸入規格自行建立 Max、Allocation、Available、Request，確認每次 trial 維持資源守恆、向量比較及完整 Finish 路徑（見 tests/os-banker-model.cjs）。');
})(window);
