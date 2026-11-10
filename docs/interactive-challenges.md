# 互動知識挑戰（NPC Q&A）設計

每章頁尾的 NPC Q&A 不只是文字選擇題，而是依學科特性設計的互動挑戰：玩家先操作或預測，系統用確定性的規則驗證，之後才看得到完整解析。學術外觀顯示為「互動自我檢測」，楓之谷外觀顯示為「怪物挑戰」。

驗收看的不是控制項多寡，而是：玩家能不能在看不到答案的情況下，用本章學到的方法完成目標，並從結果與解析理解原因。

目前狀態：共用 Challenge API 與四個原型（DSA、OS、DM、AI 各一章）已完成並通過測試；其餘章節照第 4 節的規劃，確認原型可行後再擴展。

## 1. 架構

| 檔案 | 負責 | 不碰 |
|---|---|---|
| `shared/cslab-challenge.js` | Challenge API：卡片外框、提示、失誤計數、看解答的條件、紀錄存檔、`cslab:challenge` 事件、鍵盤與數值輸入 | 題目內容、驗證細節、外觀 |
| `<課程>/assets/challenges.js` | 操作介面（`CSLab.challenge.type`）與題目資料（`CSLab.challenge.add`） | 外觀、經驗值 |
| `CSLab.sim.*`（各課 labs） | 標準答案的計算：與互動實驗共用同一個純函式 | 挑戰的狀態 |
| `shared/cslab-game.js` | 楓之谷外觀的怪物挑戰（NPC、怪物、HP 條、動畫）與經驗值 | 題目、驗證、紀錄 |
| `shared/cslab.css`、`shared/skin-maple.css` | 兩種外觀的樣式 | — |

外觀與題目完全分離：挑戰模組只產生一般的課程卡片並發出事件；遊戲層只讀卡片的 `data-*` 屬性與事件，在卡片外圍加上裝飾（`aria-hidden`）。切換外觀不會改變題目、驗證或紀錄。

### 1.1 題目資料

```js
CSLab.challenge.add({
  id: 'dsa.binary-search.next-step', // 穩定 id：課程.主題.關卡；紀錄以它為鍵，改名會讓舊紀錄失效
  lesson: 6,                          // 章節 id
  kind: 'step',                       // 題型：step | manipulate | target | counterexample | reasoning
  ui: 'bsearch-step',                 // 操作介面，同一個介面可以服務很多題
  title: '…', task: '…',              // 標題與任務說明（不含答案）
  params: { values: [...], targets: [34, 20] }, // 輸入參數
  rule: { mid: ['floor', 'ceil'] },   // 驗證規則的參數：合法寫法、容許誤差、邊界條件
  hints: ['…', '…', '…'],             // 依序給的提示，一個比一個具體
  explain: '…',                       // 解析：為什麼是這樣
  tags: ['binary-search', 'loop-invariant']     // 知識標籤
});
```

### 1.2 操作介面

```js
CSLab.challenge.type('bsearch-step', {
  init(c)              // → 狀態 s；s.round / s.rounds 是第幾關、共幾關，s.done 表示完成
  view(s, c)           // → HTML；按鈕用 data-ch-act（＋data-arg），數值用 data-ch-set，主要按鈕加 data-ch-enter
  act(s, action, arg, c) // → { ok, msg, round, done }
  solution(c, s)       // → 解析 HTML；只在完成或看解答後顯示
});
```

`act` 的結果：
- `ok: false` 記一次失誤。訊息只指出哪裡不對、為什麼不對，不給出正確的下一步。
- `ok: true` 是答對的一步。
- 省略 `ok` 是中性操作，例如調整數值、切換開關、輸入格式不對。
- `round: true` 表示過了一關；`done: true` 表示整題完成。

### 1.3 規則（對應需求）

