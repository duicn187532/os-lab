# OS LAB — 作業系統互動式自學網站

🌐 [開啟互動課程](https://duicn187532.github.io/os-lab/)

繁體中文、完全靜態的作業系統教材網站。以「先用生活類比（ELI5）→ 回到真實底層原理 → 操作簡化模型 → 逐題檢核」的方式學習。

## 使用方式

1. 開啟根目錄 `index.html` 進入七門課的入口網，選擇 OS LAB（`os/index.html`）。電腦上推薦使用 Chrome、Edge、Firefox 或 Safari。
2. 左側選擇章節；手機版點左上角 `☰` 開啟章節清單。
3. 各章包含 **① 從觀念出發 → ② 動手模擬 → ③ 章末挑戰**。
4. 章末每題最多作答兩次；第一次錯誤只顯示提示；第二次仍錯誤才揭示答案及原因。
5. 筆記與進度保留在 **目前瀏覽器的 localStorage**，沒有帳號、後端、任何資料上傳。若在不同瀏覽器、裝置、網址下開啟，進度不會自動同步。

> 部分手機「檔案預覽」不執行 JavaScript。如果點擊不能操作，請改用瀏覽器開啟，或將網站放到 GitHub Pages。

## 主要互動實驗

- CPU 指令週期、模擬 Timer Interrupt
- Process 狀態轉換
- System Call / Kernel / I/O 路徑
- CPU Scheduling：FCFS、SJF、SRTF、RR，修改到達時間、CPU Burst、時間片，逐 tick 查看 Gantt Chart、CT、WT、RT、TAT
- 共享變數讀改寫交錯／Mutex 對照
- Paging：16-bit 虛擬位址、4KiB Page、VPN / Offset、PFN、實體位址
- FIFO／LRU Page Replacement
- write / fsync / 模擬斷電與持久化
- 模式／核心／狀態分類練習

## 發布到 GitHub Pages

1. 新建一個公開或符合方案條件的 GitHub repository。
2. 保留完整目錄結構，將入口網、各課程目錄與 `.github/workflows/pages.yml` 一起推送到 `main`。
3. 到 Repository → **Settings → Pages**。
4. 此專案的 workflow 會將 `main` 發布至 `gh-pages`。在 **Build and deployment** 選 **Deploy from a branch**；branch 選 `gh-pages`、目錄選 `/(root)`。
5. GitHub Pages 部署完成後，即可用 HTTPS 網址在手機與電腦瀏覽。

> 不需要 Python、Node.js 或資料庫。此版是「教學網站」，不是實際 Linux Kernel 模擬器。模型刻意省略細節；請搭配真正的 Linux C 練習和教科書深入學習。

## 開發檔案

目前儲存庫直接維護各課程的獨立 HTML。OS 教材資料、樣式與互動邏輯都在 `os/index.html`；根目錄 `index.html` 是七門課入口網。沒有額外建置步驟。

## 教材授權說明

教材內容為原創整理，參照作業系統課程與《Operating System Concepts》的常見知識範疇，但不是該書翻譯、逐頁改編或官方配套教材。

## OS LAB 檢視與優化（2026-10-19）

- 保留全部 16 章、32 題，以及原有課程文字、程式片段與筆記儲存鍵。
- 修正三張 SVG 公式與符號說明錯配，補充 CPU 時間、平均等待與分頁公式。
- CPU 的 EXECUTE 階段完成後更新暫存器與資料記憶體；指令區與資料區使用不同位址。
- CPU、系統呼叫、排程、競爭條件、頁面置換支援自動播放、暫停、三段速度與回看；切換頁籤或隱藏頁面即暫停。
- 同一章切換頁籤保留實驗與測驗狀態；重新進入章節或明確重設才開始新的實驗。
- 排程未執行的時間片不再洩漏工作名稱／顏色；時間片輸入取整數。
- 手機選單支援 Escape 與焦點控制，頁籤支援方向鍵；尊重減少動態效果偏好。

### 驗證

安裝 Node.js、Playwright 與 Chromium 後，在儲存庫根目錄執行：

```sh
python -m http.server 8000
# 另一個終端
node tests/os-review.cjs
```

可用 `CHROMIUM_PATH` 指定 Chromium，`TEST_URL` 指定測試網址。測試涵蓋全部章節與題目、原始教材保留、主要演算法結果、播放控制、筆記／進度、鍵盤選單與手機溢位。
