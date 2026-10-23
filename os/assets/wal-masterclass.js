/* POSIX-style pedagogical WAL redo and crash state machine. This DOES NOT
 * simulate power loss, torn sectors, write barriers or real filesystem journal.
 * A successful fsync of commit records is an explicit durable boundary here.
 */
'use strict';
(function(global){
 function simulate(initial,actions){
  if(!Number.isSafeInteger(initial)||!Array.isArray(actions)||actions.length>100)
   throw Error('Malformed WAL state');
  let volatileData=initial,durableData=initial,volatileLog=[],durableLog=[];
  const traces=[],known=new Map(),committed=new Set();
  const redo=()=> {
   let state=durableData,entries=new Map();
   for(const record of durableLog){
    if(record.kind==='LOG')entries.set(record.tx,record.value);
    else if(record.kind==='COMMIT'&&entries.has(record.tx))
     state=entries.get(record.tx);
   }
   return state;
  };
  for(const [i,a] of actions.entries()){
   let output=null;
   if(!a||!['LOG','FSYNC_LOG','COMMIT','FSYNC_COMMIT','APPLY','FSYNC_DATA','CRASH'].includes(a.type))
    throw Error('Malformed WAL event');
   if(a.type==='LOG'){
    if(typeof a.tx!=='string'||!a.tx||known.has(a.tx)||!Number.isSafeInteger(a.value))
     throw Error('Duplicate/malformed transaction');
    known.set(a.tx,a.value);
    volatileLog.push({kind:'LOG',tx:a.tx,value:a.value});
   }else if(a.type==='FSYNC_LOG'){
    durableLog=volatileLog.map(x=>({...x}));
   }else if(a.type==='COMMIT'){
    if(!known.has(a.tx)||committed.has(a.tx)||
      !durableLog.some(x=>x.kind==='LOG'&&x.tx===a.tx))
     throw Error('WAL log record must be durable before COMMIT');
    volatileLog.push({kind:'COMMIT',tx:a.tx});committed.add(a.tx);
   }else if(a.type==='FSYNC_COMMIT'){
    durableLog=volatileLog.map(x=>({...x}));
   }else if(a.type==='APPLY'){
    if(!known.has(a.tx)||!durableLog.some(x=>x.kind==='COMMIT'&&x.tx===a.tx))
     throw Error('Cannot apply before a durable COMMIT record');
    volatileData=known.get(a.tx);
   }else if(a.type==='FSYNC_DATA'){
    durableData=volatileData;
   }else if(a.type==='CRASH'){
    output=redo();
    volatileData=output;durableData=output;
    volatileLog=durableLog.map(x=>({...x}));
    known.clear();committed.clear();
    for(const rec of durableLog){
      if(rec.kind==='LOG')known.set(rec.tx,rec.value);
      else if(rec.kind==='COMMIT')committed.add(rec.tx);
    }
   }
   const durableCommits=durableLog.filter(x=>x.kind==='COMMIT').length;
   traces.push({step:i+1,event:a.type+(a.tx?' '+a.tx:'')+(a.value===undefined?'':'='+a.value),
    volatileData,durableData,volatileRecords:volatileLog.length,durableRecords:durableLog.length,
    durableCommits,recoveryIfCrash:redo(),recovered:output});
  }
  return {initial,trace:traces,volatileData,durableData,
   recoveredIfCrash:redo(),durableLog:durableLog.map(x=>({...x}))};
 }
 global.OS_WAL={simulate};
 const t=global.OS_DATA?.lessons.find(x=>x.id===26)?.textbook;
 if(!t)return;
 const before=simulate(10,[{type:'LOG',tx:'T1',value:20},{type:'FSYNC_LOG'},
  {type:'COMMIT',tx:'T1'},{type:'CRASH'}]);
 const after=simulate(10,[{type:'LOG',tx:'T1',value:20},{type:'FSYNC_LOG'},
  {type:'COMMIT',tx:'T1'},{type:'FSYNC_COMMIT'},{type:'CRASH'}]);
 const staged=simulate(10,[{type:'LOG',tx:'T1',value:20},{type:'FSYNC_LOG'},
  {type:'COMMIT',tx:'T1'},{type:'FSYNC_COMMIT'},{type:'APPLY',tx:'T1'},
  {type:'LOG',tx:'T2',value:30},{type:'FSYNC_LOG'},
  {type:'COMMIT',tx:'T2'},{type:'FSYNC_COMMIT'},{type:'CRASH'}]);
 if(before.recoveredIfCrash!==10||after.recoveredIfCrash!==20||staged.recoveredIfCrash!==30)
  throw Error('Authored WAL crash example inconsistent');
 t.preconditions='受控教學 WAL 狀態機，初始 durable data=10。每筆 transaction 先 LOG(tx,newValue)、FSYNC_LOG，後 COMMIT(tx)、FSYNC_COMMIT；只有確定 commit record 已 durable 才允許 APPLY。CRASH 擷取 durable records 並由最後已持久提交的交易 redo。此狀態機特意採兩次 fsync barrier 以示範順序；真正 WAL 可組合 log+commit 的 append/fsync、利用群組提交與 checkpoint；模型未涵蓋 torn writes、磁區順序、磁碟控制器、page-cache writeback 或真實突然斷電。';
 t.symbols='LOG：記錄交易新資料意圖；FSYNC_LOG：將已寫入的 log records 標為持久；COMMIT：在 log stream 加入交易提交記號；FSYNC_COMMIT：將提交記號標為持久；APPLY：更新記憶體中的資料頁；FSYNC_DATA：將頁面變更標為 durable；CRASH：丟棄尚未持久狀態並從 durable log redo；volatile 和 durable 不可混稱同一狀態。';
 t.algorithm=[
  '先建立 transaction 意圖 LOG(T1,20)，此時只有 volatile log；FSYNC_LOG 完成後保證該 log record durable，仍不能宣稱 T1 已提交。',
  '追加 COMMIT(T1) marker，若還未 FSYNC_COMMIT 就 crash，持久記錄中只有 LOG 而沒有 durable COMMIT；恢復仍為舊資料 10。',
  'FSYNC_COMMIT 成功後 crash，即使還沒把資料頁寫到磁碟，redo 仍可依 durable LOG+COMMIT 恢復新資料 20。',
  '若 APPLY 發生在持久提交後，資料頁在記憶體中的值改成 20；FSYNC_DATA 後 durable data 才更新。這與 durable commit 的 log-level 保證是兩個不同邊界。',
  '第二個交易 T2 要求 30，重複 LOG、FSYNC_LOG、COMMIT、FSYNC_COMMIT，crash 後依 durable 提交順序得到 30；未持久的提交不允許改寫恢復輸出。',
  '原生 Linux 的 fsync(temp)→rename→fsync(dir) 是另一種 durability pattern，不能當成 WAL 記錄與交易隔離的等價物；驗收不得在正式裝置突然斷電。'
 ];
 t.stateHeaders=['步驟','事件','volatile value','durable data','log volatile/durable','Crash 後可恢復值'];
 t.stateRows=after.trace.map(x=>[
  String(x.step),x.event,String(x.volatileData),String(x.durableData),
  x.volatileRecords+'/'+x.durableRecords,String(x.recoveryIfCrash)
 ]);
 t.worked=[
  'Crash Point A（僅 log record durable）：T1 目標=20，執行 LOG→FSYNC_LOG→COMMIT（尚未 FSYNC_COMMIT）→CRASH。提交標記尚未持久，因此 recover=10。不能把「呼叫 COMMIT」誤當 power-fail durable。',
  'Crash Point B（commit durable）：LOG→FSYNC_LOG→COMMIT→FSYNC_COMMIT→CRASH；表格逐步列出 volatile/durable records。資料頁本身尚未 APPLY/FSYNC_DATA，但 durable log 有完整 T1，redo recover=20。',
  'Two-transaction case：先提交 T1=20，再持久提交 T2=30；即使 T1 已 APPLY 而資料頁未 FSYNC_DATA，crash 後順序 replay T1/T2，最後 recover='+staged.recoveredIfCrash+'。',
  'WAL 原則：先有 durable write-ahead log，才可以將資料頁寫入其 durable location；真正 DB transaction 的原子性、隔離與 checkpoint 管理遠超本模型。',
  'Linux 真實示範見 os/linux-labs/durable-replace.c，使用檔案 fsync/rename/dirfsync；那是原子替換資料路徑，不會模擬或承諾資料庫完整 WAL。'
 ].join('\n\n');
 t.invariant='一個交易在 crash recovery 生效，必須 durable log 同時包含該交易的 LOG 與 COMMIT record；非 durable COMMIT 不得造成恢復新值。APPLY 必須在 durable COMMIT 後。任一 CRASH 只能依持久證據恢復，不得憑 volatile memory 內容直接當作提交事實。';
 t.counterexample='有 LOG(T1,20) 且已 FSYNC_LOG，但 COMMIT 還未 fsync 時 crash，合法 recovery 是 10，不是 20。另一個錯誤是把成功 write() 或 rename() 一律當作已完整 durable commit，忽略檔案資料與 directory entry 的持久化時序。';
 t.l3.checks.unshift('實際推導兩個 crash point A/B 的 volatile/durable log、最後 committed transaction 與 recovery，拒絕未 fsync COMMIT 的誤恢復；用 Linux fsync/rename 範例只驗證獨立的檔案替換耐久流程。');
 t.l3.steps.push('用 tests/os-wal-model.cjs 驗證 LOG→FSYNC_LOG→COMMIT→FSYNC_COMMIT 與故意中斷案例，提交每個 event 的 durable records 與恢復後值。');
})(window);