| 需求 | 做法 |
|---|---|
| 重用 CSLab.sim、不複製演算法 | 標準答案與解析都來自實驗的純函式。如果數值原本只存在畫面文字裡，先把計算抽成 `CSLab.sim` 的函式，讓實驗改用它。這次抽出了 `CSLab.sim.ai.gd`（梯度下降軌跡）與 `CSLab.sim.dm.evalExpr / showExpr / ops`（命題連接詞）。 |
| 先操作或預測，驗證後才有完整答案 | `.ch-explain` 只在完成或看解答後出現。「看解答」在失誤 2 次或提示看完之後才開放，看過就不再計入完成。 |
| 確定性的標準答案 | 驗證是規則判定或模擬計算，沒有即時評分。 |
| 數值容許誤差、邊界、浮點 | `CSLab.challenge.num.parse` 接受小數、分數（13/4）與全形數字；`num.close(a, b, tol)` 依 `rule.tol` 比較。浮點的「剛好為 0」另有門檻，例如學習率挑戰的 `ZERO = 1e-14`，讓 η = 0.51 正確判成震盪。 |
| 多種合法答案 | 驗證的是「這一步是否合法」，不是比對唯一操作序列。例如中點上整或下整都接受；SRTF 剩餘時間同分時，每個工作都接受；任何一組讓式子為假的賦值都算反例；條件內的任何 η 都過關。之後的步驟以玩家自己的狀態繼續計算。 |
| 手機點選與鍵盤 | 所有操作都是 `<button>` 或 `<input>`，沒有拖曳。數字欄按 Enter 等於按下主要按鈕。滑桿另有 −／＋ 按鈕。 |
| 不能刷 EXP | 紀錄存在課程進度 `store.challenge[id] = { mistakes, hints, revealed, solved, at }`。失誤與看過的提示立刻存檔，重新整理不會歸零；完成或看過解答後紀錄就固定，再挑戰只是練習。經驗值只依紀錄推算一次：失誤加提示 0 次 +60、1–2 次 +40、更多 +20、看過解答 0。紀錄跟著「備份學習進度」一起匯出。 |
| 兩種外觀 | 學術外觀是「🧩 互動自我檢測」卡片。楓之谷外觀是「⚔ 怪物挑戰」：NPC 在肖像欄出題，卡片上緣站著一隻小怪（不是守章節的那隻），HP 等於關數。失誤時怪物擋下、卡片震動；過一關打掉一格 HP；完成時怪物倒下；看解答則怪物逃走。 |

## 2. 四個原型

| 章節 | 題型 | 介面 | 玩家要做什麼 | 驗證 | 多解與邊界 |
|---|---|---|---|---|---|
| DSA 第 7 章 搜尋與二分搜尋 | Step | `bsearch-step` | 每一步自己點 mid，再選「命中／往左／往右」，範圍空了就宣告找不到；共兩關：34（存在）、20（不存在） | mid ∈ {⌊(lo+hi)/2⌋, ⌈(lo+hi)/2⌉}，方向由比較決定；解析中的標準路徑取自 `CSLab.sim.dsa.makeFrames('search')` | 上整、下整都接受；第二關一路縮到 lo > hi |
| OS 第 5 章 CPU Scheduling | Step | `sched-pick` | 每個排程時機（有工作到達或做完）選 CPU 交給誰，排完再填平均 WT | 只能選已到達、未做完、剩餘時間最短的工作；WT 由玩家自己的 Gantt 計算；解析對照 `CSLab.sim.scheduleSim` | t = 7 時 P1、P4 都剩 5，兩個都接受；WT 接受 13/4，誤差 0.01 |
| DM 第 1 章 命題與真值表 | Counterexample | `truth-counter` | 設 P、Q、R，提交反例或宣告主張成立；第一關有兩組反例，第二關是重言式 | `CSLab.sim.dm.evalExpr`（與真值表實驗共用連接詞） | 任何為假的賦值都接受；重複提交同一組不重複扣分 |
| AI 第 3 章 微分與梯度下降 | Target | `lr-target` | 調 η、執行 8 次更新；第一關不跨過最低點且 Loss ≤ 0.01，第二關每步都跨過且 Loss ≤ 0.01 | `CSLab.sim.ai.gd.trail`，圖由梯度下降實驗的 frames 畫出；解析推導出合格區間 | 第一關 0.206 ≤ η ≤ 0.5，第二關 0.5 < η ≤ 0.794；η = 0.5 剛好落在 w = 3，不算震盪 |

測試：`tests/challenge-review.cjs` 涵蓋上表每一項，另外檢查：
- 題目資料欄位齊全；
- 解析只在完成或看解答後出現；
- 失誤在重新整理後仍在；
- 再挑戰不改紀錄、不再加經驗值，看過解答後為 0；
- 鍵盤可以操作；
- 兩種外觀的呈現；
- 390px 寬度下作答中與完成後都沒有水平溢位。

