# OS LAB｜Linux / WSL2 實驗與程式實作指南

> **實驗版本**：Node.js 22+、Linux / WSL2，安裝 `python3`、`cc`、`c++`。以下指令均從 **os-lab 儲存庫根目錄**執行。瀏覽器 Judge 的 C/C++/Python 執行環境是 WASM/Pyodide，並不等於 Linux Kernel。

## 如何區分驗證範圍

| 工具 | 實際驗證什麼 | **不能**據此宣稱 |
|---|---|---|
| `l3-verify.cjs` | 29 題教材測資與獨立演算法 oracle 的一致性 | 學生程式 AC |
| `student-verify.cjs` | 真正編譯／執行指定學生原始碼，逐組核對 stdout | Kernel/POSIX 實作正確；安全 sandbox |
| `tests/os-student-verify.cjs` | 第 7 章 FIFO 的 C/C++/Python/JS 參考解各通過三組題 | 所有 29 題均有四語言 AC |
| `tests/os-all-python-ac.cjs` | **29 個章節的實際 Python 參考原始碼**經本機學生評測器通過 87 組測資 | 未透過正式 Linux 系統互動驗收 |
| `tests/os-all-native-ac.cjs` | 29 章 × C11/C++17：真正編譯並執行學生評測器 | 所有 POSIX syscall 行為均被測試 |
| `tests/os-all-js-ac.cjs` | 29 章 JavaScript 參考原始碼，經 Node 判題器驗收 | 等於已在所有瀏覽器與 WASM 完整通過 |
| `tests/os-python-property.cjs` | 額外產生 **1,200 組先前未列入題庫的亂數案例**，實際執行 Python 排程／FIFO／區間／Banker／磁碟／Clock 程式，獨立比對預期輸出 | 所有題目的所有非法輸入／所有演算法變種已驗證 |
| `tests/os-capstone-student.cjs` | 8 道綜合題以各自的 JavaScript 演算法實作跑完公開/隱藏測資，拒絕錯誤答案 | C/C++/Python 八題均 AC |
| `tests/os-capstone-native-ac.cjs` | 八道進階題 C11/C++17/Python 各有實際可編譯、可執行參考來源，全部由同一學生評測器驗收 | 已驗證真實 Linux syscall 或全瀏覽器 WASM 相容性 |
| `tests/os-scheduling-model.cjs` | 排程手算 Gantt、四演算法與 randomized invariants | 對應真實 Linux scheduler |
| `tests/os-banker-model.cjs` | Banker safety/request、向量守恆、拒絕回滾 | 實際 Linux 正在執行 Banker |
| `tests/os-replacement-model.cjs` | FIFO/LRU/OPT 逐步表與 Clock、窮舉最佳性、LRU stack property | Linux page reclaim 等於教學模型 |

### 第一階：核對教材標準答案（不涉及自己的程式）

```bash
node os/linux-labs/l3-verify.cjs --all
node tests/os-scheduling-model.cjs
node tests/os-banker-model.cjs
node tests/os-replacement-model.cjs
```

### 第二階：評測自己寫的程式（實際編譯與執行）

每道入門題使用固定章節 ID 0..28；每題有公開＋隱藏三個**測資群組**，一個群組通常又包含多筆測試案例。

```bash
# 第 4 章：FCFS 等待時間；測試 Linux 上自己的 C11 程式
node os/linux-labs/student-verify.cjs \
  --chapter 4 --language c --source solution.c

# 第 7 章：FIFO；也可以使用 Python
node os/linux-labs/student-verify.cjs \
  --chapter 7 --language python --source fifo.py

# 其他可用的語言：cpp、javascript
node os/linux-labs/student-verify.cjs \
  --chapter 7 --language cpp --source fifo.cpp

# 單一測資群組超時上限，可依可信機器調整（100..30000 ms）
node os/linux-labs/student-verify.cjs \
  --chapter 7 --language javascript --source fifo.js --timeout-ms 3000
```

8 道進階題必須用 `--challenge`，**不是** `--chapter`，即使主題位於同一章。

| 進階專題 ID | 運算或狀態要求 | 核心邊界 |
|---|---|---|
| `os.capstone.srtf` | SRTF 每 tick 搶先，計算 WT/RT | 同分與 CPU idle |
| `os.capstone.lru` | LRU 每次 hit 都更新最近使用 | FIFO 誤實作 |
| `os.capstone.banker` | 多行程／雙資源 Need、Work、Finish | UNSAFE 不可當作 WAIT |
| `os.capstone.pagetable` | VPN、頁內位移、權限 | PAGE_FAULT 與 PROTECTION |
| `os.capstone.clock` | 清 reference bit、選 victim、移 hand | 全 bit=1 與 hand wrap |
| `os.capstone.journal` | 多交易 WAL commit/recovery | 未提交交易不可恢復 |
| `os.capstone.alloc` | First Fit，分割剩餘空間 | 失敗與 0 bytes |
| `os.capstone.epoll` | 教學版 LT/ET buffer 通知 | 部分讀取與殘留 bytes |

```bash
node os/linux-labs/student-verify.cjs \
  --challenge os.capstone.srtf --language c --source srtf.c

node os/linux-labs/student-verify.cjs \
  --challenge os.capstone.lru --language python --source lru.py

node os/linux-labs/student-verify.cjs \
  --challenge os.capstone.clock --language javascript --source clock.js
```

