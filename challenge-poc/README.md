# CS LAB — 四語言 Coding Challenge PoC

在瀏覽器裡**真的**編譯、執行並評測 C（C11）、C++（C++17）、Python 3 與 JavaScript（ES2022）。這是可行性原型，獨立在 `challenge-poc/`，不動原有教材與學習紀錄。

**個人學習用的自我檢查，不是防作弊系統，也不是經過驗證的安全公開 Judge**（理由見〈安全評估〉）。

## 結果摘要

| 成功條件 | 結果 | 依據（`tests/coding-poc.cjs`，Chromium 141） |
|---|---|---|
| 1. C 真的編譯、執行、評測 | ✅ | 瀏覽器內 Clang 22 → wasm32-wasip1，三題 AC |
| 2. C++ 真的編譯、執行、評測 | ✅ | 同一套工具鏈的 clang++，libc++，三題 AC |
| 3. Python 真的執行、評測 | ✅ | Pyodide（CPython 3.14.2），三題 AC |
| 4. JavaScript 隔離執行、評測 | ✅ | sandbox iframe（不透明來源）＋ Worker，CSP 禁止連線與 eval，三題 AC |
| 5. 同一題切換四種語言 | ✅ | 每種語言各自的起始程式碼與存檔 |
| 6. 編譯錯誤、執行錯誤正確回報 | ✅ | 四語言 CE（附行號訊息）、RE（trap、exit code、例外、traceback） |
| 7. 錯誤答案判為 Wrong Answer | ✅ | 依輸出比較，不看原始碼 |
| 8. 無窮迴圈可終止、頁面不永久凍結 | ✅ | 四語言 TLE，期間主執行緒計時誤差 ≤ 50 ms；之後可繼續執行；停止按鈕 < 1.5 s |
| 9. 程式碼保存與還原 | ✅ | 重新整理後還原；重設只影響目前語言 |
| 10. 不破壞既有課程與學習紀錄 | ✅ | 課程的 localStorage 鍵不變；os / dsa / dm / ai / skin / game / challenge 回歸測試全過 |

**測試覆蓋：** `coding-poc.cjs` 共 68 項檢查，全部通過。另外還有效能量測。**沒有實測：** Firefox、Safari、iOS、Android（見〈瀏覽器相容性〉）。

## 架構

編輯器、評測與執行環境放在 `shared/code/`，這個原型與課程的「④ 實作」頁籤（`shared/cslab-code.js`）共用同一份。

```
challenge-poc/index.html ─ js/app.js（畫面）
             ├─ js/registry.js   Challenge Registry：題目、測資（大型測資固定種子產生）、四語言起始程式碼
             ├─ js/storage.js    Progress Storage：只用 cslab.poc.v1.* 鍵
shared/code/ ├─ editor.js        Editor：textarea ＋ 語法上色層、行號、Tab / Shift+Tab、自動縮排（無外部套件）
             ├─ judge.js         Judge：逐筆執行、正規化比較、決定 AC / WA / CE / RE / TLE / IE、各語言時限倍數
             └─ runtime.js       Runtime Adapters：ExecutionRequest → ExecutionResult、沙箱、逾時、佇列
                  └─ <iframe sandbox="allow-scripts" srcdoc>（每種執行環境一個，不透明來源，meta CSP）
                       runtimes/host.js        沙箱主控：從不執行玩家程式，只建立 / 終止 Worker
                       runtimes/js.worker.js   JavaScript：一個測資一個 Worker
                       runtimes/py.worker.js   Pyodide 常駐；每個測資新的命名空間
                       runtimes/cc.worker.js   Clang 常駐；同一份原始碼只編譯一次
                       runtimes/wasi.worker.js 執行編譯結果：一個測資一個 Worker、新的 WebAssembly 實例
                       runtimes/vendor-fetch.js 執行環境檔案改由父頁代抓（見〈快取〉）
```

**介面契約**

- `ExecutionRequest { language, source, stdin, timeoutMs, outputBytes? }`
- `ExecutionResult { status, stdout, stderr, compileOutput, elapsedMs }`
  - `status` 是 `accepted | compile_error | runtime_error | time_limit_exceeded | internal_error`。
  - 另附 `exitCode`、`memoryBytes`、`compileMs`、`note`。
  - `accepted` 只代表程式正常結束；對錯一律由 `judge.js` 判斷。