## 3. 可以重用的操作介面

87 章不需要 87 種介面。原型的四種介面已經是一般化的寫法，其餘章節大多可以套用下面這些：

| 介面 | 題型 | 用在 |
|---|---|---|
| `bsearch-step` → 一般化為 `pick-next` | Step | 「下一個是哪一格／哪個節點／哪個工作」：二分搜尋、BFS／DFS、Dijkstra、Kruskal、磁碟排程、安全序列、K-means 指派 |
| `sched-pick` | Step | FCFS、SJF、SRTF（已支援），之後加 RR、Priority、MLFQ |
| `truth-counter` → 一般化為 `find-counter` | Counterexample | 命題、等價式、量詞（選論域裡的 x）、關係性質（選有序對）、函數單射、DFA |
| `lr-target` → 一般化為 `param-target` | Target | 調一到三個參數，讓模擬結果符合條件：學習率、迴歸 w／b、分類門檻、Bayes、溫度／top-p、MLFQ boost、排隊模型 |
| `fill-table`（新） | Manipulation | 填表或填格：DP 表、Pascal 三角形、卷積係數、雜湊桶、位址轉換 |
| `choose-reason`（新） | Reasoning | 選擇題加理由選項：答案與理由都要對，用在不適合直接操作的觀念 |

## 4. 87 章規劃

原則：
- 能操作的章節才用操作題；觀念章節用 Reasoning，不為了全覆蓋而硬做複雜互動。
- 「重用」欄寫的是答案從哪裡算。標 * 的實驗目前沒有對外的純函式，要先抽出來，讓實驗與挑戰共用。
- ✅ 是已完成的原型。

### OS（21 章）

| 章 | 題型 | 挑戰 | 重用 |
|---|---|---|---|
| 1 電腦如何執行程式 | Step | 指令週期的下一個動作（PC、IR、暫存器怎麼變） | cpu 實驗* |
| 2 Kernel 與 System Call | Reasoning | 哪些操作必須陷入核心，選答案與理由 | — |
| 3 Process | Step | 給一串事件，選行程的下一個狀態 | process 實驗* |
| 4 Thread 與並行 | Reasoning | 哪些資源執行緒共享、哪些私有 | — |
| 5 CPU Scheduling ✅ | Step | SRTF 每個排程時機選下一個工作，再算平均 WT | `sim.scheduleSim` |
| 6 MLFQ | Target | 調 priority boost 週期，讓長工作的等待不超過上限 | `sim.mlfqSim` |
| 7 Race Condition | Counterexample | 安排 A、B 的交錯順序，找出讓 x 少加的交錯（多種交錯都接受） | `sim.raceRun` |
| 8 Semaphore | Manipulation | 排 wait／signal 的順序，讓緩衝區不溢位也不死結 | `sim.bufferProduce / bufferConsume` |
| 9 銀行家演算法 | Step | 逐步找安全序列（任何安全序列都接受） | `sim.bankerSafety` |
| 10 分頁與 TLB | Manipulation | 把邏輯位址拆成 page 與 offset，查表轉成實體位址 | `sim.translate` |
| 11 連續配置 | Step | 依 First／Best／Worst fit 選要放的洞 | `sim.pickHole` |
| 12 Page Replacement | Counterexample | 找一串參考序列，讓 FIFO 的 frame 從 3 變 4 時 fault 反而增加（Belady） | `sim.simulateReplacement` |
| 13 File System | Reasoning | inode 直接與間接指標能定址的最大檔案 | storage 實驗* |
| 14 磁碟排程 | Step | SSTF／SCAN 的下一個磁柱（同距離兩個都接受） | `sim.diskSchedule` |
| 15 I/O 與中斷 | Step | 中斷處理流程的下一步 | `sim.ioTimeline` |
| 16 Protection | Counterexample | 找出設定錯誤時不該通過卻通過的存取 | `sim.checkAccess` |
| 17 VM vs Container | Reasoning | 依隔離需求選擇，並選出理由 | — |
| 18 效能與觀測 | Target | 調伺服器數，讓平均等待低於門檻 | queue 實驗* |
| 19 API 請求的旅程 | Step | 排出請求經過各層的順序 | `sim.journey` |
| 20 fork 與 C 實驗 | Step | 預測 fork 之後的輸出行數與可能順序（所有合法順序都接受） | `sim.forkRun` |
| 21 最終整合 | Reasoning | 跨章混合 | 綜合複習 |