`RESULT 3/3 groups passed, 0 failed` 才表示**在此題庫與此環境**通過；不能保證所有非規格輸入、安全性或性能都正確。每個群組會顯示 `PUBLIC` 或 `HIDDEN`、`PASS / WRONG ANSWER / TIMEOUT / RUNTIME ERROR`。C/C++ 編譯採 `-Wall -Wextra -Werror`。

**執行安全**：程式評測器會在**本機直接執行所指定的原始碼**，只是使用暫存工作目錄與逾時設定，沒有 sandbox 隔離。不要拿它評測來源不明、未經信任的程式；課堂大型多人提交平台應使用真正隔離式評測基礎設施。

### 第三階：操作真實 Linux 系統

| 作業 | 相關章節 | 觀測重點 |
|---|---|---|
| `pipe-demo.c` | 2、22 | fork/pipe/close/waitpid、EOF |
| `process-exec-demo.c` | 2、14、21 | 真正 fork → exec → waitpid、失敗 errno/exit status |
| `ofd-inode-demo.c` | 8、22、26 | Linux hard link、unlink 後仍保有 FD、dup/fork 共享 open-file-description offset |
| `epoll-demo.c` | 9、22、27 | 真正 socketpair + Linux epoll 的 LT/ET、partial read、EAGAIN |
| `condvar-demo.c` | 3、23 | mutex / condvar / predicate loop |
| `bounded-queue.c` | 3、5、16、23 | Linux 8 pthread、容量 7 的 producer–consumer；exactly-once、守恆、spurious wake 防護 |
| `cow-demo.c` | 6、24 | mmap/COW、父子位址空間 |
| `pagefault-observe.c` | 7、24、25 | `getrusage(RUSAGE_SELF)` 實測第一次觸碰匿名分頁的 minor/major faults；**不會觸發交換，也不等於 thrashing** |
| `durable-replace.c` | 8、26 | write/fsync/rename/dir fsync |
| `wal-recovery-demo.py` | 8、26 | 真實 append/fsync、`before_commit` 與 `after_fsync` 行程崩潰、完整 COMMIT replay、尾端破損紀錄處理；**不是斷電試驗** |
| `l4/` | 12、13、28 | HTTP 真實服務的受控鎖競爭、延遲分布與因果診斷 |

```bash
# POSIX 範例：編譯與執行
mkdir -p /tmp/os-lab
cc -std=c11 -Wall -Wextra -Werror os/linux-labs/pipe-demo.c -o /tmp/os-lab/pipe
/tmp/os-lab/pipe
# hello IPC

cc -std=c11 -Wall -Wextra -Werror -pthread os/linux-labs/condvar-demo.c -o /tmp/os-lab/condvar
/tmp/os-lab/condvar
# ready=1 seen=1

node tests/os-posix-process-io.cjs
node tests/os-ofd-inode.cjs
node tests/os-ofd-model.cjs
node tests/os-pthread-queue.cjs
node tests/os-linux-pagefault.cjs
node tests/os-wal-recovery.cjs
# Linux epoll: LT 保留未讀資料就緒；ET 不再發新邊緣，需 drain 至 EAGAIN
python3 os/linux-labs/l4/selftest.py
```

L4 的負載、資料留存、採樣方法、p50/p95/p99 與完整報告 rubric 詳見 [L4 專案規格](l4/README.md)。

## 作業繳交與審查

每項 L2/L3 作業至少繳交：題目與假設、輸入與預期輸出、演算法狀態表、可編譯原始碼、系統／編譯器版本、真實執行命令和輸出、邊界案例、反例、失敗原因。不應把「看過教材」或「顯示 DONE」誤認為 **Mastered**。即使一題通過自動評測，也仍須依 [16 週課綱](../SYLLABUS.md) 審查推導與實作能力。


## P0｜測資及評量可信度邊界

靜態 GitHub Pages **沒有保密 hidden tests**：即使題庫內 `visible:false`，其 `input`、`output` 仍包含於 `advanced-code.js` 或 `algorithm-capstones.js`，使用者可從開發者工具讀取。為保護舊題 ID、紀錄和 Judge 相容性，本次**不變更**原先 `cases` 的測試順序與 `visible` 旗標；介面改稱「額外練習」，不再將其宣稱成防作弊的正式隱藏測資。`tests/os-*ac.cjs`、`student-verify.cjs` 的公開／隱藏測資亦為儲存庫中可讀取的開放回歸測資，不是祕密考題。

正式考試必須在**另行部署且具隔離執行環境的可信後端**保存不隨網站發送的保密測資，採身分驗證、提交時限、執行資源限制、稽核紀錄與教師覆核。前端 `solved` 與 `os_lab_academic_v1` 均不能核發 Mastered。反例與作業示範（例如 Belady/FIFO、WAL crash）應保持可見，絕不拿已公開的教學反例當保密成績判準。


## L2 客觀練習（29 章）

每章另有一題可客觀核對的數值／狀態推導。練習題與解析載於 `os/assets/l2-objective.js`；數字容許等值小數表示，狀態答案不分大小寫。答錯不得取得客觀練習紀錄，回答正確才記錄本機 `objective.passed`。**L2 自評總分與文字本身不構成通過**：可送審條件需同時具備客觀練習答案、逐步推導自評、首次測驗紀錄與 Judge 練習紀錄；所有紀錄仍可自行修改，因此只能供學員自檢與教師後續核查，**絕非正式通過或 Mastered**。

```bash
node tests/os-l2-objective.cjs
node tests/os-quiz-quality.cjs
```

題目鑑別度需依真實學生作答資料另行計算難度與 point-biserial，無法單從字串長度或 CI 成功認定。
