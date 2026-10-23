/* CS LAB 共用：實驗註冊表、UI 小工具、逐步框架實驗轉接器、通用綜合複習實驗。
 * 實驗定義：{ title, prompt, init(ctx), view(s, ctx), act(s, action, arg, ctx), set(s, key, value, ctx, el), auto: { action, done(s) } }
 * act / set 直接修改狀態；app 負責重繪、回上一步、自動播放。純計算函式放在 CSLab.sim 供測試使用。 */
'use strict';
(function () {
  const h = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const int = (v, lo, hi, fallback) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? clamp(n, lo, hi) : fallback; };
  const btn = (act, label, o = {}) => `<button type="button" class="btn ${o.kind || 'secondary'} sm" data-act="${act}"${o.arg !== undefined ? ` data-arg="${h(o.arg)}"` : ''}${o.disabled ? ' disabled' : ''}${o.pressed !== undefined ? ` aria-pressed="${o.pressed}"` : ''}>${label}</button>`;
  const seg = (key, value, options, label) => `<div class="seg" role="group" aria-label="${h(label || key)}">${options.map(([v, text]) => `<button type="button" data-act="set:${key}" data-arg="${h(v)}" aria-pressed="${String(v) === String(value)}">${text}</button>`).join('')}</div>`;
  const stat = (label, value, o = {}) => `<div class="stat${o.tone ? ' ' + o.tone : ''}"><span>${label}</span><strong>${value}</strong></div>`;
  const stats = items => `<div class="stats">${items.join('')}</div>`;
  const note = (html, tone = '') => `<div class="note ${tone}" role="status">${html}</div>`;
  const num = (key, value, lo, hi, o = {}) => `<input class="num" type="number" inputmode="numeric" min="${lo}" max="${hi}" value="${value}" data-set="${key}"${o.label ? ` aria-label="${h(o.label)}"` : ''}${o.step ? ` step="${o.step}"` : ''}>`;
  const field = (label, control) => `<label class="field"><span>${label}</span>${control}</label>`;
  const range = (key, value, lo, hi, step, label) => `<input class="range" type="range" min="${lo}" max="${hi}" step="${step}" value="${value}" data-set="${key}" data-live aria-label="${h(label)}">`;
  const panel = (title, body, extra = '') => `<section class="board">${title ? `<div class="board-title">${title}${extra ? `<span>${extra}</span>` : ''}</div>` : ''}${body}</section>`;
  const avg = (rows, k) => rows.length ? rows.reduce((a, r) => a + r[k], 0) / rows.length : 0;
  const fmt = (n, d = 2) => Number.isInteger(n) ? String(n) : n.toFixed(d);

  // 簡易 DOM 比對更新：保留焦點、捲動位置與正在拖曳的滑桿。
  function morph(el, html) { const t = document.createElement('template'); t.innerHTML = html; patchChildren(el, t.content); }
  function patchChildren(a, b) {
    const an = [...a.childNodes], bn = [...b.childNodes];
    bn.forEach((y, i) => {
      const x = an[i];
      if (!x) { a.appendChild(y.cloneNode(true)); return; }
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y.cloneNode(true), x); return; }
      if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
      for (const { name } of [...x.attributes]) if (!y.hasAttribute(name)) x.removeAttribute(name);
      for (const { name, value } of [...y.attributes]) if (x.getAttribute(name) !== value) x.setAttribute(name, value);
      if (x.nodeName === 'INPUT') {
        if (x.type === 'checkbox' || x.type === 'radio') x.checked = y.hasAttribute('checked');
        else if (x !== document.activeElement || x.type === 'range') { const v = y.getAttribute('value') ?? ''; if (x.value !== v) x.value = v; }
      } else if (x.nodeName === 'TEXTAREA') { if (x !== document.activeElement) x.value = y.textContent; }
      else { patchChildren(x, y); if (x.nodeName === 'SELECT') { const sel = y.querySelector('option[selected]'); if (sel) x.value = sel.getAttribute('value') ?? sel.textContent; } }
    });
    for (let i = an.length - 1; i >= bn.length; i--) a.removeChild(an[i]);
  }

  const registry = {};
  const CSLab = { registry, sim: {}, ui: { h, clamp, int, btn, seg, stat, stats, note, num, field, range, panel, avg, fmt }, morph, register(type, def) { registry[type] = def; } };
  window.CSLab = CSLab;
  window.OSLabs = CSLab; // 舊名稱相容

  /* ───────────── 逐步框架實驗轉接器 ─────────────
   * 適用於「給定輸入 → 產生一串步驟畫面」的實驗。
   * spec：{ title, prompt, inputs: [[key, label, 'select'|'number'|'range'|'text', default, options]], frames(values) → [{ label, desc, visual, sub }], note }
   * select 的 options 為 [[value, text], …]；number / range 的 options 為 [min, max, step]。 */
  CSLab.frameLab = function (type, spec) {
    const defaults = () => Object.fromEntries(spec.inputs.map(([k, , , d]) => [k, d]));
    const frames = s => { const f = spec.frames(s.v); return f.length ? f : [{ label: '沒有步驟', desc: '請調整輸入。', visual: '' }]; };
    const control = ([k, label, kind, , opt], v) => {
      if (kind === 'select') return field(h(label), `<select class="select" data-set="${k}">${opt.map(([val, text]) => `<option value="${h(val)}"${String(v) === String(val) ? ' selected' : ''}>${h(text)}</option>`).join('')}</select>`);
      if (kind === 'range') return field(`${h(label)} = <b>${h(v)}</b>`, `<input class="range" type="range" min="${opt[0]}" max="${opt[1]}" step="${opt[2] || 1}" value="${h(v)}" data-set="${k}" data-live aria-label="${h(label)}">`);
      if (kind === 'number') return field(h(label), num(k, h(v), opt[0], opt[1], { label, step: opt[2] }));
      return field(h(label), `<input class="text" data-set="${k}" value="${h(v)}" spellcheck="false" aria-label="${h(label)}">`);
    };
    CSLab.register(type, {
      title: spec.title,
      prompt: spec.prompt || '調整參數之前，先預測最後的結果；然後一步一步前進，找出你的預測在哪一步開始和模擬不同。',
      init: () => ({ v: defaults(), k: 0 }),
      auto: { action: 'next', done: s => s.k >= frames(s).length - 1 },
      view(s) {
        const f = frames(s), k = Math.min(s.k, f.length - 1), cur = f[k];
        return `<div class="frame-controls">${spec.inputs.map(inp => control(inp, s.v[inp[0]])).join('')}</div>
        ${panel(`步驟 ${k + 1} / ${f.length}`, `<div class="frame-progress" aria-hidden="true"><i style="width:${(k + 1) / f.length * 100}%"></i></div><h3 class="frame-title">${h(cur.label)}</h3><p>${h(cur.desc)}</p><div class="frame-visual">${cur.visual || ''}</div>${cur.sub ? `<p class="muted small">${h(cur.sub)}</p>` : ''}`, `${Math.round((k + 1) / f.length * 100)}%`)}
        <div class="row">${btn('first', '⏮', { disabled: k === 0 })}${btn('prev', '← 上一步', { disabled: k === 0 })}${btn('next', '下一步 →', { kind: 'primary', disabled: k >= f.length - 1 })}${btn('end', '直接看結果', { disabled: k >= f.length - 1 })}</div>
        <ol class="frame-steps">${f.map((x, i) => `<li class="${i === k ? 'on' : i < k ? 'done' : ''}"><button type="button" data-act="goto" data-arg="${i}">${h(x.label)}</button></li>`).join('')}</ol>
        ${spec.note ? note(h(spec.note), 'warn') : ''}`;
      },
      act(s, a, arg) {
        const n = frames(s).length;
        if (a === 'next') s.k = Math.min(n - 1, s.k + 1);
        if (a === 'prev') s.k = Math.max(0, s.k - 1);
        if (a === 'first') s.k = 0;
        if (a === 'end') s.k = n - 1;
        if (a === 'goto') s.k = clamp(+arg, 0, n - 1);
      },
      set(s, key, value) {
        const inp = spec.inputs.find(i => i[0] === key); if (!inp) return;
        const [, , kind, def, opt] = inp;
        s.v[key] = kind === 'number' || kind === 'range' ? int(value, opt[0], opt[1], def) : String(value).slice(0, 40);
        s.k = 0;
      }
    });
  };

  /* ───────────── 通用綜合複習（混合題） ───────────── */
  CSLab.register('review', {
    title: '綜合混合練習',
    prompt: '題目來自所有章節並隨機混合，優先出現你曾經答錯的題目。作答前先想：這題屬於哪一章的觀念？',
    init: ctx => ({ items: ctx.pickReview(8), i: 0, choice: null, score: 0 }),
    view(s, ctx) {
      if (!s.items.length) return note('題庫還沒有準備好。', 'warn');
      if (s.i >= s.items.length) return `<div class="center">${stats([stat('得分', `${s.score} / ${s.items.length}`, { tone: s.score === s.items.length ? 'ok' : '' })])}<p>${s.score === s.items.length ? '全部答對！你已經能跨章節運用這些觀念。' : '答錯的題目已加入錯題本，可以到「錯題複習」頁面再練一次。'}</p><div class="row center">${btn('again', '再來一組', { kind: 'primary' })}<a class="btn secondary sm" href="#/review">前往錯題複習</a></div></div>`;
      const [lid, qi] = s.items[s.i], L = ctx.lesson(lid), q = L.quiz[qi], answered = s.choice !== null, order = ctx.choiceOrder(lid, qi);
      return `<div class="row between"><span class="muted">第 ${s.i + 1} / ${s.items.length} 題 · 得分 ${s.score}</span>${answered ? `<span class="tag">${h(ctx.chapterLabel(lid))}</span>` : '<span class="tag">章節隱藏中</span>'}</div>
      <h3 class="q">${h(q[0])}</h3>
      <div class="choices">${order.map((i, pos) => `<button type="button" class="choice${answered ? (i === q[2] ? ' right' : i === s.choice ? ' wrong' : '') : ''}" data-act="answer" data-arg="${i}"${answered ? ' disabled' : ''}><span class="key">${String.fromCharCode(65 + pos)}</span>${h(q[1][i])}</button>`).join('')}</div>
      ${answered ? note(`${s.choice === q[2] ? '✓ 答對了。' : '✗ 正解是「' + h(q[1][q[2]]) + '」。'} ${h(q[4])}`, s.choice === q[2] ? 'ok' : 'bad') + `<div class="row">${btn('next', s.i === s.items.length - 1 ? '看結果 →' : '下一題 →', { kind: 'primary' })}<button type="button" class="btn ghost sm" data-go="${lid}">回到「${h(L.title)}」複習</button></div>` : ''}`;
    },
    act(s, a, arg, ctx) {
      if (a === 'answer' && s.choice === null) { s.choice = +arg; const [lid, qi] = s.items[s.i], ok = s.choice === ctx.lesson(lid).quiz[qi][2]; if (ok) s.score++; ctx.recordAnswer(lid, qi, ok); }
      if (a === 'next') { s.i++; s.choice = null; }
      if (a === 'again') { s.items = ctx.pickReview(8); s.i = 0; s.choice = null; s.score = 0; }
    }
  });
})();
