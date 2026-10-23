# OS LAB L4 — Linux 服務效能與穩定性診斷

**類型**：可執行、可自動驗收的 L4 Systems Integration capstone。需 Linux / WSL2、Python 3.10+、GNU/Linux 觀測工具。使用 Python 標準函式庫，不需安裝套件。全程僅綁定 `127.0.0.1`；不可當正式對外服務。

## 學習成果（LO）

- **LO-1 假設**：從 p95/p99、QPS、上下文切換、阻塞與 lock convoy 提出可反駁的瓶頸假說。
- **LO-2 OS 模型**：逐一指出 thread、mutex、CPU scheduling、page-touch/minor faults、同步 `fsync`、queueing 與 tail latency 的因果關係。
- **LO-3 可重現實驗**：控制服務版本、同樣輸入負載與執行環境，重複收集指標與工具證據。
- **LO-4 修復**：在未犧牲資料完整性下縮小 critical section，反證原假說，定量比較改善與副作用。
- **LO-5 報告**：區分「觀測到的關聯」、「已隔離的機制」和「尚不能因果斷言的根因」。

## 實驗機制與安全限制

`service.py` 使用 `ThreadingHTTPServer`、`threading.Lock`、匿名工作記憶體、簡單 CPU loop、日誌 `write` 與 `fsync`。

| 模式 | 教學轉移與鎖範圍 | 預期推論 |
|---|---|---|
| `serialized` | 持有 **共享鎖期間**執行 `sleep(io_ms)` 再寫日誌及 `fsync` | 多請求排隊等待 lock，增加 tail latency |
| `reduced-lock` | 把同等時間的阻塞等待 **移至鎖外**，只在寫日誌/`fsync` 時持鎖 | 多個等待可重疊，但磁碟同步及 GIL 仍可能限制吞吐 |

`sleep` **僅用來模擬外部等待**，不代表真實磁碟存取時間；兩模式的 `fsync` 都是真實 OS 呼叫。CPU loop 是 Python（可能受 GIL 影響），不可用來證明多核 CPU-bound Python threads 可線性加速。測試不保證每次都有相同延遲，不能把「改善率達固定值」設為穩定 CI 驗收。

## 先修與準備

先修章：2/3 行程與執行緒、4/20 排程、5/16/23 同步、6/7/24/25 記憶體、8/26 檔案持久性、9/27 I/O、12/28 觀測。建議 2–3 人一組，4–6 小時。

在專案根目錄執行（兩個終端機）：

```bash
# 終端機 A：基準，僅 localhost
python3 os/linux-labs/l4/service.py --mode serialized --port 8099 --log /tmp/os-l4-before.csv

# 終端機 B：固定負載與產出 JSON
python3 os/linux-labs/l4/load.py --url http://127.0.0.1:8099 \
  --requests 80 --concurrency 8 --io-ms 15 --cpu-steps 1000 --mem-kib 64 \
  --output /tmp/os-l4-before.json

# 手動終止終端機 A 的服務，再以相同負載測修復版
python3 os/linux-labs/l4/service.py --mode reduced-lock --port 8099 --log /tmp/os-l4-after.csv
# 同一個終端機 B 指令，--output 改成 /tmp/os-l4-after.json
```

使用相同 QPS/並行數、同一機器和相近背景負載各測至少 5 輪；保存每輪原始 JSON，不應只挑最好的一輪。需要隔離環境變數時，記錄 Python/Linux kernel/CPU/記憶體，是否在 VM/WSL2 內。

## 系統取證

```bash
pid=$(pgrep -f 'os/linux-labs/l4/service.py' | head -1)
cat /proc/$pid/status | grep -E 'Threads|VmRSS|voluntary_ctxt_switches|nonvoluntary_ctxt_switches'
cat /proc/$pid/sched
cat /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io 2>/dev/null
vmstat 1 5
# 如果有 strace 權限，先小負載執行；追蹤工具可能擾動延遲：
strace -c -p "$pid" -e trace=write,fsync,futex
# 若有 perf 權限，另作 CPU 採樣；不要將缺少權限當實驗失敗：
perf stat -p "$pid" -- sleep 5
cat /sys/fs/cgroup/cpu.stat 2>/dev/null
cat /sys/fs/cgroup/cpu.max 2>/dev/null
```

注意工具資訊的時間窗口、累積型 counter 必須差分、`/proc/pressure` 可能是系統層級，以及 `perf`/`strace` 受權限與採樣擾動影響；不可用單一指標直接宣稱根因。

## 輸入、輸出與判定

- `GET /health`：200 JSON，包括 `status`、`mode`。
- `GET /work?seq=N&io_ms=M&cpu_steps=K&mem_kib=S`：各參數有上限，200 JSON 包括 `seq`、`checksum`、`duration_ms`；非法輸入為 400。
- `GET /stats`：200 JSON，包括 `requests`、`active`、`peak_active`。
- `load.py`：輸出 JSON，包含成功/失敗、throughput（requests/s）、p50/p95/p99/max（毫秒）、總牆鐘時間與工作負載參數。百分位採 nearest-rank 定義。
- 每筆成功請求產生一筆日誌；修復不能造成紀錄遺失、重複與亂碼。無須要求請求完成的順序等於提交順序（並行系統沒有此保證）。

可重現自動驗收：

```bash
python3 os/linux-labs/l4/selftest.py
```

這驗證服務生命週期、兩種模式、24 筆並行請求全部成功、延遲分位數遞增、正確記錄與清理；**不會替學生證明實驗分析正確**，教授須檢核原始證據與推理。

## 故障注入與反例（安全）

1. `--concurrency 1`：理應減少 lock convoy，是否仍有可觀差異？解釋原因。
2. `--io-ms 0`：縮短模擬外部等待，評估兩種模式是否仍有差異。
3. `--cpu-steps 200000`：讓 CPU/GIL 成為另一可能瓶頸，觀察原假說是否失效。
4. `--mem-kib 4096`：增加 page-touch 記憶體壓力，量測 `VmRSS`、fault（不保證一定造成 major fault）。
5. 把 `/work` 的查詢參數傳入越界值，要求 400 且**不得**寫入日誌；不可要求破壞硬碟或停電。
6. 確認日誌行數 = 成功回應數、序號唯一；不可用非確定性的 p99 閾值充當正確性斷言。

## 技術報告（必交）及評分規準

每組提交：`hypothesis.md`、至少 5 次 baseline/after JSON、取證原始資料及時間窗口、修復差異、`report.md`、`selftest.py` 結果。建議記錄硬體與環境、實驗日期、命令列及退出碼。

| 評分構面 | 比重 | 通過標準 |
|---|---:|---|
| 模型與可反駁假設 | 20% | 明確區分 GIL、mutex、等待、fsync、queueing 與 CPU 排程 |
| 實驗設計與重現 | 25% | 固定工作負載、5 輪以上、完整版本/環境/原始數據 |
| 正確性/資料完整性 | 20% | 自動化功能驗收通過、日誌完整、錯誤輸入拒絕 |
| 取證與因果解釋 | 25% | 至少兩種獨立指標、合理反例、結論不超出證據 |
| 工程報告 | 10% | 限制、風險、權衡、下一步均可第三方重現 |

**Level 4 Mastered**：自測通過只是必要條件；還須教師/同儕檢查實驗紀錄，證明假設、取證、修復與反證完整。不可僅因執行命令成功就自動升級 Mastered。
