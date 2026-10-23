# OS LAB｜Linux / WSL2 實驗與程式實作指南

> **實驗版本**：Node.js 22+、Linux / WSL2，安裝 `python3`、`cc`、`c++`。以下指令均從 **os-lab 儲存庫根目錄**執行。瀏覽器 Judge 的 C/C++/Python 執行環境是 WASM/Pyodide，並不等於 Linux Kernel。

## 如何區分驗證範圍

| 工具 | 實際驗證什麼 | **不能**據此宣稱 |
|---|---|---|
| `l3-verify.cjs` | 29 題教材測資與獨立演算法 oracle 的一致性 | 學生程式 AC |
| `student-verify.cjs` | 真正編譯／執行指定學生原始碼，逐組核對 stdout | Kernel/POSIX 實作正確；安全 sandbox |
| `tests/os-student-verify.cjs` | 第 7 章 FIFO 的 C/C++/Python/JS 參考解各通過三組題 | 所有 29 題均有四語言 AC |
| `tests/os-all-python-ac.cjs` | **29 個章節的實際 Python 參考原始碼**經本機學生評測器通過 87 組測資 | 其他三語言已全部 AC |
| `tests/os-capstone-student.cjs` | 8 道綜合題以**各自的 JavaScript 演算法實作**跑完公開/隱藏測資，拒絕錯誤答案 | C/C++/Python 八題均 AC |
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
| `epoll-demo.c` | 9、22、27 | 真正 socketpair + Linux epoll 的 LT/ET、partial read、EAGAIN |
| `condvar-demo.c` | 3、23 | mutex / condvar / predicate loop |
| `bounded-queue.c` | 3、5、16、23 | Linux 8 pthread、容量 7 的 producer–consumer；exactly-once、守恆、spurious wake 防護 |
| `cow-demo.c` | 6、24 | mmap/COW、父子位址空間 |
| `durable-replace.c` | 8、26 | write/fsync/rename/dir fsync |
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
node tests/os-pthread-queue.cjs
# Linux epoll: LT 保留未讀資料就緒；ET 不再發新邊緣，需 drain 至 EAGAIN
python3 os/linux-labs/l4/selftest.py
```

L4 的負載、資料留存、採樣方法、p50/p95/p99 與完整報告 rubric 詳見 [L4 專案規格](l4/README.md)。

## 作業繳交與審查

每項 L2/L3 作業至少繳交：題目與假設、輸入與預期輸出、演算法狀態表、可編譯原始碼、系統／編譯器版本、真實執行命令和輸出、邊界案例、反例、失敗原因。不應把「看過教材」或「顯示 DONE」誤認為 **Mastered**。即使一題通過自動評測，也仍須依 [16 週課綱](../SYLLABUS.md) 審查推導與實作能力。
