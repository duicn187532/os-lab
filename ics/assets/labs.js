/* ICS LAB 互動實驗：全部透過 CSLab.frameLab 註冊（輸入 → 一串步驟畫面），自動獲得上一步、自動播放與步驟列表。
 * 視覺元件的 class 以 ix- 開頭（assets/ics-labs.css）。計算邏輯是純函式，放在 CSLab.sim.ics 供測試使用；
 * 第 4 章的迷你 CPU 與程式實作題（assets/code.js）用同一套指令集。 */
'use strict';
(function () {
const { h } = CSLab.ui;

/* ───────────── 視覺小工具 ───────────── */
const cell = (v, sub = '', st = '') => `<div class="ix-cell ${st}">${h(v)}${sub !== '' ? `<small>${h(sub)}</small>` : ''}</div>`;
const row = (items, cls = '') => `<div class="ix-row ${cls}">${items.join('')}</div>`;
const table = (head, rows, hi = -1) => `<div class="ix-scroll"><table class="ix-table"><thead><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr${i === hi || (Array.isArray(hi) && hi.includes(i)) ? ' class="on"' : ''}>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const kv = pairs => `<div class="ix-kv">${pairs.map(([k, v, st]) => `<div class="${st || ''}"><span>${h(k)}</span><b>${v}</b></div>`).join('')}</div>`;
const code = (lines, hi = -1) => `<pre class="ix-code">${lines.map((l, i) => `<span class="${i === hi || (Array.isArray(hi) && hi.includes(i)) ? 'on' : ''}">${h(l) || ' '}</span>`).join('')}</pre>`;
const stage = (...parts) => `<div class="ix-stage">${parts.filter(Boolean).join('')}</div>`;
const cap = t => `<p class="ix-cap">${h(t)}</p>`;
const F = (label, desc, visual, sub) => ({ label, desc, visual, sub });
const nums = (s, limit = 12) => String(s || '').split(/[，,\s]+/).filter(Boolean).map(Number).filter(n => Number.isInteger(n) && Math.abs(n) <= 9999).slice(0, limit);
const bin = (v, w = 8) => (v >>> 0).toString(2).padStart(w, '0').slice(-w);

/* ───────────── 0 計算思維：找最大值 ───────────── */
function maxFrames(v) {
  const a = nums(v.values), zero = v.init === 'zero';
  if (!a.length) return [F('沒有資料', '請輸入以逗號分隔的整數，例如 7,3,12,5。', '')];
  const out = [], draw = (i, best, bestAt, st) => stage(row(a.map((x, j) => cell(x, j, j === i ? 'on' : j === bestAt ? 'done' : ''))), kv([['best', h(best)], ['已比較', st]]));
  let best = zero ? 0 : a[0], at = zero ? -1 : 0, cmp = 0;
  out.push(F(zero ? '初始化 best = 0' : '初始化 best = 第一個數', zero ? '把 best 設成 0。這是常見的寫法，但它偷偷假設了「資料裡至少有一個數 ≥ 0」。' : `把 best 設成第一個數 ${a[0]}：它一定在資料裡，所以不需要任何額外假設。`, draw(zero ? -1 : 0, best, at, 0)));
  for (let i = zero ? 0 : 1; i < a.length; i++) {
    cmp++;
    const up = a[i] > best;
    out.push(F(`比較 a[${i}] = ${a[i]} 與 best = ${best}`, up ? `${a[i]} > ${best}，更新 best = ${a[i]}。` : `${a[i]} ≤ ${best}，best 不變（相等時也不更新）。`, draw(i, up ? a[i] : best, up ? i : at, cmp)));
    if (up) { best = a[i]; at = i; }
  }
  const real = Math.max(...a), wrong = best !== real;
  out.push(F(`輸出 ${best}`, wrong ? `錯了！真正的最大值是 ${real}。因為所有數都比 0 小，best 從來沒被更新，輸出了一個不在資料裡的數。` : `共比較 ${cmp} 次。${zero ? '這次結果正確，但只是因為資料裡有不小於 0 的數；試試全部是負數的資料。' : '比較次數是 n − 1，任何資料都適用。'}`, stage(row(a.map((x, j) => cell(x, j, j === at ? 'done' : ''))), kv([['輸出', h(best), wrong ? 'bad' : 'ok'], ['比較次數', cmp]])), wrong ? '演算法的正確性要對「所有」合法輸入成立，用邊界資料測試才能發現。' : ''));
  return out;
}

/* ───────────── 1 數字系統：連除取餘數 ───────────── */
const DIG = '0123456789ABCDEF';
function toBase(n, b) { if (n === 0) return '0'; let s = ''; while (n > 0) { s = DIG[n % b] + s; n = Math.floor(n / b); } return s; }
function baseFrames(v) {
  const n = v.n, b = +v.base, rows = [], out = [];
  const tbl = hi => table(['被除數', `÷ ${b}`, '商', '餘數'], rows.map(r => [r[0], b, r[1], `<b>${r[2]}</b>${b === 16 && r[2] > 9 ? ` (${DIG[r[2]]})` : ''}`]), hi);
  out.push(F(`把 ${n} 轉成 ${b} 進位`, `重複「除以 ${b}、記下餘數」，直到商為 0。餘數一定介於 0 和 ${b - 1} 之間，所以剛好是一個 ${b} 進位數字。`, stage(kv([['十進位', n], ['目標基數', b]]))));
  let x = n;
  if (x === 0) rows.push([0, 0, 0]);
  while (x > 0) {
    const q = Math.floor(x / b), r = x % b;
    rows.push([x, q, r]);
    out.push(F(`${x} ÷ ${b} = ${q} 餘 ${r}`, q ? `餘數 ${DIG[r]} 是目前「最右邊還沒填」的那一位；接著用商 ${q} 繼續除。` : `商已經是 0，停止。最後這個餘數 ${DIG[r]} 是最高位。`, stage(tbl(rows.length - 1))));
    x = q;
  }
  const s = toBase(n, b), w = s.length;
  out.push(F(`由下往上讀：${s}`, `第一個餘數是最低位，最後一個是最高位，所以要倒過來讀。`, stage(tbl([...rows.keys()]), row([...s].map((d, i) => cell(d, `${b}^${w - 1 - i}`, 'done'))))));
  const terms = [...s].map((d, i) => `${DIG.indexOf(d)}×${b}${sup(w - 1 - i)}`).join(' + ');
  out.push(F('驗算：位值相加', `${terms} = ${n}。` + (b === 2 ? `每 4 位一組就是十六進位：${n.toString(16).toUpperCase()}。` : b === 16 ? `每個十六進位數字展開成 4 個位元：${[...s].map(d => bin(DIG.indexOf(d), 4)).join(' ')}。` : `每個八進位數字展開成 3 個位元：${[...s].map(d => bin(DIG.indexOf(d), 3)).join(' ')}。`), stage(kv([['十進位', n], ['二進位', toBase(n, 2)], ['八進位', toBase(n, 8)], ['十六進位', toBase(n, 16)]]))));
  return out;
}
const sup = k => String(k).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('');

/* ───────────── 2 資料表示：8 位元二補數加法 ───────────── */
function twos8(x) { return x & 255; }
function signed8(u) { return u > 127 ? u - 256 : u; }
function addOverflow(a, b) { const s = signed8(twos8(a + b)); return { raw: twos8(a + b), value: s, overflow: s !== a + b, carry: (twos8(a) + twos8(b)) > 255 }; }
const bitsRow = (u, st = '') => row([...bin(u)].map((d, i) => cell(d, i === 0 ? '−128' : 2 ** (7 - i), st)), 'tight');
function encodeFrames(x, name) {
  if (x >= 0) return [F(`${name} = ${x}：直接寫成二進位`, `正數的二補數就是一般的二進位，最高位是 0。`, stage(bitsRow(twos8(x))))];
  const p = -x;
  return [F(`${name} = ${x}：先寫出 ${p}`, p === 128 ? '128 本身放不進 8 位元有號數，但 −128 可以：它的二補數是 1000 0000。' : `負數要用「反轉再加 1」。先寫出 ${p} 的二進位。`, stage(bitsRow(p & 255))),
    F('每個位元反轉，再加 1', `${bin(p)} → 反轉 ${bin(~p)} → 加 1 得 ${bin(twos8(x))}。驗算：最高位權重是 −128。`, stage(bitsRow(twos8(x), 'on')))];
}
function twosFrames(v) {
  const a = v.a, b = v.b, r = addOverflow(a, b), ua = twos8(a), ub = twos8(b);
  const carries = []; let c = 0;
  for (let i = 0; i < 8; i++) { const s = ((ua >> i) & 1) + ((ub >> i) & 1) + c; carries[i] = c; c = s >> 1; }
  const carryRow = row([...Array(8)].map((_, i) => cell(i === 0 ? c : carries[8 - i] || '', '', 'faint')), 'tight');
  const out = [...encodeFrames(a, 'a'), ...encodeFrames(b, 'b')];
  out.push(F('逐位相加，進位往左傳', `從最右邊開始，每一欄是 a 的位元 + b 的位元 + 右邊傳來的進位。第 9 位的進位（${c}）沒有地方放，直接捨棄。`, stage(cap('進位'), carryRow, bitsRow(ua), bitsRow(ub), `<hr class="ix-hr">`, bitsRow(r.raw, 'done'))));
  out.push(F(`結果的位元是 ${bin(r.raw)}`, r.raw > 127 ? `用無號整數讀是 ${r.raw}，用二補數讀是 ${r.value}：同一串位元，解讀方式不同，值就不同。` : `最高位是 0，用無號整數或二補數讀都是 ${r.value}。`, stage(bitsRow(r.raw, 'done'), kv([['無號', r.raw], ['有號（二補數）', r.value]]))));
  out.push(F(r.overflow ? '溢位！' : '沒有溢位', r.overflow ? `真正的和是 ${a + b}，超出 −128…127，所以結果 ${r.value} 是錯的。判斷法：a、b 同號，但結果的符號不同。` : `${a} + ${b} = ${a + b} 在 −128…127 之內，結果正確。${(a >= 0) !== (b >= 0) ? '正負相加永遠不會溢位。' : ''}${c ? '注意：第 9 位有進位，但對有號數來說那不代表溢位。' : ''}`, stage(kv([['真正的和', a + b], ['8 位元結果', r.value, r.overflow ? 'bad' : 'ok'], ['溢位', r.overflow ? '是' : '否', r.overflow ? 'bad' : 'ok']])), 'C++ 的有號整數溢位是未定義行為；這裡顯示的是硬體加法器實際算出的位元。'));
  return out;
}

/* ───────────── 3 邏輯閘：半加器與全加器 ───────────── */
function adder(a, b, c) { const x = a ^ b; return { x, s: x ^ c, and1: a & b, and2: c & x, cout: (a & b) | (c & x) }; }
function gateFrames(v) {
  const a = +v.a, b = +v.b, full = v.circuit === 'full', c = full ? +v.cin : 0, r = adder(a, b, c);
  const gate = (name, ins, out, on) => `<div class="ix-gate${on ? ' on' : ''}"><b>${name}</b><span>${ins}</span><i>${on === null ? '?' : out}</i></div>`;
  const truth = () => {
    const rows = [], hi = [];
    for (let i = 0; i < (full ? 8 : 4); i++) {
      const A = full ? i >> 2 & 1 : i >> 1 & 1, B = full ? i >> 1 & 1 : i & 1, C = full ? i & 1 : 0, q = adder(A, B, C);
      rows.push(full ? [A, B, C, q.s, q.cout] : [A, B, q.s, q.and1]);
      if (A === a && B === b && C === c) hi.push(i);
    }
    return table(full ? ['A', 'B', 'Cin', 'S', 'Cout'] : ['A', 'B', 'S', 'C'], rows, hi);
  };
  const steps = full ? [
    ['XOR₁ = A ⊕ B', `${a} ⊕ ${b} = ${r.x}`, 'x'], ['S = XOR₁ ⊕ Cin', `${r.x} ⊕ ${c} = ${r.s}`, 's'], ['AND₁ = A ∧ B', `${a} ∧ ${b} = ${r.and1}`, 'and1'],
    ['AND₂ = Cin ∧ XOR₁', `${c} ∧ ${r.x} = ${r.and2}`, 'and2'], ['Cout = AND₁ ∨ AND₂', `${r.and1} ∨ ${r.and2} = ${r.cout}`, 'cout']
  ] : [['S = A ⊕ B', `${a} ⊕ ${b} = ${r.x}`, 'x'], ['C = A ∧ B', `${a} ∧ ${b} = ${r.and1}`, 'and1']];
  const out = [F(`輸入 A = ${a}、B = ${b}${full ? `、Cin = ${c}` : ''}`, full ? '全加器把三個位元相加：兩個運算元加上右邊傳來的進位，輸出和 S 與進位 Cout。' : '半加器把兩個位元相加，輸出和 S 與進位 C。', stage(kv([['A', a], ['B', b], ...(full ? [['Cin', c]] : [])]), truth()))];
  steps.forEach(([name, calc], k) => out.push(F(name, `${calc}。${k === 0 ? 'XOR 在兩個輸入不同時輸出 1，正好是「不考慮進位的和」。' : name.startsWith('Cout') ? '只要 A、B 都是 1，或其中一個是 1 且有進位進來，就會往左進位。' : name.startsWith('C =') ? 'AND 在兩個輸入都是 1 時輸出 1，這就是進位。' : ''}`, stage(`<div class="ix-gates">${steps.map(([n, cc], j) => gate(n, j <= k ? cc.split(' = ')[0] : '', j <= k ? cc.split(' = ')[1] : '', j <= k ? j === k : null)).join('')}</div>`))));
  const sum = a + b + c, sOut = full ? r.s : r.x, cOut = full ? r.cout : r.and1;
  out.push(F(`結果：進位 ${cOut}、和 ${sOut}`, `${a} + ${b}${full ? ` + ${c}` : ''} = ${sum}，二進位是 ${cOut}${sOut}。和真值表的這一列一致。`, stage(kv([['S', sOut, 'ok'], [full ? 'Cout' : 'C', cOut, 'ok'], ['十進位', sum]]), truth()), '把 8 個全加器的 Cout 接到下一個的 Cin，就是 8 位元加法器。'));
  return out;
}

/* ───────────── 4 硬體：迷你累加器 CPU ───────────── */
// 指令 = 運算碼 × 100 + 位址；1 LOAD、2 ADD、3 SUB、4 STORE、5 JMP、6 JZ（ACC 為 0 才跳）、7 JN（ACC 為負才跳）、0 HALT
const OPS = { 0: 'HALT', 1: 'LOAD', 2: 'ADD', 3: 'SUB', 4: 'STORE', 5: 'JMP', 6: 'JZ', 7: 'JN' };
const PROGRAMS = {
  add: { name: 'a + b', mem: { 0: 110, 1: 211, 2: 412, 3: 0, 10: 7, 11: 5 }, note: '把位址 10 與 11 的值相加，存到位址 12。' },
  loop: { name: '1 + 2 + … + n', mem: { 0: 122, 1: 220, 2: 422, 3: 120, 4: 321, 5: 420, 6: 608, 7: 500, 8: 0, 20: 3, 21: 1, 22: 0 }, note: '位址 20 是 n、21 是常數 1、22 是總和；每輪把 n 加進總和再減 1，直到 n 為 0。' }
};
function cpuRun(memInit, limit = 1000) {
  const mem = Array(100).fill(0); for (const [k, x] of Object.entries(memInit)) mem[k] = x;
  let pc = 0, acc = 0; const trace = [];
  for (let step = 0; step < limit; step++) {
    if (pc < 0 || pc > 99) return { trace, mem, acc, error: 'PC 超出記憶體' };
    const ir = mem[pc], op = Math.floor(ir / 100), addr = ir % 100, before = { pc, acc };
    pc++;
    let effect = '';
    if (op === 0) { trace.push({ ...before, ir, op, addr, effect: '停止', pcAfter: pc - 1, accAfter: acc }); return { trace, mem, acc, halted: true }; }
    if (op === 1) { acc = mem[addr]; effect = `ACC ← M[${addr}] = ${acc}`; }
    else if (op === 2) { acc += mem[addr]; effect = `ACC ← ${before.acc} + M[${addr}] = ${acc}`; }
    else if (op === 3) { acc -= mem[addr]; effect = `ACC ← ${before.acc} − M[${addr}] = ${acc}`; }
    else if (op === 4) { mem[addr] = acc; effect = `M[${addr}] ← ${acc}`; }
    else if (op === 5) { pc = addr; effect = `PC ← ${addr}`; }
    else if (op === 6) { if (acc === 0) pc = addr; effect = acc === 0 ? `ACC = 0，PC ← ${addr}` : 'ACC ≠ 0，不跳'; }
    else if (op === 7) { if (acc < 0) pc = addr; effect = acc < 0 ? `ACC < 0，PC ← ${addr}` : 'ACC ≥ 0，不跳'; }
    else return { trace, mem, acc, error: `未知的運算碼 ${op}` };
    trace.push({ ...before, ir, op, addr, effect, pcAfter: pc, accAfter: acc, mem: mem.slice() });
  }
  return { trace, mem, acc, error: '超過步數上限' };
}
function cpuFrames(v) {
  const P = PROGRAMS[v.program], init = { ...P.mem };
  if (v.program === 'loop') init[20] = v.n;
  const run = cpuRun(init), addrs = Object.keys(init).map(Number).concat(v.program === 'add' ? [12] : []).filter((x, i, s) => s.indexOf(x) === i).sort((a, b) => a - b);
  const disasm = x => OPS[Math.floor(x / 100)] !== undefined && x < 800 ? `${OPS[Math.floor(x / 100)]}${Math.floor(x / 100) ? ' ' + (x % 100) : ''}` : '';
  const memView = (mem, pc, touch) => table(['位址', '內容', '當成指令'], addrs.map(a => [`${a}${a === pc ? ' ◀ PC' : ''}`, `<b>${mem[a]}</b>`, a < 10 ? disasm(mem[a]) : '（資料）']), addrs.map((a, i) => a === pc || a === touch ? i : -1).filter(i => i >= 0));
  const regs = (pc, ir, acc) => kv([['PC', pc], ['IR', ir === null ? '—' : ir], ['ACC', acc]]);
  const out = [F(`程式：${P.name}`, P.note + ' 每條指令是「運算碼 × 100 + 位址」，例如 211 = ADD 11。', stage(regs(0, null, 0), memView(Array.from({ length: 100 }, (_, i) => init[i] || 0), 0)))];
  let mem = Array.from({ length: 100 }, (_, i) => init[i] || 0);
  const phase = v.detail === 'phase';
  run.trace.forEach((t, k) => {
    const name = `${OPS[t.op]}${t.op ? ' ' + t.addr : ''}`, touch = [1, 2, 3, 4].includes(t.op) ? t.addr : -1;
    if (phase) {
      out.push(F(`#${k + 1} 擷取（Fetch）`, `依 PC = ${t.pc} 讀出指令 ${t.ir} 放進 IR，PC 先加一變成 ${t.pc + 1}。`, stage(regs(t.pc + 1, t.ir, t.acc), memView(mem, t.pc))));
      out.push(F(`#${k + 1} 解碼（Decode）`, `${t.ir} → 運算碼 ${t.op}（${OPS[t.op]}）、位址 ${t.addr}。`, stage(regs(t.pc + 1, t.ir, t.acc), memView(mem, t.pc, touch))));
    }
    if (t.mem) mem = t.mem;
    out.push(F(phase ? `#${k + 1} 執行：${name}` : `#${k + 1} ${name}`, t.effect + '。' + (t.op === 0 ? `程式結束。${v.program === 'add' ? `M[12] = ${mem[12]}。` : `總和 M[22] = ${mem[22]}。`}` : ''), stage(regs(t.pcAfter, t.ir, t.accAfter), memView(mem, t.pcAfter, touch)), t.op === 0 ? `共執行 ${run.trace.length} 條指令。` : ''));
  });
  if (run.error) out.push(F('停止', run.error, ''));
  return out;
}

