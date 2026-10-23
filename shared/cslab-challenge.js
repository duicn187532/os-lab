/* CS LAB 互動挑戰：每章頁尾的 NPC Q&A。玩家先操作或預測，驗證之後才看得到完整解析。
 * 題目資料（各課 assets/challenges.js）：CSLab.challenge.add({ id, lesson, kind, ui, title, task, params, rule, hints, explain, tags })
 *   id：穩定的題目 id（進度以它為鍵，改了舊紀錄就失效）；lesson：章節 id；
 *   kind：題型 step | manipulate | target | counterexample | reasoning；ui：操作介面（CSLab.challenge.type 註冊的名稱）；
 *   params：輸入參數；rule：驗證規則的參數（容許誤差、合法的中點寫法…），由介面的 act 使用；
 *   hints：依序給的提示；explain：解析；tags：知識標籤。
 * 操作介面：CSLab.challenge.type(name, { init(c) → s, view(s, c) → html, act(s, action, arg, c) → 結果, solution(c, s) → html })
 *   s.round / s.rounds 是目前第幾關、共幾關；s.done 表示整題完成。
 *   act 的結果 { ok, msg, round, done }：ok:false 記一次失誤（訊息只指出哪裡不對，不給答案），ok:true 是答對的一步，
 *   省略 ok 是中性操作（調整數值、切換開關）；round:true 表示過了一關，done:true 表示整題完成。
 *   標準答案一律由確定性的規則或 CSLab.sim 的模擬計算，不靠即時評分。
 * 紀錄：課程進度 store.challenge[id] = { mistakes, hints, revealed, solved, at }。失誤與看過的提示立刻存檔，重新整理不會歸零；
 *   完成或看過解答之後紀錄就固定，再挑戰只是練習。經驗值（遊戲層）只依這份紀錄推算，所以反覆執行、刷新都拿不到更多。
 * 外觀：這裡只產生一般的課程卡片並發出 cslab:challenge 事件；楓之谷外觀的怪物挑戰由 shared/cslab-game.js 加上。 */
