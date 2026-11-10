# OS LAB：資工系作業系統深化課程

本版以 **Operating System Concepts**、**Operating Systems: Three Easy Pieces (OSTEP)** 的課程深度為參照設計原創繁體中文教材，不複製教科書原文；所有新內容均以資工系學生可以「描述系統模型、推導執行流程、提出反例、實測或實作驗證」為目標。

## 課程規模與相容性

- **29 章、174 題選擇測驗（每章六題）、29 個章節模擬實驗、37 道 C / C++ / Python / JavaScript 判題（29 入門＋8 綜合）**。21 個原始章節的穩定 ID 0–20、原有教材與測驗、實驗 ID 與 `os_lab_2026_v1` 進度鍵均不改動。
- 加入 **21 章 × L2/L3 延伸講義**；原先 21 章每章四個子題，新增對底層機制、邊界案例、可驗證推導的深入章節。
- 新增 **8 章**：開機/ELF、IPC、Atomic/Condition Variable、四級頁表/COW、Working Set/Clock、VFS/Journaling、epoll/NVMe、Linux 觀測/cgroups。新章在對應主題單元插入，總複習仍維持最末章。
- 所有新章節都包含 3 項學習目標、導入問題、類比、機制說明、L2 分析、L3 作業、分步流程、限制、重點回顧、程式示例、術語、互動模擬與四題測驗。
- 舊版 OS 原有的 SRTF 操作挑戰繼續保留；額外新增每章一題的四語言 Judge 題。
- **內容範圍限制**：模擬器只實現課程指定的抽象模型，不代表任何 Linux kernel 的真實實作；瀏覽器的 C/C++/Python/Javascript Judge 也不是完整 Linux 系統，不能直接執行 POSIX fork、mmap、pthread 或開真正的 epoll descriptor。

## 進階授課與評量

| 層級 | 標準 | 每章可交付產物 |
| --- | --- | --- |
| L1 概念 | 解釋術語、資源、協定與流程 | 測驗、重點筆記、實驗預測 |
| L2 原理 | 正確追蹤資料結構、時間線、公式與不變量 | 狀態轉移表、定量計算、反例 |
| L3 驗證 | 設計可反駁假設、測試或程式並歸納界限 | 實驗紀錄、可執行程式、失敗案例與比較 |

建議學術評量為：選擇題首輪至少 80% 正確、完成實驗反例、通過程式測資，再提交 L3 小報告。本版**仍保留既有「完成測驗即記錄進度」規則**；建議的掌握度標準尚未成為網站硬性門檻，避免擅自破壞原本進度與遊戲體驗。

## 八個新章教材／模擬

| 章節內部 ID | 課程主題 | 核心 L2 | L3 與模擬 |
| --- | --- | --- | --- |
| 21 | Kernel Architecture / Boot / ELF | 核心特權邊界、boot chain、ELF segments | 選擇故障注入階段追蹤 Boot→Kernel→PID1 |
| 22 | IPC / Pipe / Signal / shm | EOF 端點計數、partial I/O、signal 安全限制 | Pipe buffer、writer 數量、Blocking/Nonblocking |
| 23 | CAS / Memory Ordering / Condvar | Happens-before 與 predicate | Spurious wakeup、if vs while |
| 24 | Multi-level Page Table / COW / mmap | 9+9+9+9+12 位元索引與 COW fault | MAP_PRIVATE / MAP_SHARED 值的可見性 |
| 25 | Working Set / Clock | Reference bit 與 Second Chance | Clock hand、三框策略逐步推導 |
| 26 | VFS / inode / Journal | rename 原子性 vs fsync 持久性 | crash before/after durable commit |
| 27 | epoll / DMA / NVMe | readiness vs completion、LT/ET | buffer 部分讀取與再次通知 |
| 28 | procfs / perf / cgroups | quota、throttling、PSI | 收集獨立證據、評估瓶頸 |

## 真實 Linux / WSL2 實驗

`os/linux-labs/` 提供**可編譯的 POSIX C 完整小程式**。適用 Linux、WSL2；macOS 的若干部分可行但系統觀測語意不一定一致。Linux 實驗與網頁 Judge 是**互補**而非互相替代。

### 作業 A：Pipe / fork / waitpid

```bash
cc -std=c11 -Wall -Wextra -Werror os/linux-labs/pipe-demo.c -o /tmp/pipe-demo
/tmp/pipe-demo
# 預期：hello IPC
```

延伸：讓父行程故意保留 writer，觀察 reader 在所有 buffer 讀完後無法取得 EOF；實驗結束記得處理等待與關閉 fd，避免懸掛工作。

### 作業 B：Condition Variable

```bash
cc -std=c11 -Wall -Wextra -Werror -pthread os/linux-labs/condvar-demo.c -o /tmp/condvar-demo
/tmp/condvar-demo
# 預期：ready=1 seen=1
```

延伸：討論如果使用 `if(!ready)` 而非 `while(!ready)`，假喚醒／競爭可能造成的錯誤。不要只以一次成功輸出判定 thread safety。

### 作業 C：COW / mmap

```bash
cc -std=c11 -Wall -Wextra -Werror os/linux-labs/cow-demo.c -o /tmp/cow-demo
/tmp/cow-demo
# 預期：parent=5
```

延伸：改成 `MAP_SHARED|MAP_ANONYMOUS`，觀察父子值是否不同；須正確確認原始 `mmap` 寫入權限與 waitpid 的時序。

