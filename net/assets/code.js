/* NET 程式實作（CSLab.code，見 shared/cslab-code.js）：每章一題，把本章的協定規則寫成一個完整的小程式。
 * 瀏覽器沙盒不能連網，所以題目都是「模擬協定」或「解析封包」：輸入是封包、紀錄或拓樸，輸出是協定的行為。
 * 預設語言是 Python（教材範例以 Python 為主），四種語言共用同一份 stdin / stdout 規格與測資。
 * 大型測資由固定種子產生，期望輸出由這裡的參考解計算（不是手寫答案）。
 * 時限是 C / C++ 的時限（JavaScript 1.5 倍、Python 3 倍、C++ 也有 3 倍，因為瀏覽器內的 cin 比 scanf 慢）。 */
'use strict';
(function () {
  const add = p => CSLab.code.add(p);
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const T = (name, input, output, visible = false) => ({ name, input, output: String(output).replace(/\n*$/, '\n'), visible });
  const lines = a => a.join('\n');
  const RATES = [1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 125, 200, 250, 500, 1000];   // 都整除 1000，傳輸時間（ns）一定是整數

  /* ---------- 第 1 章 封包交換：儲存轉送的總時間 ---------- */
  function storeForward(M, P, H, R, d) {
    const n = Math.ceil(M / P), k = R.length, last = Array(k).fill(0);
    for (let j = 0; j < n; j++) {
      const bytes = (j < n - 1 ? P : M - P * (n - 1)) + H;
      let arrive = 0;
      for (let i = 0; i < k; i++) {
        const start = Math.max(arrive, last[i]);
        last[i] = start + bytes * 8 * 1000 / R[i];
        arrive = last[i] + d[i];
      }
    }
    return last[k - 1] + d[k - 1];
  }
  const sfCase = (name, qs, visible) => T(name, `${qs.length}\n${qs.map(([M, P, H, R, d]) => `${M} ${P} ${H} ${R.length}\n${R.join(' ')}\n${d.join(' ')}`).join('\n')}\n`, lines(qs.map(q => storeForward(...q))), visible);
  add({
    id: 'net.switching.store-forward', lesson: 0, title: '儲存轉送：訊息什麼時候到齊', timeLimitMs: 1000,
    statement: '一份 M 位元組的訊息被切成封包：每個封包最多攜帶 P 位元組資料（最後一個可能比較少），每個封包再加上 H 位元組的標頭。封包依序從來源出發，經過 k 段鏈路到達目的地，中間的路由器採用儲存轉送：要收齊整個封包才能開始往下一段送，而且每段鏈路一次只能送一個封包、先到先送。第 i 段鏈路的速率是 Rᵢ Mbps（每微秒 Rᵢ 位元），傳播延遲是 dᵢ 奈秒。來源在時間 0 就準備好所有封包。請算出目的地收到整份訊息（最後一個封包的最後一個位元）的時間，單位奈秒。',
    input: '第一行 q（1 ≤ q ≤ 20）。每組第一行 M P H k（1 ≤ M ≤ 2×10⁷，100 ≤ P ≤ 1500，0 ≤ H ≤ 60，1 ≤ k ≤ 10）；第二行 k 個速率 Rᵢ（都是 1000 的因數：1、2、4、5、8、10、20、25、40、50、100、125、200、250、500、1000）；第三行 k 個傳播延遲 dᵢ（0 ≤ dᵢ ≤ 10⁷）。所有組的「封包數 × k」總和不超過 3×10⁶。',
    output: '每組一行：整份訊息抵達目的地的時間（奈秒，整數）。',
    cases: () => {
      const r = rng(2001), rand = (big) => { const k = ri(r, 1, 10), P = ri(r, 100, 1500); return [big ? ri(r, 5e6, 2e7) : ri(r, 1, 20000), P, ri(r, 0, 60), Array.from({ length: k }, () => pick(r, RATES)), Array.from({ length: k }, () => ri(r, 0, 1e7))]; };
      return [
        sfCase('範例：課文中的 3 個封包、3 段鏈路', [[3000, 1000, 0, [8, 8, 8], [0, 0, 0]], [3000, 3000, 0, [8, 8, 8], [0, 0, 0]]], true),
        sfCase('範例：最後一個封包較小、有標頭與傳播延遲', [[2500, 1000, 40, [100, 10], [5000, 20000]]], true),
        sfCase('只有一段鏈路', [[1, 1500, 0, [1000], [0]], [1500, 1500, 60, [1], [10000000]]]),
        sfCase('瓶頸在中間', [[150000, 1500, 40, [1000, 10, 1000], [100, 100, 100]], [150000, 1500, 40, [10, 1000, 1000], [0, 0, 0]], [150000, 1500, 40, [1000, 1000, 10], [0, 0, 0]]]),
        sfCase('前快後慢、前慢後快', [[60000, 1000, 20, [1, 1000], [0, 0]], [60000, 1000, 20, [1000, 1], [0, 0]]]),
        sfCase('隨機小資料', Array.from({ length: 20 }, () => rand(false))),
        sfCase('大型：上萬個封包', Array.from({ length: 12 }, () => rand(true)))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    pos = 0\n    def nxt():\n        nonlocal pos\n        pos += 1\n        return int(data[pos - 1])\n    q = nxt()\n    out = []\n    for _ in range(q):\n        M, P, H, k = nxt(), nxt(), nxt(), nxt()\n        R = [nxt() for _ in range(k)]\n        d = [nxt() for _ in range(k)]\n        n = (M + P - 1) // P              # 封包數\n        last = [0] * k                     # 每段鏈路「上一個封包送完」的時間\n        # TODO: 依序處理每個封包，算出它在每段鏈路開始與結束傳送的時間\n        out.append(str(last[k - 1] + d[k - 1]))\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    while (q--) {\n        long long M, P, H;\n        int k;\n        cin >> M >> P >> H >> k;\n        vector<long long> R(k), d(k), last(k, 0);\n        for (auto &x : R) cin >> x;\n        for (auto &x : d) cin >> x;\n        long long n = (M + P - 1) / P;   // 封包數\n        // TODO: 依序處理每個封包（傳輸時間 = 位元組 × 8 × 1000 / R 奈秒）\n        cout << last[k - 1] + d[k - 1] << "\\n";\n    }\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nlet p = 0;\nconst q = d[p++], out = [];\nfor (let t = 0; t < q; t++) {\n  const M = d[p++], P = d[p++], H = d[p++], k = d[p++];\n  const R = d.slice(p, p + k); p += k;\n  const dl = d.slice(p, p + k); p += k;\n  const n = Math.ceil(M / P), last = new Array(k).fill(0);\n  // TODO: 依序處理每個封包\n  out.push(String(last[k - 1] + dl[k - 1]));\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        long long M, P, H, R[10], d[10], last[10] = {0};\n        int k;\n        scanf("%lld %lld %lld %d", &M, &P, &H, &k);\n        for (int i = 0; i < k; i++) scanf("%lld", &R[i]);\n        for (int i = 0; i < k; i++) scanf("%lld", &d[i]);\n        /* TODO: 依序處理每個封包 */\n        printf("%lld\\n", last[k - 1] + d[k - 1]);\n    }\n    return 0;\n}\n'
    },
    hints: ['不能直接套 (N + P − 1)·L/R：鏈路速率不同、最後一個封包比較小時公式就不成立。用模擬：記住每段鏈路「上一個封包送完」的時間 last[i]。', '封包 j 在第 i 段開始傳送的時間 = max(它抵達第 i 段的時間, last[i])；送完 = 開始 + 位元組 × 8 × 1000 / Rᵢ；抵達下一段 = 送完 + dᵢ。所有數字用 64 位元整數。'],
    explain: '儲存轉送加上先到先送，每段鏈路都是一個「依序服務」的佇列：封包 j 在第 i 段的完成時間 = max(在前一段完成 + 傳播延遲, 第 i 段完成封包 j − 1 的時間) + 傳輸時間。依封包順序、每個封包依鏈路順序計算一次即可，時間 O(封包數 × k)。封包大小相同、鏈路相同時，結果正好是課文的 (N + P − 1)·L/R；速率不同時，總時間由最慢的瓶頸鏈路決定。',
    tags: ['store-and-forward', 'simulation', 'delay']
  });

  /* ---------- 第 2 章 延遲：路由器輸出佇列 ---------- */
  function routerQueue(R, B, pk) {
    const sys = [], out = []; let head = 0, drops = 0;
    for (const [a, s] of pk) {
      while (head < sys.length && sys[head] <= a) head++;
      const inSys = sys.length - head, t = s * 8 * 1000 / R;
      if (inSys === 0) { sys.push(a + t); out.push(a + t); }
      else if (inSys - 1 < B) { const f = sys[sys.length - 1] + t; sys.push(f); out.push(f); }
      else { drops++; out.push('DROP'); }
    }
    return lines(out) + `\ndropped ${drops}`;
  }
  const rqCase = (name, R, B, pk, visible) => T(name, `${R} ${B} ${pk.length}\n${lines(pk.map(x => x.join(' ')))}\n`, routerQueue(R, B, pk), visible);
  const arrivals = (r, n, gapMax, sizes) => { let t = 0; return Array.from({ length: n }, () => { t += ri(r, 0, gapMax); return [t, pick(r, sizes)]; }); };
  add({
    id: 'net.delay.router-queue', lesson: 1, title: '路由器的輸出佇列與掉包', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '一條速率 R Mbps 的輸出鏈路前面有一個最多容納 B 個封包的等待佇列（不含正在傳送的那一個）。封包依時間順序抵達：若鏈路閒置就立刻開始傳送；否則若佇列還有空位就排到隊尾；佇列已滿就丟棄（drop-tail）。大小 s 位元組的封包傳送需要 s × 8 × 1000 / R 奈秒。若某個封包剛好在另一個封包抵達的同一時刻傳送完畢，先讓它離開，再處理抵達的封包。請輸出每個封包傳送完畢的時間，或 DROP。',
    input: '第一行 R B n（R 是 1000 的因數，0 ≤ B ≤ 10⁵，1 ≤ n ≤ 10⁵）；接著 n 行，每行 aᵢ sᵢ：抵達時間（奈秒，0 ≤ aᵢ ≤ 10¹²，非遞減）與大小（40 ≤ sᵢ ≤ 1500 位元組）。',
    output: 'n 行：第 i 個封包傳送完畢的時間（奈秒），被丟棄則輸出 DROP。最後一行輸出 dropped X，X 是被丟棄的封包數。',
    cases: () => {
      const r = rng(2002);
      return [
        rqCase('範例', 8, 1, [[0, 1000], [100, 1000], [200, 1000], [1000000, 500], [1500000, 500]], true),
        rqCase('同時抵達、剛好送完', 1000, 0, [[0, 125], [0, 125], [1000, 125], [1000, 125], [5000, 1500]], true),
        rqCase('佇列為 0：只能直接傳送', 10, 0, arrivals(r, 200, 3000, [64, 576, 1500])),
        rqCase('輕載：流量強度約 0.3', 100, 5, arrivals(r, 3000, 300000, [1500, 576, 64])),
        rqCase('重載：持續掉包', 10, 20, arrivals(r, 5000, 600000, [1500, 1500, 576])),
        rqCase('大型', 1000, 64, arrivals(r, 100000, 14000, [40, 576, 1500, 1500]))
      ];
    },
    starter: {
      python: 'import sys\nfrom collections import deque\n\ndef main():\n    data = sys.stdin.buffer.read().split()\n    R, B, n = int(data[0]), int(data[1]), int(data[2])\n    out = []\n    drops = 0\n    in_system = deque()          # 還在系統裡（傳送中 + 等待中）的封包的完成時間\n    for i in range(n):\n        a, s = int(data[3 + 2 * i]), int(data[4 + 2 * i])\n        t = s * 8 * 1000 // R\n        # TODO: 先移除已經送完的封包，再判斷直接傳送、排隊或丟棄\n        out.append(str(a + t))\n    out.append(f"dropped {drops}")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <deque>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    long long R, B;\n    int n;\n    cin >> R >> B >> n;\n    deque<long long> inSystem;   // 傳送中 + 等待中的封包的完成時間\n    long long drops = 0;\n    string out;\n    for (int i = 0; i < n; i++) {\n        long long a, s;\n        cin >> a >> s;\n        long long t = s * 8 * 1000 / R;\n        // TODO: 判斷直接傳送、排隊或丟棄\n        out += to_string(a + t) + "\\n";\n    }\n    cout << out << "dropped " << drops << "\\n";\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst [R, B, n] = d;\nconst out = [];\nlet drops = 0;\nconst inSystem = [];   // 傳送中 + 等待中的封包的完成時間\nfor (let i = 0; i < n; i++) {\n  const a = d[3 + 2 * i], s = d[4 + 2 * i], t = s * 8 * 1000 / R;\n  // TODO: 判斷直接傳送、排隊或丟棄\n  out.push(String(a + t));\n}\nout.push("dropped " + drops);\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nstatic long long fin[100005];\n\nint main(void) {\n    long long R, B;\n    int n;\n    scanf("%lld %lld %d", &R, &B, &n);\n    long long drops = 0;\n    for (int i = 0; i < n; i++) {\n        long long a, s;\n        scanf("%lld %lld", &a, &s);\n        long long t = s * 8 * 1000 / R;\n        /* TODO: 判斷直接傳送、排隊或丟棄 */\n        printf("%lld\\n", a + t);\n    }\n    printf("dropped %lld\\n", drops);\n    return 0;\n}\n'
    },
    hints: ['用一個佇列記住「還在系統裡」的封包的完成時間（第一個是正在傳送的）。新封包抵達時間 a：先把完成時間 ≤ a 的全部移除。', '移除後若系統是空的：完成 = a + t；若等待中的數量（系統內數量 − 1）< B：完成 = 佇列最後一個的完成時間 + t；否則丟棄。'],
    explain: '先進先出的單一輸出鏈路，每個封包的完成時間只取決於「前一個被接受的封包何時完成」：完成 = max(a, 前一個完成) + t。佇列容量則要知道抵達瞬間還有幾個封包在系統裡，用雙端佇列保存完成時間，從前面移除已離開的封包，每個封包進出各一次，總時間 O(n)。這正是流量強度接近或超過 1 時排隊延遲變長、開始掉包的原因。',
    tags: ['queue', 'delay', 'packet-loss']
  });

  /* ---------- 第 3 章 封裝：解析乙太網路訊框 ---------- */
  const hx = (n, w) => n.toString(16).padStart(w, '0');
  const macStr = b => b.map(x => hx(x, 2)).join(':');
  function buildFrame(r, kind) {
    const mac = () => Array.from({ length: 6 }, () => ri(r, 0, 255)), dst = mac(), src = mac(), bytes = [...dst, ...src];
    if (kind === 'other') { const et = pick(r, [0x86dd, 0x0806, 0x88cc]); bytes.push(et >> 8, et & 255); for (let i = 0; i < ri(r, 46, 120); i++) bytes.push(ri(r, 0, 255)); return { bytes, out: `${macStr(src)} > ${macStr(dst)} type=0x${hx(et, 4)}` }; }
    bytes.push(8, 0);
    const ihl = ri(r, 5, 7), proto = kind === 'tcp' ? 6 : kind === 'udp' ? 17 : pick(r, [1, 2, 47, 89]), ttl = ri(r, 1, 255);
    const tcpOff = ri(r, 5, 8), l4 = kind === 'tcp' ? tcpOff * 4 : kind === 'udp' ? 8 : 0, pay = ri(r, 0, kind === 'small' ? 0 : 300), total = ihl * 4 + l4 + pay;
    const sip = Array.from({ length: 4 }, () => ri(r, 1, 254)), dip = Array.from({ length: 4 }, () => ri(r, 1, 254));
    bytes.push(0x40 | ihl, 0, total >> 8, total & 255, ri(r, 0, 255), ri(r, 0, 255), 0x40, 0, ttl, proto, ri(r, 0, 255), ri(r, 0, 255), ...sip, ...dip);
    for (let i = 20; i < ihl * 4; i++) bytes.push(1);
    const sp = ri(r, 1, 65535), dp = pick(r, [80, 443, 53, 22, ri(r, 1, 65535)]);
    if (kind === 'tcp') { bytes.push(sp >> 8, sp & 255, dp >> 8, dp & 255); for (let i = 0; i < 8; i++) bytes.push(ri(r, 0, 255)); bytes.push(tcpOff << 4, 0x18, 0xff, 0xff, 0, 0, 0, 0); for (let i = 20; i < tcpOff * 4; i++) bytes.push(1); }
    if (kind === 'udp') bytes.push(sp >> 8, sp & 255, dp >> 8, dp & 255, (8 + pay) >> 8, (8 + pay) & 255, 0, 0);
    for (let i = 0; i < pay; i++) bytes.push(ri(r, 0, 255));
    while (bytes.length < 60) bytes.push(0);    // 乙太網路最小訊框：補到 60 位元組（不含 CRC）
    const ip = a => a.join('.');
    const out = kind === 'tcp' || kind === 'udp' ? `${macStr(src)} > ${macStr(dst)} ${kind.toUpperCase()} ${ip(sip)}:${sp} > ${ip(dip)}:${dp} ttl=${ttl} len=${pay}` : `${macStr(src)} > ${macStr(dst)} IP ${ip(sip)} > ${ip(dip)} proto=${proto} ttl=${ttl} len=${total - ihl * 4}`;
    return { bytes, out };
  }
  const pfCase = (name, frames, visible) => T(name, `${frames.length}\n${lines(frames.map(f => f.bytes.map(b => hx(b, 2)).join('')))}\n`, lines(frames.map(f => f.out)), visible);
  const SAMPLE_FRAME = { bytes: [0x00, 0x1b, 0x21, 0x3a, 0x4c, 0x5d, 0xa4, 0x83, 0xe7, 0x11, 0x22, 0x33, 0x08, 0x00, 0x45, 0x00, 0x00, 0x2d, 0x1c, 0x46, 0x40, 0x00, 0x40, 0x11, 0x00, 0x00, 192, 168, 1, 10, 8, 8, 8, 8, 0xc7, 0x38, 0x00, 0x35, 0x00, 0x19, 0x00, 0x00, ...[...'example.com'].map(c => c.charCodeAt(0)), 0, 0, 0, 0, 0, 0, 0], out: 'a4:83:e7:11:22:33 > 00:1b:21:3a:4c:5d UDP 192.168.1.10:51000 > 8.8.8.8:53 ttl=64 len=17' };
  add({
    id: 'net.layers.parse-frame', lesson: 2, title: '一層一層拆開乙太網路訊框', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '給你抓到的乙太網路訊框（十六進位，不含前導碼與 CRC），請由下往上解封裝並印出摘要。乙太網路標頭 14 位元組：目的 MAC（6）、來源 MAC（6）、類型（2）。類型是 0x0800 時後面是 IPv4：第 1 位元組的低 4 位元是標頭長度 IHL（單位 4 位元組，可能有選項）、第 3–4 位元組是總長度、第 9 位元組 TTL、第 10 位元組協定、第 13–16、17–20 位元組是來源與目的 IP。協定 6 是 TCP（標頭第 13 位元組的高 4 位元是標頭長度，單位 4 位元組）、17 是 UDP（標頭 8 位元組）；兩者的前 4 位元組都是來源埠與目的埠。注意：訊框太短時會補 0 到 60 位元組，資料長度要用 IP 的總長度計算，不能用訊框長度。',
    input: '第一行 q（1 ≤ q ≤ 3000）；接著 q 行，每行一個訊框的十六進位字串（小寫、無空白，長度 ≤ 3028）。',
    output: '每個訊框一行。MAC 用小寫、冒號分隔。類型不是 0x0800：「來源MAC > 目的MAC type=0x類型」（4 位小寫十六進位）。TCP 或 UDP：「來源MAC > 目的MAC TCP 來源IP:來源埠 > 目的IP:目的埠 ttl=T len=應用層資料位元組數」（UDP 同理）。其他 IP 協定：「來源MAC > 目的MAC IP 來源IP > 目的IP proto=協定號 ttl=T len=IP 酬載位元組數」。',
    cases: () => {
      const r = rng(2003), mix = n => Array.from({ length: n }, () => buildFrame(r, pick(r, ['tcp', 'tcp', 'udp', 'udp', 'icmp', 'other', 'small'])));
      return [
        pfCase('範例：DNS 查詢（UDP，補到 60 位元組）', [SAMPLE_FRAME], true),
        pfCase('範例：各種協定', [buildFrame(r, 'tcp'), buildFrame(r, 'other'), buildFrame(r, 'icmp')], true),
        pfCase('IP 與 TCP 都有選項', Array.from({ length: 30 }, () => buildFrame(r, 'tcp'))),
        pfCase('短訊框：要靠 IP 總長度', Array.from({ length: 30 }, () => buildFrame(r, pick(r, ['small', 'udp'])))),
        pfCase('非 IPv4', Array.from({ length: 10 }, () => buildFrame(r, 'other'))),
        pfCase('大量混合', mix(3000))
      ];
    },
    starter: {
      python: 'import sys\n\ndef mac(b):\n    return ":".join(f"{x:02x}" for x in b)\n\ndef main():\n    lines = sys.stdin.read().split()\n    q = int(lines[0])\n    out = []\n    for k in range(q):\n        b = bytes.fromhex(lines[1 + k])\n        dst, src = b[0:6], b[6:12]\n        etype = (b[12] << 8) | b[13]\n        if etype != 0x0800:\n            out.append(f"{mac(src)} > {mac(dst)} type=0x{etype:04x}")\n            continue\n        ip = b[14:]\n        # TODO: 讀出 IHL、總長度、TTL、協定、IP 位址，再解析 TCP / UDP\n        out.append(f"{mac(src)} > {mac(dst)} IP")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <vector>\n#include <cstdio>\nusing namespace std;\n\nstring mac(const vector<int>& b, int at) {\n    char s[20];\n    snprintf(s, sizeof s, "%02x:%02x:%02x:%02x:%02x:%02x", b[at], b[at + 1], b[at + 2], b[at + 3], b[at + 4], b[at + 5]);\n    return s;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    while (q--) {\n        string hex;\n        cin >> hex;\n        vector<int> b(hex.size() / 2);\n        for (size_t i = 0; i < b.size(); i++) b[i] = stoi(hex.substr(2 * i, 2), nullptr, 16);\n        int etype = b[12] << 8 | b[13];\n        if (etype != 0x0800) {\n            char t[8];\n            snprintf(t, sizeof t, "%04x", etype);\n            cout << mac(b, 6) << " > " << mac(b, 0) << " type=0x" << t << "\\n";\n            continue;\n        }\n        // TODO: 解析 IPv4 標頭與 TCP / UDP 標頭\n        cout << mac(b, 6) << " > " << mac(b, 0) << " IP\\n";\n    }\n    return 0;\n}\n',
      javascript: 'const lines = readInput().trim().split(/\\s+/);\nconst q = +lines[0], out = [];\nconst mac = (b, at) => Array.from(b.slice(at, at + 6), x => x.toString(16).padStart(2, "0")).join(":");\nfor (let k = 0; k < q; k++) {\n  const hex = lines[1 + k], b = [];\n  for (let i = 0; i < hex.length; i += 2) b.push(parseInt(hex.slice(i, i + 2), 16));\n  const etype = b[12] << 8 | b[13];\n  if (etype !== 0x0800) { out.push(`${mac(b, 6)} > ${mac(b, 0)} type=0x${etype.toString(16).padStart(4, "0")}`); continue; }\n  // TODO: 解析 IPv4 標頭與 TCP / UDP 標頭\n  out.push(`${mac(b, 6)} > ${mac(b, 0)} IP`);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nstatic char hex[4096];\nstatic int b[2048];\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        scanf("%s", hex);\n        int n = strlen(hex) / 2;\n        for (int i = 0; i < n; i++) sscanf(hex + 2 * i, "%2x", &b[i]);\n        int etype = b[12] << 8 | b[13];\n        printf("%02x:%02x:%02x:%02x:%02x:%02x > %02x:%02x:%02x:%02x:%02x:%02x", b[6], b[7], b[8], b[9], b[10], b[11], b[0], b[1], b[2], b[3], b[4], b[5]);\n        if (etype != 0x0800) { printf(" type=0x%04x\\n", etype); continue; }\n        /* TODO: 解析 IPv4 標頭與 TCP / UDP 標頭 */\n        printf(" IP\\n");\n    }\n    return 0;\n}\n'
    },
    hints: ['IPv4 標頭從第 14 個位元組開始：IHL = ip[0] & 0x0F，標頭長度是 IHL × 4；總長度 = ip[2] × 256 + ip[3]。傳輸層標頭從 14 + IHL × 4 開始。', 'TCP 標頭長度 = (tcp[12] >> 4) × 4；應用層資料長度 = IP 總長度 − IP 標頭長度 − 傳輸層標頭長度。不要用訊框的長度，訊框可能被補 0 到 60 位元組。'],
    explain: '每一層的標頭都告訴你下一層從哪裡開始、是什麼協定：乙太網路的類型欄位指出 IPv4，IP 的 IHL 與協定欄位指出傳輸層的位置與種類，TCP 的資料位移指出應用層資料的位置。長度一律以 IP 總長度為準，因為連結層可能補齊最小訊框。這就是 Wireshark 逐層解碼的方式。',
    tags: ['encapsulation', 'parsing', 'ipv4']
  });

  /* ---------- 第 4 章 HTTP：解析管線化的請求 ---------- */
  function httpParse(stream) {
    const out = []; let i = 0;
    const line = () => { const j = stream.indexOf('\n', i); if (j < 0) throw new Error('HTTP 測資格式錯誤'); const s = stream.slice(i, j); i = j + 1; return s; };
    while (i < stream.length) {
      const [method, path, ver] = line().split(' '), hdr = {};
      for (;;) { const l = line(); if (l === '') break; const c = l.indexOf(':'); hdr[l.slice(0, c).trim().toLowerCase()] = l.slice(c + 1).trim(); }
      const len = hdr['content-length'] ? +hdr['content-length'] : 0; i += len;
      const conn = (hdr.connection || '').toLowerCase(), ka = ver === 'HTTP/1.1' ? conn !== 'close' : conn === 'keep-alive';
      if (ver === 'HTTP/1.1' && !('host' in hdr)) out.push('400');
      else out.push(`${method} ${path} ${hdr.host || '-'} ${len} ${ka ? 'keep-alive' : 'close'}`);
    }
    return lines(out);
  }
  const caseMix = (r, s) => [...s].map(c => r() < 0.4 ? c.toUpperCase() : c.toLowerCase()).join('');
  function makeRequest(r, opt = {}) {
    const method = opt.method || pick(r, ['GET', 'GET', 'GET', 'POST', 'PUT', 'HEAD', 'DELETE']), ver = opt.ver || (r() < 0.8 ? 'HTTP/1.1' : 'HTTP/1.0');
    const path = '/' + Array.from({ length: ri(r, 0, 3) }, () => Array.from({ length: ri(r, 1, 6) }, () => pick(r, [...'abcdefghijklmnopqrstuvwxyz0123456789'])).join('')).join('/') + (r() < 0.2 ? '?q=' + ri(r, 1, 999) : '');
    const h = [];
    const host = pick(r, ['example.com', 'www.example.com', 'api.example.net', 'localhost:8080', '10.0.0.5']);
    if (opt.host !== false && (opt.host || r() < 0.9)) h.push([caseMix(r, 'Host'), host]);
    if (r() < 0.5) h.push(['User-Agent', pick(r, ['curl/8.4', 'NetLab/1.0', 'Mozilla/5.0 (X11; Linux)'])]);
    if (r() < 0.3) h.push(['Accept', '*/*']);
    const cv = opt.conn !== undefined ? opt.conn : r() < 0.5 ? pick(r, ['close', 'Close', 'keep-alive', 'Keep-Alive', 'KEEP-ALIVE']) : null;
    if (cv) h.push([caseMix(r, 'Connection'), cv]);
    let body = '';
    if (method === 'POST' || method === 'PUT' || opt.body) { const n = opt.bodyLen !== undefined ? opt.bodyLen : ri(r, 0, 80); body = Array.from({ length: n }, () => r() < 0.06 ? '\n' : pick(r, [...'abcdefghij KLMNOP:0123456789'])).join(''); h.push([caseMix(r, 'Content-Length'), String(n)]); }
    for (let k = h.length - 1; k > 0; k--) { const j = ri(r, 0, k); [h[k], h[j]] = [h[j], h[k]]; }
    return `${method} ${path} ${ver}\n${h.map(([k, v]) => `${k}:${r() < 0.7 ? ' ' : r() < 0.5 ? '' : '   '}${v}${r() < 0.2 ? '  ' : ''}`).join('\n')}${h.length ? '\n' : ''}\n${body}`;
  }
  const hpCase = (name, reqs, visible) => T(name, reqs.join(''), httpParse(reqs.join('')), visible);
  add({
    id: 'net.http.parse-requests', lesson: 3, title: '解析持續連線上的 HTTP 請求', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '伺服器在一條持續連線上連續收到多個 HTTP/1.x 請求（為了簡化，每行以 \\n 結尾）。每個請求：起始行「方法 路徑 版本」、零或多行「名稱: 值」標頭、一個空行，然後是本文：有 Content-Length 標頭時本文剛好是那麼多個字元（本文可能含換行），沒有則沒有本文。標頭名稱不分大小寫，值要去掉前後空白。請為每個請求輸出摘要，並判斷連線是否保持：HTTP/1.1 預設保持（除非 Connection 為 close），HTTP/1.0 預設關閉（除非 Connection 為 keep-alive），Connection 的值不分大小寫。HTTP/1.1 的請求缺少 Host 標頭時是錯誤的請求。',
    input: '整個標準輸入就是位元組串流：1 到 20000 個請求首尾相接。只含 ASCII 字元，路徑與 Host 值不含空白，Content-Length 為 0 到 10⁴ 的整數。',
    output: '每個請求一行：「方法 路徑 Host值 本文長度 keep-alive」或把最後一欄換成 close；HTTP/1.0 沒有 Host 時 Host 值寫 -；HTTP/1.1 缺少 Host 時整行只輸出 400。',
    cases: () => {
      const r = rng(2004);
      const s1 = 'GET /index.html HTTP/1.1\nHost: www.example.com\nUser-Agent: curl/8.4\n\nPOST /api/login HTTP/1.1\nhost:   api.example.com  \ncontent-length: 12\nConnection: Close\n\nuser=amy&pw\n';
      const s2 = 'GET / HTTP/1.0\n\nGET /a HTTP/1.0\nConnection: Keep-Alive\nHost: example.com\n\nGET /missing-host HTTP/1.1\nAccept: */*\n\nPUT /notes/1 HTTP/1.1\nHost: example.com\nContent-Length: 13\n\nline1\nline2\n\n';
      return [
        T('範例：GET 與 POST', s1, httpParse(s1), true),
        T('範例：版本、Host 與含換行的本文', s2, httpParse(s2), true),
        hpCase('本文長度為 0、標頭大小寫混雜', Array.from({ length: 40 }, () => makeRequest(r, { body: true, bodyLen: pick(r, [0, 0, 1, 5]) }))),
        hpCase('缺少 Host 與 HTTP/1.0', Array.from({ length: 60 }, () => makeRequest(r, { host: r() < 0.5 }))),
        hpCase('本文看起來像另一個請求', (body => [`POST /x HTTP/1.1\nHost: a\nContent-Length: ${body.length}\n\n${body}`, 'GET /real HTTP/1.1\nHost: c\n\n'])('GET /fake HTTP/1.1\nHost: b\n\n')),
        hpCase('大量管線化請求', Array.from({ length: 20000 }, () => makeRequest(r)))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    stream = sys.stdin.read()\n    out = []\n    # 錯誤示範：一行一行找「方法 路徑 版本」。本文裡也可能出現長得像請求的行，\n    # 而且這樣讀不到標頭。TODO: 用索引往前讀：起始行 → 標頭（到空行為止）→ 跳過 Content-Length 個字元\n    for line in stream.split("\\n"):\n        parts = line.split(" ")\n        if len(parts) == 3 and parts[2].startswith("HTTP/"):\n            method, path, version = parts\n            out.append(f"{method} {path} - 0 keep-alive")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <sstream>\n#include <iterator>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string s((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n    string out, line;\n    istringstream in(s);\n    // 錯誤示範：一行一行找「方法 路徑 版本」，讀不到標頭，也會把本文裡的行當成請求。\n    // TODO: 用索引往前讀：起始行 → 標頭（到空行為止）→ 跳過 Content-Length 個字元\n    while (getline(in, line)) {\n        istringstream ls(line);\n        string method, path, version, extra;\n        if (ls >> method >> path >> version && !(ls >> extra) && version.rfind("HTTP/", 0) == 0)\n            out += method + " " + path + " - 0 keep-alive\\n";\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const s = readInput();\nconst out = [];\n// 錯誤示範：一行一行找「方法 路徑 版本」，讀不到標頭，也會把本文裡的行當成請求。\n// TODO: 用索引往前讀：起始行 → 標頭（到空行為止）→ 跳過 Content-Length 個字元\nfor (const line of s.split("\\n")) {\n  const parts = line.split(" ");\n  if (parts.length === 3 && parts[2].startsWith("HTTP/")) out.push(`${parts[0]} ${parts[1]} - 0 keep-alive`);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nstatic char line[1 << 16];\n\nint main(void) {\n    /* 錯誤示範：一行一行找「方法 路徑 版本」，讀不到標頭，也會把本文裡的行當成請求。\n       TODO: 把整個輸入讀進來，用索引依序讀起始行、標頭與 Content-Length 個字元的本文 */\n    while (fgets(line, sizeof line, stdin)) {\n        char method[16], path[256], version[16], extra[8];\n        if (sscanf(line, "%15s %255s %15s %7s", method, path, version, extra) == 3 && strncmp(version, "HTTP/", 5) == 0)\n            printf("%s %s - 0 keep-alive\\n", method, path);\n    }\n    return 0;\n}\n'
    },
    hints: ['把整個輸入讀成一個字串，用索引往前讀：先讀到空行為止的標頭，再「直接跳過」Content-Length 個字元的本文。不能一行一行讀本文，因為本文裡可能有換行，甚至長得像另一個請求。', '標頭名稱一律轉小寫再查；值用 strip / trim 去掉前後空白。保持連線的規則依版本不同：1.1 預設 keep-alive，1.0 預設 close。'],
    explain: 'HTTP 建立在 TCP 的位元組串流上，本身就要負責訊息定界：標頭以空行結束，本文長度由 Content-Length 告訴你。伺服器若依「行」而不是依長度讀本文，攻擊者就能把另一個請求藏在本文裡（請求走私）。持續連線的預設值與版本有關，是 HTTP/1.1 減少 TCP 握手的關鍵。',
    tags: ['http', 'parsing', 'framing']
  });

  /* ---------- 第 5 章 DNS：快取與 CNAME 鏈 ---------- */
  function dnsResolve(recs, queries) {
    const zone = new Map(recs.map(([n, ty, v, ttl]) => [n, { ty, v, ttl }])), cache = new Map(), out = [];
    for (const [t, name] of queries) {
      const seen = new Set(); let cur = name, miss = 0, ans = null;
      for (;;) {
        if (seen.has(cur)) { ans = 'LOOP'; break; }
        seen.add(cur);
        let rec; const c = cache.get(cur);
        if (c && t < c.exp) rec = c.rec;
        else { miss++; rec = zone.get(cur); if (!rec) { ans = 'NXDOMAIN'; break; } cache.set(cur, { rec, exp: t + rec.ttl }); }
        if (rec.ty === 'A') { ans = rec.v; break; }
        cur = rec.v;
      }
      out.push(`${ans} ${miss}`);
    }
    return lines(out);
  }
  const dnCase = (name, recs, qs, visible) => T(name, `${recs.length}\n${lines(recs.map(x => x.join(' ')))}\n${qs.length}\n${lines(qs.map(x => x.join(' ')))}\n`, dnsResolve(recs, qs), visible);
  function dnsWorld(r, nNames, nQ, loops) {
    const names = Array.from({ length: nNames }, (_, i) => `h${i}.${pick(r, ['example.com', 'shop.tw', 'cdn.net', 'edu.tw'])}`), recs = [];
    names.forEach((n, i) => {
      const ttl = ri(r, 1, 600);
      if (i > 10 && r() < 0.35) recs.push([n, 'CNAME', names[ri(r, Math.max(0, i - 10), i - 1)], ttl]);
      else if (loops && i > 10 && r() < 0.02) recs.push([n, 'CNAME', names[ri(r, i + 1, Math.min(nNames - 1, i + 3))] || names[0], ttl]);
      else if (r() < 0.93) recs.push([n, 'A', `${ri(r, 1, 223)}.${ri(r, 0, 255)}.${ri(r, 0, 255)}.${ri(r, 1, 254)}`, ttl]);
    });
    let t = 0;
    const qs = Array.from({ length: nQ }, () => { t += ri(r, 0, 20); return [t, r() < 0.03 ? `nx${ri(r, 1, 99)}.example.com` : names[Math.min(nNames - 1, Math.floor(Math.pow(r(), 2) * nNames))]]; });
    return [recs, qs];
  }
  add({
    id: 'net.dns.resolve-cache', lesson: 4, title: 'DNS 解析器：CNAME 鏈與 TTL 快取', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '實作一個有快取的 DNS 解析器。權威資料中每個名稱最多一筆記錄：A（值是 IP）或 CNAME（值是另一個名稱）。查詢名稱 name（時間 t）時，從 name 開始：若目前的名稱已在這次的鏈中出現過，答案是 LOOP；否則查快取，若快取中有它且 t 小於到期時間就直接使用；不然算一次「對外查詢」，到權威資料找記錄：找不到答案是 NXDOMAIN（不快取），找到就存進快取，到期時間是 t + TTL。記錄是 A 就得到答案；是 CNAME 就換成它的值繼續。請輸出每個查詢的答案與這次對外查詢的次數。',
    input: '第一行 n（1 ≤ n ≤ 10⁵）；接著 n 行「名稱 類型 值 TTL」（類型為 A 或 CNAME，1 ≤ TTL ≤ 10⁶）。然後一行 m（1 ≤ m ≤ 10⁵）；接著 m 行「t 名稱」，t 非遞減，0 ≤ t ≤ 10⁹。名稱只含小寫字母、數字、點與連字號。',
    output: '每個查詢一行：「答案 對外查詢次數」，答案是 IP、NXDOMAIN 或 LOOP。',
    cases: () => {
      const r = rng(2005);
      const recs = [['www.example.com', 'A', '93.184.216.34', 300], ['blog.example.com', 'CNAME', 'www.example.com', 60], ['img.example.com', 'CNAME', 'cdn.example.net', 100], ['cdn.example.net', 'A', '151.101.1.57', 30]];
      const loop = [['a.test', 'CNAME', 'b.test', 50], ['b.test', 'CNAME', 'c.test', 50], ['c.test', 'CNAME', 'a.test', 50], ['d.test', 'CNAME', 'd.test', 50], ['e.test', 'CNAME', 'ghost.test', 50]];
      return [
        dnCase('範例：快取命中與 CNAME', recs, [[0, 'blog.example.com'], [10, 'www.example.com'], [20, 'img.example.com'], [40, 'img.example.com'], [70, 'blog.example.com'], [80, 'nope.example.com']], true),
        dnCase('範例：迴圈與指向不存在的名稱', loop, [[0, 'a.test'], [1, 'b.test'], [2, 'd.test'], [3, 'e.test'], [60, 'a.test']], true),
        dnCase('TTL 剛好到期', [['x.tw', 'A', '1.2.3.4', 10], ['y.tw', 'CNAME', 'x.tw', 5]], [[0, 'y.tw'], [4, 'y.tw'], [5, 'y.tw'], [9, 'x.tw'], [10, 'x.tw'], [10, 'y.tw']]),
        dnCase('中型隨機', ...dnsWorld(r, 500, 3000, true)),
        dnCase('大型', ...dnsWorld(r, 100000, 100000, true))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    p = 0\n    n = int(data[p]); p += 1\n    zone = {}\n    for _ in range(n):\n        name, typ, val, ttl = data[p], data[p + 1], data[p + 2], int(data[p + 3])\n        p += 4\n        zone[name] = (typ, val, ttl)\n    m = int(data[p]); p += 1\n    cache = {}                  # 名稱 → (記錄, 到期時間)\n    out = []\n    for _ in range(m):\n        t, name = int(data[p]), data[p + 1]\n        p += 2\n        misses = 0\n        # TODO: 沿著 CNAME 鏈解析，查快取、計算對外查詢次數、偵測迴圈\n        rec = zone.get(name)\n        out.append(f"{rec[1] if rec else \'NXDOMAIN\'} {misses}")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <unordered_map>\n#include <utility>\nusing namespace std;\n\nstruct Rec { string type, value; long long ttl; };\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    unordered_map<string, Rec> zone;\n    for (int i = 0; i < n; i++) {\n        string name;\n        Rec r;\n        cin >> name >> r.type >> r.value >> r.ttl;\n        zone[name] = r;\n    }\n    int m;\n    cin >> m;\n    unordered_map<string, pair<Rec, long long>> cache;   // 名稱 → (記錄, 到期時間)\n    string out;\n    for (int i = 0; i < m; i++) {\n        long long t;\n        string name;\n        cin >> t >> name;\n        int misses = 0;\n        // TODO: 沿著 CNAME 鏈解析，查快取、計算對外查詢次數、偵測迴圈\n        auto it = zone.find(name);\n        out += (it == zone.end() ? string("NXDOMAIN") : it->second.value) + " " + to_string(misses) + "\\n";\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nlet p = 0;\nconst n = +d[p++], zone = new Map();\nfor (let i = 0; i < n; i++) { zone.set(d[p], { type: d[p + 1], value: d[p + 2], ttl: +d[p + 3] }); p += 4; }\nconst m = +d[p++], cache = new Map(), out = [];\nfor (let i = 0; i < m; i++) {\n  const t = +d[p], name = d[p + 1]; p += 2;\n  let misses = 0;\n  // TODO: 沿著 CNAME 鏈解析，查快取、計算對外查詢次數、偵測迴圈\n  const rec = zone.get(name);\n  out.push(`${rec ? rec.value : "NXDOMAIN"} ${misses}`);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\n/* 提示：C 沒有內建的雜湊表，可以自己寫一個開放定址的雜湊表，或把名稱排序後二分搜尋。 */\nstatic char name[100005][64], val[100005][64];\n\nint main(void) {\n    int n, m;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) {\n        char type[8];\n        long long ttl;\n        scanf("%63s %7s %63s %lld", name[i], type, val[i], &ttl);\n    }\n    scanf("%d", &m);\n    for (int i = 0; i < m; i++) {\n        long long t;\n        char q[64];\n        scanf("%lld %63s", &t, q);\n        /* TODO: 解析 */\n        printf("NXDOMAIN 0\\n");\n    }\n    return 0;\n}\n'
    },
    hints: ['用雜湊表（dict / unordered_map / Map）存權威資料與快取。快取的值是（記錄, 到期時間），t < 到期時間才有效。', '每個查詢用一個集合記住這次鏈中已經走過的名稱：再遇到就是 LOOP。對外查詢次數只在快取沒有（或過期）時加 1；NXDOMAIN 不放進快取。'],
    explain: 'DNS 解析是一連串的查表：CNAME 讓一個名稱指向另一個名稱，所以要沿著鏈走，並用「走過的名稱」防止設定錯誤造成無窮迴圈。TTL 決定快取能用多久，熱門名稱大多直接命中快取，這就是 DNS 能撐住全世界查詢量的原因。每個查詢的工作量是鏈的長度，用雜湊表時總時間約 O((n + m) × 鏈長)。',
    tags: ['dns', 'cache', 'hash-map']
  });

  /* ---------- 第 6 章 Socket：TCP 位元組串流的訊息定界 ---------- */
  function frameStream(chunks) {
    const out = []; let buf = '', pos = 0, need = -1;
    for (const c of chunks) {
      buf += c;
      for (;;) {
        if (need < 0) { const k = buf.indexOf(':', pos); if (k < 0) break; need = +buf.slice(pos, k); pos = k + 1; }
        if (buf.length - pos < need) break;
        out.push(buf.slice(pos, pos + need)); pos += need; need = -1;
      }
      if (pos) { buf = buf.slice(pos); pos = 0; }
    }
    const rest = buf.length - pos + (need >= 0 ? String(need).length + 1 : 0);
    if (rest) out.push(`INCOMPLETE ${rest}`);
    return lines(out);
  }
  function makeStream(r, nMsg, maxLen, chunkMax, cut) {
    const PAY = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:';
    let s = Array.from({ length: nMsg }, () => { const n = ri(r, 1, maxLen); return n + ':' + Array.from({ length: n }, () => PAY[ri(r, 0, PAY.length - 1)]).join(''); }).join('');
    if (cut) s = s.slice(0, s.length - ri(r, 1, Math.min(5, s.length - 1)));
    const chunks = []; for (let i = 0; i < s.length;) { const k = ri(r, 1, chunkMax); chunks.push(s.slice(i, i + k)); i += k; }
    return chunks;
  }
  const fsCase = (name, chunks, visible) => T(name, `${chunks.length}\n${lines(chunks)}\n`, frameStream(chunks), visible);
  add({
    id: 'net.socket.length-framing', lesson: 5, title: 'TCP 沒有訊息邊界：長度前綴解析', timeLimitMs: 1000, outputBytes: 4 << 20,
    statement: '客戶端用「長度:內容」的格式送出一連串訊息（例如 5:Hello3:abc），但 TCP 是位元組串流，伺服器每次 recv 拿到的片段可能切在任何地方。給你伺服器依序收到的片段，請把它們接起來，切出每一則完整的訊息並依序輸出內容。內容可能包含數字與冒號，所以只能依長度切，不能依冒號切。所有片段處理完後，如果緩衝區還有沒湊齊的資料，輸出 INCOMPLETE 和緩衝區中剩下的位元組數（包含還沒處理的長度與冒號）。',
    input: '第一行 k（1 ≤ k ≤ 10⁶）；接著 k 行，每行一個非空片段，只含英文字母、數字與冒號。所有片段接起來是若干則完整訊息，最後可能多一段不完整的訊息開頭。長度是 1 到 10⁵ 的十進位整數、沒有前導 0，片段總長度不超過 4×10⁶。',
    output: '每則完整訊息一行（內容本身）；若最後有剩，再輸出一行 INCOMPLETE x。',
    cases: () => {
      const r = rng(2006);
      return [
        fsCase('範例：被切開也被合併', ['5:Hel', 'lo5:World3:a', 'bc'], true),
        fsCase('範例：內容含冒號與數字，最後不完整', ['4:12:3', '10:abc', 'de'], true),
        fsCase('每個位元組一個片段', [...'3:abc12:hello:world!'.replace('!', 'x')]),
        fsCase('一次收到全部', [makeStream(r, 50, 20, 1, false).join('')]),
        fsCase('長訊息切成很多段', makeStream(r, 3, 100000, 997, false)),
        fsCase('大量小片段，最後不完整', makeStream(r, 60000, 40, 9, true)),
        fsCase('大量隨機切法', makeStream(r, 20000, 150, 300, false))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split("\\n")\n    k = int(data[0])\n    chunks = data[1:1 + k]\n    out = []\n    buf = ""\n    for c in chunks:\n        buf += c\n        # TODO: 只要緩衝區裡有完整的「長度:內容」，就切出來\n    # 錯誤示範：依冒號切開（內容裡也可能有冒號！）\n    parts = buf.split(":")\n    out.extend(parts[1:])\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int k;\n    cin >> k;\n    string buf, chunk, out;\n    for (int i = 0; i < k; i++) {\n        cin >> chunk;\n        buf += chunk;\n        // TODO: 只要緩衝區裡有完整的「長度:內容」，就切出來\n    }\n    // 錯誤示範：依冒號切開（內容裡也可能有冒號！）\n    size_t p = buf.find(\':\');\n    if (p != string::npos) out += buf.substr(p + 1) + "\\n";\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const lines = readInput().split("\\n");\nconst k = +lines[0];\nlet buf = "";\nconst out = [];\nfor (let i = 1; i <= k; i++) {\n  buf += lines[i];\n  // TODO: 只要緩衝區裡有完整的「長度:內容」，就切出來\n}\n// 錯誤示範：依冒號切開（內容裡也可能有冒號！）\nout.push(...buf.split(":").slice(1));\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nstatic char buf[4100000], chunk[4100000];\n\nint main(void) {\n    int k;\n    scanf("%d", &k);\n    size_t len = 0;\n    for (int i = 0; i < k; i++) {\n        scanf("%s", chunk);\n        size_t n = strlen(chunk);\n        memcpy(buf + len, chunk, n);\n        len += n;\n        /* TODO: 只要緩衝區裡有完整的「長度:內容」，就切出來 */\n    }\n    buf[len] = 0;\n    char *p = strchr(buf, \':\');\n    if (p) printf("%s\\n", p + 1);\n    return 0;\n}\n'
    },
    hints: ['維護一個緩衝區與目前的讀取位置。狀態有兩種：還沒讀到長度（找下一個冒號，冒號前就是長度），或已經知道長度 need（緩衝區剩下的位元組 ≥ need 才能切出內容）。', '切出一則之後不要每次都把剩下的字串複製一份（會變成 O(n²)）；記住讀取位置，偶爾再把已處理的部分丟掉。最後剩下的位元組數 = 緩衝區長度 − 讀取位置（若已讀了長度，記得把「長度:」也算回去）。'],
    explain: 'TCP 保證位元組的順序與完整，但不保留 send 的邊界，所以應用層協定必須自己定界。長度前綴是最常見的做法（HTTP/2、gRPC、資料庫協定都是），解析時是一個兩狀態的小狀態機：讀長度、讀內容。內容可以是任意位元組（包括分隔符號），這是它比「用分隔字元切」更可靠的地方。每個位元組只被看過常數次，總時間 O(總長度)。',
    tags: ['socket', 'tcp', 'framing', 'state-machine']
  });

  /* ---------- 第 7 章 UDP：網際網路檢查和 ---------- */
  function inetSum(hex, init = 0) {
    let s = init;
    if (hex.length % 4) hex += '00';
    for (let i = 0; i < hex.length; i += 4) { s += parseInt(hex.slice(i, i + 4), 16); s = (s & 0xFFFF) + (s >>> 16); }
    return s;
  }
  const csOf = hex => (~inetSum(hex) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  const randHex = (r, n) => Array.from({ length: n }, () => ri(r, 0, 255).toString(16).padStart(2, '0')).join('');
  function ckQueries(r, q, maxLen) {
    return Array.from({ length: q }, () => {
      const hex = randHex(r, ri(r, 1, maxLen));
      if (r() < 0.4) return ['C', hex];
      const cs = csOf(hex), bad = r() < 0.5;
      if (!bad) return ['V', hex, cs];
      const i = ri(r, 0, hex.length - 1), flipped = hex.slice(0, i) + ((parseInt(hex[i], 16) ^ (1 << ri(r, 0, 3))).toString(16)) + hex.slice(i + 1);
      return ['V', flipped, cs];
    });
  }
  const ckAns = qs => lines(qs.map(([k, hex, cs]) => k === 'C' ? csOf(hex) : inetSum(hex, parseInt(cs, 16)) === 0xFFFF ? 'OK' : 'BAD'));
  const ckCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs.map(x => x.join(' ')))}\n`, ckAns(qs), visible);
  add({
    id: 'net.udp.checksum', lesson: 6, title: '計算與驗證網際網路檢查和', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '網際網路檢查和：把資料切成 16 位元的字（大端序；位元組數為奇數時最後補一個 0x00），全部用 1 的補數加法相加（超過 16 位元的進位加回最低位），最後每個位元取反。查詢 C 要你計算資料的檢查和；查詢 V 給你資料與收到的檢查和，請像接收端一樣驗證：把所有字與檢查和一起相加，結果是 0xFFFF 才正確。',
    input: '第一行 q（1 ≤ q ≤ 10⁵）；接著 q 行，「C 十六進位資料」或「V 十六進位資料 檢查和」。資料是小寫十六進位、偶數個字元、至少 1 位元組；檢查和是 4 位大寫十六進位。所有資料總長度不超過 4×10⁶ 個字元。',
    output: 'C 查詢輸出 4 位大寫十六進位的檢查和；V 查詢輸出 OK 或 BAD。',
    cases: () => {
      const r = rng(2007);
      return [
        ckCase('範例', [['C', '45000030442200'.slice(0, 12)], ['C', 'bf006d88'], ['V', 'bf006d88', 'D376'], ['V', 'bf016d88', 'D376'], ['C', 'ff']], true),
        ckCase('進位一直繞回', [['C', 'ffffffffffff'], ['C', '0000'], ['V', '0000', 'FFFF'], ['C', 'ffff0001'], ['V', 'ffff', '0000']]),
        ckCase('奇數長度', ckQueries(r, 200, 15).map(x => [x[0], x[1].length % 4 ? x[1] : x[1] + 'a5', ...(x[0] === 'V' ? [csOf(x[1].length % 4 ? x[1] : x[1] + 'a5')] : [])])),
        ckCase('隨機', ckQueries(r, 3000, 64)),
        ckCase('大型封包', ckQueries(r, 1500, 1300)),
        ckCase('大量小封包', ckQueries(r, 100000, 6))
      ];
    },
    starter: {
      python: 'import sys\n\ndef ones_sum(data: bytes, init=0):\n    s = init\n    # TODO: 每 2 個位元組組成一個 16 位元字相加，進位要繞回（奇數長度補 0）\n    return s\n\ndef main():\n    tok = sys.stdin.read().split()\n    q = int(tok[0])\n    p = 1\n    out = []\n    for _ in range(q):\n        kind, data = tok[p], bytes.fromhex(tok[p + 1])\n        p += 2\n        if kind == "C":\n            out.append(f"{~ones_sum(data) & 0xFFFF:04X}")\n        else:\n            cs = int(tok[p], 16)\n            p += 1\n            out.append("OK" if ones_sum(data, cs) == 0xFFFF else "BAD")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <cstdio>\n#include <cstdint>\nusing namespace std;\n\nuint32_t onesSum(const string& hex, uint32_t s) {\n    // TODO: 每 4 個十六進位字元（2 個位元組）組成一個字相加，進位要繞回；奇數個位元組要補 0\n    return s;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    string out;\n    while (q--) {\n        string kind, hex;\n        cin >> kind >> hex;\n        char buf[8];\n        if (kind == "C") {\n            snprintf(buf, sizeof buf, "%04X", ~onesSum(hex, 0) & 0xFFFF);\n            out += buf;\n        } else {\n            string cs;\n            cin >> cs;\n            out += onesSum(hex, stoul(cs, nullptr, 16)) == 0xFFFF ? "OK" : "BAD";\n        }\n        out += "\\n";\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const t = readInput().trim().split(/\\s+/);\nconst q = +t[0], out = [];\nconst onesSum = (hex, s) => {\n  // TODO: 每 4 個十六進位字元相加，進位要繞回；奇數個位元組要補 0\n  return s;\n};\nlet p = 1;\nfor (let i = 0; i < q; i++) {\n  const kind = t[p], hex = t[p + 1]; p += 2;\n  if (kind === "C") out.push((~onesSum(hex, 0) & 0xFFFF).toString(16).toUpperCase().padStart(4, "0"));\n  else { const cs = parseInt(t[p++], 16); out.push(onesSum(hex, cs) === 0xFFFF ? "OK" : "BAD"); }\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nstatic char hex[4100000];\n\nunsigned onesSum(const char *h, unsigned s) {\n    /* TODO: 每 4 個十六進位字元相加，進位要繞回；奇數個位元組要補 0 */\n    return s;\n}\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        char kind[2];\n        scanf("%1s %s", kind, hex);\n        if (kind[0] == \'C\') printf("%04X\\n", ~onesSum(hex, 0) & 0xFFFF);\n        else {\n            unsigned cs;\n            scanf("%x", &cs);\n            puts(onesSum(hex, cs) == 0xFFFF ? "OK" : "BAD");\n        }\n    }\n    return 0;\n}\n'
    },
    hints: ['每 2 個位元組（4 個十六進位字元）組成一個 16 位元的字，高位元組在前。位元組數是奇數時，最後一個字是「那個位元組 × 256」。', '每加一個字就做一次 s = (s & 0xFFFF) + (s >> 16)，讓溢出的進位繞回；最後 ~s & 0xFFFF 就是檢查和。驗證時把檢查和當作初始值一起加。'],
    explain: '1 的補數和的特性是「進位繞回」，所以結果與字的順序、位元組序都無關，硬體與軟體都很容易計算，也能在路由器改寫 TTL 時增量更新。接收端把檢查和一起加，正確時得到全 1。但兩個互相抵消的錯誤偵測不到，所以連結層另外使用更強的 CRC。',
    tags: ['checksum', 'udp', 'bit-manipulation']
  });

  /* ---------- 第 8 章 可靠傳輸：停等協定的時間 ---------- */
  function stopWait(n, RTT, TO, ev) {
    let t = 0, sent = 0, dup = 0, i = 0;
    for (let k = 0; k < n; k++) {
      let delivered = false;
      for (;;) {
        const e = i < ev.length ? ev[i] : 'o'; i++; sent++;
        if (e !== 'd') { if (delivered) dup++; delivered = true; }
        if (e === 'o') { t += RTT; break; }
        t += TO;
      }
    }
    return `${t} ${sent} ${dup}`;
  }
  const swCase = (name, n, RTT, TO, ev, visible) => T(name, `${n} ${RTT} ${TO}\n${ev}\n`, stopWait(n, RTT, TO, ev), visible);
  const evs = (r, len, pd, pa) => Array.from({ length: len }, () => { const x = r(); return x < pd ? 'd' : x < pd + pa ? 'a' : 'o'; }).join('');
  add({
    id: 'net.rdt.stop-and-wait', lesson: 7, title: '停等協定：重傳、重複與總時間', timeLimitMs: 1000,
    statement: '用 rdt 3.0（停等協定）可靠地送出 n 個封包。每次傳送的結果依序由一個字串描述：o 表示資料與 ACK 都順利（RTT 毫秒後收到 ACK，接著送下一個封包）；d 表示資料遺失；a 表示資料送到了但 ACK 遺失。d 與 a 時發送端要等逾時 TO 毫秒後重傳同一個封包。接收端收到已經交給上層的封包時，視為重複並丟棄（但仍回 ACK）。字串用完之後的傳送都是 o。時間從 0 開始，忽略傳輸時間。請輸出最後一個 ACK 抵達的時間、總傳送次數、接收端丟棄的重複封包數。',
    input: '第一行 n RTT TO（1 ≤ n ≤ 10⁶，1 ≤ RTT ≤ TO ≤ 10⁶）；第二行是只含 o、d、a 的字串（長度 1 到 2×10⁶）。',
    output: '一行三個整數：總時間、傳送次數、重複封包數。',
    cases: () => {
      const r = rng(2008);
      return [
        swCase('範例：ACK 遺失造成重複', 3, 10, 25, 'oaoo', true),
        swCase('範例：資料遺失', 2, 30, 100, 'ddoo', true),
        swCase('連續 ACK 遺失', 1, 5, 5, 'aaaa'),
        swCase('字串比需要的長', 2, 7, 9, 'oooooodddaaa'),
        swCase('字串不夠長', 5, 3, 8, 'd'),
        swCase('隨機', 1000, 40, 120, evs(r, 1300, 0.1, 0.1)),
        swCase('大型：高遺失率', 1000000, 1000000, 1000000, evs(r, 2000000, 0.2, 0.15))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, rtt, to = int(data[0]), int(data[1]), int(data[2])\n    events = data[3]\n    t = sent = dup = 0\n    i = 0\n    for k in range(n):\n        # TODO: 一直傳送同一個封包，直到結果是 o；記錄時間、次數與重複\n        sent += 1\n        t += rtt\n    print(t, sent, dup)\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    long long n, rtt, to;\n    string ev;\n    cin >> n >> rtt >> to >> ev;\n    long long t = 0, sent = 0, dup = 0;\n    size_t i = 0;\n    for (long long k = 0; k < n; k++) {\n        // TODO: 一直傳送同一個封包，直到結果是 o；記錄時間、次數與重複\n        sent++;\n        t += rtt;\n    }\n    cout << t << " " << sent << " " << dup << "\\n";\n    return 0;\n}\n',
      javascript: 'const [head, ev] = readInput().trim().split("\\n");\nconst [n, rtt, to] = head.split(" ").map(Number);\nlet t = 0, sent = 0, dup = 0, i = 0;\nfor (let k = 0; k < n; k++) {\n  // TODO: 一直傳送同一個封包，直到結果是 o；記錄時間、次數與重複\n  sent++;\n  t += rtt;\n}\nconsole.log(`${t} ${sent} ${dup}`);\n',
      c: '#include <stdio.h>\n\nstatic char ev[2000005];\n\nint main(void) {\n    long long n, rtt, to;\n    scanf("%lld %lld %lld %s", &n, &rtt, &to, ev);\n    long long t = 0, sent = 0, dup = 0;\n    for (long long k = 0; k < n; k++) {\n        /* TODO: 一直傳送同一個封包，直到結果是 o；記錄時間、次數與重複 */\n        sent++;\n        t += rtt;\n    }\n    printf("%lld %lld %lld\\n", t, sent, dup);\n    return 0;\n}\n'
    },
    hints: ['對每個封包用一個迴圈：取下一個事件（字串用完就當 o），傳送次數加 1；o 時時間加 RTT 並換下一個封包，d 與 a 時時間加 TO 並重傳。', '用一個旗標記住「這個封包是否已經交給上層」：a 與 o 都會讓資料抵達，抵達時若旗標已經是真，就是重複。時間可能超過 2³¹，用 64 位元整數。'],
    explain: '停等協定的每個封包都要等一個 RTT，遺失時還要多等一個逾時；ACK 遺失時資料其實已經送到，重傳造成的重複由序號辨認並丟棄，但仍要回 ACK。總時間 = 成功次數 × RTT + 失敗次數 × TO，正好說明為什麼停等協定的效率由 RTT 主導。',
    tags: ['rdt', 'simulation', 'timeout']
  });

  /* ---------- 第 9 章 管線化：Go-Back-N 與 Selective Repeat 的傳送次數 ---------- */
  function gbnSr(n, N, lostPairs) {
    const lost = new Set(lostPairs.map(([s, k]) => s * 1e7 + k));
    const run = gbn => {
      const tries = new Int32Array(n), acked = new Uint8Array(n), fq = [], fl = []; let head = 0, base = 0, nxt = 0, expected = 0, sent = 0;
      const send = s => { tries[s]++; sent++; fq.push(s); fl.push(lost.has(s * 1e7 + tries[s])); };
      const fill = () => { while (nxt < Math.min(base + N, n)) send(nxt++); };
      fill();
      while (base < n) {
        while (head < fq.length) {
          const s = fq[head], dropped = fl[head]; head++;
          if (dropped) continue;
          if (gbn) { if (s === expected) { expected++; base = expected; fill(); } }
          else { acked[s] = 1; while (base < n && acked[base]) base++; fill(); }
        }
        if (base >= n) break;
        for (let s = base; s < nxt; s++) if (gbn || !acked[s]) send(s);
      }
      return sent;
    };
    return `${run(true)} ${run(false)}`;
  }
  const gsCase = (name, n, N, lostPairs, visible) => T(name, `${n} ${N} ${lostPairs.length}\n${lines(lostPairs.map(x => x.join(' ')))}\n`, gbnSr(n, N, lostPairs), visible);
  const lossList = (r, n, L, maxTry) => { const s = new Set(), out = []; while (out.length < L) { const p = [ri(r, 0, n - 1), ri(r, 1, maxTry)]; const k = p[0] * 10 + p[1]; if (!s.has(k)) { s.add(k); out.push(p); } } return out; };
  add({
    id: 'net.window.gbn-sr', lesson: 8, title: 'Go-Back-N 與 Selective Repeat：要傳幾次？', timeLimitMs: 1000,
    statement: '用視窗大小 N 的管線化協定送出封包 P0…P(n−1)，分別計算 Go-Back-N 與 Selective Repeat 的總傳送次數。模型：發送端一開始依序送出視窗內的封包；在途的封包依送出順序逐一抵達接收端，若「P_s 的第 k 次傳送」在遺失清單中就遺失。ACK 不會遺失、立刻抵達。GBN：接收端只接受序號等於期待值的封包（期待值加 1、回累積 ACK），其他丟棄；發送端收到 ACK 後 base 前滑。SR：接收端接受任何抵達的封包並個別確認；發送端把它標為已確認，base 滑到第一個未確認的序號。兩者在 base 前滑後都立刻依序送出視窗內（序號 < base + N）尚未送過的新封包，排在在途封包的最後面。當在途封包全部處理完而 base < n 時發生逾時：GBN 依序重傳 base 到「下一個新序號 − 1」的所有封包；SR 只依序重傳其中尚未確認的封包。',
    input: '第一行 n N L（1 ≤ n ≤ 10⁵，1 ≤ N ≤ 1000，0 ≤ L ≤ 3000）；接著 L 行，每行 s k（0 ≤ s < n，1 ≤ k ≤ 5），表示 P_s 的第 k 次傳送會遺失，不會重複。',
    output: '一行兩個整數：Go-Back-N 與 Selective Repeat 的總傳送次數。',
    cases: () => {
      const r = rng(2009);
      return [
        gsCase('範例：課文中的 P2 遺失', 6, 4, [[2, 1]], true),
        gsCase('範例：重傳也遺失', 8, 3, [[1, 1], [1, 2], [5, 1]], true),
        gsCase('沒有遺失', 1000, 7, []),
        gsCase('視窗為 1：停等', 50, 1, lossList(r, 50, 20, 2)),
        gsCase('第一個封包一直遺失', 10, 5, [[0, 1], [0, 2], [0, 3], [0, 4]]),
        gsCase('中型隨機', 5000, 30, lossList(r, 5000, 400, 3)),
        gsCase('大型：大視窗', 100000, 1000, lossList(r, 100000, 3000, 2))
      ];
    },
    starter: {
      python: 'import sys\nfrom collections import deque\n\ndef simulate(n, N, lost, gbn):\n    tries = [0] * n\n    acked = [False] * n\n    flight = deque()\n    sent = 0\n    base = nxt = expected = 0\n    def send(s):\n        nonlocal sent\n        tries[s] += 1\n        sent += 1\n        flight.append((s, (s, tries[s]) in lost))\n    while nxt < min(base + N, n):\n        send(nxt)\n        nxt += 1\n    # TODO: 處理在途的封包、滑動視窗、逾時重傳，直到 base == n\n    return sent\n\ndef main():\n    d = sys.stdin.read().split()\n    n, N, L = int(d[0]), int(d[1]), int(d[2])\n    lost = {(int(d[3 + 2 * i]), int(d[4 + 2 * i])) for i in range(L)}\n    print(simulate(n, N, lost, True), simulate(n, N, lost, False))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <vector>\n#include <deque>\n#include <set>\n#include <algorithm>\n#include <utility>\nusing namespace std;\n\nlong long simulate(int n, int N, const set<pair<int, int>>& lost, bool gbn) {\n    vector<int> tries(n, 0);\n    vector<char> acked(n, 0);\n    deque<pair<int, bool>> flight;\n    long long sent = 0;\n    int base = 0, nxt = 0, expected = 0;\n    auto send = [&](int s) {\n        tries[s]++;\n        sent++;\n        flight.push_back({s, lost.count({s, tries[s]}) > 0});\n    };\n    while (nxt < min(base + N, n)) send(nxt++);\n    // TODO: 處理在途的封包、滑動視窗、逾時重傳，直到 base == n\n    return sent;\n}\n\nint main() {\n    int n, N, L;\n    cin >> n >> N >> L;\n    set<pair<int, int>> lost;\n    for (int i = 0; i < L; i++) {\n        int s, k;\n        cin >> s >> k;\n        lost.insert({s, k});\n    }\n    cout << simulate(n, N, lost, true) << " " << simulate(n, N, lost, false) << "\\n";\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst [n, N, L] = d;\nconst lost = new Set();\nfor (let i = 0; i < L; i++) lost.add(d[3 + 2 * i] + "@" + d[4 + 2 * i]);\nfunction simulate(gbn) {\n  const tries = new Array(n).fill(0), acked = new Array(n).fill(false), flight = [];\n  let sent = 0, base = 0, nxt = 0, expected = 0, head = 0;\n  const send = s => { tries[s]++; sent++; flight.push([s, lost.has(s + "@" + tries[s])]); };\n  while (nxt < Math.min(base + N, n)) send(nxt++);\n  // TODO: 處理在途的封包、滑動視窗、逾時重傳，直到 base == n\n  return sent;\n}\nconsole.log(simulate(true) + " " + simulate(false));\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int n, N, L;\n    scanf("%d %d %d", &n, &N, &L);\n    int *ls = malloc(sizeof(int) * (L + 1)), *lk = malloc(sizeof(int) * (L + 1));\n    for (int i = 0; i < L; i++) scanf("%d %d", &ls[i], &lk[i]);\n    /* TODO: 分別模擬 GBN 與 SR（在途佇列可以用一個大陣列加上讀取位置） */\n    long long gbn = n, sr = n;\n    printf("%lld %lld\\n", gbn, sr);\n    return 0;\n}\n'
    },
    hints: ['用佇列保存在途的封包（序號, 是否遺失），「是否遺失」在送出時就由 (序號, 第幾次傳送) 決定。處理一個封包：沒遺失就依協定更新接收端與發送端，base 前滑後立刻補送新封包到佇列尾端。', '佇列清空時若 base < n 就是逾時：GBN 重傳 base…nxt−1 全部，SR 只重傳其中沒被確認的。每次逾時至少對應一次遺失，所以總工作量約 O(n + L × N)。'],
    explain: '兩種協定的差別全在接收端：GBN 不緩衝亂序的封包，一個遺失會讓後面整個視窗都白送；SR 緩衝並個別確認，只重傳真正遺失的封包。遺失越多、視窗越大，GBN 浪費的頻寬越多。這也解釋了 TCP 為什麼加入 SACK 選項，讓行為更接近 SR。',
    tags: ['sliding-window', 'go-back-n', 'selective-repeat', 'simulation']
  });

  /* ---------- 第 10 章 TCP：序號與 ACK 號 ---------- */
  function tcpSeq(x, y, ops) {
    const M = 4294967296, md = v => ((v % M) + M) % M, out = [];
    let c = md(x + 1), s = md(y + 1);
    out.push(`C>S SYN seq=${x}`, `S>C SYN+ACK seq=${y} ack=${c}`, `C>S ACK seq=${c} ack=${s}`);
    for (const op of ops) {
      if (op[0] === 'C' && op.length === 2 && op[1] !== 'F') { out.push(`C>S DATA seq=${c} ack=${s} len=${op[1]}`); c = md(c + op[1]); }
      else if (op[0] === 'S' && op.length === 2 && op[1] !== 'F') { out.push(`S>C DATA seq=${s} ack=${c} len=${op[1]}`); s = md(s + op[1]); }
      else if (op[0] === 'CF') { out.push(`C>S FIN seq=${c} ack=${s}`); c = md(c + 1); }
      else { out.push(`S>C FIN seq=${s} ack=${c}`); s = md(s + 1); }
    }
    return lines(out);
  }
  function tcpOps(r, m) { const ops = []; let cf = false, sf = false; for (let i = 0; i < m; i++) { const who = r() < 0.5 ? 'C' : 'S'; if ((who === 'C' && cf) || (who === 'S' && sf)) continue; if (i > m - 3 && r() < 0.7) { ops.push([who + 'F']); if (who === 'C') cf = true; else sf = true; } else ops.push([who, ri(r, 1, pick(r, [10, 1460, 65535, 2000000]))]); } return ops; }
  const tsCase = (name, x, y, ops, visible) => T(name, `${x} ${y}\n${ops.length}\n${lines(ops.map(o => o.join(' ')))}\n`, tcpSeq(x, y, ops), visible);
  add({
    id: 'net.tcp.seq-ack', lesson: 9, title: 'TCP 的序號與 ACK 號', timeLimitMs: 1000, outputBytes: 4 << 20,
    statement: '客戶端與伺服器的初始序號分別是 x 與 y。先完成三向交握，接著依序發生一連串操作：C k 是客戶端送出 k 位元組資料、S k 是伺服器送出 k 位元組、CF 是客戶端送 FIN、SF 是伺服器送 FIN。每個區段都在下一個操作之前送達，而且每個區段都攜帶 ACK，ACK 號是「對方下一個位元組的序號」。SYN 與 FIN 各佔一個序號；序號是 32 位元，超過 2³² − 1 從 0 繞回。請輸出每個區段的序號與 ACK 號。',
    input: '第一行 x y（0 ≤ x, y < 2³²）；第二行 m（0 ≤ m ≤ 8×10⁴）；接著 m 行操作。k 介於 1 到 2×10⁶。某一方送出 FIN 之後不會再送資料或 FIN。',
    output: '前三行是交握：「C>S SYN seq=x」、「S>C SYN+ACK seq=y ack=x+1」、「C>S ACK seq=x+1 ack=y+1」（數值都要繞回）。之後每個操作一行：「C>S DATA seq=… ack=… len=k」、「S>C DATA seq=… ack=… len=k」、「C>S FIN seq=… ack=…」或「S>C FIN seq=… ack=…」。',
    cases: () => {
      const r = rng(2010);
      return [
        tsCase('範例：課文的連線', 1000, 5000, [['C', 200], ['S', 500], ['CF'], ['SF']], true),
        tsCase('範例：序號繞回', 4294967290, 4294967295, [['C', 10], ['S', 3], ['C', 2000000], ['SF'], ['C', 1], ['CF']], true),
        tsCase('只有交握', 0, 0, []),
        tsCase('伺服器先關閉，之後客戶端還在送', 77, 4294967294, [['S', 1], ['SF'], ['C', 5], ['C', 7], ['CF']]),
        tsCase('隨機', ri(r, 0, 4294967295), ri(r, 0, 4294967295), tcpOps(r, 500)),
        tsCase('大型', ri(r, 0, 4294967295), ri(r, 0, 4294967295), tcpOps(r, 75000))
      ];
    },
    starter: {
      python: 'import sys\n\nMOD = 2 ** 32\n\ndef main():\n    data = sys.stdin.read().split("\\n")\n    x, y = map(int, data[0].split())\n    m = int(data[1])\n    c, s = x, y                      # 雙方「下一個要用的序號」\n    out = [f"C>S SYN seq={x}"]\n    # TODO: SYN 佔一個序號；寫出 SYN+ACK 與 ACK\n    for i in range(m):\n        op = data[2 + i].split()\n        if op[0] == "C" or op[0] == "S":\n            k = int(op[1])\n            # TODO: 輸出資料區段並更新序號（記得繞回）\n        else:\n            pass  # TODO: FIN 也佔一個序號\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <cstdint>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    long long x, y;\n    int m;\n    cin >> x >> y >> m;\n    long long c = x, s = y;   // 雙方「下一個要用的序號」（想一想：用 uint32_t 會自動繞回）\n    string out = "C>S SYN seq=" + to_string(x) + "\\n";\n    // TODO: SYN 佔一個序號；寫出 SYN+ACK 與 ACK\n    for (int i = 0; i < m; i++) {\n        string op;\n        cin >> op;\n        if (op == "C" || op == "S") {\n            long long k;\n            cin >> k;\n            // TODO: 輸出資料區段並更新序號\n        } else {\n            // TODO: FIN 也佔一個序號\n        }\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const lines = readInput().split("\\n");\nconst [x, y] = lines[0].split(" ").map(Number);\nconst m = +lines[1];\nlet c = x, s = y;   // 雙方「下一個要用的序號」\nconst out = [`C>S SYN seq=${x}`];\n// TODO: SYN 佔一個序號；寫出 SYN+ACK 與 ACK\nfor (let i = 0; i < m; i++) {\n  const op = lines[2 + i].split(" ");\n  if (op[0] === "C" || op[0] === "S") {\n    const k = +op[1];\n    // TODO: 輸出資料區段並更新序號（記得繞回）\n  } else {\n    // TODO: FIN 也佔一個序號\n  }\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    unsigned long long x, y;\n    int m;\n    scanf("%llu %llu %d", &x, &y, &m);\n    printf("C>S SYN seq=%llu\\n", x);\n    /* TODO: SYN 佔一個序號；寫出 SYN+ACK 與 ACK */\n    for (int i = 0; i < m; i++) {\n        char op[4];\n        scanf("%3s", op);\n        if (strcmp(op, "C") == 0 || strcmp(op, "S") == 0) {\n            long long k;\n            scanf("%lld", &k);\n            /* TODO: 輸出資料區段並更新序號 */\n        } else {\n            /* TODO: FIN 也佔一個序號 */\n        }\n    }\n    return 0;\n}\n'
    },
    hints: ['只要記住兩個值：客戶端下一個要用的序號 c、伺服器下一個要用的序號 s。客戶端送出的區段 seq = c、ack = s；伺服器相反。', 'SYN 與 FIN 送出後序號加 1，資料送出後加 k；每次都對 2³² 取餘數。C++ 可以直接用 uint32_t 讓它自然繞回。'],
    explain: 'TCP 的序號計的是位元組，ACK 號是「下一個期待的位元組」，所以只要追蹤雙方各自的下一個序號就能算出所有區段。SYN 與 FIN 雖然不帶資料，卻各佔一個序號，這樣它們也能被確認。32 位元序號在高速連線上幾秒內就會繞回，所有比較都要以模 2³² 的方式進行。',
    tags: ['tcp', 'sequence-number', 'modular-arithmetic']
  });

  /* ---------- 第 11 章 壅塞控制：Reno 與 Tahoe ---------- */
  function cwndSim(alg, ss0, ev) {
    let cwnd = 1, ss = ss0, total = 0;
    for (const e of ev) {
      total += cwnd;
      if (e === 'o') cwnd = cwnd < ss ? Math.min(cwnd * 2, ss) : cwnd + 1;
      else { ss = Math.max(Math.floor(cwnd / 2), 2); cwnd = e === 't' || alg === 'TAHOE' ? 1 : ss; }
    }
    return `${total} ${cwnd} ${ss}`;
  }
  const cwCase = (name, alg, ss, ev, visible) => T(name, `${alg} ${ss}\n${ev}\n`, cwndSim(alg, ss, ev), visible);
  const cwEv = (r, len, pd, pt) => Array.from({ length: len }, () => { const x = r(); return x < pd ? 'd' : x < pd + pt ? 't' : 'o'; }).join('');
  add({
    id: 'net.tcp.cwnd', lesson: 10, title: 'TCP 壅塞視窗模擬', timeLimitMs: 1000,
    statement: '以 RTT 為單位模擬 TCP 的壅塞視窗（單位 MSS）。一開始 cwnd = 1、ssthresh = S。每一輪送出 cwnd 個區段，然後依這一輪的事件調整：o（沒有遺失）時，若 cwnd < ssthresh 則 cwnd = min(2 × cwnd, ssthresh)，否則 cwnd 加 1；d（3 個重複 ACK）或 t（逾時）時，ssthresh = max(⌊cwnd / 2⌋, 2)，然後 t 一律令 cwnd = 1；d 在 RENO 令 cwnd = ssthresh，在 TAHOE 令 cwnd = 1。請輸出所有輪合計送出的區段數，以及最後的 cwnd 與 ssthresh。',
    input: '第一行「演算法 S」，演算法是 RENO 或 TAHOE，1 ≤ S ≤ 10⁹；第二行是只含 o、d、t 的事件字串（長度 1 到 10⁶）。',
    output: '一行三個整數：區段總數、最後的 cwnd、最後的 ssthresh。',
    cases: () => {
      const r = rng(2011);
      return [
        cwCase('範例：Reno', 'RENO', 8, 'oooooooDooo'.toLowerCase(), true),
        cwCase('範例：Tahoe', 'TAHOE', 8, 'ooooooodooo', true),
        cwCase('一開始就逾時', 'RENO', 64, 'tttooo'),
        cwCase('ssthresh 很小', 'RENO', 1, 'oooodoooo'),
        cwCase('隨機 Reno', 'RENO', 32, cwEv(r, 3000, 0.02, 0.005)),
        cwCase('隨機 Tahoe', 'TAHOE', 16, cwEv(r, 3000, 0.03, 0.01)),
        cwCase('大型：很少遺失（總數超過 2³¹）', 'RENO', 64, 'o'.repeat(999990) + 'dotoo' + 'ooooo'),
        cwCase('大型：混合', 'TAHOE', 500, cwEv(r, 1000000, 0.0005, 0.0001))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    alg, ss = data[0], int(data[1])\n    events = data[2]\n    cwnd, total = 1, 0\n    for e in events:\n        total += cwnd\n        if e == "o":\n            cwnd += 1            # TODO: 慢啟動時應該加倍（但不超過 ssthresh）\n        else:\n            pass                 # TODO: 遺失時調整 ssthresh 與 cwnd\n    print(total, cwnd, ss)\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string alg, ev;\n    long long ss;\n    cin >> alg >> ss >> ev;\n    int cwnd = 1;\n    int total = 0;              // 想一想：總數會不會超過 int？\n    for (char e : ev) {\n        total += cwnd;\n        if (e == \'o\') cwnd += 1; // TODO: 慢啟動時應該加倍（但不超過 ssthresh）\n        // TODO: 遺失時調整 ssthresh 與 cwnd\n    }\n    cout << total << " " << cwnd << " " << ss << "\\n";\n    return 0;\n}\n',
      javascript: 'const [alg, ssStr, ev] = readInput().trim().split(/\\s+/);\nlet ss = +ssStr, cwnd = 1, total = 0;\nfor (const e of ev) {\n  total += cwnd;\n  if (e === "o") cwnd += 1;   // TODO: 慢啟動時應該加倍（但不超過 ssthresh）\n  // TODO: 遺失時調整 ssthresh 與 cwnd\n}\nconsole.log(`${total} ${cwnd} ${ss}`);\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nstatic char ev[1000005];\n\nint main(void) {\n    char alg[8];\n    long long ss;\n    scanf("%7s %lld %s", alg, &ss, ev);\n    int cwnd = 1, total = 0;   /* 想一想：總數會不會超過 int？ */\n    for (int i = 0; ev[i]; i++) {\n        total += cwnd;\n        if (ev[i] == \'o\') cwnd += 1;  /* TODO: 慢啟動時應該加倍 */\n    }\n    printf("%d %d %lld\\n", total, cwnd, ss);\n    return 0;\n}\n'
    },
    hints: ['照規則逐輪模擬即可：先把這一輪的 cwnd 加進總數，再依事件更新。注意慢啟動加倍時不能超過 ssthresh。', '很少遺失時 cwnd 每輪加 1，跑 10⁶ 輪後可以成長到 10⁶ 左右，總數約 5×10¹¹，超過 32 位元整數。'],
    explain: '這是課本鋸齒圖背後的狀態機：慢啟動指數成長、壅塞避免線性成長、遺失時乘法減少。Reno 對重複 ACK 只減半，Tahoe 與逾時都回到 1，所以在零星遺失的情況下 Reno 的總傳送量明顯較大。長時間模擬時總量會超過 32 位元，是常見的整數溢位陷阱。',
    tags: ['congestion-control', 'tcp', 'simulation', 'overflow']
  });

  /* ---------- 第 12 章 IPv4：VLSM 子網路配置 ---------- */
  const ip2n = s => s.split('.').reduce((a, x) => a * 256 + +x, 0), n2ip = n => [24, 16, 8, 0].map(k => Math.floor(n / 2 ** k) % 256).join('.');
  function vlsmPlan(block, hosts) {
    const [ip, k0s] = block.split('/'), k0 = +k0s, start = ip2n(ip), end = start + 2 ** (32 - k0), res = Array(hosts.length).fill('FAIL');
    const order = hosts.map((h, i) => [h, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]); let cur = start;
    for (const [h, i] of order) { let k = 2; while (2 ** k - 2 < h) k++; const p = 32 - k, size = 2 ** k; if (p < k0 || cur + size > end) continue; res[i] = `${n2ip(cur)}/${p}`; cur += size; }
    return res;
  }
  const vlCase = (name, sc, visible) => T(name, `${sc.length}\n${sc.map(([b, hs]) => `${b} ${hs.length}\n${hs.join(' ')}`).join('\n')}\n`, lines(sc.flatMap(([b, hs]) => vlsmPlan(b, hs))), visible);
  function vlRand(r, n, k0) { const base = Math.floor(r() * 2 ** k0) * 2 ** (32 - k0); return [`${n2ip(base)}/${k0}`, Array.from({ length: n }, () => Math.max(1, Math.floor(2 ** (r() * (32 - k0)) * 0.7)))]; }
  add({
    id: 'net.ip.vlsm', lesson: 11, title: 'VLSM：把位址區塊分給各個子網路', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '給你一個位址區塊（CIDR，網路位址已對齊）與各子網路需要的主機數，請用 VLSM 配置。需要 h 台主機的子網路，主機部分要有 k 位元，k 是滿足 k ≥ 2 且 2ᵏ − 2 ≥ h 的最小整數，前綴長度是 32 − k。依主機數由大到小處理（相同時先出現的先處理），每個子網路放在目前還沒用掉的最低位址；若前綴比區塊的前綴還短，或剩下的空間放不下，就配置失敗並跳過它，繼續處理後面的需求。',
    input: '第一行 T（1 ≤ T ≤ 2000）。每組第一行「區塊 n」（區塊如 200.23.16.0/23，1 ≤ n ≤ 1000），第二行 n 個主機數（1 ≤ h ≤ 10⁹）。所有組的 n 總和不超過 10⁵。',
    output: '依輸入順序，每個需求一行：配置到的子網路「網路位址/前綴」或 FAIL。',
    cases: () => {
      const r = rng(2012);
      return [
        vlCase('範例：課文中的三個部門', [['200.23.16.0/23', [60, 120, 10]]], true),
        vlCase('範例：空間不足與相同需求', [['192.168.1.0/24', [100, 100, 50, 2, 1]], ['10.0.0.0/30', [2, 1]]], true),
        vlCase('大需求放不下、小需求繼續', [['172.16.0.0/22', [2000, 500, 300, 200, 30, 30]]]),
        vlCase('整個位址空間', [['0.0.0.0/0', [1000000000, 1000000000, 1000000000, 1000000000, 5]]]),
        vlCase('隨機', Array.from({ length: 300 }, () => vlRand(r, ri(r, 1, 12), ri(r, 8, 28)))),
        vlCase('大型', Array.from({ length: 100 }, () => vlRand(r, 1000, ri(r, 4, 16))))
      ];
    },
    starter: {
      python: 'import sys\n\ndef ip2n(s):\n    a, b, c, d = map(int, s.split("."))\n    return (a << 24) | (b << 16) | (c << 8) | d\n\ndef n2ip(n):\n    return ".".join(str((n >> k) & 255) for k in (24, 16, 8, 0))\n\ndef main():\n    data = sys.stdin.read().split()\n    T = int(data[0])\n    p = 1\n    out = []\n    for _ in range(T):\n        block, n = data[p], int(data[p + 1])\n        hosts = list(map(int, data[p + 2:p + 2 + n]))\n        p += 2 + n\n        ip, k0 = block.split("/")\n        start, k0 = ip2n(ip), int(k0)\n        res = ["FAIL"] * n\n        # TODO: 依主機數由大到小配置，算出每個需求的前綴長度與位址\n        out.extend(res)\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nstring n2ip(unsigned long long n) {\n    return to_string(n >> 24 & 255) + "." + to_string(n >> 16 & 255) + "." + to_string(n >> 8 & 255) + "." + to_string(n & 255);\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int T;\n    cin >> T;\n    string out;\n    while (T--) {\n        string block;\n        int n;\n        cin >> block >> n;\n        vector<long long> h(n);\n        for (auto &x : h) cin >> x;\n        unsigned a, b, c, d, k0;\n        sscanf(block.c_str(), "%u.%u.%u.%u/%u", &a, &b, &c, &d, &k0);\n        unsigned long long start = (unsigned long long)a << 24 | b << 16 | c << 8 | d;\n        vector<string> res(n, "FAIL");\n        // TODO: 依主機數由大到小配置（注意：/0 的區塊有 2^32 個位址）\n        for (auto &s : res) out += s + "\\n";\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst T = +d[0], out = [];\nconst ip2n = s => s.split(".").reduce((a, x) => a * 256 + +x, 0);\nconst n2ip = n => [24, 16, 8, 0].map(k => Math.floor(n / 2 ** k) % 256).join(".");\nlet p = 1;\nfor (let t = 0; t < T; t++) {\n  const block = d[p], n = +d[p + 1];\n  const hosts = d.slice(p + 2, p + 2 + n).map(Number);\n  p += 2 + n;\n  const [ip, k0] = block.split("/");\n  const res = new Array(n).fill("FAIL");\n  // TODO: 依主機數由大到小配置（位址用一般數字，不要用 32 位元的位元運算）\n  out.push(...res);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int T;\n    scanf("%d", &T);\n    while (T--) {\n        unsigned a, b, c, d, k0;\n        int n;\n        scanf("%u.%u.%u.%u/%u %d", &a, &b, &c, &d, &k0, &n);\n        for (int i = 0; i < n; i++) {\n            long long h;\n            scanf("%lld", &h);\n            /* TODO: 依主機數由大到小配置 */\n            puts("FAIL");\n        }\n    }\n    return 0;\n}\n'
    },
    hints: ['先算每個需求的大小 2ᵏ，把需求依（主機數由大到小、輸入順序）排序。因為大小都是 2 的次方而且由大到小，用一個游標從區塊起點往後分配，每個子網路的起點自然會對齊自己的大小。', '區塊 /0 有 2³² 個位址，游標可能等於 2³²，要用 64 位元整數（JavaScript 用一般數字、不要用 | 或 << 運算）。放不下的需求輸出 FAIL，但游標不動，後面較小的需求仍可能放得下。'],
    explain: '由大到小配置是 VLSM 的關鍵：較大的區塊先放在對齊的位置，較小的區塊塞在後面，永遠不會因為對齊而留下空隙。每個需求只需要排序一次、配置 O(1)，總時間 O(n log n)。實務上還要為成長預留空間，並考慮路由聚合。',
    tags: ['subnetting', 'cidr', 'greedy', 'sorting']
  });

  /* ---------- 第 13 章 轉送：最長前綴匹配 ---------- */
  function lpmAll(prefixes, qs) {
    const byLen = Array.from({ length: 33 }, () => new Map());
    for (const [p, port] of prefixes) { const [ip, k] = p.split('/'); byLen[+k].set(ip2n(ip), port); }
    const lens = []; for (let k = 32; k >= 0; k--) if (byLen[k].size) lens.push(k);
    return lines(qs.map(q => { const a = ip2n(q); for (const k of lens) { const key = k === 0 ? 0 : a - a % 2 ** (32 - k); const v = byLen[k].get(key); if (v !== undefined) return v; } return 'DROP'; }));
  }
  function lpmWorld(r, n, q, withDefault) {
    const seen = new Set(), pre = [];
    const addP = (net, k) => { const key = `${net}/${k}`; if (seen.has(key)) return; seen.add(key); pre.push([n2ip(net) + '/' + k, `if${ri(r, 0, 63)}`]); };
    if (withDefault) addP(0, 0);
    while (pre.length < n) {
      if (pre.length > 5 && r() < 0.45) { const [p] = pick(r, pre); const [ip, k0] = p.split('/'), k = Math.min(32, +k0 + ri(r, 1, 8)); const base = ip2n(ip), net = base + Math.floor(r() * 2 ** (k - +k0)) * 2 ** (32 - k); addP(net, k); }
      else { const k = pick(r, [8, 12, 16, 16, 20, 22, 24, 24, 24, 28, 32]), net = Math.floor(r() * 2 ** k) * 2 ** (32 - k); addP(net, k); }
    }
    const qs = Array.from({ length: q }, () => { if (r() < 0.15) return n2ip(Math.floor(r() * 2 ** 32)); const [p] = pick(r, pre); const [ip, k] = p.split('/'); return n2ip(ip2n(ip) + Math.floor(r() * 2 ** (32 - +k))); });
    for (let i = pre.length - 1; i > 0; i--) { const j = ri(r, 0, i); [pre[i], pre[j]] = [pre[j], pre[i]]; }
    return [pre, qs];
  }
  const lpCase = (name, [pre, qs], visible) => T(name, `${pre.length}\n${lines(pre.map(x => x.join(' ')))}\n${qs.length}\n${lines(qs)}\n`, lpmAll(pre, qs), visible);
  const LPM_SAMPLE = [[['200.23.16.0/21', 'if0'], ['200.23.24.0/24', 'if1'], ['200.23.24.0/21', 'if2'], ['0.0.0.0/0', 'if3']], ['200.23.22.161', '200.23.24.170', '200.23.40.1', '200.23.31.255']];
  add({
    id: 'net.forward.lpm', lesson: 12, title: '轉送表查詢：最長前綴匹配', timeLimitMs: 1500, outputBytes: 2 << 20,
    statement: '路由器的轉送表有 n 筆「前綴 → 輸出介面」。對每個目的 IP，找出所有匹配的前綴（目的位址的前 k 位元與前綴相同），選前綴最長的那一筆並輸出它的介面；沒有任何前綴匹配就輸出 DROP。0.0.0.0/0 匹配所有位址。轉送表與查詢都很多，逐筆比對會太慢。',
    input: '第一行 n（1 ≤ n ≤ 1.5×10⁵）；接著 n 行「網路位址/k 介面名稱」（主機部分都是 0，不會重複，介面名稱是不含空白的字串）。然後一行 q（1 ≤ q ≤ 1.5×10⁵）；接著 q 行，每行一個 IPv4 位址。',
    output: '每個查詢一行：介面名稱或 DROP。',
    cases: () => {
      const r = rng(2013);
      return [
        lpCase('範例：課文的轉送表', LPM_SAMPLE, true),
        lpCase('範例：沒有預設路由', [[['10.0.0.0/8', 'A'], ['10.20.0.0/16', 'B'], ['10.20.30.0/24', 'C'], ['10.20.30.40/32', 'D']], ['10.20.30.40', '10.20.30.41', '10.20.99.1', '10.99.0.1', '11.0.0.1']], true),
        lpCase('巢狀前綴', lpmWorld(r, 300, 2000, false)),
        lpCase('有預設路由', lpmWorld(r, 2000, 5000, true)),
        lpCase('大型轉送表', lpmWorld(r, 150000, 150000, true))
      ];
    },
    starter: {
      python: 'import sys\n\ndef ip2n(s):\n    a, b, c, d = map(int, s.split("."))\n    return (a << 24) | (b << 16) | (c << 8) | d\n\ndef main():\n    data = sys.stdin.buffer.read().split()\n    n = int(data[0])\n    table = []\n    for i in range(n):\n        prefix, port = data[1 + 2 * i].decode(), data[2 + 2 * i].decode()\n        ip, k = prefix.split("/")\n        table.append((ip2n(ip), int(k), port))\n    q = int(data[1 + 2 * n])\n    out = []\n    for j in range(q):\n        a = ip2n(data[2 + 2 * n + j].decode())\n        # 逐筆比對每個前綴是 O(n × q)，大型測資會逾時。\n        # TODO: 依前綴長度建立 33 個 dict，從 /32 往下查\n        out.append("DROP")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <vector>\n#include <tuple>\n#include <cstdint>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<tuple<uint32_t, int, string>> table;\n    for (int i = 0; i < n; i++) {\n        string p, port;\n        cin >> p >> port;\n        unsigned a, b, c, d, k;\n        sscanf(p.c_str(), "%u.%u.%u.%u/%u", &a, &b, &c, &d, &k);\n        table.emplace_back(a << 24 | b << 16 | c << 8 | d, k, port);\n    }\n    int q;\n    cin >> q;\n    string out;\n    while (q--) {\n        string s;\n        cin >> s;\n        unsigned a, b, c, d;\n        sscanf(s.c_str(), "%u.%u.%u.%u", &a, &b, &c, &d);\n        uint32_t x = a << 24 | b << 16 | c << 8 | d;\n        // TODO: 逐筆比對太慢；想一想怎麼依前綴長度用雜湊表查\n        out += "DROP\\n";\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst n = +d[0];\nconst ip2n = s => s.split(".").reduce((a, x) => a * 256 + +x, 0);\nconst table = [];\nfor (let i = 0; i < n; i++) { const [ip, k] = d[1 + 2 * i].split("/"); table.push([ip2n(ip), +k, d[2 + 2 * i]]); }\nconst q = +d[1 + 2 * n], out = [];\nfor (let j = 0; j < q; j++) {\n  const a = ip2n(d[2 + 2 * n + j]);\n  // TODO: 依前綴長度建立雜湊表，從 32 往下查\n  out.push("DROP");\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int n, q;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) {\n        unsigned a, b, c, d, k;\n        char port[32];\n        scanf("%u.%u.%u.%u/%u %31s", &a, &b, &c, &d, &k, port);\n    }\n    scanf("%d", &q);\n    while (q--) {\n        unsigned a, b, c, d;\n        scanf("%u.%u.%u.%u", &a, &b, &c, &d);\n        /* TODO: 最長前綴匹配（可以把前綴排序後二分搜尋，或自己寫雜湊表 / 前綴樹） */\n        puts("DROP");\n    }\n    return 0;\n}\n'
    },
    hints: ['前綴長度只有 0 到 32 共 33 種。為每一種長度建一個雜湊表：鍵是網路位址，值是介面。查詢時把目的位址依長度遮罩後去查，從 32 往下找到的第一個就是最長的。', '每個查詢最多查 33 次雜湊表，總時間 O(33 × q)。也可以用二元前綴樹（trie）：沿著位址的位元往下走，記住途中遇到的最後一個有介面的節點。'],
    explain: '最長前綴匹配讓路由表可以聚合：一筆短前綴代表一大片位址，更具體的長前綴則覆寫其中的例外。逐筆比對是 O(n × q)，n、q 都是 10⁵ 時需要 10¹⁰ 次比較；依長度分組查雜湊表或用前綴樹都能把每次查詢降到與位址長度成正比。真實的路由器用 TCAM 硬體在一個時脈內平行比對所有前綴。',
    tags: ['longest-prefix-match', 'hash-map', 'trie', 'routing']
  });

  /* ---------- 第 14 章 鏈路狀態：Dijkstra 與下一跳 ---------- */
  function dijkstraTable(n, edges, s) {
    const adj = Array.from({ length: n + 1 }, () => []);
    for (const [u, v, w] of edges) { adj[u].push([v, w]); adj[v].push([u, w]); }
    const dist = new Array(n + 1).fill(Infinity), heap = [[0, s]]; dist[s] = 0;
    const push = x => { heap.push(x); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    heap.length = 0; push([0, s]);
    while (heap.length) { const [d, u] = pop(); if (d > dist[u]) continue; for (const [v, w] of adj[u]) if (d + w < dist[v]) { dist[v] = d + w; push([dist[v], v]); } }
    const order = []; for (let v = 1; v <= n; v++) if (dist[v] < Infinity) order.push(v); order.sort((a, b) => dist[a] - dist[b]);
    const hop = new Array(n + 1).fill(Infinity);
    for (const v of order) { if (v === s) continue; for (const [u, w] of adj[v]) if (dist[u] + w === dist[v]) hop[v] = Math.min(hop[v], u === s ? v : hop[u]); }
    const out = []; for (let v = 1; v <= n; v++) out.push(v === s ? '0 -' : dist[v] === Infinity ? 'INF -' : `${dist[v]} ${hop[v]}`);
    return lines(out);
  }
  function graphGen(r, n, m, wMax, connected = true) {
    const edges = [], seen = new Set(), key = (u, v) => u < v ? u * 1e6 + v : v * 1e6 + u;
    const addE = (u, v) => { if (u === v || seen.has(key(u, v))) return false; seen.add(key(u, v)); edges.push([u, v, ri(r, 1, wMax)]); return true; };
    if (connected) for (let v = 2; v <= n; v++) addE(ri(r, Math.max(1, v - 50), v - 1), v);
    let guard = 0; while (edges.length < m && guard++ < m * 20) addE(ri(r, 1, n), ri(r, 1, n));
    return edges;
  }
  function chainGen(r, n, m) {   // 長鏈加上昂貴的捷徑、節點編號與邊的順序都打亂：Bellman-Ford 需要很多輪
    const perm = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) { const j = ri(r, 0, i); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const edges = [], seen = new Set(), key = (u, v) => u < v ? u * 1e6 + v : v * 1e6 + u;
    for (let i = 0; i + 1 < n; i++) { seen.add(key(perm[i], perm[i + 1])); edges.push([perm[i], perm[i + 1], ri(r, 1, 3)]); }
    while (edges.length < m) { const u = ri(r, 1, n), v = ri(r, 1, n); if (u !== v && !seen.has(key(u, v))) { seen.add(key(u, v)); edges.push([u, v, ri(r, 5000, 10000)]); } }
    for (let i = edges.length - 1; i > 0; i--) { const j = ri(r, 0, i); [edges[i], edges[j]] = [edges[j], edges[i]]; }
    return [edges, perm[0]];
  }
  const djCase = (name, n, edges, s, visible) => T(name, `${n} ${edges.length} ${s}\n${lines(edges.map(e => e.join(' ')))}\n`, dijkstraTable(n, edges, s), visible);
  const KUROSE = [[1, 2, 2], [1, 3, 5], [1, 4, 1], [2, 4, 2], [2, 3, 3], [4, 3, 3], [4, 5, 1], [3, 5, 1], [3, 6, 5], [5, 6, 2]];
  add({
    id: 'net.route.dijkstra', lesson: 13, title: 'Dijkstra：算出路由器的轉送表', timeLimitMs: 2000, outputBytes: 2 << 20,
    statement: '網路有 n 台路由器（編號 1 到 n）與 m 條雙向鏈路，每條鏈路有正整數成本。對來源路由器 s，請算出到每台路由器的最短成本，以及轉送表裡的「下一跳」：最短路徑上離開 s 後第一台路由器。若有多條最短路徑，下一跳取所有最短路徑中編號最小的那個第一跳。',
    input: '第一行 n m s（1 ≤ n ≤ 10⁵，0 ≤ m ≤ 2×10⁵，1 ≤ s ≤ n）；接著 m 行 u v w（u ≠ v，1 ≤ w ≤ 10⁴），同一對路由器最多一條鏈路。',
    output: 'n 行，第 v 行對應路由器 v：v = s 時輸出「0 -」；到不了輸出「INF -」；否則輸出「最短成本 下一跳」。',
    cases: () => {
      const r = rng(2014);
      return [
        djCase('範例：課文的拓樸（u=1、v=2、w=3、x=4、y=5、z=6）', 6, KUROSE, 1, true),
        djCase('範例：等成本路徑與到不了的節點', 6, [[1, 2, 1], [1, 3, 1], [2, 4, 1], [3, 4, 1], [4, 5, 3]], 1, true),
        djCase('只有一台', 1, [], 1),
        djCase('等成本很多', 200, graphGen(r, 200, 800, 2), 7),
        djCase('不連通', 1000, graphGen(r, 1000, 900, 20, false), 1),
        djCase('中型', 5000, graphGen(r, 5000, 20000, 100), 2500),
        djCase('大型：隨機圖', 100000, graphGen(r, 100000, 200000, 10000), 1),
        djCase('大型：長鏈與捷徑', 100000, ...((g) => [g[0], g[1]])(chainGen(r, 100000, 200000)))
      ];
    },
    starter: {
      python: 'import sys\nimport heapq\n\ndef main():\n    data = sys.stdin.buffer.read().split()\n    n, m, s = int(data[0]), int(data[1]), int(data[2])\n    adj = [[] for _ in range(n + 1)]\n    for i in range(m):\n        u, v, w = int(data[3 + 3 * i]), int(data[4 + 3 * i]), int(data[5 + 3 * i])\n        adj[u].append((v, w))\n        adj[v].append((u, w))\n    INF = float("inf")\n    dist = [INF] * (n + 1)\n    dist[s] = 0\n    # TODO: Dijkstra（heapq），再依距離由小到大決定每個節點的下一跳\n    out = []\n    for v in range(1, n + 1):\n        out.append("0 -" if v == s else "INF -")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <vector>\n#include <climits>\n#include <queue>\n#include <utility>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n, m, s;\n    cin >> n >> m >> s;\n    vector<vector<pair<int, int>>> adj(n + 1);\n    for (int i = 0; i < m; i++) {\n        int u, v, w;\n        cin >> u >> v >> w;\n        adj[u].push_back({v, w});\n        adj[v].push_back({u, w});\n    }\n    const long long INF = LLONG_MAX;\n    vector<long long> dist(n + 1, INF);\n    dist[s] = 0;\n    // TODO: Dijkstra（priority_queue），再決定每個節點的下一跳\n    string out;\n    for (int v = 1; v <= n; v++) out += v == s ? "0 -\\n" : "INF -\\n";\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst [n, m, s] = d;\nconst adj = Array.from({ length: n + 1 }, () => []);\nfor (let i = 0; i < m; i++) {\n  const u = d[3 + 3 * i], v = d[4 + 3 * i], w = d[5 + 3 * i];\n  adj[u].push([v, w]);\n  adj[v].push([u, w]);\n}\nconst dist = new Array(n + 1).fill(Infinity);\ndist[s] = 0;\n// TODO: Dijkstra（需要自己寫一個二元堆積），再決定每個節點的下一跳\nconst out = [];\nfor (let v = 1; v <= n; v++) out.push(v === s ? "0 -" : "INF -");\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int n, m, s;\n    scanf("%d %d %d", &n, &m, &s);\n    for (int i = 0; i < m; i++) {\n        int u, v, w;\n        scanf("%d %d %d", &u, &v, &w);\n    }\n    /* TODO: 鄰接串列 + 二元堆積的 Dijkstra，再決定每個節點的下一跳 */\n    for (int v = 1; v <= n; v++) puts(v == s ? "0 -" : "INF -");\n    return 0;\n}\n'
    },
    hints: ['先用二元堆積的 Dijkstra 算出 dist，O((n + m) log n)。下一跳不能只在「更新距離」時順手記，因為等成本的路徑要選編號最小的第一跳。', '把可到達的節點依 dist 由小到大處理：對 v 的每個鄰居 u，若 dist[u] + w = dist[v]，候選下一跳是「u = s 時為 v 本身，否則為 hop[u]」，取最小值。成本都是正數，所以 u 一定比 v 先處理。'],
    explain: '鏈路狀態路由的每台路由器都在做這件事：用 Dijkstra 從自己出發算出最短路徑樹，再把每個目的地的第一跳寫進轉送表。所有最短路徑構成一個有向無環圖，依距離順序做一次動態規劃就能處理等成本路徑的平手規則。改用 Bellman-Ford 需要 O(n × m)，在十萬台路由器的網路上太慢。',
    tags: ['dijkstra', 'routing', 'heap', 'shortest-path']
  });

  /* ---------- 第 15 章 距離向量：同步回合與毒性逆轉 ---------- */
  function dvRun(n, links, poison, change) {
    const INF = 16, cost = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(INF));
    for (const [u, v, c] of links) { cost[u][v] = c; cost[v][u] = c; }
    const nb = x => { const a = []; for (let v = 1; v <= n; v++) if (v !== x && cost[x][v] < INF) a.push(v); return a; };
    let D = [], via = [];
    for (let x = 0; x <= n; x++) { D.push(new Array(n + 1).fill(INF)); via.push(new Array(n + 1).fill(-1)); }
    for (let x = 1; x <= n; x++) { D[x][x] = 0; via[x][x] = x; for (const v of nb(x)) { D[x][v] = cost[x][v]; via[x][v] = v; } }
    const phase = () => {
      let rounds = 0;
      for (;;) {
        const ND = D.map(r => r.slice()), NV = via.map(r => r.slice()); let changed = false;
        for (let x = 1; x <= n; x++) { const ns = nb(x); for (let y = 1; y <= n; y++) { if (x === y) continue; let best = INF, bv = -1; for (const v of ns) { const adv = poison && via[v][y] === x ? INF : D[v][y], c = cost[x][v] + adv; if (c < best) { best = c; bv = v; } } if (best >= INF) { best = INF; bv = -1; } if (best !== D[x][y] || bv !== via[x][y]) changed = true; ND[x][y] = best; NV[x][y] = bv; } }
        if (!changed) return rounds;
        D = ND; via = NV; rounds++;
        if (rounds > 5000) throw new Error('DV did not converge');
      }
    };
    const r1 = phase(); const [u, v, c] = change; cost[u][v] = c; cost[v][u] = c; const r2 = phase();
    return `${r1} ${r2}\n${lines(D.slice(1).map(row => row.slice(1).join(' ')))}`;
  }
  const dvCase = (name, n, links, poison, change, visible) => T(name, `${n} ${links.length} ${poison}\n${lines(links.map(l => l.join(' ')))}\n${change.join(' ')}\n`, dvRun(n, links, poison, change), visible);
  function dvGen(r, n, m, down) { const g = graphGen(r, n, m, 6); const e = pick(r, g); return [n, g, ri(r, 0, 1), [e[0], e[1], down ? 16 : ri(r, 1, 15)]]; }
  add({
    id: 'net.route.distance-vector', lesson: 14, title: '距離向量：收斂回合與無限計數', timeLimitMs: 1500, outputBytes: 1 << 20,
    statement: '模擬同步回合的距離向量路由（像 RIP 一樣，16 代表無限大，成本 16 的鏈路視為斷線）。一開始每台路由器只知道自己（0）與鄰居（鏈路成本），其他是 16；到鄰居的下一跳是鄰居本身，其他沒有下一跳。每一回合，所有路由器同時用「上一回合」鄰居的向量計算：D_x(y) = min_v { c(x, v) + 宣告值 }，v 依編號由小到大考慮、取第一個最小值作為下一跳；結果 ≥ 16 時記為 16 且沒有下一跳。使用毒性逆轉時，若 v 到 y 的下一跳是 x，v 對 x 宣告的值是 16，否則是 D_v(y)。只要有任何距離或下一跳改變就算一回合，直到某回合完全沒有改變為止（那一回合不計）。先讓網路收斂，接著改變一條鏈路的成本，再收斂一次。',
    input: '第一行 n m P（2 ≤ n ≤ 60，1 ≤ m ≤ 300，P 為 1 表示使用毒性逆轉、0 表示不使用）；接著 m 行 u v c（1 ≤ c ≤ 15，同一對最多一條）；最後一行 u v c′ 表示鏈路 u–v 的成本改為 c′（1 ≤ c′ ≤ 16，鏈路一定存在）。',
    output: '第一行兩個整數：第一次與第二次收斂所花的回合數。接著 n 行，第 x 行是最後 D_x(1) … D_x(n)，以空白分隔。',
    cases: () => {
      const r = rng(2015);
      const tri = [[1, 2, 4], [2, 3, 1], [1, 3, 15]];
      return [
        dvCase('範例：壞消息，無限計數', 3, tri, 0, [1, 2, 15], true),
        dvCase('範例：同樣的變化，使用毒性逆轉', 3, tri, 1, [1, 2, 15], true),
        dvCase('好消息', 3, tri, 0, [1, 3, 1]),
        dvCase('鏈路斷線、網路分裂', 4, [[1, 2, 1], [2, 3, 1], [3, 4, 1]], 0, [2, 3, 16]),
        dvCase('毒性逆轉擋不住三角迴圈', 4, [[1, 2, 1], [2, 3, 1], [2, 4, 1], [3, 4, 1]], 1, [1, 2, 16]),
        dvCase('隨機', ...dvGen(r, 12, 20, false)),
        dvCase('隨機斷線', ...dvGen(r, 30, 50, true)),
        dvCase('大型', ...dvGen(r, 60, 300, true))
      ];
    },
    starter: {
      python: 'import sys\n\nINF = 16\n\ndef main():\n    data = sys.stdin.read().split()\n    n, m, P = int(data[0]), int(data[1]), int(data[2])\n    cost = [[INF] * (n + 1) for _ in range(n + 1)]\n    p = 3\n    for _ in range(m):\n        u, v, c = int(data[p]), int(data[p + 1]), int(data[p + 2])\n        p += 3\n        cost[u][v] = cost[v][u] = c\n    cu, cv, cc = int(data[p]), int(data[p + 1]), int(data[p + 2])\n    D = [[INF] * (n + 1) for _ in range(n + 1)]\n    via = [[-1] * (n + 1) for _ in range(n + 1)]\n    # TODO: 初始化 D 與 via；寫一個 phase() 模擬同步回合直到不再改變，回傳回合數\n    r1 = r2 = 0\n    print(r1, r2)\n    for x in range(1, n + 1):\n        print(" ".join(map(str, D[x][1:])))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nconst int INF = 16;\n\nint main() {\n    int n, m, P;\n    cin >> n >> m >> P;\n    vector<vector<int>> cost(n + 1, vector<int>(n + 1, INF));\n    for (int i = 0; i < m; i++) {\n        int u, v, c;\n        cin >> u >> v >> c;\n        cost[u][v] = cost[v][u] = c;\n    }\n    int cu, cv, cc;\n    cin >> cu >> cv >> cc;\n    vector<vector<int>> D(n + 1, vector<int>(n + 1, INF)), via(n + 1, vector<int>(n + 1, -1));\n    // TODO: 初始化 D 與 via；模擬同步回合直到不再改變\n    int r1 = 0, r2 = 0;\n    cout << r1 << " " << r2 << "\\n";\n    for (int x = 1; x <= n; x++)\n        for (int y = 1; y <= n; y++) cout << D[x][y] << (y == n ? "\\n" : " ");\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst [n, m, P] = d;\nconst INF = 16;\nconst cost = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(INF));\nlet p = 3;\nfor (let i = 0; i < m; i++) { const [u, v, c] = d.slice(p, p + 3); p += 3; cost[u][v] = cost[v][u] = c; }\nconst [cu, cv, cc] = d.slice(p, p + 3);\nlet D = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(INF));\nlet via = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(-1));\n// TODO: 初始化 D 與 via；模擬同步回合直到不再改變\nconst r1 = 0, r2 = 0;\nconsole.log(`${r1} ${r2}`);\nfor (let x = 1; x <= n; x++) console.log(D[x].slice(1).join(" "));\n',
      c: '#include <stdio.h>\n\n#define INF 16\nint cost[61][61], D[61][61], via[61][61];\n\nint main(void) {\n    int n, m, P;\n    scanf("%d %d %d", &n, &m, &P);\n    for (int i = 1; i <= n; i++)\n        for (int j = 1; j <= n; j++) { cost[i][j] = INF; D[i][j] = INF; via[i][j] = -1; }\n    for (int i = 0; i < m; i++) {\n        int u, v, c;\n        scanf("%d %d %d", &u, &v, &c);\n        cost[u][v] = cost[v][u] = c;\n    }\n    int cu, cv, cc;\n    scanf("%d %d %d", &cu, &cv, &cc);\n    /* TODO: 初始化 D 與 via；模擬同步回合直到不再改變 */\n    printf("0 0\\n");\n    for (int x = 1; x <= n; x++)\n        for (int y = 1; y <= n; y++) printf("%d%c", D[x][y], y == n ? \'\\n\' : \' \');\n    return 0;\n}\n'
    },
    hints: ['「同步」的意思是：計算新的一回合時，只能讀上一回合的 D 與 via，所以要先複製一份再寫入新值，不能邊算邊覆蓋。', '比較新舊兩份 D 與 via，有任何不同就回合數加 1 並換成新的；完全相同就停止。第二階段直接從第一階段的結果開始，只改那條鏈路的成本（16 代表斷線，不能再經由它）。'],
    explain: '距離向量的每一回合就是 Bellman-Ford 的一次鬆弛，只是分散在每台路由器上、只用鄰居的資訊。成本下降時新消息每回合往外傳一跳；成本上升時，路由器會互相引用對方過時的路徑，距離每回合只增加一點，這就是無限計數，RIP 用 16 當作無限大來限制它。毒性逆轉能消除兩台路由器之間的迴圈，但對三台以上的迴圈無效。',
    tags: ['distance-vector', 'bellman-ford', 'simulation', 'routing']
  });

  /* ---------- 第 16 章 IPv4：沿途的分段 ---------- */
  function fragPath(L, mtus) {
    let fs = [[L - 20, 0, 0]];
    for (const mtu of mtus) fs = fs.flatMap(([len, off, mf]) => {
      if (len + 20 <= mtu) return [[len, off, mf]];
      const max = Math.floor((mtu - 20) / 8) * 8, out = [];
      for (let pos = 0; pos < len; pos += max) { const n = Math.min(max, len - pos); out.push([n, off + pos / 8, pos + n === len ? mf : 1]); }
      return out;
    });
    return [fs.length, ...fs.map(([len, off, mf]) => `${len + 20} ${off} ${mf}`)].join('\n');
  }
  const MTUS = [68, 296, 576, 1006, 1280, 1492, 1500, 4352, 9000, 65535];
  const frCase = (name, qs, visible) => T(name, `${qs.length}\n${qs.map(([L, ms]) => `${L} ${ms.length}\n${ms.join(' ')}`).join('\n')}\n`, lines(qs.map(([L, ms]) => fragPath(L, ms))), visible);
  add({
    id: 'net.ip.fragment', lesson: 15, title: 'IPv4 分段：沿途一再被切開', timeLimitMs: 1000, outputBytes: 4 << 20,
    statement: '一個總長度 L 位元組（含 20 位元組標頭、沒有選項）的 IPv4 資料包依序經過 k 段鏈路，各段的 MTU 已知。每段鏈路前的路由器檢查每個片段：總長度不超過 MTU 就原樣送出，否則切成多片：每片的資料長度最多是 ⌊(MTU − 20) / 8⌋ × 8 位元組（最後一片可以較短），每片都有自己的 20 位元組標頭。片段位移以 8 位元組為單位、相對於原始資料包；MF 旗標除了原始資料的最後一段之外都是 1（被再次切開的片段，只有它原本 MF = 0 時，它的最後一片 MF 才是 0）。請輸出目的主機收到的所有片段。',
    input: '第一行 q（1 ≤ q ≤ 2000）。每組第一行 L k（21 ≤ L ≤ 65535，1 ≤ k ≤ 8），第二行 k 個 MTU（68 ≤ MTU ≤ 65535）。所有組的輸出片段總數不超過 1.5×10⁵。',
    output: '每組先輸出片段數 f，接著 f 行「總長度 位移 MF」，依位移由小到大。',
    cases: () => {
      const r = rng(2016);
      const randQ = big => [big ? ri(r, 30000, 65535) : ri(r, 21, 9000), Array.from({ length: ri(r, 1, 8) }, () => big ? pick(r, MTUS.slice(1)) : pick(r, MTUS))];
      return [
        frCase('範例：課文的 4000 位元組', [[4000, [1500]], [4000, [1500, 620]]], true),
        frCase('範例：不必分段與剛好放得下', [[1500, [1500, 9000]], [1501, [1500]], [100, [68]]], true),
        frCase('先小後大', [[9000, [576, 9000, 1500]], [65535, [65535, 4352, 1280]]]),
        frCase('MTU 68 的極端情況', [[65535, [68]], [1000, [1500, 68, 576]]]),
        frCase('隨機小型', Array.from({ length: 1500 }, () => randQ(false))),
        frCase('隨機大型', Array.from({ length: 300 }, () => randQ(true)))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    q = int(data[0])\n    p = 1\n    out = []\n    for _ in range(q):\n        L, k = int(data[p]), int(data[p + 1])\n        mtus = list(map(int, data[p + 2:p + 2 + k]))\n        p += 2 + k\n        frags = [(L - 20, 0, 0)]        # (資料長度, 位移, MF)\n        for mtu in mtus:\n            pass  # TODO: 把放不下的片段切開（資料長度要是 8 的倍數，最後一片除外）\n        out.append(str(len(frags)))\n        for length, off, mf in frags:\n            out.append(f"{length + 20} {off} {mf}")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <vector>\n#include <array>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    string out;\n    while (q--) {\n        int L, k;\n        cin >> L >> k;\n        vector<int> mtu(k);\n        for (auto &x : mtu) cin >> x;\n        vector<array<int, 3>> frags = {{L - 20, 0, 0}};   // 資料長度, 位移, MF\n        // TODO: 依序經過每段鏈路，把放不下的片段切開\n        out += to_string(frags.size()) + "\\n";\n        for (auto &f : frags) out += to_string(f[0] + 20) + " " + to_string(f[1]) + " " + to_string(f[2]) + "\\n";\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst q = d[0], out = [];\nlet p = 1;\nfor (let t = 0; t < q; t++) {\n  const L = d[p], k = d[p + 1], mtus = d.slice(p + 2, p + 2 + k);\n  p += 2 + k;\n  let frags = [[L - 20, 0, 0]];   // 資料長度, 位移, MF\n  // TODO: 依序經過每段鏈路，把放不下的片段切開\n  out.push(String(frags.length));\n  for (const [len, off, mf] of frags) out.push(`${len + 20} ${off} ${mf}`);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        int L, k, mtu[8];\n        scanf("%d %d", &L, &k);\n        for (int i = 0; i < k; i++) scanf("%d", &mtu[i]);\n        /* TODO: 依序經過每段鏈路，把放不下的片段切開 */\n        printf("1\\n%d 0 0\\n", L);\n    }\n    return 0;\n}\n'
    },
    hints: ['維護目前的片段清單（資料長度, 位移, MF），每經過一段鏈路就產生新的清單：放得下的原樣保留，放不下的依序切成資料長度 ⌊(MTU − 20) / 8⌋ × 8 的小片。', '小片的位移 = 原片段位移 + 小片在原片段中的位元組位置 / 8；只有原片段 MF = 0 時，它的最後一小片 MF 才是 0。清單本來就依位移排序，切開後仍然有序。'],
    explain: '位移欄位只有 13 位元，所以用 8 位元組為單位，這也是每片資料長度必須是 8 的倍數的原因。片段在途中可以再被切開，但位移永遠相對於原始資料包，目的主機才能直接依位移重組。分段會增加標頭負擔，任何一片遺失整個資料包都要重傳，所以現代主機多用路徑 MTU 探索避免分段，IPv6 更乾脆禁止路由器分段。',
    tags: ['fragmentation', 'ipv4', 'simulation']
  });

  /* ---------- 第 17 章 錯誤偵測：CRC ---------- */
  function crcRem(bits, gen) {
    const r = gen.length - 1, w = new Uint8Array(bits.length + r), g = [...gen].map(Number);
    for (let i = 0; i < bits.length; i++) w[i] = bits.charCodeAt(i) - 48;
    for (let i = 0; i < bits.length; i++) if (w[i]) for (let j = 0; j <= r; j++) w[i + j] ^= g[j];
    return Array.from(w.subarray(bits.length)).join('');
  }
  const GENS = ['1001', '1011', '10011', '100000111', '11000000000000101', '10001000000100001', '100000100110000010001110110110111'];
  const bitsOf = (r, n) => { let s = '1'; for (let i = 1; i < n; i++) s += r() < 0.5 ? '1' : '0'; return s; };
  function crcQueries(r, q, maxLen) {
    return Array.from({ length: q }, () => {
      const gen = pick(r, GENS), data = bitsOf(r, ri(r, 1, maxLen));
      if (r() < 0.5) return ['E', data, gen];
      let frame = data + crcRem(data, gen);
      if (r() < 0.5) { const k = ri(r, 1, Math.min(gen.length + 3, frame.length)), at = ri(r, 0, frame.length - k); frame = frame.slice(0, at) + [...frame.slice(at, at + k)].map((c, i) => i === 0 || i === k - 1 || r() < 0.5 ? (c === '0' ? '1' : '0') : c).join('') + frame.slice(at + k); }
      return ['C', frame, gen];
    });
  }
  const crcAns = qs => lines(qs.map(([k, s, g]) => k === 'E' ? crcRem(s, g) : crcRem(s.slice(0, s.length - g.length + 1), g) === s.slice(s.length - g.length + 1) ? 'OK' : 'ERR'));
  const crCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs.map(x => x.join(' ')))}\n`, crcAns(qs), visible);
  add({
    id: 'net.link.crc', lesson: 16, title: 'CRC：產生與檢查', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '生成多項式 G 是 r + 1 位元的位元串（最高位是 1）。查詢 E 給資料位元 D，請輸出 r 位元的 CRC：在 D 後面補 r 個 0，以 G 做模 2 長除法（減法就是 XOR）得到的餘數。查詢 C 給收到的整個訊框（資料後面接著 r 位元的 CRC），請檢查它能否被 G 整除：可以輸出 OK，否則輸出 ERR。',
    input: '第一行 q（1 ≤ q ≤ 2×10⁴）；接著 q 行「E 資料 G」或「C 訊框 G」。G 的長度 2 到 33；資料至少 1 位元；訊框長度至少是 G 的長度。所有位元串總長度不超過 4×10⁵。',
    output: 'E 查詢輸出 CRC 位元串（長度剛好 r，可能有前導 0）；C 查詢輸出 OK 或 ERR。',
    cases: () => {
      const r = rng(2017);
      return [
        crCase('範例：課文的 101110', [['E', '101110', '1001'], ['C', '101110011', '1001'], ['C', '100110011', '1001'], ['E', '1', '11']], true),
        crCase('前導 0 的餘數', [['E', '1000', '1011'], ['E', '1011', '1011'], ['E', '1', '100000111'], ['C', '1011000', '1011']]),
        crCase('長度不超過 r 的連續錯誤一定抓得到', Array.from({ length: 300 }, () => { const g = pick(r, GENS), d = bitsOf(r, ri(r, 40, 200)); let f = d + crcRem(d, g); const k = ri(r, 1, g.length - 1), at = ri(r, 0, f.length - k); f = f.slice(0, at) + [...f.slice(at, at + k)].map((c, i) => i === 0 || i === k - 1 || r() < 0.5 ? (c === '0' ? '1' : '0') : c).join('') + f.slice(at + k); return ['C', f, g]; })),
        crCase('隨機', crcQueries(r, 3000, 60)),
        crCase('長訊框', crcQueries(r, 40, 9000))
      ];
    },
    starter: {
      python: 'import sys\n\ndef remainder(bits, gen):\n    r = len(gen) - 1\n    # TODO: 補 r 個 0，做模 2 長除法，回傳最後 r 位\n    return "0" * r\n\ndef main():\n    data = sys.stdin.read().split()\n    q = int(data[0])\n    out = []\n    for i in range(q):\n        kind, s, gen = data[1 + 3 * i], data[2 + 3 * i], data[3 + 3 * i]\n        r = len(gen) - 1\n        if kind == "E":\n            out.append(remainder(s, gen))\n        else:\n            out.append("OK" if remainder(s[:-r], gen) == s[-r:] else "ERR")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nstring remainderOf(const string& bits, const string& gen) {\n    int r = gen.size() - 1;\n    // TODO: 補 r 個 0，做模 2 長除法，回傳最後 r 位\n    return string(r, \'0\');\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    string out;\n    while (q--) {\n        string kind, s, gen;\n        cin >> kind >> s >> gen;\n        int r = gen.size() - 1;\n        if (kind == "E") out += remainderOf(s, gen) + "\\n";\n        else out += remainderOf(s.substr(0, s.size() - r), gen) == s.substr(s.size() - r) ? "OK\\n" : "ERR\\n";\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst q = +d[0], out = [];\nfunction remainder(bits, gen) {\n  const r = gen.length - 1;\n  // TODO: 補 r 個 0，做模 2 長除法，回傳最後 r 位\n  return "0".repeat(r);\n}\nfor (let i = 0; i < q; i++) {\n  const kind = d[1 + 3 * i], s = d[2 + 3 * i], gen = d[3 + 3 * i], r = gen.length - 1;\n  if (kind === "E") out.push(remainder(s, gen));\n  else out.push(remainder(s.slice(0, -r), gen) === s.slice(-r) ? "OK" : "ERR");\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nstatic char s[400005], gen[40], w[400050];\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        char kind[2];\n        scanf("%1s %s %s", kind, s, gen);\n        int r = strlen(gen) - 1;\n        /* TODO: 模 2 長除法 */\n        if (kind[0] == \'E\') { for (int i = 0; i < r; i++) putchar(\'0\'); putchar(\'\\n\'); }\n        else puts("OK");\n    }\n    return 0;\n}\n'
    },
    hints: ['把位元串放進陣列（後面補 r 個 0），從左到右掃描原本資料的每一位：是 1 就把 G 對齊這一位逐位 XOR。掃完後最後 r 位就是餘數。', '也可以把餘數當成一個整數一位一位移入：rem = (rem << 1) | 下一個位元，若 rem 的第 r 位是 1 就 XOR G。r 最大 32，rem 最多 33 位元，要用 64 位元整數。'],
    explain: 'CRC 是在係數為 0 / 1 的多項式環上做除法，模 2 的減法就是 XOR，所以硬體只需要移位暫存器與 XOR 閘就能以線速計算。r 位元的 CRC 保證抓到所有長度 ≤ r 的連續錯誤，乙太網路的 CRC-32 讓隨機錯誤漏掉的機率只有約 2⁻³²。逐位計算是 O(長度 × r)，實務上會用查表一次處理 8 位元。',
    tags: ['crc', 'bit-manipulation', 'error-detection']
  });

  /* ---------- 第 18 章 多重存取：二元指數退避 ---------- */
  function backoffSim(st) {
    const n = st.length, col = new Array(n).fill(0), res = new Array(n).fill(-1), at = new Map();
    const put = (t, i) => { if (!at.has(t)) at.set(t, []); at.get(t).push(i); };
    st.forEach(([s], i) => put(s, i));
    // 時槽可能很分散：用最小堆積只處理有站要傳送的時槽
    const heap = [...new Set(st.map(x => x[0]))].sort((a, b) => a - b), inHeap = new Set(heap);
    const hpush = t => { if (inHeap.has(t)) return; inHeap.add(t); heap.push(t); let i = heap.length - 1; while (i && heap[(i - 1) >> 1] > heap[i]) { [heap[i], heap[(i - 1) >> 1]] = [heap[(i - 1) >> 1], heap[i]]; i = (i - 1) >> 1; } };
    const hpop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < heap.length && heap[a] < heap[m]) m = a; if (b < heap.length && heap[b] < heap[m]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } inHeap.delete(top); return top; };
    while (heap.length) {
      const t = hpop(), who = at.get(t); at.delete(t);
      if (who.length === 1) { res[who[0]] = t; continue; }
      for (const i of who) { col[i]++; if (col[i] >= 16) continue; const nt = t + 1 + st[i][1][col[i] - 1]; put(nt, i); hpush(nt); }
    }
    return lines(res);
  }
  function boGen(r, n, startMax) { return Array.from({ length: n }, () => [ri(r, 0, startMax), Array.from({ length: 15 }, (_, j) => ri(r, 0, 2 ** Math.min(j + 1, 10) - 1))]); }
  const boCase = (name, st, visible) => T(name, `${st.length}\n${lines(st.map(([s, ks]) => `${s} ${ks.join(' ')}`))}\n`, backoffSim(st), visible);
  const K15 = (...head) => [...head, ...Array.from({ length: 15 - head.length }, () => 0)];
  add({
    id: 'net.mac.backoff', lesson: 17, title: 'CSMA/CD：二元指數退避模擬', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '時間切成時槽。每個站有一個訊框，從時槽 s 開始嘗試傳送。在某個時槽若只有一個站傳送，它就成功（只佔這一個時槽）；若有兩個以上的站同時傳送就發生碰撞，每個參與的站碰撞次數加 1：若碰撞次數達到 16 就放棄這個訊框；否則依序取用自己的退避清單中的下一個值 K（第 c 次碰撞用第 c 個值，保證 0 ≤ K ≤ 2^min(c,10) − 1），在時槽 t + 1 + K 再試一次。請輸出每個站成功的時槽，放棄則輸出 −1。',
    input: '第一行 n（1 ≤ n ≤ 2×10⁴）；接著 n 行，每行 s 與 15 個退避值 K₁ … K₁₅（0 ≤ s ≤ 10⁶）。',
    output: 'n 行：每個站成功傳送的時槽，或 −1。',
    cases: () => {
      const r = rng(2018);
      return [
        boCase('範例：兩個站碰撞後錯開', [[0, K15(0)], [0, K15(1)]], true),
        boCase('範例：三個站', [[0, K15(1, 2)], [0, K15(1, 0)], [2, K15(0, 3)]], true),
        boCase('永遠選到一樣的值：放棄', [[5, K15()], [5, K15()]]),
        boCase('沒有碰撞', [[3, K15()], [1, K15()], [2, K15()]]),
        boCase('隨機', boGen(r, 50, 20)),
        boCase('擁擠的網路', boGen(r, 2000, 200)),
        boCase('大型', boGen(r, 20000, 1000000))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    start, ks = [], []\n    for i in range(n):\n        row = data[1 + 16 * i: 17 + 16 * i]\n        start.append(int(row[0]))\n        ks.append(list(map(int, row[1:])))\n    result = [-1] * n\n    # TODO: 依時槽順序處理：同一時槽只有一個站就成功，否則碰撞、退避\n    #       （提示：用 dict 記住每個時槽有哪些站，用 heapq 取出最早的時槽）\n    print("\\n".join(map(str, result)))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <vector>\n#include <map>\n#include <array>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<long long> start(n);\n    vector<array<int, 15>> ks(n);\n    for (int i = 0; i < n; i++) {\n        cin >> start[i];\n        for (auto &k : ks[i]) cin >> k;\n    }\n    vector<long long> result(n, -1);\n    // TODO: map<long long, vector<int>> 依時槽順序處理碰撞與退避\n    string out;\n    for (auto x : result) out += to_string(x) + "\\n";\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/).map(Number);\nconst n = d[0], start = [], ks = [];\nfor (let i = 0; i < n; i++) { start.push(d[1 + 16 * i]); ks.push(d.slice(2 + 16 * i, 17 + 16 * i)); }\nconst result = new Array(n).fill(-1);\n// TODO: 依時槽順序處理碰撞與退避（Map 記住每個時槽的站，另外需要能取出最小時槽的結構）\nconsole.log(result.join("\\n"));\n',
      c: '#include <stdio.h>\n\nstatic long long start[20005];\nstatic int ks[20005][15];\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) {\n        scanf("%lld", &start[i]);\n        for (int j = 0; j < 15; j++) scanf("%d", &ks[i][j]);\n    }\n    /* TODO: 依時槽順序處理碰撞與退避（可以把「(時槽, 站)」放進最小堆積） */\n    for (int i = 0; i < n; i++) puts("-1");\n    return 0;\n}\n'
    },
    hints: ['不要一個時槽一個時槽往前走（時槽可能到 10⁶ 以上，而且大多是空的）。用最小堆積保存「(下一次嘗試的時槽, 站)」，每次取出同一個時槽的所有站一起判斷。', '每個站最多嘗試 16 次，總事件數不超過 16n。碰撞次數達到 16 就放棄，不再放回堆積。'],
    explain: '二元指數退避讓碰撞次數越多的站從越大的範圍裡挑等待時間：兩個站第一次碰撞後再撞的機率是 1/2，第二次是 1/4……，所以很快就能錯開；站越多時範圍自動放大。模擬時只處理有事件的時槽，用優先佇列依時間順序處理，是離散事件模擬的標準寫法。',
    tags: ['csma-cd', 'simulation', 'priority-queue']
  });

  /* ---------- 第 19 章 乙太網路：交換器自我學習 ---------- */
  const BCAST = 'ff:ff:ff:ff:ff:ff';
  function switchSim(A, frames) {
    const tab = new Map();
    return lines(frames.map(([t, p, src, dst]) => {
      tab.set(src, [p, t]);
      if (dst === BCAST) return 'FLOOD';
      const e = tab.get(dst);
      if (!e || t - e[1] > A) { if (e) tab.delete(dst); return 'FLOOD'; }
      return e[0] === p ? 'FILTER' : `FORWARD ${e[0]}`;
    }));
  }
  function swGen(r, nHosts, nFrames, ports, gapMax) {
    const mac = () => Array.from({ length: 6 }, () => ri(r, 0, 255).toString(16).padStart(2, '0')).join(':');
    const hosts = Array.from({ length: nHosts }, () => ({ mac: mac(), port: ri(r, 1, ports) })); let t = 0;
    return Array.from({ length: nFrames }, () => {
      t += ri(r, 0, gapMax);
      const a = pick(r, hosts); if (r() < 0.01) a.port = ri(r, 1, ports);
      const dst = r() < 0.05 ? BCAST : r() < 0.03 ? mac() : pick(r, hosts).mac;
      return [t, a.port, a.mac, dst];
    });
  }
  const swCase2 = (name, P, A, frames, visible) => T(name, `${P} ${A} ${frames.length}\n${lines(frames.map(f => f.join(' ')))}\n`, switchSim(A, frames), visible);
  const MA = 'aa:aa:aa:aa:aa:01', MB = 'aa:aa:aa:aa:aa:02', MC = 'aa:aa:aa:aa:aa:03', MD = 'aa:aa:aa:aa:aa:04';
  add({
    id: 'net.link.switch-learning', lesson: 18, title: '交換器的自我學習與老化', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: '模擬一台乙太網路交換器。轉送表一開始是空的。每個訊框從某個埠進來：先學習——把「來源 MAC → 這個埠，時間 t」寫進表中（已存在就覆蓋）；再查目的 MAC：廣播位址 ff:ff:ff:ff:ff:ff 一律 FLOOD；表中沒有它，或它的紀錄已經老化（t − 紀錄時間 > A，此時刪除該紀錄）也 FLOOD；紀錄的埠和進來的埠相同就 FILTER（丟棄）；否則 FORWARD 到紀錄的埠。',
    input: '第一行 P A n（1 ≤ P ≤ 48，0 ≤ A ≤ 10⁹，1 ≤ n ≤ 1.2×10⁵）；接著 n 行「t 埠 來源MAC 目的MAC」，t 非遞減（0 ≤ t ≤ 10¹²），MAC 為小寫、冒號分隔。',
    output: '每個訊框一行：FLOOD、FILTER 或「FORWARD 埠號」。',
    cases: () => {
      const r = rng(2019);
      return [
        swCase2('範例：課文的四個訊框', 4, 300, [[0, 1, MA, MD], [1, 4, MD, MA], [2, 1, MB, MA], [3, 3, MC, BCAST], [4, 3, MC, MB]], true),
        swCase2('範例：老化與搬家', 4, 10, [[0, 1, MA, MB], [5, 2, MB, MA], [16, 2, MB, MA], [17, 3, MA, MB], [18, 2, MB, MA]], true),
        swCase2('老化時間為 0', 2, 0, [[0, 1, MA, MB], [0, 2, MB, MA], [1, 1, MA, MB], [1, 2, MB, MA]]),
        swCase2('隨機', 8, 50, swGen(r, 20, 500, 8, 10)),
        swCase2('大型', 48, 3000, swGen(r, 5000, 120000, 48, 20))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.buffer.read().split()\n    P, A, n = int(data[0]), int(data[1]), int(data[2])\n    table = {}                     # MAC → (埠, 時間)\n    out = []\n    for i in range(n):\n        t, port = int(data[3 + 4 * i]), int(data[4 + 4 * i])\n        src, dst = data[5 + 4 * i], data[6 + 4 * i]\n        # TODO: 學習來源，再依目的 MAC 決定 FLOOD、FILTER 或 FORWARD（記得老化）\n        out.append("FLOOD")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <unordered_map>\n#include <utility>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    long long P, A;\n    int n;\n    cin >> P >> A >> n;\n    unordered_map<string, pair<int, long long>> table;   // MAC → (埠, 時間)\n    string out;\n    for (int i = 0; i < n; i++) {\n        long long t;\n        int port;\n        string src, dst;\n        cin >> t >> port >> src >> dst;\n        // TODO: 學習來源，再依目的 MAC 決定 FLOOD、FILTER 或 FORWARD（記得老化）\n        out += "FLOOD\\n";\n    }\n    cout << out;\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst P = +d[0], A = +d[1], n = +d[2];\nconst table = new Map(), out = [];\nfor (let i = 0; i < n; i++) {\n  const t = +d[3 + 4 * i], port = +d[4 + 4 * i], src = d[5 + 4 * i], dst = d[6 + 4 * i];\n  // TODO: 學習來源，再依目的 MAC 決定 FLOOD、FILTER 或 FORWARD（記得老化）\n  out.push("FLOOD");\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int P, n;\n    long long A;\n    scanf("%d %lld %d", &P, &A, &n);\n    for (int i = 0; i < n; i++) {\n        long long t;\n        int port;\n        char src[18], dst[18];\n        scanf("%lld %d %17s %17s", &t, &port, src, dst);\n        /* TODO: 把 MAC 轉成 48 位元整數，用雜湊表或排序後二分搜尋記住轉送表 */\n        puts("FLOOD");\n    }\n    return 0;\n}\n'
    },
    hints: ['用雜湊表存「MAC → (埠, 最後看到的時間)」。順序很重要：先學習來源（同一個訊框的來源也可能就是目的），再查目的。', '查到紀錄時先檢查老化：t − 紀錄時間 > A 就刪除並 FLOOD；相等時還沒過期。'],
    explain: '交換器不需要任何設定：從每個訊框的來源位址就能學到「這台主機在哪個埠」，之後送給它的訊框只走那個埠；未知或廣播的目的地才氾濫。老化讓搬家或離線的主機不會一直佔著錯誤的紀錄。每個訊框只做常數次雜湊表操作，總時間 O(n)。',
    tags: ['switch', 'ethernet', 'hash-map', 'simulation']
  });

  /* ---------- 第 20 章 安全：Diffie-Hellman 與快速冪 ---------- */
  const bmodpow = (g, e, p) => { let r = 1n; g %= p; while (e > 0n) { if (e & 1n) r = r * g % p; g = g * g % p; e >>= 1n; } return r; };
  function isPrime(n) { if (n < 2n) return false; for (const b of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) { if (n === b) return true; if (n % b === 0n) return false; } let d = n - 1n, s = 0; while (!(d & 1n)) { d >>= 1n; s++; } for (const a of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) { let x = bmodpow(a, d, n); if (x === 1n || x === n - 1n) continue; let ok = false; for (let i = 1; i < s; i++) { x = x * x % n; if (x === n - 1n) { ok = true; break; } } if (!ok) return false; } return true; }
  const big = (r, bits) => { let x = 0n; for (let i = 0; i < bits; i += 30) x = (x << 30n) | BigInt(Math.floor(r() * 2 ** 30)); return x & ((1n << BigInt(bits)) - 1n); };
  function randPrime(r, bits) { for (;;) { const c = big(r, bits) | (1n << BigInt(bits - 1)) | 1n; if (isPrime(c)) return c; } }
  const dhAns = qs => lines(qs.map(([p, g, a, b]) => { const A = bmodpow(g, a, p), B = bmodpow(g, b, p); return `${A} ${B} ${bmodpow(B, a, p)}`; }));
  const dhCase = (name, qs, visible) => T(name, `${qs.length}\n${lines(qs.map(x => x.join(' ')))}\n`, dhAns(qs), visible);
  function dhQueries(r, q, primes) { return Array.from({ length: q }, () => { const p = pick(r, primes); return [p, 2n + big(r, 62) % (p - 3n), 1n + big(r, 62), 1n + big(r, 62)]; }); }
  add({
    id: 'net.security.dh', lesson: 19, title: 'Diffie-Hellman 金鑰交換', timeLimitMs: 1000, outputBytes: 2 << 20,
    statement: 'Alice 與 Bob 公開約定質數 p 與底數 g。Alice 的祕密是 a、Bob 的祕密是 b。請算出 Alice 公開送出的 A = gᵃ mod p、Bob 公開送出的 B = gᵇ mod p，以及雙方算出的共同祕密 K = Bᵃ mod p（它等於 Aᵇ mod p）。指數高達 10¹⁸，一次一次乘會太慢；模數接近 2⁶²，兩個數相乘會超過 64 位元。',
    input: '第一行 q（1 ≤ q ≤ 2×10⁴）；接著 q 行 p g a b（p 是質數，3 ≤ p < 2⁶²；2 ≤ g < p；1 ≤ a, b < 2⁶²）。',
    output: '每組一行三個整數：A B K。',
    cases: () => {
      const r = rng(2020), small = [23n, 47n, 97n, 101n, 65537n, 2147483647n], primes = Array.from({ length: 40 }, () => randPrime(r, ri(r, 40, 62)));
      return [
        dhCase('範例：課文的 p = 23', [[23n, 5n, 6n, 15n], [101n, 2n, 7n, 9n]], true),
        dhCase('範例：大一點的數', [[2147483647n, 16807n, 123456789n, 987654321n]], true),
        dhCase('小質數', Array.from({ length: 200 }, () => { const p = pick(r, small); return [p, 2n + BigInt(ri(r, 0, Number(p - 3n > 1000n ? 1000n : p - 3n))), BigInt(ri(r, 1, 1e9)), BigInt(ri(r, 1, 1e9))]; })),
        dhCase('接近 2⁶² 的質數', dhQueries(r, 300, primes.filter(p => p > 1n << 60n).concat([4611686018427387847n]))),
        dhCase('大型', dhQueries(r, 20000, primes))
      ];
    },
    starter: {
      python: 'import sys\n\ndef power(g, e, p):\n    result = 1\n    for _ in range(e):          # 一次一次乘：e 可能高達 10^18，太慢了\n        result = result * g % p\n    return result\n\ndef main():\n    data = sys.stdin.read().split()\n    q = int(data[0])\n    out = []\n    for i in range(q):\n        p, g, a, b = map(int, data[1 + 4 * i: 5 + 4 * i])\n        A = power(g, min(a, 1000), p)   # TODO: 換成快速冪（或內建的 pow(g, a, p)）\n        B = power(g, min(b, 1000), p)\n        out.append(f"{A} {B} {power(B, min(a, 1000), p)}")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <cstdio>\nusing namespace std;\ntypedef unsigned long long u64;\n\nu64 mulmod(u64 a, u64 b, u64 p) {\n    return a * b % p;           // TODO: a × b 可能超過 64 位元，改用 __int128\n}\n\nu64 power(u64 g, u64 e, u64 p) {\n    u64 r = 1;\n    // TODO: 快速冪：由低到高看 e 的每個位元\n    for (u64 i = 0; i < e && i < 1000; i++) r = mulmod(r, g, p);\n    return r;\n}\n\nint main() {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        u64 p, g, a, b;\n        scanf("%llu %llu %llu %llu", &p, &g, &a, &b);\n        u64 A = power(g, a, p), B = power(g, b, p);\n        printf("%llu %llu %llu\\n", A, B, power(B, a, p));\n    }\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst q = +d[0], out = [];\n// 一般的 Number 只有 53 位元精確度，這題要用 BigInt（例如 10n、x * y % p）\nfunction power(g, e, p) {\n  let r = 1n;\n  // TODO: 快速冪\n  for (let i = 0n; i < e && i < 1000n; i++) r = r * g % p;\n  return r;\n}\nfor (let i = 0; i < q; i++) {\n  const [p, g, a, b] = d.slice(1 + 4 * i, 5 + 4 * i).map(BigInt);\n  const A = power(g, a, p), B = power(g, b, p);\n  out.push(`${A} ${B} ${power(B, a, p)}`);\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\ntypedef unsigned long long u64;\n\nu64 mulmod(u64 a, u64 b, u64 p) {\n    return a * b % p;           /* TODO: a × b 可能超過 64 位元，改用 unsigned __int128 */\n}\n\nu64 power(u64 g, u64 e, u64 p) {\n    u64 r = 1;\n    /* TODO: 快速冪 */\n    for (u64 i = 0; i < e && i < 1000; i++) r = mulmod(r, g, p);\n    return r;\n}\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        u64 p, g, a, b;\n        scanf("%llu %llu %llu %llu", &p, &g, &a, &b);\n        u64 A = power(g, a, p), B = power(g, b, p);\n        printf("%llu %llu %llu\\n", A, B, power(B, a, p));\n    }\n    return 0;\n}\n'
    },
    hints: ['快速冪：r = 1；當 e > 0：若 e 是奇數則 r = r × g mod p；g = g × g mod p；e 除以 2。只需要 O(log e) 次乘法（約 60 次）。', 'p 接近 2⁶² 時，兩個小於 p 的數相乘最多約 2¹²⁴，超過 64 位元：C / C++ 用 unsigned __int128 計算乘積再取餘數，JavaScript 用 BigInt，Python 的整數沒有大小限制（也可以直接用 pow(g, a, p)）。'],
    explain: 'Diffie-Hellman 的安全性來自「正向容易、反向困難」：快速冪只要 O(log a) 次乘法就能算出 gᵃ mod p，但已知結果要反推 a（離散對數）在大質數下沒有已知的有效方法。實作時要特別注意乘法溢位：密碼學的模數通常有數千位元，實務上都使用大數函式庫。',
    tags: ['diffie-hellman', 'modular-exponentiation', 'overflow', 'security']
  });

  /* ---------- 第 21 章 整合：用 RTT 估計頁面載入時間 ---------- */
  function pageLoad(dns, rtt, tls, mode, k, main, doms) {
    const h = tls === 0 ? 0 : tls === 12 ? 2 : 1;
    let worst = 0;
    for (const [dom, c] of doms) {
      const other = dom !== main;
      const t = mode === 'NP' ? (other ? dns : 0) + Math.ceil(c / k) * (2 + h) * rtt
        : mode === 'P' ? (other ? dns + (1 + h) * rtt : 0) + c * rtt
          : (other ? dns + (1 + h) * rtt : 0) + rtt;
      worst = Math.max(worst, t);
    }
    return dns + (2 + h) * rtt + worst;
  }
  const plCase = (name, sc, visible) => T(name, `${sc.length}\n${sc.map(([dns, rtt, tls, mode, k, main, doms]) => `${dns} ${rtt} ${tls} ${mode} ${k} ${main} ${doms.length}${doms.length ? '\n' + lines(doms.map(x => x.join(' '))) : ''}`).join('\n')}\n`, lines(sc.map(s => pageLoad(...s))), visible);
  function plGen(r, q, maxDom) {
    const names = ['example.com', 'cdn.example.net', 'fonts.gstatic.com', 'img.shop.tw', 'api.example.com', 'ads.tracker.io', 'static.site.org', 'video.host.tv'];
    return Array.from({ length: q }, () => { const m = ri(r, 0, maxDom), main = names[0], ds = names.slice(0, Math.max(m, 0)).map((d, i) => [d, ri(r, 1, i === 0 ? 200 : 60)]); for (let i = ds.length - 1; i > 0; i--) { const j = ri(r, 0, i); [ds[i], ds[j]] = [ds[j], ds[i]]; } return [ri(r, 1, 300), ri(r, 1, 1000), pick(r, [0, 12, 13]), pick(r, ['NP', 'P', 'H2']), ri(r, 1, 8), main, ds]; });
  }
  add({
    id: 'net.web.page-load', lesson: 20, title: '估計 HTTPS 網頁的載入時間', timeLimitMs: 1000, outputBytes: 1 << 20,
    statement: '用 RTT 估計網頁載入時間（毫秒，忽略傳輸與處理時間）。先取得 HTML：DNS 查詢 dns 毫秒，加上 TCP 交握 1 個 RTT、TLS 交握 h 個 RTT（不加密 h = 0、TLS 1.2 h = 2、TLS 1.3 h = 1）、HTTP 請求 1 個 RTT。HTML 引用了若干網域的物件，各網域同時開始抓取，總時間是 HTML 的時間加上最慢的那個網域。主網域（HTML 所在）不需要再查 DNS；其他網域要先花 dns 毫秒。每個網域抓 c 個物件的時間：NP（非持續連線，每個網域最多 k 條平行連線）每一批最多 k 個、每批都要重新 TCP + TLS + HTTP，共 ⌈c / k⌉ × (2 + h) 個 RTT；P（持續連線、不管線化）主網域沿用 HTML 的連線，其他網域先建立一條連線（1 + h 個 RTT），之後每個物件 1 個 RTT；H2（HTTP/2，同一條連線上並行）建立連線的規則同 P，之後所有物件只要 1 個 RTT。',
    input: '第一行 q（1 ≤ q ≤ 10⁴）。每組第一行「dns rtt tls 模式 k 主網域 m」（1 ≤ dns, rtt ≤ 1000；tls 是 0、12 或 13；模式是 NP、P 或 H2；1 ≤ k ≤ 8；0 ≤ m ≤ 8），接著 m 行「網域 物件數」（1 ≤ 物件數 ≤ 10⁴，網域互不相同，可能包含主網域）。',
    output: '每組一行：載入時間（毫秒）。',
    cases: () => {
      const r = rng(2021), ex = 'example.com';
      return [
        plCase('範例：課文的 6 張圖', [[20, 80, 13, 'H2', 1, ex, [[ex, 6]]], [20, 80, 13, 'NP', 1, ex, [[ex, 6]]], [20, 80, 12, 'H2', 1, ex, []]], true),
        plCase('範例：第三方網域', [[30, 50, 13, 'P', 1, ex, [[ex, 4], ['cdn.example.net', 10]]], [30, 50, 13, 'NP', 5, ex, [[ex, 4], ['cdn.example.net', 10]]]], true),
        plCase('不加密的 HTTP', [[5, 100, 0, 'NP', 1, ex, [[ex, 10]]], [5, 100, 0, 'NP', 5, ex, [[ex, 10]]], [5, 100, 0, 'P', 1, ex, [[ex, 10]]], [5, 100, 0, 'H2', 1, ex, [[ex, 10]]]]),
        plCase('只有其他網域', [[100, 10, 12, 'P', 1, ex, [['fonts.gstatic.com', 3]]], [1, 1000, 13, 'H2', 2, ex, [['a.tw', 1], ['b.tw', 10000]]]]),
        plCase('隨機', plGen(r, 10000, 8))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    q = int(data[0])\n    p = 1\n    out = []\n    for _ in range(q):\n        dns, rtt, tls = int(data[p]), int(data[p + 1]), int(data[p + 2])\n        mode, k, main_dom, m = data[p + 3], int(data[p + 4]), data[p + 5], int(data[p + 6])\n        p += 7\n        doms = []\n        for _ in range(m):\n            doms.append((data[p], int(data[p + 1])))\n            p += 2\n        h = 0                     # TODO: 依 tls 決定 TLS 交握的 RTT 數\n        total = dns + (2 + h) * rtt\n        # TODO: 加上最慢的那個網域\n        out.append(str(total))\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int q;\n    cin >> q;\n    while (q--) {\n        long long dns, rtt, k;\n        int tls, m;\n        string mode, mainDom;\n        cin >> dns >> rtt >> tls >> mode >> k >> mainDom >> m;\n        long long h = 0;          // TODO: 依 tls 決定 TLS 交握的 RTT 數\n        long long worst = 0;\n        for (int i = 0; i < m; i++) {\n            string dom;\n            long long c;\n            cin >> dom >> c;\n            // TODO: 依模式計算這個網域的時間\n        }\n        cout << dns + (2 + h) * rtt + worst << "\\n";\n    }\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst q = +d[0], out = [];\nlet p = 1;\nfor (let t = 0; t < q; t++) {\n  const dns = +d[p], rtt = +d[p + 1], tls = +d[p + 2], mode = d[p + 3], k = +d[p + 4], main = d[p + 5], m = +d[p + 6];\n  p += 7;\n  let worst = 0;\n  for (let i = 0; i < m; i++) {\n    const dom = d[p], c = +d[p + 1];\n    p += 2;\n    // TODO: 依模式計算這個網域的時間\n  }\n  const h = 0;   // TODO: 依 tls 決定\n  out.push(String(dns + (2 + h) * rtt + worst));\n}\nconsole.log(out.join("\\n"));\n',
      c: '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    int q;\n    scanf("%d", &q);\n    while (q--) {\n        long long dns, rtt, k;\n        int tls, m;\n        char mode[4], mainDom[64];\n        scanf("%lld %lld %d %3s %lld %63s %d", &dns, &rtt, &tls, mode, &k, mainDom, &m);\n        long long h = 0, worst = 0;   /* TODO */\n        for (int i = 0; i < m; i++) {\n            char dom[64];\n            long long c;\n            scanf("%63s %lld", dom, &c);\n        }\n        printf("%lld\\n", dns + (2 + h) * rtt + worst);\n    }\n    return 0;\n}\n'
    },
    hints: ['先寫出 h：tls = 0 → 0、12 → 2、13 → 1。HTML 的時間 = dns + (1 + h + 1) × rtt。', '每個網域分別算出時間再取最大值（各網域同時進行）。主網域在 P 與 H2 模式下不需要新連線，在 NP 模式下每一批都要新連線；⌈c / k⌉ 可以寫成 (c + k − 1) / k。'],
    explain: '網頁載入時間多半由「來回幾趟」決定，而不是頻寬：每多一個第三方網域就多一次 DNS 與連線建立，非持續連線讓每批物件都重做握手，TLS 1.2 比 1.3 多一個 RTT。HTTP/2 把同網域的物件放在一條連線上並行，是把 RTT 次數降到最低的做法。這個模型忽略了傳輸時間與 TCP 慢啟動，但足以比較不同設計的取捨。',
    tags: ['http', 'tls', 'rtt', 'estimation']
  });

  /* ---------- 第 22 章 總複習：分析 TCP 封包紀錄 ---------- */
  function traceSummary(pk) {
    const conns = new Map(), order = [];
    for (const [src, dst, flags, seq, len] of pk) {
      const key = src < dst ? src + ' ' + dst : dst + ' ' + src;
      let c = conns.get(key);
      if (!c) { c = { client: src, server: dst, high: new Map(), bytes: new Map([[src, 0], [dst, 0]]), retrans: 0, fin: new Set(), rst: false }; conns.set(key, c); order.push(key); }
      if (flags.includes('R')) c.rst = true;
      if (flags.includes('S')) { c.high.set(src, seq + 1); continue; }
      if (len > 0) { const hi = c.high.get(src), end = seq + len; if (end <= hi) c.retrans++; else { c.bytes.set(src, c.bytes.get(src) + end - Math.max(seq, hi)); c.high.set(src, end); } }
      if (flags.includes('F')) { c.fin.add(src); c.high.set(src, Math.max(c.high.get(src), seq + len + 1)); }
    }
    return lines(order.map(k => { const c = conns.get(k); return `${c.client} > ${c.server} ${c.bytes.get(c.client)} ${c.bytes.get(c.server)} ${c.retrans} ${c.rst ? 'RESET' : c.fin.size === 2 ? 'CLOSED' : 'OPEN'}`; }));
  }
  function traceGen(r, nConn, steps) {
    const live = [], pk = [];
    const ip = () => `${ri(r, 10, 223)}.${ri(r, 0, 255)}.${ri(r, 0, 255)}.${ri(r, 1, 254)}`;
    for (let s = 0; s < steps; s++) {
      if (live.length < nConn && (r() < 0.08 || !live.length)) {
        const c = { a: `${ip()}:${ri(r, 1024, 65535)}`, b: `${ip()}:${pick(r, [80, 443, 22, 8080])}`, sa: ri(r, 0, 2e9), sb: ri(r, 0, 2e9), sent: { a: [], b: [] }, fin: {}, st: 0 };
        c.na = c.sa + 1; c.nb = c.sb + 1;
        pk.push([c.a, c.b, 'S', c.sa, 0], [c.b, c.a, 'SA', c.sb, 0], [c.a, c.b, 'A', c.na, 0]);
        live.push(c); continue;
      }
      const c = pick(r, live), side = r() < 0.55 ? 'a' : 'b', from = c[side], to = side === 'a' ? c.b : c.a, nk = side === 'a' ? 'na' : 'nb';
      if (c.fin[side]) { if (c.fin.a && c.fin.b) live.splice(live.indexOf(c), 1); continue; }
      const x = r();
      if (x < 0.12 && c.sent[side].length) { const [sq, ln] = pick(r, c.sent[side]); pk.push([from, to, 'A', sq, ln]); }
      else if (x < 0.15 && c.sent[side].length) { const [sq, ln] = c.sent[side][c.sent[side].length - 1]; const ext = ri(r, 1, 50); pk.push([from, to, 'A', sq, ln + ext]); c[nk] = sq + ln + ext; c.sent[side].push([sq, ln + ext]); }
      else if (x < 0.2) { pk.push([from, to, 'FA', c[nk], 0]); c.fin[side] = true; c[nk]++; }
      else if (x < 0.205) { pk.push([from, to, 'R', c[nk], 0]); live.splice(live.indexOf(c), 1); }
      else { const ln = ri(r, 1, 1460); pk.push([from, to, 'A', c[nk], ln]); c.sent[side].push([c[nk], ln]); c[nk] += ln; }
    }
    return pk;
  }
  const trCase = (name, pk, visible) => T(name, `${pk.length}\n${lines(pk.map(x => x.join(' ')))}\n`, traceSummary(pk), visible);
  const TR_SAMPLE = [['10.0.0.5:5000', '93.184.216.34:80', 'S', 100, 0], ['93.184.216.34:80', '10.0.0.5:5000', 'SA', 900, 0], ['10.0.0.5:5000', '93.184.216.34:80', 'A', 101, 0], ['10.0.0.5:5000', '93.184.216.34:80', 'A', 101, 300], ['10.0.0.5:5000', '93.184.216.34:80', 'A', 401, 300], ['10.0.0.5:5000', '93.184.216.34:80', 'A', 101, 300], ['93.184.216.34:80', '10.0.0.5:5000', 'A', 901, 1000], ['10.0.0.5:5000', '93.184.216.34:80', 'FA', 701, 0], ['93.184.216.34:80', '10.0.0.5:5000', 'FA', 1901, 0]];
  add({
    id: 'net.review.tcp-trace', lesson: 21, title: '綜合：從封包紀錄還原 TCP 連線', timeLimitMs: 1500, outputBytes: 2 << 20,
    statement: '給你一段 TCP 封包紀錄，每筆是「來源 目的 旗標 序號 資料長度」。同一對端點（不論方向）屬於同一條連線，每條連線的第一筆一定是客戶端送出的 SYN（旗標只有 S）。對每條連線、每個方向記住「目前的最高位置」：收到 SYN（S 或 SA）時設為序號 + 1。資料長度 > 0 的封包，結束位置 = 序號 + 長度：若結束位置 ≤ 最高位置就是重傳；否則新的位元組數是 結束位置 − max(序號, 最高位置)，並把最高位置設為結束位置。帶 F 的封包代表該方向送了 FIN（FIN 佔一個序號）。連線狀態：出現過 R 為 RESET；兩個方向都送過 FIN 為 CLOSED；否則 OPEN。',
    input: '第一行 n（1 ≤ n ≤ 1.5×10⁵）；接著 n 行「來源IP:埠 目的IP:埠 旗標 序號 長度」。旗標由 S、A、F、R 組成（例如 S、SA、A、FA、R）；0 ≤ 序號 < 2³²，序號加上長度不會超過 2³²；資料不會超前（序號不大於該方向目前的最高位置）。',
    output: '依連線第一次出現的順序，每條連線一行：「客戶端 > 伺服器 客戶端送出的位元組 伺服器送出的位元組 重傳次數 狀態」。',
    cases: () => {
      const r = rng(2022);
      return [
        trCase('範例：課文的封包紀錄', TR_SAMPLE, true),
        trCase('範例：兩條交錯的連線與重置', [['1.1.1.1:4000', '2.2.2.2:443', 'S', 0, 0], ['3.3.3.3:5000', '2.2.2.2:443', 'S', 50, 0], ['2.2.2.2:443', '1.1.1.1:4000', 'SA', 7000, 0], ['2.2.2.2:443', '3.3.3.3:5000', 'SA', 10, 0], ['1.1.1.1:4000', '2.2.2.2:443', 'A', 1, 100], ['3.3.3.3:5000', '2.2.2.2:443', 'A', 51, 10], ['1.1.1.1:4000', '2.2.2.2:443', 'A', 1, 150], ['2.2.2.2:443', '3.3.3.3:5000', 'R', 11, 0], ['1.1.1.1:4000', '2.2.2.2:443', 'FA', 151, 0]], true),
        trCase('只有握手', [['9.9.9.9:1', '8.8.8.8:53', 'S', 4294967294, 0], ['8.8.8.8:53', '9.9.9.9:1', 'SA', 5, 0], ['9.9.9.9:1', '8.8.8.8:53', 'A', 4294967295, 0]]),
        trCase('隨機', traceGen(r, 20, 3000)),
        trCase('大型', traceGen(r, 2000, 140000))
      ];
    },
    starter: {
      python: 'import sys\n\ndef main():\n    data = sys.stdin.buffer.read().split()\n    n = int(data[0])\n    conns = {}                 # 連線鍵 → 狀態\n    order = []\n    for i in range(n):\n        src, dst, flags = data[1 + 5 * i].decode(), data[2 + 5 * i].decode(), data[3 + 5 * i].decode()\n        seq, length = int(data[4 + 5 * i]), int(data[5 + 5 * i])\n        key = tuple(sorted((src, dst)))\n        if key not in conns:\n            conns[key] = {"client": src, "server": dst}\n            order.append(key)\n        # TODO: 依旗標與序號更新最高位置、位元組數、重傳次數與狀態\n    out = []\n    for key in order:\n        c = conns[key]\n        out.append(f"{c[\'client\']} > {c[\'server\']} 0 0 0 OPEN")\n    print("\\n".join(out))\n\nmain()\n',
      cpp: '#include <iostream>\n#include <string>\n#include <vector>\n#include <map>\n#include <algorithm>\n#include <utility>\nusing namespace std;\n\nstruct Conn { string client, server; };\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    map<pair<string, string>, int> id;\n    vector<Conn> conns;\n    for (int i = 0; i < n; i++) {\n        string src, dst, flags;\n        long long seq, len;\n        cin >> src >> dst >> flags >> seq >> len;\n        auto key = minmax(src, dst);\n        if (!id.count(key)) { id[key] = conns.size(); conns.push_back({src, dst}); }\n        // TODO: 依旗標與序號更新最高位置、位元組數、重傳次數與狀態\n    }\n    for (auto &c : conns) cout << c.client << " > " << c.server << " 0 0 0 OPEN\\n";\n    return 0;\n}\n',
      javascript: 'const d = readInput().trim().split(/\\s+/);\nconst n = +d[0], conns = new Map(), order = [];\nfor (let i = 0; i < n; i++) {\n  const src = d[1 + 5 * i], dst = d[2 + 5 * i], flags = d[3 + 5 * i], seq = +d[4 + 5 * i], len = +d[5 + 5 * i];\n  const key = src < dst ? src + " " + dst : dst + " " + src;\n  if (!conns.has(key)) { conns.set(key, { client: src, server: dst }); order.push(key); }\n  // TODO: 依旗標與序號更新最高位置、位元組數、重傳次數與狀態\n}\nconsole.log(order.map(k => { const c = conns.get(k); return `${c.client} > ${c.server} 0 0 0 OPEN`; }).join("\\n"));\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) {\n        char src[32], dst[32], flags[8];\n        long long seq, len;\n        scanf("%31s %31s %7s %lld %lld", src, dst, flags, &seq, &len);\n        /* TODO: 依連線分組（可以把端點字串排序後編號），再更新各方向的狀態 */\n    }\n    return 0;\n}\n'
    },
    hints: ['連線的鍵用「兩個端點排序後」組成，兩個方向就會對到同一條連線；第一筆封包的來源就是客戶端。每條連線替兩個方向各存一個最高位置與位元組數。', 'S 或 SA：最高位置 = 序號 + 1，不算資料。有資料時依結束位置判斷是否重傳；F 讓最高位置再加 1。最後依序輸出，狀態的優先順序是 RESET、CLOSED、OPEN。'],
    explain: '這題把整門課的觀念串起來：四元組識別連線（傳輸層的解多工）、SYN 與 FIN 佔用序號、序號以位元組計、重傳由序號範圍判斷。網路分析工具就是用這樣的規則從原始封包中還原出「誰和誰連線、傳了多少、哪裡重傳」，再進一步推斷問題出在哪一層。',
    tags: ['tcp', 'packet-capture', 'hash-map', 'review']
  });
})();
