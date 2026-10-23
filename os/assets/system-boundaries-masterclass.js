/* Authored system-observation traces must correspond to the native lab. */
'use strict';
(function(global){
 const specs=[
 [1,['呼叫','前提','返回值','語意'],[
 ['read pipe','writer開啟、無資料、O_NONBLOCK','-1 / EAGAIN','暫不可讀，非 EOF'],
 ['write pipe','寫入 AB 兩個 bytes','2','byte-stream 有兩個新位元組'],
 ['read buffer(1)','仍有 AB','1 / A','仍有 B'],
 ['read buffer(1)','僅餘 B','1 / B','資料消耗完畢'],
 ['read after close writer','buffer 空','0','EOF']]],
 [9,['事件','buffer','讀取','結果'],[
 ['writer 存在且 buffer 空','空','read 1','EAGAIN'],
 ['寫入 AB','AB','write 2','返回2'],
 ['第一次短讀','AB','read 1','A，剩 B'],
 ['第二次短讀','B','read 1','B，剩空'],
 ['關閉所有 writer','空','read 1','EOF']]],
 [10,['實際呼叫','檔案 mode','group write bit','結論'],[
 ['mkstemp','新檔依 umask','未知','不能假設起始模式'],
 ['fchmod(fd,0640)','0640','0','group 不可由基本位元寫入'],
 ['fstat(fd)','0640','0','觀測實際 mode bits'],
 ['unlink 名稱','0640','0','既有 FD 尚可操作 inode']]],
 [11,['來源','觀察內容','OS 機制','不能推論'],[
 ['/proc/self/ns/pid','pid:[inode]','PID namespace 身分','尚未證明跨容器隔離'],
 ['/proc/self/cgroup','cgroup 隸屬記錄','資源控制階層','尚未證明 quota 正在 throttling'],
 ['getpid','行程自身 PID','PID 映射視角','不等於 host PID'],
 ['對照兩 process','namespace inode 是否不同','跨行程識別觀察','不能只靠檔案存在推論隔離']]],
 [28,['量測項','來源','可得資訊','不能得出'],[
 ['rusage minflt','getrusage','minor fault 累計','不能等同 swap'],
 ['rusage majflt','getrusage','major fault 累計','不等同持續 thrashing'],
 ['cgroup membership','/proc/self/cgroup','所屬資源群組','無法直接推定 CPU busy'],
 ['namespace','/proc/self/ns/pid','PID namespace ID','無法歸因 p99'],
 ['strace/perf/PSI','須另外執行','不同系統 bottleneck','不可單靠其中一項確定原因']]]];
 const lessons=global.OS_DATA?.lessons;
 if(!lessons)return;
 for(const [id,headers,rows] of specs){
  const x=lessons.find(l=>l.id===id)?.textbook;
  if(!x)throw Error('Missing OS L2 base lesson '+id);
  x.stateHeaders=headers;x.stateRows=rows;
  x.algorithm.push('對照真實 Linux 的 syscall return、errno、fchmod/fstat mode bits、/proc namespace/cgroup 與 getrusage，逐事件推論；不可把前端示範當作真正 kernel 執行。');
  x.worked+='\n\nLinux Worked Example：依上表順序觀察 EAGAIN→write AB→兩次 partial read→EOF，並獨立檢查基本 DAC mode=0640；容器與效能資訊只能列為後續實測線索。執行 node tests/os-system-boundaries.cjs 重現。';
  x.invariant+=' syscall 的 -1/EAGAIN、正整數 bytes、0/EOF 彼此不同；mode bits 無法單獨代表有效 ACL/root/capability 權限。';
  x.counterexample+=' 只看到 /proc/self/ns/pid 或 /proc/self/cgroup 檔案存在，不足以證明容器隔離生效或 CPU quota 已造成 throttling。';
  x.l3.checks.push('實際執行 Linux system-boundaries.c 對照每個 syscall return、errno、權限位元與觀測範圍。');
  x.l3.steps.push('執行 node tests/os-system-boundaries.cjs，再分辨 root/ACL 的存取效力與 namespace/cgroup membership 的限制。');
 }
 global.OS_SYSTEM_BOUNDARIES={chapters:specs.map(z=>z[0])};
})(window);