/* ───────────── 5 作業系統：建置流程 ───────────── */
const BUILD = {
  ok: { src: ['#include <iostream>', 'int square(int x);', 'int main() {', '    std::cout << square(7) << "\\n";', '}', 'int square(int x) { return x * x; }'], fail: null, out: '49' },
  syntax: { src: ['#include <iostream>', 'int main() {', '    int x = 7', '    std::cout << x * x << "\\n";', '}'], fail: ['compile', 3, "main.cpp:4:5: error: expected ',' or ';' before 'std'"], out: '' },
  link: { src: ['#include <iostream>', 'int square(int x);      // 只有宣告', 'int main() {', '    std::cout << square(7) << "\\n";', '}'], fail: ['link', 3, "undefined reference to `square(int)'"], out: '' },
  runtime: { src: ['#include <iostream>', 'int main() {', '    int n = 0;', '    std::cout << 10 / n << "\\n";', '}'], fail: ['run', 3, '整數除以零：未定義行為，常見結果是 Floating point exception（SIGFPE）'], out: '' }
};
const STAGES = [['pre', '前置處理', '展開 #include 與巨集，產生一個很長的 .ii 檔'], ['compile', '編譯', '檢查語法與型別，翻譯成組合語言 .s'], ['asm', '組譯', '把組合語言轉成機器碼，產生目的檔 .o'], ['link', '連結', '找出每個函式的定義，加入標準函式庫，產生執行檔'], ['run', '執行', '作業系統載入執行檔、建立行程，從 main 開始執行']];
function buildFrames(v) {
  const B = BUILD[v.scenario], out = [];
  const pipe = (k, bad) => `<div class="ix-pipe">${STAGES.map(([, n], i) => `<span class="${i < k ? 'done' : i === k ? (bad ? 'bad' : 'on') : ''}">${n}</span>`).join('<i>→</i>')}</div>`;
  out.push(F('原始碼 main.cpp', '這是要建置的程式。先猜猜看：它會在哪個階段失敗，還是能順利執行？', stage(code(B.src))));
  for (let k = 0; k < STAGES.length; k++) {
    const [id, name, what] = STAGES[k], bad = B.fail && B.fail[0] === id;
    if (bad) {
      out.push(F(`${name}失敗`, `${B.fail[2]}。${id === 'compile' ? '編譯器讀到下一行的 std 才發現上一行沒有結束，所以錯誤常被報在「下一行」。' : id === 'link' ? '編譯器看到宣告就放行了；直到連結時才發現沒有任何地方定義 square。' : '編譯與連結都成功了，但執行時才出錯：這種錯誤編譯器不會幫你找。'}`, stage(pipe(k, true), code(B.src, B.fail[1]), `<pre class="ix-term bad">${h(B.fail[2])}</pre>`), id === 'run' ? '執行時錯誤要靠測試與檢查輸入來預防。' : '修好之後要從頭重新建置。'));
      return out;
    }
    out.push(F(`${name}`, `${what}。${id === 'run' ? `輸出 ${B.out}，main 回傳 0，行程結束。` : ''}`, stage(pipe(k + (id === 'run' ? 1 : 0), false), id === 'run' ? `<pre class="ix-term">$ ./main\n${h(B.out)}</pre>` : '')));
  }
  return out;
}

