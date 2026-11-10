# AI LAB｜AI 演算法與模型互動學習平台

[回到 CS LAB 首頁](https://duicn187532.github.io/os-lab/)｜[AI LAB 線上版](https://duicn187532.github.io/os-lab/ai/)

繁體中文、完全靜態的互動式 AI 教材：24 章、24 種逐步實驗、72 題附提示與解析的測驗。以「ELI5 白話理解 → 核心公式與原理 → Python 範例 → 逐步實驗 → 測驗 → 錯題複習」循序建立基礎。

## 章節

1. AI 全貌、向量與矩陣、梯度下降、Bayes
2. 線性與邏輯迴歸、kNN、SVM、決策樹與集成
3. K-means、PCA、MDP 與 Q-learning
4. 感知器、神經網路、反向傳播、正則化、CNN、RNN 與 LSTM
5. Diffusion、Attention 與 Transformer
6. Tokenization、LLM 的 Sampling、RAG、Agent
7. 資料品質、模型評估、風險與安全

## 使用方式

- 每章分為 ① 觀念（生活類比、核心公式、深入原理、適用界線、Python 範例、自己的解釋）→ ② 實驗 → ③ 測驗。
- 實驗可調整參數、逐步前進或回看，也可自動播放；點步驟列表可直接跳到任一步，最後一步附結論。每個實驗都把計算拆成中間量，例如：
  - 線性迴歸：殘差 → MSE → 梯度 → 數步梯度下降 → 與最小平方解比較
  - SVM：候選線的分數與幾何距離 → 搜尋最大間隔分界線 → 支援向量
  - 決策樹：父節點 Gini → 子節點 Gini → 掃描所有閾值 → 再長一層與過擬合
  - PCA：中心化 → 協方差矩陣 → 投影變異 → 掃描方向 → 特徵分解與保留率
  - Bayes：以 10,000 人的四格表推出後驗，再驗一次看證據如何累積
  - Attention / Sampling：分數 → mask → 除以溫度 → 指數化 → 正規化 → 加權輸出 / 累積機率抽樣
- 測驗每題兩次機會，第一次只給提示；答錯的題目進入錯題本，可在「錯題複習」再練或做跨章節混合練習。選項以固定種子洗牌顯示（舊版正解有 67% 在 A）。
- 「公式速查」收錄 3 個排版公式與 24 章的核心公式；`/` 或 Ctrl+K 搜尋章節與實驗。
- 支援淺色 / 深色 / 跟隨系統主題、手機版面與鍵盤操作。

## 資料與限制

- 所有程式與計算都在目前瀏覽器內執行；不使用外部 JavaScript CDN、後端伺服器、模型 API 或 GPU。
- 所有數值實驗皆為教學簡化模型。Attention 的 Q/K 分數、RAG 的部分檢索分數、Token ID、Embedding 數值與 Diffusion 的去噪過程明確是**示意資料**，不構成大型模型的真實輸出。
- 進度、筆記與錯題本存在目前瀏覽器的 localStorage（鍵值 `ailab.progress`）。舊版分成 `ailab.completed`、`ailab.answers`、`ailab.notes`、`ailab.theme` 四個鍵；新版第一次開啟時會把已完成章節、筆記、主題與最後答錯的題目合併進來，舊鍵保留不刪。舊網址 `#/chapter/3/lab` 會自動轉成 `#/ch/3/lab`。可在「我的筆記」頁備份與還原。
- Python 範例以 Python 3 標準函式庫為主，複製後可在本機執行；網站上的 Python 程式碼**不會直接在瀏覽器執行**，網站的實驗由 JavaScript 實作。

## 檔案

- `index.html`：頁面，只載入下列檔案與共用 shell（`../shared/`）。
- `assets/content.js`：24 章教材與 72 題（由舊版單檔逐字拆出，章節依單元排序；每題新增一句提示）。
- `assets/course.js`：課程設定，以及舊版 `ailab.*` 進度與舊網址的轉換。
- `assets/labs.js`：24 種實驗；每種實驗的 `frames()` 產生步驟畫面，透過 `CSLab.frameLab` 註冊；小數參數依 `step` 保留精度。
- `assets/ai-labs.css`：實驗視覺元件樣式（SVG 顏色跟著主題變數）。

測試：在儲存庫根目錄執行 `python -m http.server 8000`，再執行 `node tests/ai-review.cjs`。

## 版權

本站為原創教學教材，參考通用機器學習與 AI 的基本概念，不是任何指定教科書的逐字翻譯。只供教學及研究入門；真實專案需使用合適的函式庫、測試資料、權限控制、模型治理與效能測量。
