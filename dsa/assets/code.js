/* DSA 程式實作（CSLab.code，見 shared/cslab-code.js）：每章一題，用本章的資料結構或演算法解決一個真的要寫程式的問題。
 * 四種語言共用同一份 stdin / stdout 規格與測資；大型測資由固定種子產生，期望輸出由這裡的參考解計算（不是手寫答案）。
 * 時限是 C / C++ 的時限（JavaScript 1.5 倍、Python 3 倍）：大型測資刻意讓「暴力解」逾時，必須用本章的方法。 */
'use strict';
(function () {
  const add = p => CSLab.code.add(p);
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const T = (name, input, output, visible = false) => ({ name, input, output: String(output).replace(/\n*$/, '\n'), visible });
  const lines = a => a.join('\n');

  /* ---------- 第 1 章 記憶體：二維陣列的位址 ---------- */
  const addr = (B, S, C, i, j) => '0x' + (B + (i * C + j) * S).toString(16);
  function addrCase(name, B, S, R, C, qs, visible) {
    return T(name, `${B} ${S} ${R} ${C}\n${qs.length}\n${lines(qs.map(([i, j]) => `${i} ${j}`))}\n`, lines(qs.map(([i, j]) => addr(B, S, C, i, j))), visible);
  }
  add({
    id: 'dsa.memory.row-major-address', lesson: 0, title: '二維陣列的記憶體位址', timeLimitMs: 1000,
    statement: '二維陣列 A[R][C] 以「列優先（row-major）」連續存放：A[0][0], A[0][1], …, A[0][C−1], A[1][0], …。已知 A[0][0] 的位址是 B、每個元素佔 S 個位元組，回答 q 個查詢：A[i][j] 的位址是多少？',
    input: '第一行 B S R C（0 ≤ B < 2⁴⁰，S ∈ {1, 2, 4, 8}，1 ≤ R, C ≤ 1000）；第二行 q（1 ≤ q ≤ 1000）；接著 q 行，每行 i j（0 ≤ i < R，0 ≤ j < C）。',
    output: '每個查詢一行：位址的 16 進位，小寫、加上 0x 前綴，例如 0x1f40。',
    cases: () => {
      const r = rng(101), big = Array.from({ length: 1000 }, () => [ri(r, 0, 999), ri(r, 0, 999)]);
      return [
        addrCase('int[3][4]', 4096, 4, 3, 4, [[0, 0], [1, 2], [2, 3]], true),
        addrCase('double[2][5]', 8192, 8, 2, 5, [[0, 4], [1, 0]], true),
        addrCase('char 一列', 0, 1, 1, 10, [[0, 0], [0, 9]]),
        addrCase('一行多列', 1000, 2, 10, 1, [[9, 0], [5, 0]]),
        addrCase('大位址', 2 ** 39 + 12345, 8, 1000, 1000, big.slice(0, 50)),
        addrCase('1000 個查詢', 3735928559, 4, 1000, 1000, big)
      ];
    },
    starter: {
      cpp: '#include <cstdio>\n\nint main() {\n    long long B, S, R, C;\n    int q;\n    scanf("%lld %lld %lld %lld", &B, &S, &R, &C);\n    scanf("%d", &q);\n    while (q--) {\n        long long i, j;\n        scanf("%lld %lld", &i, &j);\n        long long address = 0; // TODO: A[i][j] 的位址\n        printf("0x%llx\\n", address);\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.read().split()\nB, S, R, C, q = map(int, data[:5])\nout = []\nfor k in range(q):\n    i, j = int(data[5 + 2 * k]), int(data[6 + 2 * k])\n    address = 0  # TODO: A[i][j] 的位址\n    out.append(hex(address))\nprint("\\n".join(out))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst [B, S, R, C, q] = d;\nconst out = [];\nfor (let k = 0; k < q; k++) {\n  const i = d[5 + 2 * k], j = d[6 + 2 * k];\n  const address = 0; // TODO: A[i][j] 的位址\n  out.push("0x" + address.toString(16));\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    long long B, S, R, C;\n    int q;\n    scanf("%lld %lld %lld %lld", &B, &S, &R, &C);\n    scanf("%d", &q);\n    while (q--) {\n        long long i, j;\n        scanf("%lld %lld", &i, &j);\n        long long address = 0; /* TODO: A[i][j] 的位址 */\n        printf("0x%llx\\n", address);\n    }\n    return 0;\n}\n'
    },
    hints: ['A[i][j] 前面有 i 整列（每列 C 個元素），再加上同一列前面的 j 個。', '位址 = B + (i × C + j) × S。B 可能超過 32 位元，要用 64 位元整數。'],
    explain: '列優先存放時，A[i][j] 是第 i × C + j 個元素（從 0 數起），所以位址是 B + (i·C + j)·S。這就是 C / C++ 二維陣列的實際排列方式，也是為什麼「一列一列」走訪比「一行一行」快：連續的位址會落在同一條快取線。',
    tags: ['row-major', 'address', 'pointer-arithmetic']
  });

  /* ---------- 第 2 章 複雜度：最大子陣列和 ---------- */
  function kadane(a) { let best = -Infinity, cur = 0; for (const x of a) { cur = Math.max(x, cur + x); best = Math.max(best, cur); } return best; }
  const msCase = (name, a, visible) => T(name, `${a.length}\n${a.join(' ')}\n`, kadane(a), visible);
  add({
    id: 'dsa.complexity.max-subarray', lesson: 1, title: '最大連續子陣列和', timeLimitMs: 1000,
    statement: '給一個整數陣列，找出「連續、至少一個元素」的子陣列，使元素總和最大，輸出這個最大總和。n 最多 200,000：O(n²) 會逾時，請想一個 O(n) 的方法。',
    input: '第一行 n（1 ≤ n ≤ 200000）；第二行 n 個整數，|aᵢ| ≤ 10⁹。',
    output: '一行：最大子陣列和（可能超出 32 位元整數）。',
    cases: () => {
      const r = rng(202), big = Array.from({ length: 200000 }, () => ri(r, -1e9, 1e9)), pos = Array.from({ length: 200000 }, () => ri(r, 0, 1e9));
      return [
        msCase('範例', [-2, 1, -3, 4, -1, 2, 1, -5, 4], true),
        msCase('全部是負數', [-8, -3, -6, -2, -5, -4], true),
        msCase('只有一個', [7]),
        msCase('全部是正數', [3, 1, 4, 1, 5, 9, 2, 6]),
        msCase('零與負數', [0, -1, 0, -2]),
        msCase('大型隨機（n = 200000）', big),
        msCase('大型全正（總和超過 32 位元）', pos)
      ];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n\n    long long best = a[0];\n    // TODO: O(n) 找最大子陣列和\n\n    cout << best << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn = int(data[0])\na = list(map(int, data[1:1 + n]))\n\nbest = a[0]\n# TODO: O(n) 找最大子陣列和\n\nprint(best)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], a = d.slice(1, 1 + n);\n\nlet best = a[0];\n// TODO: O(n) 找最大子陣列和\n\nconsole.log(best);\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    long long *a = malloc(sizeof(long long) * n);\n    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);\n\n    long long best = a[0];\n    /* TODO: O(n) 找最大子陣列和 */\n\n    printf("%lld\\n", best);\n    free(a);\n    return 0;\n}\n'
    },
    hints: ['以第 i 個元素「結尾」的最大子陣列，要嘛只有 aᵢ，要嘛是「以 i−1 結尾的最佳解」再接上 aᵢ。', 'cur = max(aᵢ, cur + aᵢ)，best = max(best, cur)。這是 Kadane 演算法，O(n) 時間、O(1) 空間。', '全部是負數時答案是最大的那個元素，不是 0。'],
    explain: '暴力法枚舉所有 (i, j) 是 O(n²)：n = 2×10⁵ 時約 2×10¹⁰ 次運算，遠超過時限。Kadane 演算法只掃一次：維持「以目前位置結尾的最大和」，前面累積是負的就丟掉重新開始。從 O(n²) 到 O(n)，n 大的時候就是「跑不完」和「一瞬間」的差別。',
    tags: ['Big-O', 'Kadane', 'dynamic-programming', 'O(n)']
  });

  /* ---------- 第 3 章 陣列：前綴和區間查詢 ---------- */
  function prefixAns(a, qs) { const p = [0]; for (const x of a) p.push(p[p.length - 1] + x); return lines(qs.map(([l, r]) => p[r] - p[l - 1])); }
  const psCase = (name, a, qs, visible) => T(name, `${a.length} ${qs.length}\n${a.join(' ')}\n${lines(qs.map(q => q.join(' ')))}\n`, prefixAns(a, qs), visible);
  add({
    id: 'dsa.array.prefix-sum', lesson: 2, title: '區間和查詢（前綴和）', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '給一個長度 n 的整數陣列與 q 個查詢，每個查詢問第 l 到第 r 個元素（從 1 數起、含兩端）的總和。n 與 q 都可能到 100,000：每次查詢都重新加總會逾時。',
    input: '第一行 n q（1 ≤ n, q ≤ 100000）；第二行 n 個整數，|aᵢ| ≤ 10⁹；接著 q 行，每行 l r（1 ≤ l ≤ r ≤ n）。',
    output: '每個查詢一行，輸出區間和（可能超出 32 位元整數）。',
    cases: () => {
      const r = rng(303), n = 100000, a = Array.from({ length: n }, () => ri(r, -1e9, 1e9));
      const qs = Array.from({ length: 100000 }, () => { const x = ri(r, 1, n), y = ri(r, 1, n); return [Math.min(x, y), Math.max(x, y)]; });
      const wide = Array.from({ length: 100000 }, () => [ri(r, 1, 10), ri(r, n - 10, n)]);
      return [
        psCase('範例', [3, -1, 4, 1, -5, 9], [[1, 3], [2, 5], [6, 6], [1, 6]], true),
        psCase('一個元素', [42], [[1, 1]], true),
        psCase('全部相同', Array(10).fill(7), [[1, 10], [3, 4], [10, 10]]),
        psCase('大型隨機查詢', a, qs),
        psCase('大型長區間查詢', a, wide)
      ];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n, q;\n    cin >> n >> q;\n    vector<long long> a(n + 1);\n    for (int i = 1; i <= n; i++) cin >> a[i];\n\n    // TODO: 先算前綴和，讓每個查詢 O(1)\n\n    while (q--) {\n        int l, r;\n        cin >> l >> r;\n        long long sum = 0;\n        cout << sum << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn, q = int(data[0]), int(data[1])\na = list(map(int, data[2:2 + n]))\n\n# TODO: 先算前綴和，讓每個查詢 O(1)\n\nout = []\npos = 2 + n\nfor _ in range(q):\n    l, r = int(data[pos]), int(data[pos + 1])\n    pos += 2\n    out.append(0)\nprint("\\n".join(map(str, out)))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], q = d[1];\nconst a = d.slice(2, 2 + n);\n\n// TODO: 先算前綴和，讓每個查詢 O(1)\n\nconst out = [];\nfor (let k = 0, pos = 2 + n; k < q; k++, pos += 2) {\n  const l = d[pos], r = d[pos + 1];\n  out.push(0);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int n, q;\n    scanf("%d %d", &n, &q);\n    long long *a = malloc(sizeof(long long) * (n + 1));\n    for (int i = 1; i <= n; i++) scanf("%lld", &a[i]);\n\n    /* TODO: 先算前綴和，讓每個查詢 O(1) */\n\n    while (q--) {\n        int l, r;\n        scanf("%d %d", &l, &r);\n        long long sum = 0;\n        printf("%lld\\n", sum);\n    }\n    free(a);\n    return 0;\n}\n'
    },
    hints: ['定義 P[0] = 0、P[i] = a₁ + … + aᵢ，只要 O(n) 算一次。', '第 l 到 r 的和 = P[r] − P[l−1]。', 'n 個 10⁹ 加起來會超過 32 位元：用 long long / 64 位元。輸出很多行時，C++ 用 "\\n" 而不是 endl。'],
    explain: '每次查詢都從 l 加到 r 是 O(n)，q 個查詢總共 O(nq) ≈ 10¹⁰。前綴和用 O(n) 的前處理換到 O(1) 的查詢，總時間 O(n + q)。這種「先花一點空間存中間結果」的技巧在二維前綴和、差分陣列、累積機率等地方都會再出現。',
    tags: ['array', 'prefix-sum', 'precomputation', 'O(1) query']
  });

  /* ---------- 第 4 章 鏈結串列：約瑟夫問題 ---------- */
  function josephus(n, k) { const next = Array.from({ length: n }, (_, i) => (i + 1) % n), out = []; let prev = n - 1; for (let left = n; left > 0; left--) { for (let s = 1; s < k; s++) prev = next[prev]; const cur = next[prev]; out.push(cur + 1); next[prev] = next[cur]; } return out.join(' '); }
  const jCase = (name, n, k, visible) => T(name, `${n} ${k}\n`, josephus(n, k), visible);
  add({
    id: 'dsa.linked.josephus', lesson: 3, title: '約瑟夫問題（環狀串列）', timeLimitMs: 1500,
    statement: 'n 個人編號 1 到 n 圍成一圈。從 1 號開始報數，報到 k 的人出列，下一個人再從 1 開始報數，直到所有人都出列。依序輸出出列的編號。用環狀鏈結串列模擬：刪掉一個節點只要改一個 next。',
    input: '一行 n k（1 ≤ n ≤ 2000，1 ≤ k ≤ 2000）。',
    output: '一行：依出列順序的 n 個編號，以空白分隔。',
    cases: () => [jCase('n = 7, k = 3', 7, 3, true), jCase('k = 1', 5, 1, true), jCase('只有一個人', 1, 4), jCase('k 比 n 大', 4, 10), jCase('n = 41, k = 3', 41, 3), jCase('大型', 2000, 1999), jCase('大型 k = 2', 2000, 2)],
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n, k;\n    cin >> n >> k;\n    vector<int> nxt(n);              // nxt[i]：第 i 個人（0 起算）後面是誰\n    for (int i = 0; i < n; i++) nxt[i] = (i + 1) % n;\n\n    // TODO: 從編號 1 開始報數，報到 k 的人出列（把他從環中拿掉）\n\n    cout << "\\n";\n    return 0;\n}\n',
      python: 'n, k = map(int, input().split())\nnxt = [(i + 1) % n for i in range(n)]  # nxt[i]：第 i 個人（0 起算）後面是誰\norder = []\n\n# TODO: 從編號 1 開始報數，報到 k 的人出列（把他從環中拿掉）\n\nprint(" ".join(map(str, order)))\n',
      javascript: 'const [n, k] = readInput().trim().split(/\\s+/).map(Number);\nconst nxt = Array.from({ length: n }, (_, i) => (i + 1) % n); // nxt[i]：第 i 個人（0 起算）後面是誰\nconst order = [];\n\n// TODO: 從編號 1 開始報數，報到 k 的人出列（把他從環中拿掉）\n\nconsole.log(order.join(" "));\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int n, k;\n    scanf("%d %d", &n, &k);\n    int *nxt = malloc(sizeof(int) * n);   /* nxt[i]：第 i 個人（0 起算）後面是誰 */\n    for (int i = 0; i < n; i++) nxt[i] = (i + 1) % n;\n\n    /* TODO: 從編號 1 開始報數，報到 k 的人出列（把他從環中拿掉） */\n\n    printf("\\n");\n    free(nxt);\n    return 0;\n}\n'
    },
    hints: ['記住「目前位置的前一個人」prev：一開始 prev 是最後一個人（n − 1），這樣第一個報數的就是 0 號。', '往前走 k − 1 步後，要出列的是 nxt[prev]；刪除它：nxt[prev] = nxt[nxt[prev]]。', '用陣列模擬鏈結串列（nxt 陣列當指標）是競賽與嵌入式系統常見的寫法。'],
    explain: '如果用陣列並真的把元素移掉，每次刪除要搬動後面的元素，是 O(n)；鏈結串列刪除只要改前一個節點的 next，O(1)。這題每出列一人要走 k − 1 步，總共 O(nk)。刪除時必須拿著「前一個節點」，這是單向鏈結串列最常見的細節。',
    tags: ['linked-list', 'circular-list', 'simulation']
  });

  /* ---------- 第 5 章 堆疊：括號配對 ---------- */
  function balanced(s) { const st = [], pair = { ')': '(', ']': '[', '}': '{' }; for (const ch of s) { if ('([{'.includes(ch)) st.push(ch); else if (st.pop() !== pair[ch]) return 'NO'; } return st.length ? 'NO' : 'YES'; }
  const brCase = (name, list, visible) => T(name, `${list.length}\n${lines(list)}\n`, lines(list.map(balanced)), visible);
  add({
    id: 'dsa.stack.brackets', lesson: 4, title: '括號配對', timeLimitMs: 1000,
    statement: '每個字串只由 ( ) [ ] { } 組成。判斷它是不是「配對正確」：每個左括號都有同種類的右括號關閉，而且順序正確（不能交錯，例如 ([)] 是錯的）。',
    input: '第一行 t（1 ≤ t ≤ 100）；接著 t 行，每行一個非空字串，長度 ≤ 100000，總長度 ≤ 200000。',
    output: '每個字串一行：配對正確輸出 YES，否則輸出 NO。',
    cases: () => {
      const r = rng(505), deep = '('.repeat(50000) + ')'.repeat(50000), mix = [];
      // 總長度（含最後補上的右括號）不超過 99999，加一個字元的變形也不會超過題目的 100000
      let s = ''; const st = [];
      while (s.length + st.length < 99998) { if (st.length && (r() < 0.5 || st.length > 5000)) s += { '(': ')', '[': ']', '{': '}' }[st.pop()]; else { const c = '([{'[ri(r, 0, 2)]; st.push(c); s += c; } }
      while (st.length) s += { '(': ')', '[': ']', '{': '}' }[st.pop()];
      mix.push(s, s.slice(0, -1) + (s.endsWith(')') ? ']' : ')'), s + '(');
      return [
        brCase('範例', ['()[]{}', '([{}])', '(]', '([)]', '(('], true),
        brCase('只有右括號', [')', ']]', '}{']),
        brCase('巢狀很深', [deep, deep.slice(1)]),
        brCase('大型隨機', mix)
      ];
    },
    starter: {
      cpp: '#include <iostream>\n#include <string>\n#include <stack>\nusing namespace std;\n\nint main() {\n    int t;\n    cin >> t;\n    while (t--) {\n        string s;\n        cin >> s;\n        bool ok = true;\n        // TODO: 用 stack<char> 檢查括號配對\n\n        cout << (ok ? "YES" : "NO") << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\nlines = sys.stdin.read().split()\nt = int(lines[0])\nout = []\nfor s in lines[1:1 + t]:\n    ok = True\n    # TODO: 用 list 當堆疊檢查括號配對\n    out.append("YES" if ok else "NO")\nprint("\\n".join(out))\n',
      javascript: 'const lines = readInput().trim().split(/\\s+/);\nconst t = Number(lines[0]);\nconst out = [];\nfor (const s of lines.slice(1, 1 + t)) {\n  let ok = true;\n  // TODO: 用陣列當堆疊檢查括號配對\n  out.push(ok ? "YES" : "NO");\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nstatic char s[100005], st[100005];\n\nint main(void) {\n    int t;\n    scanf("%d", &t);\n    while (t--) {\n        scanf("%100004s", s);\n        int top = 0, ok = 1;\n        /* TODO: 用陣列 st 當堆疊檢查括號配對 */\n\n        puts(ok ? "YES" : "NO");\n    }\n    return 0;\n}\n'
    },
    hints: ['遇到左括號就 push；遇到右括號，堆疊頂端必須是同種類的左括號，否則就錯。', '右括號出現時堆疊是空的 → 錯；全部讀完後堆疊還有東西 → 錯。'],
    explain: '最後打開的括號必須最先關閉：這正是「後進先出」。每個字元最多 push、pop 各一次，所以是 O(n)。編譯器檢查語法、瀏覽器解析 HTML 標籤、計算機處理運算式都是同樣的想法。',
    tags: ['stack', 'LIFO', 'parsing']
  });

  /* ---------- 第 6 章 遞迴：河內塔 ---------- */
  function hanoi(n) { const out = []; const go = (k, a, b, c) => { if (!k) return; go(k - 1, a, c, b); out.push(`${a} ${c}`); go(k - 1, b, a, c); }; go(n, 'A', 'B', 'C'); return `${out.length}\n${lines(out)}`; }
  add({
    id: 'dsa.recursion.hanoi', lesson: 5, title: '河內塔', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: 'A 柱上有 n 個圓盤，由上到下從小到大。每次只能移動最上面的一個圓盤到另一根柱子，而且大盤不能放在小盤上。用最少的步數把全部圓盤從 A 移到 C（B 是輔助柱），輸出步數與每一步。',
    input: '一行 n（1 ≤ n ≤ 15）。',
    output: '第一行是步數；接著每一步一行「來源 目的」，例如 A C。最少步數的移動方式是唯一的。',
    cases: () => [1, 2, 3, 4, 10, 15].map((n, i) => T(`n = ${n}`, `${n}\n`, hanoi(n), i < 2)),
    starter: {
      cpp: '#include <iostream>\nusing namespace std;\n\n// 把 k 個圓盤從 from 經由 via 移到 to\nvoid solve(int k, char from, char via, char to) {\n    if (k == 0) return;\n    // TODO: 三個步驟\n}\n\nint main() {\n    int n;\n    cin >> n;\n    cout << (1 << n) - 1 << "\\n";\n    solve(n, \'A\', \'B\', \'C\');\n    return 0;\n}\n',
      python: 'import sys\n\nmoves = []\n\ndef solve(k, frm, via, to):\n    """把 k 個圓盤從 frm 經由 via 移到 to"""\n    if k == 0:\n        return\n    # TODO: 三個步驟\n\nn = int(input())\nsolve(n, "A", "B", "C")\nprint(len(moves))\nprint("\\n".join(moves))\n',
      javascript: 'const n = Number(readInput().trim());\nconst moves = [];\n\n// 把 k 個圓盤從 from 經由 via 移到 to\nfunction solve(k, from, via, to) {\n  if (k === 0) return;\n  // TODO: 三個步驟\n}\n\nsolve(n, "A", "B", "C");\nconsole.log(moves.length);\nconsole.log(moves.join("\\n"));\n',
      c: '#include <stdio.h>\n\n/* 把 k 個圓盤從 from 經由 via 移到 to */\nvoid solve(int k, char from, char via, char to) {\n    if (k == 0) return;\n    /* TODO: 三個步驟 */\n}\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    printf("%d\\n", (1 << n) - 1);\n    solve(n, \'A\', \'B\', \'C\');\n    return 0;\n}\n'
    },
    hints: ['要移動最大的那個盤，上面 k − 1 個必須先全部放到輔助柱。', '三步：把 k − 1 個從 from 移到 via；把第 k 個從 from 移到 to；再把 k − 1 個從 via 移到 to。', 'n = 1 時只有一步。步數 T(n) = 2T(n−1) + 1 = 2ⁿ − 1。'],
    explain: '遞迴的關鍵是「相信」較小的問題已經會解：只要能把 k − 1 個盤移走，第 k 個就能直接放好。呼叫樹有 2ⁿ − 1 個節點，堆疊深度只有 n。注意 Python 有預設遞迴深度上限（約 1000），這題的深度很淺所以沒問題；遞迴很深的題目要改成迴圈或手動堆疊。',
    tags: ['recursion', 'divide-and-conquer', 'call-stack']
  });

  /* ---------- 第 7 章 搜尋：lower_bound 查詢 ---------- */
  function lowerBound(a, x) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; }
  const lbCase = (name, a, qs, visible) => T(name, `${a.length} ${qs.length}\n${a.join(' ')}\n${qs.join(' ')}\n`, lines(qs.map(x => lowerBound(a, x))), visible);
  add({
    id: 'dsa.search.lower-bound', lesson: 6, title: '第一個 ≥ x 的位置（lower bound）', timeLimitMs: 1500, outputBytes: 2 << 20,
    statement: '給一個由小到大排序（可能有重複）的陣列與 q 個查詢 x，對每個 x 輸出「第一個 ≥ x 的元素」的索引（從 0 數起）；如果所有元素都 < x，輸出 n。n 與 q 都可能到 200,000，請用二分搜尋。',
    input: '第一行 n q（1 ≤ n, q ≤ 200000）；第二行 n 個非遞減的整數；第三行 q 個整數 x。數值都在 32 位元整數範圍內。',
    output: '每個查詢一行，輸出索引。',
    cases: () => {
      const r = rng(707), a = []; let v = -1e9;
      for (let i = 0; i < 200000; i++) { v += ri(r, 0, 9000); a.push(v); }
      const qs = Array.from({ length: 200000 }, () => ri(r, -1e9 - 10, v + 10));
      return [
        lbCase('範例', [1, 3, 3, 5, 8], [3, 4, 0, 9, 8], true),
        lbCase('全部相同', [2, 2, 2, 2], [1, 2, 3], true),
        lbCase('一個元素', [10], [9, 10, 11]),
        lbCase('負數與邊界', [-2147483648, -5, 0, 2147483647], [-2147483648, -6, 1, 2147483647]),
        lbCase('大型（n = q = 200000）', a, qs)
      ];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n, q;\n    cin >> n >> q;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n    while (q--) {\n        long long x;\n        cin >> x;\n        int lo = 0, hi = n;   // 答案在 [lo, hi] 之間\n        // TODO: 二分搜尋第一個 >= x 的位置\n        cout << lo << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn, q = int(data[0]), int(data[1])\na = list(map(int, data[2:2 + n]))\nout = []\nfor x in map(int, data[2 + n:2 + n + q]):\n    lo, hi = 0, n   # 答案在 [lo, hi] 之間\n    # TODO: 二分搜尋第一個 >= x 的位置\n    out.append(lo)\nprint("\\n".join(map(str, out)))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], q = d[1];\nconst a = d.slice(2, 2 + n);\nconst out = [];\nfor (let k = 0; k < q; k++) {\n  const x = d[2 + n + k];\n  let lo = 0, hi = n; // 答案在 [lo, hi] 之間\n  // TODO: 二分搜尋第一個 >= x 的位置\n  out.push(lo);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int n, q;\n    scanf("%d %d", &n, &q);\n    long long *a = malloc(sizeof(long long) * n);\n    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);\n    while (q--) {\n        long long x;\n        scanf("%lld", &x);\n        int lo = 0, hi = n;   /* 答案在 [lo, hi] 之間 */\n        /* TODO: 二分搜尋第一個 >= x 的位置 */\n        printf("%d\\n", lo);\n    }\n    free(a);\n    return 0;\n}\n'
    },
    hints: ['維持不變量：答案一定在 [lo, hi]。lo = 0、hi = n（n 表示「找不到」）。', 'mid = (lo + hi) / 2：若 a[mid] < x，答案在 mid 右邊，lo = mid + 1；否則 mid 可能就是答案，hi = mid。lo == hi 時結束。', 'C++ 也可以直接用 std::lower_bound，但先自己寫一次。'],
    explain: '和「找到就回傳」的二分搜尋不同，lower bound 在重複元素中找最左邊的那一個，所以命中時不能停，要把 hi 縮到 mid 繼續找。用半開區間 [lo, hi) 的寫法，迴圈結束時 lo 就是答案，不會有 ±1 的錯誤。每個查詢 O(log n)，總共 O(q log n)。',
    tags: ['binary-search', 'lower-bound', 'loop-invariant']
  });

  /* ---------- 第 8 章 排序：氣泡排序的交換次數 ---------- */
  function bubble(a) { a = a.slice(); let swaps = 0; for (let i = 0; i < a.length; i++) for (let j = 0; j + 1 < a.length - i; j++) if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swaps++; } return `${swaps}\n${a.join(' ')}`; }
  const bCase = (name, a, visible) => T(name, `${a.length}\n${a.join(' ')}\n`, bubble(a), visible);
  add({
    id: 'dsa.sort.bubble-swaps', lesson: 7, title: '氣泡排序要交換幾次？', timeLimitMs: 1500,
    statement: '用氣泡排序把陣列由小到大排好：每一輪從左到右比較相鄰兩個元素，左邊比右邊大就交換。輸出總共交換了幾次，以及排序後的陣列。（相等的元素不交換。）',
    input: '第一行 n（1 ≤ n ≤ 2000）；第二行 n 個整數，|aᵢ| ≤ 10⁹。',
    output: '第一行：交換次數；第二行：排序後的陣列，以空白分隔。',
    cases: () => {
      const r = rng(808), rnd = Array.from({ length: 2000 }, () => ri(r, -1e9, 1e9)), dup = Array.from({ length: 2000 }, () => ri(r, 1, 5));
      return [bCase('範例', [5, 1, 4, 2, 8], true), bCase('已排序', [1, 2, 3, 4], true), bCase('反向', [5, 4, 3, 2, 1]), bCase('有重複', [3, 1, 3, 1, 2]), bCase('一個元素', [9]), bCase('大型反向', Array.from({ length: 2000 }, (_, i) => 2000 - i)), bCase('大型隨機', rnd), bCase('大型重複多', dup)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n\n    long long swaps = 0;\n    // TODO: 氣泡排序，每次交換就 swaps++\n\n    cout << swaps << "\\n";\n    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 < n ? " " : "\\n");\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.read().split()\nn = int(data[0])\na = list(map(int, data[1:1 + n]))\n\nswaps = 0\n# TODO: 氣泡排序，每次交換就 swaps += 1\n\nprint(swaps)\nprint(" ".join(map(str, a)))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], a = d.slice(1, 1 + n);\n\nlet swaps = 0;\n// TODO: 氣泡排序，每次交換就 swaps++\n\nconsole.log(swaps);\nconsole.log(a.join(" "));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int n;\n    static long long a[2005];\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);\n\n    long long swaps = 0;\n    /* TODO: 氣泡排序，每次交換就 swaps++ */\n\n    printf("%lld\\n", swaps);\n    for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 < n ? \' \' : \'\\n\');\n    return 0;\n}\n'
    },
    hints: ['外層跑 n 輪，內層比較 a[j] 與 a[j+1]；第 i 輪結束時最大的 i 個元素已經在最後面。', '只有 a[j] > a[j+1] 才交換（相等不換，所以氣泡排序是穩定的）。', '反向排列時交換次數是 n(n−1)/2，n = 2000 約 200 萬次，O(n²) 還來得及。'],
    explain: '氣泡排序每次交換恰好消除一個「逆序對」（前面比後面大的一對），所以交換次數 = 陣列的逆序對數。最壞 O(n²)：n = 2000 沒問題，但 n = 200,000 就要約 2×10¹⁰ 次——下一章會用合併排序在 O(n log n) 內算出同一個數字。',
    tags: ['bubble-sort', 'inversions', 'stable-sort', 'O(n²)']
  });

  /* ---------- 第 9 章 分治排序：逆序對（大型） ---------- */
  function inversions(a) {
    const b = a.slice(), tmp = new Array(a.length); let inv = 0;
    const sort = (lo, hi) => { if (hi - lo < 2) return; const m = (lo + hi) >> 1; sort(lo, m); sort(m, hi); let i = lo, j = m, k = lo; while (i < m && j < hi) { if (b[i] <= b[j]) tmp[k++] = b[i++]; else { inv += m - i; tmp[k++] = b[j++]; } } while (i < m) tmp[k++] = b[i++]; while (j < hi) tmp[k++] = b[j++]; for (k = lo; k < hi; k++) b[k] = tmp[k]; };
    sort(0, b.length); return inv;
  }
  const invCase = (name, a, visible) => T(name, `${a.length}\n${a.join(' ')}\n`, inversions(a), visible);
  add({
    id: 'dsa.dcsort.inversions', lesson: 8, title: '逆序對數（合併排序）', timeLimitMs: 1500,
    statement: '逆序對是一組 i < j 而且 aᵢ > aⱼ 的索引。計算陣列有多少個逆序對。n 最多 200,000：O(n²) 會逾時，請在合併排序的「合併」步驟順便計數。',
    input: '第一行 n（1 ≤ n ≤ 200000）；第二行 n 個整數，|aᵢ| ≤ 10⁹。',
    output: '一行：逆序對數（可能超出 32 位元整數）。',
    cases: () => {
      const r = rng(909), rnd = Array.from({ length: 200000 }, () => ri(r, -1e9, 1e9));
      return [invCase('範例', [2, 4, 1, 3, 5], true), invCase('反向', [5, 4, 3, 2, 1], true), invCase('有重複（相等不算）', [2, 2, 1, 1]), invCase('一個元素', [7]), invCase('大型反向（約 2×10¹⁰）', Array.from({ length: 200000 }, (_, i) => 200000 - i)), invCase('大型隨機', rnd)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<long long> a, tmp;\n\n// 排序 a[lo, hi)，回傳這一段裡的逆序對數\nlong long sortCount(int lo, int hi) {\n    if (hi - lo < 2) return 0;\n    int mid = (lo + hi) / 2;\n    long long inv = sortCount(lo, mid) + sortCount(mid, hi);\n    // TODO: 合併 a[lo, mid) 與 a[mid, hi)，同時計算跨兩半的逆序對\n    return inv;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    a.resize(n);\n    tmp.resize(n);\n    for (auto &x : a) cin >> x;\n    cout << sortCount(0, n) << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndef sort_count(a):\n    """排序 a，回傳 (排序後的串列, 逆序對數)"""\n    if len(a) < 2:\n        return a, 0\n    mid = len(a) // 2\n    left, x = sort_count(a[:mid])\n    right, y = sort_count(a[mid:])\n    merged, inv = [], x + y\n    # TODO: 合併 left 與 right，同時計算跨兩半的逆序對\n    return merged, inv\n\ndata = sys.stdin.buffer.read().split()\nn = int(data[0])\na = list(map(int, data[1:1 + n]))\nprint(sort_count(a)[1])\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], a = d.slice(1, 1 + n), tmp = new Array(n);\n\n// 排序 a[lo, hi)，回傳這一段裡的逆序對數\nfunction sortCount(lo, hi) {\n  if (hi - lo < 2) return 0;\n  const mid = (lo + hi) >> 1;\n  let inv = sortCount(lo, mid) + sortCount(mid, hi);\n  // TODO: 合併 a[lo, mid) 與 a[mid, hi)，同時計算跨兩半的逆序對\n  return inv;\n}\n\nconsole.log(sortCount(0, n));\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nlong long *a, *tmp;\n\n/* 排序 a[lo, hi)，回傳這一段裡的逆序對數 */\nlong long sort_count(int lo, int hi) {\n    if (hi - lo < 2) return 0;\n    int mid = (lo + hi) / 2;\n    long long inv = sort_count(lo, mid) + sort_count(mid, hi);\n    /* TODO: 合併 a[lo, mid) 與 a[mid, hi)，同時計算跨兩半的逆序對 */\n    return inv;\n}\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    a = malloc(sizeof(long long) * n);\n    tmp = malloc(sizeof(long long) * n);\n    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);\n    printf("%lld\\n", sort_count(0, n));\n    return 0;\n}\n'
    },
    hints: ['逆序對分成三種：兩個都在左半、兩個都在右半（遞迴算）、一個在左一個在右（合併時算）。', '合併時兩邊都已排好：當右邊的 b[j] 比左邊的 b[i] 小而先放下去時，左半剩下的 mid − i 個都比它大，各自和它形成逆序對。', '相等時先放左邊（用 <=），相等的元素不算逆序對。'],
    explain: '這是分治法的典型應用：T(n) = 2T(n/2) + O(n) = O(n log n)。合併兩個已排序的序列時，「右邊的元素越過了多少個左邊元素」一次就能算出來，不必一對一比較。反向排列有 n(n−1)/2 ≈ 2×10¹⁰ 個逆序對，答案要用 64 位元整數。',
    tags: ['merge-sort', 'divide-and-conquer', 'inversions', 'O(n log n)']
  });

  /* ---------- 第 10 章 雜湊表：兩數之和 ---------- */
  function twoSum(a, t) { const seen = new Map(); for (let j = 0; j < a.length; j++) { const need = t - a[j]; if (seen.has(need)) return `${seen.get(need)} ${j}`; if (!seen.has(a[j])) seen.set(a[j], j); } return '-1 -1'; }
  const tsCase = (name, a, t, visible) => T(name, `${a.length} ${t}\n${a.join(' ')}\n`, twoSum(a, t), visible);
  add({
    id: 'dsa.hash.two-sum', lesson: 9, title: '兩數之和', timeLimitMs: 1000,
    statement: '給一個整數陣列與目標值 T，找出兩個索引 i < j 使 aᵢ + aⱼ = T。可能有很多組：輸出 j 最小的那一組；j 相同時輸出 i 最小的。如果沒有，輸出 -1 -1。n 最多 200,000，請用雜湊表做到平均 O(n)。',
    input: '第一行 n T（2 ≤ n ≤ 200000，|T| ≤ 2×10⁹）；第二行 n 個整數，|aᵢ| ≤ 10⁹。',
    output: '一行：i j（從 0 數起），或 -1 -1。',
    cases: () => {
      // 大型測資全是偶數、T 是奇數：只有最後放進去的那個奇數能湊出 T
      const r = rng(1010), big = Array.from({ length: 200000 }, () => ri(r, 1, 5e8) * 2), none = big.slice(), late = big.slice();
      late[199999] = 999999999 - big[123456];
      return [tsCase('範例', [2, 7, 11, 15], 9, true), tsCase('有重複', [3, 3, 4, 2], 6, true), tsCase('j 最小優先', [1, 5, 4, 2, 3], 6), tsCase('負數', [-3, 4, 3, 90], 0), tsCase('沒有答案', [1, 2, 4, 8], 100), tsCase('大型沒有答案（總和是奇數）', none, 999999999), tsCase('大型答案在最後', late, 999999999)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    long long T;\n    cin >> n >> T;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n\n    unordered_map<long long, int> first;   // 值 → 第一次出現的索引\n    // TODO: 由左到右掃 j，查 T - a[j] 有沒有出現過\n\n    cout << "-1 -1\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn, T = int(data[0]), int(data[1])\na = list(map(int, data[2:2 + n]))\n\nfirst = {}   # 值 → 第一次出現的索引\n# TODO: 由左到右掃 j，查 T - a[j] 有沒有出現過\n\nprint(-1, -1)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], T = d[1], a = d.slice(2, 2 + n);\n\nconst first = new Map(); // 值 → 第一次出現的索引\nlet answer = "-1 -1";\n// TODO: 由左到右掃 j，查 T - a[j] 有沒有出現過\n\nconsole.log(answer);\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\n/* C 沒有內建雜湊表：這裡給一個開放定址（線性探測）的雜湊表骨架 */\n#define CAP (1 << 19)\nlong long keys[CAP];\nint vals[CAP], used[CAP];\n\nunsigned slot(long long k) { return (unsigned)(((unsigned long long)k * 11400714819323198485ull) >> 45) & (CAP - 1); }\nint find(long long k) {   /* 回傳索引，沒有就回傳 -1 */\n    for (unsigned h = slot(k); used[h]; h = (h + 1) & (CAP - 1)) if (keys[h] == k) return vals[h];\n    return -1;\n}\nvoid insert(long long k, int v) {   /* 已存在就不覆蓋（保留第一次出現） */\n    unsigned h = slot(k);\n    while (used[h]) { if (keys[h] == k) return; h = (h + 1) & (CAP - 1); }\n    used[h] = 1; keys[h] = k; vals[h] = v;\n}\n\nint main(void) {\n    int n;\n    long long T;\n    scanf("%d %lld", &n, &T);\n    long long *a = malloc(sizeof(long long) * n);\n    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);\n    /* TODO: 由左到右掃 j，查 T - a[j] 有沒有出現過 */\n    puts("-1 -1");\n    return 0;\n}\n'
    },
    hints: ['掃到 j 時，需要的另一個數是 T − aⱼ：它若在 j 之前出現過，就找到答案了。', '雜湊表存「值 → 第一次出現的索引」，這樣 i 自然最小；先查再插入，避免自己和自己配對。', '第一次找到時就輸出：那時的 j 一定最小。'],
    explain: '暴力法檢查所有配對是 O(n²)。雜湊表把「這個值出現過沒有」變成平均 O(1) 的查詢，整體平均 O(n)。代價是額外的記憶體，以及最壞情況（大量碰撞）可能退化成 O(n)；排序加雙指標是 O(n log n) 的另一種做法，但會失去原本的索引順序。',
    tags: ['hash-table', 'two-sum', 'O(1) lookup']
  });

  /* ---------- 第 11 章 二元搜尋樹：樹高與前序 ---------- */
  function bst(keys) {
    const L = [], R = [], K = []; let height = 0; const pre = [];
    keys.forEach((k, idx) => { K.push(k); L.push(-1); R.push(-1); if (!idx) { height = 1; return; } let cur = 0, d = 1; for (;;) { d++; if (k < K[cur]) { if (L[cur] < 0) { L[cur] = idx; break; } cur = L[cur]; } else { if (R[cur] < 0) { R[cur] = idx; break; } cur = R[cur]; } } height = Math.max(height, d); });
    const st = [0]; while (st.length) { const v = st.pop(); pre.push(K[v]); if (R[v] >= 0) st.push(R[v]); if (L[v] >= 0) st.push(L[v]); }
    return `${height}\n${pre.join(' ')}`;
  }
  const bstCase = (name, keys, visible) => T(name, `${keys.length}\n${keys.join(' ')}\n`, bst(keys), visible);
  add({
    id: 'dsa.bst.height-preorder', lesson: 10, title: '建 BST：樹高與前序走訪', timeLimitMs: 1000,
    statement: '依序把 n 個互不相同的整數插入一棵空的二元搜尋樹（不做平衡：比節點小往左、大往右）。輸出樹高（根到最深葉子的節點數）與前序走訪（根 → 左子樹 → 右子樹）。',
    input: '第一行 n（1 ≤ n ≤ 800）；第二行 n 個互不相同的整數，|kᵢ| ≤ 10⁹。',
    output: '第一行：樹高；第二行：前序走訪的結果，以空白分隔。',
    cases: () => {
      const r = rng(1111), set = new Set(); while (set.size < 800) set.add(ri(r, -1e9, 1e9));
      return [bstCase('範例', [50, 30, 70, 20, 40, 60, 80], true), bstCase('一個節點', [5], true), bstCase('一路向右', [1, 2, 3, 4, 5]), bstCase('一路向左', [9, 7, 5, 3]), bstCase('大型隨機', [...set]), bstCase('大型已排序（退化成鏈）', Array.from({ length: 800 }, (_, i) => i * 3))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nstruct Node {\n    long long key;\n    Node *left = nullptr, *right = nullptr;\n    Node(long long k) : key(k) {}\n};\n\nNode *insert(Node *root, long long key) {\n    // TODO: 插入並回傳（可能是新的）根\n    return root;\n}\nint height(Node *t) {\n    return 0; // TODO\n}\nvoid preorder(Node *t, vector<long long> &out) {\n    // TODO\n}\n\nint main() {\n    int n;\n    cin >> n;\n    Node *root = nullptr;\n    for (int i = 0; i < n; i++) {\n        long long k;\n        cin >> k;\n        root = insert(root, k);\n    }\n    vector<long long> out;\n    preorder(root, out);\n    cout << height(root) << "\\n";\n    for (size_t i = 0; i < out.size(); i++) cout << out[i] << (i + 1 < out.size() ? " " : "\\n");\n    return 0;\n}\n',
      python: 'import sys\nsys.setrecursionlimit(5000)\n\nclass Node:\n    def __init__(self, key):\n        self.key, self.left, self.right = key, None, None\n\ndef insert(root, key):\n    # TODO: 插入並回傳（可能是新的）根\n    return root\n\ndef height(t):\n    return 0  # TODO\n\ndef preorder(t, out):\n    pass  # TODO\n\ndata = sys.stdin.read().split()\nn = int(data[0])\nroot = None\nfor k in map(int, data[1:1 + n]):\n    root = insert(root, k)\nout = []\npreorder(root, out)\nprint(height(root))\nprint(" ".join(map(str, out)))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0];\n\nfunction insert(root, key) {\n  // TODO: 插入並回傳（可能是新的）根，節點可以是 { key, left, right }\n  return root;\n}\nfunction height(t) {\n  return 0; // TODO\n}\nfunction preorder(t, out) {\n  // TODO\n}\n\nlet root = null;\nfor (let i = 1; i <= n; i++) root = insert(root, d[i]);\nconst out = [];\npreorder(root, out);\nconsole.log(height(root));\nconsole.log(out.join(" "));\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node { long long key; struct Node *left, *right; } Node;\n\nNode *insert(Node *root, long long key) {\n    /* TODO: 插入並回傳（可能是新的）根 */\n    return root;\n}\nint height(Node *t) {\n    return 0; /* TODO */\n}\nvoid preorder(Node *t, int *first) {\n    /* TODO：輸出時第一個數前面不加空白 */\n}\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    Node *root = NULL;\n    for (int i = 0; i < n; i++) { long long k; scanf("%lld", &k); root = insert(root, k); }\n    printf("%d\\n", height(root));\n    int first = 1;\n    preorder(root, &first);\n    printf("\\n");\n    return 0;\n}\n'
    },
    hints: ['插入：空樹就建新節點；否則比根小往左子樹插、比根大往右子樹插。', '樹高 = 1 + max(左子樹高, 右子樹高)，空樹高 0。', '依已排序的順序插入，樹會退化成一條鏈，高度 = n：這就是為什麼實務上要用 AVL、紅黑樹等平衡樹。'],
    explain: 'BST 的操作時間取決於樹高 h：插入、搜尋都是 O(h)。隨機順序插入時 h 約為 O(log n)，但已排序的輸入會讓 h = n，所有操作退化成 O(n)。前序走訪先輸出根再走左右，用它可以把同一棵樹重建出來。',
    tags: ['BST', 'tree-height', 'preorder', 'recursion']
  });

  /* ---------- 第 12 章 堆積：合併石堆的最小代價 ---------- */
  function mergeCost(w) {
    const h = w.slice().sort((a, b) => a - b), q = []; let i = 0, j = 0, cost = 0;
    const take = () => (j >= q.length || (i < h.length && h[i] <= q[j])) ? h[i++] : q[j++];
    for (let k = 1; k < w.length; k++) { const s = take() + take(); cost += s; q.push(s); }
    return cost;
  }
  const mcCase = (name, w, visible) => T(name, `${w.length}\n${w.join(' ')}\n`, mergeCost(w), visible);
  add({
    id: 'dsa.heap.merge-piles', lesson: 11, title: '合併石堆（優先佇列）', timeLimitMs: 1000,
    statement: '有 n 堆石頭，重量分別是 w₁ … wₙ。每次可以把任意兩堆合併成一堆，代價是兩堆重量之和。一直合併到只剩一堆，求最小的總代價。',
    input: '第一行 n（1 ≤ n ≤ 100000）；第二行 n 個正整數，1 ≤ wᵢ ≤ 10000。',
    output: '一行：最小總代價（可能超出 32 位元整數）。n = 1 時是 0。',
    cases: () => {
      const r = rng(1212), big = Array.from({ length: 100000 }, () => ri(r, 1, 10000));
      return [mcCase('範例', [1, 2, 9], true), mcCase('四堆', [4, 3, 2, 6], true), mcCase('一堆', [8]), mcCase('全部相同', Array(8).fill(5)), mcCase('大型隨機', big), mcCase('大型全部最大', Array(100000).fill(10000))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <queue>\n#include <vector>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    priority_queue<long long, vector<long long>, greater<long long>> pq;  // 最小堆積\n    for (int i = 0; i < n; i++) {\n        long long w;\n        cin >> w;\n        pq.push(w);\n    }\n    long long cost = 0;\n    // TODO: 每次取出最輕的兩堆合併\n\n    cout << cost << "\\n";\n    return 0;\n}\n',
      python: 'import sys\nimport heapq\n\ndata = sys.stdin.buffer.read().split()\nn = int(data[0])\nh = list(map(int, data[1:1 + n]))\nheapq.heapify(h)   # 最小堆積\ncost = 0\n# TODO: 每次取出最輕的兩堆合併（heapq.heappop / heapq.heappush）\n\nprint(cost)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0];\n\n// JavaScript 沒有內建優先佇列：自己寫一個最小堆積\nconst heap = [];\nfunction push(x) {\n  heap.push(x);\n  // TODO: 往上調整（sift up）\n}\nfunction pop() {\n  const top = heap[0], last = heap.pop();\n  if (heap.length) {\n    heap[0] = last;\n    // TODO: 往下調整（sift down）\n  }\n  return top;\n}\n\nfor (let i = 1; i <= n; i++) push(d[i]);\nlet cost = 0;\n// TODO: 每次取出最輕的兩堆合併\n\nconsole.log(cost);\n',
      c: '#include <stdio.h>\n\n/* C 沒有內建優先佇列：自己寫一個最小堆積（陣列，索引從 1 開始） */\nlong long heap[100005];\nint size = 0;\n\nvoid push(long long x) {\n    heap[++size] = x;\n    /* TODO: 往上調整（sift up） */\n}\nlong long pop(void) {\n    long long top = heap[1];\n    heap[1] = heap[size--];\n    /* TODO: 往下調整（sift down） */\n    return top;\n}\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) { long long w; scanf("%lld", &w); push(w); }\n    long long cost = 0;\n    /* TODO: 每次取出最輕的兩堆合併 */\n    printf("%lld\\n", cost);\n    return 0;\n}\n'
    },
    hints: ['貪心：每次都合併目前最輕的兩堆。越早被合併的重量會被重複計算越多次，所以讓輕的先合併。', '用最小堆積：取出兩個最小值、把和放回去，各 O(log n)，共 n − 1 次。', '這和 Huffman 編碼建樹的過程完全相同。'],
    explain: '如果每次都排序找最小的兩個，是 O(n² log n)；堆積讓「取最小值」與「插入」都是 O(log n)，總時間 O(n log n)。正確性的直覺：最後的總代價等於每堆重量乘上它被合併的次數（在合併樹中的深度），讓最輕的放在最深處最划算——這正是 Huffman 編碼的證明。',
    tags: ['heap', 'priority-queue', 'greedy', 'Huffman']
  });

  /* ---------- 第 13 章 圖的遍歷：迷宮最短步數（BFS） ---------- */
  function maze(g) {
    const R = g.length, C = g[0].length, dist = g.map(row => Array(C).fill(-1)); let s = null;
    g.forEach((row, i) => [...row].forEach((ch, j) => { if (ch === 'S') s = [i, j]; }));
    const q = [s]; dist[s[0]][s[1]] = 0;
    for (let k = 0; k < q.length; k++) { const [i, j] = q[k]; if (g[i][j] === 'E') return dist[i][j]; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < R && b < C && g[a][b] !== '#' && dist[a][b] < 0) { dist[a][b] = dist[i][j] + 1; q.push([a, b]); } } }
    return -1;
  }
  const mzCase = (name, g, visible) => T(name, `${g.length} ${g[0].length}\n${lines(g)}\n`, maze(g), visible);
  function bigMaze(R, C, seed, wall) {
    const r = rng(seed), g = Array.from({ length: R }, () => Array.from({ length: C }, () => r() < wall ? '#' : '.'));
    g[0][0] = 'S'; g[R - 1][C - 1] = 'E'; return g.map(row => row.join(''));
  }
  function serpent(R, C) { return Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => i % 2 === 0 ? '.' : (i % 4 === 1 ? (j === C - 1 ? '.' : '#') : (j === 0 ? '.' : '#'))).join('')).map((row, i, all) => i === 0 ? 'S' + row.slice(1) : i === all.length - 1 ? row.slice(0, -1) + 'E' : row); }
  add({
    id: 'dsa.graph.maze-bfs', lesson: 12, title: '迷宮最短步數（BFS）', timeLimitMs: 1000,
    statement: '迷宮是 R × C 的格子：. 是路、# 是牆、S 是起點、E 是終點。每一步可以往上下左右走一格（不能穿牆、不能走出邊界）。求從 S 到 E 的最少步數；走不到輸出 -1。',
    input: '第一行 R C（1 ≤ R, C ≤ 500）；接著 R 行，每行 C 個字元。恰好有一個 S、一個 E。',
    output: '一行：最少步數，或 -1。',
    cases: () => [
      mzCase('範例', ['S.#.', '..#.', '#...', '##.E'], true),
      mzCase('走不到', ['S#.', '##.', '..E'], true),
      mzCase('一列', ['S...E']),
      mzCase('起點旁就是終點', ['SE']),
      mzCase('蛇形大迷宮', serpent(499, 500)),
      mzCase('大型隨機', bigMaze(500, 500, 1313, 0.28)),
      mzCase('大型空地', bigMaze(500, 500, 1314, 0))
    ],
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <string>\n#include <queue>\nusing namespace std;\n\nint main() {\n    int R, C;\n    cin >> R >> C;\n    vector<string> g(R);\n    for (auto &row : g) cin >> row;\n\n    vector<vector<int>> dist(R, vector<int>(C, -1));\n    queue<pair<int, int>> q;\n    // TODO: 找到 S，從它開始 BFS，第一次走到 E 時的距離就是答案\n\n    cout << -1 << "\\n";\n    return 0;\n}\n',
      python: 'import sys\nfrom collections import deque\n\ndata = sys.stdin.read().split()\nR, C = int(data[0]), int(data[1])\ng = data[2:2 + R]\n\ndist = [[-1] * C for _ in range(R)]\nq = deque()\n# TODO: 找到 S，從它開始 BFS，第一次走到 E 時的距離就是答案\n\nprint(-1)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst R = Number(d[0]), C = Number(d[1]);\nconst g = d.slice(2, 2 + R);\n\nconst dist = Array.from({ length: R }, () => new Array(C).fill(-1));\nconst q = []; // 用陣列加一個讀取索引 head 當佇列（shift() 是 O(n)）\nlet head = 0;\n// TODO: 找到 S，從它開始 BFS，第一次走到 E 時的距離就是答案\n\nconsole.log(-1);\n',
      c: '#include <stdio.h>\n\nchar g[505][505];\nint dist[505][505], qr[250005], qc[250005];\n\nint main(void) {\n    int R, C;\n    scanf("%d %d", &R, &C);\n    for (int i = 0; i < R; i++) scanf("%504s", g[i]);\n    for (int i = 0; i < R; i++) for (int j = 0; j < C; j++) dist[i][j] = -1;\n    int head = 0, tail = 0;\n    /* TODO: 找到 S，從它開始 BFS，第一次走到 E 時的距離就是答案 */\n    printf("-1\\n");\n    return 0;\n}\n'
    },
    hints: ['BFS 一層一層往外擴張：佇列裡的格子距離起點只會是 d 或 d + 1，所以第一次到達某格時就是最短距離。', '入佇列時就標記 dist（不是出佇列時），避免同一格被放進佇列很多次。', 'R × C 最多 25 萬格，每格只會進出佇列一次：O(RC)。'],
    explain: '在每條邊權重都相同的圖上，BFS 找到的就是最短路徑。DFS 也能判斷「走不走得到」，但它第一次找到的路不一定最短。網格本身就是圖：每一格是節點，相鄰的格子之間有邊，不必真的建出鄰接串列。',
    tags: ['BFS', 'grid-graph', 'shortest-path', 'queue']
  });

  /* ---------- 第 14 章 最短路徑：Dijkstra ---------- */
  function dijkstra(n, edges) {
    const adj = Array.from({ length: n + 1 }, () => []); edges.forEach(([u, v, w]) => adj[u].push([v, w]));
    const dist = Array(n + 1).fill(Infinity), heap = [[0, 1]]; dist[1] = 0;
    const push = x => { heap.push(x); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    while (heap.length) { const [d, u] = pop(); if (d > dist[u]) continue; for (const [v, w] of adj[u]) if (d + w < dist[v]) { dist[v] = d + w; push([dist[v], v]); } }
    return dist[n] === Infinity ? -1 : dist[n];
  }
  const djCase = (name, n, edges, visible) => T(name, `${n} ${edges.length}\n${lines(edges.map(e => e.join(' ')))}\n`, dijkstra(n, edges), visible);
  function bigGraph(n, m, seed) { const r = rng(seed), e = []; for (let i = 1; i < n; i++) e.push([i, i + 1, ri(r, 500, 1e6)]); while (e.length < m) e.push([ri(r, 1, n), ri(r, 1, n), ri(r, 0, 1e6)]); return e; }
  add({
    id: 'dsa.dijkstra.shortest-path', lesson: 13, title: '最短路徑（Dijkstra）', timeLimitMs: 1500,
    statement: '有向圖有 n 個節點（1 到 n）、m 條帶權重的有向邊，權重都 ≥ 0。求從節點 1 到節點 n 的最短距離；走不到輸出 -1。n 可能到 100,000：每次掃全部節點找最小值（O(n²)）會逾時，請用優先佇列。',
    input: '第一行 n m（2 ≤ n ≤ 100000，1 ≤ m ≤ 200000）；接著 m 行，每行 u v w，表示 u → v 權重 w（0 ≤ w ≤ 10⁶）。可能有重邊與自環。',
    output: '一行：最短距離（可能超出 32 位元整數），或 -1。',
    cases: () => [
      djCase('範例', 4, [[1, 2, 1], [2, 4, 5], [1, 3, 2], [3, 4, 1], [2, 3, 1]], true),
      djCase('走不到', 3, [[2, 3, 1], [3, 1, 1]], true),
      djCase('權重 0 與重邊', 3, [[1, 2, 0], [1, 2, 5], [2, 3, 0], [1, 3, 1]]),
      djCase('繞遠路比較近', 5, [[1, 5, 100], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1]]),
      djCase('大型（n = 100000）', 100000, bigGraph(100000, 200000, 1414)),
      djCase('大型長鏈（距離超過 32 位元）', 100000, bigGraph(100000, 100001, 1415).map(([u, v, w], i) => i < 99999 ? [u, v, 1e6] : [u, v, w]))
    ],
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <queue>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n, m;\n    cin >> n >> m;\n    vector<vector<pair<int, long long>>> adj(n + 1);\n    for (int i = 0; i < m; i++) {\n        int u, v;\n        long long w;\n        cin >> u >> v >> w;\n        adj[u].push_back({v, w});\n    }\n    const long long INF = 4e18;\n    vector<long long> dist(n + 1, INF);\n    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;  // (距離, 節點)\n    // TODO: Dijkstra\n\n    cout << (dist[n] == INF ? -1 : dist[n]) << "\\n";\n    return 0;\n}\n',
      python: 'import sys\nimport heapq\n\ndata = sys.stdin.buffer.read().split()\nn, m = int(data[0]), int(data[1])\nadj = [[] for _ in range(n + 1)]\nfor k in range(m):\n    u, v, w = int(data[2 + 3 * k]), int(data[3 + 3 * k]), int(data[4 + 3 * k])\n    adj[u].append((v, w))\n\nINF = float("inf")\ndist = [INF] * (n + 1)\npq = []   # (距離, 節點)\n# TODO: Dijkstra（heapq）\n\nprint(dist[n] if dist[n] != INF else -1)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], m = d[1];\nconst adj = Array.from({ length: n + 1 }, () => []);\nfor (let k = 0; k < m; k++) adj[d[2 + 3 * k]].push([d[3 + 3 * k], d[4 + 3 * k]]);\n\nconst dist = new Array(n + 1).fill(Infinity);\n// TODO: Dijkstra（需要自己寫最小堆積，元素是 [距離, 節點]）\n\nconsole.log(dist[n] === Infinity ? -1 : dist[n]);\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\n/* 鄰接串列（陣列版）：head[u] 是 u 的第一條邊，nxt[e] 是同一個起點的下一條邊 */\nint head[100005], nxt[200005], to[200005];\nlong long wt[200005], dist[100005];\n/* 最小堆積：存 (距離, 節點) */\nlong long hd[400005]; int hv[400005], hs = 0;\n\nint main(void) {\n    int n, m;\n    scanf("%d %d", &n, &m);\n    for (int i = 1; i <= n; i++) head[i] = -1;\n    for (int e = 0; e < m; e++) {\n        int u, v; long long w;\n        scanf("%d %d %lld", &u, &v, &w);\n        to[e] = v; wt[e] = w; nxt[e] = head[u]; head[u] = e;\n    }\n    /* TODO: Dijkstra */\n    printf("-1\\n");\n    return 0;\n}\n'
    },
    hints: ['dist[1] = 0，把 (0, 1) 放進最小堆積。每次取出距離最小的節點 u，嘗試用 u 的每條邊放鬆鄰居。', '堆積裡可能有同一個節點的舊距離：取出時若 d > dist[u] 就跳過（lazy deletion）。', '距離可能到 10⁶ × 10⁵ = 10¹¹，要用 64 位元整數。'],
    explain: 'Dijkstra 的貪心性質：權重非負時，目前距離最小、還沒確定的節點，它的距離已經不可能再變小。用二元堆積取最小值，總時間 O((n + m) log n)；陣列版每次線性找最小是 O(n²)，n = 10⁵ 時約 10¹⁰。有負權重時這個貪心會失效，要改用 Bellman-Ford。',
    tags: ['Dijkstra', 'priority-queue', 'shortest-path', 'greedy']
  });

  /* ---------- 第 15 章 貪心：活動選擇 ---------- */
  function activities(iv) { const s = iv.slice().sort((a, b) => a[1] - b[1]); let end = -Infinity, c = 0; for (const [a, b] of s) if (a >= end) { c++; end = b; } return c; }
  const actCase = (name, iv, visible) => T(name, `${iv.length}\n${lines(iv.map(x => x.join(' ')))}\n`, activities(iv), visible);
  add({
    id: 'dsa.greedy.activity-selection', lesson: 14, title: '活動選擇', timeLimitMs: 1000,
    statement: '有 n 個活動，第 i 個活動佔用時間 [sᵢ, eᵢ)（開始時間包含、結束時間不包含）。同一時間只能參加一個活動，最多能參加幾個？一個活動結束的同時，下一個活動可以開始。',
    input: '第一行 n（1 ≤ n ≤ 200000）；接著 n 行，每行 sᵢ eᵢ（0 ≤ sᵢ < eᵢ ≤ 10⁹）。',
    output: '一行：最多可參加的活動數。',
    cases: () => {
      const r = rng(1515), big = Array.from({ length: 200000 }, () => { const s = ri(r, 0, 1e9 - 1); return [s, Math.min(1e9, s + ri(r, 1, 2e6))]; });
      return [actCase('範例', [[1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9], [6, 10], [8, 11], [8, 12], [2, 14], [12, 16]], true), actCase('首尾相接', [[1, 2], [2, 3], [3, 4]], true), actCase('全部重疊', [[0, 10], [1, 9], [2, 8]]), actCase('一個', [[5, 6]]), actCase('短的不一定先開始', [[0, 100], [1, 2], [3, 4], [99, 101]]), actCase('大型隨機', big)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<pair<long long, long long>> act(n);   // (開始, 結束)\n    for (auto &[s, e] : act) cin >> s >> e;\n\n    int count = 0;\n    // TODO: 依某個規則排序，再由前往後挑\n\n    cout << count << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn = int(data[0])\nact = [(int(data[1 + 2 * i]), int(data[2 + 2 * i])) for i in range(n)]   # (開始, 結束)\n\ncount = 0\n# TODO: 依某個規則排序，再由前往後挑\n\nprint(count)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0];\nconst act = Array.from({ length: n }, (_, i) => [d[1 + 2 * i], d[2 + 2 * i]]); // [開始, 結束]\n\nlet count = 0;\n// TODO: 依某個規則排序，再由前往後挑\n\nconsole.log(count);\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct { long long s, e; } Act;\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    Act *a = malloc(sizeof(Act) * n);\n    for (int i = 0; i < n; i++) scanf("%lld %lld", &a[i].s, &a[i].e);\n    int count = 0;\n    /* TODO: 用 qsort 依某個規則排序，再由前往後挑 */\n    printf("%d\\n", count);\n    return 0;\n}\n'
    },
    hints: ['試試看幾種貪心規則：最早開始？最短？最早結束？用「短的不一定先開始」那筆測資想想看哪個會失敗。', '依結束時間排序，每次選「開始時間 ≥ 上一個選的結束時間」的活動。', '排序 O(n log n)，挑選 O(n)。'],
    explain: '最早結束的活動留給後面的時間最多，所以選它不會比任何最佳解差（交換論證：把最佳解的第一個活動換成最早結束的，仍然合法而且數量不變）。「最早開始」與「最短」都有反例。貪心演算法正確與否一定要證明，不能只憑直覺。',
    tags: ['greedy', 'interval-scheduling', 'exchange-argument', 'sorting']
  });

  /* ---------- 第 16 章 動態規劃：0/1 背包 ---------- */
  function knap(W, items) { const dp = new Array(W + 1).fill(0); for (const [w, v] of items) for (let c = W; c >= w; c--) dp[c] = Math.max(dp[c], dp[c - w] + v); return dp[W]; }
  const kCase = (name, W, items, visible) => T(name, `${items.length} ${W}\n${lines(items.map(x => x.join(' ')))}\n`, knap(W, items), visible);
  add({
    id: 'dsa.dp.knapsack', lesson: 15, title: '0/1 背包', timeLimitMs: 1000,
    statement: '有 n 件物品，第 i 件重 wᵢ、價值 vᵢ；背包最多裝重量 W。每件物品最多選一次，在總重不超過 W 的前提下，最大的總價值是多少？',
    input: '第一行 n W（1 ≤ n ≤ 100，1 ≤ W ≤ 10000）；接著 n 行，每行 wᵢ vᵢ（1 ≤ wᵢ ≤ 10000，0 ≤ vᵢ ≤ 10⁶）。',
    output: '一行：最大總價值。',
    cases: () => {
      const r = rng(1616), big = Array.from({ length: 100 }, () => [ri(r, 1, 3000), ri(r, 0, 1e6)]);
      return [kCase('範例', 10, [[5, 10], [4, 40], [6, 30], [3, 50]], true), kCase('全部裝得下', 100, [[1, 1], [2, 2], [3, 3]], true), kCase('都太重', 3, [[4, 10], [5, 20]]), kCase('貪心會錯', 50, [[10, 60], [20, 100], [30, 120]]), kCase('大型', 10000, big), kCase('大型重量相近', 10000, Array.from({ length: 100 }, (_, i) => [200 + (i % 7), 1000 + i]))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    int n, W;\n    cin >> n >> W;\n    vector<int> w(n);\n    vector<long long> v(n);\n    for (int i = 0; i < n; i++) cin >> w[i] >> v[i];\n\n    vector<long long> dp(W + 1, 0);   // dp[c]：容量 c 時的最大價值\n    // TODO: 逐一考慮每件物品\n\n    cout << dp[W] << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.read().split()\nn, W = int(data[0]), int(data[1])\nitems = [(int(data[2 + 2 * i]), int(data[3 + 2 * i])) for i in range(n)]\n\ndp = [0] * (W + 1)   # dp[c]：容量 c 時的最大價值\n# TODO: 逐一考慮每件物品\n\nprint(dp[W])\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], W = d[1];\nconst items = Array.from({ length: n }, (_, i) => [d[2 + 2 * i], d[3 + 2 * i]]);\n\nconst dp = new Array(W + 1).fill(0); // dp[c]：容量 c 時的最大價值\n// TODO: 逐一考慮每件物品\n\nconsole.log(dp[W]);\n',
      c: '#include <stdio.h>\n\nlong long dp[10005];   /* dp[c]：容量 c 時的最大價值 */\n\nint main(void) {\n    int n, W;\n    scanf("%d %d", &n, &W);\n    for (int i = 0; i < n; i++) {\n        int w; long long v;\n        scanf("%d %lld", &w, &v);\n        /* TODO: 用這件物品更新 dp */\n    }\n    printf("%lld\\n", dp[W]);\n    return 0;\n}\n'
    },
    hints: ['狀態：dp[c] = 只考慮目前看過的物品、容量 c 時的最大價值。', '加入一件物品 (w, v)：dp[c] = max(dp[c], dp[c − w] + v)。', 'c 要從大到小更新，否則同一件物品會被重複放進去（那是「無限背包」）。'],
    explain: '暴力枚舉所有子集合是 2ⁿ。動態規劃把問題拆成重疊的子問題：每件物品「選或不選」，只要記住每個容量的最佳值，O(nW) 就能算完。「貪心會錯」那筆測資顯示按價值重量比挑選不一定最好。注意 O(nW) 是「偽多項式」：W 變成 10⁹ 時就不能這樣做了。',
    tags: ['dynamic-programming', '0/1-knapsack', 'optimal-substructure']
  });

  /* ---------- 第 17 章 Union-Find：最小生成樹 ---------- */
  function mst(n, edges) {
    const p = Array.from({ length: n + 1 }, (_, i) => i), find = x => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    let total = 0, used = 0;
    for (const [u, v, w] of edges.slice().sort((a, b) => a[2] - b[2])) { const a = find(u), b = find(v); if (a !== b) { p[a] = b; total += w; used++; } }
    return used === n - 1 ? total : -1;
  }
  const mstCase = (name, n, edges, visible) => T(name, `${n} ${edges.length}\n${lines(edges.map(e => e.join(' ')))}\n`, mst(n, edges), visible);
  add({
    id: 'dsa.union.mst-kruskal', lesson: 16, title: '最小生成樹（Kruskal + Union-Find）', timeLimitMs: 1500,
    statement: '無向圖有 n 個節點、m 條帶權重的邊。選出一些邊把所有節點連通，而且總權重最小（最小生成樹），輸出總權重；如果圖本身不連通，輸出 -1。',
    input: '第一行 n m（1 ≤ n ≤ 100000，0 ≤ m ≤ 200000）；接著 m 行，每行 u v w（1 ≤ u, v ≤ n，0 ≤ w ≤ 10⁶）。可能有重邊與自環。',
    output: '一行：最小生成樹的總權重（可能超出 32 位元整數），或 -1。',
    cases: () => {
      const r = rng(1717), big = []; for (let i = 2; i <= 100000; i++) big.push([i, ri(r, 1, i - 1), ri(r, 0, 1e6)]); while (big.length < 200000) big.push([ri(r, 1, 100000), ri(r, 1, 100000), ri(r, 0, 1e6)]);
      return [mstCase('範例', 4, [[1, 2, 1], [2, 3, 4], [1, 3, 3], [3, 4, 2], [2, 4, 5]], true), mstCase('不連通', 4, [[1, 2, 1], [3, 4, 1]], true), mstCase('只有一個節點', 1, []), mstCase('重邊與自環', 3, [[1, 1, 0], [1, 2, 9], [1, 2, 2], [2, 3, 3], [3, 1, 7]]), mstCase('大型', 100000, big), mstCase('大型差一個節點不連通', 100001, big)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <array>\n#include <algorithm>\nusing namespace std;\n\nvector<int> parent;\nint find(int x) {\n    // TODO: 找代表元素（加上路徑壓縮）\n    return x;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n, m;\n    cin >> n >> m;\n    vector<array<long long, 3>> edges(m);   // {w, u, v}\n    for (auto &e : edges) cin >> e[1] >> e[2] >> e[0];\n    parent.resize(n + 1);\n    for (int i = 0; i <= n; i++) parent[i] = i;\n\n    long long total = 0;\n    int used = 0;\n    // TODO: Kruskal：由輕到重考慮每條邊\n\n    cout << (used == n - 1 ? total : -1) << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn, m = int(data[0]), int(data[1])\nedges = [(int(data[4 + 3 * k]), int(data[2 + 3 * k]), int(data[3 + 3 * k])) for k in range(m)]   # (w, u, v)\nparent = list(range(n + 1))\n\ndef find(x):\n    # TODO: 找代表元素（加上路徑壓縮；用迴圈避免遞迴太深）\n    return x\n\ntotal, used = 0, 0\n# TODO: Kruskal：由輕到重考慮每條邊\n\nprint(total if used == n - 1 else -1)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], m = d[1];\nconst edges = Array.from({ length: m }, (_, k) => [d[2 + 3 * k], d[3 + 3 * k], d[4 + 3 * k]]); // [u, v, w]\nconst parent = Array.from({ length: n + 1 }, (_, i) => i);\n\nfunction find(x) {\n  // TODO: 找代表元素（加上路徑壓縮）\n  return x;\n}\n\nlet total = 0, used = 0;\n// TODO: Kruskal：由輕到重考慮每條邊\n\nconsole.log(used === n - 1 ? total : -1);\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct { int u, v; long long w; } Edge;\nint parent[100005];\n\nint find(int x) {\n    /* TODO: 找代表元素（加上路徑壓縮） */\n    return x;\n}\nint cmp(const void *a, const void *b) {\n    long long x = ((const Edge *)a)->w, y = ((const Edge *)b)->w;\n    return (x > y) - (x < y);\n}\n\nint main(void) {\n    int n, m;\n    scanf("%d %d", &n, &m);\n    Edge *e = malloc(sizeof(Edge) * (m > 0 ? m : 1));\n    for (int i = 0; i < m; i++) scanf("%d %d %lld", &e[i].u, &e[i].v, &e[i].w);\n    for (int i = 0; i <= n; i++) parent[i] = i;\n    long long total = 0;\n    int used = 0;\n    /* TODO: qsort 之後由輕到重考慮每條邊 */\n    printf("%lld\\n", used == n - 1 ? total : -1);\n    return 0;\n}\n'
    },
    hints: ['Kruskal：把邊依權重由小到大排序，依序加入「不會形成環」的邊。', '用 Union-Find 判斷：u 和 v 的代表元素相同就表示已經連通，加這條邊會成環。', '最後選了 n − 1 條邊才是連通的；n = 1 時答案是 0。'],
    explain: '排序 O(m log m)，加上近乎 O(1) 的 Union-Find 操作（路徑壓縮＋按秩合併時是反阿克曼函數 α(n)）。Kruskal 的正確性來自「切割性質」：跨越任一切割的最輕邊一定在某棵最小生成樹裡。沒有 Union-Find 時每次判斷環都要 BFS，整體會變成 O(nm)。',
    tags: ['Union-Find', 'Kruskal', 'MST', 'path-compression']
  });

  /* ---------- 第 18 章 綜合實戰：滑動視窗最大值 ---------- */
  function slidingMax(a, k) { const dq = [], out = []; let h = 0; for (let i = 0; i < a.length; i++) { while (dq.length > h && a[dq[dq.length - 1]] <= a[i]) dq.pop(); dq.push(i); if (dq[h] <= i - k) h++; if (i >= k - 1) out.push(a[dq[h]]); } return out.join(' '); }
  const swCase = (name, a, k, visible) => T(name, `${a.length} ${k}\n${a.join(' ')}\n`, slidingMax(a, k), visible);
  add({
    id: 'dsa.choose.sliding-window-max', lesson: 17, title: '滑動視窗最大值', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '長度 k 的視窗從陣列最左邊一路滑到最右邊，每次右移一格。輸出每個視窗中的最大值。n 可能到 200,000、k 也可能很大：每個視窗都重新找最大值是 O(nk)。想想看用哪種資料結構可以 O(n) 解決。',
    input: '第一行 n k（1 ≤ k ≤ n ≤ 200000）；第二行 n 個整數，|aᵢ| ≤ 10⁹。',
    output: '一行：n − k + 1 個最大值，以空白分隔。',
    cases: () => {
      const r = rng(1818), big = Array.from({ length: 200000 }, () => ri(r, -1e9, 1e9)), down = Array.from({ length: 200000 }, (_, i) => 200000 - i);
      return [swCase('範例', [1, 3, -1, -3, 5, 3, 6, 7], 3, true), swCase('k = 1', [4, 2, 12, 3], 1, true), swCase('k = n', [2, 9, 4], 3), swCase('有重複', [5, 5, 5, 1, 5], 2), swCase('大型隨機 k = 1000', big, 1000), swCase('大型遞減 k = 100000', down, 100000)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <deque>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n, k;\n    cin >> n >> k;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n\n    deque<int> dq;   // 存索引\n    vector<long long> out;\n    // TODO\n\n    for (size_t i = 0; i < out.size(); i++) cout << out[i] << (i + 1 < out.size() ? " " : "\\n");\n    return 0;\n}\n',
      python: 'import sys\nfrom collections import deque\n\ndata = sys.stdin.buffer.read().split()\nn, k = int(data[0]), int(data[1])\na = list(map(int, data[2:2 + n]))\n\ndq = deque()   # 存索引\nout = []\n# TODO\n\nprint(" ".join(map(str, out)))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], k = d[1], a = d.slice(2, 2 + n);\n\nconst dq = []; // 存索引；用 head 當前端，避免 shift() 的 O(n)\nlet head = 0;\nconst out = [];\n// TODO\n\nconsole.log(out.join(" "));\n',
      c: '#include <stdio.h>\n\nlong long a[200005];\nint dq[200005];   /* 雙端佇列：存索引，用 head / tail 兩個指標 */\n\nint main(void) {\n    int n, k;\n    scanf("%d %d", &n, &k);\n    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);\n    int head = 0, tail = 0, first = 1;\n    /* TODO：輸出時第一個數前面不加空白 */\n    printf("\\n");\n    return 0;\n}\n'
    },
    hints: ['雙端佇列（deque）裡存索引，讓對應的值由前到後「遞減」：前端永遠是目前視窗的最大值。', '加入 aᵢ 前，先從後端移除所有 ≤ aᵢ 的元素（它們再也不可能成為最大值）；前端的索引若已經滑出視窗（≤ i − k）就從前端移除。', '每個索引最多進出 deque 各一次，所以總共 O(n)。'],
    explain: '這題考的是「選對資料結構」：堆積可以做到 O(n log n)，單調雙端佇列做到 O(n)。關鍵觀察是被後來的較大元素「壓過」的舊元素永遠不會再是答案，可以直接丟掉。單調佇列 / 單調堆疊在股價、溫度、直方圖最大矩形等問題都會出現。',
    tags: ['deque', 'monotonic-queue', 'sliding-window', 'O(n)']
  });
})();
