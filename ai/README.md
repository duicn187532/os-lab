# AI LAB｜AI 演算法與模型互動學習平台

繁體中文、單一 HTML 檔即可執行的互動式 AI 學習教材。以「ELI5 白話理解 → 技術與數學原理 → 可執行的 Python 範例 → 模型實驗 → 測驗」循序建立基礎。

- 🌐 線上網站（需啟用 GitHub Pages）：https://duicn187532.github.io/os-lab/ai/
- 📦 單檔離線版：`index.html`
- 🔗 原始碼：https://github.com/duicn187532/os-lab/tree/main/ai
- 24 章教學、24 類互動實驗、72 題附解析的測驗

## 章節

1. AI 全貌、向量與矩陣、梯度下降、Bayes
2. 線性與邏輯迴歸、kNN、SVM、決策樹與集成
3. K-means、PCA、MDP 與 Q-learning
4. 感知器、神經網路、反向傳播、正則化
5. CNN、Diffusion、RNN、Attention 與 Transformer
6. Tokenization、LLM 的 Sampling、RAG、Agent
7. 資料品質、模型評估、風險與安全

## 操作說明

在瀏覽器開啟 `index.html`，左側選擇章節。每章提供「原理精讀」、「互動實驗」、「章末測驗」、「個人筆記」。

「互動實驗」更改參數後按 **重新執行**，再按 **下一步** 觀察模型狀態與計算過程。支援手機 RWD、深淺主題、章節進度與筆記儲存。

## 資料與限制

- 所有程式與計算都在目前瀏覽器內執行；不使用外部 JavaScript CDN、後端伺服器、模型 API 或 GPU。
- 所有數值實驗皆為教學簡化模型。Attention 的 Q/K 分數、RAG 的部分檢索分數、Token ID 與 Diffusion 的去噪過程明確是**示意資料**，不構成大型模型的真實輸出。
- 筆記、練習紀錄、章節完成狀態使用 `localStorage`，不跨瀏覽器同步。清除網站資料或在某些無痕模式下可能遺失。
- Python 範例以 Python 3 標準函式庫為主，複製後可在本機執行；網站上的 Python 程式碼**不會直接在瀏覽器執行**，網站的實驗由 JavaScript 實作。

## GitHub Pages

部署到 `os-lab` 儲存庫 `main` 分支的 `ai/index.html` 後，若 Pages 設定為 **Deploy from a branch → main → /(root)**，可使用上述網址。若 Pages 未啟用，須先到儲存庫 Settings → Pages 啟用。

## 版權

本站為原創教學教材，參考通用機器學習與 AI 的基本概念，不是任何指定教科書的逐字翻譯。只供教學及研究入門；真實專案需使用合適的函式庫、測試資料、權限控制、模型治理與效能測量。