'use strict';
(function () {
  const { h } = CSLab.ui;
  const types = {}, items = [];
  const KINDS = { step: 'Step Challenge · 下一步', manipulate: 'Manipulation · 動手操作', target: 'Target Challenge · 達成目標', counterexample: 'Counterexample · 找反例', reasoning: 'Reasoning · 推理判斷' };
  const REVEAL_AFTER = 2; // 失誤幾次（或提示全部看完）之後才能直接看解答

  // 數值答案：接受小數、分數（13/4）與全形數字；比較時容許誤差
  const parse = text => {
    const t = String(text ?? '').trim().replace(/[０-９．／－]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '');
    const m = t.match(/^(-?\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
    if (!m) return NaN;
    return m[2] !== undefined ? (+m[2] === 0 ? NaN : +m[1] / +m[2]) : +m[1];
  };
  const close = (a, b, tol = 1e-9) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol + 1e-12;

  let env = null;
  const live = {}; // id → { s, msg, tone, hints, revealed }（這次開啟頁面的作答狀態）
  const byId = id => items.find(c => c.id === id);
  const blank = () => ({ mistakes: 0, hints: 0, revealed: false, solved: false, at: null });
  const rec = id => Object.assign(blank(), (env.store.challenge || {})[id]);
  const put = (id, r) => { (env.store.challenge ||= {})[id] = r; env.save(); };
  const frozen = r => r.solved || r.revealed;
  const cardOf = id => document.querySelector(`.challenge[data-challenge="${CSS.escape(id)}"]`);
  const emit = (c, event, extra = {}) => {
    const st = live[c.id];
    document.dispatchEvent(new CustomEvent('cslab:challenge', { detail: { id: c.id, lesson: c.lesson, card: cardOf(c.id), event, round: st.s.round || 0, rounds: st.s.rounds || 1, record: rec(c.id), ...extra } }));
  };
  const stateOf = c => live[c.id] ||= { s: types[c.ui].init(c), msg: '', tone: '', hints: rec(c.id).solved ? 0 : rec(c.id).hints, revealed: false };

  function mount(slot, lessonId, e) {
    env = e;
    const list = items.filter(c => c.lesson === lessonId && types[c.ui]);
    slot.hidden = !list.length;
    slot.innerHTML = list.map(c => `<section class="card challenge" data-challenge="${h(c.id)}" data-kind="${h(c.kind)}" aria-labelledby="chTitle-${h(c.id)}"><div class="ch-inner"></div></section>`).join('');
    list.forEach(c => { draw(c); emit(c, 'view'); });
  }

  function draw(c) {
    const card = cardOf(c.id); if (!card) return;
    const st = stateOf(c), T = types[c.ui], s = st.s, r = rec(c.id), over = !!s.done || st.revealed;
    const hints = c.hints || [], shown = Math.min(st.hints, hints.length);
    const canReveal = !over && (frozen(r) || r.mistakes >= REVEAL_AFTER || shown >= hints.length);
    card.dataset.status = r.solved ? 'solved' : r.revealed ? 'revealed' : r.mistakes || r.hints ? 'open' : 'new';
    card.dataset.over = over ? (s.done ? 'win' : 'revealed') : '';
    card.dataset.round = s.round || 0; card.dataset.rounds = s.rounds || 1;
    const record = r.solved ? `✓ 已完成（失誤 ${r.mistakes} 次、提示 ${r.hints} 個）。之後再挑戰只是練習，不改紀錄。`
      : r.revealed ? '看過解答了：這題可以繼續練習，但不再計入完成。'
      : `失誤 ${r.mistakes} 次 · 提示 ${r.hints} 個${r.mistakes || r.hints ? '（已存檔，重新整理不會歸零）' : ''}`;
    CSLab.morph(card.querySelector('.ch-inner'), `
      <header class="ch-head"><h2 class="label"><span class="ch-label">🧩 互動自我檢測</span></h2><span class="tag ch-kind">${h(KINDS[c.kind] || c.kind)}</span></header>
      <h3 class="ch-title" id="chTitle-${h(c.id)}">${h(c.title)}</h3>
      <p class="ch-task">${h(c.task)}</p>
      ${s.rounds > 1 ? `<div class="ch-rounds" aria-label="第 ${Math.min(s.round + 1, s.rounds)} 關，共 ${s.rounds} 關">${Array.from({ length: s.rounds }, (_, i) => `<i class="${i < s.round ? 'on' : i === s.round && !s.done ? 'cur' : ''}"></i>`).join('')}<span class="muted small">${s.done ? `${s.rounds} 關全部完成` : `第 ${s.round + 1} / ${s.rounds} 關`}</span></div>` : ''}
      <div class="ch-body">${T.view(s, c)}</div>
      <div class="note ch-msg ${st.tone}" role="status">${h(st.msg)}</div>
      ${shown ? `<ol class="ch-hints">${hints.slice(0, shown).map(t => `<li>${h(t)}</li>`).join('')}</ol>` : ''}
      <div class="row ch-tools">
        ${!over && hints.length ? `<button type="button" class="btn ghost sm" data-ch-tool="hint"${shown >= hints.length ? ' disabled' : ''}>💡 提示（${shown} / ${hints.length}）</button>` : ''}
        ${!over ? `<button type="button" class="btn ghost sm" data-ch-tool="reveal"${canReveal ? '' : ' disabled'} title="${canReveal ? '看解答後這題不再計入完成' : `先試著作答：失誤 ${REVEAL_AFTER} 次或看完提示後才能看解答`}">看解答</button>` : ''}
        ${over ? '<button type="button" class="btn secondary sm" data-ch-tool="retry">↻ 再挑戰一次</button>' : ''}
      </div>
      <p class="ch-record muted small">${record}</p>
      ${over ? `<div class="ch-explain"><h4>${s.done ? '解析：為什麼是這樣' : '解答與解析'}</h4>${T.solution(c, s)}${c.explain ? `<p>${h(c.explain)}</p>` : ''}${c.tags?.length ? `<div class="ch-tags">${c.tags.map(t => `<span class="tag">#${h(t)}</span>`).join('')}</div>` : ''}</div>` : ''}`);
  }

  function act(c, action, arg) {
    const st = stateOf(c), T = types[c.ui];
    if (st.s.done || st.revealed) return;
    const res = T.act(st.s, action, arg, c) || {}, r = rec(c.id);
    if (res.msg !== undefined) { st.msg = res.msg; st.tone = res.ok === true ? 'ok' : res.ok === false ? 'bad' : ''; }
    let event = 'step', fresh = false;
    if (res.ok === false) { event = 'mistake'; if (!frozen(r)) { r.mistakes++; put(c.id, r); } }
    if (res.round) event = 'round';
    if (res.done) { event = 'solved'; st.s.done = true; if (!frozen(r)) { r.solved = true; r.at = new Date().toISOString(); put(c.id, r); fresh = true; } }
    draw(c);
    emit(c, event, { fresh });
  }

  function tool(c, name) {
    const st = stateOf(c), r = rec(c.id);
    if (name === 'hint' && st.hints < (c.hints || []).length && !st.s.done && !st.revealed) {
      st.hints++;
      if (!frozen(r) && st.hints > r.hints) { r.hints = st.hints; put(c.id, r); }
    }
    if (name === 'reveal' && !st.s.done && !st.revealed) {
      if (!(frozen(r) || r.mistakes >= REVEAL_AFTER || st.hints >= (c.hints || []).length)) return;
      st.revealed = true; st.msg = ''; st.tone = '';
      if (!frozen(r)) { r.revealed = true; put(c.id, r); }
    }
    if (name === 'retry') live[c.id] = { s: types[c.ui].init(c), msg: '', tone: '', hints: 0, revealed: false };
    draw(c);
    emit(c, name === 'reveal' ? 'revealed' : name);
    if (name === 'retry') cardOf(c.id)?.querySelector('.ch-body button:not([disabled]), .ch-body input')?.focus({ preventScroll: true });
  }

  const challengeOf = el => { const card = el.closest('.challenge[data-challenge]'); return card && byId(card.dataset.challenge); };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-ch-act], [data-ch-tool]'); if (!el || el.disabled) return;
    const c = challengeOf(el); if (!c) return;
    if (el.dataset.chTool) tool(c, el.dataset.chTool); else act(c, el.dataset.chAct, el.dataset.arg);
  });
  // 數值與滑桿：拖動滑桿時即時更新，數字欄在 change 時更新；Enter 等於按下這題的主要按鈕
  const setFrom = el => { const c = challengeOf(el); if (c) act(c, 'set:' + el.dataset.chSet, el.value); };
  document.addEventListener('input', e => { if (e.target.matches('input[type=range][data-ch-set]')) setFrom(e.target); });
  document.addEventListener('change', e => { if (e.target.matches('[data-ch-set]')) setFrom(e.target); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('input[data-ch-set]')) return;
    e.preventDefault(); setFrom(e.target);
    e.target.closest('.challenge')?.querySelector('[data-ch-enter]:not([disabled])')?.click();
  });

  CSLab.challenge = {
    KINDS, REVEAL_AFTER, num: { parse, close },
    add: c => { items.push(c); }, type: (name, def) => { types[name] = def; },
    list: () => items.filter(c => types[c.ui]), forLesson: id => items.filter(c => c.lesson === id && types[c.ui]), get: byId,
    mount
  };
})();
