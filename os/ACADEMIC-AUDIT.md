# OS LAB 正式教材初始 Audit Matrix（第 1 批）
**基準：** `main@7e60549069f65a7c86859a2ab289b0d7666ba3f4`（PR #5 已合併）；2026-10-24。對照 `content.js`、`depth.js`、`advanced-content.js`、`textbook-traces-{1,2}.js`、`textbook-rigor.js`、`advanced-code.js`、`algorithm-capstones.js`、`l3-verify.cjs` 及現有測試、CI。**這是待逐章教員二次審核的基線，不是 29 章已合格的證書。**

## 驗證口徑與全課共同缺口

- **L1：有**代表有原創教學段落、學習目標、測驗與模擬器；**未獨立教員簽核語意正確性**。
- **L2：部分**代表已具演算法簡述、公式（如適用）、數值／因果例題、狀態表、反例；但不能因 `textbook` 欄位存在、字數或通過形式驗證就稱「完整」。
- **L3：部分**代表每章有瀏覽器程式題和本機 oracle；只有特定主題具 POSIX C 範例。新增的 `student-verify.cjs` 可編譯並執行學生 C/C++/Python/JS 程式、比較公開/隱藏結果，但**不是能驗證真實 Linux syscall 的容器沙盒**。
- **題目：** 每章原有 4 題+新增 2 題情境題，部分原題干擾選項過弱；29 題章節 Judge 與 8 題 capstone 難度不均，不能合併計數視同 37 題均為正式演算法題。
- **數學：** 27 張 MathML 公式卡與逐章 MathML，尚須人工逐一核對符號、前提、代入、反例，尤其 TLB EAT、Page Fault EAT、Queueing、CPU quota、durability。
- **模擬器：** 29 章均有互動登錄，只有部分具可證明的獨立狀態模型。尚缺 simulator vs independent oracle 的全覆蓋 property/mutation test。
- **CI：** PR #5 曾成功；`pages.yml` 原本缺合併後部署驗證依賴，於本批分支增設新閘門，尚待新 CI 驗收。
- **進度：** `os_lab_2026_v1` 相容，現有 `learn/lab/done/code` 是行為紀錄，**沒有正式 Mastered 語意與 L2/L3 教員審核流程**。不將舊 `done` 自動升等。
- **瀏覽器：** 現有 Chromium/Firefox/WebKit QA 不等於 iOS Safari 實機；360/430px、新公式螢幕閱讀器、離線失敗仍未全部覆蓋。

## 29 章稽核矩陣

欄位說明：所有章節現況 **L1 已建／L2 部分／L3 部分或待補**，詳細缺陷在最後欄；優先級以對正式教材風險分類。L3 POSIX 標記僅代表存在對應小範例，不代表作業全規格完成。

