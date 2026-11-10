/* OS LAB 教材資料。
 * 每章欄位：goals 學習目標、ask 開場問題、analogy 生活類比、why 存在理由、details 深入原理、
 * steps 流程、caveat 類比界線、summary 重點回顧、terms 關鍵術語（對應 glossary.id）、lab 互動實驗類型、
 * code [語言, 程式碼]、quiz [題目, 選項, 正解索引, 提示, 解析]。
 * id 是穩定識別碼（學習進度依此儲存），陣列順序才是顯示順序。 */
window.OS_DATA = {
 "units": [
  "基礎",
  "執行",
  "排程",
  "並行",
  "記憶體",
  "儲存",
  "系統",
  "整合",
  "實驗",
  "複習"
 ],
 "lessons": [
  {
   "id": 0,
   "unit": "基礎",
   "title": "電腦到底如何執行程式？",
   "short": "從 0、1 到 CPU 指令",
   "minutes": 18,
   "icon": "▣",
   "goals": [
    "說出 CPU、RAM、儲存裝置各自扮演的角色",
    "描述 Fetch → Decode → Execute 週期中 PC 與暫存器如何變化",
    "解釋為什麼需要 timer interrupt，OS 才能取回 CPU 控制權"
   ],
   "ask": "當你按下「執行 Python」，真正開始動的是誰？",
   "analogy": "把 CPU 想成只會依照菜譜一步一步做菜的廚師；RAM 是工作檯，SSD 是倉庫；暫存器是廚師手上正拿著的材料。作業系統是廚房的調度者，負責讓很多人安全共用廚房。",
   "why": "CPU 不理解 Python 或 C 的語法，只執行機器指令。程式執行前，需先取得可執行指令與執行環境；OS 建立行程、安排記憶體與執行緒，CPU 才能取得指令。",
   "details": [
    [
     "指令週期",
     "簡化成 Fetch（取指）→ Decode（解碼）→ Execute（執行）→ Retire（提交）。真實 CPU 可能管線化、亂序執行；這裡先抓住邏輯。"
    ],
    [
     "關鍵暫存器",
     "PC / IP 指向下一個待執行的指令位置；SP 指向堆疊；一般暫存器保存運算數或結果。PC 不是行程 ID。"
    ],
    [
     "記憶體階層",
     "暫存器、快取、RAM、SSD：通常越接近 CPU 越快且越小。檔案在 SSD 上，執行時會用到 RAM（含快取與虛擬記憶體）。"
    ],
    [
     "從硬體推導 OS",
     "單個 CPU 核心在同一個硬體執行脈絡中，瞬間只能沿著一個指令流進行。多工作需要排程、時脈中斷，以及儲存／恢復執行狀態。"
    ]
   ],
   "steps": [
    "程式碼經編譯或解譯環境準備成可執行指令",
    "OS 建立執行環境、位址空間與執行緒",
    "CPU 從 PC 指示的位置取出指令",
    "重複取指、解碼、執行；必要時與 OS 互動"
   ],
   "caveat": "「CPU 每秒只跑一個程式」並不精確：現代 CPU 有多核心、SMT，也可能指令並行。先以「單一邏輯核心」思考，之後再擴展。",
   "summary": [
    "CPU 只執行機器指令，PC 決定下一條指令的位置。",
    "記憶體階層以速度換容量：執行中的指令與資料靠 RAM 與快取供應。",
    "Timer interrupt 讓核心定期取回 CPU，這是分時多工的硬體基礎。"
   ],
   "terms": [
    "pc",
    "register",
    "memory-hierarchy",
    "instruction-cycle",
    "interrupt"
   ],
   "lab": "cpu",
   "code": [
    "C",
    "int a = 7;\nint b = 5;\nint c = a + b;   // 編譯後才是 CPU 能執行的指令"
   ],
   "quiz": [
    [
     "下面哪一個最接近 PC（Program Counter）的作用？",
     [
      "目前使用多少 RAM",
      "指出接下來預期執行的指令位置",
      "記錄程式總行數"
     ],
     1,
     "想想 CPU 需要知道「下一步去哪裡」",
     "PC / IP 追蹤指令流位置。"
    ],
    [
     "為什麼程式檔案存在 SSD，卻仍需要 RAM？",
     [
      "CPU 通常透過記憶體階層存取正在執行的指令與資料",
      "SSD 不能儲存程式",
      "RAM 會永久保留資料"
     ],
     0,
     "SSD 與 RAM 在速度、存取模型與角色有差別",
     "OS 與硬體利用 RAM／快取提供執行中所需的資料與指令。"
    ],
    [
     "Timer interrupt 對作業系統最重要的意義是？",
     [
      "讓 CPU 時脈變快",
      "即使程式不主動讓出 CPU，核心也能定期取回控制權",
      "把資料從 SSD 搬進 RAM"
     ],
     1,
     "如果某個程式寫了無窮迴圈，誰能讓 OS 介入？",
     "計時器中斷會強制進入核心，OS 才能做排程決策，避免單一程式霸占 CPU。"
    ],
    [
     "在本章實驗的簡化模型中，ADD R1, 5 的結果在哪個階段寫入 R1？",
     [
      "FETCH",
      "DECODE",
      "EXECUTE"
     ],
     2,
     "取指與解碼時還沒有真正運算",
     "模型在 EXECUTE 完成時更新暫存器；真實的管線化 CPU 會在寫回（write-back）階段提交結果。"
    ]
   ]
  },
  {
   "id": 1,
   "unit": "基礎",
   "title": "Kernel 與 System Call",
   "short": "程式如何請作業系統幫忙",
   "minutes": 17,
   "icon": "◇",
   "goals": [
    "區分 user mode 與 kernel mode 的權限差異",
    "說明一次 system call 從呼叫、陷入核心到返回的路徑",
    "分辨 mode switch 與 context switch"
   ],
   "ask": "為什麼你的程式不能直接替所有程序修改記憶體？",
   "analogy": "應用程式像住客，核心像大樓管理員。住客不能直接打開其他房間；要開門、使用公共設施，必須透過有檢查權限的櫃台。",
   "why": "特權模式是硬體協助實現的保護邊界。User mode 限制危險操作；Kernel mode 才能執行特權指令與管理保護資源。",
   "details": [
    [
     "Kernel 與作業系統",
     "Kernel 是 OS 中具有特權且核心的部分；OS 還可包括系統函式庫、工具、服務。"
    ],
    [
     "System Call",
     "程式透過標準 API，最終可能觸發 syscalls，例如 read、write、open、fork。函式呼叫不等於系統呼叫，printf 也不等於單一 write。"
    ],
    [
     "Interrupt vs Exception",
     "硬體中斷（interrupt）通常由外部裝置／時脈觸發；exception 由當前指令引起；system call 是程式主動受控進入核心的機制。"
    ],
    [
     "切換成本",
     "進出 kernel mode 不一定就是 context switch。Context switch 涉及切換執行的執行緒／行程與相關執行狀態。"
    ]
   ],
   "steps": [
    "應用程式執行到 read() 等函式",
    "必要時呼叫系統呼叫介面，進入核心",
    "核心驗證 fd、權限及資料位置",
    "執行請求並回到使用者模式"
   ],
   "caveat": "「有 system call 就一定換 Process」是錯的；模式切換（mode switch）與上下文切換（context switch）是兩個不同概念。",
   "summary": [
    "特權模式由硬體強制：user 程式不能直接執行特權指令或碰核心記憶體。",
    "System call 是受控入口：陷入核心 → 驗證參數 → 執行 → 返回。",
    "進入核心 ≠ 換行程；mode switch 與 context switch 是兩種不同的成本。"
   ],
   "terms": [
    "kernel",
    "user-mode",
    "system-call",
    "trap",
    "mode-switch",
    "context-switch"
   ],
   "lab": "syscall",
   "code": [
    "C",
    "#include <unistd.h>\n\nint main(void) {\n    const char m[] = \"hello\\n\";\n    write(STDOUT_FILENO, m, sizeof(m) - 1);\n    return 0;\n}"
   ],
   "quiz": [
    [
     "呼叫 read() 時，哪項敘述最合理？",
     [
      "必然產生新行程",
      "可能經由系統呼叫由核心執行存取",
      "可以略過任何權限檢查"
     ],
     1,
     "想想檔案存取是公共資源操作",
     "讀取涉及核心管控的資源，通常經 OS 系統呼叫處理。"
    ],
    [
     "System call 造成的模式切換，是否必然造成行程切換？",
     [
      "是",
      "否"
     ],
     1,
     "模式和執行主體是不同維度",
     "陷入核心可以在原執行緒上處理並返回，不必換行程。"
    ],
    [
     "為什麼核心必須檢查使用者傳入的 buffer 指標？",
     [
      "指標可能指向核心或其他不屬於此行程的位址",
      "只是為了讓程式跑得更快",
      "C 語言標準規定"
     ],
     0,
     "惡意程式可以把任何數字當作指標傳進來",
     "若不驗證，使用者就可能藉核心之手讀寫受保護的記憶體。"
    ],
    [
     "printf(\"hi\\n\") 與 write() 的關係，哪個描述最精確？",
     [
      "printf 一定等於一次 write",
      "printf 是函式庫函式，可能先緩衝，之後才透過 write 系統呼叫輸出",
      "printf 直接控制螢幕硬體"
     ],
     1,
     "想想 stdout 的緩衝區",
     "C 函式庫會先把資料放在使用者空間的緩衝區，滿了、換行或 fflush 時才呼叫 write。"
    ]
   ]
  },
  {
   "id": 2,
   "unit": "執行",
   "title": "Process：一個程式如何活起來？",
   "short": "行程狀態、PCB、fork / exec",
   "minutes": 22,
   "icon": "◉",
   "goals": [
    "分辨 Program、Process 與 Thread",
    "畫出五狀態模型並判斷哪些轉換合法",
    "說明 fork、exec、wait 的分工"
   ],
   "ask": "一個程式開兩次，會變成什麼？",
   "analogy": "一份食譜（Program）能讓兩位廚師各自開工（兩個 Process）。同一份食譜，不代表他們共用同一張工作檯和材料。",
   "why": "Process 是 OS 管理資源與位址空間的重要單位，而 Thread 是可執行、可排程的執行流。程式檔不是執行中的行程。",
   "details": [
    [
     "PCB",
     "Process Control Block 會保存 PID、狀態、資源、排程和相關執行脈絡等資訊；具體欄位依 OS 實作不同。"
    ],
    [
     "五狀態模型",
     "New → Ready → Running → Waiting / Blocked → Ready → Terminated，是真正 OS 複雜狀態的教學抽象。"
    ],
    [
     "fork / exec / wait",
     "在 POSIX 世界，fork 建立子行程；exec 將當前行程的程式映像替換；wait 類呼叫回收子行程狀態。三者不是同一個動作。"
    ],
    [
     "Context switch",
     "切出目前執行緒、儲存暫存器等必要狀態，再切入另一執行緒。快取/TLB 與位址空間的影響視情境與架構而定。"
    ]
   ],
   "steps": [
    "行程建立後進入 Ready",
    "Scheduler 選中，進入 Running",
    "I/O 等待會進入 Blocked，完成後返回 Ready",
    "完成執行，進入 Terminated"
   ],
   "caveat": "「Blocked 就是在慢慢使用 CPU」是錯的。Blocked 的執行緒通常不占用 CPU 執行時間，正在等待事件。",
   "summary": [
    "Process = 執行中的程式 + 位址空間 + 資源，由 PCB 描述。",
    "Ready 是等 CPU，Waiting 是等事件；事件完成後先回到 Ready。",
    "fork 建立子行程、exec 換掉程式映像、wait 回收子行程的結束狀態。"
   ],
   "terms": [
    "process",
    "pcb",
    "process-state",
    "fork",
    "exec",
    "zombie"
   ],
   "lab": "process",
   "code": [
    "C",
    "#include <unistd.h>\n#include <sys/wait.h>\n#include <stdio.h>\n\nint main(void) {\n  pid_t pid = fork();\n  if (pid == 0) puts(\"child\");\n  else if (pid > 0) { wait(NULL); puts(\"parent\"); }\n}"
   ],
   "quiz": [
    [
     "一個執行緒因等待磁碟 I/O 暫停，它最接近哪個狀態？",
     [
      "Running",
      "Blocked / Waiting",
      "Terminated"
     ],
     1,
     "等待事件 != 正在 CPU 上執行",
     "I/O 等待中通常是 Blocked；完成後回到 Ready。"
    ],
    [
     "fork 與 exec 的關係是？",
     [
      "fork 複製／建立子行程；exec 替換程式映像",
      "fork 只開新 Thread；exec 只是暫停",
      "兩者同義"
     ],
     0,
     "一個關乎建立行程，另一個關乎載入不同程式",
     "POSIX fork 與 exec 負責不同工作。"
    ],
    [
     "Waiting 中的行程在 I/O 完成後，下一個狀態通常是？",
     [
      "直接 Running",
      "Ready",
      "Terminated"
     ],
     1,
     "事件完成不代表 CPU 剛好空著",
     "它會回到 Ready 排隊，等排程器選中才 Running。"
    ],
    [
     "子行程已結束、父行程卻還沒呼叫 wait()，子行程暫時成為？",
     [
      "Zombie（殭屍）行程",
      "Orphan（孤兒）行程",
      "Daemon（常駐）行程"
     ],
     0,
     "它的結束狀態還在等父行程收走",
     "子行程已停止執行，但結束狀態仍留在行程表，直到父行程 wait 回收。"
    ]
   ]
  },
  {
   "id": 3,
   "unit": "執行",
   "title": "Thread 與並行",
   "short": "共享資源、執行緒、Concurrency",
   "minutes": 16,
   "icon": "⋈",
   "goals": [
    "列出同一行程中，執行緒共享與私有的資源",
    "區分 concurrency 與 parallelism",
    "判斷 CPU-bound 與 I/O-bound 工作適合的並行方式"
   ],
   "ask": "為什麼兩個 Thread 改同一個變數時會互相影響？",
   "analogy": "一家公司（Process）有好幾位員工（Threads）。大家共用辦公室文件（位址空間），但各有自己的工作進度和筆記頁（PC、Stack、暫存器）。",
   "why": "Thread 在一個行程中共享多數資源；這讓溝通便宜，也讓資料競爭更容易發生。Concurrency 是有多個進行中的工作，Parallelism 是同時用硬體執行。",
   "details": [
    [
     "共享與私有",
     "同一 Process 的 Threads 通常共用 code、heap、全域資料與開啟的檔案；各自有 stack、PC、register context。"
    ],
    [
     "並行 vs 平行",
     "單核也可 concurrency：工作 A、B 輪流；多核才可能同時在不同核心 parallel 執行。"
    ],
    [
     "I/O-bound vs CPU-bound",
     "大量等待 I/O 的程式適合事件迴圈或並行 I/O；CPU-bound 要考慮核心數、語言 runtime 與同步成本。"
    ],
    [
     "Python / Go 的差別",
     "Goroutine 是 Go runtime 管理的工作單位；Python asyncio task 由事件迴圈協作調度；它們不等於 OS thread。"
    ]
   ],
   "steps": [
    "Process 配置共享的位址空間",
    "多個 Thread 擁有各自 Stack 與 PC",
    "OS／Runtime 決定何時執行每個工作",
    "共同資料需要同步協定"
   ],
   "caveat": "「Thread 越多一定越快」是錯的；切換、鎖、資源競爭和記憶體都可能拖慢速度。",
   "summary": [
    "Threads 共享 code、heap、全域資料與開啟的檔案；各自擁有 stack、PC 與暫存器。",
    "Concurrency 是交錯進行，parallelism 是同一瞬間在多個核心上執行。",
    "共享讓溝通便宜，也讓同步成為必要。"
   ],
   "terms": [
    "thread",
    "concurrency",
    "parallelism",
    "stack",
    "heap"
   ],
   "lab": "thread",
   "code": [
    "C",
    "// 假設 x 為共享變數：\n// Thread A: x = x + 1;\n// Thread B: x = x + 1;\n// 兩行各自並非天生的原子操作。"
   ],
   "quiz": [
    [
     "同一 Process 裡的兩個 Thread，一般不共享什麼？",
     [
      "Heap",
      "Global data",
      "各自的 Stack"
     ],
     2,
     "想想每個執行流自己的函式呼叫紀錄",
     "每個 Thread 有獨立 stack 與 PC；Heap 與全域變數通常共享。"
    ],
    [
     "Concurrency 一定需要兩個 CPU 核心嗎？",
     [
      "需要",
      "不需要"
     ],
     1,
     "單核輪流切換是否也能處理多個工作？",
     "單核交錯執行即有 concurrency，但不代表同時 parallel。"
    ],
    [
     "4 核心機器上的 CPU-bound 程式，把 Thread 從 4 增加到 64，最可能發生什麼？",
     [
      "速度提升 16 倍",
      "效能不再明顯提升，甚至因切換與競爭而變慢",
      "程式一定當機"
     ],
     1,
     "同一時間最多只有幾個執行緒能真正在跑？",
     "CPU-bound 工作受核心數限制；多出來的執行緒只增加切換與同步成本。"
    ],
    [
     "兩個 Thread 各自在函式中宣告區域變數 int i，會互相干擾嗎？",
     [
      "會，因為共享位址空間",
      "通常不會，區域變數放在各自的 stack 上"
     ],
     1,
     "區域變數存在哪裡？",
     "每個執行緒有自己的 stack；但若把區域變數的位址交給別的執行緒，仍可能變成共享。"
    ]
   ]
  },
  {
   "id": 4,
   "unit": "排程",
   "title": "CPU Scheduling 動手算",
   "short": "FCFS、SJF、SRTF、Round Robin",
   "minutes": 28,
   "icon": "▤",
   "goals": [
    "用 FCFS、SJF、SRTF、RR、Priority 手算 Gantt 圖",
    "計算 CT、TAT、WT、RT 並求平均",
    "說明時間片大小與 context switch 次數的取捨"
   ],
   "ask": "如果三個工作都在排隊，你會先服務誰？",
   "analogy": "CPU 像只有一個窗口的櫃台。FCFS 先到先辦；SJF 先處理短單；Round Robin 每人輪流用固定時間。公平與整體效率未必一致。",
   "why": "多個 Ready 執行緒競爭有限的 CPU 時間，Scheduler 決定下一個執行誰；不同政策影響等待時間、回應時間、周轉時間與公平性。",
   "details": [
    [
     "FCFS",
     "先到先服務，非搶先式。簡單但長工作在前容易產生 convoy effect。"
    ],
    [
     "SJF／SRTF",
     "SJF 選最短 CPU burst，非搶先；SRTF 可以被更短的剩餘工作搶先。實務上無法完美預知未來的 burst。"
    ],
    [
     "Round Robin",
     "每個可執行工作輪流使用至多 q 單位時間，時間片太小會增加切換負擔，太大則接近 FCFS。"
    ],
    [
     "三個指標",
     "Turnaround = completion − arrival；Waiting = turnaround − CPU burst（在單次 CPU burst、無 I/O 的教學模型）；Response = first start − arrival。"
    ]
   ],
   "steps": [
    "每個工作先設定 Arrival 與 Burst",
    "選擇排程策略及時間片",
    "一次向前推進 1 tick，觀察 Gantt",
    "比較完成時間、等待、回應、周轉"
   ],
   "caveat": "下方是單 CPU、整數時間、無 I/O、無切換成本的教學模擬，不能直接等同 Linux CFS／EEVDF。",
   "summary": [
    "先畫時間線再算指標：TAT = CT − AT、WT = TAT − BT、RT = 首次執行 − AT。",
    "SJF / SRTF 讓平均等待最小，但需預知 burst，且長工作可能飢餓。",
    "RR 改善回應時間；q 太小切換多，q 太大就退化成 FCFS。"
   ],
   "terms": [
    "scheduler",
    "fcfs",
    "sjf",
    "round-robin",
    "turnaround",
    "waiting-time",
    "response-time",
    "starvation"
   ],
   "lab": "schedule",
   "code": [
    "Python",
    "jobs = [(\"P1\", 0, 6), (\"P2\", 1, 3), (\"P3\", 2, 4)]\n# arrival, CPU burst\n# 計算 CT, TAT, WT, RT 時要先畫時間線"
   ],
   "quiz": [
    [
     "在教學模型中，Waiting Time 的計算方式？",
     [
      "完成時間 - 到達時間 - CPU Burst",
      "到達時間 + Burst",
      "首次開始時間 - 到達時間"
     ],
     0,
     "先算 Turnaround，再扣真正使用 CPU 的時間",
     "WT = CT − AT − BT。"
    ],
    [
     "RR 的 time quantum 很大，大到所有工作都能一次做完時，它趨近？",
     [
      "SRTF",
      "FCFS",
      "最佳優先權"
     ],
     1,
     "每個工作輪到時都直接做完",
     "當 q 不造成搶先，執行順序類似 FCFS。"
    ],
    [
     "P1(AT 0, BT 8)、P2(AT 1, BT 4)、P3(AT 2, BT 2) 使用 SRTF，P1 的完成時間是？",
     [
      "8",
      "14",
      "12"
     ],
     1,
     "每次有新工作到達，都要重新比較剩餘時間",
     "時間線：P1(0–1) → P2(1–2) → P3(2–4) → P2(4–7) → P1(7–14)，P1 在 14 完成。"
    ],
    [
     "哪種排程政策最容易讓長工作「飢餓」？",
     [
      "FCFS",
      "SJF / SRTF",
      "Round Robin"
     ],
     1,
     "如果短工作源源不斷地到達呢？",
     "短工作不斷插隊時，長工作可能一直被延後；可用 aging 逐步提高等待者的優先權。"
    ]
   ]
  },
  {
   "id": 20,
   "unit": "排程",
   "title": "優先權、MLFQ 與多核心排程",
   "short": "Priority、Aging、MLFQ、負載平衡",
   "minutes": 22,
   "icon": "≋",
   "goals": [
    "解釋優先權排程、飢餓與 aging 的關係",
    "說明 MLFQ 如何以歷史行為近似 SJF",
    "說出多核心排程中快取親和性與負載平衡的取捨"
   ],
   "ask": "作業系統不知道每個工作要跑多久，要怎麼讓互動程式反應快、又不讓長工作餓死？",
   "analogy": "醫院急診分級：新到的病人先快速看一下（高優先）；需要長時間處理的轉到普通病房（低優先）。為了不讓普通病房的人被永遠擱置，每隔一段時間就重新巡房，把大家拉回優先名單（priority boost）。",
   "why": "SJF 需要預知 CPU burst，現實中做不到。MLFQ（Multi-Level Feedback Queue）改用「觀察過去的行為」來猜：用完整個時間片的工作被降級，經常提早讓出 CPU 的互動工作留在高優先，並以定期提升避免飢餓。",
   "details": [
    [
     "Priority Scheduling",
     "每個工作有優先權，排程器總是選最高者，可以搶先或不搶先。低優先工作可能飢餓，常用 aging（等待越久、優先權越高）緩解。"
    ],
    [
     "MLFQ 規則",
     "多個佇列各有優先權與時間片；新工作進最高層；用完時間片就降一層；同一層之間用 RR；高層有工作時，低層不執行。"
    ],
    [
     "Priority Boost",
     "每隔固定時間 S 把所有工作移回最高層：長工作不會永遠拿不到 CPU，轉變成互動型的工作也能重新獲得高優先。"
    ],
    [
     "多核心排程",
     "每顆核心常有自己的執行佇列，以保留快取親和性（affinity），再用負載平衡（push / pull migration）避免某些核心閒置。Linux 6.6 起以 EEVDF 取代 CFS，以虛擬執行時間與期限追求公平。"
    ]
   ],
   "steps": [
    "新工作進入 Q0（最高優先、時間片最短）",
    "用完時間片仍未完成 → 降到下一層",
    "排程器永遠先執行最高的非空佇列",
    "每隔 S tick 全部提升回 Q0，防止飢餓"
   ],
   "caveat": "本實驗的 MLFQ 只模擬 CPU-bound 工作與固定時間片；真實系統還要處理 I/O 讓出、刻意鑽規則的程式（gaming）、nice 值與多核心遷移。",
   "summary": [
    "Priority 排程需要 aging 才能避免飢餓。",
    "MLFQ：新工作先高優先，用完時間片就降級，定期 boost 防止飢餓。",
    "多核心以每核佇列保持快取親和，再用遷移平衡負載。"
   ],
   "terms": [
    "priority",
    "aging",
    "mlfq",
    "starvation",
    "affinity"
   ],
   "lab": "mlfq",
   "code": [
    "Python",
    "queues  = [[], [], []]     # Q0 優先權最高\nquantum = [2, 4, None]     # None = 做到完成（FCFS）\n\n# 用完時間片 → level = min(level + 1, 2)\n# 每 boost_interval tick → 所有工作回到 Q0"
   ],
   "quiz": [
    [
     "MLFQ 中，一個工作每次都用完整個時間片，它的優先權會？",
     [
      "逐漸降低",
      "逐漸升高",
      "保持不變"
     ],
     0,
     "用完時間片的工作看起來像 CPU-bound 還是互動型？",
     "它被視為 CPU-bound，逐層下降，把高優先讓給互動工作。"
    ],
    [
     "Aging（老化）主要解決什麼問題？",
     [
      "Context switch 太頻繁",
      "低優先工作長期拿不到 CPU（飢餓）",
      "記憶體不足"
     ],
     1,
     "等待越久的工作應該怎麼處理？",
     "隨等待時間提高優先權，最終一定能被排到。"
    ],
    [
     "為什麼多核心系統常讓執行緒盡量留在同一顆核心上？",
     [
      "快取親和性：原核心的快取裡仍有它的資料",
      "規定每個執行緒只能使用一顆核心",
      "可以減少記憶體容量需求"
     ],
     0,
     "換到新核心時，快取是冷的",
     "留在原核心可以重用快取與 TLB 內容，避免遷移成本。"
    ],
    [
     "MLFQ 比 SJF 實際，是因為它不需要事先知道什麼？",
     [
      "工作的到達時間",
      "工作的 CPU burst 長度",
      "核心數量"
     ],
     1,
     "SJF 最難的地方是什麼？",
     "MLFQ 從工作過去的行為推測它的特性，不必預知 burst。"
    ]
   ]
  },
  {
   "id": 5,
   "unit": "並行",
   "title": "Race Condition 與 Deadlock",
   "short": "Mutex、Semaphore、原子性",
   "minutes": 25,
   "icon": "⚑",
   "goals": [
    "把 x++ 拆成 load / add / store，找出會遺失更新的交錯",
    "說明 mutex 如何保護臨界區",
    "列出死結的四個必要條件，並用鎖順序預防死結"
   ],
   "ask": "兩個執行緒各加 1，為何最後可能只加 1？",
   "analogy": "兩個人同時拿到「庫存 10」的影印紙，都在紙上改成 11，最後貼回去的是 11 而非 12。這就是遺失更新（lost update）。",
   "why": "x = x + 1 通常是讀、計算、寫等多步驟。當它們交錯執行，就可能覆蓋彼此結果。Mutex 用互斥保護 Critical Section。",
   "details": [
    [
     "Race Condition",
     "結果依執行順序而變化，且至少一部分順序不受正確同步約束。Data race 在不同語言的記憶體模型下有更精確定義。"
    ],
    [
     "Mutex",
     "一次只允許一個執行流進入被保護的臨界區。需要正確加鎖／解鎖，也應盡量縮短持鎖時間。"
    ],
    [
     "Semaphore",
     "使用計數來協調可同時使用的資源數或事件數；不應當成任意的共用整數。"
    ],
    [
     "Deadlock",
     "四個必要條件：互斥、持有並等待、不可搶奪、循環等待；只要破壞其中一項便能防止這類死鎖。"
    ]
   ],
   "steps": [
    "兩個 Thread 都讀到 x=0",
    "各自在本地算出 1",
    "都將 1 寫回共享記憶體",
    "若以 mutex 串行化，就能避免此交錯"
   ],
   "caveat": "「加了 Mutex 就永遠正確」也不對：仍可能忘記保護其他共享狀態，或因不一致鎖順序導致死鎖。",
   "summary": [
    "Race condition = 共享資料 + 非原子的讀改寫 + 未受控的交錯。",
    "Mutex 讓臨界區一次只有一個執行緒進入。",
    "死結需同時滿足互斥、持有並等待、不可搶奪、循環等待；打破任一項即可預防。"
   ],
   "terms": [
    "race-condition",
    "critical-section",
    "mutex",
    "atomic",
    "deadlock"
   ],
   "lab": "race",
   "code": [
    "C",
    "// 教學偽碼\nlock(m);\nx = x + 1;\nunlock(m);"
   ],
   "quiz": [
    [
     "兩個 Thread 對 x 同時執行 x++，結果錯誤通常因為？",
     [
      "x++ 一定是單一不可分割指令",
      "讀改寫的操作可能互相交錯",
      "RAM 只能存放整數"
     ],
     1,
     "把 x++ 拆成 load/add/store",
     "一般情況下讀改寫不可假設天然具備原子性。"
    ],
    [
     "以下哪個不是 deadlock 的四個必要條件？",
     [
      "循環等待",
      "不可搶奪",
      "CPU 使用率高"
     ],
     2,
     "想想是資源等待關係，不是負載高低",
     "CPU 使用率高並不是 Coffman 死鎖必要條件。"
    ],
    [
     "T1 先鎖 A 再鎖 B，T2 先鎖 B 再鎖 A。最簡單的死結預防方式是？",
     [
      "所有執行緒都依相同順序取得鎖（例如先 A 後 B）",
      "增加 CPU 核心",
      "把鎖改成全域變數"
     ],
     0,
     "要打破哪一個必要條件？",
     "統一取得鎖的順序，就不可能形成循環等待。"
    ],
    [
     "臨界區（critical section）指的是？",
     [
      "存取共享資源、必須互斥執行的程式片段",
      "程式中最耗時的函式",
      "所有核心程式碼"
     ],
     0,
     "重點在「共享」與「互斥」",
     "臨界區是會存取共享狀態、同一時間只能有一個執行緒執行的區段。"
    ]
   ]
  },
  {
   "id": 16,
   "unit": "並行",
   "title": "Semaphore 與生產者–消費者",
   "short": "wait / signal、有界緩衝區、條件同步",
   "minutes": 24,
   "icon": "⇄",
   "goals": [
    "說明 wait / signal 的語意與原子性要求",
    "用 empty、full、mutex 寫出有界緩衝區",
    "指出錯誤的 wait 順序如何造成死結"
   ],
   "ask": "一個執行緒負責生產資料、另一個負責消費，緩衝區滿了或空了的時候該怎麼辦？",
   "analogy": "迴轉壽司台只放得下 N 盤：師傅（生產者）看到台上滿了就先停手；客人（消費者）看到台上空了就先等。兩個計數器分別記錄「空位數」與「已放的盤數」，再加上一條「同時只能一個人伸手」的規矩（mutex）。",
   "why": "Mutex 解決「同時只能一個人進入」，卻無法表達「等到某個條件成立」。Semaphore 是一個整數計數加上等待佇列：wait（P）在值不足時讓呼叫者睡眠，signal（V）把值加一並喚醒等待者。用 empty、full、mutex 三個 semaphore 就能正確協調有界緩衝區。",
   "details": [
    [
     "wait / signal",
     "wait(S)：若 S > 0 則 S − 1 並繼續，否則阻塞等待；signal(S)：S + 1，若有等待者就喚醒一個。這兩個操作本身必須是原子的。"
    ],
    [
     "Counting vs Binary",
     "計數型 semaphore 表示可用資源的數量；二元 semaphore 只有 0 / 1，可用於互斥，但沒有 mutex 的「擁有者」概念。"
    ],
    [
     "有界緩衝區",
     "empty 初值 N（空格數）、full 初值 0（資料數）、mutex 初值 1。生產者：wait(empty) → wait(mutex) → 放入 → signal(mutex) → signal(full)；消費者對稱。"
    ],
    [
     "順序很重要",
     "若生產者先 wait(mutex) 再 wait(empty)，緩衝區滿時它會抱著 mutex 睡著；消費者拿不到 mutex，雙方形成死結。"
    ]
   ],
   "steps": [
    "生產者 wait(empty)：確認還有空位",
    "wait(mutex) 後放入資料，再 signal(mutex)",
    "signal(full)：通知多了一筆資料",
    "消費者 wait(full) → 取出 → signal(empty)"
   ],
   "caveat": "實務上很多語言改用 mutex + condition variable、channel 或阻塞佇列（例如 Go channel、Java BlockingQueue）；概念相同：等條件、改狀態、喚醒等待者。",
   "summary": [
    "Semaphore = 計數 + 等待佇列：wait 不足就睡，signal 加一並喚醒。",
    "有界緩衝區：empty 管空位、full 管資料、mutex 管互斥。",
    "先等條件、再拿鎖；順序錯了就可能死結。"
   ],
   "terms": [
    "semaphore",
    "producer-consumer",
    "condition-variable",
    "mutex",
    "deadlock"
   ],
   "lab": "buffer",
   "code": [
    "C",
    "sem_t empty, full;          // sem_init(&empty, 0, N); sem_init(&full, 0, 0);\npthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;\n\nvoid *producer(void *arg) {\n    for (;;) {\n        int item = produce();\n        sem_wait(&empty);        // 先等空位\n        pthread_mutex_lock(&m);  // 再拿鎖\n        put(item);\n        pthread_mutex_unlock(&m);\n        sem_post(&full);         // 通知多一筆資料\n    }\n}"
   ],
   "quiz": [
    [
     "有界緩衝區中，semaphore full 的初值應該是？",
     [
      "0",
      "N",
      "1"
     ],
     0,
     "一開始緩衝區裡有幾筆資料？",
     "full 計算已放入的資料數，開始時為 0；empty 才是 N。"
    ],
    [
     "消費者在 full = 0 時呼叫 wait(full)，會發生什麼？",
     [
      "直接讀到空資料",
      "被阻塞，直到生產者 signal(full)",
      "full 變成 −1，然後照常往下執行"
     ],
     1,
     "wait 的語意是「不夠就等」",
     "呼叫者進入等待佇列。有些實作會用負值記錄等待者數量，但呼叫者一樣會被阻塞。"
    ],
    [
     "生產者若「先 wait(mutex) 再 wait(empty)」，緩衝區滿時可能？",
     [
      "效能稍好",
      "死結：生產者持有 mutex 睡著，消費者無法取用",
      "沒有任何差別"
     ],
     1,
     "睡著時手上還握著什麼？",
     "消費者需要 mutex 才能取出資料並 signal(empty)，雙方互相等待。"
    ],
    [
     "Semaphore 與 Mutex 最關鍵的差異是？",
     [
      "Semaphore 可以計數，且可由不同執行緒 signal；Mutex 有擁有者，通常由上鎖者解鎖",
      "兩者完全相同",
      "Mutex 只能在核心中使用"
     ],
     0,
     "「誰可以解鎖」是重點",
     "Mutex 表達所有權與互斥；semaphore 表達資源數量與事件通知。"
    ]
   ]
  },
  {
   "id": 17,
   "unit": "並行",
   "title": "Deadlock 處理與銀行家演算法",
   "short": "資源配置圖、安全狀態、Banker's Algorithm",
   "minutes": 26,
   "icon": "⟲",
   "goals": [
    "區分死結預防、避免、偵測與忽略四種策略",
    "用資源配置圖判斷是否可能死結",
    "手算 Banker's algorithm 的安全序列"
   ],
   "ask": "如果系統在分配資源前先「算一算」，能不能保證永遠不會死結？",
   "analogy": "銀行只有有限的現金，每位客戶事先申報最高借款額度。行員核准前會先模擬：「如果批准，是否還存在一種順序，讓每位客戶都能借滿、做完生意再還錢？」找得到這種順序才放款。",
   "why": "處理死結有四種策略：預防（打破必要條件）、避免（分配前檢查是否安全）、偵測與恢復（允許發生，再找出並解除）、忽略（多數通用 OS 對使用者程式的做法）。Banker's algorithm 是經典的避免策略，需要每個行程事先宣告最大需求。",
   "details": [
    [
     "資源配置圖",
     "行程與資源類別畫成節點：請求邊 P → R、配置邊 R → P。若每類資源只有一個實例，圖中有環就是死結；有多個實例時，有環只代表「可能」死結。"
    ],
    [
     "安全狀態",
     "若存在一個安全序列，讓每個行程依序都能用「目前可用 + 前面行程釋放的資源」滿足剩餘需求，系統就是安全的。安全一定不會死結；不安全不代表必定死結，但有風險。"
    ],
    [
     "Banker's Algorithm",
     "Need = Max − Allocation。安全檢查：Work = Available，反覆找 Need ≤ Work 的未完成行程，假裝它完成並釋放資源（Work += Allocation）。全部能完成即安全。"
    ],
    [
     "請求處理",
     "收到 Request_i：先檢查是否 ≤ Need_i 且 ≤ Available，再「假裝分配」並執行安全檢查；安全才真正分配，否則讓 P_i 等待。"
    ]
   ],
   "steps": [
    "計算每個行程的 Need = Max − Allocation",
    "Work 從 Available 開始",
    "找出 Need ≤ Work 的行程，讓它完成並歸還資源",
    "全部行程都能完成 → 安全；卡住 → 不安全"
   ],
   "caveat": "銀行家演算法要求事先知道最大需求、行程數固定，成本約 O(m × n²)，通用作業系統很少直接使用；它的價值在於清楚定義「安全狀態」這個思考工具。",
   "summary": [
    "安全狀態 = 存在一個讓所有行程都能完成的順序。",
    "Need = Max − Allocation；Work 從 Available 開始，逐步加上釋放的資源。",
    "請求先「假裝分配」再檢查安全性，安全才真的給。"
   ],
   "terms": [
    "deadlock",
    "safe-state",
    "bankers-algorithm",
    "resource-allocation-graph"
   ],
   "lab": "banker",
   "code": [
    "Python",
    "def is_safe(avail, alloc, need):\n    work, done, order = avail[:], [False] * len(alloc), []\n    while len(order) < len(alloc):\n        for i, finished in enumerate(done):\n            if not finished and all(n <= w for n, w in zip(need[i], work)):\n                work = [w + a for w, a in zip(work, alloc[i])]\n                done[i] = True\n                order.append(i)\n                break\n        else:\n            return False, order   # 沒有任何行程能繼續\n    return True, order"
   ],
   "quiz": [
    [
     "Banker's algorithm 中 Need 的定義是？",
     [
      "Max − Allocation",
      "Available − Allocation",
      "Max + Allocation"
     ],
     0,
     "還「需要」多少才能達到最大宣告？",
     "Need 是行程距離最大需求還差的資源數。"
    ],
    [
     "系統處於「不安全狀態」代表？",
     [
      "一定已經死結",
      "有死結的可能，但不一定已經發生",
      "必須立即重新開機"
     ],
     1,
     "不安全 ≠ 死結",
     "不安全表示找不到保證完成的順序，未來可能死結，但目前未必已經卡住。"
    ],
    [
     "每類資源只有一個實例時，資源配置圖出現環代表？",
     [
      "一定死結",
      "可能死結",
      "一定沒有死結"
     ],
     0,
     "單一實例時，沒有其他資源可以打破等待",
     "單實例下有環即死結；多實例時有環只代表可能。"
    ],
    [
     "一般作業系統對應用程式之間的死結，最常見的處理方式是？",
     [
      "執行銀行家演算法",
      "大致忽略，交由程式設計者避免（例如固定鎖順序）",
      "每秒偵測並終止行程"
     ],
     1,
     "一般用途 OS 會在意哪種成本？",
     "避免與偵測的成本高，通用 OS 多半把責任留給應用程式設計。"
    ]
   ]
  },
  {
   "id": 6,
   "unit": "記憶體",
   "title": "位址、分頁與 TLB",
   "short": "虛擬位址如何變成實體位址",
   "minutes": 25,
   "icon": "⌗",
   "goals": [
    "把虛擬位址拆成 VPN 與 offset",
    "查頁表計算實體位址，並辨認無效映射",
    "以 TLB 命中率計算有效存取時間（EAT）"
   ],
   "ask": "為什麼不同程式都可能認為自己有從 0 開始的記憶體？",
   "analogy": "每個住戶有自己的房間號碼（虛擬位址），但大樓總務知道真正的樓層與位置（實體位址）。同一個號碼在不同住戶的房間不是同一塊空間。",
   "why": "虛擬記憶體提供隔離和簡化的位址模型。MMU 依頁表轉換虛擬位址；TLB 快取最近使用過的轉譯。",
   "details": [
    [
     "Page 與 Frame",
     "虛擬位址切成等大 Pages；實體記憶體切成同大小的 Frames，頁表紀錄對應關係與權限。"
    ],
    [
     "VPN + Offset",
     "Page Size = 2^k 時，offset 有 k bits；VPN = floor(VA / page size)，offset = VA mod page size。"
    ],
    [
     "位址轉譯",
     "TLB hit 可較快取得對應；miss 需要查頁表。找不到有效映射可能發生 page fault，亦可能是非法存取。"
    ],
    [
     "保護",
     "頁表還能提供可讀、可寫、可執行等保護資訊。不同 Process 可以對應到不同的實體框。"
    ]
   ],
   "steps": [
    "輸入虛擬位址 VA",
    "按 Page Size 拆成 VPN 與 offset",
    "透過 TLB／頁表找到 PFN",
    "PA = PFN × Page Size + offset"
   ],
   "caveat": "Page Fault 不必然等於「硬碟太慢」：缺頁處理可能映射零頁、載入檔案、copy-on-write 或判定非法訪問。",
   "summary": [
    "offset 位元數 = log₂(page size)，VPN 是剩下的高位元。",
    "PA = PFN × page size + offset；offset 原樣保留。",
    "TLB 快取轉譯結果；命中率越高，平均存取時間越接近一次記憶體存取。"
   ],
   "terms": [
    "virtual-address",
    "page",
    "frame",
    "page-table",
    "tlb",
    "mmu",
    "eat"
   ],
   "lab": "paging",
   "code": [
    "Python",
    "page_size = 4096\nva = 0x1234\nvpn, offset = divmod(va, page_size)\nprint(hex(vpn), hex(offset))"
   ],
   "quiz": [
    [
     "Page Size = 4 KiB 時，offset 需要幾個 bits？",
     [
      "10",
      "12",
      "16"
     ],
     1,
     "4 KiB = 4096 = 2 的幾次方？",
     "4096 = 2^12，所以 offset 占 12 bits。"
    ],
    [
     "TLB 通常快取的是？",
     [
      "虛擬位址到實體框等位址轉譯資訊",
      "完整 SSD 的所有檔案",
      "每個 Thread 的程式碼"
     ],
     0,
     "「Translation Lookaside Buffer」的 Translation 是關鍵",
     "TLB 主要快取位址轉譯以減少頁表存取。"
    ],
    [
     "記憶體存取 100 ns、TLB 查詢時間忽略、命中率 90%，單層頁表的 EAT 是？",
     [
      "100 ns",
      "110 ns",
      "190 ns"
     ],
     1,
     "未命中時要多讀一次頁表",
     "EAT = 0.9 × 100 + 0.1 × (100 + 100) = 110 ns。"
    ],
    [
     "32-bit 虛擬位址、4 KiB 頁面，單層頁表有幾個項目？",
     [
      "2¹²",
      "2²⁰",
      "2³²"
     ],
     1,
     "VPN 有幾個 bits？",
     "offset 用掉 12 bits，VPN 有 32 − 12 = 20 bits，所以有 2²⁰ 個頁表項目。"
    ]
   ]
  },
  {
   "id": 18,
   "unit": "記憶體",
   "title": "連續配置與碎片化",
   "short": "First / Best / Worst Fit、外部與內部碎片",
   "minutes": 20,
   "icon": "▥",
   "goals": [
    "用 First / Best / Worst Fit 模擬配置過程",
    "區分外部碎片與內部碎片",
    "說明 compaction 與分頁如何處理碎片問題"
   ],
   "ask": "記憶體明明還有 30 KB 空閒，為什麼一個 20 KB 的請求還是配置失敗？",
   "analogy": "停車場總共還有 5 個空位，但分散在不同排，沒有任何一排有連續 3 格，遊覽車還是停不進去。空間總量夠，不代表有夠大的連續空間。",
   "why": "在分頁普及之前（以及今天的 heap 配置器、核心物件配置），系統需要在連續的空閒區塊（hole）中找位置放下請求。不同的放置策略會影響速度與碎片化程度；分頁正是用「固定大小、可以不連續」來消除外部碎片。",
   "details": [
    [
     "First Fit",
     "從頭找到第一個夠大的空洞就放。速度快，但前段容易累積許多小碎片。Next Fit 則從上次結束的位置繼續找。"
    ],
    [
     "Best Fit",
     "選擇「夠大且最小」的空洞，剩餘最少，但容易產生大量難以利用的極小碎片，而且要搜尋整個串列。"
    ],
    [
     "Worst Fit",
     "選擇最大的空洞，希望剩下的部分仍然夠用；模擬研究通常顯示它在速度與利用率上都不占優勢。"
    ],
    [
     "外部 vs 內部碎片",
     "外部碎片：空閒總量夠但不連續。內部碎片：配置單位比請求大，區塊內被浪費（例如最後一頁沒用滿）。壓縮（compaction）可以合併空閒區，但需要可重新定位的位址，而且成本高。"
    ]
   ],
   "steps": [
    "維護空閒區塊（hole）串列",
    "依策略挑選一個夠大的 hole",
    "切出所需大小，剩下的部分成為新的 hole",
    "釋放時與相鄰的 hole 合併（coalescing）"
   ],
   "caveat": "真實的 malloc（如 glibc ptmalloc、jemalloc）與 Linux 的 buddy system、slab allocator 結合了大小分級、快取與合併策略，比這裡的單一串列複雜得多。",
   "summary": [
    "放置策略決定從哪個 hole 切出空間，各有速度與碎片化的取捨。",
    "外部碎片是「總量夠但不連續」，內部碎片是「配置單位內的浪費」。",
    "分頁以固定大小的頁框消除外部碎片，代價是頁表與內部碎片。"
   ],
   "terms": [
    "fragmentation",
    "first-fit",
    "best-fit",
    "compaction",
    "buddy"
   ],
   "lab": "alloc",
   "code": [
    "C",
    "char *a = malloc(100);    // 配置器在 heap 中找空閒區塊\nchar *b = malloc(5000);\nfree(a);                  // 留下一個 hole\nchar *c = malloc(120);    // 放得進 a 原本的位置嗎？"
   ],
   "quiz": [
    [
     "空閒總量足夠，但沒有任何單一連續區塊夠大，這是？",
     [
      "內部碎片",
      "外部碎片",
      "Page fault"
     ],
     1,
     "浪費發生在區塊「之間」還是「之內」？",
     "外部碎片：空閒空間被切成不連續的小塊。"
    ],
    [
     "空洞依序為 [12, 30, 18] KB，請求 15 KB，Best Fit 會選？",
     [
      "12 KB",
      "30 KB",
      "18 KB"
     ],
     2,
     "在夠大的空洞中選最小的",
     "12 不夠；30 與 18 都夠，最小的是 18。"
    ],
    [
     "同樣是 [12, 30, 18] KB、請求 15 KB，First Fit 會選？",
     [
      "12 KB",
      "30 KB",
      "18 KB"
     ],
     1,
     "依序找第一個夠大的",
     "12 不夠，第一個夠大的是 30。"
    ],
    [
     "分頁（paging）最主要消除了哪一種碎片？",
     [
      "外部碎片",
      "內部碎片",
      "兩種都完全消除"
     ],
     0,
     "頁框大小固定，而且可以放在任何位置",
     "任何空頁框都能使用、不需連續；但最後一頁沒用滿仍有內部碎片。"
    ]
   ]
  },
  {
   "id": 7,
   "unit": "記憶體",
   "title": "Virtual Memory 與 Page Fault",
   "short": "Demand Paging、FIFO、LRU",
   "minutes": 24,
   "icon": "▥",
   "goals": [
    "對同一參考序列分別用 FIFO、LRU、OPT 計算缺頁次數",
    "解釋 Belady's anomaly",
    "說明 thrashing 與工作集合的關係"
   ],
   "ask": "記憶體明明不夠大，為什麼程式有時還能繼續執行？",
   "analogy": "你的辦公桌（RAM）很小，但文件很多（虛擬位址空間）。常用文件放桌上，不常用的暫時收起；要用時再拿回來。",
   "why": "Demand Paging 可先不載入全部頁面，真的存取時才讓 OS 決定如何提供頁面。當頁框有限，就需要置換策略。",
   "details": [
    [
     "Page Fault Flow",
     "處理器偵測無有效對映 → trap → 核心判斷合法性 → 取得頁框與必要內容 → 更新映射 → 重試指令。"
    ],
    [
     "FIFO",
     "替換最早進入頁框者，簡單但可能出現 Belady’s anomaly。"
    ],
    [
     "LRU",
     "替換最久未被存取者，利用近期使用局部性；精確實作成本高，真實 OS 多用近似方案。"
    ],
    [
     "Thrashing",
     "工作集合大於可用記憶體等情況，系統頻繁缺頁，花很多時間搬資料而非做有用工作。"
    ]
   ],
   "steps": [
    "設定 3 個 Page Frames",
    "逐次存取頁面參考序列",
    "命中不需缺頁；未命中必須載入／置換",
    "比較 FIFO / LRU 故障次數與置換頁"
   ],
   "caveat": "實驗中的「缺頁」簡化成所需頁不在目前的 3 個 frame；真實 OS 的缺頁和 page cache／交換機制更複雜。",
   "summary": [
    "FIFO 換最早進來的、LRU 換最久沒用的、OPT 換未來最晚才會用到的（理論下界）。",
    "FIFO 可能「頁框變多、缺頁反而變多」（Belady），LRU 與 OPT 不會。",
    "工作集合放不進記憶體就會 thrashing，該做的是減少同時執行的工作。"
   ],
   "terms": [
    "page-fault",
    "demand-paging",
    "lru",
    "opt",
    "belady",
    "thrashing",
    "working-set"
   ],
   "lab": "replacement",
   "code": [
    "Python",
    "refs = [7, 0, 1, 2, 0, 3, 0, 4]\nframes = 3\n# 每一步紀錄頁框與 hit/fault"
   ],
   "quiz": [
    [
     "以下哪項是 LRU 的核心判斷？",
     [
      "最早載入",
      "最久沒被使用",
      "頁面編號最大"
     ],
     1,
     "R = Recent",
     "Least Recently Used：最久未使用者被置換。"
    ],
    [
     "Page Fault 一定表示程式有錯嗎？",
     [
      "是",
      "否"
     ],
     1,
     "合法但尚未載入的頁也會產生缺頁事件",
     "Demand Paging 下的合法頁可能需要缺頁處理才能載入。"
    ],
    [
     "OPT（最佳）置換演算法為什麼無法在真實系統中實作？",
     [
      "需要知道未來的頁面存取順序",
      "需要太多記憶體",
      "只適用於 SSD"
     ],
     0,
     "它換掉的是「未來最晚使用」的頁",
     "OPT 需要預知未來，因此只能拿來當作比較其他演算法的下界。"
    ],
    [
     "序列 1,2,3,4,1,2,5,1,2,3,4,5 用 FIFO：3 個頁框缺頁 9 次，4 個頁框缺頁幾次？",
     [
      "8",
      "9",
      "10"
     ],
     2,
     "這是 Belady's anomaly 的經典例子，可以到實驗中驗證",
     "4 個頁框反而缺頁 10 次：頁框增加，FIFO 的缺頁數不一定減少。"
    ]
   ]
  },
  {
   "id": 8,
   "unit": "儲存",
   "title": "File System 是如何存檔的？",
   "short": "inode、fd、buffer、fsync",
   "minutes": 20,
   "icon": "▧",
   "goals": [
    "說出檔名、inode、file descriptor 之間的對應關係",
    "解釋 write() 回傳成功與資料持久化的差別",
    "描述背景回寫與 fsync 的作用"
   ],
   "ask": "write() 成功後，拔掉電源，資料一定還在嗎？",
   "analogy": "你請店員「幫我記在帳本」；店員先寫在白板（快取）後說好，並不等於已刻在永久保存的帳本（持久儲存）。",
   "why": "檔案系統同時處理命名、目錄、空間配置、權限與持久性。寫入的回傳時機與真正的耐久化不是一回事。",
   "details": [
    [
     "File Descriptor",
     "開啟檔案後，Process 使用整數 fd 引用核心管理的開啟檔案狀態。檔名不是 fd。"
    ],
    [
     "inode／metadata",
     "Unix 類檔案系統通常由 inode 存檔案中繼資料、資料區塊指向等；目錄將名稱映射到檔案身分。"
    ],
    [
     "Page Cache",
     "write 通常可先更新核心快取，再由系統回寫；持久性語意依檔案系統、掛載模式及硬體而異。"
    ],
    [
     "fsync",
     "fsync 請求同步檔案資料及所需 metadata；崩潰一致性還需考慮 rename、directory fsync 和硬體保證。"
    ]
   ],
   "steps": [
    "應用程式發出 write",
    "資料先進入核心緩衝／page cache（一般情況）",
    "背景寫回可能把髒資料提交到儲存裝置",
    "fsync 等同步方法提供更強的持久性請求"
   ],
   "caveat": "本模擬只展示「快取 ≠ 持久化」；真實儲存層有日誌、控制器快取、排序與斷電保護等差異。",
   "summary": [
    "目錄把名稱對應到 inode；open 回傳行程內的 fd。",
    "write 通常先寫進 page cache（標記為 dirty），之後才回寫到裝置。",
    "需要耐久保證時呼叫 fsync，並記得 metadata 與目錄也可能需要同步。"
   ],
   "terms": [
    "file-descriptor",
    "inode",
    "page-cache",
    "dirty-page",
    "fsync",
    "journaling"
   ],
   "lab": "storage",
   "code": [
    "C",
    "int fd = open(\"data.txt\", O_WRONLY | O_CREAT, 0644);\nwrite(fd, \"OK\", 2);\nfsync(fd);  // 強化資料持久化要求\nclose(fd);"
   ],
   "quiz": [
    [
     "write() 成功是否一定等於斷電後資料仍在？",
     [
      "是",
      "不一定"
     ],
     1,
     "系統可能先寫入哪裡？",
     "write 成功通常不能單獨保證資料已在持久媒體安全保存。"
    ],
    [
     "fd（File Descriptor）比較像？",
     [
      "作業系統在行程內使用的開啟檔案識別號",
      "全世界唯一的檔名",
      "磁碟扇區的位置"
     ],
     0,
     "它是 Process 用來引用核心開啟檔案狀態的整數",
     "fd 不是檔名或實體磁區。"
    ],
    [
     "在 Unix 類檔案系統中，檔名存在哪裡？",
     [
      "inode 裡",
      "目錄項目（directory entry）裡，對應到 inode 編號",
      "資料區塊的開頭"
     ],
     1,
     "為什麼同一個檔案可以有多個 hard link？",
     "目錄項目把名稱對應到 inode；多個名稱可以指向同一個 inode。"
    ],
    [
     "最後一次 fsync 寫入 v2，之後又 write 了 v3 但尚未同步，此時斷電。重開機後最可能讀到？",
     [
      "一定是 v3",
      "v2（除非背景回寫已經把 v3 寫下去）",
      "檔案一定損毀"
     ],
     1,
     "fsync 保證的是呼叫當下的內容",
     "fsync 之後的修改還在 page cache，是否已落盤取決於背景回寫時機。"
    ]
   ]
  },
  {
   "id": 19,
   "unit": "儲存",
   "title": "磁碟排程與儲存裝置",
   "short": "FCFS、SSTF、SCAN、C-SCAN、LOOK 與 SSD",
   "minutes": 22,
   "icon": "◎",
   "goals": [
    "用 FCFS、SSTF、SCAN、C-SCAN、LOOK 計算讀寫頭的總移動量",
    "比較各演算法的效率與公平性",
    "說明 HDD 與 SSD 在 I/O 排程上的差異"
   ],
   "ask": "一堆讀寫請求散落在磁碟各處，讀寫頭應該依照什麼順序移動？",
   "analogy": "電梯接到很多樓層的請求：照按鈕的先後來回跑很浪費（FCFS）；永遠先去最近的樓層，遠端的人可能等很久（SSTF）；一路往上服務到頂再往下（SCAN，電梯演算法）就比較公平。",
   "why": "傳統硬碟（HDD）的存取時間由尋軌（seek）、旋轉延遲與傳輸組成，其中尋軌通常最昂貴。磁碟排程重新安排請求順序以減少讀寫頭的移動。SSD 沒有機械讀寫頭，排程的重點轉為合併請求、公平性與佇列深度。",
   "details": [
    [
     "FCFS",
     "依請求到達的順序服務。公平、簡單，但讀寫頭可能大幅來回移動。"
    ],
    [
     "SSTF",
     "每次選距離目前位置最近的請求。總移動量通常較少，但遠端請求可能飢餓（類似 SJF）。"
    ],
    [
     "SCAN / LOOK",
     "SCAN 朝一個方向移動到盡頭再反向（電梯）；LOOK 只走到該方向最後一個請求就反向，不必碰到磁碟邊緣。"
    ],
    [
     "C-SCAN / C-LOOK",
     "只在單一方向服務，到底後直接跳回另一端繼續，讓各位置的等待時間更平均。回程跳躍是否計入移動量，依題目約定。"
    ]
   ],
   "steps": [
    "記錄讀寫頭目前的位置與移動方向",
    "依演算法選出下一個要服務的柱面",
    "累加移動距離 |目前 − 下一個|",
    "服務完所有請求後，比較總移動量"
   ],
   "caveat": "現代 HDD 內部有自己的命令排隊（NCQ），Linux 也改用 mq-deadline、BFQ、kyber 或 none 等 I/O scheduler；教科書演算法用來理解取捨，不是實際參數。本實驗的 C-SCAN / C-LOOK 會把回程跳躍計入總移動量。",
   "summary": [
    "總移動量 = 相鄰服務柱面的距離總和；先畫路徑再加總。",
    "SSTF 移動少但可能飢餓；SCAN / LOOK 像電梯，比較公平；C-SCAN 讓等待更平均。",
    "SSD 沒有尋軌成本，排程重點轉為合併、公平與並行佇列。"
   ],
   "terms": [
    "seek-time",
    "sstf",
    "scan",
    "c-scan",
    "ssd"
   ],
   "lab": "disk",
   "code": [
    "Text",
    "請求佇列：98, 183, 37, 122, 14, 124, 65, 67\n讀寫頭起點：53，柱面範圍 0–199\n\nFCFS 總移動量\n= |53−98| + |98−183| + |183−37| + |37−122|\n+ |122−14| + |14−124| + |124−65| + |65−67|\n= 640"
   ],
   "quiz": [
    [
     "同上例（起點 53），SSTF 的總移動量是？",
     [
      "640",
      "236",
      "208"
     ],
     1,
     "每一步都選最近的請求",
     "路徑 53 → 65 → 67 → 37 → 14 → 98 → 122 → 124 → 183，共 236。"
    ],
    [
     "SSTF 最大的缺點是？",
     [
      "移動量一定比 FCFS 大",
      "遠端的請求可能飢餓",
      "不能用在 HDD 上"
     ],
     1,
     "和 SJF 的缺點很像",
     "若附近一直有新請求，遠端的請求可能一直等不到。"
    ],
    [
     "LOOK 與 SCAN 的差別是？",
     [
      "只移動到該方向的最後一個請求就折返，不必走到磁碟邊緣",
      "只在單一方向服務",
      "完全隨機選擇"
     ],
     0,
     "「看」一下前面還有沒有請求",
     "LOOK 省去走到邊緣的空跑距離。"
    ],
    [
     "為什麼 SSD 不太需要以「減少尋軌距離」為目標的排程？",
     [
      "SSD 沒有機械讀寫頭，存取延遲和位置幾乎無關",
      "SSD 不支援任何排程",
      "SSD 只能循序寫入"
     ],
     0,
     "HDD 的成本主要來自哪裡？",
     "沒有尋軌與旋轉延遲，排程重點轉為合併請求與公平性。"
    ]
   ]
  },
  {
   "id": 9,
   "unit": "儲存",
   "title": "I/O、中斷與驅動程式",
   "short": "為何等待 I/O 不浪費 CPU",
   "minutes": 17,
   "icon": "⇄",
   "goals": [
    "比較 polling、interrupt、DMA 三種 I/O 方式的 CPU 成本",
    "說明阻塞 I/O 時執行緒狀態如何變化",
    "分辨 blocking / non-blocking 與 sync / async"
   ],
   "ask": "SSD 正在讀資料時，CPU 必須一直空轉嗎？",
   "analogy": "向餐廳點餐後，你不用站在廚房門口反覆問菜好了沒；可以先去辦別件事，餐點完成後再通知你。",
   "why": "OS 可讓等待裝置事件的執行緒阻塞，改去排程其他工作；裝置完成後靠中斷、輪詢或其他機制通知，再使等待者可繼續。",
   "details": [
    [
     "Device Driver",
     "驅動程式把 OS 的通用 I/O 請求轉為特定裝置能理解的操作。"
    ],
    [
     "Interrupt",
     "裝置可藉由中斷通知 CPU；實際 I/O 可能結合 DMA、提交佇列、輪詢及完成佇列。"
    ],
    [
     "Blocking／Non-blocking",
     "阻塞描述呼叫是否等待；同步／非同步描述完成通知與控制流程，兩組概念不能完全畫等號。"
    ],
    [
     "Throughput／Latency",
     "吞吐量是單位時間工作量，延遲是一筆請求耗時；批次化和佇列可能提高吞吐但增加尾端延遲。"
    ]
   ],
   "steps": [
    "程式執行 read()",
    "若需要等待，執行緒轉為 Waiting",
    "裝置執行 I/O；CPU 可跑其他 Ready 工作",
    "完成後 OS 喚醒執行緒，再排程"
   ],
   "caveat": "對 page cache 命中的 read()，可能無需真的等待磁碟；教科書會先從需要 I/O 的典型路徑講起。",
   "summary": [
    "Polling 讓 CPU 反覆檢查狀態，只適合極短的等待。",
    "Interrupt 讓 CPU 先做別的事，完成時再通知；DMA 讓裝置直接搬資料，CPU 只在開始與結束時介入。",
    "等待 I/O 的執行緒進入 Waiting，CPU 可以去排程其他工作。"
   ],
   "terms": [
    "interrupt",
    "polling",
    "dma",
    "device-driver",
    "blocking-io"
   ],
   "lab": "io",
   "code": [
    "Python",
    "with open(\"sample.txt\", \"rb\") as f:\n    data = f.read()   # 上層 API 不等於 1 次硬體讀取"
   ],
   "quiz": [
    [
     "阻塞等待磁碟 I/O 的 Thread，通常？",
     [
      "一直占用 CPU 直到 I/O 完成",
      "釋出 CPU，等待完成通知",
      "自動變成新的 Process"
     ],
     1,
     "前面 Process state 的 Waiting 想想看",
     "Blocked thread 通常不持續占 CPU 執行。"
    ],
    [
     "read() 呼叫一定讓 SSD 運轉嗎？",
     [
      "一定",
      "不一定，可能命中 page cache"
     ],
     1,
     "若資料之前讀過且在記憶體呢？",
     "快取命中可能省下裝置 I/O。"
    ],
    [
     "要從裝置搬運大量資料，哪種方式最能減少 CPU 介入？",
     [
      "Programmed I/O + polling",
      "每個位元組觸發一次 interrupt",
      "DMA"
     ],
     2,
     "能不能讓裝置自己把資料寫進記憶體？",
     "DMA 控制器負責搬運，整批完成後才以一次中斷通知 CPU。"
    ],
    [
     "極高速的 NVMe 裝置在高負載下有時改用 polling，原因是？",
     [
      "等待時間極短時，中斷處理與 context switch 的成本反而比輪詢高",
      "Polling 完全不使用 CPU",
      "Interrupt 已經被淘汰"
     ],
     0,
     "比較「等待時間」與「中斷處理成本」",
     "當 I/O 在幾微秒內完成，輪詢省下的中斷與切換成本可能更划算。"
    ]
   ]
  },
  {
   "id": 10,
   "unit": "系統",
   "title": "Protection 與 Security",
   "short": "權限、隔離、最小特權",
   "minutes": 18,
   "icon": "⬡",
   "goals": [
    "區分 authentication 與 authorization",
    "讀懂 Unix 權限位元並和八進位表示互相轉換",
    "解釋最小特權原則如何縮小攻擊造成的影響"
   ],
   "ask": "為什麼一般應用程式不能修改 Kernel？",
   "analogy": "每間教室有門禁；你能走自己的教室，但不能因為拿著自己的鑰匙就開別人的門。門禁系統還會記錄誰可以去哪裡。",
   "why": "OS 必須維持程序、使用者與核心之間的保護邊界，否則單一程式就可能破壞整個系統或取得機密。",
   "details": [
    [
     "Authentication／Authorization",
     "身份驗證辨識你是誰；授權確認你能做什麼。"
    ],
    [
     "Access Control",
     "Unix 權限位、ACL、能力模型與 sandbox 等機制控制資源存取。"
    ],
    [
     "Memory Protection",
     "頁表與 CPU 特權模式協助阻止程式直接存取未授權位址。"
    ],
    [
     "Least Privilege",
     "僅給執行工作所需權限，將弱點影響範圍縮小。"
    ]
   ],
   "steps": [
    "識別提出請求的主體",
    "根據憑證與權限規則進行檢查",
    "授權後執行操作，否則拒絕",
    "必要時記錄安全事件"
   ],
   "caveat": "擁有 root 或管理員權限也不代表能繞過所有隔離與硬體保護，例如某些安全啟動與虛擬化隔離。",
   "summary": [
    "先驗證身分（AuthN），再檢查權限（AuthZ）。",
    "rwx 分成 owner / group / others 三組，r = 4、w = 2、x = 1。",
    "只給必要權限，搭配記憶體保護與特權模式建立多層防線。"
   ],
   "terms": [
    "authentication",
    "authorization",
    "access-control",
    "least-privilege",
    "setuid"
   ],
   "lab": "perm",
   "code": [
    "Bash",
    "ls -l secret.txt\nchmod 600 secret.txt   # 擁有者可讀寫；他人不可"
   ],
   "quiz": [
    [
     "「我知道你是誰」比較接近哪個？",
     [
      "Authentication",
      "Authorization"
     ],
     0,
     "確認身份與檢查權限不是同一回事",
     "Authentication 是身分驗證；Authorization 是授權。"
    ],
    [
     "最小特權原則強調？",
     [
      "給所有程式最高權限",
      "只給完成工作必須的權限"
     ],
     1,
     "若應用程式遭攻擊，希望它拿到多少能力？",
     "最小特權能降低可能受害範圍。"
    ],
    [
     "chmod 754 file 的意義是？",
     [
      "owner rwx、group r-x、others r--",
      "owner rw-、group r-x、others rwx",
      "所有人都可以寫入"
     ],
     0,
     "把每一位數拆成 4 + 2 + 1",
     "7 = 4+2+1（rwx）、5 = 4+1（r-x）、4 = 4（r--）。"
    ],
    [
     "對「目錄」而言，x（execute）權限代表？",
     [
      "可以執行這個目錄",
      "可以進入、穿越目錄並存取其中已知名稱的項目",
      "可以刪除這個目錄"
     ],
     1,
     "目錄不是程式",
     "目錄的 r 是列出名稱、w 是新增或刪除項目、x 是穿越（search）。"
    ]
   ]
  },
  {
   "id": 11,
   "unit": "系統",
   "title": "Virtual Machine vs Container",
   "short": "兩種隔離方式",
   "minutes": 17,
   "icon": "◫",
   "goals": [
    "畫出 VM 與 container 的軟體堆疊差異",
    "說明 namespaces 與 cgroups 各自負責什麼",
    "評估兩者在隔離強度、啟動速度與資源成本上的取捨"
   ],
   "ask": "Docker Container 裡面到底有沒有自己的 Kernel？",
   "analogy": "VM 像不同棟的大樓，各自有完整的水電管理系統；Container 像同一棟大樓內隔出的不同套房，共用底層管理與設施，但生活空間互相隔離。",
   "why": "Virtual Machine 透過 hypervisor 虛擬化硬體，可運行自己的 guest kernel；一般 OS 容器共用 host kernel，以 namespaces、cgroups 等實現隔離與資源控制。",
   "details": [
    [
     "Hypervisor",
     "提供虛擬 CPU、記憶體與裝置環境，讓 guest OS 執行。"
    ],
    [
     "Container",
     "封裝程序、依賴與隔離的檔案／網路視角，但其程序仍受 host kernel 管理。"
    ],
    [
     "namespace / cgroups",
     "Linux namespaces 分隔可見資源，cgroups 管控及統計 CPU、記憶體等資源。"
    ],
    [
     "安全邊界",
     "容器隔離不是 VM 完全相同的邊界；風險模型與宿主環境關係密切。"
    ]
   ],
   "steps": [
    "Docker 啟動一組隔離的程序",
    "程序仍透過 host kernel syscall",
    "cgroup 約束或統計資源",
    "VM 的 guest 會有自己核心並經虛擬硬體執行"
   ],
   "caveat": "「Docker 就是輕量 VM」只可當初步類比，若拿來推導 Kernel 邊界會出錯。",
   "summary": [
    "VM 有自己的 guest kernel，透過 hypervisor 共用硬體。",
    "Container 共用 host kernel：namespaces 隔離視角，cgroups 限制資源。",
    "容器輕快但隔離邊界較薄；VM 較重但隔離較強。"
   ],
   "terms": [
    "hypervisor",
    "container",
    "namespace",
    "cgroups"
   ],
   "lab": "isolation",
   "code": [
    "Bash",
    "docker run --rm ubuntu:24.04 uname -a\n# 一般 Linux container 的 uname 可見 host kernel 特性"
   ],
   "quiz": [
    [
     "一般 Linux Container 的 Process 使用哪個 Kernel？",
     [
      "容器自行開機的一顆完整 Kernel",
      "Host Kernel"
     ],
     1,
     "從 syscall 進入的是誰？",
     "容器程序通常共用宿主核心。"
    ],
    [
     "一般 VM 相較容器，較明顯的特徵？",
     [
      "可執行自己的 guest kernel",
      "一定比容器更快"
     ],
     0,
     "VM 的「客體作業系統」想想看",
     "VM 可執行獨立的 guest OS 與 Kernel。"
    ],
    [
     "限制某個容器最多只能使用 512 MB 記憶體，靠的是？",
     [
      "namespaces",
      "cgroups",
      "chroot"
     ],
     1,
     "一個管「看得到什麼」，一個管「能用多少」",
     "cgroups 負責限制與統計 CPU、記憶體、I/O 等資源。"
    ],
    [
     "在 x86 Linux 主機上直接執行為 Windows 編譯的容器映像，通常？",
     [
      "可以，容器裡附帶 Windows kernel",
      "不行，容器共用 host 的 Linux kernel",
      "一定可以，Docker 會自動翻譯"
     ],
     1,
     "容器中的程式最終向誰發出 system call？",
     "容器沒有自己的 kernel；Windows 程式需要 Windows kernel（或另外跑一台 VM）。"
    ]
   ]
  },
  {
   "id": 12,
   "unit": "系統",
   "title": "效能與觀測",
   "short": "瓶頸、負載、Latency、Throughput",
   "minutes": 18,
   "icon": "▦",
   "goals": [
    "區分 latency、throughput 與 utilization",
    "用 Little's Law 與簡單佇列模型解釋高使用率下延遲暴增",
    "描述以證據為本的效能分析流程"
   ],
   "ask": "CPU 使用率 100%，系統一定表現最好嗎？",
   "analogy": "餐廳廚師全程忙碌，不代表客人很快拿到餐；如果訂單塞車或配料跟不上，客人反而等很久。",
   "why": "OS 效能分析需要先看時間花在哪裡，然後有證據地辨別 CPU、記憶體、I/O、鎖、網路或應用程式瓶頸。",
   "details": [
    [
     "CPU Utilization",
     "忙碌程度 ≠ 每筆請求體驗；也要檢查排隊時間與 CPU throttling。"
    ],
    [
     "Latency vs Throughput",
     "優化批次可能改善 throughput，同時讓單筆延遲惡化。"
    ],
    [
     "Memory pressure",
     "關注 RSS、page faults、swap、OOM 等訊號，別只看剩餘 RAM 數字。"
    ],
    [
     "性能分析流程",
     "提出假設 → 收集指標 → 重現負載 → 改一個因素 → 對照測試，避免憑感覺優化。"
    ]
   ],
   "steps": [
    "先找使用者感受到的延遲／錯誤",
    "辨認是 CPU、I/O、鎖或排隊",
    "蒐集數據並確認假設",
    "一次變更一個因素，再觀察結果"
   ],
   "caveat": "單看 top／工作管理員中的 CPU% 或 RAM% 無法直接判定瓶頸；需要情境與時序資料。",
   "summary": [
    "使用率越接近 100%，排隊時間越呈非線性暴增。",
    "Little's Law：L = λ × W，系統中平均數量 = 到達率 × 平均停留時間。",
    "先量測、提出假設、一次只改一個變因，再驗證。"
   ],
   "terms": [
    "latency",
    "throughput",
    "utilization",
    "littles-law",
    "tail-latency"
   ],
   "lab": "queue",
   "code": [
    "Bash",
    "top           # CPU / process\nvmstat 1      # memory/swap/scheduler\niostat -x 1   # storage（若已安裝）"
   ],
   "quiz": [
    [
     "服務端 p95 latency 飆高，但平均 CPU 不高，最好的第一步？",
     [
      "立即換更快 CPU",
      "蒐集等待、I/O、鎖與佇列等指標",
      "直接加倍 Thread"
     ],
     1,
     "先定位瓶頸，才有可解釋的改善",
     "低 CPU 使用率也可能嚴重被 I/O、鎖或外部服務阻塞。"
    ],
    [
     "Throughput 與 Latency？",
     [
      "永遠同方向改善",
      "不同指標，有時互相取捨"
     ],
     1,
     "批次提升每秒處理量時，個別請求會不會等更久？",
     "吞吐與延遲在佇列和批次策略下可能形成取捨。"
    ],
    [
     "服務每秒處理 100 個請求，平均停留 0.2 秒。依 Little's Law，系統中平均有幾個請求？",
     [
      "20",
      "500",
      "0.002"
     ],
     0,
     "L = λ × W",
     "L = 100 × 0.2 = 20。"
    ],
    [
     "單一伺服器佇列模型（M/M/1）中，使用率從 50% 升到 90%，平均回應時間大約變成？",
     [
      "多 10%",
      "5 倍",
      "不變"
     ],
     1,
     "回應時間與 1 / (1 − ρ) 成正比",
     "1/(1−0.5) = 2，1/(1−0.9) = 10，變成 5 倍。到實驗中拖動滑桿看看曲線。"
    ]
   ]
  },
  {
   "id": 13,
   "unit": "整合",
   "title": "案例：一個 API 請求的旅程",
   "short": "串起 Process、Scheduling、I/O",
   "minutes": 21,
   "icon": "➝",
   "goals": [
    "把一個 API 請求拆成網路、排程、記憶體、儲存等階段",
    "辨認每個階段可能的等待來源",
    "用延遲分解找出最值得優化的部分"
   ],
   "ask": "瀏覽器向 API 發出請求，背後哪些 OS 機制被用到？",
   "analogy": "外送訂單跨越接單、備餐、物流，單看任何一個環節都無法說明整張訂單的延遲；API 也跨越網路、排程、記憶體、檔案與資料庫。",
   "why": "真正的系統不分章節：一個請求可能從網路中斷、socket 佇列、worker thread、資料庫 I/O，到回傳 response。",
   "details": [
    [
     "Network path",
     "網卡接收到資料，核心網路堆疊處理 socket，應用程式被喚醒或取得通知。"
    ],
    [
     "Execution path",
     "事件迴圈或工作執行緒處理請求，OS / Runtime 決定執行時機。"
    ],
    [
     "Memory path",
     "請求、buffer、物件佔用虛擬記憶體；可能碰上快取與 page faults。"
    ],
    [
     "Storage path",
     "資料庫可能讀 page cache 或存取磁碟，也可能等待遠端服務。"
    ]
   ],
   "steps": [
    "NIC 收到封包；核心將資料導向 socket",
    "Worker 從等待變為可執行、得到 CPU",
    "應用程式查資料、可能因 I/O 等待",
    "完成後經 socket 回覆用戶端"
   ],
   "caveat": "實際路徑因同步／非同步設計、網路堆疊、TLS 終止位置和資料庫架構不同。",
   "summary": [
    "一個請求的延遲 = 各階段時間（含排隊與等待）的總和。",
    "快取命中、連線重用、避免阻塞，都能大幅改變結果。",
    "先找最大的那一塊再優化，不要把力氣花在只占 1% 的地方。"
   ],
   "terms": [
    "socket",
    "event-loop",
    "latency",
    "page-cache"
   ],
   "lab": "journey",
   "code": [
    "Python",
    "def request_flow():\n    # socket -> schedule -> handler -> I/O -> response\n    pass"
   ],
   "quiz": [
    [
     "API 處理中等待外部資料庫回覆時，正在處理該請求的 OS Thread 可能？",
     [
      "進入等待，CPU 執行其他工作",
      "必然永久占用 CPU"
     ],
     0,
     "等待外部事件對照 Process State",
     "阻塞式 I/O 可以讓執行緒等待，CPU 執行別的工作；事件迴圈則可轉去服務其他 task。"
    ],
    [
     "API p99 延遲高，應先假定 CPU 不夠嗎？",
     [
      "應該",
      "不應該，需要量測路徑"
     ],
     1,
     "單筆請求橫跨哪些環節？",
     "應量測網路、應用、儲存、佇列和鎖等因素。"
    ],
    [
     "延遲分解顯示「資料庫磁碟讀取」占 80%，最優先的改善方向是？",
     [
      "優化 JSON 序列化",
      "提高快取命中率或改善查詢／索引，減少磁碟 I/O",
      "換更快的網卡"
     ],
     1,
     "先處理最大的那一塊",
     "只有減少占比最大的階段，整體延遲才會明顯下降。"
    ],
    [
     "一個 worker thread 正在等資料庫回覆，要讓其他請求同時被處理，需要？",
     [
      "多個 worker thread，或非同步事件迴圈",
      "更高的 CPU 時脈",
      "關閉 page cache"
     ],
     0,
     "等待中的執行緒不能同時處理別的請求",
     "用多執行緒或事件迴圈，讓 CPU 在等待期間服務其他請求。"
    ]
   ]
  },
  {
   "id": 14,
   "unit": "實驗",
   "title": "系統工具與 C 實驗",
   "short": "用實驗觀察真實系統",
   "minutes": 20,
   "icon": "⌘",
   "goals": [
    "預測連續 fork() 之後的行程數與輸出次數",
    "畫出 fork 產生的行程樹",
    "用 ps、/proc、strace 等工具驗證預測"
   ],
   "ask": "如果只是背概念，怎麼知道真實 Linux 跟你想的一樣？",
   "analogy": "學游泳不能只看示意圖；OS 也是，要讓程式真的執行並觀察 PID、記憶體、檔案與排程。",
   "why": "理論模型用來理解原理；實驗讓你辨別哪些是真實現象、哪些是為教學簡化的假設。",
   "details": [
    [
     "Lab A：Process",
     "用 fork / wait 比較父子程序 PID，觀察輸出順序與 OS 排程。"
    ],
    [
     "Lab B：Thread",
     "用 pthread 建立 Thread，加入 mutex 前後比較共享計數是否正確。"
    ],
    [
     "Lab C：Memory",
     "用 malloc、/proc/<pid>/maps、top 等工具觀察位址、RSS 與記憶體。"
    ],
    [
     "Lab D：I/O",
     "對照 write、fsync 與 file descriptor，測試不同批次策略的差異。"
    ]
   ],
   "steps": [
    "先對現象寫出預測",
    "執行程式與紀錄輸出",
    "比對預測，確認簡化模型限制",
    "寫下修正後的解釋"
   ],
   "caveat": "真實進程行為會受作業系統版本、編譯器、工作負載和環境影響。Windows 可用 WSL2 進行 Linux POSIX 練習。",
   "summary": [
    "連續 n 次 fork() 後共有 2ⁿ 個行程：每次 fork 都讓現存行程數加倍。",
    "父子行程的執行順序由排程決定，輸出順序不固定。",
    "先寫下預測，再用工具觀察，最後修正自己的心智模型。"
   ],
   "terms": [
    "fork",
    "strace",
    "proc"
   ],
   "lab": "fork",
   "code": [
    "Bash",
    "gcc -Wall -Wextra -O0 fork_demo.c -o fork_demo\n./fork_demo\nps -ef | head"
   ],
   "quiz": [
    [
     "觀察 OS 行為最好的學習方式是？",
     [
      "先預測、實驗、比對觀察與模型",
      "只背一個固定輸出順序"
     ],
     0,
     "同一段程式可能因排程而有不同觀察",
     "先建立可反駁的預測再測試，可將觀察化為理解。"
    ],
    [
     "在 Windows 11 上練習 POSIX fork()，推薦環境？",
     [
      "一般 cmd 原生執行 fork",
      "Linux／WSL2",
      "只能購買另一台機器"
     ],
     1,
     "POSIX 函式在什麼系統較直接可用？",
     "WSL2 提供 Linux 使用者環境，非常適合這些實驗。"
    ],
    [
     "fork(); fork(); fork(); printf(\"hi\\n\"); 會印出幾次 hi？",
     [
      "3",
      "6",
      "8"
     ],
     2,
     "每次 fork，所有現存行程都會各自複製一份",
     "3 次 fork 後有 2³ = 8 個行程，各印一次。"
    ],
    [
     "哪個 Linux 工具可以觀察程式呼叫了哪些系統呼叫？",
     [
      "strace",
      "chmod",
      "gcc"
     ],
     0,
     "名稱裡有 trace",
     "strace 會列出行程的每一次系統呼叫、參數與回傳值。"
    ]
   ]
  },
  {
   "id": 15,
   "unit": "複習",
   "title": "最終整合與自我檢核",
   "short": "用一個模型串起 OS",
   "minutes": 25,
   "icon": "★",
   "goals": [
    "不看講義串起執行鏈、資料鏈、正確性鏈與可靠性鏈",
    "在混合題中辨認題目屬於哪個主題",
    "找出自己最弱的章節並安排複習"
   ],
   "ask": "你能不看講義，從啟動程式一直說到讀檔回傳嗎？",
   "analogy": "當你能從「餐廳」一路講到廚師、排隊、倉庫、門禁、送餐，而不會把不同角色混淆，就代表這個模型逐漸完整。",
   "why": "真正理解是能跨章節解釋現象、畫流程圖、手算模型，還能指出簡化模型與真實 Linux 的差距。",
   "details": [
    [
     "執行鏈",
     "Program → Process → Thread → Scheduler → CPU → System Call → Device / I/O。"
    ],
    [
     "資料鏈",
     "VA → VPN + Offset → TLB / Page Table → PFN → Physical Memory；缺頁時有 OS 協助。"
    ],
    [
     "正確性鏈",
     "Concurrent Threads → Shared Data → Race → Synchronization → Deadlock 風險與設計。"
    ],
    [
     "可靠性鏈",
     "File Write → Page Cache → Writeback → fsync／持久性；容器 vs VM 是另外一種隔離設計。"
    ]
   ],
   "steps": [
    "先從第 0 章口述完整執行路徑",
    "能手算排程和分頁轉譯",
    "能解釋競爭條件並提出同步策略",
    "能用 Linux 工具對照預測和現實"
   ],
   "caveat": "完成網頁測驗表示基本觀念過關，不代表已具備 Kernel 開發技能；下一步是 xv6、C 與 Linux 原始碼。",
   "summary": [
    "混合練習（interleaving）比單章重複更能測出真正的理解。",
    "答錯的題目會進入「錯題本」，隔一段時間再練最有效。",
    "下一步：讀 xv6 原始碼、寫 Linux C 實驗，把模型落實到真實系統。"
   ],
   "terms": [
    "mode-switch",
    "context-switch",
    "thrashing",
    "virtual-address"
   ],
   "lab": "review",
   "code": [
    "Text",
    "Program ≠ Process ≠ Thread\nMode switch ≠ Context switch\nConcurrency ≠ Parallelism\nwrite() success ≠ guaranteed persistence"
   ],
   "quiz": [
    [
     "要安全修改共享變數，第一個該檢查的核心問題？",
     [
      "有沒有正確同步所有讀改寫操作",
      "Thread 名稱夠不夠長"
     ],
     0,
     "看操作是否能以原子性方式完成",
     "共享資料正確性需要同步，不能依賴固定的執行順序。"
    ],
    [
     "下列哪個描述最精確？",
     [
      "Virtual Memory 是把 SSD 改名叫 RAM",
      "Virtual Memory 是位址抽象與保護機制，必要時可搭配次級儲存",
      "Virtual Memory 等於 CPU Cache"
     ],
     1,
     "區分「位址」與「資料暫存」",
     "虛擬記憶體是位址空間抽象／保護，並非僅僅 swap。"
    ],
    [
     "Mode switch 與 context switch 的關係是？",
     [
      "每次 mode switch 都會 context switch",
      "Context switch 通常需要進入核心，但進入核心不一定會 context switch",
      "兩者完全無關"
     ],
     1,
     "想想 system call 返回原本的執行緒",
     "例如 getpid() 進入核心後直接返回原執行緒，只有 mode switch。"
    ],
    [
     "以下哪個情境最可能造成 thrashing？",
     [
      "同時執行的行程，工作集合總和遠大於實體記憶體",
      "CPU 時脈太高",
      "硬碟空間太多"
     ],
     0,
     "系統把時間都花在哪裡？",
     "工作集合放不下時，系統不停缺頁、換頁，真正的工作幾乎停滯。"
    ]
   ]
  }
 ],
 "glossary": [
  {
   "id": "pc",
   "zh": "程式計數器",
   "en": "Program Counter (PC / IP)",
   "def": "指向下一條要執行之指令位址的暫存器。分支、函式呼叫與中斷都會改變它。",
   "ch": 0
  },
  {
   "id": "register",
   "zh": "暫存器",
   "en": "Register",
   "def": "CPU 內部最快、容量最小的儲存位置，存放運算元、結果與 PC、SP 等控制資訊。",
   "ch": 0
  },
  {
   "id": "memory-hierarchy",
   "zh": "記憶體階層",
   "en": "Memory Hierarchy",
   "def": "暫存器 → 快取 → RAM → SSD/HDD：越靠近 CPU 越快、越小、越貴。",
   "ch": 0
  },
  {
   "id": "instruction-cycle",
   "zh": "指令週期",
   "en": "Instruction Cycle",
   "def": "取指（Fetch）→ 解碼（Decode）→ 執行（Execute）→ 寫回 / 提交的重複流程。",
   "ch": 0
  },
  {
   "id": "interrupt",
   "zh": "中斷",
   "en": "Interrupt",
   "def": "由硬體（計時器、裝置）發出的非同步訊號，讓 CPU 暫停目前工作、跳到核心的中斷處理程式。",
   "ch": 9
  },
  {
   "id": "kernel",
   "zh": "核心",
   "en": "Kernel",
   "def": "作業系統中執行於特權模式、管理 CPU、記憶體、裝置與保護邊界的核心部分。",
   "ch": 1
  },
  {
   "id": "user-mode",
   "zh": "使用者模式",
   "en": "User Mode",
   "def": "受限的 CPU 執行模式：不能執行特權指令、不能直接存取核心記憶體或裝置。",
   "ch": 1
  },
  {
   "id": "system-call",
   "zh": "系統呼叫",
   "en": "System Call",
   "def": "使用者程式請求核心服務的受控入口，例如 read、write、open、fork。",
   "ch": 1
  },
  {
   "id": "trap",
   "zh": "陷入",
   "en": "Trap",
   "def": "由目前指令主動或例外引起、跳入核心處理的同步事件；system call 通常透過 trap 指令進入核心。",
   "ch": 1
  },
  {
   "id": "mode-switch",
   "zh": "模式切換",
   "en": "Mode Switch",
   "def": "在 user mode 與 kernel mode 之間切換；不一定伴隨更換執行中的行程。",
   "ch": 1
  },
  {
   "id": "context-switch",
   "zh": "上下文切換",
   "en": "Context Switch",
   "def": "儲存目前執行緒的暫存器等狀態，載入另一個執行緒的狀態，讓 CPU 改跑別人。",
   "ch": 2
  },
  {
   "id": "process",
   "zh": "行程",
   "en": "Process",
   "def": "執行中的程式：包含位址空間、開啟的資源與至少一個執行緒，由 OS 以 PCB 管理。",
   "ch": 2
  },
  {
   "id": "pcb",
   "zh": "行程控制區塊",
   "en": "Process Control Block",
   "def": "核心描述行程的資料結構：PID、狀態、暫存器內容、排程資訊、記憶體與開啟檔案等。",
   "ch": 2
  },
  {
   "id": "process-state",
   "zh": "行程狀態",
   "en": "Process State",
   "def": "五狀態模型：New、Ready、Running、Waiting（Blocked）、Terminated。",
   "ch": 2
  },
  {
   "id": "fork",
   "zh": "fork()",
   "en": "fork",
   "def": "POSIX 系統呼叫：複製目前行程建立子行程；父行程得到子 PID，子行程得到 0。",
   "ch": 14
  },
  {
   "id": "exec",
   "zh": "exec()",
   "en": "exec",
   "def": "以新的程式映像取代目前行程的內容；PID 不變，程式碼與資料被替換。",
   "ch": 2
  },
  {
   "id": "zombie",
   "zh": "殭屍行程",
   "en": "Zombie Process",
   "def": "已結束但結束狀態尚未被父行程 wait() 回收的行程。",
   "ch": 2
  },
  {
   "id": "thread",
   "zh": "執行緒",
   "en": "Thread",
   "def": "可被排程的執行流，擁有自己的 PC、暫存器與 stack，與同行程的其他執行緒共享位址空間。",
   "ch": 3
  },
  {
   "id": "concurrency",
   "zh": "並行",
   "en": "Concurrency",
   "def": "多個工作在同一段時間內都在進行（可能交錯執行），不一定同時。",
   "ch": 3
  },
  {
   "id": "parallelism",
   "zh": "平行",
   "en": "Parallelism",
   "def": "多個工作在同一瞬間於不同硬體（核心）上真正同時執行。",
   "ch": 3
  },
  {
   "id": "stack",
   "zh": "堆疊",
   "en": "Stack",
   "def": "存放函式呼叫框架、區域變數與返回位址的區域；每個執行緒各有一個。",
   "ch": 3
  },
  {
   "id": "heap",
   "zh": "堆積",
   "en": "Heap",
   "def": "動態配置（malloc / new）的記憶體區域，同行程的執行緒共享。",
   "ch": 3
  },
  {
   "id": "scheduler",
   "zh": "排程器",
   "en": "Scheduler",
   "def": "從 Ready 佇列中決定下一個取得 CPU 的執行緒的核心元件。",
   "ch": 4
  },
  {
   "id": "fcfs",
   "zh": "先到先服務",
   "en": "First-Come, First-Served",
   "def": "依到達順序執行、不搶先的排程政策；可能產生 convoy effect。",
   "ch": 4
  },
  {
   "id": "sjf",
   "zh": "最短工作優先",
   "en": "Shortest Job First",
   "def": "選擇 CPU burst 最短者；搶先版本稱 SRTF。可使平均等待時間最小，但需預知 burst。",
   "ch": 4
  },
  {
   "id": "round-robin",
   "zh": "輪轉排程",
   "en": "Round Robin",
   "def": "每個工作輪流執行至多一個時間片（quantum），用完就回到佇列尾端。",
   "ch": 4
  },
  {
   "id": "turnaround",
   "zh": "周轉時間",
   "en": "Turnaround Time (TAT)",
   "def": "從到達到完成的總時間：TAT = CT − AT。",
   "ch": 4
  },
  {
   "id": "waiting-time",
   "zh": "等待時間",
   "en": "Waiting Time (WT)",
   "def": "在 Ready 佇列中等待的總時間：WT = TAT − BT（無 I/O 的教學模型）。",
   "ch": 4
  },
  {
   "id": "response-time",
   "zh": "回應時間",
   "en": "Response Time (RT)",
   "def": "從到達到第一次取得 CPU 的時間：RT = 首次執行 − AT。",
   "ch": 4
  },
  {
   "id": "starvation",
   "zh": "飢餓",
   "en": "Starvation",
   "def": "某工作因排程政策長期無法取得資源；常以 aging 緩解。",
   "ch": 20
  },
  {
   "id": "priority",
   "zh": "優先權排程",
   "en": "Priority Scheduling",
   "def": "依優先權高低決定執行順序，可搶先或不搶先。",
   "ch": 20
  },
  {
   "id": "aging",
   "zh": "老化",
   "en": "Aging",
   "def": "隨等待時間逐步提高優先權，避免低優先工作飢餓。",
   "ch": 20
  },
  {
   "id": "mlfq",
   "zh": "多層回饋佇列",
   "en": "Multi-Level Feedback Queue",
   "def": "依工作過去的行為調整其所在佇列與優先權的排程方式。",
   "ch": 20
  },
  {
   "id": "affinity",
   "zh": "親和性",
   "en": "CPU Affinity",
   "def": "讓執行緒盡量在同一顆核心執行，以重用快取內容。",
   "ch": 20
  },
  {
   "id": "race-condition",
   "zh": "競爭條件",
   "en": "Race Condition",
   "def": "結果取決於執行交錯順序，且該順序未受正確同步約束的情形。",
   "ch": 5
  },
  {
   "id": "critical-section",
   "zh": "臨界區",
   "en": "Critical Section",
   "def": "存取共享資源、必須互斥執行的程式片段。",
   "ch": 5
  },
  {
   "id": "mutex",
   "zh": "互斥鎖",
   "en": "Mutex",
   "def": "一次只允許一個執行緒持有的鎖，用於保護臨界區；通常由上鎖者解鎖。",
   "ch": 5
  },
  {
   "id": "atomic",
   "zh": "原子操作",
   "en": "Atomic Operation",
   "def": "不可被其他執行緒觀察到中間狀態的操作，例如硬體的 compare-and-swap。",
   "ch": 5
  },
  {
   "id": "deadlock",
   "zh": "死結",
   "en": "Deadlock",
   "def": "一組行程互相等待對方持有的資源，全都無法繼續。必要條件：互斥、持有並等待、不可搶奪、循環等待。",
   "ch": 17
  },
  {
   "id": "semaphore",
   "zh": "號誌",
   "en": "Semaphore",
   "def": "整數計數加上等待佇列；wait 不足時阻塞，signal 加一並喚醒等待者。",
   "ch": 16
  },
  {
   "id": "producer-consumer",
   "zh": "生產者–消費者",
   "en": "Producer–Consumer",
   "def": "透過有界緩衝區交換資料的經典同步問題。",
   "ch": 16
  },
  {
   "id": "condition-variable",
   "zh": "條件變數",
   "en": "Condition Variable",
   "def": "搭配 mutex 使用：等待某條件成立時釋放鎖並睡眠，被通知後重新取得鎖。",
   "ch": 16
  },
  {
   "id": "safe-state",
   "zh": "安全狀態",
   "en": "Safe State",
   "def": "存在某個順序，讓所有行程都能取得所需資源並完成的狀態。",
   "ch": 17
  },
  {
   "id": "bankers-algorithm",
   "zh": "銀行家演算法",
   "en": "Banker's Algorithm",
   "def": "在分配資源前檢查系統是否仍處於安全狀態的死結避免演算法。",
   "ch": 17
  },
  {
   "id": "resource-allocation-graph",
   "zh": "資源配置圖",
   "en": "Resource-Allocation Graph",
   "def": "以請求邊與配置邊描述行程與資源關係的有向圖，用於判斷死結。",
   "ch": 17
  },
  {
   "id": "virtual-address",
   "zh": "虛擬位址",
   "en": "Virtual Address",
   "def": "程式看到的位址，由 MMU 依頁表轉譯成實體位址。",
   "ch": 6
  },
  {
   "id": "page",
   "zh": "頁",
   "en": "Page",
   "def": "虛擬位址空間中固定大小的區塊，常見為 4 KiB。",
   "ch": 6
  },
  {
   "id": "frame",
   "zh": "頁框",
   "en": "Frame",
   "def": "實體記憶體中與頁同樣大小的區塊。",
   "ch": 6
  },
  {
   "id": "page-table",
   "zh": "頁表",
   "en": "Page Table",
   "def": "記錄 VPN → PFN 對應、有效位元與權限的資料結構。",
   "ch": 6
  },
  {
   "id": "tlb",
   "zh": "轉譯後備緩衝區",
   "en": "Translation Lookaside Buffer",
   "def": "快取最近使用之位址轉譯的小型硬體快取。",
   "ch": 6
  },
  {
   "id": "mmu",
   "zh": "記憶體管理單元",
   "en": "Memory Management Unit",
   "def": "負責位址轉譯與權限檢查的硬體。",
   "ch": 6
  },
  {
   "id": "eat",
   "zh": "有效存取時間",
   "en": "Effective Access Time",
   "def": "考慮 TLB 命中率或缺頁率之後的平均記憶體存取時間。",
   "ch": 6
  },
  {
   "id": "fragmentation",
   "zh": "碎片化",
   "en": "Fragmentation",
   "def": "外部碎片：空閒總量夠但不連續；內部碎片：配置單位內未使用的空間。",
   "ch": 18
  },
  {
   "id": "first-fit",
   "zh": "首次適配",
   "en": "First Fit",
   "def": "選擇第一個夠大的空閒區塊。",
   "ch": 18
  },
  {
   "id": "best-fit",
   "zh": "最佳適配",
   "en": "Best Fit",
   "def": "選擇夠大的空閒區塊中最小的一個。",
   "ch": 18
  },
  {
   "id": "compaction",
   "zh": "壓縮",
   "en": "Compaction",
   "def": "搬移已配置區塊，讓空閒空間合併成連續區域。",
   "ch": 18
  },
  {
   "id": "buddy",
   "zh": "夥伴系統",
   "en": "Buddy System",
   "def": "以 2 的冪次切分與合併區塊的配置器，Linux 用來管理實體頁框。",
   "ch": 18
  },
  {
   "id": "page-fault",
   "zh": "缺頁",
   "en": "Page Fault",
   "def": "存取的頁沒有有效映射時觸發的例外，由核心決定載入、配置或終止行程。",
   "ch": 7
  },
  {
   "id": "demand-paging",
   "zh": "需求分頁",
   "en": "Demand Paging",
   "def": "頁面在真正被存取時才載入記憶體。",
   "ch": 7
  },
  {
   "id": "lru",
   "zh": "最近最少使用",
   "en": "Least Recently Used",
   "def": "置換最久沒有被存取的頁。",
   "ch": 7
  },
  {
   "id": "opt",
   "zh": "最佳置換",
   "en": "Optimal (OPT / MIN)",
   "def": "置換未來最晚才會用到的頁；理論最佳，無法實作，用作比較基準。",
   "ch": 7
  },
  {
   "id": "belady",
   "zh": "Belady 異常",
   "en": "Belady's Anomaly",
   "def": "使用 FIFO 時，增加頁框數反而使缺頁次數增加的現象。",
   "ch": 7
  },
  {
   "id": "thrashing",
   "zh": "輾轉現象",
   "en": "Thrashing",
   "def": "系統花大部分時間處理缺頁與換頁，而非執行有用的工作。",
   "ch": 7
  },
  {
   "id": "working-set",
   "zh": "工作集合",
   "en": "Working Set",
   "def": "行程在最近一段時間內實際存取的頁集合。",
   "ch": 7
  },
  {
   "id": "file-descriptor",
   "zh": "檔案描述符",
   "en": "File Descriptor",
   "def": "行程內代表一個開啟檔案的小整數，索引到核心的開啟檔案表。",
   "ch": 8
  },
  {
   "id": "inode",
   "zh": "inode",
   "en": "Index Node",
   "def": "Unix 類檔案系統中儲存檔案中繼資料與資料區塊位置的結構；檔名存在目錄項目中。",
   "ch": 8
  },
  {
   "id": "page-cache",
   "zh": "頁快取",
   "en": "Page Cache",
   "def": "核心在 RAM 中快取檔案內容的區域，讀寫通常先經過它。",
   "ch": 8
  },
  {
   "id": "dirty-page",
   "zh": "髒頁",
   "en": "Dirty Page",
   "def": "已被修改、尚未寫回儲存裝置的快取頁。",
   "ch": 8
  },
  {
   "id": "fsync",
   "zh": "fsync()",
   "en": "fsync",
   "def": "要求把檔案的已修改資料與必要的中繼資料寫入持久儲存。",
   "ch": 8
  },
  {
   "id": "journaling",
   "zh": "日誌式檔案系統",
   "en": "Journaling",
   "def": "先把變更寫入日誌再套用，崩潰後可重播或丟棄未完成的操作，以維持一致性。",
   "ch": 8
  },
  {
   "id": "seek-time",
   "zh": "尋軌時間",
   "en": "Seek Time",
   "def": "HDD 讀寫頭移動到目標磁軌所需的時間。",
   "ch": 19
  },
  {
   "id": "sstf",
   "zh": "最短尋軌優先",
   "en": "Shortest Seek Time First",
   "def": "每次服務離讀寫頭最近的請求。",
   "ch": 19
  },
  {
   "id": "scan",
   "zh": "掃描排程",
   "en": "SCAN (Elevator)",
   "def": "讀寫頭朝一個方向移動並沿途服務，到底後反向。",
   "ch": 19
  },
  {
   "id": "c-scan",
   "zh": "循環掃描",
   "en": "C-SCAN",
   "def": "只在單一方向服務，到底後跳回起點繼續。",
   "ch": 19
  },
  {
   "id": "ssd",
   "zh": "固態硬碟",
   "en": "Solid-State Drive",
   "def": "以快閃記憶體儲存資料，沒有機械讀寫頭；需處理寫入放大與磨損平均。",
   "ch": 19
  },
  {
   "id": "polling",
   "zh": "輪詢",
   "en": "Polling",
   "def": "CPU 反覆檢查裝置狀態暫存器，直到操作完成。",
   "ch": 9
  },
  {
   "id": "dma",
   "zh": "直接記憶體存取",
   "en": "Direct Memory Access",
   "def": "由 DMA 控制器在裝置與記憶體間搬資料，完成後以中斷通知 CPU。",
   "ch": 9
  },
  {
   "id": "device-driver",
   "zh": "驅動程式",
   "en": "Device Driver",
   "def": "把 OS 的通用 I/O 介面轉換為特定裝置操作的核心模組。",
   "ch": 9
  },
  {
   "id": "blocking-io",
   "zh": "阻塞式 I/O",
   "en": "Blocking I/O",
   "def": "呼叫在資料就緒前不返回，執行緒進入 Waiting 狀態。",
   "ch": 9
  },
  {
   "id": "authentication",
   "zh": "身分驗證",
   "en": "Authentication",
   "def": "確認「你是誰」，例如密碼、金鑰、生物辨識。",
   "ch": 10
  },
  {
   "id": "authorization",
   "zh": "授權",
   "en": "Authorization",
   "def": "確認「你能做什麼」，依權限規則允許或拒絕操作。",
   "ch": 10
  },
  {
   "id": "access-control",
   "zh": "存取控制",
   "en": "Access Control",
   "def": "以權限位元、ACL、capability 等機制限制主體對資源的操作。",
   "ch": 10
  },
  {
   "id": "least-privilege",
   "zh": "最小特權原則",
   "en": "Principle of Least Privilege",
   "def": "只授予完成工作所必需的權限。",
   "ch": 10
  },
  {
   "id": "setuid",
   "zh": "setuid 位元",
   "en": "setuid bit",
   "def": "讓程式以檔案擁有者（常為 root）的身分執行的權限位元，需特別小心。",
   "ch": 10
  },
  {
   "id": "hypervisor",
   "zh": "虛擬機器監控器",
   "en": "Hypervisor",
   "def": "在硬體上建立虛擬機器、讓多個 guest OS 共用實體資源的軟體層。",
   "ch": 11
  },
  {
   "id": "container",
   "zh": "容器",
   "en": "Container",
   "def": "共用 host kernel、以 namespaces 與 cgroups 隔離的一組行程。",
   "ch": 11
  },
  {
   "id": "namespace",
   "zh": "命名空間",
   "en": "Namespace",
   "def": "Linux 機制，讓行程看到隔離的 PID、網路、掛載點等資源視角。",
   "ch": 11
  },
  {
   "id": "cgroups",
   "zh": "控制群組",
   "en": "cgroups",
   "def": "Linux 機制，限制與統計一組行程的 CPU、記憶體、I/O 等資源使用量。",
   "ch": 11
  },
  {
   "id": "latency",
   "zh": "延遲",
   "en": "Latency",
   "def": "單一請求從開始到完成所花的時間。",
   "ch": 12
  },
  {
   "id": "throughput",
   "zh": "吞吐量",
   "en": "Throughput",
   "def": "單位時間內完成的工作量。",
   "ch": 12
  },
  {
   "id": "utilization",
   "zh": "使用率",
   "en": "Utilization",
   "def": "資源處於忙碌狀態的時間比例，ρ = λ / μ。",
   "ch": 12
  },
  {
   "id": "littles-law",
   "zh": "Little 定律",
   "en": "Little's Law",
   "def": "L = λW：系統中平均數量 = 到達率 × 平均停留時間。",
   "ch": 12
  },
  {
   "id": "tail-latency",
   "zh": "尾端延遲",
   "en": "Tail Latency",
   "def": "高百分位（p95、p99）的延遲，反映最慢那一群請求的體驗。",
   "ch": 12
  },
  {
   "id": "socket",
   "zh": "通訊端",
   "en": "Socket",
   "def": "行程進行網路通訊的端點，由核心網路堆疊管理。",
   "ch": 13
  },
  {
   "id": "event-loop",
   "zh": "事件迴圈",
   "en": "Event Loop",
   "def": "以單一執行緒等待多個 I/O 事件並分派處理的程式架構。",
   "ch": 13
  },
  {
   "id": "strace",
   "zh": "strace",
   "en": "strace",
   "def": "Linux 工具，追蹤行程的系統呼叫與訊號。",
   "ch": 14
  },
  {
   "id": "proc",
   "zh": "/proc 檔案系統",
   "en": "procfs",
   "def": "以檔案形式揭露核心與行程資訊的虛擬檔案系統，例如 /proc/<pid>/maps。",
   "ch": 14
  }
 ],
 "formulas": [
  {
   "group": "CPU 排程",
   "items": [
    {
     "name": "周轉時間",
     "tex": "<var>TAT</var> = <var>CT</var> − <var>AT</var>",
     "note": "CT 完成時刻、AT 到達時刻",
     "ch": 4
    },
    {
     "name": "等待時間",
     "tex": "<var>WT</var> = <var>TAT</var> − <var>BT</var>",
     "note": "BT 為 CPU burst；適用單次 burst、無 I/O 的模型",
     "ch": 4
    },
    {
     "name": "回應時間",
     "tex": "<var>RT</var> = <var>t</var><sub>首次執行</sub> − <var>AT</var>",
     "note": "第一次取得 CPU 的時刻減去到達時刻",
     "ch": 4
    },
    {
     "name": "平均等待時間",
     "tex": "<span class=\"frac\"><span>Σ <var>WT</var><sub><var>i</var></sub></span><span><var>n</var></span></span>",
     "note": "所有工作等待時間的平均",
     "ch": 4
    },
    {
     "name": "CPU 使用率",
     "tex": "<span class=\"frac\"><span>忙碌時間</span><span>總時間</span></span> × 100%",
     "note": "",
     "ch": 4
    }
   ]
  },
  {
   "group": "記憶體",
   "items": [
    {
     "name": "offset 位元數",
     "tex": "<var>k</var> = log<sub>2</sub>(page size)",
     "note": "4 KiB = 2<sup>12</sup> → 12 bits",
     "ch": 6
    },
    {
     "name": "VPN 與 offset",
     "tex": "<var>VPN</var> = ⌊<var>VA</var> / <var>P</var>⌋, &nbsp; offset = <var>VA</var> mod <var>P</var>",
     "note": "P 為頁面大小",
     "ch": 6
    },
    {
     "name": "實體位址",
     "tex": "<var>PA</var> = <var>PFN</var> × <var>P</var> + offset",
     "note": "offset 原封不動",
     "ch": 6
    },
    {
     "name": "頁表大小",
     "tex": "2<sup><var>v</var> − <var>k</var></sup> × PTE 大小",
     "note": "v 為虛擬位址位元數",
     "ch": 6
    },
    {
     "name": "TLB 有效存取時間",
     "tex": "<var>EAT</var> = <var>α</var>(<var>t</var> + <var>m</var>) + (1 − <var>α</var>)(<var>t</var> + 2<var>m</var>)",
     "note": "α 命中率、t TLB 查詢、m 記憶體存取（單層頁表）",
     "ch": 6
    },
    {
     "name": "含缺頁的存取時間",
     "tex": "<var>EAT</var> = (1 − <var>p</var>) × <var>m</var> + <var>p</var> × 缺頁處理時間",
     "note": "p 為缺頁率；p 很小也會大幅拉高平均",
     "ch": 7
    }
   ]
  },
  {
   "group": "並行與死結",
   "items": [
    {
     "name": "銀行家：剩餘需求",
     "tex": "<var>Need</var><sub><var>i</var></sub> = <var>Max</var><sub><var>i</var></sub> − <var>Allocation</var><sub><var>i</var></sub>",
     "note": "",
     "ch": 17
    },
    {
     "name": "銀行家：可前進條件",
     "tex": "<var>Need</var><sub><var>i</var></sub> ≤ <var>Work</var> &nbsp;⇒&nbsp; <var>Work</var> ← <var>Work</var> + <var>Allocation</var><sub><var>i</var></sub>",
     "note": "逐一比較每種資源",
     "ch": 17
    }
   ]
  },
  {
   "group": "儲存與 I/O",
   "items": [
    {
     "name": "讀寫頭總移動量",
     "tex": "Σ |<var>c</var><sub><var>i</var></sub> − <var>c</var><sub><var>i</var>−1</sub>|",
     "note": "依服務順序相鄰柱面的距離加總",
     "ch": 19
    },
    {
     "name": "磁碟存取時間",
     "tex": "<var>T</var> = 尋軌 + 旋轉延遲 + 傳輸",
     "note": "HDD；SSD 沒有前兩項",
     "ch": 19
    }
   ]
  },
  {
   "group": "效能",
   "items": [
    {
     "name": "Little's Law",
     "tex": "<var>L</var> = <var>λ</var> × <var>W</var>",
     "note": "L 平均數量、λ 到達率、W 平均停留時間",
     "ch": 12
    },
    {
     "name": "使用率",
     "tex": "<var>ρ</var> = <var>λ</var> / <var>μ</var>",
     "note": "μ 為服務率",
     "ch": 12
    },
    {
     "name": "M/M/1 平均回應時間",
     "tex": "<var>W</var> = <span class=\"frac\"><span>1</span><span><var>μ</var> − <var>λ</var></span></span> = <span class=\"frac\"><span>1/<var>μ</var></span><span>1 − <var>ρ</var></span></span>",
     "note": "ρ → 1 時延遲急遽上升",
     "ch": 12
    }
   ]
  },
  {
   "group": "行程與權限",
   "items": [
    {
     "name": "連續 fork",
     "tex": "n 次 fork() ⇒ 2<sup><var>n</var></sup> 個行程",
     "note": "含原本的父行程",
     "ch": 14
    },
    {
     "name": "Unix 權限八進位",
     "tex": "r = 4, &nbsp; w = 2, &nbsp; x = 1",
     "note": "例：rwxr-x--- = 750",
     "ch": 10
    }
   ]
  }
 ]
};
