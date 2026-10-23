/* Synchronization L2 masterclass: bounded semaphore buffer, mutex-protected
 * atomic increment versus lost update, and condition variable predicates.
 * Deterministic events illustrate invariants, not Linux scheduler interleavings.
 */
'use strict';
(function(global){
 const clone=a=>a.slice();
 const queue=(capacity,actions)=>{
  if(!Number.isInteger(capacity)||capacity<1||capacity>64||!Array.isArray(actions)||actions.length>256)
   throw Error('Invalid queue capacity or event list');
  const items=[],trace=[],consumed=[],accepted=[];
  for(const [i,event] of actions.entries()){
   const producer=typeof event==='string'&&event.startsWith('P:');
   const reader=event==='C';
   if(!producer&&!reader)throw Error('Expected P:VALUE or C');
   const before=clone(items);let result,delivered=null;
   if(producer){
    const value=event.slice(2);
    if(!value||value.includes(':'))throw Error('Invalid produced value');
    if(items.length===capacity)result='BLOCK_FULL';
    else{items.push(value);accepted.push(value);result='PRODUCED';}
   }else{
    if(items.length===0)result='BLOCK_EMPTY';
    else{delivered=items.shift();consumed.push(delivered);result='CONSUMED';}
   }
   if(items.length>capacity||items.length<0)throw Error('Overflow/underflow');
   if(accepted.length-consumed.length!==items.length)throw Error('Semaphore conservation');
   trace.push({step:i+1,event,before,result,delivered,after:clone(items),
     empty:capacity-items.length,full:items.length,
     accepted:accepted.length,consumed:consumed.length});
  }
  return {capacity,trace,accepted,consumed,pending:clone(items)};
 };
 const lostUpdate=events=>{
  const registers={A:null,B:null},trace=[];
  let shared=0;
  for(const [i,event] of events.entries()){
   const [thread,act]=event.split(':');
   if(!['A','B'].includes(thread)||!['R','W'].includes(act))
    throw Error('Expected A:R B:R A:W B:W');
   if(act==='R')registers[thread]=shared;
   else{
    if(registers[thread]===null)throw Error('Write without prior read');
    shared=registers[thread]+1;
   }
   trace.push({step:i+1,thread,act,registerA:registers.A,
     registerB:registers.B,shared});
  }
  return {shared,trace};
 };
 const condvar=(mode,events)=>{
  if(!['while','if'].includes(mode)||!Array.isArray(events))
   throw Error('Expected while|if and events');
  let predicate=false,waiting=true,proceeded=false;
  const trace=[{event:'wait(lock released)',predicate,waiting,proceeded}];
  for(const event of events){
   if(!['SPURIOUS','SET_TRUE','NOTIFY'].includes(event))throw Error('Unknown wakeup');
   if(event==='SET_TRUE')predicate=true;
   if(waiting&&(event==='SPURIOUS'||event==='NOTIFY')){
    if(mode==='while'&&!predicate)waiting=true;
    else{waiting=false;proceeded=true;}
   }
   trace.push({event,predicate,waiting,proceeded});
  }
  return {trace,predicate,waiting,proceeded,unsafe:proceeded&&!predicate};
 };
 global.OS_SYNC={queue,lostUpdate,condvar};
 const lessons=global.OS_DATA?.lessons;
 if(!lessons)return;
 function get(id){const t=lessons.find(x=>x.id===id)?.textbook;if(!t)throw Error('Missing textbook '+id);return t;}
 const race=lostUpdate(['A:R','B:R','A:W','B:W']);
 const safe=lostUpdate(['A:R','A:W','B:R','B:W']);
 if(race.shared!==1||safe.shared!==2)throw Error('Race authored example inconsistent');
 const m=get(5);
 m.preconditions='兩個 thread 共享初始 x=0，每條 thread 先 R=read(x)，再 W=write(local+1)。非原子 RMW 中 read 與 write 可交錯，所有事件是離散教學模型；若完整 RMW 在同一個 mutex critical section 內，兩執行緒各增加 1，最後必為 2。C11 未同步資料競爭在正式語言層屬未定義行為；表中的 x=1 是可觀察的典型 lost-update 交錯，不是保證結果。';
 m.symbols='x：共享計數器；A/B：執行緒；RA/RB：各 thread 讀取的本機 snapshot；R：read 事件；W：write(snapshot+1)；critical section：保護完整 read-modify-write 的互斥區，而非只保護 store 指令。';
 m.algorithm=[
  '初始化 x=0，兩 thread 各自保留 local snapshot；將 read 和 write 視為可被搶先的兩個事件。',
  '未上鎖的反例採 A:R、B:R、A:W、B:W；兩 thread 均觀察 x=0，之後均寫回 1，最後 x=1，遺失一次增加。',
  '完整 mutex RMW 序列採 A:R、A:W、B:R、B:W；B 在 A 完成後讀到 1，最後寫回 2。',
  '單純鎖住各次 store，並不能修正前面共享 read 的 stale snapshot；必須把整個讀取、計算及寫入放在臨界區。',
  '在真實 C11/pthread 中還要確保 mutex init/lock/unlock/destroy 成功，避免跨執行緒錯誤釋放與 lock inversion。',
  '驗收需同時追蹤共享 x 與兩個 thread 各自本機值，並提出可重現反例；不能只用一次執行剛好得到 2 當作正確性證明。'
 ];
 m.stateHeaders=['事件','Thread','操作','A snapshot','B snapshot','x（事件後）'];
 m.stateRows=race.trace.map(z=>[
  String(z.step),z.thread,z.act,z.registerA===null?'—':String(z.registerA),
  z.registerB===null?'—':String(z.registerB),String(z.shared)
 ]);
 m.worked=[
  'Worked Example：x=0；A:R→RA=0；B:R→RB=0；A:W→x=1；B:W→x=1。兩個 thread 都完成加一操作，但最後 x=1（lost update）。',
  '加鎖版：A:R→0、A:W→x=1、B:R→1、B:W→x=2。上鎖要涵蓋全部 read-modify-write，保護單一 write 並不充分。',
  '在 C11 逐字語意中，沒有 mutex/atomic 的 shared int data race 屬未定義行為；這個事件表只用來解釋硬體/作業系統層面常見競爭結果，並非正式 C 語言允許的非同步競態求值器。'
 ].join('\n\n');
 m.invariant='有 mutex 的完整 RMW，每個已完成的加一操作對 x 恰好貢獻 1，執行完 x=initial+成功操作數；各 thread 的 read snapshot 不可被其他 thread 的 write 偷偷改寫。未同步共享變數無這項可依賴的保證。';
 m.counterexample='若 A、B 同時讀取 0，再依序寫入 1，最後 x=1，不是預期 2；把 mutex 放在最後 store(x) 周圍仍會有 lost update。';
 m.l3.checks.unshift('展示未同步的 A:R/B:R/A:W/B:W lost-update 表與互斥 RMW 表；真實 Linux pthread bounded queue 用同一 mutex 保護共享狀態，另以 C11 undefined data-race 語意撰寫反例分析。');
 const ops=['P:11','P:22','P:33','P:44','C','P:44','C','C','C','C'];
 const q=queue(3,ops),p=get(16);
 p.preconditions='本章 producer–consumer 教學抽象：固定容量 N=3 的 FIFO buffer，初始 empty=3、full=0。P:value 只在空位>0 時放入，C 只在 full>0 時取最早資料。BLOCK_FULL/BLOCK_EMPTY 的請求沒有被執行，不會修改 queue；成功的 enqueue/dequeue 需要同一 mutex 原子保護。真實 semaphore 往往先 wait(empty/full)，操作 buffer 於 mutex 內，再 signal(full/empty)。';
 p.symbols='N：緩衝容量，本例 N=3；empty=N−count：空槽 token；full=count：已用槽 token；count：實際 queue item 數；P:value：producer 嘗試入列；C：consumer 嘗試出列；BLOCK：作業未完成/等待，不代表該值永久遺失。';
 p.algorithm=[
  '初始化 FIFO=[]，empty=N，full=0；先檢查 producer/consumer 的 wait 條件，不符合者標為 blocked 並保留狀態。',
  'Producer：若 empty>0，減一 empty、以 mutex enqueue、加一 full；若 empty=0 則不能寫入緩衝區，也不得減到負數。',
  'Consumer：若 full>0，減一 full、以 mutex dequeue FIFO 首個 item、加一 empty；若 full=0 則等待，不得讀取不存在的資料。',
  '每一事件都記錄 before queue、是否 block、delivered item、after queue、empty/full、累積成功 produced/consumed。',
  '驗證容量與 token 守恆：empty+full=N、count=full、produced−consumed=count，消費順序等於成功寫入順序。',
  '原生實作需以 pthread mutex 與 condvar 或 POSIX sem_t 控制共享 buffer；condvar 一定用 while 重查 predicate，並在最後 producer 停止時廣播讓 consumer 結束。'
 ];
 p.stateHeaders=['事件','輸入','執行結果','Queue（操作後）','empty/full','成功入列/出列'];
 p.stateRows=q.trace.map(s=>[
  String(s.step),s.event,s.result,'['+s.after.join(', ')+']',
  s.empty+'/'+s.full,s.accepted+'/'+s.consumed
 ]);
 p.worked=[
  '完整 Worked Example：N=3，事件 P11,P22,P33,P44,C,P44,C,C,C,C。前 3 次入列後 queue=[11,22,33]、empty/full=0/3。',
  '第 4 次 P44 無空位→BLOCK_FULL，buffer 不變；第 5 次 C 消費最早的 11，變 [22,33]，empty/full=1/2。',
  '第 6 次重新 P44 成功，buffer=[22,33,44]。後面三次 C 按 FIFO 消費 22,33,44，最後 C 無資料→BLOCK_EMPTY。成功生產與消費均為 4 筆。',
  'Linux/WSL2 真實驗收：node tests/os-pthread-queue.cjs；內含 4 producers×2000 筆、4 consumers、capacity=7，連續執行八次（各次完全獨立）。通過只是有界測試，不代表所有硬體排程 interleaving 的形式證明。'
 ].join('\n\n');
 p.invariant='任意狀態 0≤count≤N、empty=N−count、full=count、empty+full=N、produced−consumed=count；只有成功的 P/C 可以更新 token/queue；任何 block 事件不得改變狀態。';
 p.counterexample='若在 full=0 時執行 consumer 取資料會 underflow；在 empty=0 時 producer 仍 enqueue 會 overflow。如果 consumer 的 wait 在持有 mutex 時不釋放 mutex，producer 無法進入臨界區，可能形成死鎖。';
 p.l3.checks.unshift('完成 N=3 的事件狀態表、FIFO/token 守恆與 blocked event 反例；以真實 Linux pthread bounded queue 驗證完全消費、checksum 和無 duplicate。');
 p.l3.steps.push('Linux L3：node tests/os-pthread-queue.cjs；延伸：用受控 test driver 注入額外 signal/spurious wake，證明 while predicate 不可用 if 取代。');
 const cond=condvar('while',['SPURIOUS','SET_TRUE','NOTIFY']);
 const unsafe=condvar('if',['SPURIOUS']);
 const t=get(23);
 t.preconditions='Condition Variable 不儲存「訊號次數」，只是協助等待某個共享 predicate。必須先持 mutex 檢查 ready；ready=false 時 pthread_cond_wait 原子釋放 mutex 並睡眠，醒來會重獲 mutex；SPURIOUS wake 不保證 ready=true，因此需要 while 重查。示範事件：SPURIOUS、SET_TRUE（持鎖更新）、NOTIFY。';
 t.symbols='ready：共享 predicate（初始 false）；waiting：目前在 condvar wait；proceeded：已穿越等待點；SPURIOUS：沒有使 predicate 成立的假喚醒；SET_TRUE：由其他 thread 更新 predicate；NOTIFY：signal/broadcast；所有 predicate 修改與檢查皆需同步 mutex。';
 t.algorithm=[
  '在 mutex 內執行 while(!ready) cond_wait；wait 釋放 mutex；當醒來時再取得 mutex 才能檢查 ready。',
  '若 SPURIOUS 抵達而 ready=false，while 再次 wait；使用 if 只檢查一次則可能錯誤進入後續區段。',
  'producer 在相同 mutex 保護下寫 ready=true，接著 signal 或 broadcast；consumer 被喚醒後重新檢查為 true，安全繼續。',
  '如果 producer 更新 predicate 卻沒有通知，等待者可能依然睡眠，直到其他通知／假喚醒，不可假設值改變本身會喚醒。',
  '驗證每一步 ready、waiting、proceeded；對照 if/while 反例與 Linux pthread 的真實 bounded buffer。',
  '注意 condition variable 沒有自動公平性，notify_one 也不保證指定某個 waiter；必須重新由 predicate 決定能否繼續。'
 ];
 t.stateHeaders=['事件','ready','waiting','proceeded','正確性'];
 t.stateRows=cond.trace.map(s=>[
  s.event,String(s.predicate),String(s.waiting),
  String(s.proceeded),s.proceeded&&!s.predicate?'不安全':'正確'
 ]);
 t.worked=[
  'Worked Example：consumer 起始 ready=false→進入 wait（釋放 mutex）。SPURIOUS→再次取得 mutex，while(!ready) 為 true，重新 wait，不能繼續。',
  'producer 持鎖 SET_TRUE→ready=true，並 NOTIFY；等待的 consumer 醒來、重新取得 mutex，while(!ready) 為 false，才進入下一階段。',
  '錯誤 if 版本：ready=false、SPURIOUS→因不再重查 predicate，proceeded=true 但 ready=false，程式違反前置條件，不能靠一次成功執行排除。'
 ].join('\n\n');
 t.invariant='正確的 while predicate 模式永遠不允許 proceeded=true 且 ready=false。醒來不是成功條件，必須再次檢查被 mutex 保護的 shared predicate。';
 t.counterexample='若 consumer 使用 if(!ready) pthread_cond_wait，假喚醒或其他 waiter 先消耗資源都可能使 consumer 在 ready=false 時錯誤繼續；模型中的 if/SPURIOUS 分支明確產生 unsafe=true。';
 t.l3.checks.unshift('用事件表驗證 spurious wake 後 while 會再次等待、if 可能在 predicate=false 時繼續；提交真實 pthread 的 wait loop 與 producer 結束時 broadcast 證據。');
})(window);