**評測規則**

- **輸出正規化：** 四種語言規則相同。`\r\n` 視為 `\n`，忽略行尾空白與檔尾空行。
  - 行首空白、字間空白、大小寫和多出或缺少的行都算錯。
- **停止條件：** 遇到 CE、IE 或 TLE 就停下，其餘測資標為「未執行」。
  - 逾時每次都要重建執行環境，Python 重建要約 2 秒。
- **公開與隱藏測資：** 公開測資顯示 input、expected 和 actual；隱藏測資只顯示結果。測資都在前端，並不保密。

**其他設計**

- **stdin：** 一次給完，因為沒有 SharedArrayBuffer，見下節。
  - JavaScript 用 `readInput()` 取得整份 stdin，`readLine()` 逐行讀取；`console.log` 輸出到 stdout，`console.error` 輸出到 stderr。
- **上限：**
  - 原始碼 64 KB；
  - stdin 8 MB；
  - stdout 與 stderr 各 64 KB，超過時停止並判為 RE（課程題目輸出很多行時可個別放寬，最多 4 MB）；
  - C/C++ 線性記憶體 64 MiB、堆疊 1 MiB；
  - 同一時間只執行一個請求。

## 執行環境選型

### C / C++：`@yowasp/clang` 22（採用）。tracecc 不採用

| | **@yowasp/clang 22.0.0-git20542-10** | @tracecode/tracecc 0.1.1 |
|---|---|---|
| 授權 | 包裝程式 ISC；LLVM / Clang / libc++ 為 Apache-2.0 WITH LLVM-exception；wasi-libc 為 MIT / Apache-2.0 等寬鬆授權 | **AGPL-3.0-only**（整站須以 AGPL 釋出原始碼），pre-release |
| 下載量 | 100.6 MB 原始，gzip 後約 25.9 MB<br>（llvm.core.wasm 75.5 MB、sysroot tar 29.7 MB） | 約 85 MB 自行託管 |
| 標準 | C11 / C++17（Clang 22 支援到 C23 / C++26）。目標 wasm32-wasip1 | C17、C++23，只有 -O0 |
| 例外 | libc++ 沒有例外執行期支援，所以使用 `-fno-exceptions`：`throw` 是編譯錯誤，`at()` 越界變成 abort（RE） | — |
| 整合 | 回傳編譯好的 WASI 模組，執行用自己的 80 行最小 WASI | 要自己提供 Worker 與 WASI host |

tracecc 本身就建立在 YoWASP 的 LLVM 分支上，直接用 YoWASP 可以避開 AGPL，也不必依賴 pre-release。C 與 C++ 共用同一個 `llvm.core.wasm`。

- **編譯：** 編譯 C 約 0.2–2 秒，C++（iostream）約 2–4 秒。
- **WASI 層：** 只提供 stdin、stdout、stderr、時鐘、亂數和 exit，沒有檔案系統，也沒有網路。

### Python：Pyodide 314.0.7

- **基本資料：**
  - 版本：CPython 3.14.2，MPL-2.0。
  - 第一次執行時才下載，約 12.9 MB（gzip 約 6.1 MB），初始化約 2 秒。
  - `input()`、`print()` 與 `sys.stdin` 都能用；`SyntaxError` 判為 CE，其他例外附 traceback 判為 RE。
- **測資之間的重置：**
  - 每個測資用新的 `__main__`；
  - 移除玩家載入的模組；
  - 還原 `builtins`。
  - 這只是盡力而為：直譯器沿用，玩家仍可透過 `js` 模組在 Worker 的 JS 全域留下狀態。
- **中斷：** 需要 SharedArrayBuffer，無法使用（見下節），所以逾時時整個 Worker 重建。

### JavaScript：三種隔離方式的評估

| 方式 | 結論 |
|---|---|
| 只用 Worker（同源） | ❌ 不足：Worker 和主站同源，可以讀寫 IndexedDB、Cache，也能用主站的 cookie 發送請求 |
| 另一個來源（不同網域） | ✅ 最好。但 GitHub Pages 的 `*.github.io/os-lab` 與 `/self-research` 是**同一個來源**；要另一個來源得另開帳號或組織的 Pages、或用其他靜態主機，需要你決定，所以 PoC 沒有採用 |
| **sandbox iframe（`allow-scripts`，不透明來源）＋ CSP ＋ Worker** | ✅ 採用。在單一 GitHub Pages 網站上能做到的最強隔離 |

