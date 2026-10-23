/* Educational inode / open-file-description lifecycle trace, not Linux source.
 * An inode stays accessible through the open description after nlink=0.
 * dup and fork share the OFD offset but have separate descriptor identities.
 */
'use strict';
(function(global){
 function inodeTrace(data){
  if(typeof data!=='string'||data.length<4||data.length>64)
   throw Error('Expected 4..64 characters');
  const inode={links:1,openDescriptions:1},ofd={offset:0},trace=[];
  const note=(event,who,byte)=>trace.push({
   event,who,byte:byte??'—',links:inode.links,open:inode.openDescriptions,
   offset:ofd.offset,alive:inode.links>0||inode.openDescriptions>0
  });
  note('open / original','parent');
  inode.links++;note('link original → alias','parent');
  inode.links--;note('unlink original','parent');
  inode.links--;note('unlink alias','parent');
  note('dup(fd) → fd2; same OFD','parent');
  function take(who){
   const byte=data[ofd.offset++];
   note('read 1 byte',who,byte);return byte;
  }
  const readout=[
   take('parent fd2'),take('parent fd'),
   take('child inherited fd'),take('parent fd'),
  ];
  while(ofd.offset<data.length)take('parent fd2');
  // Close all references, then the OFD lifetime ends.
  inode.openDescriptions=0;note('close final OFD reference','parent');
  return {readout:readout.join(''),trace,alive:inode.links>0||inode.openDescriptions>0,
   bytes:data.length};
 }
 global.OS_OFD={inodeTrace};
 const lesson=global.OS_DATA?.lessons.find(l=>l.id===8)?.textbook;
 if(!lesson)return;
 const result=inodeTrace('ABCDE');
 lesson.preconditions='單一 Linux/POSIX 檔案、初始 name=original，內容 ABCDE，第一次 open 產生一個 Open File Description（OFD），offset=0。hard link 只增加目錄項到同一 inode；dup 與 fork 繼承同一 OFD，因此共享檔案偏移（非各自獨立 offset）。open FD 尚在時，unlink 全部檔名不代表已不能讀取；最後一個 OFD 參照關閉才可真正回收。此例假定無其他開啟者、無並行讀寫，避免未同步 offset 競爭。';
 lesson.symbols='inode：檔案系統物件；nlink：hard-link 目錄項數；FD：行程內數值描述符；OFD：核心開啟檔案描述，持有 offset；offset：下一次 read 位置；dup：新增 FD 但指向同一 OFD；fork：子行程繼承 FD→OFD 映射；read 每次讀 1 byte。';
 lesson.algorithm=[
  '建立一個私有測試目錄，在該目錄建立 original 並寫入 ABCDE；初始 inode.nlink=1，open descriptor count=1，OFD.offset=0。',
  '呼叫 link(original,alias)，確認 inode.nlink=2；unlink original 後 nlink=1，再 unlink alias 後 nlink=0，但原 FD 未關閉，inode 仍存在。',
  'lseek(fd,0)，然後 dup(fd)→fd2；fd2 讀 A 使共同 OFD.offset=1；從 fd 讀 B，offset=2。這不是兩個互不相干的讀取指標。',
  'fork 後 child 繼承 FD 及同一 OFD；child 讀 C、exit。parent 必須先 waitpid 再讀 D，offset=4；再從 fd2 讀 E。',
  '所有 FD 最終 close，沒有目錄名稱也沒有開啟參照，才允許 inode/data 回收；檢查測試目錄可刪除。',
  '提交真實 Linux 執行紀錄與錯誤路徑分析，並對照本章表格；不可用瀏覽器模擬推論目錄/核心 inode 所有實際生命週期。'
 ];
 lesson.stateHeaders=['狀態事件','誰操作','讀得位元組','inode nlink','OFD offset','可存取?'];
 lesson.stateRows=result.trace.map(s=>[
  s.event,s.who,s.byte,String(s.links),String(s.offset),s.alive?'是':'否'
 ]);
 lesson.worked=[
  '完整 trace：open(original) 時 nlink=1；link(original,alias)→nlink=2；unlink(original)→1；unlink(alias)→0。inode.nlink=0 時「無任何檔名」，但 FD 仍開啟，可以 fstat、lseek 與 read。',
  'dup(fd) 產生新 descriptor，**沒有建立獨立的 open file description**；fd2 的 read(A) 令共同 offset=1，fd 的 read(B) 令共同 offset=2。',
  'fork 讓 child 繼承 FD→同一 OFD；child 讀(C) 後 _exit，parent waitpid 再讀(D)，最後 fd2 讀(E)。原 FD 與 FD2/子行程同時共用的是 OFD offset。',
  'close 所有 FD 之後，因 nlink=0 且不再有開啟的 OFD，inode 才符合回收條件。這個示範不保證實際 block release 的時間點。',
  '真實 Linux 交付：cc -std=c11 -Wall -Wextra -Werror os/linux-labs/ofd-inode-demo.c -o /tmp/ofd-demo && /tmp/ofd-demo；預期 links=0 dup_shared=AB fork_shared=CD file_retained=yes。'
 ].join('\n\n');
 lesson.invariant='hard-link 數與開啟 FD/OFD 是不同計數；只要 (nlink>0 ∨ openRefs>0)，檔案物件尚有可達路徑。dup/fork 共享 OFD.offset，卻不代表「重新呼叫 open 同一檔案」也會共享 offset。child 在 parent read 前有 waitpid 同步，排除這個案例的讀取順序不確定性。';
 lesson.counterexample='誤以為 unlink 最後一個檔名就立即讓所有開啟 FD 失效，會錯誤地預期讀不到 A/B/C/D/E。誤以為 dup 或 fork 都產生自己的 offset，則預期兩次讀都從 A 開始，也與真實 POSIX 行為矛盾。';
 lesson.l3.checks.unshift('執行真正 Linux inode/OFD lab，驗證 nlink=2→1→0、unlink 後 FD 仍可讀、dup/fork 共享 offset 和 waitpid 同步；不得只接受 hard-link 計數算術題。');
 lesson.l3.steps.push('Linux L3 原生作業：node tests/os-ofd-inode.cjs；延伸自行改為兩次獨立 open，提出 offset 不共享的反例，並列出檔案物件／FD／OFD 三層生命週期。');
})(window);