### DSA（18 章）

| 章 | 題型 | 挑戰 | 重用 |
|---|---|---|---|
| 1 記憶體與快取 | Target | 選資料配置與元素型別，讓順序走訪的未命中次數 ≤ k | `memoryFrames`* |
| 2 Big-O | Reasoning | 依成長率排序幾段程式，並選理由 | — |
| 3 陣列與字串 | Manipulation | 中間插入：點出需要搬移的元素 | `makeFrames('array')` |
| 4 鏈結串列 | Manipulation | 插入節點時指標的重接順序（先接新節點的 next） | `makeFrames('linked')` |
| 5 堆疊與佇列 | Step | 括號配對時每一步 push 或 pop | `makeFrames('stack')` |
| 6 遞迴 | Step | 呼叫堆疊的下一個 frame 與回傳值 | `makeFrames('recursion')` |
| 7 二分搜尋 ✅ | Step | 每一步自己選 mid 與方向，兩關（存在／不存在） | `makeFrames('search')` |
| 8 基礎排序 | Step | 插入排序或冒泡排序的下一次比較與交換 | `makeFrames('sort')` |
| 9 分治排序 | Step | Quick sort partition 後 pivot 的位置 | `makeFrames('sort', quick)` |
| 10 雜湊表 | Manipulation | 把鍵放進正確的桶（chaining） | `makeFrames('hash')` |
| 11 BST | Manipulation | 點選新節點的插入位置 | `makeFrames('bst')` |
| 12 Heap | Step | 上浮或下沉的下一次交換 | `makeFrames('heap')` |
| 13 BFS／DFS | Step | 下一個拜訪的節點（同層多解，依佇列合法性判定） | `makeFrames('graph')` |
| 14 Dijkstra | Step | 下一個確定的節點與 relax 結果（同距離多解） | `makeFrames('graph', dijkstra)` |
| 15 Union-Find／MST | Step | Kruskal 的下一條邊（同權重多解，成環則拒絕） | `makeFrames('union')` |
| 16 貪心 | Counterexample | 找一組活動，讓「最短活動優先」選得比最佳解少 | `makeFrames('greedy')` 與規則檢查 |
| 17 DP | Manipulation | 填 dp 表的格子 | `makeFrames('dp')` |
| 18 選資料結構 | Reasoning | 依需求選結構，再選理由 | `chooseEval` |

### DM（24 章）

| 章 | 題型 | 挑戰 | 重用 |
|---|---|---|---|
| 1 命題與真值表 ✅ | Counterexample | 兩條主張：一條找反例，一條宣告成立 | `sim.dm.evalExpr` |
| 2 邏輯等價 | Counterexample | 找出讓兩式不同的一列；等價時宣告等價 | `sim.dm.evalExpr` |
| 3 量詞 | Counterexample | 在論域中點選反例 x；全稱與存在互相否定 | quant 實驗* |
| 4 數位邏輯電路 | Target | 設 A、B、Cin，讓全加器輸出指定的 S、Cout | circuit 實驗* |
| 5 集合 | Manipulation | 點選元素組成 A △ B | sets 實驗* |
| 6 關係 | Counterexample | 找出破壞遞移性的有序對 | relation 實驗* |
| 7 函數 | Counterexample | 找兩個對到同一輸出的輸入（不是單射） | function 實驗* |
| 8 偏序與 Hasse 圖 | Manipulation | 刪掉不屬於 Hasse 圖的邊 | poset 實驗* |
| 9 證明方法 | Reasoning | 依命題選證明方法並選理由 | — |
| 10 數學歸納法 | Reasoning | 找出一份歸納證明錯在哪一步 | — |
| 11 迴圈不變量 | Step | 每一輪選出成立的不變量 | invariant 實驗* |
| 12 計數與鴿籠 | Target | 至少放幾個才保證某盒 ≥ k | count 實驗* |
| 13 排列組合 | Manipulation | 填 Pascal 三角形的格子 | comb 實驗* |
| 14 容斥 | Target | 調整人數讓 \|A ∪ B\| 等於目標 | inclusion 實驗* |
| 15 遞迴關係 | Step | 算出下一項 | recurrence 實驗* |
| 16 生成函數 | Manipulation | 卷積的係數 | genfunc 實驗* |
| 17 歐幾里得演算法 | Step | 下一組 (a, b) 與商 | euclid 實驗* |
| 18 模運算與 RSA | Step | 快速冪的下一步；求逆元 | mod 實驗* |
| 19 握手引理 | Reasoning | 判斷度數序列能不能畫成圖，並選理由 | graph 實驗* |
| 20 BFS／DFS | Step | 下一個拜訪的節點 | traverse 實驗* |
| 21 Euler 路徑 | Manipulation | 加一條邊讓 Euler 路徑存在（多解） | euler 實驗* |
| 22 樹 | Counterexample | 加一條邊造成環，說明 n − 1 性質 | tree 實驗* |
| 23 條件機率 | Target | 選事件 A，讓 P(A \| B) 等於目標值 | prob 實驗* |
| 24 有限自動機 | Counterexample | 輸入一個字串，讓錯誤的 DFA 判錯 | dfa 實驗* |

