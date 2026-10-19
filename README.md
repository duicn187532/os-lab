# OS LAB — 作業系統互動式自學網站

🌐 [開啟互動課程](https://duicn187532.github.io/os-lab/)

繁體中文、完全靜態的作業系統教材網站。以「先用生活類比（ELI5）→ 回到真實底層原理 → 操作簡化模型 → 逐題檢核」的方式學習。

## 使用方式

1. 直接開啟 `index.html`。電腦上推薦使用 Chrome、Edge、Firefox 或 Safari。
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
2. 上傳 `index.html` 和這份 `README.md` 到 repo 根目錄。
3. 到 Repository → **Settings → Pages**。
4. 在 **Build and deployment** 選 **Deploy from a branch**；branch 選 `main`、目錄選 `/(root)`，儲存。
5. GitHub Pages 部署完成後，即可用 HTTPS 網址在手機與電腦瀏覽。

> 不需要 Python、Node.js 或資料庫。此版是「教學網站」，不是實際 Linux Kernel 模擬器。模型刻意省略細節；請搭配真正的 Linux C 練習和教科書深入學習。

## 開發檔案

`source/data.py` 為教材資料；`source/template.html` 為頁面結構與 CSS；`source/app.js` 是邏輯與實驗；`source/build.py` 可產生獨立 HTML（執行前需在相同目錄）。

## 教材授權說明

教材內容為原創整理，參照作業系統課程與《Operating System Concepts》的常見知識範疇，但不是該書翻譯、逐頁改編或官方配套教材。