/* ───────────── 6 網路：封裝與子網路 ───────────── */
function parseIp(s) { const m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/); if (!m) return null; const p = m.slice(1).map(Number); return p.every(x => x <= 255) ? ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3] : null; }
const ipStr = x => [x >>> 24, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join('.');
function subnet(ip, prefix) { const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0, net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0; return { mask, net, bc, hosts: prefix >= 31 ? 0 : 2 ** (32 - prefix) - 2 }; }
function netFrames(v) {
  if (v.mode === 'subnet') {
    const ip = parseIp(v.ip), p = v.prefix;
    if (ip === null) return [F('IP 格式不正確', '請輸入像 192.168.10.77 這樣的 IPv4 位址（四個 0–255 的數字）。', '')];
    const r = subnet(ip, p), b32 = x => bin(x >>> 0, 32).replace(/(.{8})(?!$)/g, '$1 ');
    const show = (rows, hi) => `<div class="ix-scroll"><table class="ix-table mono"><tbody>${rows.map(([k, val, dec], i) => `<tr${i === hi ? ' class="on"' : ''}><th>${k}</th><td>${val}</td><td>${dec}</td></tr>`).join('')}</tbody></table></div>`;
    const base = [['IP', b32(ip), ipStr(ip)], [`遮罩 /${p}`, b32(r.mask), ipStr(r.mask)]];
    return [
      F(`${ipStr(ip)}/${p}`, `/${p} 代表前 ${p} 個位元是網路部分，後 ${32 - p} 個位元是主機部分。`, stage(show(base))),
      F('網路位址 = IP AND 遮罩', '把主機部分的位元全部清成 0。', stage(show([...base, ['網路位址', b32(r.net), ipStr(r.net)]], 2))),
      F('廣播位址 = 網路位址 OR NOT 遮罩', '把主機部分的位元全部設成 1。送到這個位址的封包會給同一個子網路的所有主機。', stage(show([...base, ['網路位址', b32(r.net), ipStr(r.net)], ['廣播位址', b32(r.bc), ipStr(r.bc)]], 3))),
      F(`可用主機 ${r.hosts} 台`, p >= 31 ? '/31 與 /32 是特殊情況（點對點連線或單一主機），不扣掉網路與廣播位址。' : `主機部分有 ${32 - p} 個位元，共 2${sup(32 - p)} 個位址，扣掉網路位址與廣播位址，剩 ${r.hosts} 個。`, stage(kv([['網路位址', ipStr(r.net)], ['廣播位址', ipStr(r.bc)], ['可用範圍', p >= 31 ? '—' : `${ipStr(r.net + 1)} – ${ipStr(r.bc - 1)}`], ['主機數', r.hosts]])))
    ];
  }
  const tcp = v.mode === 'tcp';
  const L = tcp
    ? [['應用層', 'HTTP', 'GET /index.html'], ['傳輸層', 'TCP', '來源埠 51234 → 目的埠 443，序號、確認號'], ['網路層', 'IP', '192.168.1.10 → 93.184.216.34，TTL 64'], ['連結層', 'Ethernet', 'MAC 位址：你的網卡 → 預設閘道']]
    : [['應用層', 'DNS', '查詢 www.example.com 的 A 紀錄'], ['傳輸層', 'UDP', '來源埠 53001 → 目的埠 53（只有 8 位元組標頭）'], ['網路層', 'IP', '192.168.1.10 → 8.8.8.8，TTL 64'], ['連結層', 'Ethernet', 'MAC 位址：你的網卡 → 預設閘道']];
  const nest = (k, from) => { let html = `<div class="ix-pkt data"><b>${h(L[0][1])}</b><span>${h(L[0][2])}</span></div>`; for (let i = 1; i <= k; i++) html = `<div class="ix-pkt l${i}"><b>${h(L[i][1])} 標頭</b><span>${h(L[i][2])}</span>${html}</div>`; return `<div class="ix-nest${from ? ' recv' : ''}">${html}</div>`; };
  const out = [F(`${L[0][1]} 訊息`, tcp ? '瀏覽器要向伺服器要一個網頁。訊息本身只關心「要什麼」，不管怎麼送。' : 'DNS 查詢：問 DNS 伺服器某個網域名稱的 IP 位址。', stage(nest(0)))];
  for (let i = 1; i < 4; i++) out.push(F(`${L[i][0]}：加上 ${L[i][1]} 標頭`, i === 1 ? (tcp ? 'TCP 用埠號找到對方的程式，用序號保證順序；送資料前還要先三向交握建立連線。' : 'UDP 只加上埠號與長度，不建立連線、不保證送達，所以又快又輕。') : i === 2 ? 'IP 標頭寫上來源與目的 IP，路由器只看這一層決定往哪裡送。' : '連結層只負責「送到下一站」，所以 MAC 位址是閘道的，不是最終伺服器的。', stage(nest(i))));
  out.push(F('經過路由器轉送', '每個路由器拆掉舊的連結層標頭、看 IP 目的位址查路由表、TTL 減 1，再包上新的連結層標頭送往下一站。IP 位址一路不變，MAC 位址每一站都換。', stage(`<div class="ix-pipe"><span class="done">你的電腦</span><i>→</i><span class="on">路由器 TTL 63</span><i>→</i><span class="on">路由器 TTL 62</span><i>→</i><span>伺服器</span></div>`, nest(3))));
  out.push(F('伺服器逐層解封裝', `由下往上：連結層確認是給自己的 → IP 確認目的位址 → ${tcp ? 'TCP 依埠號 443 交給網頁伺服器程式' : 'UDP 依埠號 53 交給 DNS 伺服器程式'} → 應用程式讀到原始訊息並回覆。`, stage(nest(0, true)), '每一層只讀自己的標頭，這就是分層的好處：換掉 Wi-Fi 或乙太網路，上面的 HTTP 完全不用改。'));
  return out;
}

/* ───────────── 7 輸入輸出：cin 的讀取游標 ───────────── */
const CIN_PROGS = {
  nameAge: { lines: ['string name;', 'int age;', 'cin >> name >> age;'], ops: [['>>', 'name', 'string'], ['>>', 'age', 'int']], at: [2, 2] },
  twoInt: { lines: ['int a, b;', 'cin >> a >> b;'], ops: [['>>', 'a', 'int'], ['>>', 'b', 'int']], at: [1, 1] },
  getline: { lines: ['int n;', 'string s;', 'cin >> n;', 'getline(cin, s);'], ops: [['>>', 'n', 'int'], ['getline', 's', 'line']], at: [2, 3] },
  ws: { lines: ['int n;', 'string s;', 'cin >> n;', 'getline(cin >> ws, s);'], ops: [['>>', 'n', 'int'], ['ws'], ['getline', 's', 'line']], at: [2, 3, 3] }
};
function cinRun(input, ops) {
  const s = input, steps = []; let i = 0, fail = false; const vars = {};
  const isWs = c => c === ' ' || c === '\n' || c === '\t';
  for (const [kind, name, type] of ops) {
    const from = i;
    if (kind === 'ws') { while (i < s.length && isWs(s[i])) i++; steps.push({ kind, from, to: i, text: `ws 丟掉 ${i - from} 個空白字元` }); continue; }
    if (fail) { steps.push({ kind, name, from, to: i, fail: true, text: `cin 已在失敗狀態，這次讀取直接跳過，${name} 不變` }); continue; }
    if (kind === 'getline') {
      let j = i; while (j < s.length && s[j] !== '\n') j++;
      vars[name] = JSON.stringify(s.slice(i, j));
      const eaten = j < s.length ? 1 : 0;
      steps.push({ kind, name, from, start: i, to: j + eaten, value: vars[name], text: j === i ? '游標正好停在換行字元上：getline 讀到 0 個字元就結束，得到空字串，並把換行吃掉' : `讀到換行為止（含空白），換行被吃掉但不放進字串` });
      i = j + eaten; continue;
    }
    while (i < s.length && isWs(s[i])) i++;
    const start = i;
    if (type === 'int') {
      let j = i; if (s[j] === '-' || s[j] === '+') j++;
      const d0 = j; while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      if (j === d0) { fail = true; vars[name] = '0'; steps.push({ kind, name, from, start, to: start, fail: true, value: '0', text: start >= s.length ? '已經沒有輸入了：讀取失敗，cin 進入失敗狀態，變數被設成 0' : `「${s[start]}」不能組成整數：讀取失敗，cin 進入失敗狀態，變數被設成 0` }); i = start; continue; }
      vars[name] = String(Number(s.slice(i, j)));
      steps.push({ kind, name, from, start, to: j, value: vars[name], text: `跳過 ${start - from} 個空白，讀到非數字字元前停下，轉成整數 ${vars[name]}` }); i = j;
    } else {
      if (start >= s.length) { fail = true; steps.push({ kind, name, from, start, to: start, fail: true, text: '已經沒有輸入了：讀取失敗，cin 進入失敗狀態' }); continue; }
      let j = i; while (j < s.length && !isWs(s[j])) j++;
      vars[name] = JSON.stringify(s.slice(i, j));
      steps.push({ kind, name, from, start, to: j, value: vars[name], text: `跳過 ${start - from} 個空白，讀到下一個空白前停下` }); i = j;
    }
  }
  return { steps, vars, fail };
}
function cinFrames(v) {
  const P = CIN_PROGS[v.prog], input = String(v.input).replace(/\|/g, '\n') + '\n', run = cinRun(input, P.ops);
  const buf = (cur, a = -1, b = -1) => row([...input].map((c, i) => cell(c === '\n' ? '↵' : c === ' ' ? '␠' : c, i, i >= a && i < b ? 'on' : i < cur ? 'faint' : '')).concat(cell('EOF', '', 'faint')), 'tight left');
  const vars = known => kv(P.ops.filter(o => o[1]).map(([, n]) => [n, known[n] !== undefined ? h(known[n]) : '—']));
  const out = [F('輸入緩衝區', `程式收到的輸入是一串字元（␠ 是空白、↵ 是 Enter 產生的換行）。游標從最左邊開始。${v.prog === 'getline' || v.prog === 'ws' ? '用 | 代表換行，例如 3|hello world。' : ''}`, stage(code(P.lines), buf(0), vars({})))];
  const known = {};
  run.steps.forEach((st, k) => {
    if (st.name && st.value !== undefined) known[st.name] = st.value;
    const title = st.kind === 'ws' ? 'cin >> ws' : st.kind === 'getline' ? `getline(cin, ${st.name})` : `cin >> ${st.name}`;
    out.push(F(title, st.text + '。', stage(code(P.lines, P.at[k]), buf(st.to, st.start ?? st.from, st.to), vars(known)), st.fail ? '失敗後要用 cin.clear() 清除狀態，並丟掉造成錯誤的輸入，才能繼續讀。' : ''));
  });
  const bad = v.prog === 'getline' && run.vars.s === '""';
  out.push(F(bad ? '結果：s 是空字串！' : run.fail ? '結果：讀取失敗' : '結果', bad ? '這就是「>> 之後接 getline」的陷阱：>> 讀完數字後，換行還留在緩衝區。改成 getline(cin >> ws, s) 試試。' : run.fail ? '輸入的格式和程式預期的型別不符。' : '每次 >> 都先跳過空白，所以多個空白或換行都不影響結果。', stage(vars(known))));
  return out;
}

/* ───────────── 8 運算子：整數除法、餘數、轉型與溢位 ───────────── */
const wrap32 = x => Number(BigInt.asIntN(32, BigInt(x)));
function exprFrames(v) {
  const a = v.a, b = v.b, out = [];
  out.push(F(`int a = ${a}, b = ${b};`, '兩個都是 int。接下來每一步，先猜結果再看。', stage(kv([['a', a], ['b', b]]))));
  if (b === 0) { out.push(F('a / b：除以零', '整數除以零是未定義行為，程式通常會直接當掉（SIGFPE）。寫除法前要先確定除數不是 0。', stage(kv([['a / b', '未定義', 'bad']])))); return out; }
  const q = Math.trunc(a / b), r = a - q * b;
  out.push(F(`a / b = ${q}`, `兩個 int 相除，結果還是 int：真正的商是 ${(a / b).toFixed(4).replace(/\.?0+$/, '')}，向零捨入成 ${q}${a / b < 0 && !Number.isInteger(a / b) ? '（負數也是往 0 的方向，不是往下）' : ''}。`, stage(kv([['a / b', q]]))));
  out.push(F(`a % b = ${r}`, `餘數滿足 (a / b) × b + a % b = a：${q} × ${b} + ${r} = ${a}。餘數的正負號跟被除數 a 相同。`, stage(kv([['a / b', q], ['a % b', r], ['驗算', `${q}×${b}+${r} = ${a}`]]))));
  const d = a / b, ds = Number.isInteger(d) ? String(d) : String(+d.toPrecision(15));
  out.push(F(`(double)a / b = ${ds}`, '先把 a 轉成 double，另一邊的 b 也會自動轉成 double，所以做的是浮點除法。', stage(kv([['(double)a / b', ds, 'ok'], ['(double)(a / b)', q, 'bad']])), '括號的位置很重要：(double)(a / b) 先做完整數除法才轉型，小數早就不見了。'));
  const p = BigInt(a) * BigInt(b), w = wrap32(p), of = BigInt(w) !== p;
  out.push(F(of ? 'a * b 溢位了' : `a * b = ${p}`, of ? `真正的積是 ${p}，超過 int 的範圍（約 ±2.1 × 10⁹）。有號溢位是未定義行為；常見的硬體會留下低 32 位元，得到 ${w}。要先寫 1LL * a * b。` : `積在 int 範圍內，沒有問題。試試 a = b = 50000。`, stage(kv([['int：a * b', of ? `${w}（未定義）` : String(p), of ? 'bad' : 'ok'], ['long long：1LL * a * b', String(p), 'ok']]))));
  return out;
}

/* ───────────── 9 條件判斷：閏年 ───────────── */
function leapFrames(v) {
  const y = v.year, wrong = v.order === 'wrong';
  const L = wrong ? ['if (y % 4 == 0) leap = true;', 'else if (y % 100 == 0) leap = false;', 'else if (y % 400 == 0) leap = true;', 'else leap = false;'] : ['if (y % 400 == 0) leap = true;', 'else if (y % 100 == 0) leap = false;', 'else if (y % 4 == 0) leap = true;', 'else leap = false;'];
  const tests = wrong ? [[4, true], [100, false], [400, true]] : [[400, true], [100, false], [4, true]];
  const truth = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0, out = [F(`y = ${y}`, `規則：能被 4 整除是閏年，但能被 100 整除的不是，除非也能被 400 整除。${wrong ? '這個版本把條件的順序寫反了。' : ''}`, stage(code(L)))];
  let res = null;
  for (let k = 0; k < 3; k++) {
    const [m, val] = tests[k], ok = y % m === 0;
    out.push(F(`${y} % ${m} == 0 ？${ok ? '成立' : '不成立'}`, ok ? `${y} % ${m} = 0，進入這個分支，leap = ${val}。後面的 else if 全部略過。` : `${y} % ${m} = ${y % m}，往下檢查下一個 else if。`, stage(code(L, k), kv([['y % ' + m, y % m]]))));
    if (ok) { res = val; break; }
  }
  if (res === null) { res = false; out.push(F('全部不成立 → else', '前面三個條件都不成立，執行 else：平年。', stage(code(L, 3)))); }
  const bad = res !== truth;
  out.push(F(`結果：${res ? '閏年' : '平年'}`, bad ? `錯了！${y} 應該是${truth ? '閏年' : '平年'}。${y % 4 === 0 ? `因為 % 4 先成立，% 100 與 % 400 的檢查根本沒機會執行。` : ''}最特殊的條件要放在最前面。` : `正確。${wrong ? '這次剛好對，試試 1900 或 2100。' : '一行寫法：(y % 4 == 0 && y % 100 != 0) || y % 400 == 0。'}`, stage(kv([['程式的答案', res ? '閏年' : '平年', bad ? 'bad' : 'ok'], ['正確答案', truth ? '閏年' : '平年']]))));
  return out;
}

/* ───────────── 10 迴圈：求和、試除、篩法 ───────────── */
function sieve(n) { const c = Array(n + 1).fill(false), p = []; for (let i = 2; i <= n; i++) { if (c[i]) continue; p.push(i); for (let j = i * i; j <= n; j += i) c[j] = true; } return p; }
function loopFrames(v) {
  const n = v.n, out = [];
  if (v.mode === 'sum') {
    const L = ['int sum = 0;', 'for (int i = 1; i <= n; i++) {', '    sum += i;', '}'];
    let sum = 0; const hist = [];
    out.push(F('初始化：sum = 0、i = 1', '迴圈不變量：每一圈開始時，sum 等於 1 到 i − 1 的總和。現在 i = 1，總和是 0，成立。', stage(code(L, [0, 1]), kv([['i', 1], ['sum', 0]]))));
    for (let i = 1; i <= Math.min(n, 12); i++) {
      sum += i; hist.push([i, `${i} <= ${n}`, sum]);
      out.push(F(`i = ${i}：sum = ${sum}`, `檢查 ${i} <= ${n} 成立 → 執行本體 sum += ${i} → i++。`, stage(code(L, 2), table(['i', '條件', 'sum'], hist, hist.length - 1))));
    }
    if (n > 12) { for (let i = 13; i <= n; i++) sum += i; out.push(F(`……跳到 i = ${n}`, `中間的步驟都一樣，sum = ${sum}。`, stage(kv([['sum', sum]])))); }
    out.push(F(`i = ${n + 1}：條件不成立，離開`, `${n + 1} <= ${n} 不成立。本體執行了 ${n} 次，sum = ${sum} = ${n} × ${n + 1} ÷ 2。寫成 i < n 會少加一次，這就是差一錯誤。`, stage(kv([['sum', sum, 'ok'], ['公式', n * (n + 1) / 2]]))));
    return out;
  }
  if (v.mode === 'trial') {
    const L = ['bool prime = n >= 2;', 'for (int d = 2; d * d <= n; d++)', '    if (n % d == 0) { prime = false; break; }'];
    if (n < 2) return [F(`${n} 不是質數`, '質數定義為大於 1、只有 1 和自己兩個因數的整數。', stage(code(L, 0)))];
    let d = 2, found = 0;
    out.push(F(`檢查 ${n} 是不是質數`, `只需檢查 d = 2 到 √${n} ≈ ${Math.sqrt(n).toFixed(2)}：如果 n = d × e 且 d ≤ e，d 一定不超過 √n。`, stage(code(L, 0))));
    for (; d * d <= n; d++) {
      const div = n % d === 0;
      out.push(F(`d = ${d}：${n} % ${d} = ${n % d}`, div ? `整除！${n} = ${d} × ${n / d}，不是質數，break 離開迴圈。` : `不整除，繼續。`, stage(code(L, 2), kv([['d', d], ['d × d', d * d], [`${n} % d`, n % d, div ? 'bad' : '']]))));
      if (div) { found = d; break; }
    }
    if (!found) out.push(F(`d = ${d}：${d} × ${d} = ${d * d} > ${n}，停止`, `沒有找到因數，${n} 是質數。只檢查了 ${d - 2} 個除數，而不是 ${n - 2} 個。`, stage(kv([['結果', '質數', 'ok']]))));
    return out;
  }
  const m = Math.max(2, n), comp = Array(m + 1).fill(false), grid = (on = -1) => `<div class="ix-grid">${Array.from({ length: m - 1 }, (_, k) => k + 2).map(x => `<span class="${x === on ? 'on' : comp[x] ? 'off' : 'done'}">${x}</span>`).join('')}</div>`;
  out.push(F(`2 到 ${m} 的篩法`, '一開始假設每個數都是質數（綠色）。從 2 開始，把每個質數的倍數劃掉。', stage(grid())));
  let cross = 0;
  for (let i = 2; i * i <= m; i++) {
    if (comp[i]) continue;
    const hit = []; for (let j = i * i; j <= m; j += i) { if (!comp[j]) hit.push(j); comp[j] = true; cross++; }
    out.push(F(`${i} 是質數，劃掉它的倍數`, `從 ${i}² = ${i * i} 開始（更小的倍數早就被更小的質數劃掉了）：${hit.length ? hit.join('、') : '沒有新的數被劃掉'}。`, stage(grid(i))));
  }
  const p = sieve(m);
  out.push(F(`剩下的 ${p.length} 個都是質數`, `當 i × i > ${m} 時就可以停了。總共劃了 ${cross} 次；試除法要對每個數各做一輪檢查。`, stage(grid(), kv([['質數個數', p.length, 'ok']]))));
  return out;
}

/* ───────────── 11 函式：呼叫堆疊 ───────────── */
function gcdSteps(a, b) { const s = [[a, b]]; while (b) { [a, b] = [b, a % b]; s.push([a, b]); } return s; }
function stackFrames(v) {
  const a = v.a, b = v.b, steps = gcdSteps(a, b), g = steps[steps.length - 1][0], l = g ? a / g * b : 0, out = [];
  const frame = (name, vars, on) => `<div class="ix-frame${on ? ' on' : ''}"><b>${name}</b>${vars.map(([k, x]) => `<span>${k} = ${h(x)}</span>`).join('')}</div>`;
  const stack = (...fs) => `<div class="ix-stack">${fs.reverse().join('')}<p class="ix-cap">↑ 堆疊頂端在上面</p></div>`;
  out.push(F('main 開始執行', `main 的堆疊框裡有區域變數 a = ${a}、b = ${b}。`, stage(stack(frame('main', [['a', a], ['b', b]], true)))));
  out.push(F(`呼叫 lcm(${a}, ${b})`, '建立新的堆疊框，參數 a、b 是 main 裡變數的「副本」，返回位址記住要回到 main 的哪裡。', stage(stack(frame('main', [['a', a], ['b', b]]), frame('lcm', [['a', a], ['b', b]], true)))));
  steps.forEach(([x, y], k) => out.push(F(k === 0 ? `lcm 呼叫 gcd(${x}, ${y})` : `gcd：(${steps[k - 1][0]}, ${steps[k - 1][1]}) → (${x}, ${y})`, k === 0 ? '再疊一個框。gcd 的 a、b 和 lcm 的 a、b 名字相同，但是是不同的變數。' : y ? `r = ${steps[k - 1][0]} % ${steps[k - 1][1]} = ${y}，a ← b、b ← r。只有 gcd 自己的框在改變。` : `b = 0，迴圈結束，答案是 a = ${x}。`, stage(stack(frame('main', [['a', a], ['b', b]]), frame('lcm', [['a', a], ['b', b]]), frame('gcd', [['a', x], ['b', y]], true))))));
  out.push(F(`gcd 回傳 ${g}`, 'gcd 的堆疊框被移除，它的區域變數也跟著消失。控制回到 lcm 裡呼叫 gcd 的位置。', stage(stack(frame('main', [['a', a], ['b', b]]), frame('lcm', [['a', a], ['b', b], ['gcd(a, b)', g]], true)))));
  out.push(F(`lcm 回傳 ${l}`, `lcm = a / gcd × b = ${a} / ${g} × ${b} = ${l}。先除再乘，中間值比較小，不容易溢位。`, stage(stack(frame('main', [['a', a], ['b', b], ['lcm(a, b)', l]], true))), '整個過程中 main 的 a、b 完全沒變：參數是傳值。'));
  return out;
}

/* ───────────── 12 vector：容量成長 ───────────── */
function vectorRun(n, factor) { let cap = 0, copies = 0; const log = []; for (let i = 1; i <= n; i++) { let re = false; if (i > cap) { const nc = cap === 0 ? 1 : Math.max(cap + 1, Math.floor(cap * factor)); copies += i - 1; re = true; cap = nc; } log.push({ size: i, cap, re, copies }); } return log; }
function vectorFrames(v) {
  const f = +v.factor, log = vectorRun(v.n, f), out = [];
  const slots = (size, cap, newest) => row(Array.from({ length: cap }, (_, i) => cell(i < size ? i : '', i, i === newest ? 'on' : i < size ? 'done' : 'faint')), 'tight left');
  out.push(F('vector<int> v;', `一開始 size = 0、capacity = 0。每次 push_back 時，如果空間不夠，就配置 ${f} 倍大的新空間，把舊元素全部搬過去。`, stage(kv([['size', 0], ['capacity', 0]]))));
  log.forEach((s, k) => out.push(F(`push_back(${k})：${s.re ? `重新配置 → capacity ${s.cap}` : `直接放入`}`, s.re ? `空間不夠了。配置 ${s.cap} 格的新空間，搬移 ${k} 個舊元素，再放入新元素。舊位址上的指標與參考全部失效。` : `還有空位，O(1) 放進第 ${k} 格。`, stage(slots(s.size, s.cap, k), kv([['size', s.size], ['capacity', s.cap], ['累計搬移', s.copies, s.re ? 'bad' : '']])))));
  const last = log[log.length - 1];
  out.push(F(`${v.n} 次 push_back 共搬移 ${last.copies} 次`, `平均每次 push_back 搬移 ${(last.copies / v.n).toFixed(2)} 個元素。倍數成長讓總搬移量是 O(n)，所以 push_back 是攤銷 O(1)。事先知道數量時用 reserve(n) 可以完全避免搬移。`, stage(kv([['總搬移', last.copies], ['平均', (last.copies / v.n).toFixed(2), 'ok']]))));
  return out;
}

/* ───────────── 13 字串：雙指標回文 ───────────── */
const alnum = c => /[A-Za-z0-9]/.test(c);
function palinFrames(v) {
  const s = String(v.text), out = [];
  if (!s.length) return [F('空字串', '空字串視為回文：迴圈一次都不會執行。', '')];
  const view = (i, j, hit) => row([...s].map((c, k) => cell(c === ' ' ? '␠' : c, k === i && k === j ? 'i j' : k === i ? 'i' : k === j ? 'j' : k, k === i || k === j ? (hit === false ? 'bad' : 'on') : k < i || k > j ? 'faint' : '')), 'tight left');
  let i = 0, j = s.length - 1;
  out.push(F('i 從左、j 從右出發', `i = 0、j = ${j}。只比較英文字母與數字，忽略大小寫。`, stage(view(i, j))));
  while (i < j) {
    if (!alnum(s[i])) { out.push(F(`跳過 s[${i}] = 「${s[i]}」`, '不是英數字元，i++。', stage(view(i, j)))); i++; continue; }
    if (!alnum(s[j])) { out.push(F(`跳過 s[${j}] = 「${s[j]}」`, '不是英數字元，j--。', stage(view(i, j)))); j--; continue; }
    const a = s[i].toLowerCase(), b = s[j].toLowerCase();
    if (a !== b) { out.push(F(`「${s[i]}」≠「${s[j]}」`, `轉成小寫後 ${a} 與 ${b} 不同，不是回文，立刻回傳 false。`, stage(view(i, j, false), kv([['結果', 'No', 'bad']])))); return out; }
    out.push(F(`「${s[i]}」=「${s[j]}」`, `轉成小寫都是 ${a}，i++、j--。`, stage(view(i, j))));
    i++; j--;
  }
  out.push(F('指標相遇：是回文', `i ≥ j，所有對應位置都相同。每個字元最多被看一次，時間 O(n)。`, stage(view(-1, -1), kv([['結果', 'Yes', 'ok']]))));
  return out;
}

/* ───────────── 14 指標：記憶體圖 ───────────── */
const PTR = {
  basic: { lines: ['int x = 5;', 'int *p = &x;', '*p = 10;', 'int &r = x;', 'r++;', 'p = nullptr;'] },
  array: { lines: ['int a[5] = {1, 2, 3, 4, 5};', 'int *l = a + 1, *r = a + 3;', 'swap(*l, *r);', 'l++; r--;', '// l == r，停止'] },
  heap: { lines: ['int *p = new int(42);', 'int *q = p;', 'delete p;', 'p = nullptr;', '// q 仍然指向已釋放的記憶體'] }
};
function ptrFrames(v) {
  const P = PTR[v.scenario], out = [], hex = n => '0x' + n.toString(16).toUpperCase();
  const mem = (rows, hi) => table(['位址', '名稱', '內容'], rows.map(([ad, nm, val]) => [hex(ad), h(nm), val]), hi);
  if (v.scenario === 'basic') {
    const S = [
      [[[0x100, 'x', '5']], 0, 'x 住在位址 0x100，內容是 5。'],
      [[[0x100, 'x', '5'], [0x108, 'p', '0x100 → x']], 1, '&x 取得 x 的位址；p 是一個變數，內容就是這個位址。'],
      [[[0x100, 'x', '<b>10</b>'], [0x108, 'p', '0x100 → x']], 0, '*p 是「p 指向的那個 int」：到 0x100 寫入 10，所以 x 變成 10。'],
      [[[0x100, 'x、r', '10'], [0x108, 'p', '0x100 → x']], 0, 'r 是 x 的別名，不佔新的位置（概念上）。r 和 x 是同一個東西。'],
      [[[0x100, 'x、r', '<b>11</b>'], [0x108, 'p', '0x100 → x']], 0, 'r++ 就是 x++，x 變成 11。'],
      [[[0x100, 'x、r', '11'], [0x108, 'p', 'nullptr']], 1, 'p 改成不指向任何東西。x 不受影響。此時再寫 *p 就是未定義行為。']
    ];
    S.forEach(([rows, hi, d], k) => out.push(F(P.lines[k], d, stage(code(P.lines, k), mem(rows, hi)))));
    return out;
  }
  if (v.scenario === 'array') {
    const a = [1, 2, 3, 4, 5], arr = (l, r, sw) => row(a.map((x, i) => cell(x, `${hex(0x200 + 4 * i)}${i === l ? ' ◀l' : ''}${i === r ? ' ◀r' : ''}`, i === l || i === r ? (sw ? 'done' : 'on') : '')), 'tight');
    out.push(F(P.lines[0], '5 個 int 連續排列，每個 4 位元組，位址每格加 4。陣列名稱 a 會轉成指向第一個元素的指標 0x200。', stage(code(P.lines, 0), arr(-1, -1))));
    out.push(F(P.lines[1], 'a + 1 不是位址加 1，而是前進「一個 int」：0x200 + 1 × 4 = 0x204。a + 3 = 0x20C。', stage(code(P.lines, 1), arr(1, 3), kv([['l', hex(0x204)], ['r', hex(0x20C)]]))));
    [a[1], a[3]] = [a[3], a[1]];
    out.push(F(P.lines[2], '*l 和 *r 是 a[1] 和 a[3] 本身，交換它們。a[i] 其實就是 *(a + i)。', stage(code(P.lines, 2), arr(1, 3, true))));
    out.push(F(P.lines[3], 'l 往右一格到 0x208，r 往左一格也到 0x208。兩個指標相遇，反轉完成：{1, 4, 3, 2, 5}。這就是 std::reverse(a + 1, a + 4)。', stage(code(P.lines, 3), arr(2, 2), kv([['l', hex(0x208)], ['r', hex(0x208)]]))));
    return out;
  }
  const S = [
    [[[0x7F00, 'p（堆疊）', '0x5000 →'], [0x5000, '（堆積）', '42']], 1, 'new 在堆積上配置一個 int 並初始化為 42，回傳它的位址。p 本身在堆疊上。'],
    [[[0x7F00, 'p（堆疊）', '0x5000 →'], [0x7F08, 'q（堆疊）', '0x5000 →'], [0x5000, '（堆積）', '42']], 1, 'q 複製了 p 的內容，現在兩個指標指向同一塊記憶體。'],
    [[[0x7F00, 'p（堆疊）', '0x5000 → ✗'], [0x7F08, 'q（堆疊）', '0x5000 → ✗'], [0x5000, '（已釋放）', '???']], 2, 'delete 把那塊記憶體還給系統。p 和 q 的內容沒變，但它們現在都是懸置指標。'],
    [[[0x7F00, 'p（堆疊）', 'nullptr'], [0x7F08, 'q（堆疊）', '0x5000 → ✗'], [0x5000, '（已釋放）', '???']], 0, '把 p 設成 nullptr 是好習慣，但 q 還是懸置的。'],
    [[[0x7F00, 'p（堆疊）', 'nullptr'], [0x7F08, 'q（堆疊）', '0x5000 → ✗'], [0x5000, '（已釋放）', '???']], 1, '*q 是未定義行為：可能剛好讀到 42、讀到別的資料，或讓程式當掉。用 unique_ptr 或容器就不會發生這種事。']
  ];
  S.forEach(([rows, hi, d], k) => out.push(F(P.lines[k], d, stage(code(P.lines, k), mem(rows, hi)), k === 4 ? '如果完全沒有 delete，那塊記憶體就洩漏了：程式結束前都無法再使用。' : '')));
  return out;
}

/* ───────────── 15 類別：帳戶的不變量 ───────────── */
function accountRun(cmds) {
  let bal = 0; const log = [];
  for (const raw of String(cmds).split(/[，,\s]+/).filter(Boolean).slice(0, 12)) {
    const m = raw.match(/^([dw])(-?\d+)$/i);
    if (!m) { log.push({ raw, ok: false, why: '看不懂的指令（用 d100 表示存 100、w30 表示提 30）', bal }); continue; }
    const x = Number(m[2]), dep = m[1].toLowerCase() === 'd';
    if (x <= 0) { log.push({ raw, ok: false, why: '金額必須是正數', bal }); continue; }
    if (!dep && x > bal) { log.push({ raw, ok: false, why: `餘額 ${bal} 不足`, bal }); continue; }
    bal += dep ? x : -x; log.push({ raw, ok: true, why: dep ? `deposit(${x})` : `withdraw(${x})`, bal });
  }
  return log;
}
function accountFrames(v) {
  const log = accountRun(v.cmds), out = [];
  const L = ['bool withdraw(long long x) {', '    if (x <= 0 || x > balance_) return false;', '    balance_ -= x;', '    return true;', '}'];
  out.push(F('Account acc("Amy");', '建構子把 balance_ 初始化為 0。balance_ 是 private，外部只能呼叫 deposit、withdraw。不變量：balance_ ≥ 0。', stage(kv([['balance_', 0, 'ok']]))));
  log.forEach((e, k) => out.push(F(`${e.raw}：${e.ok ? '成功' : '拒絕'}`, e.ok ? `${e.why}，餘額變成 ${e.bal}。` : `${e.why}，成員函式回傳 false，餘額保持 ${e.bal} 不變。`, stage(e.raw[0].toLowerCase() === 'w' ? code(L, e.ok ? 2 : 1) : '', kv([['balance_', e.bal, 'ok'], ['結果', e.ok ? 'true' : 'false', e.ok ? 'ok' : 'bad']]), table(['指令', '結果', '餘額'], log.slice(0, k + 1).map(x => [h(x.raw), x.ok ? '✓' : '✗', x.bal]), k)))));
  out.push(F('不變量從未被破壞', '因為所有修改都經過成員函式的檢查，不管外部怎麼呼叫，balance_ 都不會變成負數。如果 balance_ 是 public，任何人都能寫 acc.balance_ = -999。', stage(kv([['最終餘額', log.length ? log[log.length - 1].bal : 0, 'ok']]))));
  return out;
}

/* ───────────── 16 遞迴：fib 的呼叫樹 ───────────── */
function fibTree(n, memo) {
  const nodes = [], cache = {};
  (function go(k, depth) {
    const me = { k, depth, start: nodes.length, hit: false }; nodes.push(me);
    if (memo && cache[k] !== undefined) { me.hit = true; me.val = cache[k]; me.end = nodes.length; return me.val; }
    me.val = k < 2 ? k : go(k - 1, depth + 1) + go(k - 2, depth + 1);
    if (memo) cache[k] = me.val;
    me.end = nodes.length; return me.val;
  })(n, 0);
  return nodes;
}
function fibFrames(v) {
  const n = v.n, memo = v.mode === 'memo', nodes = fibTree(n, memo), out = [];
  const tree = k => `<div class="ix-tree">${nodes.map((x, i) => `<div style="--d:${x.depth}" class="${i > k ? 'faint' : i === k ? 'on' : x.end - 1 <= k ? 'done' : ''}">fib(${x.k})${i <= k && x.end - 1 <= k ? ` = ${x.val}` : ''}${x.hit && i <= k ? ' ← 查表' : x.k < 2 && i <= k ? ' ← 基底' : ''}</div>`).join('')}</div>`;
  nodes.forEach((x, k) => out.push(F(`呼叫 fib(${x.k})`, x.hit ? `fib(${x.k}) 已經算過了，直接從表裡拿出 ${x.val}，不再往下遞迴。` : x.k < 2 ? `基底情況：直接回傳 ${x.k}。` : `fib(${x.k}) = fib(${x.k - 1}) + fib(${x.k - 2})，先遞迴算 fib(${x.k - 1})。堆疊深度 ${x.depth + 1}。`, stage(tree(k), kv([['已呼叫', k + 1], ['堆疊深度', x.depth + 1]])))));
  out.push(F(`fib(${n}) = ${nodes[0].val}，共呼叫 ${nodes.length} 次`, memo ? `記憶化之後，每個 fib(k) 只真正計算一次，呼叫次數約 2n，是 O(n)。` : `同一個 fib(k) 被重複計算很多次：呼叫次數 C(n) = 1 + C(n − 1) + C(n − 2)，指數成長。切換成「記憶化」比較看看。`, stage(tree(nodes.length), kv([['呼叫次數', nodes.length, memo ? 'ok' : 'bad'], ['最大深度', Math.max(...nodes.map(x => x.depth)) + 1]]))));
  return out;
}

/* ───────────── 17 複雜度：成長率比較 ───────────── */
const GROWTH = [['O(log n)', n => Math.log2(Math.max(n, 2))], ['O(n)', n => n], ['O(n log n)', n => n * Math.log2(Math.max(n, 2))], ['O(n²)', n => n * n], ['O(2ⁿ)', n => 2 ** n]];
const fmtOps = x => !Number.isFinite(x) || x > 1e300 ? '天文數字' : x >= 1e6 ? x.toExponential(1).replace('e+', ' × 10^') : String(Math.round(x));
const fmtTime = s => !Number.isFinite(s) || s > 3.15e7 * 1e3 ? '超過一千年' : s > 3.15e7 ? `約 ${Math.round(s / 3.15e7)} 年` : s > 86400 ? `約 ${Math.round(s / 86400)} 天` : s > 3600 ? `約 ${Math.round(s / 3600)} 小時` : s > 60 ? `約 ${Math.round(s / 60)} 分鐘` : s >= 1 ? `約 ${s.toFixed(1)} 秒` : s >= 1e-3 ? `約 ${(s * 1e3).toFixed(1)} 毫秒` : '不到 1 毫秒';
function growthFrames(v) {
  const n = +v.n, out = [], rows = [];
  out.push(F(`n = ${n.toLocaleString()}`, '假設電腦每秒做 10⁸ 次簡單運算，時限 1 秒。先猜：哪些複雜度來得及？', ''));
  GROWTH.forEach(([name, f], k) => {
    const ops = f(n), t = ops / 1e8, ok = t <= 1;
    rows.push([name, fmtOps(ops), fmtTime(t), ok ? '✓' : '✗']);
    const w = Math.min(100, Math.max(2, Math.log10(Math.max(ops, 1)) / 12 * 100));
    out.push(F(`${name}：${fmtOps(ops)}${Number.isFinite(ops) && ops <= 1e300 ? ' 次' : ''}`, `${fmtTime(t)}。${ok ? '在時限內。' : '超時了。'}${name === 'O(n²)' && n >= 1e5 ? '兩層迴圈在 n = 10⁵ 時就已經不行了。' : ''}${name === 'O(2ⁿ)' && n > 40 ? '指數成長只適合 n 很小（約 25 以下）的情況。' : ''}`, stage(`<div class="ix-bars">${rows.map((r, i) => { const ww = Math.min(100, Math.max(2, Math.log10(Math.max(GROWTH[i][1](n), 1)) / 12 * 100)); return `<div class="${r[3] === '✓' ? 'ok' : 'bad'}${i === k ? ' on' : ''}"><span>${r[0]}</span><i style="width:${ww}%"></i><b>${r[1]}</b></div>`; }).join('')}</div>`, cap('長條是運算次數的對數刻度（每格 10 倍）')), w > 99 ? '超出圖表範圍。' : ''));
  });
  out.push(F('總結', `n = ${n.toLocaleString()} 時，${rows.filter(r => r[3] === '✓').map(r => r[0]).join('、') || '沒有任何一個'} 能在 1 秒內完成。`, stage(table(['複雜度', '運算次數', '估計時間', '1 秒內'], rows))));
  return out;
}

/* ───────────── 18 資訊安全：凱薩密碼 ───────────── */
function caesar(s, k) { k = ((k % 26) + 26) % 26; return [...String(s)].map(c => c >= 'A' && c <= 'Z' ? String.fromCharCode((c.charCodeAt(0) - 65 + k) % 26 + 65) : c >= 'a' && c <= 'z' ? String.fromCharCode((c.charCodeAt(0) - 97 + k) % 26 + 97) : c).join(''); }
function caesarFrames(v) {
  const s = String(v.text), k = v.k, enc = caesar(s, k), out = [];
  if (v.mode === 'brute') {
    out.push(F(`攔截到密文「${enc}」`, `攻擊者不知道金鑰，但凱薩密碼只有 25 種有效位移，全部試一遍就好。`, stage(kv([['密文', h(enc)]]))));
    const rows = [];
    for (let t = 1; t <= 25; t++) {
      const p = caesar(enc, -t), hit = p === s;
      rows.push([t, h(p)]);
      if (hit || t % 5 === 0 || t === 25) out.push(F(hit ? `k = ${t}：看得懂了！` : `試到 k = ${t}`, hit ? '其他位移得到的都是亂碼，只有這一個是有意義的文字。不需要知道金鑰也能破解。' : '一般電腦一秒可以試幾億次；這裡只有 25 次。', stage(table(['k', '解密結果'], rows.slice(-6), hit ? Math.min(rows.length, 6) - 1 : -1))));
      if (hit) break;
    }
    out.push(F('結論', '金鑰空間太小的加密法，可以用暴力破解。現代的 AES 金鑰有 2¹²⁸ 種以上，暴力試完需要的時間遠超過宇宙年齡。', ''));
    return out;
  }
  const kk = ((k % 26) + 26) % 26;
  out.push(F(`位移 k = ${k}`, `每個英文字母往後移 ${kk} 位，超過 Z 就繞回 A。其他字元（空白、標點、數字、中文）不變。${k < 0 || k > 25 ? `位移先換算成 0–25：${k} ≡ ${kk}（mod 26）。` : ''}`, stage(row([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c, i) => cell(c, String.fromCharCode((i + kk) % 26 + 65), '')), 'tight'))));
  const shown = [...s].slice(0, 24);
  shown.forEach((c, i) => {
    if (!/[A-Za-z]/.test(c)) return;
    const base = c <= 'Z' ? 65 : 97, idx = c.charCodeAt(0) - base;
    out.push(F(`「${c}」→「${enc[i]}」`, `(${c <= 'Z' ? `'${c}' − 'A'` : `'${c}' − 'a'`} + ${kk}) % 26 = (${idx} + ${kk}) % 26 = ${(idx + kk) % 26}，再加回 '${c <= 'Z' ? 'A' : 'a'}'。`, stage(row(shown.map((x, j) => cell(j <= i ? enc[j] : x, x === ' ' ? '' : x, j === i ? 'on' : j < i ? 'done' : 'faint')), 'tight left'))));
  });
  out.push(F(`密文：${enc}`, `解密就是位移 ${26 - kk || 0}（或 −${kk}）：${caesar(enc, -kk)}。切換成「暴力破解」看看攻擊者怎麼做。`, stage(kv([['明文', h(s)], ['密文', h(enc), 'ok']]))));
  return out;
}

