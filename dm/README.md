# DM LAB｜離散數學互動自學實驗室

[回到 CS LAB 首頁](https://duicn187532.github.io/os-lab/)｜[離散數學線上版](https://duicn187532.github.io/os-lab/dm/)

繁體中文、完全靜態、單檔可離線開啟的離散數學教材，涵蓋 24 章、24 種互動實驗、72 題練習；包含 Python 範例與證明思路。

## 課程內容

- 命題邏輯、真值表、德摩根律、正規形、量詞
- 集合、關係、函數、偏序與 Hasse 圖
- 直接證明、逆否、反證、數學歸納、迴圈不變量
- 計數、排列組合、容斥、遞迴、生成函數
- 整除、歐幾里得、模運算與教學級 RSA 基礎
- 圖論、BFS／DFS、Euler 路徑、樹
- 布林電路、離散機率、DFA 與形式語言

## 使用與限制

1. 可直接開啟 `index.html`，或將 `index.html` 放在 GitHub Pages 的 `dm/` 目錄。
2. 切換章節後可操作逐步實驗；調整實驗參數會重新計算。
3. 每章三題答對後計為完成。答錯會先顯示提示，再顯示解析；仍須自行選擇正確答案。
4. 個人筆記、答題和進度存於目前瀏覽器 localStorage，不會跨裝置同步。隱私模式或清除站點資料可能導致遺失。
5. 所有數學模擬皆為有界的教學案例，非正式證明的替代品；若涉及數學定理，請閱讀適用條件及完整證明。

## 修改內容

- `source/curriculum.py`：課綱、講義及測驗。
- `source/labs.js`：24 種實驗及數學步驟。
- `source/site.css`：RWD/深淺色樣式。
- `source/app.js`：路由、互動、進度與筆記。
- `source/template.html`：網站骨架。
- `source/build.py`：打包為單檔 HTML，執行 `python source/build.py`。

無模型 API、CDN、伺服器或第三方 JavaScript 依賴。