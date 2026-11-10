/* DSA LAB 教材資料（由舊版單檔 index.html 拆出，章節文字與題目未更動；章節依單元排序，id 為舊版章節索引）。
 * 欄位對應：unit 單元（舊 tag）、short 副標題（舊 subtitle）、analogy ELI5 類比、caveat 比喻的極限（舊 limit）、
 * details 深入原理（舊 sections）、code [語言, 程式碼]、lab 實驗類型、quiz [題目, 選項, 正解索引, 提示, 解析]。
 * 提示為遷移時新增（舊版答錯即顯示解析，共用 shell 先給提示）。 */
window.DSA_DATA = {
 "units": [
  "硬體地基",
  "分析基礎",
  "線性結構",
  "演算法思維",
  "排序家族",
  "索引結構",
  "階層結構",
  "網路結構",
  "圖論進階",
  "演算法策略",
  "能力驗收"
 ],
 "lessons": [
  {
   "id": 0,
   "unit": "硬體地基",
   "title": "電腦怎麼放資料？",
   "short": "位元、位址、參照、連續空間與快取區域性",
   "analogy": "把 RAM 想成一排有門牌號碼的格子。資料結構是我們安排物品的方式；演算法是找、放、拿物品的程序。",
   "caveat": "真實記憶體是位元組定址且受虛擬記憶體管理；「一格一數字」只是抽象模型。",
   "details": [
    [
     "資料與位址",
     "CPU 能讀寫的是位元組（byte），每個可定址位置具有位址。變數名稱是給程式設計師看的，執行時會映射到暫存器或記憶體位置。資料型別決定解讀位元的方法。"
    ],
    [
     "連續與分散",
     "陣列通常需要連續的元素儲存空間，因此能以基底位址加上固定偏移直接存取。鏈結串列則靠指標連接不同位置的節點，較適合局部插入、卻不具直接的第 i 個元素存取。"
    ],
    [
     "CPU Cache 為何重要",
     "CPU 通常以快取行（cache line）取得多個相鄰位元組；連續走訪陣列通常具有良好的空間區域性，因此 Big-O 同為 O(n) 的兩種程式，實際效能仍可能差很多。"
    ]
   ],
   "code": [
    "C",
    "// C：觀察陣列元素地址間距\n#include <stdio.h>\nint main(void) {\n    int a[3] = {10, 20, 30};\n    for (int i = 0; i < 3; i++)\n        printf(\"%p: %d\\n\", (void*)&a[i], a[i]);\n}"
   ],
   "lab": "memory",
   "quiz": [
    [
     "陣列 a[i] 能直接定位元素，核心原因是？",
     [
      "元素預先排序",
      "元素有固定大小且連續排列",
      "所有元素都在 CPU 暫存器"
     ],
     1,
     "想想編譯器怎麼用基底位址算出第 i 格的位置：需要知道每格多大、格子之間有沒有空隙。",
     "以 base + i × sizeof(element) 計算位址。"
    ],
    [
     "為什麼陣列走訪常比鏈結串列快？",
     [
      "陣列永遠是 O(1)",
      "陣列通常具較好的記憶體區域性",
      "鏈結串列無法走訪"
     ],
     1,
     "兩者都要走 n 步；差別在 CPU 每次從記憶體搬進快取的是「一整段相鄰的位元組」。",
     "兩者順序走訪都是 O(n)，但快取效應不同。"
    ],
    [
     "指標儲存的主要資訊是？",
     [
      "某個位置的位址",
      "變數的中文名稱",
      "CPU 執行速度"
     ],
     0,
     "指標讓你「找到」另一個位置上的資料；它本身存的是什麼？",
     "指標值代表一個地址或特殊空值。"
    ]
   ]
  },
  {
   "id": 1,
   "unit": "分析基礎",
   "title": "如何衡量演算法？",
   "short": "Big-O、Ω、Θ、最壞與攤銷分析",
   "analogy": "走 10 步找門牌跟走 1 萬步不同。Big-O 關心的是「街道變長時，需要做的工作如何增加」，不只是碼表上的秒數。",
   "caveat": "Big-O 是漸近上界，不會告訴你常數因素、快取行為、資料分佈，也不等於所有情況都一定跑那麼久。",
   "details": [
    [
     "輸入規模與基本操作",
     "先定義 n 是什麼，再數關鍵步驟。單一迴圈常為 n 次、兩層各跑 n 次的巢狀迴圈常為 n² 次、每次折半的搜尋約 log₂n 次。"
    ],
    [
     "O、Ω 與 Θ",
     "O(g(n)) 表示漸近上界，Ω(g(n)) 為漸近下界；同時具上下界則為 Θ(g(n))。分析時要說清楚最壞、平均、最佳或攤銷情境。"
    ],
    [
     "時間換空間",
     "雜湊表常透過額外儲存空間換取平均 O(1) 查詢；排序後的陣列可做 O(log n) 二分搜尋，但維護排序本身也有成本。"
    ]
   ],
   "code": [
    "Python",
    "def contains_pair(nums, target):\n    seen = set()                     # O(n) 額外空間\n    for x in nums:                   # O(n) 次迴圈\n        if target - x in seen:       # 平均 O(1)\n            return True\n        seen.add(x)\n    return False"
   ],
   "lab": "complexity",
   "quiz": [
    [
     "兩個長度 n 的巢狀迴圈通常是？",
     [
      "O(n)",
      "O(n log n)",
      "O(n²)"
     ],
     2,
     "外層每跑一次，內層就跑滿 n 次；總次數是兩者相乘。",
     "n × n = n²。"
    ],
    [
     "將資料每次減半的迴圈通常需要？",
     [
      "O(log n)",
      "O(n²)",
      "O(2ⁿ)"
     ],
     0,
     "n 要折半幾次才會變成 1？想想 2 的幾次方等於 n。",
     "約 log₂n 次減半就縮到 1。"
    ],
    [
     "O(n) 一定比 O(n log n) 快嗎？",
     [
      "任何 n 都是",
      "只比較漸近成長率，不能忽略常數與輸入規模",
      "視 Python 版本而定"
     ],
     1,
     "Big-O 省略了常數與低次項；n 很小時，被省略的部分可能反而更重要。",
     "小 n 與不同常數因素可能改變實測結果。"
    ]
   ]
  },
  {
   "id": 2,
   "unit": "線性結構",
   "title": "陣列與字串",
   "short": "索引、插入成本、動態陣列、雙指標",
   "analogy": "陣列像編號整齊的置物櫃。第 7 格很好找；若要在中間多塞一格，後面很多格可能得往右搬。",
   "caveat": "Python list 是動態陣列而不是 C 的固定陣列；append() 的攤銷 O(1) 不代表每次都不用搬資料。",
   "details": [
    [
     "隨機存取 O(1)",
     "同型陣列的元素地址能直接算出，故索引讀取通常 O(1)；但找一個未知值則需要 O(n) 線性搜尋（若沒有額外索引）。"
    ],
    [
     "插入與刪除",
     "在陣列中間插入通常要位移後續元素，O(n)；末端 append 在動態陣列通常為攤銷 O(1)。擴容時需分配更大的連續區並複製資料。"
    ],
    [
     "雙指標與滑動視窗",
     "雙指標常用於已排序數列的兩數和；滑動視窗可維護連續區段狀態，避免每個區間重算，很多情況能從 O(n²) 優化到 O(n)。"
    ]
   ],
   "code": [
    "Python",
    "def two_sum_sorted(a, target):\n    left, right = 0, len(a) - 1\n    while left < right:\n        total = a[left] + a[right]\n        if total == target: return left, right\n        if total < target: left += 1\n        else: right -= 1\n    return None"
   ],
   "lab": "array",
   "quiz": [
    [
     "一般動態陣列中間插入成本為？",
     [
      "O(1)",
      "O(n)",
      "O(log n)"
     ],
     1,
     "在中間插入後，原本排在後面的每個元素都要往後挪一格。",
     "要位移後續元素。"
    ],
    [
     "Python list.append 平均攤銷複雜度？",
     [
      "O(1)",
      "O(n log n)",
      "O(n²)"
     ],
     0,
     "容量不夠時才整批搬家，而且每次擴成原本的倍數；把搬家成本平均攤到每次 append。",
     "幾何擴容攤銷大量追加。"
    ],
    [
     "雙指標 two-sum（向內逼近）通常需要哪個條件？",
     [
      "資料已排序",
      "必須是二元樹",
      "元素全部不同"
     ],
     0,
     "兩個指標從兩端往內移時，要靠什麼判斷該移左邊還是右邊？",
     "利用排序順序決定指標方向。"
    ]
   ]
  },
  {
   "id": 3,
   "unit": "線性結構",
   "title": "鏈結串列 Linked List",
   "short": "節點、指標、單向與雙向、插入刪除",
   "analogy": "像尋寶遊戲：每張紙條告訴你下一張紙條在哪裡。插一張只要更改連結，但要找第 100 張，通常只能一張張走。",
   "caveat": "「已知節點」插入 O(1) 與「先找到插入位置」O(n) 要分開計算；無法直接獲得某個索引節點。",
   "details": [
    [
     "節點由什麼構成",
     "典型單向鏈結串列節點含 value 與 next 指標；頭節點（head）是進入串列的入口，尾節點 next 指向 null。"
    ],
    [
     "指標重連順序",
     "在某節點 prev 後插入 new：先讓 new.next = prev.next，再令 prev.next = new。順序反了若沒有保留原 next，可能遺失後續串列。"
    ],
    [
     "取捨",
     "已知前驅節點的插入 O(1)；找第 i 個位置 O(n)，額外指標占記憶體，CPU cache locality 通常比陣列差。"
    ]
   ],
   "code": [
    "Python",
    "class Node:\n    def __init__(self, value, nxt=None):\n        self.value = value\n        self.next = nxt\n\nhead = Node(10, Node(20, Node(30)))\nnew = Node(15)\nnew.next = head.next\nhead.next = new"
   ],
   "lab": "linked",
   "quiz": [
    [
     "單向串列取得第 i 個節點通常是？",
     [
      "O(1)",
      "O(log n)",
      "O(n)"
     ],
     2,
     "串列節點不連續，沒有「基底 + 偏移」的公式；只能從 head 一步一步跟著 next。",
     "必須沿 next 走訪。"
    ],
    [
     "在已知 prev 節點之後插入新節點為？",
     [
      "O(1)",
      "O(n²)",
      "O(log n)"
     ],
     0,
     "已經站在 prev 上了，插入只需要改哪幾個指標？數量會不會隨 n 變大？",
     "只要改動固定數量的連結。"
    ],
    [
     "重接 next 指標時最怕什麼？",
     [
      "資料已排序",
      "遺失原本後繼節點的連結",
      "節點地址太小"
     ],
     1,
     "如果先把 prev.next 改掉，原本後面那一串還找得到嗎？",
     "更新前先保存或先連接原後繼。"
    ]
   ]
  },
  {
   "id": 4,
   "unit": "線性結構",
   "title": "堆疊、佇列與 Deque",
   "short": "LIFO、FIFO、括號驗證與單調結構",
   "analogy": "堆疊像盤子，一次拿最上面（LIFO）；佇列像排隊，先來先服務（FIFO）。限制操作順序，反而能保證某些演算法正確。",
   "caveat": "Python list.pop(0) 是 O(n)；若需真正 FIFO，應考慮 collections.deque。",
   "details": [
    [
     "Stack：後進先出",
     "push、pop、peek 一般是 O(1)。函式呼叫堆疊、Undo、括號配對、DFS 都會用到 LIFO 特性。"
    ],
    [
     "Queue：先進先出",
     "enqueue、dequeue 一般是 O(1)；BFS 透過佇列逐層擴張。固定容量的環形佇列可用 head/tail 與 modulo 管理位置。"
    ],
    [
     "單調堆疊",
     "利用遞增或遞減的堆疊維持候選元素，可以在線性時間求下一個更大元素；每個元素最多進出堆疊各一次。"
    ]
   ],
   "code": [
    "Python",
    "from collections import deque\n\ndef valid_parentheses(s):\n    stack = []\n    pair = {\")\": \"(\", \"]\": \"[\", \"}\": \"{\"}\n    for c in s:\n        if c in \"([{\": stack.append(c)\n        elif c in pair:\n            if not stack or stack.pop() != pair[c]:\n                return False\n    return not stack"
   ],
   "lab": "stack",
   "quiz": [
    [
     "BFS 常用哪個結構？",
     [
      "Stack",
      "Queue",
      "Heap"
     ],
     1,
     "BFS 要先處理「先發現」的節點，再處理後來才發現的節點。",
     "佇列維持逐層先後順序。"
    ],
    [
     "Stack 的出入規則是？",
     [
      "FIFO",
      "隨機",
      "LIFO"
     ],
     2,
     "想像一疊盤子：你拿走的是最先放上去的，還是最後放上去的？",
     "最後放入的先取出。"
    ],
    [
     "Python 中高效率隊首移除的常見工具？",
     [
      "collections.deque",
      "list.pop(0)",
      "str.join"
     ],
     0,
     "list.pop(0) 會讓後面所有元素往前挪；有沒有兩端都能 O(1) 操作的結構？",
     "deque.popleft 是 O(1)。"
    ]
   ]
  },
  {
   "id": 5,
   "unit": "演算法思維",
   "title": "遞迴與呼叫堆疊",
   "short": "Base Case、遞迴樹、分治與 Stack Overflow",
   "analogy": "解俄羅斯套娃：每個娃娃都交給更小的娃娃處理，直到最裡層不再分解，再一層層交回答案。",
   "caveat": "遞迴不是免費魔法：每次呼叫通常都需要 stack frame；Python 有遞迴深度限制，遞迴也不保證比迭代快。",
   "details": [
    [
     "兩個不可缺的部分",
     "Base case 終止條件，以及使問題規模逐步縮小的 recursive case。缺少其中之一，容易造成無窮呼叫。"
    ],
    [
     "從遞迴樹看複雜度",
     "樹狀分裂的遞迴可能生成大量重複子問題。斐波那契 naïve recursion 約為指數時間，加入 memoization 後可達 O(n)。"
    ],
    [
     "分治三步",
     "Divide 把大問題切小；Conquer 遞迴解子問題；Combine 合併結果。Merge Sort 正是典型 O(n log n) 的分治演算法。"
    ]
   ],
   "code": [
    "Python",
    "def factorial(n):\n    if n < 0: raise ValueError(\"n must be >= 0\")\n    if n <= 1: return 1  # base case\n    return n * factorial(n - 1)\n\nprint(factorial(4))  # 24"
   ],
   "lab": "recursion",
   "quiz": [
    [
     "沒有 base case 的遞迴最常導致？",
     [
      "自動提速",
      "無法停止的遞迴呼叫",
      "O(1) 記憶體"
     ],
     1,
     "遞迴每次都會再呼叫自己；是什麼條件讓它停下來？",
     "必須確保遞迴終止。"
    ],
    [
     "遞迴函式一般會使用哪種記憶體資源？",
     [
      "呼叫堆疊",
      "檔案系統",
      "網卡"
     ],
     0,
     "每一層呼叫都要記住自己的參數與返回位置，這些資訊放在哪裡？",
     "每次呼叫會建立相應的 stack frame（實作視語言而定）。"
    ],
    [
     "有重疊子問題的遞迴可用什麼避免重算？",
     [
      "隨機排序",
      "Memoization",
      "加深遞迴"
     ],
     1,
     "同一個子問題被算了很多次；能不能算一次就記下來？",
     "快取已算過的子問題答案。"
    ]
   ]
  },
  {
   "id": 6,
   "unit": "演算法思維",
   "title": "搜尋與二分搜尋",
   "short": "不變量、邊界、lower_bound、搜尋空間",
   "analogy": "猜 1 到 100 的數字，每次問「比 50 大嗎？」就能淘汰一半答案。關鍵不是猜得快，而是任何一步都不排除正確答案。",
   "caveat": "二分搜尋需要排序或單調性，不能直接對亂序陣列使用；off-by-one 的邊界錯誤非常常見。",
   "details": [
    [
     "線性 vs 二分",
     "線性搜尋在未知順序資料最壞 O(n)；二分搜尋在有序資料透過每次排除半個範圍，最壞 O(log n)。"
    ],
    [
     "迴圈不變量",
     "設定搜尋範圍 [lo, hi]（含端點），每次依比較結果保證：若答案存在，仍留在候選區間中。這是演算法正確性證明的核心。"
    ],
    [
     "邊界搜尋",
     "lower_bound 是第一個 >= target 的位置，可以處理重複數值。常採半開區間 [lo, hi)，避免邊界更新混亂。"
    ]
   ],
   "code": [
    "Python",
    "def binary_search(a, target):\n    lo, hi = 0, len(a) - 1\n    while lo <= hi:\n        mid = lo + (hi - lo) // 2\n        if a[mid] == target: return mid\n        if a[mid] < target: lo = mid + 1\n        else: hi = mid - 1\n    return -1"
   ],
   "lab": "search",
   "quiz": [
    [
     "Binary Search 的先決條件通常是？",
     [
      "陣列有序或判定函式具單調性",
      "資料是鏈結串列",
      "只能有奇數長度"
     ],
     0,
     "每次丟掉一半之前，你要確定「答案不可能在那一半」；什麼性質保證這件事？",
     "每次排除一半必須有正當依據。"
    ],
    [
     "在 1024 個有序元素中二分搜尋最多約幾輪？",
     [
      "10 至 11 輪",
      "512 輪",
      "1024 輪"
     ],
     0,
     "每輪剩一半：1024 → 512 → 256 → …，數一數要幾輪才剩 1 個。",
     "log₂1024=10；比較輪數隨命中與實作定義略異。"
    ],
    [
     "lo <= hi 的閉區間實作中，若 a[mid] < target，通常？",
     [
      "hi = mid",
      "lo = mid + 1",
      "lo = mid - 1"
     ],
     1,
     "a[mid] 已經比目標小，mid 本身還可能是答案嗎？它左邊的元素呢？",
     "排除 mid 與其左邊，因為它們都太小。"
    ]
   ]
  },
  {
   "id": 7,
   "unit": "排序家族",
   "title": "排序：比較與交換",
   "short": "Bubble、Selection、Insertion、穩定性",
   "analogy": "像整理手牌。插入排序每拿到一張就放進已排好的部分；泡沫排序反覆讓相鄰逆序的牌交換位置。",
   "caveat": "所有 O(n²) 排序在小資料上不一定慢；但當 n 變大，平方成長會迅速變得昂貴。",
   "details": [
    [
     "三種基本排序",
     "Bubble 反覆交換相鄰逆序；Selection 每輪找最小值放前方；Insertion 維持已排序前綴，把新元素插入正確位置。"
    ],
    [
     "最好與最壞",
     "Insertion 在幾乎排序好的資料接近 O(n)，逆序時 O(n²)；Selection 通常固定 O(n²) 比較次數，交換次數則較少。"
    ],
    [
     "穩定排序",
     "同鍵值元素的原始相對順序是否保留？這對「先依姓名排序，再依成績穩定排序」等多鍵排序很重要。"
    ]
   ],
   "code": [
    "Python",
    "def insertion_sort(a):\n    a = a[:]  # 不修改呼叫者的清單\n    for i in range(1, len(a)):\n        key, j = a[i], i - 1\n        while j >= 0 and a[j] > key:\n            a[j + 1] = a[j]\n            j -= 1\n        a[j + 1] = key\n    return a"
   ],
   "lab": "sort",
   "quiz": [
    [
     "Insertion Sort 對已排序資料的最好情況？",
     [
      "O(n)",
      "O(n²)",
      "O(log n)"
     ],
     0,
     "資料已經有序時，每個新取出的元素只要和左邊比一次，就知道不用移動。",
     "每個元素只需做常數次比較。"
    ],
    [
     "穩定排序是指？",
     [
      "記憶體永不超出",
      "相同鍵值元素保留原相對次序",
      "一定 O(n log n)"
     ],
     1,
     "兩位同學成績都是 90 分，排序後誰在前面？",
     "穩定性與時間複雜度無直接必然關係。"
    ],
    [
     "Selection Sort 的典型比較複雜度？",
     [
      "O(n log n)",
      "O(n²)",
      "O(1)"
     ],
     1,
     "每一輪都要掃完剩下的未排序區段才知道誰最小；輪數和每輪長度都跟 n 有關。",
     "每輪掃描未排序區段找最小值。"
    ]
   ]
  },
  {
   "id": 8,
   "unit": "排序家族",
   "title": "分治排序與比較下界",
   "short": "Merge Sort、Quick Sort、Partition",
   "analogy": "先把一副牌分成左右兩小堆，各自排好，再像兩條有序隊伍一樣合併；這就是 Merge Sort 的精髓。",
   "caveat": "Quick Sort 平均 O(n log n)，不適合直接說「保證 O(n log n)」；糟糕樞紐可落入 O(n²)。",
   "details": [
    [
     "Merge Sort",
     "每層合併需 O(n)，切分高度 O(log n)，所以總時間 Θ(n log n)，典型陣列實作還需要 O(n) 輔助空間。"
    ],
    [
     "Quick Sort",
     "選取 pivot，partition 成左右兩區，再遞迴排序。平均 O(n log n)，最差 O(n²)；隨機化或良好 pivot 策略可降低退化機率。"
    ],
    [
     "比較排序的下界",
     "只靠兩元素間比較的通用排序，可由決策樹推導最壞 Ω(n log n)；Counting Sort、Radix Sort 利用其他資料假設，可不受此比較模型下界限制。"
    ]
   ],
   "code": [
    "Python",
    "def merge_sort(a):\n    if len(a) <= 1: return a\n    mid = len(a) // 2\n    left = merge_sort(a[:mid])\n    right = merge_sort(a[mid:])\n    out = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            out.append(left[i]); i += 1\n        else:\n            out.append(right[j]); j += 1\n    return out + left[i:] + right[j:]"
   ],
   "lab": "dcsort",
   "quiz": [
    [
     "典型 Merge Sort 時間？",
     [
      "O(n log n)",
      "O(n²)",
      "O(log n)"
     ],
     0,
     "遞迴樹有幾層？每一層合併時，總共要處理多少個元素？",
     "每層合併 O(n)，共 O(log n) 層。"
    ],
    [
     "Quick Sort 最差情況可以到？",
     [
      "O(1)",
      "O(n²)",
      "O(log n)"
     ],
     1,
     "如果每次 pivot 都剛好選到最大或最小值，切出來的兩邊會長什麼樣子？",
     "極不平衡的 partition 導致平方時間。"
    ],
    [
     "比較排序的通用最壞下界？",
     [
      "Ω(log n)",
      "Ω(n log n)",
      "Ω(n²)"
     ],
     1,
     "n 個元素有 n! 種可能排列，每次比較最多把可能性分成兩半。",
     "決策樹至少要區分 n! 種排列。"
    ]
   ]
  },
  {
   "id": 9,
   "unit": "索引結構",
   "title": "雜湊表 Hash Table",
   "short": "Hash Function、碰撞、負載率與 Resize",
   "analogy": "像用姓名算出一個置物櫃號碼。不同人可能分到同一櫃，因此需要碰撞處理，櫃子太擠還得擴容。",
   "caveat": "雜湊查找平均 O(1) 依賴良好 hash 分散、負載率與碰撞處理；最壞仍可能 O(n)，而迭代順序不等於排序。",
   "details": [
    [
     "雜湊函式與桶",
     "h(key) 將鍵映射到表索引；若兩個鍵落同個 bucket 即 collision。碰撞不可避免，因為鍵空間通常遠大於桶數。"
    ],
    [
     "Chaining 與 Open Addressing",
     "分離鏈結法每桶放一串元素；開放定址在表內探測其他位置。刪除、resize、負載率 α 都會影響正確性與效率。"
    ],
    [
     "何時適合",
     "集合存在性檢查、去重、快取、頻率統計、Two Sum 都常適合 hash map；需要排序或區間搜尋時有序樹可能更有利。"
    ]
   ],
   "code": [
    "Python",
    "def counts(words):\n    freq = {}\n    for word in words:\n        freq[word] = freq.get(word, 0) + 1\n    return freq\n\nprint(counts([\"a\", \"b\", \"a\"]))"
   ],
   "lab": "hash",
   "quiz": [
    [
     "不同 key 得到相同 bucket 稱為？",
     [
      "Overflow",
      "Collision",
      "Deadlock"
     ],
     1,
     "兩把不同的鑰匙被分到同一個置物櫃，這個現象的專有名詞是什麼？",
     "雜湊碰撞需要額外策略處理。"
    ],
    [
     "Hash Table 查找通常的平均時間？",
     [
      "O(1)",
      "O(n²)",
      "O(log n)"
     ],
     0,
     "理想情況下，算出雜湊值就直接跳到對應的桶，幾乎不必和其他元素比較。",
     "前提是負載與碰撞處理合理。"
    ],
    [
     "當負載率太高，常採取什麼措施？",
     [
      "擴容與 rehash",
      "停止使用鍵值",
      "永不處理"
     ],
     0,
     "桶子太擠時，增加桶數會怎麼影響每個桶的平均長度？",
     "擴容降低每桶擁擠程度。"
    ]
   ]
  },
  {
   "id": 10,
   "unit": "階層結構",
   "title": "樹與二元搜尋樹",
   "short": "Root、Height、Traversal、BST Invariant",
   "analogy": "像組織圖，每個人可以有下屬。BST 額外規定：左邊的值較小、右邊的值較大，所以可以沿單一路徑找資料。",
   "caveat": "沒有平衡機制的 BST 遇到依序插入資料，會退化成鏈結串列，查找 O(n) 而非 O(log n)。",
   "details": [
    [
     "樹的關鍵術語",
     "Root 根、Parent 父、Child 子、Leaf 葉、Depth 深度、Height 高度；樹不存在環，節點數為 V 時邊數為 V−1（非空樹）。"
    ],
    [
     "BST 不變量",
     "每個節點左子樹中的值都小於它，右子樹都大於它（重複鍵另訂規則）。Inorder 遍歷可得到遞增結果。"
    ],
    [
     "平衡與退化",
     "Balanced BST 讓高度維持 O(log n)，因而搜尋、插入、刪除可維持 O(log n)。AVL 與 Red-Black Tree 是常見例子。"
    ]
   ],
   "code": [
    "Python",
    "class Node:\n    def __init__(self, v):\n        self.v, self.left, self.right = v, None, None\n\ndef search(root, key):\n    while root is not None:\n        if key == root.v: return True\n        root = root.left if key < root.v else root.right\n    return False"
   ],
   "lab": "bst",
   "quiz": [
    [
     "BST inorder 走訪通常產生？",
     [
      "隨機數列",
      "遞增排序",
      "反向層級排序"
     ],
     1,
     "inorder 的順序是「左子樹 → 根 → 右子樹」，而 BST 左邊都比根小、右邊都比根大。",
     "左 → 根 → 右。"
    ],
    [
     "不平衡 BST 最差搜尋可能是？",
     [
      "O(n)",
      "O(1)",
      "O(log log n)"
     ],
     0,
     "如果依序插入 1, 2, 3, 4, …，樹會長成什麼形狀？",
     "退化為一條長鏈時高度 O(n)。"
    ],
    [
     "一棵有 9 個節點的非空樹有幾條邊？",
     [
      "8",
      "9",
      "10"
     ],
     0,
     "樹連通且沒有環；除了根以外，每個節點恰好有一條邊連到父節點。",
     "樹的邊數 = 節點數 − 1。"
    ]
   ]
  },
  {
   "id": 11,
   "unit": "階層結構",
   "title": "堆積與優先佇列",
   "short": "Heap Property、Heapify、Top-K",
   "analogy": "急診掛號按緊急度叫號，並非單純排隊；Heap 能快速找出「目前最重要的那位」，不需要所有人完整排序。",
   "caveat": "二元堆積不是 BST，也不是整體有序陣列；只有父子之間維持 heap property。",
   "details": [
    [
     "二元堆積",
     "Max-Heap 父節點 ≥ 子節點；Min-Heap 父節點 ≤ 子節點。完全二元樹能緊密存在陣列中，索引 i 的孩子通常是 2i+1 和 2i+2。"
    ],
    [
     "操作複雜度",
     "peek 根 O(1)；insert / pop 根需上浮或下沉，O(log n)；對 n 個元素自底向上 heapify 可做到 O(n)。"
    ],
    [
     "實際用途",
     "排程、事件模擬、Dijkstra 的優先佇列、維持 Top-K、K-way merge 等都會用到 heap。"
    ]
   ],
   "code": [
    "Python",
    "import heapq\npq = []\nheapq.heappush(pq, (3, \"低優先\"))\nheapq.heappush(pq, (1, \"高優先\"))\nheapq.heappush(pq, (2, \"中優先\"))\nwhile pq:\n    print(heapq.heappop(pq))"
   ],
   "lab": "heap",
   "quiz": [
    [
     "Min Heap 的根保存？",
     [
      "最小值",
      "最大值",
      "中位數"
     ],
     0,
     "Min-Heap 的規則是父節點 ≤ 子節點；沿著規則一路往上，會到哪裡？",
     "根是整棵 Min-Heap 的最小值。"
    ],
    [
     "Heap 插入一般是？",
     [
      "O(1) 保證",
      "O(log n)",
      "O(n²)"
     ],
     1,
     "新元素放在最後一格，再和父節點比較、可能一路交換到根；完全二元樹的高度是多少？",
     "新節點可能一路上浮到根。"
    ],
    [
     "堆積陣列索引 i 的左孩子是？",
     [
      "i+1",
      "2i+1",
      "i//2"
     ],
     1,
     "0-based 陣列中，根在索引 0，它的兩個孩子在索引 1 和 2；代入 i = 0 檢查每個選項。",
     "採 0-based index。"
    ]
   ]
  },
  {
   "id": 12,
   "unit": "網路結構",
   "title": "圖的表示與遍歷",
   "short": "Adjacency List、BFS、DFS、連通性",
   "analogy": "城市是節點，道路是邊；BFS 像一圈圈擴大的漣漪，DFS 像先一路走到底再回頭找岔路。",
   "caveat": "BFS 在無權圖求「邊數最少」的路徑；有權重且權重不一時，不能直接當作最小總成本路徑。",
   "details": [
    [
     "Graph 的組成",
     "圖 G=(V,E) 包含 vertices 與 edges，可有向／無向、加權／無權。Adjacency List 空間通常為 O(V+E)，較適合稀疏圖。"
    ],
    [
     "BFS 與 DFS",
     "BFS 透過 Queue 按距離層級拜訪；DFS 透過 Stack/Recursion 深入後回溯。兩者用 adjacency list 都可做到 O(V+E)。"
    ],
    [
     "Visited 為何必要",
     "若圖有環而沒有 visited 判斷，遍歷可能無限反覆拜訪；visited 應在適當時機設定，避免重複入列。"
    ]
   ],
   "code": [
    "Python",
    "from collections import deque\ndef bfs(g, start):\n    q, seen, order = deque([start]), {start}, []\n    while q:\n        u = q.popleft()\n        order.append(u)\n        for v in g[u]:\n            if v not in seen:\n                seen.add(v); q.append(v)\n    return order"
   ],
   "lab": "graph",
   "quiz": [
    [
     "BFS 最常搭配？",
     [
      "Queue",
      "Heap only",
      "Binary Tree only"
     ],
     0,
     "BFS 先處理先發現的節點，這是哪一種先進先出的結構？",
     "FIFO 保證逐層走訪。"
    ],
    [
     "Adjacency List 做一次 BFS 的複雜度？",
     [
      "O(V+E)",
      "O(VE²)",
      "O(1)"
     ],
     0,
     "每個節點進出待訪結構一次，每條邊被檢查一次。",
     "每個節點與邊至多以常數次處理。"
    ],
    [
     "在無權圖求最少邊數路徑優先選？",
     [
      "BFS",
      "普通 Insertion Sort",
      "Quick Sort"
     ],
     0,
     "沒有權重時，「最短」就是邊數最少；哪一種走訪是按距離一層一層往外擴？",
     "BFS 按路徑長度（邊數）逐層探索。"
    ]
   ]
  },
  {
   "id": 13,
   "unit": "圖論進階",
   "title": "最短路徑演算法",
   "short": "Dijkstra、Relaxation、非負權重",
   "analogy": "導航系統先確定目前已知距離最近的城市，再嘗試經由它更新鄰居距離。每一次更新都叫做 relaxation。",
   "caveat": "標準 Dijkstra 假設邊權重非負；有負邊應考慮 Bellman–Ford 等演算法。",
   "details": [
    [
     "距離估計",
     "維護 dist[v]，起點 dist[start]=0，其餘為 ∞；探索邊 (u,v,w) 時若 dist[u]+w < dist[v]，就更新 dist[v]。"
    ],
    [
     "貪心的理由",
     "在非負邊權重前提下，從未確定的節點中挑目前距離最小者，可以確定其最短距離；用 Priority Queue 高效選擇候選節點。"
    ],
    [
     "常見複雜度",
     "以 Binary Heap 與 adjacency list，常見實作為 O((V+E)log V)（細節視 heap 與重複入列策略而定）。"
    ]
   ],
   "code": [
    "Python",
    "import heapq\ndef dijkstra(g, start):\n    dist = {v: float(\"inf\") for v in g}\n    dist[start] = 0\n    pq = [(0, start)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d != dist[u]: continue\n        for v, w in g[u]:\n            if d + w < dist[v]:\n                dist[v] = d + w\n                heapq.heappush(pq, (dist[v], v))\n    return dist"
   ],
   "lab": "dijkstra",
   "quiz": [
    [
     "Dijkstra 的典型邊權要求？",
     [
      "非負權重",
      "只能是 0",
      "必須是負權重"
     ],
     0,
     "Dijkstra 一旦確定某節點的距離就不再修改；什麼樣的邊會讓之後出現更短的繞路？",
     "負邊會破壞已確定節點距離的依據。"
    ],
    [
     "Relaxation 代表？",
     [
      "刪掉所有邊",
      "發現更短路徑並更新距離",
      "反轉圖的方向"
     ],
     1,
     "鬆弛時檢查 dist[u] + w 是否比 dist[v] 小；如果是，會做什麼？",
     "dist[v] 取更小值。"
    ],
    [
     "優先佇列幫忙做什麼？",
     [
      "取目前最小候選距離",
      "將邊反向",
      "求最大公因數"
     ],
     0,
     "每一輪都要找「目前距離最小、尚未確定」的節點。",
     "優先取目前估計距離最小者。"
    ]
   ]
  },
  {
   "id": 16,
   "unit": "圖論進階",
   "title": "Union-Find 與最小生成樹",
   "short": "Disjoint Set、Path Compression、Kruskal",
   "analogy": "把學生分成幾個朋友圈。Union 讓兩個圈子合併，Find 回答兩人是否屬於同一圈；每個人沿代表鏈回到圈子的代表。",
   "caveat": "Union-Find 適合合併與連通性查詢，不是求任意兩點的實際路徑；攤銷接近常數仍有數學條件。",
   "details": [
    [
     "Disjoint Set 核心操作",
     "Find(x) 回傳集合代表；Union(a,b) 合併兩集合。以 parent 陣列儲存森林，初始每個元素自己是根。"
    ],
    [
     "兩項優化",
     "Path Compression 路徑壓縮使 Find 經過的節點直接靠近根；Union by Size/Rank 避免樹過高。搭配使用可達攤銷 O(α(n))。"
    ],
    [
     "Kruskal MST",
     "把加權無向圖的邊由小到大排序，遇到連接不同集合的邊就選取並 Union；形成無環且總權重最小的生成樹（適用連通圖）。"
    ]
   ],
   "code": [
    "Python",
    "def find(parent, x):\n    if parent[x] != x:\n        parent[x] = find(parent, parent[x])\n    return parent[x]\n\ndef union(parent, a, b):\n    ra, rb = find(parent, a), find(parent, b)\n    if ra == rb: return False\n    parent[rb] = ra\n    return True"
   ],
   "lab": "union",
   "quiz": [
    [
     "Find(x) 會傳回？",
     [
      "集合代表",
      "元素數值必加一",
      "最短路徑長度"
     ],
     0,
     "Find 的用途是判斷兩個元素是否在同一個集合；它回傳什麼才能拿來比較？",
     "透過代表判斷是否同一集合。"
    ],
    [
     "路徑壓縮的目的是？",
     [
      "增加高度",
      "縮短後續 Find 路徑",
      "把圖改成有向"
     ],
     1,
     "Find 走過的節點如果直接改指向根，下次再查同一條路會怎樣？",
     "讓查找變得更快。"
    ],
    [
     "Kruskal 選邊時如何避免環？",
     [
      "檢查兩端是否已同集合",
      "只看最大權重",
      "每次都選同一點"
     ],
     0,
     "如果一條邊的兩端早就連通了，再加上這條邊會出現什麼？",
     "兩端若已同集合，加邊會形成環。"
    ]
   ]
  },
  {
   "id": 14,
   "unit": "演算法策略",
   "title": "貪心演算法",
   "short": "局部最優、交換論證、區間排程",
   "analogy": "你要在一天內參加最多場不重疊活動，挑「最早結束」的活動，會留最多時間給後面；但不是每個問題都能只看眼前。",
   "caveat": "「每一步選看起來最好」不保證全域最佳；必須有反例排除或交換論證。",
   "details": [
    [
     "Greedy Choice Property",
     "若某問題存在一個最佳解包含特定局部最優選擇，而且剩餘問題保留最優子結構，就可能使用貪心法。"
    ],
    [
     "區間排程",
     "要選最多個不重疊區間，把活動依結束時間排序，每次選第一個開始時間不早於上個結束時間的活動；可用交換論證證明。"
    ],
    [
     "常見失敗案例",
     "一般硬幣面額不一定適合貪心找最少硬幣數。面額 [1,3,4] 換 6，貪心 4+1+1 用 3 枚，最優為 3+3 用 2 枚。"
    ]
   ],
   "code": [
    "Python",
    "def max_activities(activities):\n    chosen, end = [], float(\"-inf\")\n    for start, finish in sorted(activities, key=lambda x:x[1]):\n        if start >= end:\n            chosen.append((start, finish))\n            end = finish\n    return chosen"
   ],
   "lab": "greedy",
   "quiz": [
    [
     "區間排程選最多活動，最常見的貪心依據？",
     [
      "最早開始",
      "最早結束",
      "最長活動"
     ],
     1,
     "選了一個活動之後，它越早結束，留給後面活動的時間就越多。",
     "最早結束能留下最多後續空間。"
    ],
    [
     "任何貪心策略都一定能得到全域最優？",
     [
      "一定",
      "不一定，需證明",
      "只要 Python 寫就會"
     ],
     1,
     "想想面額 [1,3,4] 換 6 元：每次都拿最大面額，會得到最少枚數嗎？",
     "局部最優需要正確性證明。"
    ],
    [
     "面額 [1,3,4] 換 6 的最少硬幣數？",
     [
      "2",
      "3",
      "4"
     ],
     0,
     "比較「先拿 4 再補 1 + 1」和「3 + 3」各用了幾枚。",
     "3+3 最優，展示盲目貪心的反例。"
    ]
   ]
  },
  {
   "id": 15,
   "unit": "演算法策略",
   "title": "動態規劃 Dynamic Programming",
   "short": "State、Transition、Memoization、Tabulation",
   "analogy": "爬樓梯每一步只能上 1 或 2 階，要到第 8 階的方法數，可由「到第 7 階」與「到第 6 階」的方法數相加，而不是每次重新數整棵可能性樹。",
   "caveat": "DP 不等於單純「用陣列」；重點在清楚定義狀態與轉移，並確認子問題重疊與最佳子結構。",
   "details": [
    [
     "四步推導",
     "① 定義 dp[i] 的物理意義；② 寫出轉移方程；③ 找 base cases；④ 決定計算順序、答案位置與空間壓縮可能性。"
    ],
    [
     "Memoization 與 Tabulation",
     "自頂向下 memoization 使用遞迴與快取；自底向上 tabulation 用正確拓撲順序填表。兩者可有相同複雜度，但堆疊空間不同。"
    ],
    [
     "0/1 Knapsack",
     "dp[i][w] 為考慮前 i 個物品、容量 w 的最大價值；第 i 個物品只可取或不取，轉移比較兩種選擇。"
    ]
   ],
   "code": [
    "Python",
    "def climb(n):\n    if n < 0: return 0\n    a, b = 1, 1           # dp[0], dp[1]\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b if n > 0 else a"
   ],
   "lab": "dp",
   "quiz": [
    [
     "DP 的核心通常包括？",
     [
      "重疊子問題與狀態轉移",
      "只能使用遞迴",
      "只適用於排序"
     ],
     0,
     "DP 的關鍵是定義狀態、寫出狀態之間的轉移，並重用重疊的子問題。",
     "明確定義 state/transition 是關鍵。"
    ],
    [
     "爬樓梯（每次 1 或 2 階）的轉移？",
     [
      "dp[n]=dp[n-1]+dp[n-2]",
      "dp[n]=n²",
      "dp[n]=2n"
     ],
     0,
     "到達第 n 階之前的最後一步只有兩種可能。",
     "最後一步不是從 n−1 就是 n−2 走來。"
    ],
    [
     "Memoization 是？",
     [
      "存下已算過的子問題答案",
      "強制先排序",
      "交換兩個指標"
     ],
     0,
     "Memo 的字根就是「備忘」：把什麼東西記下來？",
     "用空間避免重複工作。"
    ]
   ]
  },
  {
   "id": 17,
   "unit": "能力驗收",
   "title": "綜合實戰：選對資料結構",
   "short": "由限制條件推導設計、測試與取捨",
   "analogy": "工具箱裡有螺絲起子、板手和電鑽。不是最複雜的工具最厲害，而是理解問題限制，選對工具。",
   "caveat": "選型不是背最佳複雜度表：須一併考慮資料量、記憶體、更新比例、順序需求、最差情境與效能量測。",
   "details": [
    [
     "先定義操作分布",
     "頻繁索引選動態陣列；頻繁判斷集合成員選雜湊表；反覆取最小值選 Min-Heap；維持有序區間可考慮平衡樹。"
    ],
    [
     "先證明，再優化",
     "對每個演算法，寫出輸入、輸出、前提、不變量與終止條件；針對空集合、單元素、重複元素、負數、極大輸入建測試。"
    ],
    [
     "複雜度不只是一行 O",
     "分析時間、輔助空間、遞迴深度、是否穩定、是否就地修改與平均／最差差異；最後以實測 profiler 驗證瓶頸。"
    ]
   ],
   "code": [
    "Python",
    "def choose_tool(task):\n    # 僅為選型示意，不是可直接套用的通用系統\n    options = {\n        \"random_index\": \"dynamic array\",\n        \"membership\": \"hash set\",\n        \"take_min\": \"min heap\",\n        \"shortest_unweighted\": \"BFS\",\n        \"shortest_nonnegative\": \"Dijkstra\",\n    }\n    return options.get(task, \"analyze constraints first\")"
   ],
   "lab": "choose",
   "quiz": [
    [
     "頻繁取得最小優先權任務，應考慮？",
     [
      "Heap",
      "Linked List 從頭掃描",
      "字串串接"
     ],
     0,
     "需要反覆「取最小」：哪個結構的根永遠是最小值？",
     "Heap 的 peek O(1)、pop O(log n)。"
    ],
    [
     "無權圖求最少邊數路徑，通常選？",
     [
      "BFS",
      "Selection Sort",
      "Hashing only"
     ],
     0,
     "沒有權重時，哪一種走訪按邊數一層層往外擴？",
     "BFS 從近到遠逐層展開。"
    ],
    [
     "選型最先應了解什麼？",
     [
      "真正的操作需求與前提",
      "語言 logo",
      "程式碼行數"
     ],
     0,
     "選工具之前，要先知道你要用它做什麼、做幾次。",
     "從需求、限制與操作頻率推導選型。"
    ]
   ]
  }
 ]
};