| ID | 主題 | 先修章 ID | 可檢核學習成果 | L1/L2/L3 | 例題、狀態與現況缺口（含模型/測驗/Judge） | 優先 |
|---:|---|---|---|---|---|:---:|
| 0 | CPU 與指令控制流 | — | 區分取指/例外/中斷 | 有/部分/部分 | PC 例題只涵蓋順序取指；缺完整 privilege/IRQ trace | P1 |
| 1 | Kernel/System Call | 0 | 追蹤 user→kernel 與錯誤回傳 | 有/部分/部分 | 系統呼叫判題僅回傳值分類，缺 EINTR/restart/ABI 狀態實作 | P1 |
| 2 | Process 生命週期 | 1,21 | 追蹤 fork/exec/wait/zombie | 有/部分/部分 | 2^n 範例不足以驗證 zombie 與失敗回收；POSIX 範例部分覆蓋 | P1 |
| 3 | Thread/Parallelism | 2,5 | 證明共享與 thread 隔離 | 有/部分/部分 | 判題僅共享分類；未檢測競態 interleaving 的未定義行為 | P1 |
| 4 | Scheduling | 2,3 | 計算 Gantt/CT/TAT/WT/RT | 有/部分/部分 | FCFS 及 SRTF 有模型；尚缺完整 RR/SJF/context-switch 成本一致追蹤 | P1 |
| 5 | Race/Deadlock | 3,23 | 構造失敗 interleaving 與 wait-for graph | 有/部分/部分 | x+1 基本題太淺；deadlock 必須驗證環、mutex owner 不變量 | P1 |
| 6 | Paging/TLB | 0,1 | 追蹤 VPN/PFN/PTE/有效存取時間 | 有/部分/部分 | 已見位址分拆；欠 TLB+頁表跨層權限與 fault 的單一狀態追蹤 | P1 |
| 7 | Page Fault/Replacement | 6 | 推導 FIFO/LRU/OPT/Clock | 有/部分/部分 | FIFO 題可逐步算，LRU capstone 有；需要 fault state/OPT 證據與反例 | P1 |
| 8 | File System | 2,6 | 追蹤 FD/OFT/inode/hard link | 有/部分/部分 | link count 只有算術；缺 open file table 與持久化狀態實作 | P1 |
| 9 | I/O/Interrupt | 1,8 | 解釋 blocking/partial I/O 與事件 | 有/部分/部分 | 僅 readyBytes/nonblocking 分類；EOF/EINTR/fd ready 尚未整合 | P1 |
| 10 | Protection/Security | 1,8 | 檢查 DAC/ACL/存取與目錄 traverse | 有/部分/部分 | mode bit 判定受簡化假設限制；未與使用者身分、ACL 結合 | P1 |
| 11 | VM/Container | 6,10 | 區分 namespace/cgroup/hypervisor | 有/部分/部分 | 主要題目偏 quota 百分比，缺失敗隔離、資源控制取證 | P2 |
| 12 | Performance/Queueing | 4,9 | 推導 Little/M/M/1 與假設 | 有/部分/部分 | Little's Law 例題有，但尚無穩態/分位數反例的數據作業 | P1 |
| 13 | Request Journey | 2,9,12 | 解讀端到端追蹤與重疊時間 | 有/部分/部分 | 區間聯集有題；缺真實服務工具證據，L4 補充中 | P1 |
| 14 | Linux/C 工具 | 2,22 | 觀察程序樹、退出與系統呼叫 | 有/部分/部分 | 2^n 與本機 C 範例；缺具錯誤注入的完整 fork/exec/wait | P1 |
| 15 | Integration Review | 0–14 | 跨子系統定位症狀 | 有/部分/部分 | 分類題不能證明跨層能力；需 L4 證據與教師審核 | P1 |
| 16 | Semaphore/Producer Consumer | 3,5 | 證明 0≤count≤capacity 及等待正確 | 有/部分/部分 | 計數題只驗 empty/full，缺多 producer/consumer 交錯與死結 | P1 |
| 17 | Deadlock/Banker | 5,16 | 逐維計算 Need/Work/Finish/Request | 有/部分/部分 | 安全序列 capstone 有；Request Trial、不合法資源要求尚不足 | P1 |
| 18 | Allocation/Fragmentation | 6 | 模擬 First/Best/Worst Fit 與 coalescing | 有/部分/部分 | 現有 First Fit 可驗算；缺完整 free/coalesce 事件序列 | P1 |
| 19 | Disk Scheduling/Storage | 8,9 | 計算 seek 及排程策略 | 有/部分/部分 | FCFS/SSTF 存在；SSD/NVMe 與實際 latency 不可類推 | P2 |
| 20 | MLFQ/Multicore | 4 | 維護多級隊列、boost、aging | 有/部分/部分 | 單個 priority transition 不等於完整排程器，待加入多工作狀態 | P1 |
| 21 | Kernel/Boot/ELF | 0,1 | 分析 boot chain/ELF 故障點 | 有/部分/部分 | stage 分類有模型；缺 readelf/execve 工具證據驗收 | P2 |
| 22 | IPC/Pipe/Signal | 2,9 | 證明 fd 引用、EOF 與 partial I/O | 有/部分/部分 | EOF 概念題 + pipe C；需要 nonblocking/partial/error 注入 | P1 |
| 23 | CAS/Condvar/Ordering | 3,5,16 | 驗證 predicate 循環與 happens-before | 有/部分/部分 | while 與 spurious wake 教材已有；缺原生 memory order 對照實驗 | P1 |
| 24 | Multilevel PT/COW/mmap | 6,7 | 推導 PTE、fault、private/shared 寫入 | 有/部分/部分 | MAP_PRIVATE C 範例可執行；欠 page-walk fault 與權限違規完整追蹤 | P1 |
| 25 | Working Set/Clock | 7,24 | 追蹤 reference bits 與 thrashing | 有/部分/部分 | Clock 有 capstone；缺 working-set size/sliding-window 實作 | P1 |
| 26 | VFS/Journaling/Crash | 8,22 | 定義 durable commit 與可恢復性 | 有/部分/部分 | 簡化 WAL 模型；fsync+rename C 範例未涵蓋受控崩潰注入 | P1 |
| 27 | epoll/NVMe | 9,22 | 解釋 LT/ET、EAGAIN、backpressure | 有/部分/部分 | edge 通知抽象題；缺真實 epoll LT/ET C 實驗 | P1 |
| 28 | Linux Observability | 4,12,13 | 結合 /proc、perf、cgroup/PSI 推理 | 有/部分/部分 | 工具分類題太淺；L4 開始提供可重現取證 | P1 |