### 作業 D：耐斷電檔案替換

```bash
cc -std=c11 -Wall -Wextra -Werror os/linux-labs/durable-replace.c -o /tmp/durable-replace
/tmp/durable-replace /tmp/os-lab-durable-test
cat /tmp/os-lab-durable-test/file.txt
# 預期：durable demo
```

使用**新建的測試目錄**。模型遵循先 fsync(temp)，rename，再 fsync(directory) 的常見模式；實際語意仍以 filesystem、mount 和硬體寫入快取保證為準。**不可在正式磁碟拔插電源做實驗**。

### 診斷題作業格式

每份作業交付：系統及 kernel 版本、CPU 架構／核心數、編譯參數、假設與預期、步驟、至少 3 次觀察、哪一筆證據支持或否定哪個假設、這個模型在現實情境的限制及修正方向。

## 程式挑戰

29 題由 `os/assets/advanced-code.js` 註冊，另 8 道演算法專題由 `os/assets/algorithm-capstones.js` 註冊至既有 `CSLab.code`，每題有公開與隱藏測資和四語言 starter。題目聚焦演算法與推導模型，包括 FCFS、Banker、FIFO、Clock、First Fit、位址拆解、Unix 權限、Pipe EOF、COW 可見性及 WAL recovery。**純抽象的 Judge 題不等於操作真實 kernel**；實際 POSIX 操作請以 Linux 範例作業驗收。


## 第二輪教科書深度補強（本 PR）

**每章 L2 完整性：**新增獨立演算法步驟、狀態轉移表（含完整數值）、公式、每個符號與單位定義、逐步推導、不變量與反例。請在觀念頁「進階講義｜演算法推導與實作驗證」查閱，避免只依 L1 概念摘要作答。

**L3 可執行契約：**每章提供標準輸入、預期輸出、邊界測資、重現命令與至少三項驗收條件。由 `os/linux-labs/l3-verify.cjs --chapter <ID>` 或 `--all` 計算獨立模型；它是檢查器，不應直接取代學生交付的演算法程式。

**題庫難度：**每章保留前四題的進度／錯題相容性，另加兩題情境判斷／反例除錯，共 **174 題**。29 道入門程式題中有 **10 題**重新設計為狀態式實作，另新增 **8 道** SRTF、LRU、Banker、COW 等演算法綜合專題（FCFS、FIFO、DAC、區間聯集、Banker、First Fit、FCFS/SSTF、Condition Variable、Clock、WAL）；其他題維持較基礎的入門難度，不能宣稱 29 題全部達高難度。

**數學式：**27 項公式均以原生 MathML 排版，獨立補充符號與適用前提；避免將函數或系統呼叫流程誤當可直接代入的數值公式。

**示例品質：**21 章的 C／Python／Bash 偽碼／缺少 main 或外部檔案的片段已更換為可執行範例。真實 POSIX 操作限定 Linux/WSL2，並提供 GCC 測試。

**自動化驗收：**Node.js 逐章內容結構、獨立演算法答案、程式碼編譯、Chromium 楓之谷／互動／RWD、Chromium 實際 JavaScript 判題、C11/C++17/Python 的 WASM／Pyodide 判題，以及 Chromium/Firefox/WebKit 的 MathML 與行動寬度。個別項目是否通過應以該 PR 最近一次 GitHub Actions 工作結果為準。

## 開發檔案與驗收

- `os/assets/depth.js`：保留 21 原始章節、附加 L2/L3 子題。
- `os/assets/advanced-content.js`：新章節、術語與公式。
- `os/assets/advanced-labs.js`：八個互動實驗，使用共享的 frameLab 介面。
- `os/assets/advanced-code.js`：29 章四語言 Judge 題。
- `os/assets/os-labs.css`：新增表格、長文字與手機排版相容性。
- `os/linux-labs/*.c`：可真正在 Linux/WSL2 編譯的系統實作。
- `tests/os-textbook-review.cjs`：教材與模擬步驟的 Node 靜態結構驗證。
- `tests/os-review.cjs`：全章節瀏覽器回歸測試。
- `tests/os-maple-review.cjs`：楓之谷素材／互動／RWD 回歸測試。
- `.github/workflows/os-textbook-check.yml`：Node、GCC/Clang 與 Chromium CI。

在 root 執行 `node tests/os-textbook-review.cjs`，更完整的瀏覽器／Linux 驗收由 CI 執行。**通過教材檢查不代表四語言實際在瀏覽器編譯全部通過**；測試範圍應依 CI 日誌標註。

## 學術對照

- [Operating System Concepts](https://www.os-book.com/) — 行程、排程、同步、記憶體、儲存、安全的全面基礎
- [Operating Systems: Three Easy Pieces (OSTEP)](https://pages.cs.wisc.edu/~remzi/OSTEP/) — Virtualization、Concurrency、Persistence
- [Linux man-pages project](https://man7.org/linux/man-pages/) — fork/exec/pipe/pthread/mmap/fsync 等原始介面與語意
- [Linux Kernel Documentation](https://docs.kernel.org/) — 當代核心、cgroups、記憶體、I/O 與除錯參考

**本課程為原創教學教材。** 章節內容與互動實驗是為學習建構的可解釋模型，不應當作 Linux kernel 規格或高信賴安全工具。
