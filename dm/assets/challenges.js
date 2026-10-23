/* DM 互動挑戰（CSLab.challenge，見 shared/cslab-challenge.js）。
 * 第 1 章 Truth Table 找反例：玩家設定 P、Q、R 的真假，提交自己認為的反例，或宣告主張成立（沒有反例）。
 * 任何一組讓式子為假的賦值都接受；式子的真假一律由 CSLab.sim.dm.evalExpr（真值表實驗的同一組連接詞）計算。 */
'use strict';
(function () {
  const X = CSLab.challenge, { h } = CSLab.ui, D = CSLab.sim.dm;
  const B = v => v ? '真' : '假';
  const rowsOf = vars => Array.from({ length: 2 ** vars.length }, (_, k) => Object.fromEntries(vars.map((v, i) => [v, !!(k >> (vars.length - 1 - i) & 1)])));
  const counter = (r, vars) => rowsOf(vars).filter(env => !D.evalExpr(r.expr, env));
  const said = (env, vars) => vars.map(v => `${v} = ${B(env[v])}`).join('、');
  const fresh = (s, c) => Object.assign(s, { val: Object.fromEntries(c.params.vars.map(v => [v, true])), tried: [] });

  X.type('truth-counter', {
    init: c => fresh({ round: 0, rounds: c.params.rounds.length, log: [], done: false }, c),
    view(s, c) {
      const vars = c.params.vars;
      if (s.done) return `<ul class="ch-log">${s.log.map(r => `<li><code>${h(D.showExpr(r.expr))}</code>：${r.env ? `反例 ${said(r.env, vars)}` : '每一列都為真，主張成立'}</li>`).join('')}</ul>`;
      const r = c.params.rounds[s.round];
      return `<p class="ch-goal">主張：<code class="ch-claim">${h(D.showExpr(r.expr))}</code> 是重言式（每一種賦值下都為真）。</p>
        <div class="row ch-toggles" role="group" aria-label="設定命題變數">${vars.map(v => `<button type="button" class="btn secondary sm ch-toggle" data-ch-act="flip" data-arg="${v}" aria-pressed="${s.val[v]}" aria-label="${v} 目前為${s.val[v] ? '真' : '假'}，按一下切換">${v} = <b>${B(s.val[v])}</b></button>`).join('')}</div>
        <div class="row ch-choices"><button type="button" class="btn primary sm" data-ch-act="submit">提交：${h(said(s.val, vars))} 是反例</button><button type="button" class="btn secondary sm" data-ch-act="none">宣告：找不到反例，主張成立</button></div>
        ${s.tried.length ? `<p class="muted small">已驗證不是反例：${s.tried.map(t => h(t)).join('；')}</p>` : '<p class="muted small">先在紙上推：要讓「A → B」為假，A 和 B 各要是什麼？推好了再設定、提交。</p>'}`;
    },
    act(s, a, arg, c) {
      const vars = c.params.vars, r = c.params.rounds[s.round];
      if (a === 'flip' && vars.includes(arg)) { s.val[arg] = !s.val[arg]; return {}; }
      if (a === 'submit') {
        const text = said(s.val, vars);
        if (s.tried.includes(text)) return { msg: `${text} 已經驗證過了，不是反例。` };
        if (D.evalExpr(r.expr, s.val)) { s.tried.push(text); return { ok: false, msg: `在 ${text} 時整個式子為真，不是反例。` }; }
        return next(s, c, { ...s.val }, `沒錯，${text} 時式子為假：這就是反例，主張不成立。`);
      }
      if (a === 'none') {
        if (counter(r, vars).length) return { ok: false, msg: '其實有反例。蘊涵 A → B 只在 A 為真、B 為假時才是假：先找讓結論為假的賦值，再看前提能不能同時為真。' };
        return next(s, c, null, `沒錯，${2 ** vars.length} 種賦值下式子都為真：它是重言式。`);
      }
      return {};
    },
    solution(c) {
      const vars = c.params.vars;
      return c.params.rounds.map(r => {
        const cols = r.cols || [], bad = counter(r, vars).length;
        return `<p><code>${h(D.showExpr(r.expr))}</code>：${bad ? `${bad} 組反例（標色的列）` : '每一列都為真，是重言式'}。</p>
          <div class="table-wrap"><table class="table compact ch-truth"><thead><tr>${vars.map(v => `<th>${v}</th>`).join('')}${cols.map(e => `<th>${h(D.showExpr(e))}</th>`).join('')}<th>整個式子</th></tr></thead><tbody>${rowsOf(vars).map(env => { const v = D.evalExpr(r.expr, env); return `<tr class="${v ? '' : 'sel'}">${vars.map(x => `<td>${B(env[x])}</td>`).join('')}${cols.map(e => `<td>${B(D.evalExpr(e, env))}</td>`).join('')}<td><b>${B(v)}</b></td></tr>`; }).join('')}</tbody></table></div>`;
      }).join('');
    }
  });
  function next(s, c, env, msg) {
    s.log.push({ expr: c.params.rounds[s.round].expr, env });
    s.round++;
    if (s.round >= s.rounds) { s.done = true; return { ok: true, round: true, done: true, msg }; }
    fresh(s, c);
    return { ok: true, round: true, msg: `${msg} 下一關。` };
  }

  const A = ['imp', 'P', ['imp', 'Q', 'R']], Bx = ['imp', ['imp', 'P', 'Q'], 'R'];
  X.add({
    id: 'dm.truth-table.counterexample', lesson: 0, kind: 'counterexample', ui: 'truth-counter',
    title: '這條規則真的永遠成立嗎？',
    task: '同學說了兩條「永遠成立」的規則。用真值表的想法檢查：設定 P、Q、R 的真假，找出讓式子為假的一組賦值（反例）；如果你判斷沒有反例，就宣告主張成立。',
    params: { vars: ['P', 'Q', 'R'], rounds: [{ expr: ['imp', A, Bx], cols: [A, ['imp', 'P', 'Q'], Bx] }, { expr: ['imp', ['and', 'P', 'Q'], ['or', 'P', 'R']], cols: [['and', 'P', 'Q'], ['or', 'P', 'R']] }] },
    rule: { accept: 'any-falsifying-row' },
    hints: ['A → B 只有一種情況為假：A 真、B 假。所以先讓結論為假，再檢查前提。', '第一關的結論是 (P → Q) → R。要讓它為假，R 必須為假，而 P → Q 必須為真。', '第二關：如果 P ∧ Q 為真，P 一定為真，那 P ∨ R 呢？'],
    explain: '找反例只需要一列；要證明重言式則必須說明每一列都為真（3 個變數就是 2³ = 8 列）。第一關的兩個式子看起來只是括號位置不同，但蘊涵不滿足結合律：P 為假、R 為假時 P → (Q → R) 為真，(P → Q) → R 卻為假。',
    tags: ['truth-table', 'implication', 'tautology', 'counterexample']
  });
})();
