# CS LAB / OS LAB — 資工互動式自學網站

🌐 [開啟互動課程](https://duicn187532.github.io/os-lab/)

繁體中文、完全靜態的資工互動教材。根目錄是九門課（ICS、OS、DM、DSA、LA、AI、CO、ASM、NET）的入口網；本儲存庫的主課程 **OS LAB**（`os/`）以「先預測 → 生活類比 → 回到真實機制 → 操作模擬器 → 測驗檢核 → 錯題複習」的節奏學習作業系統。

## NET LAB 資工系教材深化版

計算機網路課程已擴充為 **28 章、112 題測驗、27 種互動實驗、28 題四語言程式挑戰**，包含 BGP、Wi-Fi、QUIC/HTTP/3、IPv6 與雲端網路及網路診斷。原有 22 章 ID 與進度相容；每章包含 L2 原理與 L3 驗證探究。**課程目標、標準參考、模型限制與驗證方式**見 [NET LAB 進階講義說明](net/TEXTBOOK-EXTENSION.md)。

## OS LAB 內容

**29 章 · 29 個專屬模擬器 · 174 題測驗 · 127 個術語 · 27 項 MathML 公式 · 37 題四語言程式挑戰**

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

## OS LAB 資工系教材深化

原有 21 章均補充 L2 演算法、狀態表、計算推導、正式 MathML 公式與 L3 可執行驗證規格；另新增 8 章（Boot/ELF、IPC、Atomic/Condition Variable、COW/mmap、多層頁表/Clock、VFS/Journaling、epoll/NVMe、procfs/perf/cgroups）。每章新增可在瀏覽器評測的 C/C++/Python/JavaScript 程式挑戰，並有 8 題進階演算法綜合專題；真正涉及 POSIX API 的實驗另提供 4 份可在 Linux/WSL2 編譯執行的範例。

課程規劃、學習評量、系統模擬假設、Linux 作業及 RFC／Kernel 文件對照詳見 [OS LAB 進階講義](os/TEXTBOOK-EXTENSION.md)。保留原有 21 章 ID、測驗、筆記與 localStorage 進度鍵。

## 學習功能

- **三階段章節**：① 觀念（學習目標、先寫下猜測、ELI5、深入原理、流程、常見誤解、程式碼、重點回顧、術語、自己的解釋）→ ② 實驗 → ③ 測驗。
- **模擬器**：先預測再操作；支援「上一步」回看、重設，以及可調速的自動播放（切換頁籤或隱藏頁面即暫停）。
- **測驗與錯題本**：每題兩次機會，第一次只給提示；答錯的題目進入錯題本，可做錯題複習或 8 題跨章節混合練習。
- **互動挑戰（NPC Q&A）**：章節頁尾的互動自我檢測，依學科設計成操作題而不是文字選擇題：選演算法的下一步、找反例、調參數達成目標…玩家先操作，系統用確定性的規則（或實驗的同一個模擬函式）驗證，之後才看得到解析。多種合法答案都接受、數值有容許誤差；提示依序給，失誤兩次後才能看解答。目前是四個原型：DSA 第 7 章二分搜尋的下一步、OS 第 5 章 SRTF 排程、DM 第 1 章真值表找反例、AI 第 3 章調學習率。設計、API 與 87 章規劃見 [`docs/interactive-challenges.md`](docs/interactive-challenges.md)。
- **程式實作（④ 實作頁籤）**：有實作題的章節多一個頁籤，在瀏覽器裡真的編譯、執行 C、C++、Python、JavaScript 並用測資評測（隔離方式與限制見 [`challenge-poc/README.md`](challenge-poc/README.md)）。大型測資刻意讓暴力解逾時，必須用本章的方法；第一次通過全部測資才記錄並得經驗值。楓之谷外觀是「程式討伐」：任務 NPC 出題，怪物 HP＝測資數，每通過一筆打掉一格。目前 DSA 每章一題（18 題，預設 Python）、ICS 每章一題（20 題，預設 C++）、NET 每章一題（28 題，預設 Python；瀏覽器沙盒不能連網，題目都是模擬協定或解析封包）。
- **工具頁**：實驗總覽、公式速查、術語表（中英對照）、我的筆記（匯出 Markdown、備份 / 還原進度 JSON、列印）。
- **體驗**：可分享的網址（`#/ch/4/lab`）、瀏覽器上一頁、`/` 或 `Ctrl+K` 全文搜尋、`[` `]` 切換章節、`A`–`D` 作答、深色 / 淺色主題、手機抽屜選單、尊重「減少動態效果」。
- **隱私**：沒有帳號、後端或追蹤；進度、筆記與錯題本只存在瀏覽器 localStorage（沿用舊版鍵值 `os_lab_2026_v1`，舊進度不會遺失）。

## 外觀：楓之谷與學術閱讀

入口網與共用 shell 上的六門課（ICS、OS、DSA、DM、AI、NET）預設使用「楓之谷」外觀（舊版楓之谷用戶端的遊戲視窗、NPC 對話框、MiniMap、任務圖示與場景），頂列的 🍁 按鈕可隨時切回原本的學術閱讀外觀。切換只改外觀：教材、測驗紀錄、錯題本與實驗狀態都不受影響；外觀選擇存在 localStorage 的 `cslab.skin`，所有課程共用。

- **素材**：遊戲美術屬 Nexon 所有。本儲存庫**不收錄任何遊戲圖檔**，而是引用 [self-research](https://github.com/duicn187532/self-research) 已發布在同一個 GitHub Pages 網域的 `/self-research/assets/maple/`。素材載不到時（例如只部署本儲存庫）自動維持學術外觀並隱藏切換按鈕。
- **規範**：`.claude/skills/maple-skin/` 是沿用自 self-research 的 maple-skin Skill（素材組裝、9-slice、精靈圖、RWD 規範與建圖腳本），其中「In this repo's site (CS LAB)」一節說明本站的對應方式。
- **共用層**：`shared/skin-maple.css`（全部楓之谷樣式，含入口網）與 `shared/cslab-skin.js`（切換、素材探測、NPC 精靈圖）。精靈圖只在楓之谷外觀時載入、離開畫面時暫停，尊重「減少動態效果」。
- **場景**：ICS、OS、DM 在弓箭手村，DSA、AI、NET 在魔法森林，入口網是登入畫面（`<html data-scene>`）。
- **其他課程**：LA、CO、ASM 為獨立 HTML，之後以小型 adapter 樣式表把各自的元件對應到同一組視窗（見 Skill 說明）。
- **遊戲性**（`shared/cslab-game.js`，做法沿用 self-research 的經驗值、狀態列與章節討伐，只在楓之谷外觀出現）：
  - **經驗值與等級**：完全由各課既有的進度推算，不另外累加——讀完觀念 +30、第一次操作實驗 +30、寫了筆記 +20、完成測驗 +100（精英章再 +100、BOSS 章再 +200）、完成的章節裡每題不在錯題本 +10（錯題複習答對就加回來）、整門課完成 +500。各課把總和與稱號快取在 `cslab.exp`，入口網與各課加總成同一位角色；一門課全部完成約 LV.10。和 self-research 的角色分開。
  - **狀態列**：畫面底部的楓之谷狀態列（等級數字、職業稱號、經驗值條），上方公告輪流顯示目前任務、升級與稱號。
  - **隊伍**：主角（每門課固定殺人鯨或露希妲）、另一位當夥伴，加上寵物，服裝每章不同。隊伍站在每章頁尾的換章按鈕上跟著你走，章節完成後「下一章」上方出現傳送門；課程首頁站在 NPC 對話框上；入口網則是殺人鯨、露希妲、另一位冒險家與寵物站在卷軸上。
  - **NPC 對話**：「學完這一章，你能夠…」由委託任務的 NPC 開口（任務圖示依章節狀態：可接受 / 進行中 / 完成），生活類比由另一位 NPC 導讀，測驗由出題的 NPC 提問。
  - **章節怪物**：每個單元的最後一章是精英、整門課的最後一章是 BOSS，其他章各有一隻怪物；未完成的章節，怪物在章節標頭上巡邏；課程首頁「你的進度」上巡邏的是下一個任務的怪物；入口網的標題木牌上也有怪物。
  - **測驗討伐**：測驗規則不變（兩次機會、提示、錯題本、紀錄），只是畫成打怪——測驗視窗上緣是戰場，左邊是隊伍、右邊是這一章的怪物。HP 是題數，答對一題主角衝上去打掉一格並跳出傷害數字；答錯一次怪物反擊、少一顆心（兩顆心＝兩次機會），兩次都錯是 MISS。全部答對是討伐成功（怪物倒下），否則怪物逃走；兩種結果都照原本規則完成章節。完成後主角歡呼、頭上浮出得到的經驗值，升級時播放光柱。錯題複習也是一場戰鬥。手機上戰場取代出題 NPC，對話框維持全寬。
  - **怪物挑戰**：頁尾的互動挑戰在這個外觀是一場怪物挑戰：NPC 出題、卡片上站著一隻小怪，HP 是關數；失誤時牠擋下、過一關打掉一格、完成時倒下，先看解答則逃走。經驗值依存下來的紀錄算一次：沒有失誤也沒看提示 +60、失誤加提示 1–2 次 +40、更多 +20、看過解答 0，再挑戰、重新整理都不會多拿。
  - **公告列**輪流顯示這一頁的重點：觀念頁的學習目標、先想一想的問題與重點回顧，實驗頁的預測題，測驗頁的戰況說明。
  - 打倒各課 BOSS 得到稱號（OS「核心守護者」、DSA「演算法劍士」、DM「邏輯賢者」、AI「神經網路術士」、ICS「程式見習生」、NET「封包信使」）。
  - 狀態列、角色與戰況列都是裝飾（`aria-hidden`、不可聚焦），同樣的進度在側欄、頁籤與測驗回饋都有文字；減少動態效果時不巡邏、不播特效；學術外觀時全部隱藏。
- **擴充介面**：`cslab-app.js` 在 `document` 上發出 `cslab:render`、`cslab:quiz-view`、`cslab:answer`、`cslab:progress` 事件，`cslab-challenge.js` 發出 `cslab:challenge`；`window.CSLabSkin` 提供 `skin`、`active`、`set()`、`url()`、`npc()`、`onChange()` 與精靈圖引擎 `sprite`；`window.CSLabGame` 提供經驗值公式、章節等級與目前等級。

## 檔案結構與共用 shell

ICS、OS、DM、DSA、AI 與 NET LAB 共用同一套應用程式外殼（`shared/`）：路由、進度、測驗、錯題本、搜尋、術語、公式、筆記、主題與自動播放只寫一次，每門課只提供教材資料、課程設定與自己的實驗。其餘課程（LA、CO、ASM）預計依序遷移。

```
index.html                  七門課入口網
shared/cslab-app.js         共用應用程式：頁面骨架、路由、進度、測驗（正解位置均衡、選項固定種子排列）、錯題本、搜尋、筆記
shared/cslab-ui.js          實驗註冊表與 UI 工具、DOM 比對更新、逐步框架實驗轉接器、通用綜合複習實驗
shared/cslab.css            設計變數（淺色 / 深色）、版面與共用元件（學術外觀）
shared/skin-maple.css       楓之谷外觀（只在 <html data-skin="maple"> 時生效；圖片引用 self-research 的 assets/maple/）
shared/cslab-skin.js        外觀切換、素材探測、NPC 精靈圖；擴充介面 window.CSLabSkin
shared/cslab-challenge.js   互動挑戰的共用 API（CSLab.challenge）：卡片、提示、失誤、看解答的條件、紀錄
shared/cslab-game.js        遊戲層：經驗值與等級、狀態列、章節怪物、測驗討伐、怪物挑戰（window.CSLabGame）
docs/interactive-challenges.md  互動挑戰的設計、API、四個原型、87 章規劃與 LA / CO / ASM 方案
shared/cslab-code.js        程式實作頁籤（CSLab.code）：題目註冊、編輯器畫面、草稿、提交紀錄；第一次打開才載入 shared/code/
shared/code/                編輯器、評測、執行環境（沙箱 iframe ＋ Worker；C/C++ 用瀏覽器內的 Clang，Python 用 Pyodide）
shared/code/tools/vendor.sh 下載執行環境到 shared/code/vendor/（不進 git，部署時執行）
challenge-poc/              四語言 Coding Challenge 原型與安全評估（說明見其 README.md）
.claude/skills/maple-skin/  maple-skin Skill（規範、參考頁面、建圖腳本；不含遊戲圖檔）
os/index.html               OS LAB 頁面（原模組外加進階教材、模擬器和程式判題）
os/assets/content.js        原有教材資料：章節、測驗、術語、公式
os/assets/depth.js          原 21 章 L2/L3 深化
os/assets/advanced-content.js  8 個新章節、術語與公式
os/assets/advanced-labs.js     8 個新互動模擬
os/assets/advanced-code.js     29 題四語言 Judge（10 題改為狀態式演算法）及 8 題 capstone
os/assets/code-examples.js     21 章可獨立執行的 C/Python/Bash 範例
os/assets/textbook-rigor.js  29 章 L2/L3 結構與 MathML 公式
os/assets/course.js         課程設定：名稱、localStorage 鍵、首頁文案
os/assets/labs-core.js      執行、排程、並行類實驗
os/assets/labs-more.js      記憶體、儲存、系統、整合類實驗
os/assets/os-labs.css       OS 專屬實驗樣式
os/assets/challenges.js     OS 的互動挑戰（操作介面與題目資料）
dsa/assets/code.js          DSA 每章一題的程式實作（題目、測資產生與參考解、四語言起始程式碼）
dm/assets/…                 DM LAB 的同類檔案（labs.js 為 24 種逐步實驗）
dsa/assets/…                DSA LAB 的同類檔案（labs.js 為 18 種逐步實驗）
ai/assets/…                 AI LAB 的同類檔案（labs.js 為 24 種逐步實驗，course.js 另含舊版 ailab.* 進度轉換）
ics/assets/…                ICS LAB（計算機概論，C++ 打底）：20 章教材、19 種逐步實驗（labs.js，模擬器在 CSLab.sim.ics）、每章一題 C++ 為主的程式實作（code.js）
net/assets/…                NET LAB（計算機網路）：28 章教材、27 種逐步實驗、28 題四語言程式挑戰；新教材模組見 net/TEXTBOOK-EXTENSION.md
tests/os-review.cjs         OS LAB 端對端檢查
tests/dm-review.cjs         DM LAB 端對端檢查
tests/dsa-review.cjs        DSA LAB 端對端檢查
tests/ai-review.cjs         AI LAB 端對端檢查
tests/ics-review.cjs        ICS LAB 端對端檢查（教材欄位、每個實驗選項、模擬器對照課文、兩種外觀的手機版面）
tests/net-review.cjs        NET LAB 端對端檢查（同上；模擬器對照課文的 GBN / SR、Reno / Tahoe、Dijkstra、CRC、分段、DH）
tests/skin-review.cjs       外觀層檢查（入口網、OS、DSA、DM、AI）
tests/game-review.cjs       遊戲層檢查（經驗值、討伐、狀態列）
tests/challenge-review.cjs  互動挑戰檢查（四個原型的驗證規則、多解、誤差、紀錄、經驗值、兩種外觀）
tests/coding-poc.cjs        Coding Challenge 原型的功能與安全檢查（tests/poc-server.cjs 模仿 GitHub Pages 標頭，coding-poc-perf.cjs 量效能）
tests/code-review.cjs       程式實作頁籤：每題的參考解（tests/fixtures/<課程>-solutions.cjs）、起始程式碼、暴力解逾時、操作流程、兩種外觀
```

沒有建置步驟。

### 新增一門課到共用 shell

1. 建立 `<課程>/assets/content.js`：`{ units, lessons, glossary, formulas }`。每章必要欄位為 `id`（穩定識別碼，進度依此儲存）、`unit`、`title`、`lab`、`quiz`（`[題目, 選項, 正解索引, 提示, 解析]`）；選用欄位 `short`、`minutes`、`goals`、`ask`、`analogy`、`why`、`details`（`[標題, 說明]` 或字串）、`steps`、`worked`、`caveat`、`code`（`[語言, 程式碼]`）、`summary`、`terms`。陣列順序就是顯示順序。
2. 建立 `course.js`：`window.CSLAB_COURSE = { id, name, mark, title, storageKey, eyebrow, heroTitle, heroLead, footer, disclaimer, data }`。沿用舊版的 localStorage 鍵即可保留學習者的已完成章節、筆記與主題；舊版若把進度分存在多個鍵，就在 `course.js` 裡於第一次載入時匯入（範例見 `dsa/assets/course.js`）。
3. 實驗以 `CSLab.register(type, { title, prompt, init, view, act, set, auto })` 註冊；「輸入 → 一串步驟畫面」型的實驗可直接用 `CSLab.frameLab(type, { title, inputs, frames })`。純計算函式掛在 `CSLab.sim` 方便測試。
4. 頁面依序載入 `content.js`、`course.js`、`../shared/cslab-ui.js`、實驗檔、`../shared/cslab-challenge.js` 與 `challenges.js`（有互動挑戰時）、`../shared/cslab-code.js` 與 `code.js`（有程式實作時；`course.js` 可用 `codeLang` 指定預設語言）、`../shared/cslab-app.js`，要楓之谷外觀再加 `../shared/cslab-skin.js` 與 `../shared/cslab-game.js`（以及 `<head>` 的 `skin-maple.css` 與一行外觀程式，照 `os/index.html` 複製）。

## 本機預覽與測試

```sh
python -m http.server 8000
# 另一個終端（需要 Node.js 與 Playwright）
node tests/os-review.cjs
node tests/dm-review.cjs
node tests/dsa-review.cjs
node tests/ai-review.cjs
node tests/ics-review.cjs   # 預設網址是 /os-lab/ics/，只開本儲存庫時用 TEST_URL=http://localhost:8000/ics/
node tests/net-review.cjs   # 預設網址是 /os-lab/net/，同上
```

只開本儲存庫時是學術外觀。要預覽楓之谷外觀，把 os-lab 與 self-research 放在同一個目錄，從那一層啟動伺服器（網址對應 GitHub Pages 的 `/os-lab/` 與 `/self-research/`）：

```sh
cd ..            # 同時有 os-lab/ 與 self-research/
python -m http.server 8000
TEST_URL=http://localhost:8000/os-lab/os/ node os-lab/tests/os-review.cjs   # 其他課程同理
node os-lab/tests/skin-review.cjs
node os-lab/tests/game-review.cjs
node os-lab/tests/challenge-review.cjs   # TEST_ROOT=http://localhost:8001/ 可測只開 os-lab（沒有素材）的情況
bash os-lab/shared/code/tools/vendor.sh                 # 程式實作要用的執行環境（約 114 MB，不進 git）
node os-lab/tests/coding-poc.cjs                         # Coding Challenge 原型（自己啟動伺服器）
node os-lab/tests/code-review.cjs dsa                    # 程式實作頁籤（QUICK=1 只跑 Python 參考解；ics、net 同理）
```

可用 `CHROMIUM_PATH` 指定瀏覽器、`TEST_URL` 指定網址、`SHOT_DIR` 輸出截圖（OS）。

- **OS**：原始教材保留、每章欄位完整、演算法與教科書手算結果一致（SRTF、Banker、FIFO/LRU/OPT、Belady、磁碟排程…）、全部 29 個實驗的按鈕操作、174 題作答、正解位置均衡（全課程與每章）且重新整理不變、錯題本流程、路由與上一頁、播放與回看、搜尋、重新整理後保留進度、手機版無水平溢位。
- **ICS**：20 章欄位齊全且程式範例都是 C++、術語都在術語表、19 個實驗的每一個選項都能產生步驟、模擬器結果與課文一致（進位轉換、二補數溢位、迷你 CPU、子網路、fib 呼叫次數、凱薩密碼、cin 讀取陷阱）、80 題作答、正解位置均衡、錯題本、搜尋、工具頁、兩種外觀的手機版無水平溢位；程式實作 20 題的 C++ / Python / JavaScript 參考解全部通過、四語言起始程式碼都能編譯執行（WA）、試除法與 O(n²) 去重逾時。
- **NET**：22 章欄位齊全且程式範例都是 Python、術語都在術語表、21 個實驗的每一個選項（含兩兩組合）都能產生步驟、模擬器結果與課文一致（GBN 10 次 / SR 7 次、Reno 與 Tahoe 的 cwnd、VLSM、最長前綴匹配、Dijkstra 轉送表、距離向量回合數、分段位移、CRC 餘數、Diffie-Hellman）、88 題作答、正解位置均衡、錯題本、搜尋、工具頁、兩種外觀的手機版無水平溢位；程式實作 22 題的 C++ / Python / JavaScript 參考解全部通過、四語言起始程式碼都能編譯執行（WA）、逐筆比對的最長前綴匹配與 Bellman-Ford 逾時。
- **DM**：舊版單檔的 24 章與 72 題逐字保留、舊版 localStorage 進度 / 筆記 / 主題相容、24 個逐步實驗、正解位置均衡（全課程與每章）且重新整理不變、自動播放、錯題本、搜尋、手機版無水平溢位。
- **DSA**：舊版單檔的 18 章與 54 題逐字保留、舊版四個 `dsa.*` 鍵的進度 / 筆記 / 主題 / 答錯紀錄會匯入、18 章各有不同的實驗（選型、Dijkstra 距離、快取未命中數另有計算檢查）、提示後才給解析、正解位置均衡（全課程與每章）且重新整理不變、自動播放、錯題本、搜尋、手機版無水平溢位。
- **AI**：舊版單檔的 24 章與 72 題逐字保留（每題另有提示）、舊版四個 `ailab.*` 鍵的進度 / 筆記 / 主題 / 錯題與 `#/chapter/…` 舊網址相容、24 個實驗都至少 5 步、小數參數不被取整、正解位置均衡（全課程與每章）且重新整理不變、自動播放、錯題本、搜尋、手機版每個實驗步驟都無水平溢位。
- **外觀**：圖片路徑全部指向 self-research 且檔案存在、本儲存庫沒有遊戲圖檔、預設楓之谷、鍵盤切換、切換前後測驗作答次數 / 錯題本 / 實驗狀態 / 課程資料不變、重新整理後維持選擇、只下載畫面上用到的精靈圖、離開畫面暫停、減少動態效果時不動、沒有素材時退回學術外觀、兩種外觀在 390px 與 1280px 的入口網與 OS、DSA、DM、AI 每一頁都沒有水平溢位、桌面的 NPC 肖像不壓到對話框按鈕列。
- **遊戲**：隊伍是殺人鯨與露希妲加寵物、站在頁尾與測驗戰場、任務與導讀 NPC、章節完成後出現傳送門；經驗值依進度推算的數值（OS 660、DSA 130、合計 790 → LV.4，入口網相同）、只寫 `cslab.exp`、測驗討伐的心數 / HP / MISS / 撤退跟著原本的作答次數走且第二次機會照舊、完成章節的經驗值與 EXP 字樣、怪物倒下、錯題複習答對 +10、遊戲元素不可聚焦且對輔助技術隱藏、學術外觀時全部隱藏、減少動態效果時不巡邏、沒有素材時完全不出現。
- **互動挑戰**：四個原型的題目資料欄位齊全且 id 穩定；只在觀念、實驗頁籤出現；完成或看解答之前沒有解析，「看解答」在失誤兩次後才開放；二分搜尋的中點上整、下整都接受，方向錯、範圍未空就宣告找不到都算失誤；SRTF 還沒到達、不是剩餘最短的工作被拒絕，同分的兩個工作都接受，平均 WT 接受分數與 0.01 的誤差；真值表的兩組反例都接受、同一組不重複扣分、重言式要宣告成立；學習率的邊界 0.20 / 0.21、0.5、0.51（浮點）、0.79 / 0.80 判定正確，發散有說明；失誤重新整理後仍在；經驗值只算一次，看過解答為 0；鍵盤可操作；學術外觀是互動自我檢測，楓之谷外觀是怪物挑戰；390px 作答中與完成後都不溢位。
- 全部都要求沒有任何瀏覽器錯誤（只開 os-lab 時，選用的楓之谷素材載入失敗不算）。

## 發布到 GitHub Pages

`.github/workflows/pages.yml` 會在推送到 `main` 時把整個儲存庫發布到 `gh-pages` 分支。到 **Settings → Pages**，選 **Deploy from a branch**、分支 `gh-pages`、目錄 `/(root)`。

> 部分手機的「檔案預覽」不執行 JavaScript；請用瀏覽器開啟，或使用 GitHub Pages 網址。

## 教材定位

教材內容為原創整理，參照作業系統課程與《Operating System Concepts》等教科書的常見知識範疇，但不是任何書籍的翻譯、逐頁改編或官方配套教材。模擬器刻意簡化，不是真實的 Linux Kernel 模擬器；請搭配真正的 Linux C 實驗、xv6 與原始碼深入學習。