玩家程式以 `blob:` 腳本經 `importScripts` 載入，主頁與沙箱都不使用 `eval` 或 `Function`；沙箱 CSP 沒有 `'unsafe-eval'`，所以玩家的 `eval` 也會失敗。

## 安全評估

**威脅模型：** 防止玩家程式（自己寫的或貼來的）讀取或修改 CS LAB 的頁面與學習紀錄、對外連線，以及凍結頁面。

**不在範圍內：** 防作弊。程式、測資與判斷都在使用者自己的瀏覽器裡，偽造結果只騙得到自己。

**已實作並測試的防護（`coding-poc.cjs` 第 7–8 節）：**

- **沙箱 iframe：**
  - 屬性是 `sandbox="allow-scripts"`，沒有 `allow-same-origin`，所以來源是 `null`。
  - 父頁讀不到它的 document，它也讀不到父頁的 DOM、localStorage、IndexedDB、Cache 和 Cookie。
- **CSP（meta）：** 每個沙箱都設定：
  - `default-src 'none'`；
  - `connect-src 'none'`；
  - `script-src` 只允許 inline、`blob:` 和自己的 `vendor/` 目錄；
  - Python 與 C 另外允許 `'wasm-unsafe-eval'`。
- **JavaScript 逃逸測試（15 種，全部被擋）：**
  - `self.parent` 與 `top`；
  - localStorage、IndexedDB、caches、cookie；
  - 從 prototype 取回原生 `fetch`、刪掉替身後再呼叫 `fetch`；
  - 遠端 `importScripts`、遠端 Worker；
  - WebSocket、`sendBeacon`；
  - `eval`、`Function`；
  - 用 `postMessage` 偽造評測結果。
  - 測試時另開一個「誘餌」伺服器，確認它從未被連到。
- **Python 測試：** 透過 `js` 模組存取 DOM、localStorage、IndexedDB、`importScripts`，以及用 XHR 連誘餌、主站、甚至自己的 vendor 目錄，全部被擋。
- **C 測試：** `fopen` 失敗，因為沒有檔案系統。
- **偽造結果：** 每個請求有隨機 nonce，只有 Worker 外層的程式知道；玩家用 `postMessage` 偽造的結果會被忽略。
- **主執行緒：** 玩家程式只在 Worker 裡跑。逾時由父頁計時、請沙箱終止 Worker；沙箱沒有回應時就移除整個 iframe 再重建。

**殘餘風險（未解決或未測試）：**

- **記憶體耗盡：** JavaScript 與 Python 沒有記憶體上限，耗盡時可能讓分頁當掉。影響範圍只有使用者自己；這點沒有測試。
- **Python 跨測資狀態：** 玩家可以透過 `js` 模組在 Worker 的 JS 全域留下狀態，或攔截之後測資的訊息來偽造結果。只會影響自己的評測。
- **瀏覽器或 WebAssembly 引擎漏洞：** 不透明來源的 iframe 不一定會放在獨立的程序裡。真正的跨程序隔離只有「另一個網站」能保證。
- **沒有第三方安全稽核**，也只在 Chromium 上測試過。

**結論：** 這個隔離足以讓使用者在自己的瀏覽器裡練習自己的程式。它**不足以宣稱為安全的公開 Judge**，例如不能執行別人提交的程式、不能拿來排名或發證書。

若要公開，建議：

1. 先把執行端移到**獨立網域**，例如另一個 GitHub 帳號或組織的 Pages，或 Cloudflare Pages 的免費 `*.pages.dev` 網域。
2. 加上真正的 HTTP 標頭：`Content-Security-Policy`，以及 `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`。這樣才能使用 SharedArrayBuffer，做到互動式 stdin 與不必重建的 Python 中斷。
3. 需要防作弊或比賽時，才考慮遠端評測（例如自架 Judge0，要伺服器成本）。PoC 沒有預設要求任何付費後端。

### GitHub Pages 的限制

