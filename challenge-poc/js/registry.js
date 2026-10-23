/* Challenge Registry：題目、測資與各語言的起始程式碼。四種語言共用同一份 stdin / stdout 規格與同一組測資，
 * 判斷只看輸出（judge.js），不檢查原始碼關鍵字。大型測資由固定種子產生，期望輸出由這裡的參考解計算。
 * 測資 visible: true 會在結果裡顯示 input / expected / actual；其他只顯示結果。所有測資都在前端，並不保密。 */

// 固定種子的亂數（mulberry32），讓大型測資每次都一樣
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const bsInput = (a, t) => `${a.length}\n${a.join(' ')}\n${t}\n`;
const bsRef = (a, t) => String(a.indexOf(t));
function bsCase(name, a, t, visible = false) { return { name, input: bsInput(a, t), output: bsRef(a, t) + '\n', visible }; }
function largeSorted(n, seed) {
  const r = rng(seed), a = [];
  let v = -1000000000;
  for (let i = 0; i < n; i++) { v += 1 + Math.floor(r() * 20000); a.push(v); }
  return a;
}
const big = largeSorted(100000, 20261023);

export const CHALLENGES = [
  {
    id: 'hello-world', version: 1, title: 'Hello World', timeLimitMs: 2000,
    statement: '輸出一行文字 Hello, CS LAB!（注意大小寫、逗號與驚嘆號）。這題沒有輸入。',
    input: '無。', output: '一行：Hello, CS LAB!',
    cases: [{ name: '輸出', input: '', output: 'Hello, CS LAB!\n', visible: true }],
    starter: {
      c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
      cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
      python: 'print("Hello, World!")\n',
      javascript: 'console.log("Hello, World!");\n'
    }
  },
  {
    id: 'a-plus-b', version: 1, title: 'A + B', timeLimitMs: 2000,
    statement: '讀入兩個整數 A 與 B，輸出 A + B。',
    input: '一行，兩個以空白分隔的整數 A、B，−10⁹ ≤ A, B ≤ 10⁹。', output: '一行：A + B 的值。注意總和可能超出 32 位元整數。',
    cases: [
      { name: '正數', input: '3 5\n', output: '8\n', visible: true },
      { name: '負數', input: '-7 2\n', output: '-5\n', visible: true },
      { name: '零', input: '0 0\n', output: '0\n' },
      { name: '兩個負數', input: '-15 -27\n', output: '-42\n' },
      { name: '不同數量級', input: '123456789 -42\n', output: '123456747\n' },
      { name: '超過 32 位元', input: '1000000000 1000000000\n', output: '2000000000\n' },
      { name: '最小值', input: '-1000000000 -1000000000\n', output: '-2000000000\n' }
    ],
    starter: {
      c: '#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    // TODO: 輸出 a + b\n    return 0;\n}\n',
      cpp: '#include <iostream>\n\nint main() {\n    int a, b;\n    std::cin >> a >> b;\n    // TODO: 輸出 a + b\n    return 0;\n}\n',
      python: 'a, b = map(int, input().split())\n# TODO: 輸出 a + b\n',
      javascript: 'const [a, b] = readInput().trim().split(/\\s+/).map(Number);\n// TODO: 輸出 a + b\n'
    }
  },
  {
    id: 'binary-search', version: 1, title: 'Binary Search', timeLimitMs: 2000,
    statement: '給一個由小到大排序、元素不重複的整數陣列與一個 target。若 target 在陣列裡，輸出它的索引（從 0 開始），否則輸出 -1。大型測資有 100,000 個元素，請用二分搜尋。',
    input: '第一行 n（0 ≤ n ≤ 100000）；第二行 n 個以空白分隔、嚴格遞增的整數（n = 0 時是空行）；第三行 target。數值都在 32 位元整數範圍內。',
    output: '一行：target 的索引，或 -1。',
    cases: [
      bsCase('中間', [1, 3, 5, 7, 9, 11, 13], 7, true),
      bsCase('不存在', [2, 4, 6, 8, 10], 5, true),
      bsCase('第一個', [3, 8, 12, 17, 21, 26, 30], 3),
      bsCase('最後一個', [3, 8, 12, 17, 21, 26, 30], 30),
      bsCase('比全部都小', [10, 20, 30], -5),
      bsCase('比全部都大', [10, 20, 30], 99),
      bsCase('空陣列', [], 4),
      bsCase('只有一個（找到）', [42], 42),
      bsCase('只有一個（找不到）', [42], 7),
      bsCase('負數', [-50, -20, -3, 0, 4, 18], -3),
      bsCase('大型陣列（找到）', big, big[77777]),
      bsCase('大型陣列（找不到）', big, big[31415] + 1),
      bsCase('大型陣列（最後一個）', big, big[big.length - 1])
    ],
    starter: {
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    int *a = malloc(sizeof(int) * (n > 0 ? n : 1));\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    int target;\n    scanf("%d", &target);\n\n    int answer = -1;\n    // TODO: 用二分搜尋找 target\n\n    printf("%d\\n", answer);\n    free(a);\n    return 0;\n}\n',
      cpp: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::ios::sync_with_stdio(false);\n    std::cin.tie(nullptr);\n    int n;\n    std::cin >> n;\n    std::vector<int> a(n);\n    for (int &x : a) std::cin >> x;\n    int target;\n    std::cin >> target;\n\n    int answer = -1;\n    // TODO: 用二分搜尋找 target\n\n    std::cout << answer << "\\n";\n    return 0;\n}\n',
      python: 'import sys\n\ndata = sys.stdin.read().split()\nn = int(data[0])\na = list(map(int, data[1:1 + n]))\ntarget = int(data[1 + n])\n\nanswer = -1\n# TODO: 用二分搜尋找 target\n\nprint(answer)\n',
      javascript: 'const lines = readInput().split("\\n");\nconst n = Number(lines[0]);\nconst a = n > 0 ? lines[1].trim().split(/\\s+/).map(Number) : [];\nconst target = Number(lines[2]);\n\nlet answer = -1;\n// TODO: 用二分搜尋找 target\n\nconsole.log(answer);\n'
    }
  }
];

export const byId = id => CHALLENGES.find(c => c.id === id);