/* ───────────── 註冊 ───────────── */
const LABS = {
  maxtrace: { title: '演算法追蹤：找最大值', prompt: '先猜：如果把 best 初始化為 0，哪一種資料會讓程式出錯？', inputs: [['values', '資料（逗號分隔）', 'text', '7,3,12,5,12'], ['init', 'best 的初始值', 'select', 'first', [['first', '第一個元素'], ['zero', '0（常見錯誤）']]]], frames: maxFrames },
  base: { title: '進位轉換：連除取餘數', prompt: '先猜：156 寫成十六進位有幾位數？為什麼餘數要倒著讀？', inputs: [['n', '十進位整數（0–65535）', 'number', 156, [0, 65535, 1]], ['base', '目標進位', 'select', '16', [['2', '二進位'], ['8', '八進位'], ['16', '十六進位']]]], frames: baseFrames },
  twos: { title: '8 位元二補數加法與溢位', prompt: '先猜：100 + 50 用 8 位元有號整數計算，結果是多少？', inputs: [['a', 'a（−128–127）', 'number', 100, [-128, 127, 1]], ['b', 'b（−128–127）', 'number', 50, [-128, 127, 1]]], frames: twosFrames },
  gates: { title: '邏輯閘：半加器與全加器', prompt: '先猜：1 + 1 + 1 用全加器計算，S 和 Cout 各是多少？', inputs: [['circuit', '電路', 'select', 'full', [['half', '半加器'], ['full', '全加器']]], ['a', 'A', 'select', '1', [['0', '0'], ['1', '1']]], ['b', 'B', 'select', '1', [['0', '0'], ['1', '1']]], ['cin', 'Cin（全加器）', 'select', '0', [['0', '0'], ['1', '1']]]], frames: gateFrames },
  cpu: { title: '迷你 CPU：擷取、解碼、執行', prompt: '先猜：每條指令執行完，PC 會變成多少？遇到跳躍指令時呢？', inputs: [['program', '程式', 'select', 'add', [['add', 'a + b'], ['loop', '1 + 2 + … + n（迴圈）']]], ['detail', '顯示方式', 'select', 'phase', [['phase', '每條指令分三步'], ['instr', '每條指令一步']]], ['n', 'n（迴圈程式）', 'number', 3, [1, 6, 1]]], frames: cpuFrames },
  build: { title: 'C++ 建置流程與錯誤', prompt: '先猜：這個程式會在前置處理、編譯、組譯、連結、執行的哪一步出問題？', inputs: [['scenario', '原始碼', 'select', 'ok', [['ok', '正確的程式'], ['syntax', '少了分號'], ['link', '只有宣告、沒有定義'], ['runtime', '除以零']]]], frames: buildFrames },
  net: { title: '封裝、路由與子網路', prompt: '先猜：封包經過路由器時，IP 位址與 MAC 位址哪一個會改變？', inputs: [['mode', '模式', 'select', 'tcp', [['tcp', '封裝：HTTPS（TCP）'], ['udp', '封裝：DNS（UDP）'], ['subnet', '子網路計算']]], ['ip', 'IP（子網路模式）', 'text', '192.168.10.77'], ['prefix', '前綴長度 /k', 'number', 26, [0, 32, 1]]], frames: netFrames },
  cin: { title: 'cin 的讀取游標', prompt: '先猜：cin >> 讀完一個數字後，游標停在哪裡？後面的換行字元去哪了？', inputs: [['prog', '程式', 'select', 'nameAge', [['nameAge', 'cin >> name >> age'], ['twoInt', 'cin >> a >> b'], ['getline', 'cin >> n 再 getline'], ['ws', 'cin >> n 再 getline(cin >> ws, s)']]], ['input', '輸入（| 代表換行）', 'text', 'Alice   20']], frames: cinFrames },
  expr: { title: '整數除法、餘數與溢位', prompt: '先猜：-7 / 2 和 -7 % 2 各是多少？', inputs: [['a', 'a', 'number', -7, [-2147483648, 2147483647, 1]], ['b', 'b', 'number', 2, [-2147483648, 2147483647, 1]]], frames: exprFrames },
  branch: { title: 'else if 鏈：閏年判斷', prompt: '先猜：把條件的順序寫反之後，哪些年份會被判錯？', inputs: [['year', '年份', 'number', 1900, [1, 9999, 1]], ['order', '條件順序', 'select', 'correct', [['correct', '400 → 100 → 4（正確）'], ['wrong', '4 → 100 → 400（寫反）']]]], frames: leapFrames },
  loop: { title: '迴圈追蹤：求和、試除與篩法', prompt: '先猜：判斷 97 是不是質數，試除法要檢查幾個除數？', inputs: [['mode', '迴圈', 'select', 'sum', [['sum', 'for 求和 1..n'], ['trial', '試除法判斷質數'], ['sieve', '埃拉托斯特尼篩法']]], ['n', 'n（1–60）', 'number', 6, [1, 60, 1]]], frames: loopFrames },
  stack: { title: '呼叫堆疊：lcm 與 gcd', prompt: '先猜：gcd 執行時，堆疊上同時有幾個堆疊框？', inputs: [['a', 'a', 'number', 84, [1, 100000, 1]], ['b', 'b', 'number', 36, [1, 100000, 1]]], frames: stackFrames },
  vector: { title: 'vector 的容量成長', prompt: '先猜：連續 push_back 16 次，總共要搬移幾個元素？', inputs: [['n', 'push_back 次數', 'number', 9, [1, 20, 1]], ['factor', '成長倍數', 'select', '2', [['2', '2 倍'], ['1.5', '1.5 倍']]]], frames: vectorFrames },
  palin: { title: '雙指標判斷回文', prompt: '先猜：「No lemon, no melon」是回文嗎？指標要跳過哪些字元？', inputs: [['text', '字串', 'text', 'Race, car']], frames: palinFrames },
  pointer: { title: '指標與記憶體圖', prompt: '先猜：每一行執行之後，哪個位址的內容改變了？', inputs: [['scenario', '情境', 'select', 'basic', [['basic', '取址、解參考與參考'], ['array', '指標運算：原地反轉'], ['heap', 'new、delete 與懸置指標']]]], frames: ptrFrames },
  account: { title: '封裝：帳戶的不變量', prompt: '先猜：哪些指令會被拒絕？被拒絕時餘額會怎樣？', inputs: [['cmds', '指令（d 存、w 提）', 'text', 'd100,w30,w500,d-5,w70']], frames: accountFrames },
  fib: { title: '遞迴樹：fib(n)', prompt: '先猜：樸素遞迴計算 fib(5) 總共會呼叫幾次 fib？', inputs: [['n', 'n（0–7）', 'number', 5, [0, 7, 1]], ['mode', '寫法', 'select', 'naive', [['naive', '樸素遞迴'], ['memo', '記憶化']]]], frames: fibFrames },
  growth: { title: 'Big-O 與時限估計', prompt: '先猜：n = 10⁵ 時，O(n²) 的程式在 1 秒內跑得完嗎？', inputs: [['n', '資料量 n', 'select', '100000', [['20', '20'], ['1000', '1,000'], ['100000', '100,000'], ['1000000', '1,000,000']]]], frames: growthFrames },
  caesar: { title: '凱薩密碼與暴力破解', prompt: '先猜：攻擊者最多要試幾次，才能破解凱薩密碼？', inputs: [['mode', '模式', 'select', 'encrypt', [['encrypt', '加密'], ['brute', '暴力破解']]], ['text', '明文', 'text', 'Hello, World!'], ['k', '位移 k', 'number', 3, [-25, 25, 1]]], frames: caesarFrames }
};
for (const [type, spec] of Object.entries(LABS)) CSLab.frameLab(type, { ...spec, inputs: spec.inputs.map(i => i.length === 4 ? [...i, []] : i) });
CSLab.sim.ics = { toBase, addOverflow, adder, cpuRun, PROGRAMS, subnet, parseIp, ipStr, cinRun, CIN_PROGS, gcdSteps, vectorRun, sieve, accountRun, fibTree, caesar, LABS };
})();