| 項目 | 現況 | 影響 |
|---|---|---|
| 自訂 HTTP 標頭 | 不支援 | CSP 只能用 `<meta>`，不能用 `frame-ancestors`、`sandbox` 等只在標頭有效的指令 |
| COOP / COEP | 無法設定 | 沒有 cross-origin isolation，也就沒有 SharedArrayBuffer：stdin 必須一次給完、Python 無法中斷（只能重建 Worker）、無法用 `measureUserAgentSpecificMemory` 量記憶體 |
| 來源 | `*.github.io` 下的所有專案頁共用一個來源 | 只能用不透明來源的沙箱隔離 |
| 檔案大小 | 單檔 < 100 MB（`llvm.core.wasm` 為 75.5 MB）；網站建議 ≤ 1 GB；每月流量軟上限 100 GB | 沒有 gzip 時，一次 C/C++ 冷啟動約 100 MB，約可支撐每月一千次冷啟動。GitHub Pages 會不會壓縮 `.wasm`，這次**未能實測** |
| CORS | 不透明來源載入 vendor 腳本需要 `Access-Control-Allow-Origin: *` | GitHub Pages 預期會送這個標頭；本機測試伺服器 `tests/poc-server.cjs` 模仿這個行為。**這次無法從測試環境連上 github.io 確認，請在預覽網址實測** |

**為什麼自己託管、不用 jsDelivr：** 根據 jsDelivr 的 README，套件大於 150 MB 或單檔大於 20 MB 預設不支援，`llvm.core.wasm` 有 75.5 MB。執行環境由部署流程的 `shared/code/tools/vendor.sh` 在部署時用 `npm pack` 下載（會驗證 registry 的 integrity），**不進 git**。

### 快取

Chrome 的 HTTP 快取依框架來源分區，不透明來源的 iframe 拿不到可重用的分區。所以執行環境的大檔案改由父頁（一般來源）`fetch`，再轉交沙箱（`runtimes/vendor-fetch.js`）。父頁只代抓該執行環境自己 `vendor/` 目錄下的檔案。

實測結果：用一般 Chrome 磁碟快取的設定檔重新開頁時，重新下載量是 0 MB（見下表）。改成這種做法之前的對照沒有單獨重測。

## 效能（`tests/coding-poc-perf.cjs`，Chromium 141 headless，本機回環網路，每種語言用全新的瀏覽器設定檔）

| 語言 | 第一次下載 | 冷啟動（第一次提交 Hello World，含下載、初始化、編譯） | 已快取初始化 | Hello World 執行 | Binary Search（3 筆大型，n = 100,000） | 記憶體峰值 | 無窮迴圈 |
|---|---|---|---|---|---|---|---|
| C | 100.6 MB（gzip 約 25.9 MB） | 2.9 s | 2.6 s（重新下載 0 MB） | 0.3 ms | 7–16 ms（13 筆提交 0.8 s） | 1.4 MiB（wasm 線性記憶體） | TLE，2.5 s 後回報並可繼續 |
| C++ | 同上（共用） | 6.0 s | 4.9 s（重新下載 0 MB） | 2.5 ms | 350–380 ms（iostream 讀入；13 筆提交 3.6 s） | 1.4 MiB（wasm 線性記憶體） | TLE，2.5 s |
| Python | 12.9 MB（gzip 約 6.1 MB） | 2.1 s | 2.0 s（重新下載 0 MB） | 1.8 ms | 17–29 ms（13 筆提交 0.26 s） | 30 MiB（wasm 線性記憶體） | TLE，2.4 s，重建 Worker 約 2 s |
| JavaScript | 13 KB（Worker 原始碼） | 0.08 s | 0.08 s | 2.9 ms | 14–17 ms（13 筆提交 0.37 s） | 未取得（沒有 cross-origin isolation） | TLE，2.4 s |

- **實際網路：** 本機回環網路不含網路延遲。在 20 Mbps 下，C/C++ 首次下載約 11 秒（gzip），沒有 gzip 時約 40 秒；Python 約 3 秒。
- **已快取初始化：** C/C++ 每次都要把 75 MB 的 wasm 重新編譯成機器碼，所以大約還是 2–5 秒。
- **延遲載入：** 開頁時不下載任何執行環境（已測試），第一次在某語言按「執行」或「提交」才下載。
  - 同一時間只初始化一次，因為有佇列，`boot()` 也只做一次。
  - 課程頁完全不載入 `challenge-poc/`。
- **資源釋放：**
  - JavaScript 和 C/C++ 程式的 Worker 在每個測資結束後終止；
  - 逾時的 Python Worker 會被終止；
  - 編譯結果只快取最近 4 份。

