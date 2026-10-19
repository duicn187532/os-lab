# CS LAB / OS LAB — 作業系統互動式自學網站

🌐 [開啟互動課程](https://duicn187532.github.io/os-lab/)

繁體中文、完全靜態的資工互動教材。根目錄是七門課（OS、DM、DSA、LA、AI、CO、ASM）的入口網；本儲存庫的主課程 **OS LAB**（`os/`）以「先預測 → 生活類比 → 回到真實機制 → 操作模擬器 → 測驗檢核 → 錯題複習」的節奏學習作業系統。

## OS LAB 內容

**21 章 · 21 個專屬模擬器 · 84 題測驗 · 97 個術語 · 公式速查**

| 單元 | 章節與互動實驗 |
| --- | --- |
| 基礎 | 電腦如何執行程式（指令週期、timer interrupt）· Kernel 與 System Call（read() 路徑、快取命中與否） |
| 執行 | Process（狀態機與 PCB，含不合法轉換說明）· Thread（共享 / 私有分類與記憶體配置圖） |
| 排程 | CPU Scheduling（FCFS、SJF、SRTF、RR、Priority，可增刪工作、Ready 佇列、演算法比較）· **優先權、MLFQ 與多核心排程**（三層佇列、priority boost） |
| 並行 | Race Condition 與死結（手動決定交錯、mutex、兩把鎖與資源配置圖）· **Semaphore 與生產者–消費者**（含不加同步、錯誤 wait 順序）· **Deadlock 處理與銀行家演算法**（逐步安全檢查、請求試算） |
| 記憶體 | 分頁與 TLB（位元拆解、頁表、TLB 命中、EAT 計算）· **連續配置與碎片化**（First / Best / Worst / Next Fit、釋放合併、壓縮）· 頁面置換（FIFO、LRU、OPT，逐步表格、Belady 異常） |
| 儲存 | 檔案系統（fd、page cache、fsync、背景回寫、斷電）· **磁碟排程**（FCFS、SSTF、SCAN、C-SCAN、LOOK、C-LOOK 路徑圖）· I/O（輪詢、中斷、DMA 的 CPU 時間線） |
| 系統 | Protection（Unix rwx 與八進位、存取檢查）· VM vs Container（堆疊與情境）· 效能（M/M/1 佇列、Little's Law、延遲曲線） |
| 整合 / 實驗 / 複習 | API 請求延遲分解 · fork() 行程樹與輸出預測 · 跨章節混合練習 |

粗體為本次新增章節。原有 16 章的教材文字與 32 題全部保留，並為每章補上學習目標、重點回顧、關鍵術語與兩題以上的新測驗。

## 學習功能

- **三階段章節**：① 觀念（學習目標、先寫下猜測、ELI5、深入原理、流程、常見誤解、程式碼、重點回顧、術語、自己的解釋）→ ② 實驗 → ③ 測驗。
- **模擬器**：先預測再操作；支援「上一步」回看、重設，以及可調速的自動播放（切換頁籤或隱藏頁面即暫停）。
- **測驗與錯題本**：每題兩次機會，第一次只給提示；答錯的題目進入錯題本，可做錯題複習或 8 題跨章節混合練習。
- **工具頁**：實驗總覽、公式速查、術語表（中英對照）、我的筆記（匯出 Markdown、備份 / 還原進度 JSON、列印）。
- **體驗**：可分享的網址（`#/ch/4/lab`）、瀏覽器上一頁、`/` 或 `Ctrl+K` 全文搜尋、`[` `]` 切換章節、`A`–`D` 作答、深色 / 淺色主題、手機抽屜選單、尊重「減少動態效果」。
- **隱私**：沒有帳號、後端或追蹤；進度、筆記與錯題本只存在瀏覽器 localStorage（沿用舊版鍵值 `os_lab_2026_v1`，舊進度不會遺失）。

## 檔案結構

```
index.html              七門課入口網
os/index.html           OS LAB 頁面骨架
os/assets/content.js    教材資料（章節、測驗、術語、公式）；id 是進度用的穩定識別碼，陣列順序是顯示順序
os/assets/labs-core.js  實驗共用 UI 工具，以及執行、排程、並行類實驗
os/assets/labs-more.js  記憶體、儲存、系統、整合與複習類實驗
os/assets/app.js        路由、進度、測驗、錯題本、搜尋、術語、公式、筆記
os/assets/os.css        設計變數（淺色 / 深色）、版面與元件樣式
tests/os-review.cjs     端對端檢查
```

沒有建置步驟。每個實驗以 `OSLabs.register(type, { title, prompt, init, view, act, set, auto })` 註冊；純計算函式（如 `scheduleSim`、`bankerSafety`、`diskSchedule`）掛在 `OSLabs.sim`，方便測試。

## 本機預覽與測試

```sh
python -m http.server 8000
# 另一個終端（需要 Node.js 與 Playwright）
node tests/os-review.cjs
```

可用 `CHROMIUM_PATH` 指定瀏覽器、`TEST_URL` 指定網址、`SHOT_DIR` 輸出截圖。測試涵蓋：原始教材保留、每章欄位完整、演算法與教科書手算結果一致（SRTF、Banker、FIFO/LRU/OPT、Belady、磁碟排程…）、全部 21 個實驗的按鈕操作、84 題作答、錯題本流程、路由與上一頁、播放與回看、搜尋、重新整理後保留進度、手機版所有頁面無水平溢位，且無瀏覽器錯誤。

## 發布到 GitHub Pages

`.github/workflows/pages.yml` 會在推送到 `main` 時把整個儲存庫發布到 `gh-pages` 分支。到 **Settings → Pages**，選 **Deploy from a branch**、分支 `gh-pages`、目錄 `/(root)`。

> 部分手機的「檔案預覽」不執行 JavaScript；請用瀏覽器開啟，或使用 GitHub Pages 網址。

## 教材定位

教材內容為原創整理，參照作業系統課程與《Operating System Concepts》等教科書的常見知識範疇，但不是任何書籍的翻譯、逐頁改編或官方配套教材。模擬器刻意簡化，不是真實的 Linux Kernel 模擬器；請搭配真正的 Linux C 實驗、xv6 與原始碼深入學習。
