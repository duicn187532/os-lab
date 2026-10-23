/* OS LAB objectively checkable L2 practice questions.
 * All prompts, answers and checks are intentionally public: formative practice
 * on static Pages, not a secure examination and not Mastered attestation.
 * A correct local result cannot substitute for teacher-reviewed derivations.
 */
'use strict';
(function(global){
 const entries=[[0,"機器以順序執行模式取指：PC=4096，指令長度=4 bytes，沒有分支或例外。下一個 PC（十進位）？","4100","PC'=4096+4=4100；不能套用在 branch/trap。","numeric"],[1,"一個非阻塞 pipe 仍有 writer 開啟，但目前沒有可讀 bytes。read 應以何種 errno 表示暫時不可讀？","EAGAIN","writer 存在且 buffer 為空時，非阻塞 read 可返回 -1，errno=EAGAIN（或等價 EWOULDBLOCK），並非 EOF。","state"],[2,"初始一個行程依次執行三次 fork()，每個 fork 都成功，子行程也繼續執行後續 fork。最後共有幾個行程（含最初行程）？","8","3 次完全倍增，因此共有 2^3=8 個行程。","numeric"],[3,"兩條 thread 在未同步下都先讀到 x=0，再各自執行 x+1 並寫回。若兩次寫回的值都為 1，最後 x 為多少？","1","兩次 read 都看到舊值0，均寫 1；這是 lost update，不能算成 2。","state"],[4,"FCFS：P0、P1、P2 都在 t=0 抵達，burst=3、4、5，依輸入順序執行。P2 等待時間（ticks）？","7","P2 要等待 P0 的3及 P1 的4，共7 ticks。","numeric"],[5,"兩條 thread 先同時讀 x=0，接著都寫入 x+1。失去的一次加一叫什麼現象（英文，以底線連接）？","LOST_UPDATE","共享的 read-modify-write 不是原子操作，交錯執行使一次更新遺失。","state"],[6,"4KiB 頁面，虛擬位址 VA=4660（十進位）。page offset（十進位 bytes）？","564","offset=4660 mod 4096=564，VPN=1；不可用 PFN 取代 offset。","numeric"],[7,"3 個空 page frames、FIFO、參照順序 [1,2,3,1,4]。總 page faults 幾次？","4","1/2/3 三次載入，1 命中且不改入隊順序，4 淘汰1，總四次缺頁。","state"],[8,"同一 inode 原本有 2 個 hard links，unlink 其中 1 個名稱後，且無其他連結變動。nlink 為多少？","1","hard link 反映目錄連結數；unlink 一個名稱只使 nlink 減一。","numeric"],[9,"read 已從 10-byte buffer 成功讀取 3 bytes，在沒有新資料進入的前提下還有幾 bytes 未讀？","7","byte stream 不保證一次讀完；10-3=7 bytes。","numeric"],[10,"檔案 mode=0750，使用者非 owner、屬於 group，要求 write。基本 DAC bit 檢查輸出 ALLOW 或 DENY？","DENY","group 權限 5=r-x，不含 w bit，因此拒絕寫入；另不考慮 ACL/capabilities。","state"],[11,"cgroup cpu.max 的 quota/period=150000/100000，等價 CPU 份額為多少（可填小數）？","1.5","quota/period=1.5，不能直接截斷成一核或視同實際用量。","numeric"],[12,"穩態下 λ=4 requests/s，W=5ms，依 Little's Law 平均在系統中的請求數 L 為多少？","0.02","L=λ×W=4×0.005=0.02 requests；單位必須一致。","numeric"],[13,"服務區段 [0,30]ms 含 DB wait [10,20]ms，兩段時間的區間聯集共幾 ms？","30","DB wait 已包含在 [0,30]，不得重複計算為 40ms。","numeric"],[14,"子行程 exec 成功執行 shell 命令 exit 7，父行程 waitpid 並確認 WIFEXITED。WEXITSTATUS 多少？","7","waitpid 回傳的狀態應以 WEXITSTATUS 解出退出碼。","numeric"],[15,"單獨呼叫 write() 成功，但尚未 fsync() 就當機。是否可以保證檔案資料在重啟後持久存在？回答 YES 或 NO。","NO","write 接受資料不等於已完成 durability barrier；不同 filesystem 有不同時序。","state"],[16,"有界佇列容量 N=5，已使用 full=3，且沒有其他中途動作，empty semaphore token 應是多少？","2","empty+full=N，因此 empty=5-3=2。","numeric"],[17,"Banker 單一行程：Max=[4,3]，Allocation=[2,1]，Need 的第一維為多少？","2","Need=Max-Allocation=[2,2]。","numeric"],[18,"First Fit 空洞依序大小 [5,10,20]，請求 6，從 0 開始編號。回傳所選 hole index？","1","第 0 個不足6，第1個大小10已足夠，First Fit 選1，不是 Best/Worst Fit。","state"],[19,"HDD FCFS 磁頭從 53 開始，按原順序處理 [98,183,37]，總移動軌數？","276","|98-53|+|183-98|+|37-183|=45+85+146=276。","numeric"],[20,"三級 MLFQ 最低層為 level=2，工作用完該層時間片、沒有全局 boost。下一層 level？","2","最低層不可再下降，仍為 level2，通常排回該佇列尾部。","state"],[21,"ELF 的哪一種 program header segment type 代表載入到虛擬記憶體的區段？輸入常數名稱。","PT_LOAD","ELF program header PT_LOAD 指定應載入的 segment；section headers 並非執行期的主要載入表。","state"],[22,"pipe 所有 writer 已關閉，但 buffer 還有 5 bytes，read 成功取走 2 bytes；接著 buffer 還剩多少 bytes？","3","EOF 必須 buffer 耗盡後才可觀察；現在還有3 bytes。","numeric"],[23,"pthread_cond_wait 因 spurious wakeup 返回，ready predicate 仍為 false。consumer 正確動作為 WAIT 或 CONSUME？","WAIT","持 mutex 再檢查 predicate，仍 false 就回到 wait；不可用 if 假設喚醒即成立。","state"],[24,"fork 後 MAP_PRIVATE 的 child 將初始值5改成9，parent 沒有寫入，parent 最後看到的值？","5","COW 私有寫入不應改變另一個行程的邏輯視圖；Parent仍5。","state"],[25,"Working Set 視窗 Δ=4，references=[1,2,1,3,4]；第5筆結束時最近4筆不同 page 數 WSS？","4","最近4筆為[2,1,3,4]，不同頁共有4個。","numeric"],[26,"WAL 初值10，T1 寫入新值20的 LOG 已 fsync，但 COMMIT marker 尚未持久化就 crash；recovery value？","10","完整可持久的 COMMIT 尚不存在；不應套用已寫但未提交的值20。","state"],[27,"epoll ET 已通知可讀 10 bytes，只讀走1 byte，尚有9 bytes，沒有新的邊緣事件。是否保證立刻有第二次通知？回答 YES 或 NO。","NO","ET 不會因舊資料仍可讀而持續通知；應使用非阻塞讀至 EAGAIN。","state"],[28,"觀測 20 個 CPU quota periods，其中 7 個 throttled。throttled periods 比率為多少（0 到 1 的小數）？","0.35","ratio=7/20=0.35，不代表 CPU busy 就是35%。","numeric"]];
 function check(id,submission){
  if(!Number.isInteger(id)||id<0||id>=entries.length)throw Error('L2 chapter id invalid');
  const expected=entries[id][2],answer=String(submission??'').trim();
  if(!answer)return {correct:false,reason:'請先作答'};
  const numeric=entries[id][4]==='numeric';
  const n=Number(answer),want=Number(expected);
  const correct=numeric?Number.isFinite(n)&&Math.abs(n-want)<=1e-10*Math.max(1,Math.abs(want)):
    answer.toUpperCase().replace(/[ -]+/g,'_')===expected.toUpperCase();
  return {correct,expected,explanation:entries[id][3],kind:entries[id][4]};
 }
 global.OS_L2_OBJECTIVE={
  all:entries.map((q,id)=>({id,prompt:q[1],expected:q[2],explanation:q[3],kind:q[4]})),
  get:id=>Number.isInteger(id)&&id>=0&&id<entries.length?
    {id,prompt:entries[id][1],kind:entries[id][4]}:null,
  check
 };
})(window);