## 跨章驗收欄位及證據定位（不得只檢字串存在）

| 驗收構面 | 目前檢查方式／證據 | 尚缺必要判定 |
|---|---|---|
| 理論／先修／學習目標 | `content.js`、`advanced-content.js` 的 `goals/details` | 教員對應 LO 的概念問答、真實 OS 例外與反例 |
| Worked Example/狀態表 | `textbook-traces-1.js`、`textbook-traces-2.js` + 網頁 `textbook-rigor.js` | 每個適用演算法完整輸入、每輪狀態、結束條件與人工重算 |
| 數學式語意 | 27 張公式卡、每章 MathML、`tests/os-textbook-review.cjs` | 單位/前提/代入/模型假設、MathML structure 的人工比對 |
| 模擬器 | `labs-core.js`、`labs-more.js`、`advanced-labs.js`、E2E | 不變量、獨立模型、邊界/隨機/mutation 驗證 |
| 測驗 | 174 題（每章 6）及 `assessment-rigor.js` | 干擾選項鑑別度、難度/LO 與題目 ID 一致性 |
| Judge | 29 入門 + 8 進階、`l3-verify.cjs`、`tests/os-judge-native.cjs` | 逐題四語言 reference AC、分辨本機/瀏覽器、拒絕 faulty model |
| Linux 真實實驗 | 4 POSIX C、`os-textbook-check.yml` | syscall error injection、輸入輸出契約、資源清理、觀測紀錄 |
| L4 綜合專題 | 本批 `os/linux-labs/l4/`，兩種服務模式+負載+自測 | 學生個別實驗報告、模型推論與人工審核 |
| 使用者進度與 UI | `shared/cslab-app.js`，`os_lab_2026_v1` | 三層級 Viewed/Completed/Mastered 與不混淆的歷史遷移 |
| 安全／部署 | Worker 程式判題、Pages Workflow 品質閘門 | CI 環境壓力測試、正式主分支保護、iOS Safari 實測 |

## CS2023 Operating Systems Knowledge Area 對照

依 ACM/IEEE-CS/AAAI **CS2023 Final Report Operating Systems (OS)** 劃定範圍，而非錯誤沿用 CS2013 舊版課綱單元。官方參考：https://csed.acm.org/ 、https://csed.acm.org/wp-content/uploads/2025/11/CS2023-Report.htm ；MIT xv6 2025 ：https://pdos.csail.mit.edu/6.1810/2025/overview.html 。