### 整合進課程後的修正（`tests/code-review.cjs`）

- **stdout 太慢：** 最小 WASI 原本把 stdin / stdout 回報成字元裝置，libc 以為是終端機，逐行呼叫 `fd_write`。改報成串流（不能 seek 的 socket）後整塊緩衝，C 輸出 20 萬行從 264 ms 降到 21 ms，C++ `cout` 從 457 ms 降到 118 ms。
- **C++ `cin` 很慢：** 瀏覽器版 libc++ 的 `cin >> x` 每個整數約 3 µs，`scanf` 約 0.05 µs，問題在函式庫的數字解析，不是 I/O 次數（10 萬個整數只呼叫 576 次 `fd_read`）。因此課程題目的時限給 C++ 3 倍（同 Python）。這個 PoC 的三題仍是所有語言同一時限。
- **Python 輸出殘留：** 程式輸出超過上限時，`sys.stdout` 緩衝區裡還沒寫出的內容會混進下一筆測資的輸出。現在每次執行後都會丟掉這些內容，並有回歸測試。

## 瀏覽器相容性

| 瀏覽器 | 狀態 |
|---|---|
| Chromium 141（Playwright，桌面與 390 px 手機寬度） | ✅ 已測，全部通過 |
| Chrome / Edge 桌面版 | 未實測（與 Chromium 同引擎，預期可用） |
| Firefox | **未實測**。用到的功能（srcdoc sandbox iframe、不透明來源的 blob Worker、classic Worker 裡的 `import()`、WebAssembly 的 bulk-memory、reference-types 等）Firefox 114 以上都有 |
| Safari 桌面版 | **未實測**。預期需要 Safari 15 以上（WebAssembly 擴充功能、Worker 內的 `import()`）。YoWASP 與 Pyodide 3.14 在 Safari 的支援需要實測 |
| iOS Safari | **未實測，可行性存疑**：iOS 對每個分頁有記憶體限制，載入並編譯 75 MB 的 `llvm.core.wasm` 很可能被系統終止。Python 與 JavaScript 比較有機會正常運作 |
| Android Chrome | 未實測；C/C++ 有同樣的記憶體與下載量疑慮 |

不支援時的行為：載入失敗會判為 Internal Error 並顯示原因，其他語言不受影響。

## 執行與測試

```sh
bash os-lab/shared/code/tools/vendor.sh          # 下載執行環境到 shared/code/vendor/（約 114 MB，不進 git）
node os-lab/tests/poc-server.cjs . 8000          # 在 os-lab 的上一層啟動；模仿 GitHub Pages 的標頭（CORS）
# 開啟 http://localhost:8000/os-lab/challenge-poc/
node os-lab/tests/coding-poc.cjs                 # 功能與安全測試（自己啟動伺服器，埠 8010 / 8011）
node os-lab/tests/coding-poc-perf.cjs            # 效能量測（埠 8012）
```

Python 的 `http.server` 不送 CORS 標頭，所以沙箱載入不了執行環境。請改用 `tests/poc-server.cjs`。

## 部署

- **正式站：** `.github/workflows/pages.yml`（main）會在部署前執行 `shared/code/tools/vendor.sh`。
- **開發分支：** `.github/workflows/preview.yml` 發布到 `gh-pages/preview/<分支>/`，例如 `https://duicn187532.github.io/os-lab/preview/maple-skin-refactor/challenge-poc/`。
  - 預覽網址多了兩層目錄，楓之谷素材的相對路徑指不到 `/self-research/`，所以**預覽只會顯示學術外觀**。正式站兩種外觀都有。
  - main 下一次部署（`force_orphan`）會清掉所有預覽。

## 素材與授權

- **介面：** 沿用 CS LAB 既有的 `shared/cslab.css`、`shared/skin-maple.css` 與 `shared/cslab-skin.js`。楓之谷外觀只引用 self-research 已發布的素材，**沒有新增或複製任何遊戲美術**。
- **第三方：**
  - Pyodide（MPL-2.0；內含 CPython，PSF License）；
  - @yowasp/clang（ISC；LLVM，Apache-2.0 WITH LLVM-exception；wasi-libc，MIT / Apache-2.0 / CC0 等）。
  - 兩者都在部署時從 npm 取得，原樣提供。
