# OS LAB 大學部作業系統｜16 週授課大綱（教師版）

> **定位**：每週 3 小時講授／討論、另 2 小時助教實驗；共 16 週。各章不等同等長、也不是每週只講網站摘要。實作以 Linux/WSL2 + C11/POSIX 為主，JavaScript 教學模擬與四語言 Judge 為輔。版本基準 `main@7e605490`、教學增補在 academic-qa 分支。

## 課程目標／先修
- 先修：資料結構與演算法（queue、heap、graph、complexity）、C 基礎（pointer、array、I/O、compile/link）、計算機組織（interrupt/privilege/virtual address）、基本 Linux shell/Git。
- CLO-1（L1）：正確說明抽象與實際 OS/Linux 的差別、使用情境和設計取捨。
- CLO-2（L2）：以狀態表、事件線、公式、反例與不變量推導排程／記憶體／同步／儲存。
- CLO-3（L3）：用 C11/POSIX 撰寫可測試 Linux 程式，處理 failure/partial I/O/thread safety 並可重現。
- CLO-4（L4）：量測系統效能與穩定性、提出假說、交叉佐證、修復後 A/B 比較且報告限制。

## 16 週教學安排

| 週 | 課程章節 ID／主題 | 課堂推導或實驗 | 交付與檢核 |
|---:|---|---|---|
| 1 | 0 CPU、1 Kernel/System Call、21 Boot/ELF | privilege boundary、trap vs context switch、`readelf -l` | 控制流 trace＋先修診斷 |
| 2 | 2 Process、14 Linux 工具 | fork/exec/waitpid、process tree、exit/zombie | C11 process lab，父/子與失敗處理 |
| 3 | 22 Pipe/Signal/Shared Memory | pipe buffer/EOF、close inheritance、EINTR/partial I/O | POSIX pipe Lab＋狀態表 |
| 4 | 3 Thread、5 Race/Deadlock | data race、mutex owner、wait-for graph | pthread mutex 實驗與反例 |
| 5 | 16 Semaphore、23 Atomic/Condvar | producer–consumer；spurious wake，happens-before | condvar lab 與 while predicate 判定 |
| 6 | 4 CPU Scheduling | FCFS/SJF/SRTF/RR、idle、tie-breaking、CT/TAT/WT/RT | 事件驅動排程器 starter/測資 |
| 7 | 20 Priority/MLFQ/Multicore | queue promotion/demotion、aging、starvation | MLFQ traces，policy comparison |
| 8 | 17 Deadlock/Banker | Available/Max/Alloc/Need，safe/request trial | 期中考：L2 手算與反例，安全序列程式 |
| 9 | 6 Paging/TLB、24 Page Table/COW/mmap | 4-level address walk、TLB/EAT、PTE、COW | 地址翻譯 Judge＋mmap C Lab |
| 10 | 7 Page Fault、25 Working Set/Clock | FIFO/LRU/OPT/Clock、Belady、thrashing | 替換模型及反例測試 |
| 11 | 18 Contiguous Allocation | first/best/worst fit、coalesce、fragmentation | 分配器 trace 與反例 |
| 12 | 8 File System、26 VFS/Journal/Crash | FD→OFT→inode；WAL、fsync/rename/dirfsync | 持久化 C Lab＋受控邏輯 crash trace |
| 13 | 19 Disk、9 I/O、27 epoll/NVMe | HDD seek vs SSD、LT/ET、EAGAIN、buffer pressure | I/O 狀態測試、設計取捨短答 |
| 14 | 10 Protection、11 Virtualization | owner/group/other/ACL、capability、VM/container | 最小權限測試、隔離與錯誤權限反例 |
| 15 | 12 Queueing/Performance、28 Observability | Little/M/M/1、PSI、cgroup、strace、perf | L4 A/B 實驗第一批原始數據 |
| 16 | 13 API Journey、15 Integration Review | CPU/thread/memory/file I/O 跨層解題與報告 | L4 發表、期末口試、課程整合 |