| CS2023 OS Knowledge Unit（正式命名） | 對應 ID | 期望層級 | 缺口與處置 |
|---|---|---|---|
| Role and Purpose of Operating Systems | 0,1,13,15,21 | 必修 L2 | 補各種控制移轉/安全權衡 |
| Principles of Operating System | 0,1,2,21 | 必修 L2 | 程式載入、syscall、kernel/user 與 preemption |
| Concurrency | 3,5,16,22,23 | 必修 L3 | 原生同步、競態反例與 memory order |
| Protection and Safety | 6,10,11,24 | 必修 L2/L3 | 可驗證 DAC/ACL/權限、fault 與隔離 |
| Scheduling | 4,20 | 本科核心 L3 | SJF/SRTF/RR/MLFQ、context switch 與 starvation |
| Process Model | 2,3,14,21,22 | 本科核心 L3 | fork/exec/wait/Zombie、fd 繼承 |
| Memory Management | 6,7,18,24,25 | 本科核心 L3 | paging、fault、COW、working set |
| Device Management | 9,19,27 | 本科核心 L2/L3 | interrupt/DMA、I/O readiness、backpressure |
| File Systems API and Implementation | 8,26 | 本科核心 L3 | FD→OFT→inode、fsync、rename durability |
| Advanced File Systems | 26 | 進階選修 | crash model、logging/journaling 深化 |
| Virtualization | 11,24 | 進階選修 | VM/containers 與成本、資源隔離 |
| Real-time and Embedded Systems | 4,19,20（僅導入） | 進階選修 | deadlines、EDF/RM、可排程性尚缺 |
| Fault Tolerance | 26,28（局部） | 進階選修 | failure model、recovery、可靠性量化 |
| Society, Ethics, and the Profession | 跨課程補充 | 適合 SEP/安全跨課程 | 社會責任、資安與隱私在本課僅簡介 |

**避免無限擴張**：完整網路協定與分散式一致性屬 NC/PDC；CPU pipeline 細節屬 AR；深入密碼學與入侵調查屬 SEC；形式驗證與完整編譯器屬 AL/FPL/SE；統計估計與評量方法可配合 SF/Performance Evaluation，無須全部變成本課必修。

## 仍需執行的審查與 P0/P1/P2

1. **P0** 阻止未通過測試的 main 部署（本分支已實作，CI 需確認）、對測資/公式有確證的錯誤立即修復。
2. **P1** 逐項重建 4/5/6/7/16/17/20/23/24/26/27 章的狀態完整性與 C11 語意；擴充四語言演算法解答、mutation 測試、實驗 fault injection。
3. **P1** 實作 OS 專用 Viewed/Completed/Mastered，需 **L1 首次作答≥80% + L2 客觀判題通過 + L3 驗證**（無 Linux 自動驗收者保持待審），**舊 Completed 不可升級**。
4. **P2** 課堂能力測驗/人工評量、iOS Safari 實機、360/430px、MathML a11y、課程導航/楓之谷外觀回歸。

**目前不應宣稱：** 29 章全 L2 已經教員驗證、29 個 L3 真實 OS 作業、四語言 37 題全 AC、iOS Safari 通過或 L4 學習成果已 Mastered。


## 批次 1B：兩個核心章的實際教材及獨立演算法驗證（新增）

| ID | 交付教材／模型 | 計算例題與驗收 | 成熟度 |
|---:|---|---|---|
| 4 Scheduling | `assets/scheduling-masterclass.js` 已插入正式網頁，完整 FCFS/SJF/SRTF/RR (q=2) 的事件模型、每刻 ready/running/remaining、Gantt、CT/TAT/WT/RT、模型限制與反例 | `tests/os-scheduling-model.cjs`：4 組人工正確答案+800 次隨機政策 trace、不變量、可拒絕非搶先誤用 SRTF | L2 深化已實作；待 CI、人工教材審核與含切換成本之延伸完成 |
| 17 Banker | `assets/banker-masterclass.js` 已插入正式網頁，5 行程 × 3 資源的 Need、Work/Finish、完整安全序列及 4 種 Request（GRANTED/ILLEGAL/WAIT/UNSAFE） | `tests/os-banker-model.cjs`：人工驗證 5 輪安全序列、4 種請求，以及 250 組小規模 exhaustive safety + 250 次 Request/rollback 參照比對 | L2 深化已實作；待 CI、人工教材審核與更大型的 L3 Judge |
 
**注意：** 以上不表示整門課已完整；上述新增測試在 GitHub CI 成功之前不得標示「通過」，依各 commit 的執行紀錄為準。既有 29 題初階 Judge 不會因加入延伸內容而自動變成 L2 演算法題。