DM 的實驗都在 `labFrames(type, v)` 一個函式裡，各分支的計算要先抽成純函式，像這次的 `evalExpr`。

### AI（24 章）

| 章 | 題型 | 挑戰 | 重用 |
|---|---|---|---|
| 1 AI 全貌 | Reasoning | 依任務選學習類型，並選理由 | — |
| 2 向量與矩陣 | Manipulation | 調向量，讓兩向量的 cos 相似度為 0 | vector 實驗* |
| 3 梯度下降 ✅ | Target | 調 η 達成兩種收斂條件 | `sim.ai.gd` |
| 4 Bayes | Target | 調特異度，讓陽性後驗 ≥ 50% | bayes 實驗* |
| 5 線性迴歸 | Target | 調 w、b，讓 MSE ≤ 門檻（任何合格的 w、b 都接受） | `sim.ai.mseOf` |
| 6 分類與指標 | Target | 調門檻，讓 recall ≥ 0.8 時 precision 最高 | classification 實驗* |
| 7 kNN | Counterexample | 選一個 k，讓查詢點的分類翻轉 | knn 實驗* |
| 8 SVM | Manipulation | 點出支持向量 | `sim.ai.svmBest` |
| 9 決策樹 | Step | 選第一個切分特徵（Gini 最小，同分都接受） | `sim.ai.gini` |
| 10 K-means | Step | 把每個點指派給最近的中心 | kmeans 實驗* |
| 11 PCA | Reasoning | 判斷主成分方向並選理由 | — |
| 12 Q-learning | Step | 算一次 TD 更新後的 Q 值（數值，容許誤差） | qlearn 實驗* |
| 13 感知器 | Manipulation | 調權重與偏差，讓感知器實現 AND | neuron 實驗* |
| 14 反向傳播 | Step | 鏈式法則的下一個偏導數（數值，容許誤差） | backprop 實驗* |
| 15 正則化 | Target | 調 λ，讓驗證誤差落在最低區間 | regularization 實驗* |
| 16 CNN | Manipulation | 算出卷積輸出的指定格 | cnn 實驗* |
| 17 RNN／LSTM | Reasoning | 長距離依賴與閘門的作用 | — |
| 18 Diffusion | Reasoning | 加噪與去噪的步驟 | — |
| 19 Attention | Manipulation | 調 query，讓注意力集中到指定的 token | attention 實驗* |
| 20 Tokenization | Step | BPE 的下一次合併 | token 實驗* |
| 21 Sampling | Target | 調溫度或 top-p，讓指定 token 的機率 ≥ x | `sim.ai.softmax` |
| 22 RAG | Step | 依相似度排出檢索結果 | rag 實驗* |
| 23 Agent | Reasoning | 依任務選擇工具呼叫流程 | — |
| 24 評估與安全 | Reasoning | 依情境選指標與風險控管 | — |

## 5. LA、CO、ASM 設計方案（尚未修改教材）

這三門課目前是獨立的單一檔案（`la/index.html`、`co/index.html`、`asm/index.html`），沒有接上共用的 `cslab-app.js`、`CSLab.sim` 與外觀層。要掛上 Challenge API，要先依序做兩件事：
1. 把它們移植到共用框架，做法和之前移植 OS、DSA、DM、AI 一樣：教材轉成 `content.js`，實驗註冊成 `CSLab.register`／`frameLab`；
2. 把計算抽成 `CSLab.sim.la / co / asm` 的純函式。

