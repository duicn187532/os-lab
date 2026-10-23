/* ICS 程式實作（CSLab.code，見 shared/cslab-code.js）：每章一題，用本章學到的觀念寫一個完整的小程式。
 * 本課程以 C++ 為主：題目敘述、提示與解說以 C++ 寫法為準，但四種語言共用同一份 stdin / stdout 規格與測資。
 * 大型測資由固定種子產生，期望輸出由這裡的參考解計算（不是手寫答案）。
 * 時限是 C / C++ 的時限（JavaScript 1.5 倍、Python 3 倍；C++ 也有 3 倍，因為瀏覽器內的 cin 比 scanf 慢）。 */
'use strict';
(function () {
  const add = p => CSLab.code.add(p);
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const T = (name, input, output, visible = false) => ({ name, input, output: String(output).replace(/\n*$/, '\n'), visible });
  const lines = a => a.join('\n');
  const word = (r, lo = 1, hi = 8) => Array.from({ length: ri(r, lo, hi) }, () => String.fromCharCode(97 + ri(r, 0, 25))).join('');

  /* ---------- 第 1 章 計算思維：最大值與出現次數 ---------- */
  function maxCount(a) { let best = a[0], c = 0; for (const x of a) { if (x > best) { best = x; c = 1; } else if (x === best) c++; } return `${best} ${c}`; }
  const mcCase = (name, a, visible) => T(name, `${a.length}\n${a.join(' ')}\n`, maxCount(a), visible);
  add({
    id: 'ics.algorithm.max-count', lesson: 0, title: '最大值與出現次數', timeLimitMs: 1000,
    statement: '給 n 個整數，輸出其中最大的數，以及它出現了幾次。資料可能全部是負數。',
    input: '第一行 n（1 ≤ n ≤ 200000）；第二行 n 個整數，|aᵢ| ≤ 10⁹。',
    output: '一行兩個整數：最大值、最大值出現的次數，以一個空白分隔。',
    cases: () => {
      const r = rng(1001), big = Array.from({ length: 200000 }, () => ri(r, -1e9, 1e9)), neg = Array.from({ length: 50000 }, () => ri(r, -1e9, -1));
      big[ri(r, 0, 199999)] = 1e9; big[ri(r, 0, 199999)] = 1e9;
      return [mcCase('範例', [7, 3, 12, 5, 12], true), mcCase('全部是負數', [-5, -2, -9, -2], true), mcCase('只有一個', [42]), mcCase('全部相同', [3, 3, 3, 3, 3, 3]), mcCase('最大值在第一個', [100, 1, 2, 3]), mcCase('大型隨機', big), mcCase('大型全負數', neg)];
    },
    starter: {
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    int best = 0, count = 0;   // 想一想：best 的初始值設成 0 對嗎？\n    for (int i = 0; i < n; i++) {\n        int x;\n        cin >> x;\n        // TODO: 更新 best 與 count\n    }\n    cout << best << " " << count << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn = int(data[0])\na = list(map(int, data[1:1 + n]))\n\nbest, count = 0, 0\n# TODO: 找出最大值與它的出現次數\n\nprint(best, count)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], a = d.slice(1, 1 + n);\n\nlet best = 0, count = 0;\n// TODO: 找出最大值與它的出現次數\n\nconsole.log(best + " " + count);\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    int best = 0, count = 0;\n    for (int i = 0; i < n; i++) {\n        int x;\n        scanf("%d", &x);\n        /* TODO: 更新 best 與 count */\n    }\n    printf("%d %d\\n", best, count);\n    return 0;\n}\n'
    },
    hints: ['best 的初始值要用第一個數，不能用 0：資料全是負數時，0 根本不在資料裡。', '看到比 best 大的數：best 換成它、count 重設為 1；看到和 best 相等的數：count 加 1。'],
    explain: '一次走訪就能同時維護「目前的最大值」與「它出現幾次」：遇到更大的數就重新計數，遇到相同的數就累加。以第一個元素初始化，是避免「假設資料範圍」的標準做法；時間 O(n)、額外空間 O(1)。',
    tags: ['algorithm', 'loop', 'edge-case']
  });

  /* ---------- 第 2 章 數字系統：進位轉換 ---------- */
  const toBase = (N, b) => N.toString(b).toUpperCase();
  const bcCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs.map(([N, b]) => `${N} ${b}`))}\n`, lines(qs.map(([N, b]) => toBase(BigInt(N), b))), visible);
  add({
    id: 'ics.number.base-convert', lesson: 1, title: '十進位轉 b 進位', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '回答 q 個查詢：把非負整數 N 轉成 b 進位。大於 9 的數字用大寫英文字母 A–F 表示（例如 10 → A）。',
    input: '第一行 q（1 ≤ q ≤ 2000）；接著 q 行，每行 N b（0 ≤ N ≤ 10¹⁸，2 ≤ b ≤ 16）。',
    output: '每個查詢一行：N 的 b 進位表示，不要有多餘的前導 0（N = 0 時輸出 0）。',
    cases: () => {
      const r = rng(1002), bigN = () => String(BigInt(ri(r, 0, 999999999)) * 1000000000n + BigInt(ri(r, 0, 999999999)));
      return [
        bcCase('範例', [[156, 16], [156, 2], [255, 8], [10, 16]], true),
        bcCase('零與一', [[0, 2], [0, 16], [1, 2], [1, 10]], true),
        bcCase('十進位不變', [[123456789, 10], [1000000000000000000n, 10]]),
        bcCase('2 的次方', [[1024, 2], [65535, 16], [4096, 8], [2147483648, 2]]),
        bcCase('各種基數', Array.from({ length: 15 }, (_, i) => [987654321, i + 2])),
        bcCase('超過 32 位元', [[4294967296, 16], [1000000000000000000n, 2], [999999999999999999n, 16]]),
        bcCase('2000 個大數', Array.from({ length: 2000 }, () => [bigN(), ri(r, 2, 16)]))
      ];
    },
    starter: {
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nstring convert(long long n, int b) {\n    const string digits = "0123456789ABCDEF";\n    string s;\n    // TODO: 連除取餘數，把餘數接到 s 的「前面」\n    return s;\n}\n\nint main() {\n    int q;\n    cin >> q;\n    while (q--) {\n        long long n;\n        int b;\n        cin >> n >> b;\n        cout << convert(n, b) << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndef convert(n, b):\n    digits = "0123456789ABCDEF"\n    s = ""\n    # TODO: 連除取餘數\n    return s\n\ndata = sys.stdin.read().split()\nq = int(data[0])\nout = []\nfor k in range(q):\n    n, b = int(data[1 + 2 * k]), int(data[2 + 2 * k])\n    out.append(convert(n, b))\nprint("\\n".join(out))\n',
      javascript: '// N 可能到 10^18，超過 Number 能精確表示的 2^53，請用 BigInt\nconst d = readInput().trim().split(/\\s+/);\nconst q = Number(d[0]);\nconst out = [];\nfor (let k = 0; k < q; k++) {\n  const n = BigInt(d[1 + 2 * k]), b = BigInt(d[2 + 2 * k]);\n  let s = "";\n  // TODO: 連除取餘數\n  out.push(s);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    const char *digits = "0123456789ABCDEF";\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        long long n;\n        int b;\n        scanf("%lld %d", &n, &b);\n        char buf[70];\n        int len = 0;\n        /* TODO: 連除取餘數，存進 buf，再倒著印出 */\n        (void)digits;\n        buf[len] = 0;\n        printf("%s\\n", buf);\n    }\n    return 0;\n}\n'
    },
    hints: ['n % b 是最低位的數字，n / b 去掉最低位；重複到 n 變成 0。', '餘數是由低位到高位產生的，所以要接在字串前面，或最後反轉。別忘了 N = 0 要輸出 "0"。', 'N 最大 10¹⁸，要用 long long（JavaScript 用 BigInt）。'],
    explain: '連除取餘數：N = q·b + r，r 就是最低位，接著對 q 重複。每次除以 b，位數就少一位，所以迴圈只跑 log_b N 次。N = 0 時迴圈一次都不會執行，要特別處理。',
    tags: ['number-system', 'base-conversion', 'long-long']
  });

  /* ---------- 第 3 章 資料表示：二補數編碼與解碼 ---------- */
  const enc = (w, x) => BigInt.asUintN(w, BigInt(x)).toString(2).padStart(w, '0');
  const dec = s => String(BigInt.asIntN(s.length, BigInt('0b' + s)));
  const tcCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs.map(q => q.join(' ')))}\n`, lines(qs.map(q => q[0] === 'E' ? enc(q[1], q[2]) : dec(q[1]))), visible);
  add({
    id: 'ics.data.twos-complement', lesson: 2, title: '二補數編碼與解碼', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '處理 q 個查詢。「E w x」：輸出整數 x 的 w 位元二補數；「D s」：s 是一串 0 與 1，把它當作 s 長度位元的二補數，輸出它代表的十進位整數。',
    input: '第一行 q（1 ≤ q ≤ 10000）；接著 q 行，每行是 E w x（1 ≤ w ≤ 32，−2^(w−1) ≤ x ≤ 2^(w−1) − 1）或 D s（1 ≤ |s| ≤ 32）。',
    output: '每個查詢一行：E 查詢輸出剛好 w 個字元的 0/1 字串；D 查詢輸出一個十進位整數。',
    cases: () => {
      const r = rng(1003), rand = () => { if (r() < .5) { const w = ri(r, 1, 32), lo = -(2 ** (w - 1)), hi = 2 ** (w - 1) - 1; return ['E', w, ri(r, lo, hi)]; } const w = ri(r, 1, 32); return ['D', Array.from({ length: w }, () => ri(r, 0, 1)).join('')]; };
      return [
        tcCase('範例', [['E', 8, -20], ['E', 8, 5], ['D', '11101100'], ['D', '0101']], true),
        tcCase('8 位元邊界', [['E', 8, -128], ['E', 8, 127], ['E', 8, -1], ['D', '10000000'], ['D', '11111111'], ['D', '01111111']], true),
        tcCase('1 位元', [['E', 1, 0], ['E', 1, -1], ['D', '0'], ['D', '1']]),
        tcCase('32 位元', [['E', 32, -2147483648], ['E', 32, 2147483647], ['E', 32, -1], ['D', '1'.repeat(32)], ['D', '1' + '0'.repeat(31)], ['D', '0' + '1'.repeat(31)]]),
        tcCase('混合', [['E', 4, -8], ['E', 16, -300], ['D', '1000'], ['D', '1111111011010100'], ['E', 5, 15]]),
        tcCase('一萬個隨機查詢', Array.from({ length: 10000 }, rand))
      ];
    },
    starter: {
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    int q;\n    cin >> q;\n    while (q--) {\n        char type;\n        cin >> type;\n        if (type == \'E\') {\n            int w;\n            long long x;\n            cin >> w >> x;\n            string bits(w, \'0\');\n            // TODO: 把 x 的 w 位元二補數寫進 bits\n            cout << bits << "\\n";\n        } else {\n            string s;\n            cin >> s;\n            long long value = 0;\n            // TODO: 把 s 解讀成二補數\n            cout << value << "\\n";\n        }\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.read().split()\nq = int(data[0])\npos = 1\nout = []\nfor _ in range(q):\n    if data[pos] == "E":\n        w, x = int(data[pos + 1]), int(data[pos + 2])\n        pos += 3\n        bits = "0" * w\n        # TODO: x 的 w 位元二補數\n        out.append(bits)\n    else:\n        s = data[pos + 1]\n        pos += 2\n        value = 0\n        # TODO: 把 s 解讀成二補數\n        out.append(str(value))\nprint("\\n".join(out))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst q = Number(d[0]);\nlet pos = 1;\nconst out = [];\nfor (let k = 0; k < q; k++) {\n  if (d[pos] === "E") {\n    const w = Number(d[pos + 1]), x = Number(d[pos + 2]);\n    pos += 3;\n    let bits = "0".repeat(w);\n    // TODO: x 的 w 位元二補數\n    out.push(bits);\n  } else {\n    const s = d[pos + 1];\n    pos += 2;\n    let value = 0;\n    // TODO: 把 s 解讀成二補數\n    out.push(String(value));\n  }\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        char type[2];\n        scanf("%1s", type);\n        if (type[0] == \'E\') {\n            int w;\n            long long x;\n            scanf("%d %lld", &w, &x);\n            char bits[40];\n            memset(bits, \'0\', w);\n            bits[w] = 0;\n            /* TODO: x 的 w 位元二補數 */\n            printf("%s\\n", bits);\n        } else {\n            char s[40];\n            scanf("%39s", s);\n            long long value = 0;\n            /* TODO: 把 s 解讀成二補數 */\n            printf("%lld\\n", value);\n        }\n    }\n    return 0;\n}\n'
    },
    hints: ['編碼：負數 x 的 w 位元二補數，等於無號數 x + 2^w 的二進位。例如 8 位元的 −20 就是 256 − 20 = 236 = 11101100。', '解碼：先當成無號數算出 v；如果最高位是 1，答案是 v − 2^w（因為最高位的權重是 −2^(w−1)，不是 +2^(w−1)）。', 'w = 32 時 2^w 超過 int，計算請用 long long；C++ 中 1LL << w 才不會溢位。'],
    explain: '二補數的最高位權重是 −2^(w−1)，其餘和一般二進位相同。因此「負數 = 加上 2^w 再當無號數寫出」，「解碼 = 無號值減掉 2^w（若最高位為 1）」。這也是為什麼同一串位元，用無號與有號解讀會差剛好 2^w。',
    tags: ['twos-complement', 'bits', 'data-representation']
  });

  /* ---------- 第 4 章 邏輯閘：二進位加法 ---------- */
  const badd = (a, b) => (BigInt('0b' + a) + BigInt('0b' + b)).toString(2);
  const baCase = (name, a, b, visible) => T(name, `${a}\n${b}\n`, badd(a, b), visible);
  const rbits = (r, n) => n === 1 ? String(ri(r, 0, 1)) : '1' + Array.from({ length: n - 1 }, () => ri(r, 0, 1)).join('');
  add({
    id: 'ics.logic.binary-add', lesson: 3, title: '二進位字串相加（漣波進位）', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '輸入兩個很長的二進位數，輸出它們的和（二進位）。長度最多 100,000 位，遠超過任何整數型別，請像全加器一樣一位一位相加、把進位往左傳。',
    input: '兩行，各一個二進位字串（1 ≤ 長度 ≤ 100000），除了 "0" 本身之外沒有前導 0。',
    output: '一行：兩數和的二進位表示，沒有前導 0。',
    cases: () => {
      const r = rng(1004);
      return [baCase('範例', '1011', '110', true), baCase('一直進位', '1111', '1', true), baCase('零', '0', '0'), baCase('一個是零', '0', '101101'), baCase('長度差很多', '1', rbits(r, 3000)), baCase('全部是 1', '1'.repeat(5000), '1'.repeat(5000)), baCase('十萬位', rbits(r, 100000), rbits(r, 99999))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string a, b;\n    cin >> a >> b;\n    string result;\n    int carry = 0;\n    // TODO: 從最右邊開始，一位一位相加：和 = (x + y + carry) % 2，進位 = (x + y + carry) / 2\n    //       最後別忘了反轉 result\n    cout << result << "\\n";\n    return 0;\n}\n',
      python: 'a = input().strip()\nb = input().strip()\nresult = []\ncarry = 0\n# TODO: 從最右邊開始一位一位相加（練習用，不要直接用 int(a, 2)）\nprint("".join(result))\n',
      javascript: 'const [a, b] = readInput().trim().split(/\\s+/);\nconst result = [];\nlet carry = 0;\n// TODO: 從最右邊開始一位一位相加\nconsole.log(result.join(""));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nstatic char a[100005], b[100005], r[100010];\n\nint main(void) {\n    scanf("%100004s %100004s", a, b);\n    int len = 0, carry = 0;\n    /* TODO: 從最右邊開始一位一位相加，結果倒著存在 r */\n    (void)carry;\n    r[len] = 0;\n    printf("%s\\n", r);\n    return 0;\n}\n'
    },
    hints: ['用 i、j 從兩個字串的尾端往前走；某一邊走完了就當作 0。', '每一位：s = x + y + carry，寫下 s % 2，carry = s / 2。這正是全加器：S = A ⊕ B ⊕ Cin。', '兩邊都走完後如果 carry 還是 1，要多寫一個 1。結果是倒著產生的，最後反轉。'],
    explain: '這就是漣波進位加法器的軟體版：每一位用全加器算出和與進位，進位傳給左邊一位。時間 O(n)。長度十萬位的數放不進任何內建整數型別，所以「把數字當成字串、自己處理進位」是大數運算的基本技巧。',
    tags: ['full-adder', 'binary', 'string']
  });

  /* ---------- 第 5 章 硬體：迷你累加器 CPU ---------- */
  // 指令 = 運算碼 × 100 + 位址：0 HALT、1 LOAD、2 ADD、3 SUB、4 STORE、5 JMP、6 JZ（ACC = 0 才跳）、7 JN（ACC < 0 才跳）
  function cpu(memIn) {
    const m = Array(100).fill(0n); memIn.forEach((x, i) => { m[i] = BigInt(x); });
    let pc = 0, acc = 0n, steps = 0;
    for (;;) {
      const ir = Number(m[pc]), op = Math.floor(ir / 100), a = ir % 100; pc++; steps++;
      if (op === 0) break;
      if (op === 1) acc = m[a]; else if (op === 2) acc += m[a]; else if (op === 3) acc -= m[a]; else if (op === 4) m[a] = acc;
      else if (op === 5) pc = a; else if (op === 6) { if (acc === 0n) pc = a; } else if (op === 7) { if (acc < 0n) pc = a; }
      if (steps > 3e6) throw new Error('program does not halt');
    }
    return `${steps}\n${acc}\n${m[99]}`;
  }
  const prog = (code, data) => { const m = Array(100).fill(0); code.forEach((x, i) => { m[i] = x; }); for (const [k, v] of Object.entries(data)) m[k] = v; let n = 100; while (n > 1 && m[n - 1] === 0) n--; return m.slice(0, n); };
  const cpuCase = (name, mem, visible) => T(name, `${mem.length}\n${mem.join(' ')}\n`, cpu(mem), visible);
  const LOOP = [199, 220, 499, 120, 321, 420, 608, 500, 0];       // M[99] += M[20]；M[20] -= M[21]；直到 M[20] = 0
  add({
    id: 'ics.cpu.accumulator', lesson: 4, title: '模擬迷你累加器 CPU', timeLimitMs: 1500,
    statement: '模擬第 4 章實驗中的迷你 CPU。記憶體有 100 格（位址 0–99），一開始 PC = 0、ACC = 0。每條指令是「運算碼 × 100 + 位址 a」：0 HALT 停止；1 LOAD：ACC ← M[a]；2 ADD：ACC ← ACC + M[a]；3 SUB：ACC ← ACC − M[a]；4 STORE：M[a] ← ACC；5 JMP：PC ← a；6 JZ：若 ACC = 0 則 PC ← a；7 JN：若 ACC < 0 則 PC ← a。每個週期先擷取 M[PC]、PC 加一，再執行。',
    input: '第一行 m（1 ≤ m ≤ 100）；第二行 m 個整數，依序是 M[0] 到 M[m−1]，其餘位址為 0。保證程式會在 10⁶ 個指令內遇到 HALT，被執行的格子都是合法指令，PC 不會超出 0–99，所有值的絕對值不超過 10¹⁵。',
    output: '三行：執行的指令數（包含 HALT）、停止時的 ACC、停止時的 M[99]。',
    cases: () => [
      cpuCase('範例：a + b', prog([110, 211, 499, 0], { 10: 7, 11: 5 }), true),
      cpuCase('範例：1 + 2 + 3', prog(LOOP, { 20: 3, 21: 1 }), true),
      cpuCase('一開始就 HALT', [0]),
      cpuCase('絕對值（JN）', prog([120, 703, 505, 130, 320, 499, 0], { 20: -42 })),
      cpuCase('絕對值（正數）', prog([120, 703, 505, 130, 320, 499, 0], { 20: 17 })),
      cpuCase('取最大值', prog([120, 321, 705, 120, 506, 121, 499, 0], { 20: -5, 21: 9 })),
      cpuCase('乘法：重複相加', prog([199, 222, 499, 121, 323, 421, 608, 500, 0], { 21: 4321, 22: 123456789, 23: 1 })),
      cpuCase('十萬圈迴圈', prog(LOOP, { 20: 100000, 21: 1 })),
      cpuCase('負數總和', prog([199, 220, 499, 121, 322, 421, 608, 500, 0], { 20: -999999999999, 21: 1000, 22: 1 }))
    ],
    starter: {
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    long long mem[100] = {0};\n    int m;\n    cin >> m;\n    for (int i = 0; i < m; i++) cin >> mem[i];\n\n    int pc = 0;\n    long long acc = 0, steps = 0;\n    while (true) {\n        long long ir = mem[pc];   // 擷取\n        pc++;\n        steps++;\n        int op = ir / 100, addr = ir % 100;   // 解碼\n        if (op == 0) break;                   // 執行\n        // TODO: 處理 LOAD、ADD、SUB、STORE、JMP、JZ、JN\n        (void)addr;\n        break;\n    }\n    cout << steps << "\\n" << acc << "\\n" << mem[99] << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.read().split()\nm = int(data[0])\nmem = [0] * 100\nfor i in range(m):\n    mem[i] = int(data[1 + i])\n\npc, acc, steps = 0, 0, 0\nwhile True:\n    ir = mem[pc]   # 擷取\n    pc += 1\n    steps += 1\n    op, addr = ir // 100, ir % 100   # 解碼\n    if op == 0:\n        break\n    # TODO: 處理 LOAD、ADD、SUB、STORE、JMP、JZ、JN\n    break\n\nprint(steps)\nprint(acc)\nprint(mem[99])\n',
      javascript: '// 值可能到 10^15，還在 Number 能精確表示的範圍（2^53 ≈ 9 × 10^15）內\nconst d = readInput().trim().split(/\\s+/).map(Number);\nconst m = d[0];\nconst mem = new Array(100).fill(0);\nfor (let i = 0; i < m; i++) mem[i] = d[1 + i];\n\nlet pc = 0, acc = 0, steps = 0;\nwhile (true) {\n  const ir = mem[pc];   // 擷取\n  pc++;\n  steps++;\n  const op = Math.floor(ir / 100), addr = ir % 100;   // 解碼\n  if (op === 0) break;\n  // TODO: 處理 LOAD、ADD、SUB、STORE、JMP、JZ、JN\n  break;\n}\nconsole.log(steps + "\\n" + acc + "\\n" + mem[99]);\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    long long mem[100] = {0};\n    int m;\n    scanf("%d", &m);\n    for (int i = 0; i < m; i++) scanf("%lld", &mem[i]);\n\n    int pc = 0;\n    long long acc = 0, steps = 0;\n    while (1) {\n        long long ir = mem[pc];\n        pc++;\n        steps++;\n        int op = (int)(ir / 100), addr = (int)(ir % 100);\n        if (op == 0) break;\n        /* TODO: 處理 LOAD、ADD、SUB、STORE、JMP、JZ、JN */\n        (void)addr;\n        break;\n    }\n    printf("%lld\\n%lld\\n%lld\\n", steps, acc, mem[99]);\n    return 0;\n}\n'
    },
    hints: ['迴圈本體就是指令週期：擷取 ir = M[PC]、PC++、解碼 op = ir / 100 與 a = ir % 100、依 op 執行。', '跳躍指令直接改寫 PC；因為擷取時已經 PC++，不跳的時候什麼都不用做。', 'ACC 與記憶體的值可能到 10¹⁵，要用 long long。'],
    explain: '這就是 CPU 的擷取—解碼—執行循環。PC 在擷取後立刻加一，所以「不跳」就自然執行下一條；JMP、JZ、JN 只是把 PC 改成別的位址。指令和資料放在同一個記憶體裡（儲存程式概念），所以 STORE 理論上也能改寫程式本身。',
    tags: ['cpu', 'fetch-decode-execute', 'simulation']
  });

  /* ---------- 第 6 章 作業系統：FCFS 排程 ---------- */
  function fcfs(jobs) {
    const order = jobs.map((j, i) => i).sort((x, y) => jobs[x][0] - jobs[y][0] || x - y), wait = Array(jobs.length);
    let t = 0, total = 0;
    for (const i of order) { const [a, b] = jobs[i]; if (t < a) t = a; wait[i] = t - a; total += t - a; t += b; }
    return `${lines(wait)}\n${total}`;
  }
  const fcCase = (name, jobs, visible) => T(name, `${jobs.length}\n${lines(jobs.map(j => j.join(' ')))}\n`, fcfs(jobs), visible);
  add({
    id: 'ics.os.fcfs', lesson: 5, title: '先到先服務（FCFS）排程', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '單核 CPU 用先到先服務排程 n 個工作：依到達時間先後執行，到達時間相同時，輸入中較早出現的先執行；工作一旦開始就做到完成；CPU 空閒時等下一個工作到達。工作的等待時間 = 開始執行的時刻 − 到達時刻。輸入不一定依到達時間排序。',
    input: '第一行 n（1 ≤ n ≤ 100000）；接著 n 行，每行兩個整數：到達時間 aᵢ（0 ≤ aᵢ ≤ 10⁹）與執行時間 bᵢ（1 ≤ bᵢ ≤ 10⁴）。',
    output: 'n + 1 行：依輸入順序輸出每個工作的等待時間，最後一行輸出等待時間的總和。',
    cases: () => {
      const r = rng(1006), busy = Array.from({ length: 100000 }, () => [ri(r, 0, 1e6), ri(r, 1, 1e4)]), sparse = Array.from({ length: 2000 }, () => [ri(r, 0, 1e9), ri(r, 1, 1e4)]);
      return [fcCase('範例：同時到達', [[0, 6], [0, 2], [0, 3]], true), fcCase('範例：CPU 會空閒', [[0, 3], [10, 2], [1, 4]], true), fcCase('只有一個', [[5, 7]]), fcCase('到達時間相同看輸入順序', [[2, 1], [2, 5], [0, 1], [2, 3]]), fcCase('逆序輸入', [[9, 1], [6, 2], [3, 3], [0, 4]]), fcCase('十萬個工作', busy), fcCase('稀疏到達', sparse)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<long long> arrive(n), burst(n);\n    for (int i = 0; i < n; i++) cin >> arrive[i] >> burst[i];\n\n    vector<int> order(n);\n    for (int i = 0; i < n; i++) order[i] = i;\n    // TODO: 依到達時間排序 order（到達時間相同時，編號小的在前）\n\n    vector<long long> wait(n, 0);\n    long long t = 0, total = 0;\n    // TODO: 依 order 模擬：CPU 閒置時 t 要跳到工作到達的時刻\n\n    for (int i = 0; i < n; i++) cout << wait[i] << "\\n";\n    cout << total << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn = int(data[0])\narrive = [int(x) for x in data[1:1 + 2 * n:2]]\nburst = [int(x) for x in data[2:2 + 2 * n:2]]\n\norder = list(range(n))\n# TODO: 依到達時間排序 order（相同時編號小的在前）\n\nwait = [0] * n\nt = total = 0\n# TODO: 依 order 模擬\n\nprint("\\n".join(map(str, wait)))\nprint(total)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0];\nconst arrive = [], burst = [];\nfor (let i = 0; i < n; i++) { arrive.push(d[1 + 2 * i]); burst.push(d[2 + 2 * i]); }\n\nconst order = [...Array(n).keys()];\n// TODO: 依到達時間排序 order（相同時編號小的在前）\n\nconst wait = new Array(n).fill(0);\nlet t = 0, total = 0;\n// TODO: 依 order 模擬\n\nconsole.log(wait.join("\\n") + "\\n" + total);\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nstatic long long arrive[100000], burst[100000], waitT[100000];\nstatic int order[100000];\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) { scanf("%lld %lld", &arrive[i], &burst[i]); order[i] = i; }\n    long long total = 0;\n    /* TODO: 用 qsort 依到達時間排序 order，再模擬 */\n    for (int i = 0; i < n; i++) printf("%lld\\n", waitT[i]);\n    printf("%lld\\n", total);\n    return 0;\n}\n'
    },
    hints: ['先排序：比較到達時間，相同時比較原本的編號，這樣才符合「先到先服務」的規則。', '模擬時維護目前時刻 t：若 t 小於工作的到達時間，CPU 閒置，t 直接跳到到達時間；等待時間是 t − 到達時間；之後 t 加上執行時間。', '總等待時間可能超過 int，請用 long long。'],
    explain: 'FCFS 是最簡單的排程：排序之後依序執行，時間 O(n log n)。「CPU 閒置時跳到下一個到達時刻」這一步最容易漏掉；而範例一也展示了 FCFS 的缺點：長工作排在前面，後面所有工作都要等它。',
    tags: ['scheduling', 'fcfs', 'sort']
  });

  /* ---------- 第 7 章 網路：子網路計算 ---------- */
  const ipS = x => [x >>> 24, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join('.');
  function sub(ip, k) { const mask = k === 0 ? 0 : (0xFFFFFFFF << (32 - k)) >>> 0, net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0; return `${ipS(net)} ${ipS(bc)} ${2 ** (32 - k) - 2}`; }
  const ipOf = s => s.split('.').reduce((a, x) => a * 256 + Number(x), 0);
  const snCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs)}\n`, lines(qs.map(q => { const [ip, k] = q.split('/'); return sub(ipOf(ip), +k); })), visible);
  add({
    id: 'ics.network.subnet', lesson: 6, title: '網路位址與廣播位址', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '給一個帶前綴長度的 IPv4 位址 a.b.c.d/k，算出它所在子網路的網路位址、廣播位址，以及可分配給主機的位址數量（2^(32−k) − 2）。',
    input: '第一行 q（1 ≤ q ≤ 20000）；接著 q 行，每行一個 a.b.c.d/k（0 ≤ a, b, c, d ≤ 255，0 ≤ k ≤ 30）。',
    output: '每個查詢一行：網路位址、廣播位址、可用主機數，以空白分隔。',
    cases: () => {
      const r = rng(1007), rip = () => `${ri(r, 0, 255)}.${ri(r, 0, 255)}.${ri(r, 0, 255)}.${ri(r, 0, 255)}`;
      return [snCase('範例', ['192.168.10.77/26', '10.0.5.130/25'], true), snCase('/24 與 /30', ['192.168.1.200/24', '172.16.0.6/30'], true), snCase('/0 與 /8', ['8.8.8.8/0', '10.20.30.40/8']), snCase('最高位為 1', ['255.255.255.255/16', '200.1.2.3/1', '128.0.0.1/2']), snCase('位元組邊界外', ['172.31.45.99/20', '10.1.2.3/11', '192.168.100.37/27']), snCase('兩萬個隨機查詢', Array.from({ length: 20000 }, () => `${rip()}/${ri(r, 0, 30)}`))];
    },
    starter: {
      cpp: '#include <cstdio>\n#include <cstdint>\n\nvoid printIp(uint32_t x) {\n    printf("%u.%u.%u.%u", x >> 24, (x >> 16) & 255, (x >> 8) & 255, x & 255);\n}\n\nint main() {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        unsigned a, b, c, d, k;\n        scanf("%u.%u.%u.%u/%u", &a, &b, &c, &d, &k);\n        uint32_t ip = (a << 24) | (b << 16) | (c << 8) | d;\n        uint32_t network = ip, broadcast = ip;   // TODO: 用遮罩計算\n        long long hosts = 0;                      // TODO\n        printIp(network); printf(" "); printIp(broadcast); printf(" %lld\\n", hosts);\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndef ip_str(x):\n    return ".".join(str((x >> s) & 255) for s in (24, 16, 8, 0))\n\nlines = sys.stdin.read().split()\nq = int(lines[0])\nout = []\nfor item in lines[1:1 + q]:\n    addr, k = item.split("/")\n    k = int(k)\n    a, b, c, d = map(int, addr.split("."))\n    ip = (a << 24) | (b << 16) | (c << 8) | d\n    network = broadcast = ip   # TODO: 用遮罩計算\n    hosts = 0                  # TODO\n    out.append(f"{ip_str(network)} {ip_str(broadcast)} {hosts}")\nprint("\\n".join(out))\n',
      javascript: '// 注意：JavaScript 的位元運算是 32 位元「有號」整數，結果要用 >>> 0 轉回無號數\nconst ipStr = x => [x >>> 24, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join(".");\nconst items = readInput().trim().split(/\\s+/);\nconst q = Number(items[0]);\nconst out = [];\nfor (let i = 1; i <= q; i++) {\n  const [addr, ks] = items[i].split("/");\n  const k = Number(ks);\n  const [a, b, c, d] = addr.split(".").map(Number);\n  const ip = ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;\n  let network = ip, broadcast = ip;   // TODO: 用遮罩計算\n  let hosts = 0;                      // TODO\n  out.push(`${ipStr(network)} ${ipStr(broadcast)} ${hosts}`);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <stdint.h>\n\nstatic void printIp(uint32_t x) {\n    printf("%u.%u.%u.%u", x >> 24, (x >> 16) & 255, (x >> 8) & 255, x & 255);\n}\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        unsigned a, b, c, d, k;\n        scanf("%u.%u.%u.%u/%u", &a, &b, &c, &d, &k);\n        uint32_t ip = (a << 24) | (b << 16) | (c << 8) | d;\n        uint32_t network = ip, broadcast = ip;   /* TODO */\n        long long hosts = 0;                      /* TODO */\n        printIp(network); printf(" "); printIp(broadcast); printf(" %lld\\n", hosts);\n    }\n    return 0;\n}\n'
    },
    hints: ['遮罩是前 k 個位元為 1：mask = 0xFFFFFFFF << (32 − k)。k = 0 時位移 32 位是未定義行為，要特別處理成 0。', '網路位址 = ip & mask；廣播位址 = network | ~mask。', '可用主機數 2^(32−k) − 2 在 k = 0 時超過 32 位元，用 long long 計算：(1LL << (32 − k)) − 2。'],
    explain: '子網路計算完全是位元運算：AND 遮罩把主機部分清成 0 得到網路位址，OR 上反轉的遮罩把主機部分設成 1 得到廣播位址。用無號 32 位元整數最自然；位移量等於型別寬度（k = 0 時位移 32）在 C++ 中是未定義行為，是這題最常見的陷阱。',
    tags: ['ipv4', 'subnet', 'bitwise']
  });

  /* ---------- 第 8 章 輸入輸出：問候與座右銘 ---------- */
  const greet = (n, a, m) => `Hi, ${n}! Next year you will be ${a + 1}.\nMotto: [${m}]`;
  const grCase = (name, n, a, m, visible) => T(name, `${n} ${a}\n${m}\n`, greet(n, a, m), visible);
  add({
    id: 'ics.io.greeting', lesson: 7, title: '問候與座右銘（cin 與 getline）', timeLimitMs: 1000,
    statement: '第一行是名字（一個不含空白的英文單字）與年齡，第二行是一句座右銘（可能包含空白與標點）。依照格式輸出問候與座右銘，大小寫、空白與標點都要完全一致。',
    input: '第一行：名字與年齡 a（0 ≤ a ≤ 150），以空白分隔。第二行：座右銘，1 到 200 個可見 ASCII 字元或空白，開頭與結尾不是空白。',
    output: '兩行：「Hi, 名字! Next year you will be a+1.」與「Motto: [座右銘]」。',
    cases: () => [
      grCase('範例', 'Alice', 20, 'Practice makes perfect.', true),
      grCase('年齡 0', 'Bob', 0, 'Hello, world!', true),
      grCase('單字座右銘', 'Eve', 150, 'Carpe-diem'),
      grCase('很多空白', 'Kai', 33, 'Keep   calm   and   code   on.'),
      grCase('標點與數字', 'Mia', 7, 'Rule #1: test the edge cases (0, 1, n)!'),
      grCase('長句子', 'Zed', 99, 'A journey of a thousand miles begins with a single step, and a bug fix begins with a single printf.')
    ],
    starter: {
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string name, motto;\n    int age;\n    cin >> name >> age;\n    getline(cin, motto);   // 想一想：這一行讀到的是什麼？\n    cout << "Hi, " << name << "! Next year you will be " << age + 1 << ".\\n";\n    cout << "Motto: [" << motto << "]\\n";\n    return 0;\n}\n',
      python: 'name, age = input().split()\nage = int(age)\nmotto = ""   # TODO: 讀入第二行\nprint(f"Hi, {name}! Next year you will be {age + 1}.")\nprint(f"Motto: [{motto}]")\n',
      javascript: 'const lines = readInput().split("\\n");\nconst [name, ageText] = lines[0].trim().split(/\\s+/);\nconst age = Number(ageText);\nconst motto = "";   // TODO: 讀入第二行（注意可能有 \\r）\nconsole.log(`Hi, ${name}! Next year you will be ${age + 1}.`);\nconsole.log(`Motto: [${motto}]`);\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    char name[64], motto[256] = "";\n    int age;\n    scanf("%63s %d", name, &age);\n    /* TODO: 讀入第二行到 motto（可用 fgets，記得處理殘留的換行） */\n    printf("Hi, %s! Next year you will be %d.\\n", name, age + 1);\n    printf("Motto: [%s]\\n", motto);\n    return 0;\n}\n'
    },
    hints: ['cin >> age 讀完數字後，第一行結尾的換行字元還留在輸入裡。', '直接 getline 會讀到那個換行，得到空字串。改成 getline(cin >> ws, motto)，或先 cin.ignore()。', '輸出要和格式完全一樣：Hi 後面是逗號加空白，名字後面是驚嘆號，年齡後面有句號。'],
    explain: '這題的關鍵是 >> 與 getline 的混用：>> 跳過前導空白、讀到下一個空白就停，不會吃掉後面的換行；getline 讀到換行為止。先用 ws 丟掉殘留的空白字元，getline 才會讀到真正的第二行。輸出格式的每個字元（逗號、空白、句號）都會被逐字比對。',
    tags: ['cin', 'getline', 'output-format']
  });

  /* ---------- 第 9 章 型別：秒數換算 ---------- */
  const hms = t => { t = BigInt(t); const h = t / 3600n, m = t % 3600n / 60n, s = t % 60n; return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
  const hmCase = (name, ts, visible) => T(name, `${ts.length}\n${lines(ts)}\n`, lines(ts.map(hms)), visible);
  add({
    id: 'ics.types.seconds', lesson: 8, title: '秒數換算成 時:分:秒', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '把 q 個秒數 t 換算成「時:分:秒」。時數不限位數、不補 0；分與秒固定兩位數，不足補 0。t 最大到 10¹²，超過 int 的範圍。',
    input: '第一行 q（1 ≤ q ≤ 100000）；接著 q 行，每行一個整數 t（0 ≤ t ≤ 10¹²）。',
    output: '每個查詢一行，例如 3725 → 1:02:05。',
    cases: () => {
      const r = rng(1008), big = Array.from({ length: 100000 }, () => r() < .5 ? ri(r, 0, 86400) : ri(r, 0, 1e9) * 1000 + ri(r, 0, 999));
      return [hmCase('範例', [3725, 59, 3600], true), hmCase('零與邊界', [0, 60, 3599, 86399], true), hmCase('超過 int', [2147483648, 1000000000000, 4294967295]), hmCase('十萬個查詢', big)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <iomanip>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    while (q--) {\n        int t;   // 想一想：10^12 放得進 int 嗎？\n        cin >> t;\n        int h = 0, m = 0, s = 0;\n        // TODO: 用整數除法與餘數計算 h、m、s\n        cout << h << ":" << setw(2) << setfill(\'0\') << m << ":" << setw(2) << s << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nq = int(data[0])\nout = []\nfor t in map(int, data[1:1 + q]):\n    h = m = s = 0\n    # TODO: 用 // 與 % 計算\n    out.append(f"{h}:{m:02d}:{s:02d}")\nprint("\\n".join(out))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst q = d[0];\nconst out = [];\nfor (let i = 1; i <= q; i++) {\n  const t = d[i];\n  let h = 0, m = 0, s = 0;\n  // TODO: 用 Math.floor 與 % 計算（10^12 仍在 Number 的精確範圍內）\n  out.push(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        long long t;\n        scanf("%lld", &t);\n        long long h = 0, m = 0, s = 0;\n        /* TODO */\n        printf("%lld:%02lld:%02lld\\n", h, m, s);\n    }\n    return 0;\n}\n'
    },
    hints: ['時 = t / 3600、分 = t % 3600 / 60、秒 = t % 60（都是整數除法）。', 't 最大 10¹²，int 只到約 2.1 × 10⁹，要用 long long 讀入與計算。', 'C++ 補 0：cout << setw(2) << setfill(\'0\') << m；setw 只對下一個輸出有效，每次都要寫。'],
    explain: '整數除法捨去小數、餘數取「剩下的部分」，兩者搭配就能做單位換算。這題刻意讓 t 超過 int：用 int 讀入 10¹² 會讓 cin 進入失敗狀態，後面所有讀取都失效。選對型別是寫程式的第一步。',
    tags: ['integer-division', 'modulo', 'long-long', 'formatting']
  });

  /* ---------- 第 10 章 條件判斷：每個月有幾天 ---------- */
  const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = (y, m) => m === 2 ? (leap(y) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;
  const dmCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs.map(q => q.join(' ')))}\n`, lines(qs.map(([y, m]) => days(y, m))), visible);
  add({
    id: 'ics.branch.days-in-month', lesson: 9, title: '這個月有幾天？', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '依公曆（格里曆）規則回答：y 年 m 月有幾天？閏年規則：能被 4 整除是閏年，但能被 100 整除的不是，除非也能被 400 整除。閏年的 2 月有 29 天。',
    input: '第一行 q（1 ≤ q ≤ 100000）；接著 q 行，每行 y m（1 ≤ y ≤ 10⁹，1 ≤ m ≤ 12）。',
    output: '每個查詢一行：天數。',
    cases: () => {
      const r = rng(1009), qs = Array.from({ length: 100000 }, () => [r() < .3 ? ri(r, 1, 1e9) : ri(r, 1, 2400) * (r() < .5 ? 100 : 1) + (r() < .5 ? 0 : ri(r, 0, 3)), ri(r, 1, 12)]);
      return [dmCase('範例', [[2024, 2], [2023, 2], [2023, 4], [2023, 1]], true), dmCase('世紀年', [[1900, 2], [2000, 2], [2100, 2], [2400, 2]], true), dmCase('每個月', Array.from({ length: 12 }, (_, i) => [2023, i + 1])), dmCase('閏年的每個月', Array.from({ length: 12 }, (_, i) => [2024, i + 1])), dmCase('很大的年份', [[1000000000, 2], [999999996, 2], [999999900, 2], [1, 2], [4, 2]]), dmCase('十萬個查詢', qs)];
    },
    starter: {
      cpp: '#include <iostream>\nusing namespace std;\n\nbool isLeap(int y) {\n    // TODO: 閏年規則（注意條件的順序）\n    return false;\n}\n\nint daysIn(int y, int m) {\n    // TODO: 用 switch 或 if 判斷月份\n    return 31;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    while (q--) {\n        int y, m;\n        cin >> y >> m;\n        cout << daysIn(y, m) << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndef is_leap(y):\n    return False   # TODO\n\ndef days_in(y, m):\n    return 31      # TODO\n\ndata = sys.stdin.buffer.read().split()\nq = int(data[0])\nout = [str(days_in(int(data[1 + 2 * i]), int(data[2 + 2 * i]))) for i in range(q)]\nprint("\\n".join(out))\n',
      javascript: 'const isLeap = y => false;    // TODO\nconst daysIn = (y, m) => 31;  // TODO\nconst d = readInput().trim().split(/\\s+/).map(Number);\nconst q = d[0];\nconst out = [];\nfor (let i = 0; i < q; i++) out.push(daysIn(d[1 + 2 * i], d[2 + 2 * i]));\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nstatic int isLeap(int y) { return 0; /* TODO */ }\nstatic int daysIn(int y, int m) { (void)y; (void)m; return 31; /* TODO */ }\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        int y, m;\n        scanf("%d %d", &y, &m);\n        printf("%d\\n", daysIn(y, m));\n    }\n    (void)isLeap;\n    return 0;\n}\n'
    },
    hints: ['4、6、9、11 月有 30 天，2 月看閏年，其他月份 31 天。switch 很適合這種離散值。', '閏年：if (y % 400 == 0) 是；else if (y % 100 == 0) 不是；else if (y % 4 == 0) 是；else 不是。順序寫反，1900 就會被判成閏年。', '一行寫法：(y % 4 == 0 && y % 100 != 0) || y % 400 == 0。'],
    explain: '條件判斷的重點是「互斥」與「順序」：else if 鏈由上往下，第一個成立的分支執行後就結束，所以最特殊的條件（% 400）要放最前面。月份用 switch 把 30 天的月份列在一起，比一串 if 更清楚。',
    tags: ['if-else', 'switch', 'leap-year']
  });

  /* ---------- 第 11 章 迴圈：質數個數 ---------- */
  const PMAX = 3000000;
  let piTable = null;
  const pi = n => { if (!piTable) { const c = new Uint8Array(PMAX + 1); piTable = new Int32Array(PMAX + 1); let k = 0; for (let i = 2; i <= PMAX; i++) { if (!c[i]) { k++; for (let j = i * i; j <= PMAX; j += i) c[j] = 1; } piTable[i] = k; } } return piTable[n]; };
  const cpCase = (name, ns, visible) => T(name, `${ns.length}\n${lines(ns)}\n`, lines(ns.map(pi)), visible);
  add({
    id: 'ics.loop.count-primes', lesson: 10, title: '1 到 n 有幾個質數？', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '回答 q 個查詢：1 到 n 之間（含 n）有幾個質數？查詢多達 10⁵ 個、n 最大 3 × 10⁶：每個查詢都重新試除會逾時，請先用篩法一次算好。',
    input: '第一行 q（1 ≤ q ≤ 100000）；接著 q 行，每行一個 n（1 ≤ n ≤ 3000000）。',
    output: '每個查詢一行：質數個數。',
    cases: () => {
      const r = rng(1010);
      return [cpCase('範例', [10, 100, 2], true), cpCase('小的 n', [1, 2, 3, 4, 5, 30], true), cpCase('最大值', [3000000, 2999999]), cpCase('質數本身', [97, 7919, 104729, 1299709]), cpCase('十萬個查詢', Array.from({ length: 100000 }, () => ri(r, 1, PMAX)))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    const int MAXN = 3000000;\n    vector<bool> composite(MAXN + 1, false);\n    vector<int> count(MAXN + 1, 0);   // count[i] = 1..i 的質數個數\n    // TODO: 埃拉托斯特尼篩法，同時填好 count\n\n    int q;\n    cin >> q;\n    while (q--) {\n        int n;\n        cin >> n;\n        cout << count[n] << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\nMAXN = 3000000\ncount = [0] * (MAXN + 1)\n# TODO: 篩法（提示：bytearray 與切片指定 sieve[i*i::i] = ... 很快）\n\ndata = sys.stdin.buffer.read().split()\nq = int(data[0])\nprint("\\n".join(str(count[int(x)]) for x in data[1:1 + q]))\n',
      javascript: 'const MAXN = 3000000;\nconst composite = new Uint8Array(MAXN + 1);\nconst count = new Int32Array(MAXN + 1);\n// TODO: 篩法，同時填好 count\n\nconst d = readInput().trim().split(/\\s+/).map(Number);\nconst out = [];\nfor (let i = 1; i <= d[0]; i++) out.push(count[d[i]]);\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\n#define MAXN 3000000\nstatic char composite[MAXN + 1];\nstatic int count[MAXN + 1];\n\nint main(void) {\n    /* TODO: 篩法，同時填好 count */\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        int n;\n        scanf("%d", &n);\n        printf("%d\\n", count[n]);\n    }\n    (void)composite;\n    return 0;\n}\n'
    },
    hints: ['篩法：i 從 2 開始，若 i 沒被劃掉就是質數，把 i × i、i × i + i、… 都劃掉。', '一邊篩一邊累計：count[i] = count[i − 1] + (i 是質數 ? 1 : 0)。之後每個查詢 O(1)。', 'j = i × i 在 i 很大時可能超過 int，可用 long long 或只在 i ≤ √MAXN 時才劃。'],
    explain: '「先花一次 O(n log log n) 預處理，之後每個查詢 O(1)」是迴圈題的常見技巧。若每個查詢都試除到 √k，10⁵ 個查詢、每個 n 都很大，總運算量會超過 10¹¹。篩法從 i² 開始劃，是因為更小的倍數早已被更小的質數劃掉。',
    tags: ['loop', 'sieve', 'prefix-sum']
  });

  /* ---------- 第 12 章 函式：最大公因數與最小公倍數 ---------- */
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
  const glCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs.map(q => q.join(' ')))}\n`, lines(qs.map(([a, b]) => { const g = gcd(a, b); return `${g} ${BigInt(a / g) * BigInt(b)}`; })), visible);
  add({
    id: 'ics.function.gcd-lcm', lesson: 11, title: '最大公因數與最小公倍數', timeLimitMs: 1000, outputBytes: 4 << 20,
    statement: '寫兩個函式 gcd(a, b) 與 lcm(a, b)，回答 q 個查詢。lcm 最大可能接近 10¹⁸。',
    input: '第一行 q（1 ≤ q ≤ 100000）；接著 q 行，每行兩個正整數 a b（1 ≤ a, b ≤ 10⁹）。',
    output: '每個查詢一行：gcd 與 lcm，以空白分隔。',
    cases: () => {
      const r = rng(1011), qs = Array.from({ length: 100000 }, () => { const g = ri(r, 1, 1000); return r() < .5 ? [ri(r, 1, 1e9), ri(r, 1, 1e9)] : [g * ri(r, 1, 1e6), g * ri(r, 1, 1e6)]; });
      return [glCase('範例', [[12, 18], [84, 36]], true), glCase('互質與相同', [[7, 13], [5, 5], [1, 1]], true), glCase('倍數關係', [[6, 36], [1000000000, 1]]), glCase('lcm 很大', [[999999937, 999999929], [1000000000, 999999999]]), glCase('連續費氏數', [[701408733, 433494437], [433494437, 267914296]]), glCase('十萬個查詢', qs)];
    },
    starter: {
      cpp: '#include <iostream>\nusing namespace std;\n\nlong long gcd(long long a, long long b) {\n    // TODO: 輾轉相除法\n    return 1;\n}\n\nlong long lcm(long long a, long long b) {\n    // TODO: 用 gcd 計算（先除再乘）\n    return 0;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    while (q--) {\n        long long a, b;\n        cin >> a >> b;\n        cout << gcd(a, b) << " " << lcm(a, b) << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndef gcd(a, b):\n    return 1   # TODO: 輾轉相除法（練習用，不要直接用 math.gcd）\n\ndef lcm(a, b):\n    return 0   # TODO\n\ndata = sys.stdin.buffer.read().split()\nq = int(data[0])\nout = []\nfor i in range(q):\n    a, b = int(data[1 + 2 * i]), int(data[2 + 2 * i])\n    out.append(f"{gcd(a, b)} {lcm(a, b)}")\nprint("\\n".join(out))\n',
      javascript: '// lcm 可能超過 2^53，要用 BigInt 計算乘法\nfunction gcd(a, b) {\n  return 1;   // TODO: 輾轉相除法\n}\nfunction lcm(a, b) {\n  return 0n;  // TODO：BigInt(a / gcd(a, b)) * BigInt(b)\n}\nconst d = readInput().trim().split(/\\s+/).map(Number);\nconst out = [];\nfor (let i = 0; i < d[0]; i++) {\n  const a = d[1 + 2 * i], b = d[2 + 2 * i];\n  out.push(gcd(a, b) + " " + lcm(a, b));\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nstatic long long gcd(long long a, long long b) { (void)a; (void)b; return 1; /* TODO */ }\nstatic long long lcm(long long a, long long b) { (void)a; (void)b; return 0; /* TODO */ }\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        long long a, b;\n        scanf("%lld %lld", &a, &b);\n        printf("%lld %lld\\n", gcd(a, b), lcm(a, b));\n    }\n    return 0;\n}\n'
    },
    hints: ['gcd(a, b) = gcd(b, a % b)，直到 b = 0 時答案是 a。可以寫成 while 迴圈，也可以寫成遞迴。', 'lcm(a, b) = a / gcd(a, b) × b。先除再乘，中間值就不會超過答案本身。', 'a × b 最大 10¹⁸，要用 long long；JavaScript 的 Number 只能精確到 2⁵³，乘法要用 BigInt。'],
    explain: '把計算包成函式，main 就只負責讀入與輸出。輾轉相除法每兩步至少讓數字減半，所以是 O(log min(a, b))。lcm 寫成 a / g * b 而不是 a * b / g，是避免中間結果溢位的標準寫法。',
    tags: ['function', 'gcd', 'euclid', 'overflow']
  });

  /* ---------- 第 13 章 陣列：成績統計 ---------- */
  function stats(a) {
    const n = a.length, sum = a.reduce((x, y) => x + y, 0), hi = Math.max(...a), lo = Math.min(...a);
    const r = Math.floor((sum * 200 + n) / (2 * n)), avg = `${Math.floor(r / 100)}.${String(r % 100).padStart(2, '0')}`;
    return `${sum} ${hi} ${lo}\n${avg}\n${a.filter(x => x * n > sum).length}`;
  }
  const tie = a => { const n = a.length, s = a.reduce((x, y) => x + y, 0); return (s * 1000) % n === 0 && (s * 1000 / n) % 10 === 5; };   // 平均剛好落在 .xx5：各語言的捨入方式不同，測資避開
  const stCase = (name, a, visible) => { if (tie(a)) throw new Error('rounding tie in ' + name); return T(name, `${a.length}\n${a.join(' ')}\n`, stats(a), visible); };
  add({
    id: 'ics.array.score-stats', lesson: 12, title: '成績統計', timeLimitMs: 1000,
    statement: '讀入 n 個成績，輸出總和、最高分、最低分、平均（四捨五入到小數點後兩位），以及「高於平均」的人數。',
    input: '第一行 n（1 ≤ n ≤ 100000）；第二行 n 個整數成績（0 ≤ 成績 ≤ 100）。測資保證平均不會剛好落在需要捨入的中間值（例如 0.125）。',
    output: '三行：「總和 最高 最低」、平均（固定兩位小數）、嚴格高於平均的人數。',
    cases: () => {
      const r = rng(1012), gen = n => { for (;;) { const a = Array.from({ length: n }, () => ri(r, 0, 100)); if (!tie(a)) return a; } };
      return [stCase('範例', [70, 85, 92, 60], true), stCase('只有一個', [100], true), stCase('全部相同', [60, 60, 60]), stCase('平均不是整數', [1, 2]), stCase('零分', [0, 0, 0, 1]), stCase('三分之一', [0, 0, 1]), stCase('十萬人', gen(100000)), stCase('隨機小班', gen(37))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <iomanip>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> s(n);\n    for (int &x : s) cin >> x;\n\n    long long sum = 0;\n    int hi = 0, lo = 0;\n    // TODO: 計算 sum、hi、lo\n    double avg = 0;   // TODO: 注意整數除法\n    int above = 0;    // TODO: 嚴格高於平均的人數\n\n    cout << sum << " " << hi << " " << lo << "\\n";\n    cout << fixed << setprecision(2) << avg << "\\n";\n    cout << above << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn = int(data[0])\ns = list(map(int, data[1:1 + n]))\n\ntotal, hi, lo = 0, 0, 0   # TODO\navg = 0.0                 # TODO\nabove = 0                 # TODO\n\nprint(total, hi, lo)\nprint(f"{avg:.2f}")\nprint(above)\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], s = d.slice(1, 1 + n);\n\nlet sum = 0, hi = 0, lo = 0;   // TODO\nlet avg = 0;                   // TODO\nlet above = 0;                 // TODO\n\nconsole.log(`${sum} ${hi} ${lo}`);\nconsole.log(avg.toFixed(2));\nconsole.log(above);\n',
      c: '#include <stdio.h>\n\nstatic int s[100000];\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) scanf("%d", &s[i]);\n    long long sum = 0;\n    int hi = 0, lo = 0, above = 0;\n    double avg = 0;\n    /* TODO */\n    printf("%lld %d %d\\n%.2f\\n%d\\n", sum, hi, lo, avg, above);\n    return 0;\n}\n'
    },
    hints: ['最高與最低的初始值用 s[0]，不要用 0 或 100。', '平均要先轉型再除：double(sum) / n；寫成 sum / n 會先做整數除法。', '「高於平均」不必用浮點數比較：x > sum / n 等價於 x × n > sum，全部用整數計算就不會有誤差。'],
    explain: '陣列讓我們能「先算平均、再回頭比較每一個」，這需要把資料存起來（兩次走訪）。比較時把 x > sum / n 改寫成 x·n > sum，避開了浮點數誤差；輸出固定小數位數用 fixed 與 setprecision(2)。',
    tags: ['array', 'vector', 'average', 'formatting']
  });

  /* ---------- 第 14 章 字串：回文判斷 ---------- */
  const isPal = s => { const t = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return t === [...t].reverse().join(''); };
  const plCase = (name, ls, visible) => T(name, `${ls.length}\n${lines(ls)}\n`, lines(ls.map(s => isPal(s) ? 'Yes' : 'No')), visible);
  add({
    id: 'ics.string.palindrome', lesson: 13, title: '忽略標點的回文', timeLimitMs: 1000,
    statement: '判斷每一行是不是回文：只看英文字母與數字，忽略大小寫，其他字元（空白、標點）全部略過。沒有任何英數字元的一行也算回文。',
    input: '第一行 q（1 ≤ q ≤ 2000）；接著 q 行，每行 1 到 1000 個可見 ASCII 字元或空白，開頭與結尾不是空白。',
    output: '每行輸出 Yes 或 No。',
    cases: () => {
      const r = rng(1013), CH = 'abcAB12 ,.!?', rand = () => { const n = ri(r, 1, 1000); let s = Array.from({ length: n }, () => CH[ri(r, 0, CH.length - 1)]).join('').trim() || 'x'; if (r() < .5) { const h = s.slice(0, Math.ceil(s.length / 2)); s = (h + [...h].reverse().join('').replace(/[a-z]/g, c => r() < .5 ? c.toUpperCase() : c)).trim() || 'y'; } return s; };
      return [plCase('範例', ['A man, a plan, a canal: Panama', 'race a car', 'Race, car'], true), plCase('只有標點', ['!!!', '.', 'a.'], true), plCase('數字', ['12321', '1231', '1a2A1']), plCase('大小寫', ['Noon', 'NoOn', 'Was it a car or a cat I saw?']), plCase('不是回文的長句', ['No lemon, no melons', 'Step on no pets!', 'Step on no pet']), plCase('兩千行隨機', Array.from({ length: 2000 }, rand))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <string>\n#include <cctype>\nusing namespace std;\n\nbool isPalindrome(const string &s) {\n    int i = 0, j = (int)s.size() - 1;\n    // TODO: 雙指標，跳過非英數字元、比較時轉成小寫\n    return false;\n}\n\nint main() {\n    int q;\n    cin >> q;\n    string line;\n    getline(cin, line);   // 丟掉第一行剩下的換行\n    while (q--) {\n        getline(cin, line);\n        if (!line.empty() && line.back() == \'\\r\') line.pop_back();\n        cout << (isPalindrome(line) ? "Yes" : "No") << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndef is_palindrome(s):\n    return False   # TODO\n\nlines = sys.stdin.read().split("\\n")\nq = int(lines[0])\nprint("\\n".join("Yes" if is_palindrome(lines[1 + k].rstrip("\\r")) else "No" for k in range(q)))\n',
      javascript: 'function isPalindrome(s) {\n  return false;   // TODO\n}\nconst lines = readInput().split("\\n");\nconst q = Number(lines[0]);\nconst out = [];\nfor (let k = 1; k <= q; k++) out.push(isPalindrome(lines[k].replace(/\\r$/, "")) ? "Yes" : "No");\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\n\nstatic int isPalindrome(const char *s) { (void)s; return 0; /* TODO */ }\n\nint main(void) {\n    int q;\n    char line[1100];\n    if (!fgets(line, sizeof line, stdin)) return 0;\n    q = 0;\n    sscanf(line, "%d", &q);\n    while (q-- && fgets(line, sizeof line, stdin)) {\n        line[strcspn(line, "\\r\\n")] = 0;\n        puts(isPalindrome(line) ? "Yes" : "No");\n    }\n    return 0;\n}\n'
    },
    hints: ['i 從左、j 從右：s[i] 不是英數字元就 i++，s[j] 不是就 j--，兩邊都停好之後才比較。', '比較用 tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])；不相同立刻回傳 false。', '每一行要用 getline 整行讀入，因為句子裡有空白；cin >> q 之後記得先丟掉換行。'],
    explain: '雙指標從兩端往中間走，每個字元最多看一次，O(n) 時間、O(1) 額外空間，不需要先建立一個「清理過」的新字串。isalnum、tolower 要先轉成 unsigned char 才安全，這是 C++ 處理字元時的常見細節。',
    tags: ['string', 'two-pointers', 'getline']
  });

  /* ---------- 第 15 章 指標：區間反轉 ---------- */
  function revAll(a, ops) { a = a.slice(); for (const [l, r] of ops) { let i = l - 1, j = r - 1; while (i < j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; } } return a.join(' '); }
  const rvCase = (name, a, ops, visible) => T(name, `${a.length} ${ops.length}\n${a.join(' ')}\n${lines(ops.map(o => o.join(' ')))}\n`, revAll(a, ops), visible);
  add({
    id: 'ics.pointer.reverse-ranges', lesson: 14, title: '原地反轉區間', timeLimitMs: 1000,
    statement: '給一個長度 n 的陣列，依序執行 q 次操作：每次把第 l 到第 r 個元素（從 1 開始數、含兩端）原地反轉。輸出所有操作完成後的陣列。請用兩個指標（或索引）從區間兩端往中間交換。',
    input: '第一行 n q（1 ≤ n, q ≤ 3000）；第二行 n 個整數（|aᵢ| ≤ 10⁹）；接著 q 行，每行 l r（1 ≤ l ≤ r ≤ n）。',
    output: '一行：最後的陣列，以空白分隔。',
    cases: () => {
      const r = rng(1014), a = Array.from({ length: 3000 }, () => ri(r, -1e9, 1e9)), ops = Array.from({ length: 3000 }, () => { const x = ri(r, 1, 3000), y = ri(r, 1, 3000); return [Math.min(x, y), Math.max(x, y)]; });
      return [rvCase('範例', [1, 2, 3, 4, 5], [[2, 4]], true), rvCase('多次操作', [1, 2, 3, 4, 5, 6], [[1, 6], [1, 3], [5, 5]], true), rvCase('只有一個元素', [7], [[1, 1]]), rvCase('反轉兩次會還原', [3, 1, 4, 1, 5], [[1, 5], [1, 5]]), rvCase('負數與偶數長度', [-1, -2, -3, -4], [[1, 4], [2, 3]]), rvCase('大型', a, ops)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nvoid reverseRange(int *l, int *r) {\n    // TODO: 交換 *l 與 *r，l 往右、r 往左，直到相遇\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n, q;\n    cin >> n >> q;\n    vector<int> a(n);\n    for (int &x : a) cin >> x;\n    while (q--) {\n        int l, r;\n        cin >> l >> r;\n        reverseRange(&a[l - 1], &a[r - 1]);\n    }\n    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 < n ? " " : "\\n");\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn, q = int(data[0]), int(data[1])\na = list(map(int, data[2:2 + n]))\npos = 2 + n\nfor _ in range(q):\n    l, r = int(data[pos]) - 1, int(data[pos + 1]) - 1\n    pos += 2\n    # TODO: 用兩個索引從 l、r 往中間交換\nprint(" ".join(map(str, a)))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], q = d[1];\nconst a = d.slice(2, 2 + n);\nlet pos = 2 + n;\nfor (let k = 0; k < q; k++) {\n  let l = d[pos] - 1, r = d[pos + 1] - 1;\n  pos += 2;\n  // TODO: 用兩個索引從 l、r 往中間交換\n}\nconsole.log(a.join(" "));\n',
      c: '#include <stdio.h>\n\nstatic int a[3000];\n\nstatic void reverseRange(int *l, int *r) {\n    (void)l; (void)r; /* TODO: 交換 *l 與 *r，l++、r--，直到相遇 */\n}\n\nint main(void) {\n    int n, q;\n    scanf("%d %d", &n, &q);\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    while (q--) {\n        int l, r;\n        scanf("%d %d", &l, &r);\n        reverseRange(&a[l - 1], &a[r - 1]);\n    }\n    for (int i = 0; i < n; i++) printf("%d%c", a[i], i + 1 < n ? \' \' : \'\\n\');\n    return 0;\n}\n'
    },
    hints: ['while (l < r) { swap(*l, *r); l++; r--; }：l、r 是指向元素的指標，*l 就是元素本身。', '題目的 l、r 從 1 開始，陣列索引從 0 開始：&a[l − 1] 才是第 l 個元素的位址。', 'C++ 也可以直接用 std::reverse(a.begin() + l − 1, a.begin() + r)，注意結束位置是「最後一個的下一個」。'],
    explain: '指標讓函式能直接修改呼叫端的陣列：reverseRange 收到兩個位址，透過 *l、*r 交換元素本身，完全不需要複製陣列。l++ 前進一個 int（位址加 4），這就是指標運算以「元素」為單位的意思。',
    tags: ['pointer', 'two-pointers', 'in-place']
  });

  /* ---------- 第 16 章 類別：學生排序 ---------- */
  const stuSort = rows => rows.slice().sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(x => x.join(' '));
  const ssCase = (name, rows, visible) => T(name, `${rows.length}\n${lines(rows.map(x => x.join(' ')))}\n`, lines(stuSort(rows)), visible);
  add({
    id: 'ics.class.sort-students', lesson: 15, title: '成績單排序', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '用 struct 存放每位學生的姓名與分數，依「分數由高到低；分數相同時姓名依字典序由小到大」排序後輸出。姓名只含小寫英文字母，比較方式就是一般的字串比較。',
    input: '第一行 n（1 ≤ n ≤ 100000）；接著 n 行，每行姓名與分數（姓名 1–10 個小寫字母，0 ≤ 分數 ≤ 100）。姓名可能重複。',
    output: 'n 行，排序後的「姓名 分數」。',
    cases: () => {
      const r = rng(1015), big = Array.from({ length: 100000 }, () => [word(r, 1, 10), ri(r, 0, 100)]), close = Array.from({ length: 2000 }, () => [word(r, 1, 3), ri(r, 90, 92)]);
      return [ssCase('範例', [['amy', 90], ['ben', 85], ['cat', 90], ['abe', 85]], true), ssCase('同分比姓名', [['bob', 70], ['al', 70], ['alice', 70], ['b', 70]], true), ssCase('只有一個', [['zed', 0]]), ssCase('前綴', [['ab', 50], ['a', 50], ['abc', 50], ['b', 51]]), ssCase('重複姓名', [['tom', 60], ['tom', 80], ['tom', 60]]), ssCase('十萬人', big), ssCase('大量同分', close)];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nstruct Student {\n    string name;\n    int score;\n};\n\nbool before(const Student &a, const Student &b) {\n    // TODO: a 是否應該排在 b 前面？（分數高的在前；同分時姓名小的在前）\n    return false;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<Student> v(n);\n    for (auto &s : v) cin >> s.name >> s.score;\n    sort(v.begin(), v.end(), before);\n    for (const auto &s : v) cout << s.name << " " << s.score << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.read().split()\nn = int(data[0])\nstudents = [(data[1 + 2 * i], int(data[2 + 2 * i])) for i in range(n)]\n# TODO: 排序（提示：sort 的 key 可以是一個 tuple）\nprint("\\n".join(f"{name} {score}" for name, score in students))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst n = Number(d[0]);\nconst students = [];\nfor (let i = 0; i < n; i++) students.push({ name: d[1 + 2 * i], score: Number(d[2 + 2 * i]) });\n// TODO: students.sort((a, b) => ...)；姓名請用 < 比較，不要用 localeCompare\nconsole.log(students.map(s => s.name + " " + s.score).join("\\n"));\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nstruct Student { char name[12]; int score; };\nstatic struct Student v[100000];\n\nstatic int cmp(const void *x, const void *y) {\n    (void)x; (void)y;\n    return 0;   /* TODO: 回傳負數代表 x 排在 y 前面 */\n}\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) scanf("%11s %d", v[i].name, &v[i].score);\n    qsort(v, n, sizeof v[0], cmp);\n    for (int i = 0; i < n; i++) printf("%s %d\\n", v[i].name, v[i].score);\n    return 0;\n}\n'
    },
    hints: ['比較函式回傳「a 是否排在 b 前面」：if (a.score != b.score) return a.score > b.score; return a.name < b.name;', '不要寫成 >=：相等時回傳 true 違反嚴格弱序，std::sort 可能出錯。', 'Python 可以用 key=lambda s: (-s[1], s[0])；JavaScript 比較姓名請用 < 與 >，localeCompare 的順序和題目要求不同。'],
    explain: 'struct 把同一位學生的姓名與分數綁在一起，排序時才不會「分數換了位置、姓名沒換」。多鍵排序的比較函式先比主要條件，相同時再比次要條件；這是 std::sort 搭配自訂比較的典型用法，時間 O(n log n)。',
    tags: ['struct', 'sort', 'comparator']
  });

  /* ---------- 第 17 章 遞迴：全排列 ---------- */
  function perms(n) { const out = [], cur = [], used = Array(n + 1).fill(false); (function go() { if (cur.length === n) { out.push(cur.join(' ')); return; } for (let x = 1; x <= n; x++) if (!used[x]) { used[x] = true; cur.push(x); go(); cur.pop(); used[x] = false; } })(); return lines(out); }
  add({
    id: 'ics.recursion.permutations', lesson: 16, title: '1 到 n 的全排列', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '用遞迴與回溯，依字典序輸出 1 到 n 的所有排列。',
    input: '一個整數 n（1 ≤ n ≤ 8）。',
    output: 'n! 行，每行一個排列，數字以空白分隔，依字典序由小到大。',
    cases: () => [1, 3, 2, 4, 5, 6, 8].map((n, i) => T(`n = ${n}`, `${n}\n`, perms(n), i < 2)),
    starter: {
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint n;\nvector<int> cur;\nvector<bool> used;\n\nvoid perm() {\n    if ((int)cur.size() == n) {   // 基底情況\n        for (int i = 0; i < n; i++) cout << cur[i] << (i + 1 < n ? " " : "\\n");\n        return;\n    }\n    // TODO: 依序嘗試每個沒用過的數：選擇 → 遞迴 → 取消選擇\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    cin >> n;\n    used.assign(n + 1, false);\n    perm();\n    return 0;\n}\n',
      python: 'import sys\n\nn = int(input())\ncur, used, out = [], [False] * (n + 1), []\n\ndef perm():\n    if len(cur) == n:\n        out.append(" ".join(map(str, cur)))\n        return\n    # TODO: 選擇 → 遞迴 → 取消選擇\n\nperm()\nsys.stdout.write("\\n".join(out) + "\\n")\n',
      javascript: 'const n = Number(readInput().trim());\nconst cur = [], used = new Array(n + 1).fill(false), out = [];\nfunction perm() {\n  if (cur.length === n) { out.push(cur.join(" ")); return; }\n  // TODO: 選擇 → 遞迴 → 取消選擇\n}\nperm();\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nstatic int n, cur[9], used[9], len;\n\nstatic void perm(void) {\n    if (len == n) {\n        for (int i = 0; i < n; i++) printf("%d%c", cur[i], i + 1 < n ? \' \' : \'\\n\');\n        return;\n    }\n    /* TODO: 選擇 → 遞迴 → 取消選擇 */\n}\n\nint main(void) {\n    scanf("%d", &n);\n    perm();\n    (void)used; (void)cur;\n    return 0;\n}\n'
    },
    hints: ['迴圈 x 從 1 到 n：若 used[x] 為 false，就 used[x] = true、cur.push_back(x)、遞迴、再 cur.pop_back()、used[x] = false。', '因為每一層都從小的數開始嘗試，輸出自然就是字典序。', '取消選擇（回溯）很重要：不還原 used，下一個分支就會以為那個數還在用。'],
    explain: '回溯法的骨架是「選擇 → 遞迴 → 取消選擇」。遞迴深度只有 n，但呼叫次數是 n! 等級，所以 n = 8 已經有 40,320 行輸出。每一層從小到大嘗試，保證了字典序；用 std::next_permutation 也能做到，但自己寫一次才看得懂它在做什麼。',
    tags: ['recursion', 'backtracking', 'permutation']
  });

  /* ---------- 第 18 章 複雜度：排序去重 ---------- */
  const uniq = a => { const u = [...new Set(a)].sort((x, y) => x - y); return `${u.length}\n${u.join(' ')}`; };
  const uqCase = (name, a, visible) => T(name, `${a.length}\n${a.join(' ')}\n`, uniq(a), visible);
  add({
    id: 'ics.complexity.sort-unique', lesson: 17, title: '排序去重', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '給 n 個整數，輸出有幾個不同的值，以及由小到大排列的所有不同值。n 最大 10⁵：對每個數都往前檢查一遍是否出現過是 O(n²)，會逾時。',
    input: '第一行 n（1 ≤ n ≤ 100000）；第二行 n 個整數（|aᵢ| ≤ 10⁹）。',
    output: '兩行：不同值的個數 k；由小到大的 k 個不同值，以空白分隔。',
    cases: () => {
      const r = rng(1017), wide = Array.from({ length: 100000 }, () => ri(r, -1e9, 1e9)), dup = Array.from({ length: 100000 }, () => ri(r, -50, 50));
      return [uqCase('範例', [5, 3, 5, 1, 3, 3], true), uqCase('沒有重複', [9, -2, 7], true), uqCase('全部相同', [4, 4, 4, 4]), uqCase('只有一個', [-1000000000]), uqCase('十萬個大範圍', wide), uqCase('十萬個大量重複', dup), uqCase('遞減', Array.from({ length: 100000 }, (_, i) => 100000 - i))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<int> v(n);\n    for (int &x : v) cin >> x;\n    // TODO: sort，再用 unique + erase 去掉重複\n\n    cout << v.size() << "\\n";\n    for (size_t i = 0; i < v.size(); i++) cout << v[i] << (i + 1 < v.size() ? " " : "\\n");\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.buffer.read().split()\nn = int(data[0])\nv = list(map(int, data[1:1 + n]))\n# TODO: 排序並去重\nprint(len(v))\nprint(" ".join(map(str, v)))\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0];\nlet v = d.slice(1, 1 + n);\n// TODO: 排序並去重（注意：sort() 預設是字串排序，要傳比較函式）\nconsole.log(v.length + "\\n" + v.join(" "));\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nstatic int v[100000];\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) scanf("%d", &v[i]);\n    int k = n;\n    /* TODO: qsort，再把相鄰重複的元素擠掉 */\n    printf("%d\\n", k);\n    for (int i = 0; i < k; i++) printf("%d%c", v[i], i + 1 < k ? \' \' : \'\\n\');\n    return 0;\n}\n'
    },
    hints: ['先 sort：相同的值會排在一起，接著只要和前一個比較就知道是不是重複。', 'C++：v.erase(unique(v.begin(), v.end()), v.end());。unique 只處理「相鄰」的重複，所以一定要先排序。', 'JavaScript 的 sort() 預設把數字當字串比較（10 會排在 9 前面），要寫 sort((a, b) => a − b)。'],
    explain: '排序把「找重複」這個 O(n²) 的問題變成「和隔壁比較」的 O(n)，整體 O(n log n)。n = 10⁵ 時 n² = 10¹⁰ 次比較，遠超過每秒 10⁸ 次的預算；n log n 約 1.7 × 10⁶，輕鬆完成。這就是複雜度分析在實務上的用處。',
    tags: ['sorting', 'unique', 'complexity']
  });

  /* ---------- 第 19 章 資訊安全：凱薩密碼 ---------- */
  const shift = (s, k) => { k = ((k % 26) + 26) % 26; return s.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + k) % 26 + 65)).replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 97 + k) % 26 + 97)); };
  const czCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs.map(([m, k, s]) => `${m} ${k}\n${s}`))}\n`, lines(qs.map(([m, k, s]) => shift(s, m === 'E' ? k : -k))), visible);
  add({
    id: 'ics.security.caesar', lesson: 18, title: '凱薩密碼加解密', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '處理 q 筆資料。每筆先給一行「E k」（加密：每個英文字母往後移 k 位）或「D k」（解密：往前移 k 位），下一行是要處理的文字。超過 Z 就繞回 A，大小寫各自保持；其他字元（數字、空白、標點）不變。k 可能是負數或很大。',
    input: '第一行 q（1 ≤ q ≤ 2000）；接著每筆兩行：「E k」或「D k」（|k| ≤ 10⁹），以及 1 到 1000 個可見 ASCII 字元或空白組成、開頭與結尾不是空白的一行文字。',
    output: '每筆輸出一行處理後的文字。',
    cases: () => {
      const r = rng(1018), txt = () => { const w = Array.from({ length: ri(r, 1, 60) }, () => { const x = word(r, 1, 9); return r() < .3 ? x[0].toUpperCase() + x.slice(1) : r() < .1 ? x + ',' : x; }); return w.join(' ') + (r() < .5 ? '.' : '!'); };
      return [czCase('範例', [['E', 3, 'Hello, World!'], ['D', 3, 'Khoor, Zruog!']], true), czCase('繞回字母表開頭', [['E', 1, 'xyz XYZ'], ['E', 25, 'abc']], true), czCase('位移 0 與 26', [['E', 0, 'Same text'], ['E', 26, 'Same text'], ['D', 52, 'Same text']]), czCase('負數位移', [['E', -1, 'abc ABC'], ['D', -3, 'Hello']]), czCase('很大的位移', [['E', 1000000000, 'Big shift'], ['D', -999999999, 'Zz 9!'], ['E', -1000000000, 'Big shift']]), czCase('數字與符號不變', [['E', 13, 'R2-D2 & C-3PO: 100% (ok)?']]), czCase('兩千筆', Array.from({ length: 2000 }, () => [r() < .5 ? 'E' : 'D', ri(r, -1e9, 1e9), txt()]))];
    },
    starter: {
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nstring caesar(string s, long long k) {\n    // TODO: 先把 k 換算到 0–25（負數也要正確），再位移每個字母\n    return s;\n}\n\nint main() {\n    int q;\n    cin >> q;\n    while (q--) {\n        char mode;\n        long long k;\n        string text;\n        cin >> mode >> k;\n        getline(cin >> ws, text);\n        if (!text.empty() && text.back() == \'\\r\') text.pop_back();\n        cout << caesar(text, mode == \'E\' ? k : -k) << "\\n";\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndef caesar(s, k):\n    return s   # TODO\n\nlines = sys.stdin.read().split("\\n")\nq = int(lines[0])\nout = []\nfor i in range(q):\n    mode, k = lines[1 + 2 * i].split()\n    text = lines[2 + 2 * i].rstrip("\\r")\n    out.append(caesar(text, int(k) if mode == "E" else -int(k)))\nprint("\\n".join(out))\n',
      javascript: 'function caesar(s, k) {\n  return s;   // TODO：JavaScript 的 % 對負數會得到負的餘數\n}\nconst lines = readInput().split("\\n");\nconst q = Number(lines[0]);\nconst out = [];\nfor (let i = 0; i < q; i++) {\n  const [mode, k] = lines[1 + 2 * i].trim().split(/\\s+/);\n  const text = lines[2 + 2 * i].replace(/\\r$/, "");\n  out.push(caesar(text, mode === "E" ? Number(k) : -Number(k)));\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    int q;\n    char line[1100];\n    if (!fgets(line, sizeof line, stdin)) return 0;\n    sscanf(line, "%d", &q);\n    while (q--) {\n        char mode;\n        long long k;\n        if (!fgets(line, sizeof line, stdin)) break;\n        sscanf(line, " %c %lld", &mode, &k);\n        if (!fgets(line, sizeof line, stdin)) break;\n        line[strcspn(line, "\\r\\n")] = 0;\n        /* TODO: 位移 line 中的每個字母 */\n        puts(line);\n    }\n    return 0;\n}\n'
    },
    hints: ['先把位移換算到 0–25：k = ((k % 26) + 26) % 26。C++ 與 JavaScript 的 % 對負數會得到負的結果，所以要加 26 再取一次餘數。', '大寫：c = (c − \'A\' + k) % 26 + \'A\'；小寫同理用 \'a\'。其他字元不變。', '解密就是位移 −k。文字有空白，要用 getline 整行讀。'],
    explain: '凱薩密碼把字母當成 0–25 的數字做模 26 加法，這是「字元就是小整數」的直接應用。負數取餘數的處理（((k % 26) + 26) % 26）是各語言都會遇到的細節。它只有 25 種有效金鑰，完全不安全，但很適合理解加密、解密與金鑰的關係。',
    tags: ['caesar-cipher', 'modulo', 'char-arithmetic']
  });

  /* ---------- 第 20 章 綜合專題：銀行帳戶模擬器 ---------- */
  function bank(cmds) {
    const bal = new Map(), out = [];
    for (const c of cmds) {
      const [op, a, b, x] = c;
      if (op === 'OPEN') { if (bal.has(a)) out.push('ERROR'); else { bal.set(a, 0n); out.push('OK'); } }
      else if (op === 'BALANCE') out.push(bal.has(a) ? String(bal.get(a)) : 'ERROR');
      else if (op === 'DEPOSIT') { const v = BigInt(b); if (!bal.has(a) || v <= 0n) out.push('ERROR'); else { bal.set(a, bal.get(a) + v); out.push(String(bal.get(a))); } }
      else if (op === 'WITHDRAW') { const v = BigInt(b); if (!bal.has(a) || v <= 0n || v > bal.get(a)) out.push('ERROR'); else { bal.set(a, bal.get(a) - v); out.push(String(bal.get(a))); } }
      else { const v = BigInt(x); if (!bal.has(a) || !bal.has(b) || a === b || v <= 0n || v > bal.get(a)) out.push('ERROR'); else { bal.set(a, bal.get(a) - v); bal.set(b, bal.get(b) + v); out.push(`${bal.get(a)} ${bal.get(b)}`); } }
    }
    return lines(out);
  }
  const bkCase = (name, cmds, visible) => T(name, `${cmds.length}\n${lines(cmds.map(c => c.join(' ')))}\n`, bank(cmds), visible);
  add({
    id: 'ics.project.bank', lesson: 19, title: '銀行帳戶指令模擬器', timeLimitMs: 1500, outputBytes: 4 << 20,
    statement: '依序處理 q 個指令。OPEN a：開戶（餘額 0），成功輸出 OK，帳戶已存在輸出 ERROR。DEPOSIT a x：存款，輸出新餘額。WITHDRAW a x：提款，輸出新餘額。TRANSFER a b x：從 a 轉 x 到 b，輸出「a 的新餘額 b 的新餘額」。BALANCE a：輸出餘額。帳戶不存在、金額 x ≤ 0、餘額不足、或轉帳給自己時，輸出 ERROR，而且不能改變任何餘額。',
    input: '第一行 q（1 ≤ q ≤ 200000）；接著 q 行指令。帳戶名稱是 1–10 個小寫字母，金額是整數，|x| ≤ 10¹²。',
    output: '每個指令一行，如題目所述。',
    cases: () => {
      const r = rng(1019), names = Array.from({ length: 300 }, () => word(r, 1, 6)), pick = () => names[ri(r, 0, names.length - 1)];
      const gen = q => Array.from({ length: q }, () => {
        const t = r(), amt = () => String(r() < .05 ? ri(r, -5, 0) : ri(r, 1, 1e6) * ri(r, 1, 1e6));
        if (t < .1) return ['OPEN', pick()]; if (t < .4) return ['DEPOSIT', pick(), amt()]; if (t < .6) return ['WITHDRAW', pick(), amt()]; if (t < .85) return ['TRANSFER', pick(), r() < .05 ? 'zzzzzzz' : pick(), amt()]; return ['BALANCE', pick()];
      });
      return [
        bkCase('範例', [['OPEN', 'amy'], ['DEPOSIT', 'amy', '100'], ['WITHDRAW', 'amy', '150'], ['TRANSFER', 'amy', 'bob', '30'], ['BALANCE', 'amy']], true),
        bkCase('轉帳成功', [['OPEN', 'amy'], ['OPEN', 'bob'], ['DEPOSIT', 'amy', '500'], ['TRANSFER', 'amy', 'bob', '200'], ['BALANCE', 'bob'], ['OPEN', 'amy']], true),
        bkCase('各種錯誤', [['BALANCE', 'nobody'], ['OPEN', 'x'], ['DEPOSIT', 'x', '0'], ['DEPOSIT', 'x', '-5'], ['WITHDRAW', 'x', '1'], ['DEPOSIT', 'x', '10'], ['TRANSFER', 'x', 'x', '5'], ['WITHDRAW', 'x', '10'], ['BALANCE', 'x']]),
        bkCase('剛好提光', [['OPEN', 'a'], ['DEPOSIT', 'a', '1000000000000'], ['WITHDRAW', 'a', '1000000000000'], ['WITHDRAW', 'a', '1'], ['BALANCE', 'a']]),
        bkCase('大金額累積', [['OPEN', 'rich'], ...Array.from({ length: 1000 }, () => ['DEPOSIT', 'rich', '1000000000000']), ['BALANCE', 'rich']]),
        bkCase('二十萬個指令', [...names.map(n => ['OPEN', n]), ...gen(199700)])
      ];
    },
    starter: {
      cpp: '#include <iostream>\n#include <map>\n#include <string>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    map<string, long long> bal;   // 帳戶名稱 → 餘額\n    int q;\n    cin >> q;\n    while (q--) {\n        string cmd;\n        cin >> cmd;\n        if (cmd == "OPEN") {\n            string a;\n            cin >> a;\n            if (bal.count(a)) cout << "ERROR\\n";\n            else { bal[a] = 0; cout << "OK\\n"; }\n        } else if (cmd == "DEPOSIT") {\n            string a; long long x;\n            cin >> a >> x;\n            // TODO\n            cout << "ERROR\\n";\n        } else if (cmd == "WITHDRAW") {\n            string a; long long x;\n            cin >> a >> x;\n            // TODO\n            cout << "ERROR\\n";\n        } else if (cmd == "TRANSFER") {\n            string a, b; long long x;\n            cin >> a >> b >> x;\n            // TODO：先檢查所有條件，全部成立才修改\n            cout << "ERROR\\n";\n        } else {   // BALANCE\n            string a;\n            cin >> a;\n            // TODO\n            cout << "ERROR\\n";\n        }\n    }\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.read().split("\\n")\nq = int(data[0])\nbal = {}\nout = []\nfor line in data[1:1 + q]:\n    p = line.split()\n    if p[0] == "OPEN":\n        if p[1] in bal:\n            out.append("ERROR")\n        else:\n            bal[p[1]] = 0\n            out.append("OK")\n    else:\n        # TODO: DEPOSIT、WITHDRAW、TRANSFER、BALANCE\n        out.append("ERROR")\nprint("\\n".join(out))\n',
      javascript: '// 餘額可能超過 2^53，請用 BigInt\nconst lines = readInput().split("\\n");\nconst q = Number(lines[0]);\nconst bal = new Map();\nconst out = [];\nfor (let i = 1; i <= q; i++) {\n  const p = lines[i].trim().split(/\\s+/);\n  if (p[0] === "OPEN") {\n    if (bal.has(p[1])) out.push("ERROR");\n    else { bal.set(p[1], 0n); out.push("OK"); }\n  } else {\n    // TODO: DEPOSIT、WITHDRAW、TRANSFER、BALANCE\n    out.push("ERROR");\n  }\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\n/* C 沒有內建的 map：這裡先用最簡單的線性搜尋，帳戶最多 200000 個時可能太慢，可以自己改成雜湊表 */\nstatic char names[200000][12];\nstatic long long bal[200000];\nstatic int cnt;\n\nstatic int find(const char *a) { for (int i = 0; i < cnt; i++) if (!strcmp(names[i], a)) return i; return -1; }\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        char cmd[12], a[12];\n        scanf("%11s %11s", cmd, a);\n        if (!strcmp(cmd, "OPEN")) {\n            if (find(a) >= 0) puts("ERROR");\n            else { strcpy(names[cnt], a); bal[cnt++] = 0; puts("OK"); }\n        } else if (!strcmp(cmd, "TRANSFER")) {\n            char b[12]; long long x;\n            scanf("%11s %lld", b, &x);\n            puts("ERROR");   /* TODO */\n        } else if (!strcmp(cmd, "BALANCE")) {\n            puts("ERROR");   /* TODO */\n        } else {\n            long long x;\n            scanf("%lld", &x);\n            puts("ERROR");   /* TODO: DEPOSIT、WITHDRAW */\n        }\n    }\n    return 0;\n}\n'
    },
    hints: ['用 map<string, long long>（或 unordered_map）依名稱找餘額；bal.count(a) 判斷帳戶是否存在。', '每個指令都「先檢查、再修改」：所有錯誤條件都排除之後，才更新餘額並輸出。這樣失敗的操作就不會留下痕跡。', 'TRANSFER 的錯誤條件：a 或 b 不存在、a == b、x ≤ 0、x 大於 a 的餘額。餘額最大約 10¹⁵，用 long long。'],
    explain: '這題把整個課程串起來：用 long long 表示金額（資料表示）、用 if-else 鏈處理每種錯誤（條件）、用 map 依名稱查帳戶（資料結構）、用「先檢查再修改」維持「餘額不為負、失敗不改變狀態」的不變量（封裝的精神）。把每個指令寫成 Account 類別的成員函式，就是第 15 章的設計。',
    tags: ['project', 'map', 'invariant', 'simulation']
  });
})();
