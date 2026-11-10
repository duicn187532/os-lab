/* DSA 互動挑戰（CSLab.challenge，見 shared/cslab-challenge.js）。
 * 第 7 章 Binary Search 下一步：玩家每一步自己點中點、再決定往哪一半；標準路徑取自 CSLab.sim.dsa.makeFrames('search')。 */
'use strict';
(function () {
  const X = CSLab.challenge, { h } = CSLab.ui;
  // 候選區間 [lo, hi] 的合法中點：rule.mid 列出接受的寫法（下整、上整都是正確的二分搜尋）
  const mids = (lo, hi, rule) => [...new Set(rule.mid.map(k => k === 'ceil' ? Math.ceil((lo + hi) / 2) : Math.floor((lo + hi) / 2)))];
  // 模擬器的路徑：依序檢查的索引與最後結果（找到的索引或 -1）
  function simRun(values, target) {
    const f = CSLab.sim.dsa.makeFrames('search', { values: values.join(','), target }).frames;
    return { path: f.filter(x => x.active.length === 1 && /^mid=/.test(x.note)).map(x => x.active[0]), at: f[f.length - 1].done[0] ?? -1 };
  }
  const fresh = (s, c) => Object.assign(s, { lo: 0, hi: c.params.values.length - 1, m: null, probes: [] });

  X.type('bsearch-step', {
    init: c => fresh({ round: 0, rounds: c.params.targets.length, log: [], done: false }, c),
    view(s, c) {
      const a = c.params.values;
      if (s.done) return `<div class="table-wrap"><table class="table"><thead><tr><th>target</th><th>你檢查的 mid</th><th>結果</th></tr></thead><tbody>${s.log.map(r => `<tr><td>${r.target}</td><td>${r.probes.map(i => `a[${i}]=${a[i]}`).join(' → ')}</td><td>${r.at >= 0 ? `索引 ${r.at}` : '不存在'}</td></tr>`).join('')}</tbody></table></div>`;
      const t = c.params.targets[s.round], empty = s.lo > s.hi;
      const cells = a.map((v, i) => { const inside = i >= s.lo && i <= s.hi; return `<button type="button" class="dz-cell ch-cell${inside ? '' : ' out'}${s.m === i ? ' active' : ''}" data-ch-act="probe" data-arg="${i}"${!inside || s.m !== null ? ' disabled' : ''} aria-label="索引 ${i}，值 ${v}${inside ? '' : '，已排除'}">${v}<small>${i}</small></button>`; }).join('');
      return `<p class="ch-goal">找 target = <b>${t}</b>　·　候選範圍 ${empty ? `<b>空的</b>（lo = ${s.lo} &gt; hi = ${s.hi}）` : `[lo, hi] = [<b>${s.lo}</b>, <b>${s.hi}</b>]`}　·　已比較 ${s.probes.length} 次</p>
        <div class="dz-stage ch-array"><div class="dz-row" role="group" aria-label="有序陣列">${cells}</div></div>
        ${s.m !== null ? `<p>a[${s.m}] = <b>${a[s.m]}</b>，和 target = ${t} 比較之後：</p><div class="row ch-choices">
          <button type="button" class="btn secondary sm" data-ch-act="found">命中，找到了</button>
          <button type="button" class="btn secondary sm" data-ch-act="left">往左半：hi = mid − 1</button>
          <button type="button" class="btn secondary sm" data-ch-act="right">往右半：lo = mid + 1</button></div>`
        : `<p class="muted small">${empty ? '候選範圍已經沒有元素了。' : '點候選範圍裡的一格，當作這一步要檢查的 mid。'}</p>
          <div class="row"><button type="button" class="btn secondary sm" data-ch-act="absent">宣告：陣列裡沒有 ${t}</button></div>`}`;
    },
    act(s, a, arg, c) {
      const v = c.params.values, t = c.params.targets[s.round];
      if (a === 'probe') {
        const i = +arg;
        if (s.m !== null || !(i >= s.lo && i <= s.hi)) return {};
        if (!mids(s.lo, s.hi, c.rule).includes(i)) return { ok: false, msg: `a[${i}] 不在候選範圍 [${s.lo}, ${s.hi}] 的正中間。檢查正中間，不論比較結果是大是小都能排除一半；檢查別的位置，最壞情況只排除一小段。` };
        s.m = i; s.probes.push(i);
        return { msg: `檢查 a[${i}] = ${v[i]}。` };
      }
      if (a === 'absent') {
        if (s.m !== null) return {};
        if (s.lo <= s.hi) return { ok: false, msg: `候選範圍 [${s.lo}, ${s.hi}] 還有 ${s.hi - s.lo + 1} 個元素沒排除，現在還不能斷定 ${t} 不存在。` };
        return finish(s, c, -1);
      }
      if (s.m === null) return {};
      const m = s.m, x = v[m];
      if (a === 'found') return x === t ? finish(s, c, m) : { ok: false, msg: `a[${m}] = ${x}，不等於 ${t}。` };
      if (a === 'left') {
        if (!(t < x)) return { ok: false, msg: `往左會把答案丟掉：a[${m}] = ${x}${x === t ? ' 就是 target' : ` 比 ${t} 小，左半 a[${s.lo}..${m - 1}] 只會更小`}。` };
        s.hi = m - 1; s.m = null;
        return { ok: true, msg: `${t} < ${x}，答案若存在只會在左半：hi = ${m} − 1 = ${s.hi}。` };
      }
      if (a === 'right') {
        if (!(t > x)) return { ok: false, msg: `往右會把答案丟掉：a[${m}] = ${x}${x === t ? ' 就是 target' : ` 比 ${t} 大，右半 a[${m + 1}..${s.hi}] 只會更大`}。` };
        s.lo = m + 1; s.m = null;
        return { ok: true, msg: `${t} > ${x}，答案若存在只會在右半：lo = ${m} + 1 = ${s.lo}。` };
      }
      return {};
    },
    solution(c) {
      const a = c.params.values, worst = Math.ceil(Math.log2(a.length + 1));
      return `<ul>${c.params.targets.map(t => { const r = simRun(a, t); return `<li>找 <b>${t}</b>：模擬器（中點取下整）依序檢查 ${r.path.map(i => `a[${i}]=${a[i]}`).join(' → ')}，${r.at >= 0 ? `在索引 ${r.at} 命中` : 'lo 超過 hi，範圍變空，判定不存在'}。</li>`; }).join('')}</ul>
        <p>${a.length} 個元素最多比較 ⌈log₂(${a.length}+1)⌉ = ${worst} 次。中點取上整（⌈(lo+hi)/2⌉）一樣正確，路徑可能不同，但每一步都保持「答案若存在，一定還在 [lo, hi] 裡」。</p>`;
    }
  });
  function finish(s, c, at) {
    const t = c.params.targets[s.round];
    s.log.push({ target: t, at, probes: s.probes.slice() });
    s.round++;
    const said = `${at >= 0 ? `找到了：${t} 在索引 ${at}` : `範圍空了：${t} 不在陣列裡`}，比較了 ${s.probes.length} 次。`;
    if (s.round >= s.rounds) { s.done = true; return { ok: true, round: true, done: true, msg: said }; }
    fresh(s, c);
    return { ok: true, round: true, msg: `${said}下一關：找 ${c.params.targets[s.round]}。` };
  }

  X.add({
    id: 'dsa.binary-search.next-step', lesson: 6, kind: 'step', ui: 'bsearch-step',
    title: '每一步都不能把答案丟掉',
    task: '在有序陣列裡用二分搜尋找 target。每一步自己決定要檢查哪一格（mid），再依比較結果決定往哪一半；如果候選範圍變空了，就宣告找不到。第二關的 target 不在陣列裡。',
    params: { values: [3, 8, 12, 17, 21, 26, 30, 34, 39, 45, 52], targets: [34, 20] },
    rule: { mid: ['floor', 'ceil'] },
    hints: ['候選範圍 [lo, hi] 含兩端點；mid 取正中間，lo + hi 是奇數時取 ⌊(lo+hi)/2⌋ 或 ⌈(lo+hi)/2⌉ 都可以。', 'a[mid] < target 時，mid 和它左邊的元素都不可能是答案，所以新的 lo 是 mid + 1，不是 mid。', '找不到的情況：一直縮到 lo > hi，候選範圍才真的空了。'],
    explain: '二分搜尋的正確性來自迴圈不變量：只要 target 在陣列裡，它就一定落在 [lo, hi]。每次比較都丟掉一半而不違反這個不變量，所以最多 O(log n) 步；lo = mid + 1、hi = mid − 1 的「± 1」確保範圍每次都真的縮小，也是 off-by-one 錯誤最常出現的地方。',
    tags: ['binary-search', 'loop-invariant', 'off-by-one', 'O(log n)']
  });
})();