在這之前不建議在原檔裡另外寫一套挑戰。

### LA（線性代數）：現有實驗是 2×2 矩陣與平面圖

| 主題 | 題型 | 挑戰 | 驗證 |
|---|---|---|---|
| Vector | Manipulation | 調 v 的分量，讓 v 和 u 正交、或 ‖v‖ 等於指定長度 | u·v = 0，容許誤差 1e-9；整數輸入時要精確 |
| Matrix Transformation | Target | 調 2×2 矩陣的四個元素，把正方形變成指定的平行四邊形（例如面積 6、方向翻轉） | det A = −6；多組矩陣都接受 |
| Matrix Transformation | Counterexample | 主張「AB = BA」：找一組 A、B 推翻它 | 直接計算 AB − BA ≠ 0 |
| Eigenvalue | Manipulation | 在單位圓上轉動向量 x，找到 Ax 與 x 共線的方向 | 叉積 \|Ax × x\| ≤ ε，兩個特徵方向都接受；重根與複數特徵值另外處理（「沒有實特徵向量」也是合法的宣告） |
| Eigenvalue | Step | 冪迭代的下一步向量（正規化後，容許誤差） | 與 `sim.la.powerStep` 比較 |

### CO（計算機組織）：現有實驗是 clock、bits、logic、fsm、register、pipeline 等計算

| 主題 | 題型 | 挑戰 | 驗證 |
|---|---|---|---|
| Logic Gates | Manipulation | 只用 NAND 組出指定的真值表（點選連線） | 枚舉所有輸入，比對真值表；不同電路只要真值表相同都接受 |
| Logic Gates | Counterexample | 找出一組輸入，讓錯誤的化簡式與原式不同 | 共用 DM 的 `evalExpr` |
| Datapath | Step | 執行一道 R-type／lw 指令時，下一個要啟用的控制訊號或資料路徑元件 | 每一步的合法集合由指令類型決定；不在意順序的訊號都接受 |
| Cache | Step | 給一串位址，判斷每次是 hit 或 miss，並寫出 tag、index | 與 `sim.co.cacheAccess(addr, config)` 比較 |
| Cache | Target | 調區塊大小與相聯度，讓指定存取序列的 miss rate ≤ 目標 | 模擬計算；多種設定都接受 |
| Pipeline | Manipulation | 在五段管線圖插入 stall 或 forwarding，消除資料危障 | 檢查每條指令讀取來源時資料已經可用；最少 stall 數另外給評語，不強制唯一排法 |

### ASM（RISC-V 組合語言）：現有的指令模擬器已有 parse、reg、step

| 主題 | 題型 | 挑戰 | 驗證 |
|---|---|---|---|
| RISC-V Instruction | Step | 預測一條指令執行後改變了哪個暫存器、值是多少 | 用模擬器的 `step` 執行，比較暫存器 |
| Register | Target | 只用 addi、slli、add 等指令，讓 a0 等於指定值，指令數 ≤ k | 執行玩家的程式；任何結果正確的程式都接受；限制步數避免無窮迴圈 |
| Memory | Manipulation | 填出 sw 之後的記憶體內容（little-endian 位元組順序） | 執行後比較記憶體 |
| Branch | Counterexample | 找出一組 a0、a1，讓有 bug 的 max 程式回傳錯誤 | 執行並與規格比較；任何反例都接受 |
| Branch | Step | 預測迴圈每一輪 beq／bne 跳或不跳 | 用模擬器的 trace 比較 |

ASM 的挑戰要執行玩家寫的程式，所以模擬器要加上步數上限、合法指令白名單，以及暫存器、記憶體的範圍檢查。

## 6. 擴展步驟

1. 原型確認後，先一般化介面：`bsearch-step` 改成 `pick-next`，`truth-counter` 改成 `find-counter`，`lr-target` 改成 `param-target`；再加上 `fill-table` 與 `choose-reason`。
2. 一次擴展一門課。先把該課要用的計算抽成 `CSLab.sim` 純函式，並確認實驗改用它之後原本的測試仍通過，再補題目資料。
3. 每題至少測：
   - 一個合法解；
   - 每一種多解；
   - 一種失誤（訊息不洩漏答案）；
   - 邊界值；
   - 390px 不溢位。
4. 題目 id 一旦發布就不改；要換題就用新 id，舊紀錄保留但不再顯示。