## 成績與通過條件（老師可依系所規定調整）

| 構面 | 權重 | 所對應 CLO | 評分依據 |
|---|---:|---|---|
| 章末測驗與 L1 概念問答 | 15% | 1 | 第一次作答與解析；不以重考分數冒充首輪 |
| L2 手算／狀態表／反例作業 | 25% | 2 | 每步 Work/Queue/PTE 等狀態與不變量，錯一步能定位 |
| L3 Linux/POSIX 作業與 Judge | 30% | 2,3 | 給定輸入、輸出、編譯命令、隱藏測資、異常／邊界 |
| 期中分析考 | 10% | 1,2 | 答案需有證據、公式前提與設計推論 |
| L4 整合診斷專題 | 20% | 2,3,4 | 詳見 `linux-labs/l4/README.md` rubric |

### Viewed / Completed / Mastered（原始資料不能冒充掌握）

- **Viewed**：有閱讀行為紀錄 `store.learn[id]` 或進入活動的已保存狀態。僅表示接觸。
- **Completed**：本章實驗、測驗或程式作業已完成既定流程；目前網站 `store.done[id]` 僅代表測驗完成，**不代表 80% 或掌握**。保留 `os_lab_2026_v1` 以相容舊進度。
- **Mastered（正式學術語意）**：L1 首輪至少 80%、核心 L2 推導題依 rubric 通過、適用 L3 Linux 作業驗證通過；需要真人查核者記為待審。**目前網站尚未完整落實三級 Mastered 記錄及審核 UI；不得把 `done` 自動升級為 Mastered**。

### L2 Rubric（每章 10 分）
1. 前提與資料結構（2）：清楚列出 input、模型限制、符號與單位。
2. 逐步推導（4）：每步狀態、排程/映射/條件分支正確，沒有跨步。
3. 不變量與正確性（2）：能解釋 invariant 並給對應反例。
4. 權衡與真實系統差異（2）：能指出抽象模型限制。

每章 8/10 以上，且「逐步推導」至少 3/4 方可通過 L2；兩次可重做但記錄歷次成績。無法適用數值推導時改成完整因果/系統追蹤。

### L3 Rubric（每項 10 分）
- 正常與公開案例（2）、隱藏/邊界/非法輸入（3）、資源正確性與錯誤處理（2）、可重現操作與清理（2）、反例分析（1）。
- C11 使用 `-Wall -Wextra -Werror` 且檢查退出碼；多執行緒請加 `-pthread`。學生必須提交原始碼、命令、輸入、實際輸出、工具版本與錯誤分析。
- **區分**：starter 能編譯、參考解本機能 AC、參考解瀏覽器能 AC 是三個不同結論。新 `student-verify.cjs` 可本機評測 29 章題，不能直接驗證真實 kernel 操作；POSIX 功能需獨立檢核。

### L4 範例：Linux 服務效能與穩定性診斷

含真實本機服務、負載產生器、兩個 mode、p50/p95/p99、throughput、受限 crash-free fault experiments、`/proc`/strace/perf/cgroup 取證、可執行自測。規格、命令、輸入輸出和報告範本參見 [L4 實驗](linux-labs/l4/README.md)。

## 教材與外部參照
- CS2023 Operating Systems KA Final Report（ACM/IEEE-CS/AAAI）https://csed.acm.org/ 。
- *Operating System Concepts*（Silberschatz/Galvin/Gagne；依學校使用版本指定章節）。
- *Operating Systems: Three Easy Pieces*（OSTEP；依 virtualization/concurrency/persistence 三線搭配）。
- MIT xv6 6.1810 https://pdos.csail.mit.edu/6.1810/2025/overview.html 。
- Linux man-pages https://man7.org/linux/man-pages/ 及 Linux Kernel Docs https://docs.kernel.org/ 。
