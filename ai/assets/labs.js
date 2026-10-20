/* AI LAB 互動實驗：24 種逐步實驗。每種實驗的 frames(輸入值) 產生一串步驟畫面 { label, desc, visual }，
 * 透過 CSLab.frameLab 註冊，因此自動獲得上一步、自動播放與步驟列表。計算沿用舊版單檔的 labFrames；
 * 原本只有 3–4 步的實驗（向量、Bayes、迴歸、kNN、SVM、決策樹、PCA、神經元、Attention、Token、Sampling）
 * 拆成「計算的每一個中間量」，例如殘差 → MSE → 梯度 → 更新。純計算函式掛在 CSLab.sim.ai 供測試使用。 */
'use strict';
(function () {
const { h } = CSLab.ui;
const round = (x, d = 3) => Number.isFinite(x) ? Number(x.toFixed(d)) : x;
const clamp = (n, a, b, def = a) => Number.isFinite(+n) && String(n).trim() !== '' ? Math.max(a, Math.min(b, +n)) : def;
const softmax = (xs, t = 1) => { const z = xs.map(x => x / Math.max(.001, t)), m = Math.max(...z), a = z.map(x => Math.exp(x - m)), s = a.reduce((x, y) => x + y, 0); return a.map(x => x / s); };
const pct = (x, d = 2) => Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—';
const sum = a => a.reduce((s, x) => s + x, 0);
const par = x => x < 0 ? `(${round(x)})` : `${round(x)}`; // 負數代入算式時加括號
function parsePair(s, fallback = [1, 2]) { const a = String(s || '').split(/[\s,，]+/).filter(Boolean).map(Number); return a.length === 2 && a.every(x => Number.isFinite(x) && Math.abs(x) < 100) ? a : fallback; }

/* ───────────── 視覺元件（顏色由 ai-labs.css 的 class 控制，跟著深淺主題變化） ───────────── */
let clipN = 0;
const svg = (shapes, w = 640, hh = 320) => { const id = `aiClip${++clipN}`; return `<svg class="ai-plot" viewBox="0 0 ${w} ${hh}" role="img" aria-label="實驗圖形"><defs><clipPath id="${id}"><rect x="50" y="30" width="550" height="250"/></clipPath></defs>${shapes.replace(/data-clip/g, `clip-path="url(#${id})"`)}</svg>`; };
const xy = (p, lim = [0, 6, 0, 6]) => { const [x0, x1, y0, y1] = lim; return [round(50 + (p[0] - x0) / (x1 - x0) * 535, 1), round(278 - (p[1] - y0) / (y1 - y0) * 235, 1)]; };
function axes(lim = [0, 6, 0, 6]) {
  let s = '<line class="ax" x1="50" y1="278" x2="596" y2="278"/><line class="ax" x1="50" y1="278" x2="50" y2="35"/>';
  for (let i = 0; i <= 5; i++) { const p = 50 + i * 107; s += `<line class="ax" x1="${p}" x2="${p}" y1="278" y2="283"/><text x="${p}" y="299" text-anchor="middle">${(lim[0] + i * (lim[1] - lim[0]) / 5).toFixed(1)}</text>`; }
  for (let i = 0; i <= 4; i++) { const p = 278 - i * 235 / 4; s += `<line class="ax" x1="45" x2="50" y1="${p}" y2="${p}"/><text x="40" y="${p + 4}" text-anchor="end">${round(lim[2] + i * (lim[3] - lim[2]) / 4, 1)}</text>`; }
  return s;
}
function scatter(points, lim, highlight = [], labels = false) {
  return points.map((p, i) => { const [x, y] = xy(p, lim), sel = highlight.includes(i), cls = typeof p[2] === 'string' ? (p[2] === 'A' ? 'pa' : 'pb') : 'pn';
    return `<circle class="pt ${cls}${sel ? ' sel' : ''}" cx="${x}" cy="${y}" r="${sel ? 10 : 7}"/>${labels ? `<text class="lbl" x="${x + 12}" y="${y + 4}">${h(p[2])}</text>` : ''}`; }).join('');
}
// 直線 a·x + b·y + c = 0，裁切在圖框內
function lineABC(a, b, c, lim, cls = 'fit') {
  let p1, p2;
  if (Math.abs(b) >= Math.abs(a)) { p1 = [lim[0], -(c + a * lim[0]) / b]; p2 = [lim[1], -(c + a * lim[1]) / b]; }
  else { p1 = [-(c + b * lim[2]) / a, lim[2]]; p2 = [-(c + b * lim[3]) / a, lim[3]]; }
  const [x1, y1] = xy(p1, lim), [x2, y2] = xy(p2, lim);
  return `<line class="${cls}" data-clip x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
}
const legend = html => `<div class="ai-legend">${html}</div>`;
function bars(labels, values, o = {}) {
  const max = Math.max(1e-9, ...values.filter(Number.isFinite).map(Math.abs));
  return `<div class="ai-bars">${labels.map((l, i) => { const v = values[i], shown = Number.isFinite(v) ? (o.percent ? `${round(v * 100, 2)}%` : round(v, o.d ?? 3)) : (v === -Infinity ? '−∞' : '—');
    return `<div class="ai-bar-row"><span>${h(l)}</span><div class="ai-track"><i class="${o.selected === i || (o.hot || []).includes(i) ? 'hot' : ''}${Number.isFinite(v) && v < 0 ? ' neg' : ''}" style="width:${Number.isFinite(v) ? Math.max(1, Math.abs(v) / max * 100) : 0}%"></i></div><b>${h(shown)}</b></div>`; }).join('')}</div>`;
}
const boxes = (labels, active = [], done = []) => `<div class="ai-cards">${labels.map((l, i) => `<div class="ai-card${active.includes(i) ? ' active' : ''}${done.includes(i) ? ' done' : ''}">${h(l)}</div>`).join('')}</div>`;
const flow = (labels, active, stopped) => `<div class="ai-flow">${labels.map((l, i) => `${i ? '<span class="ai-arrow" aria-hidden="true">→</span>' : ''}<span class="ai-node${i === active ? ' active' : ''}${i < active ? ' done' : ''}">${h(l)}</span>`).join('')}</div>${stopped ? legend('⏸ 等待核准或達到停止條件') : ''}`;
const table = (head, rows, hl = []) => `<div class="tablewrap"><table class="matrix"><thead><tr>${head.map(x => `<th>${h(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr${hl.includes(i) ? ' class="selected"' : ''}>${r.map(x => `<td>${h(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const metrics = items => `<div class="ai-metrics">${items.map(([k, v]) => `<div><span>${h(k)}</span><strong>${h(v)}</strong></div>`).join('')}</div>`;
const curvePlot = (fn, lim, mark, cls = 'curve') => { const pts = Array.from({ length: 121 }, (_, i) => { const x = lim[0] + i * (lim[1] - lim[0]) / 120; return xy([x, clamp(fn(x), lim[2], lim[3])], lim).join(','); }); let s = axes(lim) + `<polyline class="${cls}" points="${pts.join(' ')}"/>`; if (mark) { const [x, y] = xy([mark[0], clamp(mark[1], lim[2], lim[3])], lim); s += `<line class="guide" x1="${x}" y1="278" x2="${x}" y2="${y}"/><circle class="hot" cx="${x}" cy="${y}" r="7"/>`; } return svg(s); };

/* ───────────── 實驗定義 ───────────── */
const LABS = {};
const def = (type, name, inputs, frames) => { LABS[type] = { name, inputs, frames }; };
// 每個 frames(o) 回傳 { frames: [{ label, desc, visual }], summary }；summary 會顯示在最後一步。
const make = () => { const F = []; return { F, push: (label, desc, visual = '') => F.push({ label, desc, visual }) }; };

def('pipeline', 'AI 專案生命週期', [['task', 'AI 任務', 'select', 'supervised', [['supervised', '監督式分類'], ['unsupervised', '非監督式分群'], ['generative', '生成式 LLM']]]], o => {
  const { F, push } = make();
  const names = { supervised: ['定義「是否違約」分類任務', '蒐集資料並保護個資', '劃分 Train / Validation / Test', '訓練模型、調整參數', '獨立測試 Precision / Recall', '部署並監控資料漂移'], unsupervised: ['定義顧客分群需求', '清理並正規化特徵', '設定分群演算法', '根據距離進行群分配', '檢查分群穩定與可解釋性', '部署並監測群分布'], generative: ['定義文字生成用途與風險', '整理語料與 Tokenizer', '預訓練下一個 Token 預測', '指令微調與評估', '部署推論與使用者測試', '監控品質、安全及成本'] }[o.task] || [];
  names.forEach((x, i) => push(x, `${i + 1} / ${names.length}：${x}。`, flow(names, i)));
  return { frames: F, summary: '不同任務對訓練資料、損失函數與評估指標的需求不同。' };
});

def('vector', '內積、長度與餘弦相似度', [['x', '向量 x（兩個數）', 'text', '1,2'], ['y', '向量 y（兩個數）', 'text', '2,1']], o => {
  const { F, push } = make();
  const x = parsePair(o.x), y = parsePair(o.y, [2, 1]), p = [x[0] * y[0], x[1] * y[1]], dot = p[0] + p[1], nx = Math.hypot(...x), ny = Math.hypot(...y), cos = nx * ny ? dot / nx / ny : NaN;
  const lim = [-5, 5, -5, 5], o0 = xy([0, 0], lim);
  const plot = (extra = '') => { const a = xy(x, lim), b = xy(y, lim); return svg(axes(lim) + `<defs><marker id="aiArrA" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path class="mk-a" d="M0 0 L8 4 L0 8 Z"/></marker><marker id="aiArrB" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path class="mk-b" d="M0 0 L8 4 L0 8 Z"/></marker></defs><line class="vec-a" x1="${o0[0]}" y1="${o0[1]}" x2="${a[0]}" y2="${a[1]}" marker-end="url(#aiArrA)"/><line class="vec-b" x1="${o0[0]}" y1="${o0[1]}" x2="${b[0]}" y2="${b[1]}" marker-end="url(#aiArrB)"/><text class="lbl" x="${a[0] + 8}" y="${a[1] - 6}">x</text><text class="lbl" x="${b[0] + 8}" y="${b[1] - 6}">y</text>` + extra); };
  push('畫出兩個向量', `兩個 2D 向量從原點出發：x=[${x}]、y=[${y}]。`, plot() + legend('<span class="key-a">━ x</span><span class="key-b">━ y</span>'));
  push('同一維度的分量相乘', `x₁y₁ = ${x[0]}×${y[0]} = ${round(p[0])}；x₂y₂ = ${x[1]}×${y[1]} = ${round(p[1])}。內積只把「同一個維度」的分量相乘。`, table(['維度', 'x', 'y', 'x×y'], [['1', x[0], y[0], round(p[0])], ['2', x[1], y[1], round(p[1])]]));
  push('加總得到內積', `計算內積：${x[0]}×${y[0]} + ${x[1]}×${y[1]} = ${round(dot)}。${dot > 0 ? '內積為正：夾角小於 90°。' : dot < 0 ? '內積為負：夾角大於 90°。' : '內積為 0：兩向量垂直。'}`, plot() + metrics([['x·y', round(dot)]]));
  push('計算向量長度', `‖x‖ = √(${x[0]}² + ${x[1]}²) = ${round(nx)}；‖y‖ = √(${y[0]}² + ${y[1]}²) = ${round(ny)}。內積同時受「方向」與「長度」影響。`, metrics([['‖x‖', round(nx)], ['‖y‖', round(ny)], ['‖x‖‖y‖', round(nx * ny)]]));
  push('除以長度：餘弦相似度', nx * ny ? `cos θ = ${round(dot)} / ${round(nx * ny)} = ${round(cos)}，θ ≈ ${round(Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI, 1)}°；方向${cos > .8 ? '很接近' : cos < 0 ? '相反傾向' : '差異明顯'}。` : '存在零向量，餘弦相似度沒有定義。', plot() + metrics([['cos θ', round(cos)], ['θ', nx * ny ? `${round(Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI, 1)}°` : '—']]));
  if (ny) { const k = dot / (ny * ny), q = [y[0] * k, y[1] * k], a = xy(x, lim), b = xy(q, lim);
    push('投影：x 在 y 方向上的分量', `x 投影到 y 方向 = (x·y / ‖y‖²)·y = ${round(k)}·y = [${round(q[0])}, ${round(q[1])}]，投影長度 x·y/‖y‖ = ${round(dot / ny)}。`, plot(`<line class="guide" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><circle class="hot" cx="${b[0]}" cy="${b[1]}" r="6"/>`) + legend('虛線：x 垂直落到 y 的方向上')); }
  push('把 x 放大兩倍再比一次', `2x=[${x.map(v => round(2 * v))}]：內積變成 ${round(2 * dot)}（兩倍），但餘弦仍是 ${round(cos)}。這就是 embedding 比對常用餘弦相似度的原因：只看方向。`, table(['', '內積', '餘弦'], [['x 與 y', round(dot), round(cos)], ['2x 與 y', round(2 * dot), round(cos)]]));
  return { frames: F, summary: `dot=${round(dot)}，cosine=${round(cos)}；向量的語意由訓練而來，不會由公式直接決定。` };
});

def('gradient', '梯度下降：一步一步走下坡', [['start', '起始 w', 'range', -4, [-12, 12, .5]], ['lr', '學習率 η', 'range', .2, [0, 1.5, .05]], ['steps', '更新次數', 'range', 12, [1, 28, 1]]], o => {
  const { F, push } = make();
  let w = clamp(o.start, -12, 12, -4); const lr = clamp(o.lr, 0, 1.5, .2), n = clamp(o.steps, 1, 28, 12), lim = [-8, 6, 0, 144], trail = [w];
  const plot = () => { let s = ''; trail.forEach((v, i) => { const [x, y] = xy([Math.max(-8, Math.min(6, v)), Math.min(144, (v - 3) ** 2)], lim); s += `<circle class="${i === trail.length - 1 ? 'hot' : 'trail'}" cx="${x}" cy="${y}" r="${i === trail.length - 1 ? 7 : 3}"/>`; }); return curvePlot(v => (v - 3) ** 2, lim) .replace('</svg>', s + '</svg>') + legend(`w=${round(w)}　Loss=${round((w - 3) ** 2)}`); };
  push('起點', `起點 w=${round(w)}，Loss=(w−3)²。`, plot());
  for (let i = 0; i < n; i++) { const g = 2 * (w - 3), nw = w - lr * g; const text = `第 ${i + 1} 次：梯度 ${round(g)}；w ← ${round(w)} − ${round(lr)} × ${round(g)} = ${round(nw)}。`; w = nw; trail.push(w); push(`第 ${i + 1} 次更新`, text, plot()); }
  return { frames: F, summary: `終點 w=${round(w)}，Loss=${round((w - 3) ** 2)}；若 η>1，本例的迭代會發散。` };
});

def('bayes', 'Bayes：陽性結果的真正意義', [['prior', '盛行率 %', 'number', 1, [.01, 100, .01]], ['sens', '敏感度 %', 'range', 95, [0, 100, 1]], ['spec', '特異度 %', 'range', 90, [0, 100, 1]]], o => {
  const { F, push } = make();
  const p = clamp(o.prior, .01, 100, 1) / 100, s = clamp(o.sens, 0, 100, 95) / 100, c = clamp(o.spec, 0, 100, 90) / 100, N = 10000;
  const sick = p * N, healthy = N - sick, TP = sick * s, FN = sick - TP, TN = healthy * c, FP = healthy - TN, tp = p * s, fp = (1 - p) * (1 - c), post = tp + fp > 0 ? tp / (tp + fp) : NaN;
  const n1 = x => round(x, 1);
  push('先驗：盛行率', `先驗：每 10,000 人約有 ${n1(p * 10000)} 人患病。`, bars(['實際陽性（患病）', '實際陰性（未患病）'], [p, 1 - p], { percent: true }));
  push('患者中的檢驗結果', `患病的 ${n1(sick)} 人中，敏感度 ${pct(s, 0)} → ${n1(TP)} 人檢驗陽性（真陽性 TP），${n1(FN)} 人被漏掉（偽陰性 FN）。`, bars(['真陽性 TP', '偽陰性 FN'], [TP, FN], { d: 1 }));
  push('健康者中的檢驗結果', `未患病的 ${n1(healthy)} 人中，特異度 ${pct(c, 0)} → ${n1(TN)} 人正確判為陰性（TN），但仍有 ${n1(FP)} 人出現偽陽性（FP）。人數多的一群，即使錯誤率低也會產生大量偽陽性。`, bars(['真陰性 TN', '偽陽性 FP'], [TN, FP], { d: 1 }));
  push('整理成四格表', '把 10,000 人依「實際狀態 × 檢驗結果」分成四格；Bayes 定理其實就是在這張表上做除法。', table(['', '檢驗陽性', '檢驗陰性', '合計'], [['實際患病', n1(TP), n1(FN), n1(sick)], ['實際未患病', n1(FP), n1(TN), n1(healthy)], ['合計', n1(TP + FP), n1(FN + TN), N]], [0]));
  push('只看陽性的人', `真陽性率 ≈ ${(tp * 100).toFixed(2)}%，偽陽性率 ≈ ${(fp * 100).toFixed(2)}%（以總人口為母數）。陽性的人一共 ${n1(TP + FP)} 位。`, bars(['真陽性', '偽陽性'], [tp, fp], { percent: true }));
  push('後驗 P(患病 | 陽性)', `在所有陽性結果中，真正患病的比例為 ${Number.isFinite(post) ? (post * 100).toFixed(2) + '%' : '無定義（沒有任何陽性）'}。P(病|陽) = TP / (TP + FP) = ${n1(TP)} / ${n1(TP + FP)}。`, bars(['真陽性 / 陽性', '偽陽性 / 陽性'], tp + fp ? [tp / (tp + fp), fp / (tp + fp)] : [0, 0], { percent: true }) + metrics([['敏感度 P(陽|病)', pct(s)], ['後驗 P(病|陽)', pct(post)]]));
  const post2 = Number.isFinite(post) && post * s + (1 - post) * (1 - c) > 0 ? post * s / (post * s + (1 - post) * (1 - c)) : NaN;
  push('再驗一次：後驗變成新的先驗', `若同一個人再做一次獨立檢驗又是陽性，先驗改用 ${pct(post)}，新的後驗為 ${pct(post2)}。證據會累積，但每一步都必須從先驗出發。`, bars(['原始先驗', '第一次陽性後', '第二次陽性後'], [p, post, post2], { percent: true, hot: [2] }));
  return { frames: F, summary: '單看靈敏度會忽略基準率，Bayes 必須同時考慮盛行率與假陽性。' };
});

const REG_PTS = [[0, 1], [1, 2.5], [2, 4.8], [3, 7.2], [4, 8.9], [5, 11.1]];
const mseOf = (w, b) => sum(REG_PTS.map(([x, y]) => (w * x + b - y) ** 2)) / REG_PTS.length;
def('regression', '線性迴歸：殘差、MSE 與梯度下降', [['w', '斜率 w', 'range', 1, [-4, 5, .1]], ['b', '截距 b', 'range', 0, [-5, 8, .1]], ['lr', '學習率 η', 'range', .02, [0, .12, .005]], ['iters', '梯度下降次數', 'range', 6, [0, 15, 1]]], o => {
  const { F, push } = make();
  let w = clamp(o.w, -4, 5, 1), b = clamp(o.b, -5, 8, 0); const lr = clamp(o.lr, 0, .12, .02), iters = clamp(o.iters, 0, 15, 6), pts = REG_PTS, n = pts.length, lim = [0, 6, -1, 13];
  const w0 = w, b0 = b, mse0 = mseOf(w, b);
  const plot = (lines, resid) => { let s = axes(lim) + scatter(pts, lim); if (resid) pts.forEach(([x, y]) => { const a = xy([x, y], lim), c = xy([x, Math.max(-1, Math.min(13, resid.w * x + resid.b))], lim); s += `<line class="resid" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}"/>`; }); lines.forEach(([lw, lb, cls]) => { s += lineABC(lw, -1, lb, lim, cls); }); return svg(s); };
  push('觀測資料', '六個觀測點（固定的訓練範例）。', plot([]) + legend('● 真實資料'));
  push('畫上候選直線', `畫上直線 ŷ=${round(w)}x+${round(b)}，觀察預測與實際點距。`, plot([[w, b, 'fit']]) + legend('<span class="key-fit">━ 預測直線</span>'));
  const e = pts.map(([x, y]) => y - (w * x + b));
  push('計算每一點的殘差', `殘差 eᵢ = yᵢ − ŷᵢ：正值代表直線在點的下方（低估），負值代表高估。`, plot([[w, b, 'fit']], { w, b }) + table(['x', 'y', 'ŷ', 'e = y − ŷ'], pts.map(([x, y], i) => [x, y, round(w * x + b), round(e[i])])));
  push('平方後取平均：MSE', `MSE = 每筆殘差平方和 / 6 = ${round(mse0)}；平方讓正負誤差不會互相抵銷，也讓大誤差特別重。`, bars(pts.map(([x]) => `x=${x} 的 e²`), e.map(v => v * v)) + metrics([['MSE', round(mse0)]]));
  const grad = (w, b) => { const r = pts.map(([x, y]) => y - (w * x + b)); return [-2 / n * sum(r.map((v, i) => v * pts[i][0])), -2 / n * sum(r)]; };
  const [gw, gb] = grad(w, b);
  push('計算梯度', `∂MSE/∂w = −(2/n)Σeᵢxᵢ = ${round(gw)}；∂MSE/∂b = −(2/n)Σeᵢ = ${round(gb)}。梯度為負代表把參數調大會讓 MSE 下降。`, metrics([['∂MSE/∂w', round(gw)], ['∂MSE/∂b', round(gb)]]));
  const hist = [mse0];
  for (let k = 1; k <= iters; k++) {
    const [gw, gb] = grad(w, b), nw = w - lr * gw, nb = b - lr * gb, text = `w ← ${round(w)} − ${lr}×${par(gw)} = ${round(nw)}；b ← ${round(b)} − ${lr}×${par(gb)} = ${round(nb)}；MSE ${round(mseOf(w, b))} → ${round(mseOf(nw, nb))}。`;
    w = nw; b = nb; hist.push(mseOf(w, b));
    push(`梯度下降第 ${k} 步`, text + (hist[k] > hist[k - 1] ? ' MSE 變大了：學習率太大，更新跨過了最低點。' : ''), plot([[w0, b0, 'fit faint'], [w, b, 'fit']]) + bars(hist.map((_, i) => i ? `第 ${i} 步` : '起點'), hist, { selected: k }));
  }
  const mx = sum(pts.map(p => p[0])) / n, my = sum(pts.map(p => p[1])) / n, ws = sum(pts.map(([x, y]) => (x - mx) * (y - my))) / sum(pts.map(([x]) => (x - mx) ** 2)), bs = my - ws * mx;
  push('和最小平方解比較', `令梯度為 0 可直接解出最佳直線 ŷ=${round(ws)}x+${round(bs)}，MSE=${round(mseOf(ws, bs))}。目前的直線 MSE=${round(mseOf(w, b))}；梯度下降一步步逼近同一個答案。`, plot([[w, b, 'fit'], [ws, bs, 'best']]) + legend('<span class="key-fit">━ 目前直線</span><span class="key-best">┅ 最小平方解</span>'));
  return { frames: F, summary: `起點 MSE ${round(mse0)}，${iters ? `更新 ${iters} 次後 ${round(mseOf(w, b))}` : '未做梯度下降'}；最小平方解 MSE ${round(mseOf(ws, bs))}。調大 η 觀察何時開始發散。` };
});

function classify(o, evaluation) {
  const { F, push } = make();
  const threshold = clamp(o.threshold, 0, 1, .5), dataset = evaluation && o.shift === 'shift' ? [[.83, 0], [.7, 0], [.62, 1], [.58, 0], [.55, 1], [.49, 1], [.46, 1], [.3, 0], [.25, 1], [.15, 0]] : [[.91, 1], [.82, 1], [.76, 1], [.7, 0], [.63, 1], [.56, 0], [.49, 1], [.41, 0], [.21, 0], [.1, 0]];
  const counts = { TP: 0, FP: 0, FN: 0, TN: 0 }, cards = dataset.map(([score, label], i) => `${i + 1}. ${score.toFixed(2)} / ${label ? '正' : '負'}`);
  const view = k => boxes(cards, Array.from({ length: k }, (_, i) => i)) + metrics(Object.entries(counts).map(([a, b]) => [a, b]));
  push('模型分數與真實標籤', '模型已輸出每筆樣本的分數；注意分數與真實標籤不同。', view(0));
  dataset.forEach(([score, actual], i) => { const pred = score >= threshold ? 1 : 0; counts[actual ? (pred ? 'TP' : 'FN') : (pred ? 'FP' : 'TN')]++; push(`樣本 ${i + 1}`, `樣本 ${i + 1}：分數 ${score.toFixed(2)} ${pred ? '≥' : '<'} 門檻 ${threshold}，預測 ${pred ? '正' : '負'}；實際 ${actual ? '正' : '負'}。`, view(i + 1)); });
  const pr = counts.TP + counts.FP ? counts.TP / (counts.TP + counts.FP) : NaN, re = counts.TP + counts.FN ? counts.TP / (counts.TP + counts.FN) : NaN, ac = (counts.TP + counts.TN) / dataset.length;
  push('計算指標', `Precision = TP/(TP+FP) = ${round(pr)}；Recall = TP/(TP+FN) = ${round(re)}；Accuracy = (TP+TN)/10 = ${round(ac)}。`, view(dataset.length) + metrics([['Precision', round(pr)], ['Recall', round(re)], ['Accuracy', round(ac)]]));
  return { frames: F, summary: `TP ${counts.TP} / FP ${counts.FP} / FN ${counts.FN} / TN ${counts.TN}；Precision ${round(pr)}，Recall ${round(re)}，Accuracy ${round(ac)}。` };
}
def('classification', '分類門檻與混淆矩陣', [['threshold', '分類門檻 (0–1)', 'range', .5, [0, 1, .05]]], o => classify(o, false));
def('evaluation', '評估：門檻與資料漂移', [['threshold', '分類門檻', 'range', .5, [0, 1, .05]], ['shift', '資料分布', 'select', 'base', [['base', '原始測試資料'], ['shift', '漂移後樣本']]]], o => classify(o, true));

const KNN_PTS = [[1, 1, 'A'], [2, 1.3, 'A'], [1.8, 2.6, 'A'], [2.9, 1.6, 'A'], [3.8, 4, 'B'], [4.8, 4.1, 'B'], [3.5, 5, 'B'], [5, 5.2, 'B'], [1.4, 4, 'A']];
def('knn', 'kNN：讓鄰居投票', [['k', '鄰居數 k', 'range', 3, [1, 7, 1]], ['qx', '查詢 x', 'range', 3.3, [0, 6, .1]], ['qy', '查詢 y', 'range', 3.1, [0, 6, .1]]], o => {
  const { F, push } = make();
  const points = KNN_PTS, qx = clamp(o.qx, 0, 6, 3.3), qy = clamp(o.qy, 0, 6, 3.1), k = clamp(o.k, 1, 7, 3), lim = [0, 6, 0, 6];
  const rank = points.map(([x, y, label], i) => ({ i, d: Math.hypot(qx - x, qy - y), label })).sort((a, b) => a.d - b.d);
  const plot = sel => { const [x, y] = xy([qx, qy], lim); let s = axes(lim); if (sel.length) { const d = rank[sel.length - 1].d; s += `<ellipse class="radius" data-clip cx="${x}" cy="${y}" rx="${round(d * 535 / 6, 1)}" ry="${round(d * 235 / 6, 1)}"/>`; } s += scatter(points, lim, sel.map(j => rank[j].i), true) + `<path class="fit" d="M${x - 10} ${y - 10}L${x + 10} ${y + 10}M${x - 10} ${y + 10}L${x + 10} ${y - 10}"/>`; return svg(s) + legend('<span class="key-a">● A</span><span class="key-b">● B</span><span>× 查詢點 · 圓圈：目前的鄰居範圍</span>'); };
  push('訓練集與查詢點', '觀察訓練集的 A、B 點與待分類查詢點。', plot([]));
  push('計算到每一點的距離', `d = √((x−${qx})² + (y−${qy})²)；kNN 沒有訓練步驟，所有計算都發生在查詢時。依距離由近到遠排序：`, table(['名次', '點', '類別', '距離'], rank.map((r, j) => [j + 1, `(${points[r.i][0]}, ${points[r.i][1]})`, r.label, round(r.d)]), Array.from({ length: k }, (_, j) => j)));
  for (let j = 0; j < k; j++) push(`第 ${j + 1} 個最近鄰`, `第 ${j + 1} 個最近鄰：${rank[j].label}，距離 ${round(rank[j].d)}。`, plot(Array.from({ length: j + 1 }, (_, i) => i)));
  const a = rank.slice(0, k).filter(v => v.label === 'A').length, verdict = a === k - a ? '平手（需額外規則）' : a > k - a ? 'A' : 'B';
  push('多數決', `前 ${k} 個鄰居中 A 有 ${a} 票、B 有 ${k - a} 票 → 預測 ${verdict}。`, bars(['A 票數', 'B 票數'], [a, k - a], { selected: a > k - a ? 0 : a < k - a ? 1 : -1 }));
  const sweep = [1, 2, 3, 4, 5, 6, 7].map(kk => { const aa = rank.slice(0, kk).filter(v => v.label === 'A').length; return [kk, aa, kk - aa, aa === kk - aa ? '平手' : aa > kk - aa ? 'A' : 'B']; });
  push('換一個 k 會怎樣？', '同一個查詢點，k 不同可能得到不同答案：k 小對單一雜訊點敏感，k 大則邊界較平滑但可能被遠處的點拉走。偶數 k 容易平手。', table(['k', 'A 票', 'B 票', '預測'], sweep, [k - 1]));
  return { frames: F, summary: `k=${k}，投票：A ${a}、B ${k - a} → ${verdict}。` };
});

const SVM_PTS = [[1, 4, 'A'], [1.5, 3.6, 'A'], [2, 4.5, 'A'], [2.2, 3.4, 'A'], [4, 1, 'B'], [4.5, 2, 'B'], [5, 1.8, 'B'], [3.8, 1.5, 'B']];
// 硬間隔 SVM 的暴力解：掃描法向量角度，找出能分開兩類且間隔最大的直線 n·x = c。
function svmBest(pts) {
  let best = null;
  for (let deg = 0; deg < 360; deg += .5) {
    const t = deg * Math.PI / 180, n = [Math.cos(t), Math.sin(t)], pa = pts.filter(p => p[2] === 'A').map(p => n[0] * p[0] + n[1] * p[1]), pb = pts.filter(p => p[2] === 'B').map(p => n[0] * p[0] + n[1] * p[1]);
    const gap = Math.min(...pa) - Math.max(...pb);
    if (gap > 0 && (!best || gap / 2 > best.margin)) best = { n, c: (Math.min(...pa) + Math.max(...pb)) / 2, margin: gap / 2 };
  }
  return best;
}
def('svm', 'SVM：從候選線到最大間隔', [['bias', '分界線偏移 b', 'range', 0, [-5, 5, .1]], ['slope', '法向量比率 w₂', 'range', -1, [-4, 4, .1]]], o => {
  const { F, push } = make();
  const pts = SVM_PTS, b = clamp(o.bias, -5, 5, 0), wy = clamp(o.slope, -4, 4, -1), wx = 1, wn = Math.hypot(wx, wy), lim = [0, 6, 0, 6];
  const score = pts.map(p => wx * p[0] + wy * p[1] + b), margin = score.map(s => Math.abs(s) / wn), min = Math.min(...margin), nearest = margin.map((v, i) => Math.abs(v - min) < 1e-4 ? i : -1).filter(i => i >= 0);
  const sideA = Math.sign(sum(score.filter((_, i) => pts[i][2] === 'A'))) || 1, wrong = pts.filter((p, i) => Math.sign(score[i]) !== (p[2] === 'A' ? sideA : -sideA)).length;
  const plot = (sel, lines) => svg(axes(lim) + lines + scatter(pts, lim, sel, true));
  const mine = lineABC(wx, wy, b, lim);
  push('兩類資料點', '兩個類別的資料點。先自己畫一條候選分界線，再讓演算法找最大間隔的那一條。', plot([], ''));
  push('候選分界線', `候選分界線 w·x+b=0，w=(1, ${wy})、b=${b}；目前最近點距離 ${round(min)}。`, plot([], mine) + legend('<span class="key-fit">━ 你的候選線</span>'));
  push('計算每點的分數 w·x+b', `分數的正負號決定點落在線的哪一側。A 類大多在${sideA > 0 ? '正' : '負'}側；有 ${wrong} 個點落在錯誤的一側。`, table(['點', '類別', 'w·x+b', '側'], pts.map((p, i) => [`(${p[0]}, ${p[1]})`, p[2], round(score[i]), score[i] > 0 ? '＋' : score[i] < 0 ? '－' : '線上']), pts.map((p, i) => Math.sign(score[i]) !== (p[2] === 'A' ? sideA : -sideA) ? i : -1).filter(i => i >= 0)));
  push('換算成幾何距離', `距離 = |w·x+b| / ‖w‖，‖w‖ = ${round(wn)}。分數必須除以 ‖w‖，否則把 w 放大兩倍就能「假裝」間隔變大。`, bars(pts.map(p => `${p[2]} (${p[0]}, ${p[1]})`), margin, { hot: nearest }));
  push('最近的點決定間隔', '以高亮標示距離候選分界線最近的樣本。真正的 SVM 需最佳化間隔與分類限制。', plot(nearest, mine) + metrics([['最近距離（間隔）', round(min)], ['錯分點數', wrong]]));
  const best = svmBest(pts);
  if (best) {
    const bl = lineABC(best.n[0], best.n[1], -best.c, lim, 'best'), up = lineABC(best.n[0], best.n[1], -(best.c + best.margin), lim, 'guide'), dn = lineABC(best.n[0], best.n[1], -(best.c - best.margin), lim, 'guide');
    const dist = pts.map(p => Math.abs(best.n[0] * p[0] + best.n[1] * p[1] - best.c)), sv = dist.map((d, i) => Math.abs(d - best.margin) < 1e-3 ? i : -1).filter(i => i >= 0);
    push('搜尋最大間隔的分界線', `在所有能完全分開兩類的直線中，找「最近點距離」最大的一條：間隔 ${round(best.margin)}，你的候選線是 ${round(min)}${wrong ? '（且有錯分）' : ''}。這就是硬間隔 SVM 的最佳化目標。`, plot([], mine + bl + up + dn) + legend('<span class="key-fit">━ 你的候選線</span><span class="key-best">┅ 最大間隔線</span><span>虛線：間隔邊界</span>'));
    push('支援向量', `剛好落在間隔邊界上的 ${sv.length} 個點就是支援向量：${sv.map(i => `${pts[i][2]}(${pts[i][0]}, ${pts[i][1]})`).join('、')}。移動其他點（不越過邊界）不會改變分界線。`, plot(sv, bl + up + dn));
    return { frames: F, summary: `候選線到最近點距離 ${round(min)}，錯分 ${wrong} 點；最大間隔 ${round(best.margin)}，由 ${sv.length} 個支援向量決定。` };
  }
  return { frames: F, summary: `候選線到最近點距離 ${round(min)}；分類正確性與間隔需一起檢查。` };
});

const TREE_VALUES = [[1, 'A'], [2, 'A'], [3, 'A'], [4, 'B'], [5, 'B'], [6, 'B'], [7, 'A'], [8, 'B']];
const gini = arr => { if (!arr.length) return 0; const p = arr.filter(x => x[1] === 'A').length / arr.length; return 1 - p * p - (1 - p) ** 2; };
const splitGain = (vals, t) => { const L = vals.filter(v => v[0] <= t), R = vals.filter(v => v[0] > t); return { L, R, after: (L.length * gini(L) + R.length * gini(R)) / vals.length, gain: gini(vals) - (L.length * gini(L) + R.length * gini(R)) / vals.length }; };
def('tree', '決策樹：用 Gini 找切分點', [['split', '切分閾值', 'range', 3.5, [0, 8, .5]]], o => {
  const { F, push } = make();
  const split = clamp(o.split, 0, 8, 3.5), values = TREE_VALUES, cnt = arr => `A ${arr.filter(x => x[1] === 'A').length}、B ${arr.filter(x => x[1] === 'B').length}`;
  const before = gini(values), { L: left, R: right, after } = splitGain(values, split);
  const cards = values.map(([x, k]) => `${x} · ${k}`), leftIdx = values.map((v, i) => v[0] <= split ? i : -1).filter(i => i >= 0);
  push('未切分的資料', '未切分時的 8 筆有標籤資料。', boxes(cards));
  push('父節點的 Gini', `Gini = 1 − p_A² − p_B²。父節點 ${cnt(values)}，Gini = 1 − 0.5² − 0.5² = ${round(before)}（兩類各半，最混雜）。`, boxes(cards) + metrics([['父節點 Gini', round(before)]]));
  push('套用你的閾值', `以 x ≤ ${round(split)} 為左分支，其他為右分支。`, boxes(cards, leftIdx) + legend(`閾值 x ≤ ${round(split)}；高亮為左側分支`));
  push('左右子節點的 Gini', `左：${left.length} 筆（${cnt(left)}），Gini ${round(gini(left))}；右：${right.length} 筆（${cnt(right)}），Gini ${round(gini(right))}。`, metrics([['左 Gini', round(gini(left))], ['右 Gini', round(gini(right))]]));
  push('加權平均與純度提升', `父節點 Gini ${round(before)} → 加權子節點 Gini ${round(after)}；純度提升 ${round(before - after)}。加權依各分支的樣本數。`, metrics([['加權子節點 Gini', round(after)], ['純度提升', round(before - after)]]));
  const cands = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5], gains = cands.map(t => splitGain(values, t).gain), bi = gains.indexOf(Math.max(...gains)), bt = cands[bi];
  push('掃描所有候選閾值', `演算法不靠猜：把相鄰兩點的中點都試一次，選純度提升最大的 x ≤ ${bt}（提升 ${round(gains[bi])}）。`, bars(cands.map(t => `x ≤ ${t}`), gains, { selected: bi }));
  const s1 = splitGain(values, bt), impure = gini(s1.L) >= gini(s1.R) ? s1.L : s1.R, side = impure === s1.L ? '左' : '右';
  const c2 = cands.filter(t => impure.some(v => v[0] <= t) && impure.some(v => v[0] > t)), g2 = c2.map(t => splitGain(impure, t).gain), b2 = c2[g2.indexOf(Math.max(...g2))];
  const s2 = splitGain(impure, b2), leaf = arr => `${cnt(arr)}${gini(arr) === 0 ? '（純）' : `（Gini ${round(gini(arr))}）`}`;
  const rules = side === '右' ? [`x ≤ ${bt} → ${leaf(s1.L)}`, `${bt} < x ≤ ${b2} → ${leaf(s2.L)}`, `x > ${b2} → ${leaf(s2.R)}`] : [`x ≤ ${b2} → ${leaf(s2.L)}`, `${b2} < x ≤ ${bt} → ${leaf(s2.R)}`, `x > ${bt} → ${leaf(s1.R)}`];
  push('再往下長一層', `${side}子節點仍不純（${cnt(impure)}），對它重複同樣的掃描，最佳切分是 x ≤ ${b2}。深度 2 的樹：`, boxes(rules, rules.map((r, i) => r.includes('（純）') ? -1 : i).filter(i => i >= 0)) + legend('高亮：仍不純的葉節點'));
  push('要不要一直切到全部純？', '最後那個葉節點只剩少數混雜的點，再切下去只是在背訓練資料（例如把 x=7 的 A 單獨切出來）。限制最大深度、最少樣本數或剪枝，就是在控制這種過擬合。', boxes(rules));
  return { frames: F, summary: `你的閾值：左 ${left.length} 筆、右 ${right.length} 筆，Gini 降低 ${round(before - after)}；最佳第一刀是 x ≤ ${bt}。` };
});

def('kmeans', 'K-means：分配與更新', [['start', '初始中心', 'select', 'far', [['far', '一左一右'], ['close', '兩個靠左']]]], o => {
  const { F, push } = make();
  const points = [[1, 1], [1.5, 1.9], [2.4, 1.2], [1.6, 2.9], [4.4, 4.1], [4.9, 5.3], [5.5, 4.7], [4, 5.1], [3.5, 4.2]], start = o.start === 'close' ? [[1, 1], [1.6, 2.9]] : [[1, 1], [5.5, 4.7]], lim = [0, 6, 0, 6];
  let centers = start.map(x => x.slice()), group = [];
  const plot = () => { let s = axes(lim) + scatter(points.map((p, i) => [...p, group[i] === 1 ? 'B' : group[i] === 0 ? 'A' : undefined]), lim); centers.forEach((c, j) => { const [x, y] = xy(c, lim); s += `<circle class="center c${j}" cx="${x}" cy="${y}" r="13"/><text class="lbl" x="${x}" y="${y - 19}" text-anchor="middle">μ${j + 1}</text>`; }); return svg(s) + legend('◉ 群中心 · 切換初始中心再看收斂差異'); };
  push('初始群中心', '兩個初始群中心以 ◉ 標示；初始化會影響結果。', plot());
  for (let iter = 0; iter < 7; iter++) {
    const oldGroup = group.slice();
    group = points.map(p => Math.hypot(p[0] - centers[0][0], p[1] - centers[0][1]) <= Math.hypot(p[0] - centers[1][0], p[1] - centers[1][1]) ? 0 : 1);
    push(`第 ${iter + 1} 輪：分配`, `第 ${iter + 1} 輪分配：每點選離自己最近的群中心。`, plot());
    centers = centers.map((c, j) => { const ps = points.filter((_, i) => group[i] === j); return ps.length ? [sum(ps.map(p => p[0])) / ps.length, sum(ps.map(p => p[1])) / ps.length] : c; });
    push(`第 ${iter + 1} 輪：更新`, `第 ${iter + 1} 輪更新：將中心移至其群組的平均座標。`, plot());
    if (iter > 0 && oldGroup.every((v, i) => v === group[i])) break;
  }
  const loss = sum(points.map((p, i) => (p[0] - centers[group[i]][0]) ** 2 + (p[1] - centers[group[i]][1]) ** 2));
  return { frames: F, summary: `最後 WCSS=${round(loss)}，兩中心 ${centers.map(p => '(' + p.map(x => round(x)).join(',') + ')').join('；')}。` };
});

const PCA_PTS = [[1, 1], [2, 1.6], [2.5, 2.6], [3, 2.6], [4.2, 3.4], [4.8, 4], [5, 4.8], [5.8, 5.1]];
def('pca', 'PCA：找出變異最大的方向', [['angle', '投影角度 (0–180°)', 'range', 40, [0, 180, 5]]], o => {
  const { F, push } = make();
  const pts = PCA_PTS, n = pts.length, ang = clamp(o.angle, 0, 180, 40) * Math.PI / 180, lim = [0, 7, 0, 7];
  const mu = [sum(pts.map(p => p[0])) / n, sum(pts.map(p => p[1])) / n], C = pts.map(p => [p[0] - mu[0], p[1] - mu[1]]);
  const sxx = sum(C.map(c => c[0] * c[0])) / n, syy = sum(C.map(c => c[1] * c[1])) / n, sxy = sum(C.map(c => c[0] * c[1])) / n;
  const varAt = t => { const u = [Math.cos(t), Math.sin(t)]; return sum(C.map(c => (c[0] * u[0] + c[1] * u[1]) ** 2)) / n; };
  const u = [Math.cos(ang), Math.sin(ang)], variance = varAt(ang);
  const plot = (dirs, proj) => { let s = axes(lim) + scatter(pts, lim); const m = xy(mu, lim); dirs.forEach(([v, cls]) => { const a = xy([mu[0] - v[0] * 6, mu[1] - v[1] * 6], lim), b = xy([mu[0] + v[0] * 6, mu[1] + v[1] * 6], lim); s += `<line class="${cls}" data-clip x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; });
    if (proj) pts.forEach(p => { const d = (p[0] - mu[0]) * proj[0] + (p[1] - mu[1]) * proj[1], from = xy(p, lim), to = xy([mu[0] + proj[0] * d, mu[1] + proj[1] * d], lim); s += `<line class="guide" x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}"/><circle class="hot" cx="${to[0]}" cy="${to[1]}" r="4"/>`; });
    return svg(s + `<path class="mean" d="M${m[0] - 8} ${m[1]}H${m[0] + 8}M${m[0]} ${m[1] - 8}V${m[1] + 8}"/>`); };
  push('資料與平均中心', `先找出資料平均中心，再看點群大致延伸的方向。平均 μ = (${round(mu[0])}, ${round(mu[1])})，以 ＋ 標示。`, plot([]));
  push('中心化：減去平均', 'PCA 只看「離平均多遠」：每一點減去 μ，讓資料的中心落在原點。之後的投影與變異都以中心化後的座標計算。', table(['點', 'x − μx', 'y − μy'], pts.map((p, i) => [`(${p[0]}, ${p[1]})`, round(C[i][0]), round(C[i][1])])));
  push('協方差矩陣', `Σ = [[${round(sxx)}, ${round(sxy)}], [${round(sxy)}, ${round(syy)}]]。對角線是 x、y 各自的變異，非對角線 ${round(sxy)} ${sxy > 0 ? '> 0：x 大時 y 也傾向大（正相關）' : '≤ 0'}。`, table(['', 'x', 'y'], [['x', round(sxx), round(sxy)], ['y', round(sxy), round(syy)]]));
  push('投影到你選的方向', `沿著 ${round(ang * 180 / Math.PI)}° 方向將資料正交投影到直線。`, plot([[u, 'fit dash']], u));
  push('計算投影變異', `此方向投影變異 = ${round(variance)}（= uᵀΣu）。調整角度，找出最大變異方向。`, plot([[u, 'fit dash']], u) + metrics([['投影變異', round(variance)]]));
  const sweep = Array.from({ length: 19 }, (_, i) => i * 10), vs = sweep.map(d => varAt(d * Math.PI / 180)), bi = vs.indexOf(Math.max(...vs));
  push('掃描所有方向', `每隔 10° 算一次投影變異：約在 ${sweep[bi]}° 附近最大（${round(vs[bi])}）。PCA 就是在找這條曲線的最高點。`, bars(sweep.map(d => `${d}°`), vs, { selected: bi }));
  const tr = sxx + syy, det = sxx * syy - sxy * sxy, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det), pa = Math.atan2(l1 - sxx, sxy), pc1 = [Math.cos(pa), Math.sin(pa)], pc2 = [-pc1[1], pc1[0]];
  push('特徵分解：直接求主成分', `不必掃描：Σ 的特徵值 λ₁=${round(l1)}、λ₂=${round(l2)}。λ₁ 的特徵向量（${round(((pa * 180 / Math.PI) + 180) % 180, 1)}°）就是第一主成分；第二主成分與它正交。`, plot([[pc1, 'best'], [pc2, 'guide']], pc1) + legend('<span class="key-best">┅ PC1</span><span>細虛線：PC2（正交）</span>'));
  push('保留多少資訊？', `只保留 PC1 時，保留的變異比例 = λ₁/(λ₁+λ₂) = ${pct(l1 / (l1 + l2), 1)}。你選的方向保留 ${pct(variance / (l1 + l2), 1)}。`, bars(['PC1 保留率', '你的方向'], [l1 / (l1 + l2), variance / (l1 + l2)], { percent: true }));
  return { frames: F, summary: `選定方向投影變異 ${round(variance)}；第一主成分約 ${round(((pa * 180 / Math.PI) + 180) % 180, 1)}°，變異 ${round(l1)}，保留 ${pct(l1 / (l1 + l2), 1)}。` };
});

def('qlearn', 'Q-learning：TD 更新', [['alpha', '學習率 α', 'range', .5, [0, 1, .05]], ['gamma', '未來折扣 γ', 'range', .9, [0, 1, .05]], ['episodes', '更新次數', 'range', 9, [1, 24, 1]]], o => {
  const { F, push } = make();
  const alpha = clamp(o.alpha, 0, 1, .5), gamma = clamp(o.gamma, 0, 1, .9), n = clamp(o.episodes, 1, 24, 9), q = [0, 0, 0, 0];
  const view = active => boxes(q.map((x, i) => i === 3 ? '終點 ★' : `狀態 ${i}　Q=${round(x)}`), [active]) + legend('只示範向右前進的 Q 值更新，不包含 epsilon-greedy 探索');
  push('四格小迷宮', '四格單向小迷宮：位置 0、1、2、3（位置 3 是終點獎勵 1）。', view(0));
  for (let iter = 0; iter < n; iter++) { const pos = 2 - (iter % 3), reward = pos === 2 ? 1 : 0, next = pos + 1, target = reward + gamma * (next === 3 ? 0 : q[next]), old = q[pos]; q[pos] = old + alpha * (target - old); push(`第 ${iter + 1} 次更新`, `第 ${iter + 1} 次：從位置 ${pos} 前進至 ${next}，r=${reward}；Q[${pos}] ${round(old)} → ${round(q[pos])}。`, view(pos)); }
  return { frames: F, summary: `Q = [${q.map(v => round(v)).join(', ')}]；簡化為單一「前進」動作的 TD 更新示意，並非完整探索訓練。` };
});

const ACT = { relu: [z => Math.max(0, z), (z, y) => z > 0 ? 1 : 0], sigmoid: [z => 1 / (1 + Math.exp(-z)), (z, y) => y * (1 - y)], tanh: [z => Math.tanh(z), (z, y) => 1 - y * y] };
def('neuron', '一個人工神經元', [['x', '輸入 x', 'range', 2, [-8, 8, .5]], ['w', '權重 w', 'range', -.8, [-6, 6, .1]], ['b', '偏置 b', 'range', .5, [-6, 6, .1]], ['fn', '啟動函數', 'select', 'relu', [['relu', 'ReLU'], ['sigmoid', 'Sigmoid'], ['tanh', 'Tanh']]]], o => {
  const { F, push } = make();
  const x = clamp(o.x, -8, 8, 2), w = clamp(o.w, -6, 6, -.8), b = clamp(o.b, -6, 6, .5), fn = ACT[o.fn] ? o.fn : 'relu', [f, df] = ACT[fn], wx = x * w, z = wx + b, y = f(z), g = df(z, y);
  const labels = ['輸入 x', '乘上 w', '加上 b', `${fn}(z)`, '輸出 y'];
  const ylim = fn === 'relu' ? [-1, 7] : [-1.2, 1.2];
  push('輸入與參數', `輸入 x=${x}，權重 w=${w}，偏置 b=${b}。`, flow(labels, 0));
  push('乘上權重', `w·x = ${w}×${x} = ${round(wx)}。權重決定輸入的影響方向與大小；w 為負時，x 越大這一項越小。`, flow(labels, 1) + metrics([['w·x', round(wx)]]));
  push('加上偏置', `線性部分 z = ${x}×${w}+${b} = ${round(z)}。`, flow(labels, 2) + metrics([['z', round(z)]]));
  push('套用啟動函數', `啟動函數輸出 ${fn}(${round(z)}) = ${round(y)}。紅點標出 z 在函數曲線上的位置。`, curvePlot(f, [-6, 6, ...ylim], [Math.max(-6, Math.min(6, z)), y]) + legend(`${fn}(z)，z ∈ [−6, 6]`));
  push('局部斜率：反向傳播會用到', `${fn}′(z) = ${round(g)}。反向傳播時誤差會乘上這個斜率；${fn === 'relu' && z <= 0 ? 'ReLU 在 z ≤ 0 時斜率為 0，這個樣本完全不會更新 w（「死亡 ReLU」）。' : fn !== 'relu' && g < .1 ? '斜率很小：函數已飽和，梯度幾乎傳不回去（梯度消失）。' : '斜率不為 0，梯度可以順利往回傳。'}`, flow(labels, 4) + metrics([[`${fn}′(z)`, round(g)], ['∂y/∂w = f′(z)·x', round(g * x)]]));
  push('掃描所有輸入 x', `固定 w、b，把 x 從 −8 掃到 8：神經元就是一條 y = ${fn}(${w}x + ${b}) 的曲線。${w ? `z=0 的轉折點在 x = −b/w = ${round(-b / w)}。` : 'w=0 時輸出與 x 無關。'}`, curvePlot(t => f(w * t + b), [-8, 8, ...ylim], [x, y]) + legend('紅點：目前的 x'));
  return { frames: F, summary: `z=${round(z)} → activation=${round(y)}。改用不同啟動函數比較負數、正數如何轉換。` };
});

def('backprop', '反向傳播：鏈式法則', [['x', '輸入 x', 'range', 2, [-8, 8, .5]], ['y', '目標 y', 'range', 7, [-12, 12, .5]], ['w', '權重 w', 'range', 1, [-8, 8, .1]], ['lr', '學習率', 'range', .1, [0, 1, .01]]], o => {
  const { F, push } = make();
  const x = clamp(o.x, -8, 8, 2), y = clamp(o.y, -12, 12, 7), w = clamp(o.w, -8, 8, 1), lr = clamp(o.lr, 0, 1, .1), u = w * x, L = (u - y) ** 2, grad = 2 * (u - y) * x, next = w - lr * grad, labels = ['x', 'u = w×x', 'L = (u−y)²', '∂L/∂u', '∂L/∂w', '更新 w'];
  push('前向：計算 u', `前向：u=w×x = ${round(u)}。`, flow(labels, 1));
  push('前向：計算損失', `損失：L=(${round(u)}−${y})² = ${round(L)}。`, flow(labels, 2));
  push('反向：∂L/∂u', `反向第一段：∂L/∂u = 2(u−y) = ${round(2 * (u - y))}。`, flow(labels, 3));
  push('鏈式法則：∂L/∂w', `鏈式法則：∂L/∂w = 2(u−y)×x = ${round(grad)}。`, flow(labels, 4));
  push('更新權重', `更新權重 w′ = ${round(w)} − ${round(lr)}×${round(grad)} = ${round(next)}。`, flow(labels, 5));
  push('用新權重再前向一次', `新的 u = ${round(next)}×${x} = ${round(next * x)}，Loss ${round(L)} → ${round((next * x - y) ** 2)}。`, metrics([['原 Loss', round(L)], ['新 Loss', round((next * x - y) ** 2)]]));
  return { frames: F, summary: `原始 Loss=${round(L)}，更新後 Loss=${round((next * x - y) ** 2)}（一步未必降低，視學習率而定）。` };
});

def('regularization', 'L2 正則化：權重收縮', [['lambda', 'L2 強度 λ', 'range', .2, [0, 4, .1]], ['steps', '更新次數', 'range', 8, [1, 15, 1]]], o => {
  const { F, push } = make();
  const lam = clamp(o.lambda, 0, 4, .2), n = clamp(o.steps, 1, 15, 8); let ws = [3, -2, 1];
  push('初始權重', '以三個權重展示只套用 L2 懲罰時的收縮效果（非完整模型訓練）。', bars(['|w1|', '|w2|', '|w3|'], ws.map(Math.abs)));
  for (let i = 1; i <= n; i++) { ws = ws.map(w => w - .1 * 2 * lam * w); push(`第 ${i} 步`, `第 ${i} 步 L2 梯度 2λw，權重向 0 收縮：w ← w − 0.1×2×${lam}×w。`, bars(['|w1|', '|w2|', '|w3|'], ws.map(Math.abs))); }
  return { frames: F, summary: `權重 ${ws.map(w => round(w)).join(', ')}。當 λ 過強，模型易欠擬合。` };
});

def('cnn', '1D 卷積：滑動的濾波器', [['kernel', '濾波器', 'select', 'edge', [['edge', '邊緣 [1,−1]'], ['smooth', '平滑 [0.5,0.5]']]], ['stride', 'Stride', 'select', '1', [['1', '1'], ['2', '2']]]], o => {
  const { F, push } = make();
  const signal = [1, 1, 2, 6, 7, 6, 2, 1, 0, 0], kernel = o.kernel === 'smooth' ? [.5, .5] : [1, -1], stride = o.stride === '2' ? 2 : 1, res = [];
  const view = at => boxes(signal.map(String), at >= 0 ? [at, at + 1] : []) + legend(`kernel=[${kernel.join(', ')}] → output: [${res.map(x => round(x)).join(', ')}]`);
  push('輸入與濾波器', `輸入序列 [${signal.join(',')}]; kernel=[${kernel.join(',')}]。`, view(-1));
  for (let i = 0; i + kernel.length <= signal.length; i += stride) { const v = kernel.reduce((s, w, j) => s + w * signal[i + j], 0); res.push(v); push(`位置 ${i}`, `位置 ${i}：${kernel.map((w, j) => `${w}×${signal[i + j]}`).join(' + ')} = ${round(v)}。`, view(i)); }
  return { frames: F, summary: `輸出 [${res.map(x => round(x)).join(', ')}]，輸出長度 ${res.length}；這裡演示 1D cross-correlation。` };
});

def('rnn', 'RNN：隱藏狀態的傳遞', [['memory', '循環權重（保留程度）', 'range', .6, [-1.8, 1.8, .1]], ['input', '輸入權重', 'range', .8, [-3, 3, .1]]], o => {
  const { F, push } = make();
  const wh = clamp(o.memory, -1.8, 1.8, .6), wx = clamp(o.input, -3, 3, .8), inputs = [1, .5, -.5, .8, 0, -1, 1]; let hh = 0; const states = [hh];
  const view = active => boxes(inputs.map((v, i) => `x${i + 1}=${v}`), active >= 0 ? [active] : []) + legend(`h: ${states.map(v => round(v)).join(' → ')}`);
  push('初始狀態', '初始隱藏狀態 h₀=0。', view(-1));
  inputs.forEach((x, i) => { hh = Math.tanh(wx * x + wh * hh); states.push(hh); push(`t=${i + 1}`, `t=${i + 1}：tanh(${round(wx)}×${x} + ${round(wh)}×hₜ₋₁) = ${round(hh)}。`, view(i)); });
  return { frames: F, summary: `末狀態 h=${round(hh)}；循環權重影響先前輸入對後續輸出的影響。` };
});

def('attention', 'Attention：從分數到加權輸出', [['query', 'Query 選擇', 'select', 'it', [['it', '它：指向前文'], ['book', '書：強調自己']]], ['temp', 'Softmax 溫度', 'range', 1, [.05, 4, .05]], ['mask', 'Causal mask', 'select', 'on', [['on', '開啟'], ['off', '關閉']]]], o => {
  const { F, push } = make();
  const scores = o.query === 'book' ? [2.4, .3, 1.3, .2] : [.4, 2.1, .7, 1.2], tokens = ['小明', '一本書', '放到', '桌上'], t = clamp(o.temp, .05, 4, 1), masked = o.mask !== 'off', values = [3, 8, 5, 1];
  const s2 = scores.map((x, i) => masked && i > 2 ? -Infinity : x), scaled = s2.map(x => x / t), m = Math.max(...scaled.filter(Number.isFinite)), exp = scaled.map(x => Number.isFinite(x) ? Math.exp(x - m) : 0), Z = sum(exp), weights = exp.map(x => x / Z), contrib = weights.map((w, i) => w * values[i]), out = sum(contrib);
  push('Query 與每個 Key 的分數', `Query ${o.query === 'book' ? '「書」' : '「它」'} 先與每個 Key 做內積，形成注意力分數（示意分數，已除以 √dₖ）。`, bars(tokens, scores));
  push('套用 causal mask', masked ? '啟用 causal mask：最後一個未來位置不得被關注。' : '不啟用 mask：所有位置均可參與計算。', bars(tokens, s2));
  push('除以溫度 T', `每個分數除以 T=${round(t)}：T 小會拉大分數差距（更集中），T 大會壓扁差距（更平均）。`, bars(tokens, scaled));
  push('指數化', `exp(sᵢ − max)：先減去最大值 ${round(m)} 避免溢位；被 mask 的位置是 −∞，指數化後正好是 0。`, bars(tokens, exp));
  push('正規化成權重', `softmax(score / T)，T=${round(t)}；注意力權重加總為 1。每個 exp 值除以總和 ${round(Z)}。`, bars(tokens, weights, { percent: true }));
  push('權重乘上 Value', `每個位置的 Value（${values.map((v, i) => `${tokens[i]}=${v}`).join('、')}）乘上自己的權重，看誰貢獻最多。`, bars(tokens, contrib, { selected: contrib.indexOf(Math.max(...contrib)) }));
  push('加總得到輸出', `使用權重對 Value [${values.join(',')}] 加權求和，輸出 ${round(out)}。`, bars(tokens, weights, { percent: true }) + metrics([['輸出 Σwᵢvᵢ', round(out)]]));
  return { frames: F, summary: `輸出 ${round(out)}；此為人工設定 QK 分數與 scalar V 的縮小版示意。` };
});

// 示意用的固定 embedding：由 token ID 決定的偽亂數，不是任何模型的真實參數。
const embed = (id, d = 4) => Array.from({ length: d }, (_, j) => { const s = Math.sin((id + 1) * 12.9898 + (j + 1) * 78.233) * 43758.5453; return round((s - Math.floor(s)) * 2 - 1, 2); });
const posEnc = (pos, d = 4) => Array.from({ length: d }, (_, j) => { const i = Math.floor(j / 2), a = pos / 10000 ** (2 * i / d); return round(j % 2 ? Math.cos(a) : Math.sin(a), 2); });
def('token', 'Token 化、Embedding 與位置', [['text', '輸入文本', 'text', '我愛AI模型'], ['mode', '分詞方式（教學示意）', 'select', 'char', [['char', '逐字切分'], ['long', '示意子詞切分']]]], o => {
  const { F, push } = make();
  const str = String(o.text || '我愛AI模型').slice(0, 70), chunks = o.mode === 'long' ? str.match(/AI|模型|人工智慧|中文|[一-鿿]|[A-Za-z]+|\d+|\s+|./g) || [] : Array.from(str);
  const ids = chunks.map(t => Array.from(t).reduce((s, ch) => s + ch.codePointAt(0), 0) % 997), chars = Array.from(str), bytes = chars.map(c => new TextEncoder().encode(c).length), show = chunks.slice(0, 10);
  push('原始文字', '原始文字進入 tokenizer；此處只示範兩種切分規則，不是真實 BPE 訓練結果。', boxes([str]));
  push('Unicode 字元與 UTF-8 位元組', `電腦先看到的是位元組：這段文字有 ${chars.length} 個字元、${sum(bytes)} 個 UTF-8 位元組（中文多為 3 位元組，英數 1 位元組）。Byte-level BPE 就從這裡開始合併。`, table(['字元', 'Unicode', 'UTF-8 位元組'], chars.slice(0, 12).map((c, i) => [c === ' ' ? '␠' : c, 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), bytes[i]])));
  push('切分成片段', `切分得到 ${chunks.length} 個片段。`, boxes(chunks));
  push('對應 Token ID', '為每片段對應一個示意 Token ID（不是任何商用模型的字典）。', boxes(chunks.map((t, i) => `${t} → ${ids[i]}`)));
  push('Embedding 查表', `每個 ID 到 embedding 表查出一列向量（此處 4 維、示意數值）。真實模型的表是訓練出來的，維度常是數百到數千。`, table(['Token', 'ID', 'embedding（4 維）'], show.map((t, i) => [t, ids[i], `[${embed(ids[i]).join(', ')}]`])));
  push('加上位置編碼', '自注意力本身不知道順序，所以每個位置再加上一個位置向量：PE(pos, 2i)=sin(pos/10000^(2i/d))、PE(pos, 2i+1)=cos(…)。同一個字放在不同位置，輸入向量就不同。', table(['位置', 'Token', '位置編碼', '送進模型的向量'], show.map((t, i) => { const e = embed(ids[i]), p = posEnc(i); return [i, t, `[${p.join(', ')}]`, `[${e.map((v, j) => round(v + p[j], 2)).join(', ')}]`]; })));
  return { frames: F, summary: `文字長度 ${chars.length} 個 Unicode 字元、示意 Token 數 ${chunks.length}；真實模型需使用相容 tokenizer。` };
});

def('sampling', 'LLM 抽樣：Top-k 與 Temperature', [['temperature', 'Temperature', 'range', .8, [.05, 5, .05]], ['topk', 'Top-k', 'range', 4, [1, 5, 1]], ['seed', '抽樣 seed', 'number', 42, [-100000, 100000, 1]]], o => {
  const { F, push } = make();
  const names = ['推理', '知識', '創意', '錯誤', '停止'], logits = [2.2, 1.4, .8, 0, -.4], t = clamp(o.temperature, .05, 5, .8), k = clamp(o.topk, 1, 5, 4), seed = Math.floor(clamp(o.seed, -100000, 100000, 42));
  const masked = logits.map((x, i) => i < k ? x : -Infinity), probsAt = T => { const a = softmax(logits.slice(0, k), T); return logits.map((_, i) => i < k ? a[i] : 0); }, weights = probsAt(t);
  push('模型輸出 logits', '模型輸出未正規化 logits，分數越高越偏好該 token。', bars(names, logits));
  push('Top-k 截斷', `Top-k=${k}：只保留分數最高的 ${k} 個候選。`, bars(names, masked));
  push('除以 Temperature', `保留的 logits 各除以 T=${round(t)}：${masked.map((x, i) => Number.isFinite(x) ? `${names[i]} ${round(x / t)}` : null).filter(Boolean).join('、')}。`, bars(names, masked.map(x => x / t)));
  push('softmax 成機率', `Temperature=${round(t)}：softmax 後形成機率分布。`, bars(names, weights, { percent: true }));
  const rng = ((seed * 1664525 + 1013904223) >>> 0) / 4294967296; let total = 0, choice = 0; const cum = weights.map(w => (total += w));
  for (let i = 0; i < weights.length; i++) if (rng < cum[i]) { choice = i; break; }
  push('累積機率與亂數', `把機率依序累加成 0–1 的區間，再用 seed 產生亂數 r = ${round(rng)}；r 落在哪個區間就選哪個 token。`, table(['Token', '機率', '累積區間'], names.map((n, i) => [n, pct(weights[i], 1), weights[i] ? `${round(cum[i] - weights[i])} – ${round(cum[i])}` : '（已截斷）']), [choice]));
  push('抽出 token', `以固定 seed 示意抽樣，落在「${names[choice]}」；這並非真實 LLM 生成。`, bars(names, weights, { percent: true, selected: choice }));
  const ts = [.3, t, 1.5, 3].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  push('比較不同 Temperature', '同一組 logits，T 越低分布越集中（接近 greedy），T 越高越平均、越常選到低分 token。熵越大代表越不確定。', table(['T', '最高分候選機率', '熵（bits）'], ts.map(T => { const p = probsAt(T); return [round(T, 2), pct(p[0], 1), round(-sum(p.filter(x => x > 0).map(x => x * Math.log2(x))), 2)]; }), [ts.indexOf(t)]));
  return { frames: F, summary: `抽中 ${names[choice]}，最高分候選機率 ${round(weights[0] * 100, 1)}%。Temperature=0 的極限近似 greedy，此處需 >0。` };
});

def('rag', 'RAG：檢索、排序與來源檢查', [['query', '檢索問題', 'text', '企業網銀授權'], ['method', '檢索策略', 'select', 'hybrid', [['keyword', '關鍵字'], ['dense', '語義（示意向量分數）'], ['hybrid', 'Hybrid 融合']]], ['topk', 'Top-k', 'range', 3, [1, 5, 1]]], o => {
  const { F, push } = make();
  const query = String(o.query || '企業網銀授權').slice(0, 30), docs = [['企業網銀授權作業程序', .94, '2026-07', '有效'], ['企業網銀登入 FAQ', .78, '2026-08', '有效'], ['舊版授權作業辦法', .91, '2023-01', '已失效'], ['電商付款系統規格', .35, '2026-05', '有效'], ['授權功能電文設計書', .84, '2026-06', '有效']], keywords = ['授權', '網銀', '登入', '電文', '付款'];
  const raw = docs.map(([name, dense, date, status]) => { let keyword = 0; for (const t of keywords) if (query.includes(t) && name.includes(t)) keyword += .3; return { name, date, status, keyword, dense, hybrid: .5 * dense + .5 * Math.min(1, keyword) }; });
  const mode = ['keyword', 'dense', 'hybrid'].includes(o.method) ? o.method : 'hybrid', rank = raw.map((x, i) => ({ ...x, i })).sort((a, b) => b[mode] - a[mode]), top = clamp(o.topk, 1, 5, 3);
  const view = (sel, validOnly) => `<div class="ai-rank">${raw.map((d, i) => `<div class="ai-card${sel.includes(i) ? ' active' : ''}"><span>${h(d.name)} <small>${h(d.date)} · ${h(d.status)}</small></span><b>${round(d[mode])}</b></div>`).join('')}</div>${validOnly ? legend('「有效」只是示意欄位；真實還需依權威、範圍與版本檢查') : ''}`;
  push('建立候選文件', `問題「${query}」：建立 5 個候選文件（教學預設分數）。`, view([]));
  for (let i = 0; i < top; i++) { const d = rank[i]; push(`排名 ${i + 1}`, `排名 ${i + 1}：${d.name}；相似分數 ${round(d[mode])}。`, view(rank.slice(0, i + 1).map(x => x.i))); }
  const valid = rank.slice(0, top).filter(d => d.status === '有效');
  push('檢查有效日與權威', `只依最高相似度可能選到舊版文件：需要額外檢查有效日與權威。有效來源 ${valid.length}/${top}。`, view(rank.slice(0, top).map(x => x.i), true));
  return { frames: F, summary: `選出 Top-${top}；其中 ${valid.length} 份標記有效。此為預設分數的排序展示，並未執行真正 embedding、BM25 或 LLM。` };
});

def('agent', 'Agent：步數與核准邊界', [['approval', '寫入前核准', 'select', 'yes', [['yes', '需要人工核准'], ['no', '跳過核准（示意危險）']]], ['budget', '最大步數', 'range', 5, [1, 9, 1]]], o => {
  const { F, push } = make();
  const approval = o.approval !== 'no', budget = clamp(o.budget, 1, 9, 5), plan = ['接收需求', '查詢知識庫', '整理候選證據', '提出寫入 PRD', '核准與提交', '核對結果']; let stopped = false;
  for (let i = 0; i < plan.length; i++) {
    if (i >= budget) { push('超過最大步數', '超過最大步數，停止執行；應回傳進度與原因。', flow(plan, Math.min(i, plan.length - 1), true)); stopped = true; break; }
    if (i === 4 && approval) { push('等待人工核准', '寫入高影響文件前，Agent 必須等待人工核准；模擬停止在待核准狀態。', flow(plan, i, true)); stopped = true; break; }
    push(plan[i], `${i + 1}. ${plan[i]}${i === 4 && !approval ? '：警告，略過人工核准只適合低風險範例' : ''}。`, flow(plan, i));
  }
  return { frames: F, summary: stopped ? '流程依權限或步數限制安全停止。' : '流程完成（僅模擬流程狀態，沒有實際工具或外部資料變更）。' };
});

def('diffusion', 'Diffusion：加噪與去噪', [['noise', '雜訊強度', 'range', .8, [0, 2, .1]], ['steps', '去噪步數', 'range', 6, [1, 16, 1]]], o => {
  const { F, push } = make();
  const strength = clamp(o.noise, 0, 2, .8), steps = clamp(o.steps, 1, 16, 6), base = [0, 1, 3, 5, 3, 1, 0], eps = [1, -1, .8, -.6, 1, -.8, .7];
  const sig = v => { const max = Math.max(1, ...v.map(Math.abs)); return `<div class="ai-signal">${v.map((x, i) => `<div><span>${round(x, 1)}</span><i class="${x < 0 ? 'neg' : ''}" style="height:${Math.max(3, Math.abs(x) / max * 122)}px"></i><small>${i}</small></div>`).join('')}</div>${legend('固定數值訊號，方便觀察每步雜訊變化')}`; };
  push('原始訊號 x₀', '原始 1D 訊號 x₀（用柱狀圖代替影像像素）。', sig(base));
  push('加入雜訊', `以強度 ${round(strength)} 加入固定雜訊序列，得到帶噪訊號 xₜ。`, sig(base.map((v, i) => v + strength * eps[i] * 2)));
  for (let j = 1; j <= steps; j++) { const ratio = (steps - j) / steps; push(`去噪 ${j}/${steps}`, `第 ${j}/${steps} 次：縮減雜訊殘留（理想化已知噪聲的教學示意）。`, sig(base.map((v, i) => v + strength * eps[i] * 2 * ratio))); }
  return { frames: F, summary: '最終回到示意 x₀；這是數值加噪／去噪，非訓練過的 diffusion 神經網路。' };
});

/* ───────────── 註冊 ───────────── */
// frameLab 的 number / range 預設取整數；AI 的參數多為小數（學習率、門檻），依 step 的小數位數保留精度。
const decimals = step => (String(step).split('.')[1] || '').length;
function framesFor(type, v) {
  let r;
  try { r = LABS[type].frames(v); } catch (e) { console.error(e); return [{ label: '無法計算', desc: '請檢查輸入的數值或參數。', visual: '' }]; }
  const f = r.frames.length ? r.frames : [{ label: '沒有步驟', desc: '無法產生模擬資料。', visual: '' }];
  if (r.summary) f[f.length - 1] = { ...f[f.length - 1], sub: `結論：${r.summary}` };
  return f;
}
Object.entries(LABS).forEach(([type, spec]) => {
  CSLab.frameLab(type, { title: spec.name, inputs: spec.inputs, frames: v => framesFor(type, v) });
  const lab = CSLab.registry[type], base = lab.set;
  lab.set = (s, key, value, ...rest) => {
    const inp = spec.inputs.find(i => i[0] === key);
    if (inp && (inp[2] === 'range' || inp[2] === 'number') && !Number.isInteger(inp[4][2] ?? 1)) {
      const [lo, hi, step] = inp[4], n = Number(value);
      s.v[key] = Number.isFinite(n) && String(value).trim() !== '' ? Number(Math.min(hi, Math.max(lo, n)).toFixed(decimals(step))) : inp[3];
      s.k = 0; return;
    }
    return base(s, key, value, ...rest);
  };
});
CSLab.sim.ai = { labs: LABS, frames: framesFor, svmBest, gini, mseOf, softmax };
})();
