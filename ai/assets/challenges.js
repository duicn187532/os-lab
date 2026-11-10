/* AI 互動挑戰（CSLab.challenge，見 shared/cslab-challenge.js）。
 * 第 3 章 調整 Learning Rate 達成目標 Loss：玩家選學習率 η、執行固定次數的更新，結果符合條件才過關。
 * 軌跡由 CSLab.sim.ai.gd.trail 計算（梯度下降實驗的同一個函式），圖由該實驗的 frames 畫出；任何符合條件的 η 都接受。 */
'use strict';
(function () {
  const X = CSLab.challenge, { h } = CSLab.ui, AI = CSLab.sim.ai, G = AI.gd;
  const ZERO = 1e-14; // 浮點誤差內視為剛好落在最低點
  const r3 = x => Number(x.toFixed(3));
  const side = w => Math.abs(w - G.opt) < ZERO ? 0 : Math.sign(w - G.opt);
  // 一次執行：最後的 Loss、跨過最低點的次數、是否每一步都跨過
  function run(c, lr) {
    const { start, steps } = c.params, t = G.trail(start, lr, steps), sides = t.map(side);
    let flips = 0, every = true;
    for (let i = 1; i < sides.length; i++) { if (sides[i] && sides[i - 1] && sides[i] !== sides[i - 1]) flips++; else every = false; }
    return { lr, trail: t, loss: G.loss(t[t.length - 1]), start: G.loss(start), flips, every };
  }
  const meets = (g, x) => x.loss <= g.maxLoss + 1e-12 && (g.cross === 'never' ? x.flips === 0 : x.every);
  // 解析解：w_t − 3 = (1 − 2η)^t (w₀ − 3)，Loss ≤ 目標 ⇔ |1 − 2η| ≤ ρ
  const rho = (c, g) => Math.pow(g.maxLoss / G.loss(c.params.start), 1 / (2 * c.params.steps));
  const plotOf = (c, lr) => { const f = AI.frames('gradient', { start: c.params.start, lr, steps: c.params.steps }); return f[f.length - 1].visual; };
  const set = (c, v) => { const { min, max } = c.params, n = Number(v); return Number.isFinite(n) && String(v).trim() !== '' ? Math.round(Math.min(max, Math.max(min, n)) * 100) / 100 : null; };
  const fresh = (s, c) => Object.assign(s, { lr: c.params.lr, last: null });

  X.type('lr-target', {
    init: c => fresh({ round: 0, rounds: c.params.rounds.length, log: [], done: false }, c),
    view(s, c) {
      const { start, steps, min, max } = c.params;
      if (s.done) return `<ul class="ch-log">${s.log.map(x => `<li>${h(x.goal)}：η = <b>${x.lr}</b>，${steps} 步後 Loss = ${r3(x.loss)}</li>`).join('')}</ul>`;
      const g = c.params.rounds[s.round], x = s.last;
      return `<p class="ch-goal">${h(g.goal)}</p>
        <p class="muted small">L(w) = (w − 3)²，起點 w₀ = ${start}（Loss ${G.loss(start)}），每次更新 w ← w − η · 2(w − 3)，共 ${steps} 次。</p>
        <div class="row ch-lr"><label class="field inline"><span>學習率 η</span><input class="range" type="range" min="${min}" max="${max}" step="0.01" value="${s.lr}" data-ch-set="lr" aria-label="學習率 η"></label>
          <button type="button" class="btn ghost sm" data-ch-act="nudge" data-arg="-0.01" aria-label="η 減 0.01">−</button><input class="num" type="number" min="${min}" max="${max}" step="0.01" value="${s.lr}" data-ch-set="lr" aria-label="學習率 η 的數值"><button type="button" class="btn ghost sm" data-ch-act="nudge" data-arg="0.01" aria-label="η 加 0.01">＋</button>
          <button type="button" class="btn primary sm" data-ch-act="run" data-ch-enter>執行 ${steps} 次更新</button></div>
        ${x ? `<div class="ch-plot">${plotOf(c, x.lr)}</div><div class="stats"><div class="stat"><span>η</span><strong>${x.lr}</strong></div><div class="stat"><span>${steps} 步後 Loss</span><strong>${x.loss > 1e6 ? x.loss.toExponential(2) : r3(x.loss)}</strong></div><div class="stat"><span>跨過最低點</span><strong>${x.flips} 次</strong></div></div>` : '<p class="muted small">先想好 η 大概落在哪裡，再執行。每次執行沒達標都算一次失誤。</p>'}`;
    },
    act(s, a, arg, c) {
      if (a === 'set:lr') { const v = set(c, arg); if (v !== null) s.lr = v; return {}; }
      if (a === 'nudge') { const v = set(c, s.lr + Number(arg)); if (v !== null) s.lr = v; return {}; }
      if (a !== 'run') return {};
      const g = c.params.rounds[s.round], x = run(c, s.lr);
      s.last = x;
      if (meets(g, x)) {
        s.log.push({ goal: g.goal, lr: x.lr, loss: x.loss });
        const msg = `η = ${x.lr}：${c.params.steps} 步後 Loss = ${r3(x.loss)}，${g.cross === 'never' ? '一路從同一側走到最低點' : '每一步都跨過最低點，但越跳越靠近'}。`;
        s.round++;
        if (s.round >= s.rounds) { s.done = true; return { ok: true, round: true, done: true, msg }; }
        fresh(s, c);
        return { ok: true, round: true, msg: `${msg} 下一關。` };
      }
      const why = x.loss > x.start ? `Loss 從 ${x.start} 變成 ${x.loss > 1e6 ? x.loss.toExponential(2) : r3(x.loss)}：發散了，每一步都跨過頭而且越跨越遠。`
        : x.loss > g.maxLoss ? (x.flips ? `w 在最低點兩側來回跳，${c.params.steps} 步後 Loss = ${r3(x.loss)}，還不夠小。` : `${c.params.steps} 步後 Loss = ${r3(x.loss)}，還沒降到 ${g.maxLoss} 以下：步伐太小，還在半山腰。`)
        : g.cross === 'never' ? `Loss 夠小了，但 w 跨過了最低點 w = 3、在兩側來回。這一關要一路從同一側走下來。`
        : x.flips ? 'Loss 夠小，但不是每一步都跨過最低點。' : `Loss 夠小，但 w ${x.trail.some(w => side(w) === 0) ? '剛好落在 w = 3 就停住了' : '一直在同一側'}，沒有震盪。這一關要找會來回跳、卻仍然收斂的 η。`;
      return { ok: false, msg: why };
    },
    solution(c) {
      const { start, steps } = c.params;
      return `<p>每次更新 w − 3 都乘上 (1 − 2η)，所以 w<sub>t</sub> − 3 = (1 − 2η)<sup>t</sup>(w₀ − 3)，Loss<sub>${steps}</sub> = (1 − 2η)<sup>${2 * steps}</sup> · ${G.loss(start)}。</p>
        <ul>${c.params.rounds.map(g => { const p = rho(c, g), lo = (1 - p) / 2, hi = (1 + p) / 2; return `<li>${h(g.goal)}：Loss ≤ ${g.maxLoss} ⇔ |1 − 2η| ≤ ${r3(p)}，即 ${r3(lo)} ≤ η ≤ ${r3(hi)}；${g.cross === 'never' ? `再要求不跨過最低點（1 − 2η ≥ 0，η ≤ 0.5），合格範圍是 <b>${r3(lo)} ≤ η ≤ 0.5</b>` : `再要求每一步都跨過（1 − 2η &lt; 0，η &gt; 0.5），合格範圍是 <b>0.5 &lt; η ≤ ${r3(hi)}</b>`}。</li>`; }).join('')}</ul>
        <p>η = 0.5 一步就落在 w = 3；η &gt; 1 時 |1 − 2η| &gt; 1，越走越遠而發散。</p>`;
    }
  });

  X.add({
    id: 'ai.gradient-descent.learning-rate', lesson: 2, kind: 'target', ui: 'lr-target',
    title: '步伐要多大才走得到谷底？',
    task: '從 w₀ = −4 出發，對 L(w) = (w − 3)² 做 8 次梯度下降。調整學習率 η，讓結果符合每一關的條件。',
    params: { start: -4, steps: 8, lr: 0.1, min: 0, max: 1.5, rounds: [{ goal: '第 1 關：8 步後 Loss ≤ 0.01，而且 w 一路從左邊走下來，不跨過最低點', maxLoss: 0.01, cross: 'never' }, { goal: '第 2 關：8 步後 Loss 一樣 ≤ 0.01，但每一步都要跨過最低點（左右來回震盪）', maxLoss: 0.01, cross: 'every' }] },
    rule: { lossTol: 1e-12, zero: ZERO, step: 0.01 },
    hints: ['梯度是 2(w − 3)。每次更新後，w 和 3 的距離會變成原本的 |1 − 2η| 倍。', '|1 − 2η| 越接近 0 收斂越快；1 − 2η 為負時，w 會跳到 3 的另一側。', '8 步後距離要縮到 0.1 以下（Loss ≤ 0.01），起點距離是 7：|1 − 2η|⁸ ≤ 0.1 / 7。'],
    explain: '學習率決定每一步跨多遠。η 太小（例如實驗預設的 0.2）方向對但走不完；0.5 以下從同一側逼近；0.5 到 1 之間每一步都跨過最低點、靠震盪收斂；超過 1 就越跳越遠而發散。這個二次函數的曲率固定，所以合格的 η 是一段區間，不是唯一答案。',
    tags: ['gradient-descent', 'learning-rate', 'convergence', 'divergence', 'oscillation']
  });
})();
