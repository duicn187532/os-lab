/* NET LAB 互動實驗：全部透過 CSLab.frameLab 註冊（輸入 → 一串步驟畫面），自動獲得上一步、自動播放與步驟列表。
 * 視覺元件的 class 以 nx- 開頭（assets/net-labs.css）。時序圖（ladder）、拓樸圖與折線圖都是行內 SVG，顏色用設計變數。
 * 計算邏輯是純函式，放在 CSLab.sim.net 供測試使用；程式實作題（assets/code.js）的參考解用同樣的規則。 */
'use strict';
(function () {
const { h } = CSLab.ui;

/* ───────────── 視覺小工具 ───────────── */
const cell = (v, sub = '', st = '') => `<div class="nx-cell ${st}">${h(v)}${sub !== '' ? `<small>${h(sub)}</small>` : ''}</div>`;
const row = (items, cls = '') => `<div class="nx-row ${cls}">${items.join('')}</div>`;
const table = (head, rows, hi = -1) => `<div class="nx-scroll"><table class="nx-table"><thead><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr${i === hi || (Array.isArray(hi) && hi.includes(i)) ? ' class="on"' : ''}>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const kv = pairs => `<div class="nx-kv">${pairs.map(([k, v, st]) => `<div class="${st || ''}"><span>${h(k)}</span><b>${v}</b></div>`).join('')}</div>`;
const code = (lines, hi = -1, title = '') => `<pre class="nx-code">${title ? `<em>${h(title)}</em>` : ''}${lines.map((l, i) => `<span class="${i === hi || (Array.isArray(hi) && hi.includes(i)) ? 'on' : ''}">${h(l) || ' '}</span>`).join('')}</pre>`;
const pipe = (items, at, bad = -1) => `<div class="nx-pipe">${items.map((x, i) => `<span class="${i === bad ? 'bad' : i === at ? 'on' : i < at ? 'done' : ''}">${h(x)}</span>`).join('<i>→</i>')}</div>`;
const stage = (...parts) => `<div class="nx-stage">${parts.filter(Boolean).join('')}</div>`;
const cap = t => `<p class="nx-cap">${h(t)}</p>`;
const F = (label, desc, visual, sub) => ({ label, desc, visual, sub });
const bars = items => `<div class="nx-bars">${items.map(([name, v, max, text, st]) => `<div class="${st || ''}"><span>${h(name)}</span><i style="width:${max > 0 ? Math.max(1.5, v / max * 100) : 0}%"></i><b>${h(text)}</b></div>`).join('')}</div>`;
const fmtMs = s => s >= 1 ? `${+(s).toFixed(3)} s` : s >= 1e-3 ? `${+(s * 1e3).toFixed(3)} ms` : `${+(s * 1e6).toFixed(3)} μs`;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* 時序圖：cols 是參與者名稱；msgs 依時間順序，{ a, b, label, st: 'on'|'bad'|'lost'|'faint', w: 列高倍數 }。
 * notes：{ col, row, text } 寫在某條時間軸旁（例如狀態名稱）。 */
function ladder(cols, msgs, notes = []) {
  const n = cols.length, W = Math.max(440, n * 140), padX = 62, top = 34, rowH = 30;
  const xs = cols.map((_, i) => n === 1 ? W / 2 : padX + i * (W - 2 * padX) / (n - 1));
  let y = top + 10; const rows = msgs.map(m => { const r = y; y += rowH * (m.w || 1); return r; });
  const H = Math.max(y + 14, top + 60);
  const parts = cols.map((c, i) => `<text x="${xs[i]}" y="18" class="sv-col">${h(c)}</text><line x1="${xs[i]}" y1="${top}" x2="${xs[i]}" y2="${H - 6}" class="sv-axis"/>`);
  msgs.forEach((m, i) => {
    const x1 = xs[m.a], x2 = xs[m.b], y1 = rows[i], drop = rowH * (m.w || 1) * 0.72, y2 = y1 + drop;
    const lost = m.st === 'lost', ex = lost ? x1 + (x2 - x1) * 0.6 : x2, ey = lost ? y1 + drop * 0.6 : y2;
    const cls = `sv-msg ${m.st || ''}`;
    if (m.a === m.b) { parts.push(`<text x="${x1 + 8}" y="${y1 + 12}" class="sv-self ${m.st || ''}">${h(m.label)}</text>`); return; }
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" class="${cls}"/>`);
    if (lost) parts.push(`<text x="${ex}" y="${ey + 5}" class="sv-x">✕</text>`);
    else { const ang = Math.atan2(ey - y1, ex - x1), a1 = ang + 2.7, a2 = ang - 2.7; parts.push(`<polygon points="${ex},${ey} ${ex + 9 * Math.cos(a1)},${ey + 9 * Math.sin(a1)} ${ex + 9 * Math.cos(a2)},${ey + 9 * Math.sin(a2)}" class="sv-head ${m.st || ''}"/>`); }
    const tx = (x1 + ex) / 2, ty = (y1 + ey) / 2 - 5;
    parts.push(`<text x="${tx}" y="${ty}" class="sv-lbl ${m.st || ''}">${h(m.label)}</text>`);
  });
  notes.forEach(nt => { const yy = nt.row < rows.length ? rows[nt.row] : y; const left = nt.col === 0; parts.push(`<text x="${xs[nt.col] + (left ? -6 : 6)}" y="${yy + 4}" class="sv-note" text-anchor="${left ? 'end' : 'start'}">${h(nt.text)}</text>`); });
  return `<div class="nx-scroll nx-ladder-wrap" style="width:min(100%,${W}px)"><svg class="nx-ladder" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W, 420)}px" role="img" aria-label="時序圖：${h(cols.join('、'))}">${parts.join('')}</svg></div>`;
}
const L = (a, b, label, st) => ({ a, b, label, st });

/* 拓樸圖：nodes { id: [x, y] }，edges [a, b, w]；st 標記節點 / 邊的狀態 */
function graph(nodes, edges, { nodeSt = {}, edgeSt = {}, labels = {} } = {}) {
  const key = (a, b) => [a, b].sort().join('-');
  const es = edges.map(([a, b, w]) => { const [x1, y1] = nodes[a], [x2, y2] = nodes[b], st = edgeSt[key(a, b)] || ''; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="sv-edge ${st}"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 4}" class="sv-w ${st}">${w}</text>`; });
  const ns = Object.entries(nodes).map(([id, [x, y]]) => `<circle cx="${x}" cy="${y}" r="17" class="sv-node ${nodeSt[id] || ''}"/><text x="${x}" y="${y + 5}" class="sv-nid ${nodeSt[id] || ''}">${h(id)}</text>${labels[id] !== undefined ? `<text x="${x}" y="${y + 33}" class="sv-nlab">${h(labels[id])}</text>` : ''}`);
  return `<div class="nx-scroll nx-svg-wrap" style="width:min(100%,520px)"><svg class="nx-graph" viewBox="0 0 420 250" role="img" aria-label="網路拓樸圖">${es.join('')}${ns.join('')}</svg></div>`;
}

/* 折線（階梯）圖：series 為數值陣列，line 為水平參考線 */
function chart(values, { max, line, lineLabel = '', marks = [] } = {}) {
  const W = 460, H = 200, pl = 34, pr = 10, pt = 12, pb = 26, n = Math.max(values.length, 8);
  const M = Math.max(max || 0, ...values, line || 0, 4), X = i => pl + i * (W - pl - pr) / n, Y = v => H - pb - v / M * (H - pt - pb);
  const out = [];
  for (let t = 0; t <= 4; t++) { const v = Math.round(M * t / 4); out.push(`<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" class="sv-grid"/><text x="${pl - 5}" y="${Y(v) + 4}" class="sv-ytick">${v}</text>`); }
  if (line !== undefined) out.push(`<line x1="${pl}" x2="${W - pr}" y1="${Y(line)}" y2="${Y(line)}" class="sv-ref"/><text x="${W - pr}" y="${Y(line) - 4}" class="sv-rlab">${h(lineLabel)}</text>`);
  values.forEach((v, i) => { const st = marks[i] || ''; out.push(`<rect x="${X(i) + 2}" y="${Y(v)}" width="${Math.max(3, (W - pl - pr) / n - 4)}" height="${H - pb - Y(v)}" class="sv-bar ${st}"/>`); if (n <= 24) out.push(`<text x="${X(i) + (W - pl - pr) / n / 2}" y="${H - pb + 14}" class="sv-tick">${i + 1}</text>`); });
  return `<div class="nx-scroll nx-svg-wrap" style="width:min(100%,560px)"><svg class="nx-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="長條圖">${out.join('')}</svg></div>`;
}

/* ───────────── 0 封包交換：儲存轉送管線 ───────────── */
function switchSchedule(P, N, whole) {
  // 回傳 grid[link][t] = 封包編號（1 起算）或 'M'（整份訊息）；每個封包在每段鏈路花 1 個時間單位
  const T = whole ? N * P : N + P - 1, grid = Array.from({ length: N }, () => Array(T).fill(''));
  for (let i = 0; i < N; i++) for (let t = 0; t < T; t++) {
    if (whole) { if (t >= i * P && t < (i + 1) * P) grid[i][t] = 'M'; }
    else { const j = t - i + 1; if (j >= 1 && j <= P) grid[i][t] = j; }
  }
  return { T, grid };
}
function switchingFrames(v) {
  const P = v.P, N = v.N, whole = v.mode === 'message', { T, grid } = switchSchedule(P, N, whole), out = [];
  const view = upto => table(['', ...Array.from({ length: T }, (_, t) => `t${t + 1}`)], grid.map((r, i) => [`鏈路 ${i + 1}`, ...r.map((x, t) => t <= upto && x !== '' ? `<b class="nx-tag ${whole ? 'm' : 'p' + (x % 4)}">${whole ? '訊' : 'P' + x}</b>` : '')]), -1);
  out.push(F(whole ? `整份訊息當成 1 個大封包（${P} 個時間單位長）` : `把訊息切成 ${P} 個封包`, `路徑有 ${N} 段鏈路（${N - 1} 台路由器）。每個小封包在一段鏈路上要花 1 個時間單位，${whole ? `整份訊息是 ${P} 倍大，每段要 ${P} 個時間單位` : '整份訊息就是 ' + P + ' 個時間單位'}。路由器採用儲存轉送：收齊一個封包才往下送。`, stage(view(-1), kv([['封包數 P', whole ? 1 : P], ['鏈路數 N', N], ['每段的傳輸時間', whole ? `${P} 單位` : '1 單位']]))));
  for (let t = 0; t < T; t++) {
    const busy = grid.map((r, i) => r[t] !== '' ? `鏈路 ${i + 1} 送${whole ? '訊息' : ' P' + r[t]}` : '').filter(Boolean);
    const arrived = whole ? (t === T - 1 ? 1 : 0) : grid[N - 1].slice(0, t + 1).filter(x => x !== '').length;
    if (whole && t % P !== P - 1 && t !== 0) continue;
    out.push(F(`時間 ${t + 1}`, `${busy.join('、')}。${!whole && busy.length > 1 ? '不同鏈路同時在送不同的封包，這就是管線化。' : ''}${whole && t % P === P - 1 && t < T - 1 ? '這段鏈路剛把整份訊息送完，下一台路由器現在才能開始轉送。' : ''}目的地已收到 ${arrived} / ${whole ? 1 : P}。`, stage(view(t))));
  }
  const pk = N + P - 1, wh = N * P;
  out.push(F(`共 ${T} 個時間單位`, whole ? `整份當成一個封包：每段都要等整份訊息收齊，N × P = ${N} × ${P} = ${wh}。切成 ${P} 個封包只需要 N + P − 1 = ${pk}。` : `第一個封包要 ${N} 個單位才抵達，之後每個單位再抵達一個：N + P − 1 = ${N} + ${P} − 1 = ${pk}。若不切割要 N × P = ${wh}。`, stage(view(T), kv([['切成封包', `${pk} 單位`, whole ? '' : 'ok'], ['整份訊息', `${wh} 單位`, whole ? 'bad' : ''], ['節省', `${wh - pk} 單位`]])), '真實網路還要加上每個封包的標頭負擔、傳播延遲與排隊延遲。'));
  return out;
}

/* ───────────── 1 延遲與排隊 ───────────── */
function nodalDelay(Lbytes, R, dist, queued, proc = 2e-5) {
  const trans = Lbytes * 8 / R, prop = dist / 2e8;
  return { proc, queue: queued * trans, trans, prop, total: proc + queued * trans + trans + prop };
}
function queueSim(rho, ticks = 24, cap = 6, seed = 7) {
  const r = rng(seed), hist = [], drops = []; let q = 0, dropped = 0;
  for (let t = 0; t < ticks; t++) {
    let arr = 0; for (let k = 0; k < 3; k++) if (r() < rho / 3) arr++;
    if (q > 0) q--;                      // 每個時間單位送出 1 個封包
    let d = 0; for (let k = 0; k < arr; k++) { if (q < cap) q++; else d++; }
    dropped += d; hist.push(q); drops.push(d);
  }
  return { hist, drops, dropped };
}
function delayFrames(v) {
  if (v.mode === 'queue') {
    const rho = +v.rho, { hist, drops, dropped } = queueSim(rho), out = [];
    out.push(F(`流量強度 La/R = ${rho}`, `每個時間單位輸出鏈路送出 1 個封包；平均每個時間單位抵達 ${rho} 個封包，但抵達是隨機、成群的。佇列最多放 6 個封包，滿了就丟棄。`, stage(kv([['La/R', rho, rho >= 1 ? 'bad' : ''], ['佇列容量', 6]]))));
    for (let t = 6; t <= 24; t += 6) {
      const seg = hist.slice(0, t), d = drops.slice(0, t).reduce((a, b) => a + b, 0);
      out.push(F(`前 ${t} 個時間單位`, `佇列長度 ${seg.join(', ')}。${d ? `已經丟棄 ${d} 個封包。` : '還沒有掉包。'}`, stage(chart(seg, { max: 6, line: 6, lineLabel: '容量 6', marks: drops.slice(0, t).map(x => x ? 'bad' : '') }))));
    }
    const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
    out.push(F(rho < 0.8 ? '佇列很短' : rho < 1 ? '佇列常常很長' : '佇列滿了，持續掉包', `平均佇列長度 ${avg.toFixed(2)}，共丟棄 ${dropped} 個封包。${rho < 0.8 ? '流量強度低時，偶爾的成群抵達很快就被消化。' : rho < 1 ? '平均輸入雖然小於輸出，但成群抵達時佇列來不及清空，排隊延遲變大。' : '輸入長期大於輸出，佇列只會越來越滿，多出來的封包只能丟掉。'}`, stage(chart(hist, { max: 6, line: 6, lineLabel: '容量 6', marks: drops.map(x => x ? 'bad' : '') }), kv([['平均佇列', avg.toFixed(2)], ['丟棄', dropped, dropped ? 'bad' : 'ok']])), '設計網路時要讓 La/R 明顯小於 1，並預留緩衝。'));
    return out;
  }
  const Lb = +v.L, R = +v.R, dist = +v.dist, d = nodalDelay(Lb, R, dist, v.queued), out = [];
  const items = st => bars([['處理', d.proc, d.total, fmtMs(d.proc), st === 0 ? 'on' : ''], ['排隊', d.queue, d.total, fmtMs(d.queue), st === 1 ? 'on' : ''], ['傳輸', d.trans, d.total, fmtMs(d.trans), st === 2 ? 'on' : ''], ['傳播', d.prop, d.total, fmtMs(d.prop), st === 3 ? 'on' : '']]);
  out.push(F('處理延遲', '路由器檢查標頭、查轉送表決定輸出埠。現代路由器用硬體完成，通常是微秒等級，這裡固定為 20 μs。', stage(items(0))));
  out.push(F('排隊延遲', `前面還有 ${v.queued} 個相同大小的封包要先送，每個要 ${fmtMs(d.trans)}，共 ${fmtMs(d.queue)}。排隊延遲取決於當下的流量，是四種延遲中最難預測的。`, stage(items(1))));
  out.push(F('傳輸延遲 L/R', `${Lb} 位元組 = ${Lb * 8} 位元，鏈路速率 ${R / 1e6} Mbps：${Lb * 8} / ${R} = ${fmtMs(d.trans)}。頻寬越大，把位元推上線的時間越短。`, stage(items(2))));
  out.push(F('傳播延遲 d/s', `距離 ${dist / 1000} km，訊號在光纖中約 2 × 10⁸ m/s：${fmtMs(d.prop)}。這和頻寬完全無關。`, stage(items(3))));
  const big = ['處理', '排隊', '傳輸', '傳播'][[d.proc, d.queue, d.trans, d.prop].indexOf(Math.max(d.proc, d.queue, d.trans, d.prop))];
  out.push(F(`總延遲 ${fmtMs(d.total)}`, `這一跳的延遲由「${big}」主導。${big === '傳播' ? '提高頻寬幾乎沒有幫助；要縮短距離（例如用 CDN）。' : big === '傳輸' ? '提高頻寬或縮小封包可以明顯改善。' : big === '排隊' ? '要降低流量強度或加大輸出頻寬。' : ''}`, stage(items(-1), kv([['總延遲', fmtMs(d.total), 'ok'], ['頻寬 ×10 之後', fmtMs(nodalDelay(Lb, R * 10, dist, v.queued).total)]]))));
  return out;
}

/* ───────────── 2 封裝與解封裝 ───────────── */
function encapFrames(v) {
  const dns = v.app === 'dns', hops = v.hops, out = [];
  const app = dns ? ['DNS 查詢', 'www.example.com A?'] : ['HTTP 請求', 'GET / HTTP/1.1 · Host: example.com'];
  const l4 = dns ? ['UDP 標頭', '來源埠 51000 → 目的埠 53 · 長度 · 檢查和'] : ['TCP 標頭', '來源埠 51000 → 目的埠 443 · seq · ack · 旗標'];
  const dst = dns ? '8.8.8.8' : '93.184.216.34';
  const macs = ['主機', ...Array.from({ length: hops }, (_, i) => `R${i + 1}`), '伺服器'];
  const pkt = (depth, ttl, hop, recv) => {
    let x = `<div class="nx-pkt data"><b>${h(app[0])}</b><span>${h(app[1])}</span></div>`;
    if (depth >= 1) x = `<div class="nx-pkt l3"><b>${h(l4[0])}</b><span>${h(l4[1])}</span>${x}</div>`;
    if (depth >= 2) x = `<div class="nx-pkt l2"><b>IP 標頭</b><span>192.168.1.10 → ${dst} · TTL ${ttl} · 協定 ${dns ? 17 : 6}</span>${x}</div>`;
    if (depth >= 3) x = `<div class="nx-pkt l1"><b>乙太網路標頭 + CRC</b><span>MAC ${h(macs[hop])} → ${h(macs[hop + 1])} · 類型 0x0800</span>${x}</div>`;
    return `<div class="nx-nest${recv ? ' recv' : ''}">${x}</div>`;
  };
  const path = at => pipe(macs, at);
  out.push(F('應用層：產生訊息', `${dns ? '解析器' : '瀏覽器'}寫好要送的內容。應用程式只管訊息內容，不管它怎麼到達。`, stage(path(0), pkt(0, 64, 0))));
  out.push(F(`傳輸層：加上 ${l4[0]}`, `${dns ? 'UDP' : 'TCP'} 加上來源與目的連接埠，讓對方的作業系統知道要交給哪一個程式（${dns ? 'DNS 伺服器的 53 埠' : 'HTTPS 伺服器的 443 埠'}）。現在它是${dns ? '一個 UDP 資料包' : '一個 TCP 區段'}。`, stage(path(0), pkt(1, 64, 0))));
  out.push(F('網路層：加上 IP 標頭', `IP 標頭寫上來源與最終目的 IP，以及 TTL = 64。這兩個 IP 位址在整趟旅程中都不會改變。現在它是一個 IP 資料包。`, stage(path(0), pkt(2, 64, 0))));
  out.push(F('連結層：加上乙太網路標頭', `目的 MAC 不是伺服器的，而是第一台路由器 R1 的介面：MAC 位址只在這一段鏈路上有意義。尾部再加上 CRC。現在它是一個訊框，交給實體層變成訊號。`, stage(path(0), pkt(3, 64, 0))));
  for (let k = 1; k <= hops; k++) {
    out.push(F(`R${k}：拆開到網路層`, `R${k} 檢查 CRC、拆掉乙太網路標頭，讀 IP 標頭的目的位址查轉送表。路由器不會看 ${l4[0].slice(0, 3)} 以上的內容。TTL ${64 - k + 1} → ${64 - k}，並重算 IP 檢查和。`, stage(path(k), pkt(2, 64 - k, k))));
    out.push(F(`R${k}：重新封裝送出`, `用新的乙太網路標頭封裝：來源是 R${k} 出口介面的 MAC，目的是下一站（${macs[k + 1]}）的 MAC。來源、目的 IP 不變。`, stage(path(k), pkt(3, 64 - k, k))));
  }
  out.push(F('伺服器：由下往上解封裝', `連結層確認目的 MAC 是自己、拆掉訊框；網路層確認目的 IP 是自己、依協定號交給 ${dns ? 'UDP' : 'TCP'}；傳輸層依目的埠 ${dns ? 53 : 443} 交給對應的程式。`, stage(path(hops + 1), pkt(3, 64 - hops, hops, true))));
  out.push(F('應用程式收到原本的訊息', `一路上改變的只有連結層標頭（每段都換）與 TTL（${64} → ${64 - hops}）；應用層內容與 IP 位址都原封不動。`, stage(path(hops + 2), pkt(0, 0, 0, true), kv([['經過的路由器', hops], ['抵達時 TTL', 64 - hops], ['MAC 標頭換了', `${hops + 1} 次`]]))));
  return out;
}

/* ───────────── 3 HTTP 與 RTT ───────────── */
function httpPlan(mode, n) {
  // 回傳每個階段：{ label, rtts, items }；items 為 [方向, 文字]
  const ph = [], objs = ['index.html', ...Array.from({ length: n }, (_, i) => `img${i + 1}.jpg`)];
  if (mode === 'np' || mode === 'npp') {
    ph.push({ obj: 'index.html', rtts: 2, msgs: [[0, 'SYN'], [1, 'SYN+ACK'], [0, 'ACK + GET /index.html'], [1, '200 OK（HTML）']] });
    const k = mode === 'npp' ? 5 : 1;
    for (let i = 1; i <= n; i += k) {
      const batch = objs.slice(i, i + k), tag = batch.length > 1 ? ` ×${batch.length}` : '';
      ph.push({ obj: batch.join('、'), rtts: 2, msgs: [[0, 'SYN' + tag], [1, 'SYN+ACK' + tag], [0, `GET ${batch.length > 1 ? batch.length + ' 個物件' : '/' + batch[0]}`], [1, '200 OK' + tag]] });
    }
  } else {
    ph.push({ obj: 'index.html', rtts: 2, msgs: [[0, 'SYN'], [1, 'SYN+ACK'], [0, 'ACK + GET /index.html'], [1, '200 OK（HTML）']] });
    if (mode === 'p') for (let i = 1; i <= n; i++) ph.push({ obj: objs[i], rtts: 1, msgs: [[0, `GET /${objs[i]}`], [1, '200 OK']] });
    else if (n) ph.push({ obj: `${n} 個物件`, rtts: 1, msgs: [[0, `GET ×${n}（連續送出）`], [1, `200 OK ×${n}`]] });
  }
  return ph;
}
function httpFrames(v) {
  const n = v.n, mode = v.mode, ph = httpPlan(mode, n), out = [];
  const name = { np: '非持續連線、一次一條', npp: '非持續連線、最多 5 條平行', p: '持續連線、不管線化', pp: '持續連線、管線化' }[mode];
  out.push(F(`${name}：1 個 HTML + ${n} 張圖`, '先看請求長什麼樣子：起始行、標頭、空行。之後每一步顯示一個物件（或一批物件）花了幾個 RTT，忽略傳輸時間。', stage(code(['GET /index.html HTTP/1.1', 'Host: www.example.com', `Connection: ${mode.startsWith('n') ? 'close' : 'keep-alive'}`, 'User-Agent: NetLab/1.0', ''], 0, '請求'), code(['HTTP/1.1 200 OK', 'Content-Type: text/html', 'Content-Length: 5120', '', '<html> … <img src="img1.jpg"> …'], 0, '回應'))));
  let total = 0;
  ph.forEach((p, i) => {
    total += p.rtts;
    out.push(F(`${p.obj}：${p.rtts} 個 RTT`, `${p.rtts === 2 ? '先花 1 個 RTT 建立 TCP 連線（SYN、SYN+ACK），再花 1 個 RTT 送請求、收回應。' : '連線已經存在，只要 1 個 RTT 送請求、收回應。'}${p.obj.includes('、') ? '這幾個物件在平行的連線上同時抓取，只算一次。' : ''}${mode === 'pp' && i ? '管線化：不等回應就把所有請求連續送出。' : ''}累計 ${total} RTT。`, stage(ladder(['瀏覽器', '伺服器'], p.msgs.map(([d, t], j) => L(d ? 1 : 0, d ? 0 : 1, t, j >= p.msgs.length - 2 ? 'on' : ''))), kv([['這一步', `${p.rtts} RTT`], ['累計', `${total} RTT`, 'ok']]))));
  });
  const all = { np: 2 * (n + 1), npp: 2 + 2 * Math.ceil(n / 5), p: 2 + n, pp: 2 + (n ? 1 : 0) };
  out.push(F(`共 ${total} 個 RTT`, `同樣的網頁，四種方式的差別全在「要走幾趟來回」。RTT = 50 ms 時，${name}需要 ${total * 50} ms。`, stage(bars([['非持續', all.np, all.np, `${all.np} RTT`, mode === 'np' ? 'on' : ''], ['5 條平行', all.npp, all.np, `${all.npp} RTT`, mode === 'npp' ? 'on' : ''], ['持續', all.p, all.np, `${all.p} RTT`, mode === 'p' ? 'on' : ''], ['持續＋管線化', all.pp, all.np, `${all.pp} RTT`, mode === 'pp' ? 'on' : '']]))));
  return out;
}

/* ───────────── 4 DNS 查詢 ───────────── */
function dnsSteps(name, mode, cache) {
  // 參與者：0 主機、1 本地 DNS、2 根、3 .com TLD、4 example.com 權威
  const s = [], q = name, cname = q === 'blog.example.com';
  const final = cname ? 'blog.example.com CNAME www.example.com；www.example.com A 93.184.216.34' : `${q} A ${q.startsWith('mail') ? '93.184.216.40' : '93.184.216.34'}`;
  s.push([0, 1, `${q} 的 A？（遞迴）`, '主機的解析器把問題交給本地 DNS 伺服器，並要求它「問到答案再回我」。']);
  if (cache === 'answer') { s.push([1, 0, final, '本地伺服器的快取裡已經有這筆答案，TTL 還沒到期，直接回答，完全不必對外查詢。']); return s; }
  if (mode === 'iter') {
    if (cache !== 'tld') { s.push([1, 2, `${q} 的 A？`, '快取裡什麼都沒有，只好從根伺服器開始問。']); s.push([2, 1, '去問 .com TLD（a.gtld-servers.net）', '根伺服器不知道答案，但知道 .com 由誰負責，回覆一個轉介。這就是迭代查詢。']); }
    s.push([1, 3, `${q} 的 A？`, cache === 'tld' ? '.com TLD 伺服器的位址已在快取中，跳過根伺服器。' : '本地伺服器照著轉介去問 .com TLD 伺服器。']);
    s.push([3, 1, '去問 ns1.example.com', 'TLD 伺服器回覆 example.com 的權威伺服器（NS 記錄與它的 IP）。']);
    s.push([1, 4, `${q} 的 A？`, '最後問權威伺服器，它保存 example.com 這個網域的實際記錄。']);
  } else {
    if (cache !== 'tld') {
      s.push([1, 2, `${q} 的 A？（遞迴）`, '如果每一層都用遞迴查詢，根伺服器就要替你跑腿。']);
      s.push([2, 3, `${q} 的 A？（遞迴）`, '根伺服器再遞迴地問 .com TLD 伺服器，自己要記住這個查詢還沒完成。']);
    } else s.push([1, 3, `${q} 的 A？（遞迴）`, 'TLD 位址已在快取中，直接遞迴地問 TLD 伺服器。']);
    s.push([3, 4, `${q} 的 A？（遞迴）`, 'TLD 伺服器再去問權威伺服器。每一層都要保留狀態等待回覆，所以根與 TLD 實務上拒絕遞迴查詢。']);
    s.push([4, 3, final, '權威伺服器給出答案，沿原路一層層傳回。']);
    if (cache !== 'tld') { s.push([3, 2, final, '答案回到根伺服器。']); s.push([2, 1, final, '再回到本地伺服器。']); }
    else s.push([3, 1, final, '答案回到本地伺服器。']);
    s.push([1, 0, final, '本地伺服器把答案交給主機，並依 TTL 快取。']);
    return s;
  }
  s.push([4, 1, final, cname ? '權威伺服器發現 blog 是 CNAME（別名），而它的正式名稱 www 也在自己的區域中，於是把 CNAME 與 www 的 A 記錄一起回覆。' : '權威伺服器回覆 A 記錄與它的 TTL。']);
  s.push([1, 0, final, '本地伺服器把答案交給主機，並把答案、NS 記錄與 TLD 位址都依 TTL 快取起來。']);
  return s;
}
function dnsFrames(v) {
  const steps = dnsSteps(v.name, v.mode, v.cache), cols = ['主機', '本地 DNS', '根', '.com TLD', '權威'], out = [];
  out.push(F(`查詢 ${v.name}`, `${v.mode === 'iter' ? '本地伺服器對外使用迭代查詢（最常見）' : '假設每一層都使用遞迴查詢'}；快取狀態：${{ empty: '空的', tld: '已有 .com TLD 的位址', answer: '已有這筆答案' }[v.cache]}。`, stage(ladder(cols, []))));
  steps.forEach((st, i) => out.push(F(`${i + 1}. ${cols[st[0]]} → ${cols[st[1]]}`, st[3], stage(ladder(cols, steps.slice(0, i + 1).map((x, j) => L(x[0], x[1], x[2].length > 34 ? x[2].slice(0, 32) + '…' : x[2], j === i ? 'on' : '')))))));
  const outside = steps.filter(s => s[0] !== 0 && s[1] !== 0).length;
  out.push(F(`共 ${steps.length} 則訊息`, `其中 ${outside} 則發生在本地 DNS 伺服器之外。${v.cache === 'empty' && v.mode === 'iter' ? '換成「已有 .com TLD 的位址」，看看能省下多少。' : ''}${v.name === 'blog.example.com' ? 'CNAME 讓網站改名或搬到 CDN 時，只要改一筆記錄。' : ''}`, stage(ladder(cols, steps.map(x => L(x[0], x[1], x[2].length > 34 ? x[2].slice(0, 32) + '…' : x[2]))), kv([['總訊息', steps.length], ['對外查詢', outside, outside ? '' : 'ok']]))));
  return out;
}

/* ───────────── 5 Socket ───────────── */
function frameDecode(chunks) {
  // 長度:內容 的訊框解析；回傳每次 recv 之後的（緩衝區, 新解出的訊息）
  let buf = ''; const log = [];
  for (const c of chunks) {
    buf += c; const got = [];
    for (;;) { const i = buf.indexOf(':'); if (i < 0) break; const n = +buf.slice(0, i); if (buf.length < i + 1 + n) break; got.push(buf.slice(i + 1, i + 1 + n)); buf = buf.slice(i + 1 + n); }
    log.push({ chunk: c, buf, got });
  }
  return log;
}
const RECV = { whole: ['5:Hello', '5:World'], split: ['5:Hel', 'lo5:World'], merge: ['5:Hello5:World'] };
function socketFrames(v) {
  const out = [], tcp = v.proto === 'tcp';
  const srv = tcp ? ['s = socket(AF_INET, SOCK_STREAM)', 's.bind(("", 9000))', 's.listen()', 'conn, addr = s.accept()', 'data = conn.recv(1024)  # 迴圈', 'conn.close()'] : ['s = socket(AF_INET, SOCK_DGRAM)', 's.bind(("", 9000))', 'data, addr = s.recvfrom(2048)', 'data, addr = s.recvfrom(2048)', 's.close()'];
  const cli = tcp ? ['c = socket(AF_INET, SOCK_STREAM)', 'c.connect((server, 9000))', 'c.sendall(b"5:Hello")', 'c.sendall(b"5:World")', 'c.close()'] : ['c = socket(AF_INET, SOCK_DGRAM)', 'c.sendto(b"Hello", (server, 9000))', 'c.sendto(b"World", (server, 9000))', 'c.close()'];
  const two = (a, b, extra = '') => stage(`<div class="nx-two">${code(cli, a, '客戶端')}${code(srv, b, '伺服器')}</div>`, extra);
  const bufRow = s => row(s ? [...s].map(c => cell(c, '', 'on')) : [cell('（空）', '', 'faint')], 'tight left');
  if (!tcp) {
    out.push(F('伺服器建立 UDP socket 並綁定埠號', 'UDP 不需要 listen 與 accept：綁定 9000 埠之後就可以收任何人送來的資料包。', two(-1, [0, 1])));
    out.push(F('客戶端直接 sendto', '沒有握手，第一個封包就帶著資料出發；每次 sendto 都要寫上目的地。', two([0, 1], 1)));
    out.push(F('客戶端再送一個資料包', '兩次 sendto 是兩個獨立的資料包，可能走不同的路、可能遺失、也可能亂序。', two(2, 1)));
    out.push(F('recvfrom 收到「Hello」', '每次 recvfrom 剛好拿到一個完整的資料包，邊界被保留；同時得到來源位址，回覆時用它當目的地。', two(2, 2, kv([['收到', 'Hello'], ['來源', '客戶端 IP:暫時埠']]))));
    out.push(F('recvfrom 收到「World」', 'UDP 保留訊息邊界，所以不需要長度前綴；代價是沒有可靠性與順序保證，需要的話得由應用程式自己處理。', two(3, 3, kv([['收到', 'World'], ['可靠性', '不保證', 'bad']]))));
    return out;
  }
  out.push(F('伺服器：socket、bind、listen', '建立「歡迎 socket」、綁定 9000 埠、開始等待連線。此時還沒有任何客戶端。', two(-1, [0, 1, 2])));
  out.push(F('客戶端 connect：三向交握', 'connect 觸發 SYN、SYN+ACK、ACK。作業系統自動替客戶端挑一個暫時埠。', two([0, 1], 2, ladder(['客戶端', '伺服器'], [L(0, 1, 'SYN'), L(1, 0, 'SYN+ACK'), L(0, 1, 'ACK', 'on')]))));
  out.push(F('accept 回傳新的連線 socket', 'accept 回傳一個新的 socket 專門和這個客戶端說話；原本的歡迎 socket 繼續等下一個客戶端。連線由（客戶端 IP, 客戶端埠, 伺服器 IP, 9000）四個值識別。', two(1, 3)));
  out.push(F('客戶端送出兩則訊息', '應用程式呼叫兩次 sendall，每則前面加上「長度:」。但 TCP 只看到一串位元組：5:Hello5:World，它不記得哪裡是第一則的結尾。', two([2, 3], 3, bufRow('5:Hello5:World'))));
  frameDecode(RECV[v.split]).forEach((x, i) => {
    out.push(F(`第 ${i + 1} 次 recv 拿到「${x.chunk}」`, `${x.got.length ? `緩衝區裡湊滿了完整的訊息：${x.got.map(s => `「${s}」`).join('、')}，取出交給程式。` : '緩衝區裡還不夠一則完整的訊息（長度說要 5 個字元），必須繼續 recv。'}${x.buf ? `剩下「${x.buf}」留在緩衝區。` : '緩衝區清空了。'}`, two(-1, 4, `${cap('收到的資料')}${row([...x.chunk].map(c => cell(c, '', 'done')), 'tight left')}${cap('解析後的緩衝區')}${bufRow(x.buf)}${x.got.length ? kv(x.got.map((g, k) => [`訊息 ${k + 1}`, h(g), 'ok'])) : ''}`)));
  });
  out.push(F('結論：TCP 不保留訊息邊界', `${v.split === 'whole' ? '這次 recv 剛好每次拿到一則，但這只是巧合；' : ''}同樣兩次 send，recv 可能合併、可能切開。只要用「長度:內容」這種訊框格式並在迴圈裡累積，任何切法都能正確解析。`, two([4], [4, 5]), '在本機測試時常常剛好一次收到全部，部署到真實網路才出錯。'));
  return out;
}

/* ───────────── 6 網際網路檢查和 ───────────── */
function parseWords(s) { return String(s || '').split(/[\s,，]+/).filter(Boolean).map(w => parseInt(w, 16)).filter(x => Number.isInteger(x) && x >= 0 && x <= 0xFFFF).slice(0, 8); }
function onesSum(words) { let s = 0; const steps = []; for (const w of words) { const raw = s + w; s = (raw & 0xFFFF) + (raw >>> 16); steps.push({ w, raw, s, wrap: raw > 0xFFFF }); } return { sum: s, steps }; }
const hex4 = x => x.toString(16).toUpperCase().padStart(4, '0');
const bin16 = x => (x >>> 0).toString(2).padStart(16, '0').replace(/(\d{4})(?=\d)/g, '$1 ');
function checksumFrames(v) {
  const words = parseWords(v.words), out = [];
  if (!words.length) return [F('沒有資料', '請輸入以空白分隔的 16 位元十六進位字，例如 4500 0030 4422。', '')];
  const { sum, steps } = onesSum(words), cs = ~sum & 0xFFFF;
  out.push(F('把資料切成 16 位元的字', `共 ${words.length} 個字：${words.map(hex4).join(' ')}。發送端把它們全部相加。`, stage(table(['#', '十六進位', '二進位'], words.map((w, i) => [i + 1, hex4(w), bin16(w)])))));
  steps.forEach((st, i) => out.push(F(`加上第 ${i + 1} 個字 ${hex4(st.w)}`, st.wrap ? `相加得 ${st.raw.toString(16).toUpperCase()}，超過 16 位元！把溢出的 1 繞回最低位：${hex4(st.raw & 0xFFFF)} + 1 = ${hex4(st.s)}。` : `相加得 ${hex4(st.s)}，沒有溢出。`, stage(table(['步驟', '目前的和', '二進位'], steps.slice(0, i + 1).map((x, j) => [j + 1, hex4(x.s) + (x.wrap ? ' ↺' : ''), bin16(x.s)]), i)))));
  out.push(F(`取反得到檢查和 ${hex4(cs)}`, `把和 ${hex4(sum)} 的每個位元反轉：${bin16(sum)} → ${bin16(cs)}。發送端把 ${hex4(cs)} 放進 UDP 標頭的檢查和欄位。`, stage(kv([['和', hex4(sum)], ['檢查和 = ~和', hex4(cs), 'ok']]))));
  const flip = v.flip, recv = words.slice();
  let note = '傳送途中沒有錯誤。';
  if (flip === 'one') { recv[0] ^= 0x0004; note = `第 1 個字的第 2 位元在途中翻轉：${hex4(words[0])} → ${hex4(recv[0])}。`; }
  if (flip === 'two' && recv.length >= 2) { const b = 0x0100; if ((recv[0] & b) === (recv[1] & b)) { recv[0] ^= b; recv[1] ^= (b << 1); note = '兩個字各有一個位元翻轉。'; } else { recv[0] ^= b; recv[1] ^= b; note = `第 1、2 個字的同一個位元一個 0→1、一個 1→0：${hex4(words[0])} → ${hex4(recv[0])}，${hex4(words[1])} → ${hex4(recv[1])}。`; } }
  const chk = onesSum([...recv, cs]).sum, ok = chk === 0xFFFF, wrong = recv.some((x, i) => x !== words[i]);
  out.push(F(ok ? (wrong ? '驗證通過……但資料其實錯了！' : '接收端驗證：全部是 1') : '接收端驗證：發現錯誤', `${note}接收端把收到的字與檢查和一起相加得 ${hex4(chk)}。${ok ? (wrong ? '兩個錯誤互相抵消，總和不變，檢查和偵測不到。這就是檢查和的弱點。' : '結果是 FFFF，接受這個區段。') : '結果不是 FFFF，丟棄這個區段。'}`, stage(table(['', '收到的字'], recv.map((w, i) => [i + 1, w !== words[i] ? `<b class="nx-bad">${hex4(w)}</b>` : hex4(w)]).concat([['檢查和', hex4(cs)]])), kv([['總和', hex4(chk), ok && !wrong ? 'ok' : 'bad'], ['判定', ok ? '接受' : '丟棄', ok && !wrong ? 'ok' : wrong && ok ? 'bad' : '']]))));
  return out;
}

/* ───────────── 7 停等協定 ───────────── */
const ARQ = {
  ok: ['ok', 'ok', 'ok'],
  lost: ['ok', 'lost', 'ok', 'ok'],
  acklost: ['ok', 'acklost', 'ok', 'ok'],
  early: ['ok', 'early', 'ok', 'ok']
};
function arqRun(events) {
  // 每個事件是一次資料傳送的結果；回傳時序圖訊息與統計
  const msgs = [], log = []; let seq = 0, expected = 0, item = 0, sent = 0, dup = 0, i = 0;
  while (item < 3) {
    const e = events[i++] || 'ok'; sent++;
    if (e === 'lost') { msgs.push(L(0, 1, `P${seq}（第 ${item + 1} 份）`, 'lost')); log.push({ k: msgs.length, t: `P${seq} 在途中遺失。發送端的計時器到期後重傳同一個序號。` }); continue; }
    const fresh = seq === expected;
    msgs.push(L(0, 1, `P${seq}（第 ${item + 1} 份）`, fresh ? '' : 'faint'));
    log.push({ k: msgs.length, t: fresh ? `接收端收到序號 ${seq}，正是期待的，交給上層。` : `接收端收到序號 ${seq}，但剛剛已經收過了：丟棄資料，但仍然回 ACK${seq}。` });
    if (fresh) expected ^= 1; else dup++;
    if (e === 'acklost') { msgs.push(L(1, 0, `ACK${seq}`, 'lost')); log.push({ k: msgs.length, t: `ACK${seq} 遺失。發送端不知道資料已經送到，逾時後重傳。` }); continue; }
    if (e === 'early') { msgs.push(L(1, 0, `ACK${seq}（很慢）`, 'faint')); log.push({ k: msgs.length, t: `ACK${seq} 在擁塞的路上走得很慢，發送端的計時器先到期，重傳了一份其實已經送到的資料。之後慢到的 ACK 仍然有效。` }); msgs.push(L(0, 1, `P${seq} 重傳`, 'faint')); sent++; dup++; log.push({ k: msgs.length, t: `接收端收到重複的序號 ${seq}：丟棄資料、再回一次 ACK${seq}。發送端收到重複的 ACK 就忽略。` }); }
    msgs.push(L(1, 0, `ACK${seq}`, '')); log.push({ k: msgs.length, t: `發送端收到 ACK${seq}，停止計時器，換下一個序號 ${seq ^ 1}。` });
    seq ^= 1; item++;
  }
  return { msgs, log, sent, dup };
}
function arqFrames(v) {
  const r = arqRun(ARQ[v.scenario]), out = [];
  out.push(F('停等協定：一次只送一個', '發送端送出一個封包就啟動計時器，等到正確的 ACK 才送下一個。序號只需要 0、1 交替。要可靠地送出 3 份資料。', stage(ladder(['發送端', '接收端'], []))));
  r.log.forEach((x, i) => out.push(F(`事件 ${i + 1}`, x.t, stage(ladder(['發送端', '接收端'], r.msgs.slice(0, x.k).map((m, j) => ({ ...m, st: j === x.k - 1 ? (m.st === 'lost' ? 'lost' : 'on') : m.st })))))));
  const RTT = 30, LR = 0.008, U = LR / (RTT + LR);
  out.push(F(`傳送 ${r.sent} 次，上層收到 3 份`, `共傳送 ${r.sent} 次資料封包，接收端丟棄了 ${r.dup} 份重複資料，上層剛好收到 3 份、沒有重複。不過停等協定很慢：在 1 Gbps、RTT 30 ms 的鏈路上送 1000 位元組封包，L/R = 8 μs，使用率只有 ${(U * 100).toFixed(3)}%。`, stage(ladder(['發送端', '接收端'], r.msgs), kv([['資料傳送次數', r.sent], ['重複丟棄', r.dup], ['使用率', (U * 100).toFixed(3) + '%', 'bad']]))));
  return out;
}

/* ───────────── 8 Go-Back-N 與 Selective Repeat ───────────── */
function windowRun(proto, n, N, lostSet) {
  // lostSet：'seq@try' 字串集合。回傳事件列表（每個事件附帶當下的狀態）與總傳送次數
  const tries = Array(n).fill(0), acked = Array(n).fill(false), got = Array(n).fill(false), flight = [], ev = [];
  let base = 0, nxt = 0, expected = 0, sent = 0, guard = 0;
  const snap = (t, hi) => ev.push({ t, hi, base, nxt, expected, acked: acked.slice(), got: got.slice(), sent });
  const send = s => { tries[s]++; sent++; flight.push([s, lostSet.has(`${s}@${tries[s]}`)]); };
  const fill = () => { const st = nxt; while (nxt < Math.min(base + N, n)) send(nxt++); return [st, nxt]; };
  let [a, b] = fill(); snap(`送出 P${a}–P${b - 1}（視窗 ${N}）`, -1);
  while (base < n && guard++ < 500) {
    while (flight.length) {
      const [s, dropped] = flight.shift();
      if (dropped) { snap(`P${s} 在途中遺失`, s); continue; }
      if (proto === 'gbn') {
        if (s === expected) { got[s] = true; expected++; for (let k = base; k < expected; k++) acked[k] = true; base = expected; const [x, y] = fill(); snap(`收到 P${s}，回 ACK${s}${y > x ? `；視窗前滑，送出 P${x}${y - x > 1 ? '–P' + (y - 1) : ''}` : ''}`, s); }
        else snap(`收到 P${s}，但期待的是 P${expected}：丟棄，重送 ACK${expected - 1}`, s);
      } else {
        if (!got[s]) got[s] = true;
        acked[s] = true; const old = base; while (base < n && acked[base]) base++;
        const [x, y] = fill();
        snap(`收到 P${s}${s !== old && !acked[old] ? '（亂序，先緩衝）' : ''}，回 ACK${s}${base > old ? `；base 前滑到 ${base}` : ''}${y > x ? `，送出 P${x}${y - x > 1 ? '–P' + (y - 1) : ''}` : ''}`, s);
      }
    }
    if (base >= n) break;
    const re = []; for (let s = base; s < nxt; s++) if (proto === 'gbn' || !acked[s]) { send(s); re.push(s); }
    snap(`逾時！重傳 ${re.map(s => 'P' + s).join('、')}`, re[0]);
  }
  return { ev, sent };
}
function windowFrames(v) {
  const n = 8, N = v.N, lost = new Set(v.lost === 'none' ? [] : v.lost.split('+').map(s => s + '@1')), r = windowRun(v.proto, n, N, lost), out = [];
  const strip = e => row(Array.from({ length: n }, (_, s) => cell(`P${s}`, e.acked[s] ? '確認' : s < e.nxt ? '已送' : s < e.base + N ? '可送' : '窗外', s === e.hi ? 'on' : e.acked[s] ? 'done' : s < e.nxt ? '' : s < e.base + N ? '' : 'faint')), 'tight');
  const recv = e => row(Array.from({ length: n }, (_, s) => cell(e.got[s] ? '✓' : '·', `P${s}`, e.got[s] ? 'done' : 'faint')), 'tight');
  const name = v.proto === 'gbn' ? 'Go-Back-N' : 'Selective Repeat';
  r.ev.forEach((e, i) => out.push(F(e.t, i === 0 ? `${name}，視窗 N = ${N}，要送 P0–P${n - 1}。${lost.size ? `第一次傳送時遺失：${[...lost].map(x => 'P' + x.split('@')[0]).join('、')}。` : '沒有遺失。'}上排是發送端的序號狀態，下排是接收端${v.proto === 'gbn' ? '交給上層的封包（GBN 不緩衝亂序封包）' : '已收到（含緩衝）的封包'}。` : `base = ${e.base}，nextseqnum = ${e.nxt}，累計傳送 ${e.sent} 次。`, stage(cap('發送端'), strip(e), cap(v.proto === 'gbn' ? `接收端（期待 P${e.expected}）` : '接收端'), recv(e)))));
  const other = windowRun(v.proto === 'gbn' ? 'sr' : 'gbn', n, N, lost).sent;
  out.push(F(`全部確認，共傳送 ${r.sent} 次`, `${n} 個封包，額外重傳 ${r.sent - n} 次。同樣的情況下 ${v.proto === 'gbn' ? 'Selective Repeat' : 'Go-Back-N'} 需要 ${other} 次。${v.proto === 'gbn' && r.sent > other ? 'GBN 的接收端丟掉了亂序抵達的封包，逾時後整個視窗都要重送。' : ''}`, stage(kv([[name, `${r.sent} 次`, 'ok'], [v.proto === 'gbn' ? 'Selective Repeat' : 'Go-Back-N', `${other} 次`]]))));
  return out;
}

/* ───────────── 9 TCP 連線管理 ───────────── */
const M32 = 4294967296, add32 = (a, b) => ((a + b) % M32 + M32) % M32;
function tcpTrace(x, y, c, s, close) {
  // 回傳 [方向(0 客戶端→伺服器), 文字, 客戶端狀態, 伺服器狀態, 說明]
  const out = []; let cs = add32(x, 1), ss = add32(y, 1);
  out.push([0, `SYN seq=${x}`, 'SYN_SENT', 'LISTEN', `客戶端隨機選了初始序號 ${x}，送出 SYN。SYN 沒有資料，但要佔用一個序號，所以下一個位元組的序號是 ${cs}。`]);
  out.push([1, `SYN+ACK seq=${y} ack=${cs}`, 'SYN_SENT', 'SYN_RCVD', `伺服器選了自己的初始序號 ${y}，並確認客戶端的 SYN：ack = ${x} + 1 = ${cs}，意思是「我下一個期待 ${cs}」。`]);
  out.push([0, `ACK seq=${cs} ack=${ss}`, 'ESTABLISHED', 'ESTABLISHED', `客戶端確認伺服器的 SYN：ack = ${y} + 1 = ${ss}。三向交握完成，雙方都知道對方的初始序號。`]);
  if (c) { out.push([0, `seq=${cs} len=${c} ack=${ss}`, 'ESTABLISHED', 'ESTABLISHED', `客戶端送出 ${c} 位元組，第一個位元組的序號是 ${cs}，涵蓋 ${cs} 到 ${add32(cs, c - 1)}。`]); cs = add32(cs, c); out.push([1, `ACK ack=${cs}`, 'ESTABLISHED', 'ESTABLISHED', `伺服器按順序收到，回 ack = ${cs}：下一個期待的位元組。${cs < x ? '序號超過 2³² − 1 之後繞回從 0 開始。' : ''}`]); }
  if (s) { out.push([1, `seq=${ss} len=${s} ack=${cs}`, 'ESTABLISHED', 'ESTABLISHED', `伺服器送出 ${s} 位元組，用的是自己方向的序號 ${ss}。兩個方向的序號完全獨立。`]); ss = add32(ss, s); out.push([0, `ACK ack=${ss}`, 'ESTABLISHED', 'ESTABLISHED', `客戶端回 ack = ${ss}。`]); }
  if (close === 'rst') { out.push([0, `RST seq=${cs}`, 'CLOSED', 'CLOSED', 'RST 立即中止連線：不需要對方確認，雙方直接丟掉連線狀態，尚未送達的資料也一併丟棄。']); return out; }
  const A = close === 'client' ? 0 : 1, nameA = A ? '伺服器' : '客戶端', nameB = A ? '客戶端' : '伺服器';
  const st = (a, b) => A ? [b, a] : [a, b];
  let seqA = A ? ss : cs, seqB = A ? cs : ss;
  out.push([A, `FIN seq=${seqA}`, ...st('FIN_WAIT_1', 'ESTABLISHED'), `${nameA}主動關閉，送出 FIN（序號 ${seqA}）。FIN 也佔一個序號。`]);
  out.push([1 - A, `ACK ack=${add32(seqA, 1)}`, ...st('FIN_WAIT_2', 'CLOSE_WAIT'), `${nameB}確認 FIN：ack = ${add32(seqA, 1)}。這時只有 ${nameA}→${nameB} 的方向關閉了，${nameB}仍然可以繼續送資料。`]);
  out.push([1 - A, `FIN seq=${seqB}`, ...st('FIN_WAIT_2', 'LAST_ACK'), `${nameB}也送完了，送出自己的 FIN。`]);
  out.push([A, `ACK ack=${add32(seqB, 1)}`, ...st('TIME_WAIT', 'CLOSED'), `${nameA}確認後進入 TIME_WAIT，等待 2 MSL 才釋放；如果這個 ACK 遺失，還能回應對方重傳的 FIN。`]);
  return out;
}
function handshakeFrames(v) {
  const t = tcpTrace(v.isnC, v.isnS, v.c, v.s, v.close), out = [];
  t.forEach((x, i) => out.push(F(x[1], x[4], stage(ladder(['客戶端', '伺服器'], t.slice(0, i + 1).map((y, j) => L(y[0], 1 - y[0], y[1], j === i ? 'on' : ''))), kv([['客戶端狀態', x[2]], ['伺服器狀態', x[3]]])))));
  out.push(F('整理：序號怎麼算', `客戶端用了序號 ${v.isnC} 起的 ${1 + v.c + (v.close === 'rst' ? 0 : 1)} 個（SYN ${v.c ? `+ ${v.c} 位元組資料 ` : ''}${v.close === 'rst' ? '' : '+ FIN'}），伺服器用了 ${v.isnS} 起的 ${1 + v.s + (v.close === 'rst' ? 0 : 1)} 個。ACK 永遠是「對方下一個位元組的序號」。`, stage(ladder(['客戶端', '伺服器'], t.map(y => L(y[0], 1 - y[0], y[1]))))));
  return out;
}

/* ───────────── 10 TCP 壅塞控制 ───────────── */
function cwndRun(events, ssthresh0, tahoe) {
  let cwnd = 1, ss = ssthresh0; const rounds = [];
  for (const e of events) {
    const before = { cwnd, ss, phase: cwnd < ss ? '慢啟動' : '壅塞避免', e };
    if (e === 'o') cwnd = cwnd < ss ? Math.min(cwnd * 2, ss) : cwnd + 1;
    else { ss = Math.max(Math.floor(cwnd / 2), 2); cwnd = e === 't' || tahoe ? 1 : ss; }
    rounds.push({ ...before, next: cwnd, nextSs: ss });
  }
  return rounds;
}
function cwndFrames(v) {
  const ev = [...String(v.events).toLowerCase()].filter(c => 'odt'.includes(c)).slice(0, 30), tahoe = v.algo === 'tahoe', out = [];
  if (!ev.length) return [F('沒有事件', '用 o（正常）、d（3 個重複 ACK）、t（逾時）組成事件序列，例如 ooooooodooo。', '')];
  const r = cwndRun(ev, v.ssthresh, tahoe), hist = r.map(x => x.cwnd), marks = r.map(x => x.e === 'o' ? '' : x.e === 'd' ? 'warn' : 'bad');
  out.push(F(`TCP ${tahoe ? 'Tahoe' : 'Reno'}，ssthresh = ${v.ssthresh}`, 'cwnd 從 1 MSS 開始。每一輪 RTT 送出 cwnd 個區段，依這一輪的結果調整下一輪的 cwnd。圖中每根柱子是一輪送出的量，虛線是 ssthresh。', stage(chart([], { line: v.ssthresh, lineLabel: 'ssthresh', max: Math.max(...hist, v.ssthresh) + 2 }))));
  r.forEach((x, i) => {
    const what = x.e === 'o' ? (x.cwnd < x.ss ? `${x.phase}：沒有遺失，cwnd 加倍${x.cwnd * 2 > x.ss ? `，但不超過 ssthresh ${x.ss}` : ''}，下一輪 ${x.next}。` : `${x.phase}：沒有遺失，cwnd 只加 1，下一輪 ${x.next}。`)
      : x.e === 'd' ? `收到 3 個重複 ACK：ssthresh = ⌊${x.cwnd} / 2⌋ = ${x.nextSs}，${tahoe ? 'Tahoe 把 cwnd 降回 1，重新慢啟動。' : `Reno 進入快速恢復，cwnd 直接設為 ${x.next}，繼續壅塞避免。`}`
        : `逾時：ssthresh = ⌊${x.cwnd} / 2⌋ = ${x.nextSs}，cwnd 降回 1，重新慢啟動。`;
    out.push(F(`第 ${i + 1} 輪：cwnd = ${x.cwnd}`, what, stage(chart(hist.slice(0, i + 1), { line: x.nextSs, lineLabel: `ssthresh ${x.nextSs}`, max: Math.max(...hist, v.ssthresh) + 2, marks: marks.slice(0, i + 1) }), kv([['這一輪送出', x.cwnd], ['事件', { o: '正常', d: '3 重複 ACK', t: '逾時' }[x.e], x.e === 'o' ? 'ok' : 'bad'], ['下一輪 cwnd', x.next]]))));
  });
  const sum = hist.reduce((a, b) => a + b, 0);
  out.push(F(`${r.length} 輪共送出 ${sum} 個區段`, `平均每輪 ${(sum / r.length).toFixed(1)} 個區段。${tahoe ? '把演算法換成 Reno，比較遇到重複 ACK 時少損失多少。' : '把演算法換成 Tahoe，看看重複 ACK 時的差別；或在序列中加入 t（逾時）。'}`, stage(chart(hist, { line: r[r.length - 1].nextSs, lineLabel: 'ssthresh', marks }), kv([['總區段數', sum, 'ok'], ['最大 cwnd', Math.max(...hist)]]))));
  return out;
}

/* ───────────── 11 IPv4 位址與 VLSM ───────────── */
function parseIp(s) { const m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/); if (!m) return null; const p = m.slice(1).map(Number); if (p.some(x => x > 255)) return null; return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0; }
const ipStr = x => [24, 16, 8, 0].map(s => (x >>> s) & 255).join('.');
const maskOf = k => k === 0 ? 0 : (0xFFFFFFFF << (32 - k)) >>> 0;
const ipBin = (x, k = -1) => { const b = (x >>> 0).toString(2).padStart(32, '0'); return k < 0 ? b.replace(/(\d{8})(?=\d)/g, '$1.') : `${b.slice(0, k)}|${b.slice(k)}`; };
function parseCidr(s) { const [ip, k] = String(s).split('/'); const a = parseIp(ip), p = Number(k); if (a === null || !Number.isInteger(p) || p < 0 || p > 32) return null; return { ip: a, k: p, net: (a & maskOf(p)) >>> 0, bc: ((a & maskOf(p)) | ~maskOf(p)) >>> 0 }; }
function hostsOf(k) { return k >= 31 ? (k === 31 ? 2 : 1) : 2 ** (32 - k) - 2; }
function prefixFor(h) { let k = 2; while (2 ** k - 2 < h) k++; return 32 - k; }
function vlsm(blockStr, needs) {
  const b = parseCidr(blockStr); if (!b) return null;
  const order = needs.map((h, i) => ({ h, i })).sort((p, q) => q.h - p.h || p.i - q.i), res = Array(needs.length).fill(null);
  let cur = b.net; const end = b.bc + 1;
  for (const { h, i } of order) { const k = prefixFor(h), size = 2 ** (32 - k); if (k < b.k || cur + size > end) { res[i] = { h, k, fail: true }; continue; } res[i] = { h, k, net: cur, bc: cur + size - 1 }; cur += size; }
  return { b, order, res, used: cur - b.net };
}
function vlsmFrames(v) {
  const out = [];
  if (v.mode === 'single') {
    const c = parseCidr(v.block); if (!c) return [F('格式錯誤', '請輸入像 192.168.10.77/26 這樣的 CIDR。', '')];
    out.push(F(`${ipStr(c.ip)}/${c.k}：前 ${c.k} 位元是網路前綴`, `把 IP 寫成 32 位元，| 左邊 ${c.k} 位元是網路部分，右邊 ${32 - c.k} 位元是主機部分。遮罩是前 ${c.k} 位元為 1：${ipStr(maskOf(c.k))}。`, stage(table(['', '二進位'], [['IP', ipBin(c.ip, c.k)], ['遮罩', ipBin(maskOf(c.k), c.k)]]))));
    out.push(F(`網路位址 ${ipStr(c.net)}`, 'IP AND 遮罩：主機部分全部清成 0。這個位址代表整個子網路，不能分給主機。', stage(table(['', '二進位', '十進位'], [['IP', ipBin(c.ip, c.k), ipStr(c.ip)], ['AND 遮罩', ipBin(c.net, c.k), `<b>${ipStr(c.net)}</b>`]], 1))));
    out.push(F(`廣播位址 ${ipStr(c.bc)}`, '網路位址 OR NOT 遮罩：主機部分全部設成 1。送到這個位址的封包會給子網路裡的每一台主機。', stage(table(['', '二進位', '十進位'], [['網路', ipBin(c.net, c.k), ipStr(c.net)], ['OR ~遮罩', ipBin(c.bc, c.k), `<b>${ipStr(c.bc)}</b>`]], 1))));
    out.push(F(`可用 ${hostsOf(c.k)} 個主機位址`, c.k <= 30 ? `2^${32 - c.k} − 2 = ${hostsOf(c.k)}：扣掉網路位址與廣播位址。第一個可用 ${ipStr(c.net + 1)}，最後一個 ${ipStr(c.bc - 1)}。路由器介面通常也佔用其中一個。` : c.k === 31 ? '/31 只有 2 個位址，依 RFC 3021 用在點對點鏈路，兩個都可以用。' : '/32 只代表單一主機。', stage(kv([['網路', ipStr(c.net)], ['廣播', ipStr(c.bc)], ['可用範圍', c.k <= 30 ? `${ipStr(c.net + 1)} – ${ipStr(c.bc - 1)}` : '—'], ['主機數', hostsOf(c.k), 'ok']]))));
    return out;
  }
  const needs = String(v.needs).split(/[，,\s]+/).map(Number).filter(x => Number.isInteger(x) && x > 0 && x < 2 ** 24).slice(0, 8), r = vlsm(v.block, needs);
  if (!r || !needs.length) return [F('格式錯誤', '區塊請輸入 CIDR（例如 200.23.16.0/23），需求請輸入以逗號分隔的主機數（例如 120,60,10）。', '')];
  const total = 2 ** (32 - r.b.k), colors = ['p0', 'p1', 'p2', 'p3'];
  const barView = upto => `<div class="nx-addr">${r.order.slice(0, upto).map(({ i }, j) => r.res[i].fail ? '' : `<i class="${colors[j % 4]}" style="left:${(r.res[i].net - r.b.net) / total * 100}%;width:${2 ** (32 - r.res[i].k) / total * 100}%" title="${ipStr(r.res[i].net)}/${r.res[i].k}">${2 ** (32 - r.res[i].k) / total > 0.08 ? '/' + r.res[i].k : ''}</i>`).join('')}</div><div class="nx-addr-scale"><span>${ipStr(r.b.net)}</span><span>${ipStr(r.b.bc)}</span></div>`;
  const rows = upto => r.order.slice(0, upto).map(({ i }) => { const x = r.res[i]; return x.fail ? [x.h, `/${x.k}`, '<b class="nx-bad">空間不足</b>', '', ''] : [x.h, `/${x.k}（${2 ** (32 - x.k)}）`, `${ipStr(x.net)}/${x.k}`, `${ipStr(x.net + 1)} – ${ipStr(x.bc - 1)}`, ipStr(x.bc)]; });
  out.push(F(`區塊 ${ipStr(r.b.net)}/${r.b.k}：共 ${total} 個位址`, `需求依主機數由大到小排序：${r.order.map(o => o.h).join(' → ')}。由大到小配置，每個區塊的起點自然會對齊自己的大小，不會留下碎片。`, stage(barView(0))));
  r.order.forEach(({ h: hh, i }, j) => {
    const x = r.res[i];
    out.push(F(x.fail ? `${hh} 台：放不下` : `${hh} 台 → ${ipStr(x.net)}/${x.k}`, x.fail ? `需要 /${x.k}（${2 ** (32 - x.k)} 個位址），但區塊剩下的空間不夠。` : `最小的 k 使 2^k − 2 ≥ ${hh}：k = ${32 - x.k}，2^${32 - x.k} − 2 = ${hostsOf(x.k)}，所以用 /${x.k}。放在目前第一個空位 ${ipStr(x.net)}，它是 ${2 ** (32 - x.k)} 的倍數，符合對齊。`, stage(barView(j + 1), table(['主機數', '前綴（位址數）', '子網路', '可用範圍', '廣播'], rows(j + 1), j))));
  });
  const fails = r.res.filter(x => x.fail).length;
  out.push(F(fails ? `${fails} 個需求配置失敗` : '配置完成', `用掉 ${r.used} 個位址，剩下 ${total - r.used} 個留給日後擴充。${fails ? '可以向上申請更大的區塊，或縮減需求。' : ''}`, stage(barView(r.order.length), table(['主機數', '前綴（位址數）', '子網路', '可用範圍', '廣播'], rows(r.order.length)))));
  return out;
}

/* ───────────── 12 最長前綴匹配與 NAT ───────────── */
const LPM_TABLE = [['200.23.16.0/21', '介面 0'], ['200.23.24.0/24', '介面 1'], ['200.23.24.0/21', '介面 2'], ['200.23.0.0/16', '介面 3'], ['0.0.0.0/0', '介面 4（預設路由）']];
function lpm(table, dst) { let best = null; table.forEach(([p, port], i) => { const c = parseCidr(p); if (((dst & maskOf(c.k)) >>> 0) === c.net && (!best || c.k > best.k)) best = { i, k: c.k, port }; }); return best; }
function natRun() {
  const flows = [['out', '10.0.0.1', 3345, '128.119.40.186', 80], ['out', '10.0.0.2', 3345, '93.184.216.34', 443], ['in', '128.119.40.186', 80, '138.76.29.7', 5001], ['out', '10.0.0.1', 3346, '128.119.40.186', 80], ['in', '93.184.216.34', 443, '138.76.29.7', 5002], ['in', '203.0.113.9', 4444, '138.76.29.7', 6000]];
  const tab = [], log = []; let next = 5001;
  for (const [dir, a, ap, b, bp] of flows) {
    if (dir === 'out') { let e = tab.find(t => t.ip === a && t.port === ap); const fresh = !e; if (!e) { e = { ip: a, port: ap, pub: next++ }; tab.push(e); } log.push({ dir, before: `${a}:${ap} → ${b}:${bp}`, after: `138.76.29.7:${e.pub} → ${b}:${bp}`, fresh, row: tab.indexOf(e), tab: tab.map(t => ({ ...t })) }); }
    else { const e = tab.find(t => t.pub === bp); log.push({ dir, before: `${a}:${ap} → ${b}:${bp}`, after: e ? `${a}:${ap} → ${e.ip}:${e.port}` : null, row: e ? tab.indexOf(e) : -1, tab: tab.map(t => ({ ...t })) }); }
  }
  return log;
}
function lpmFrames(v) {
  const out = [];
  if (v.mode === 'nat') {
    const log = natRun(), tview = (tab, hi) => table(['公有埠', '內部位址'], tab.map(t => [`138.76.29.7:${t.pub}`, `${t.ip}:${t.port}`]), hi);
    out.push(F('家用 NAT：一個公有 IP 138.76.29.7', '內部主機用私有位址 10.0.0.x。NAT 路由器改寫每個出去與回來的封包，並用轉譯表記住對應關係。', stage(tview([], -1))));
    log.forEach((x, i) => out.push(F(x.dir === 'out' ? `出去：${x.before}` : `回來：${x.before}`, x.dir === 'out' ? `把來源改成公有 IP 與${x.fresh ? `新的埠號 ${x.after.split(' ')[0].split(':')[1]}，新增一筆轉譯項目` : '既有項目的埠號'}。${i === 1 ? '兩台內部主機都用 3345 埠也沒關係，NAT 給它們不同的公有埠。' : ''}目的位址不變。` : x.after ? `目的埠 ${x.before.split(':').pop()} 在轉譯表中，把目的改回內部位址，送進內部網路。` : '目的埠 6000 不在轉譯表中：NAT 不知道要交給誰，只能丟棄。外部無法主動連進來，在家架站需要設定埠轉送。', stage(kv([['改寫前', h(x.before)], ['改寫後', x.after ? h(x.after) : '丟棄', x.after ? 'ok' : 'bad']]), tview(x.tab, x.row)))));
    out.push(F('NAT 改寫了傳輸層的埠號', '路由器原本只處理到網路層，NAT 卻要修改 TCP / UDP 的埠號並重算檢查和。16 位元的埠號讓一個公有 IP 可同時支援約 6 萬條連線。', ''));
    return out;
  }
  const dst = parseIp(v.dst);
  if (dst === null) return [F('格式錯誤', '請輸入 IPv4 位址，例如 200.23.24.170。', '')];
  const best = lpm(LPM_TABLE, dst), checked = [];
  out.push(F(`目的位址 ${ipStr(dst)}`, '轉送表的每一項是一個前綴。目的位址的前 k 位元與前綴相同才算匹配；所有匹配的項目中，選前綴最長的。', stage(table(['前綴', '輸出'], LPM_TABLE.map(([p, o]) => [p, o])), kv([['目的位址二進位', ipBin(dst)]]))));
  LPM_TABLE.forEach(([p, port], i) => {
    const c = parseCidr(p), ok = ((dst & maskOf(c.k)) >>> 0) === c.net; checked.push(ok);
    out.push(F(`${p}：${ok ? '匹配' : '不匹配'}`, c.k === 0 ? '/0 不比較任何位元，所有位址都匹配，所以是預設路由。' : `比較前 ${c.k} 位元。${ok ? '完全相同，這是一個候選。' : '有位元不同，不符合。'}`, stage(table(['', `前 ${c.k} 位元 | 其餘`], [['前綴', ipBin(c.net, c.k)], ['目的', ipBin(dst, c.k)]]), table(['前綴', '輸出', '結果'], LPM_TABLE.map(([pp, o], j) => [pp, o, j < checked.length ? (checked[j] ? '✓ 匹配' : '✕') : '']), i))));
  });
  const cands = LPM_TABLE.filter((_, i) => checked[i]);
  out.push(F(`選擇 ${LPM_TABLE[best.i][0]} → ${best.port}`, `${cands.length} 個前綴匹配：${cands.map(c => c[0]).join('、')}。最長的是 /${best.k}，它描述的範圍最具體。`, stage(table(['前綴', '輸出', '結果'], LPM_TABLE.map(([pp, o], j) => [pp, o, checked[j] ? (j === best.i ? '<b>✓ 最長</b>' : '✓') : '✕']), best.i), kv([['輸出', h(best.port), 'ok']])), '試試 200.23.24.170、200.23.22.161、200.23.99.1 與 8.8.8.8。'));
  return out;
}

/* ───────────── 13 鏈路狀態：Dijkstra ───────────── */
const TOPO = {
  nodes: { u: [40, 125], v: [140, 40], w: [280, 40], x: [140, 210], y: [280, 210], z: [380, 125] },
  edges: [['u', 'v', 2], ['u', 'w', 5], ['u', 'x', 1], ['v', 'x', 2], ['v', 'w', 3], ['x', 'w', 3], ['x', 'y', 1], ['w', 'y', 1], ['w', 'z', 5], ['y', 'z', 2]]
};
function dijkstraRun(edges, nodes, src) {
  const adj = {}; nodes.forEach(n => { adj[n] = []; }); edges.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
  const D = {}, P = {}, done = [src], steps = []; nodes.forEach(n => { D[n] = Infinity; P[n] = null; }); D[src] = 0;
  adj[src].forEach(([v, w]) => { D[v] = w; P[v] = src; });
  steps.push({ add: src, D: { ...D }, P: { ...P }, done: done.slice(), upd: adj[src].map(([v]) => v) });
  while (done.length < nodes.length) {
    const cand = nodes.filter(n => !done.includes(n) && D[n] < Infinity).sort((a, b) => D[a] - D[b] || (a < b ? -1 : 1));
    if (!cand.length) break;
    const w = cand[0]; done.push(w); const upd = [];
    adj[w].forEach(([v, c]) => { if (!done.includes(v) && D[w] + c < D[v]) { D[v] = D[w] + c; P[v] = w; upd.push(v); } });
    steps.push({ add: w, D: { ...D }, P: { ...P }, done: done.slice(), upd });
  }
  const hop = {}; nodes.forEach(n => { if (n === src || P[n] === null) { hop[n] = null; return; } let x = n; while (P[x] !== src) x = P[x]; hop[n] = x; });
  return { steps, hop, D, P };
}
function dijkstraFrames(v) {
  const edges = v.weights === 'hop' ? TOPO.edges.map(([a, b]) => [a, b, 1]) : TOPO.edges, nodes = Object.keys(TOPO.nodes), src = v.src;
  const r = dijkstraRun(edges, nodes, src), out = [], key = (a, b) => [a, b].sort().join('-');
  const pic = st => { const nodeSt = {}, edgeSt = {}, labels = {}; nodes.forEach(n => { nodeSt[n] = n === st.add ? 'on' : st.done.includes(n) ? 'done' : ''; labels[n] = st.D[n] === Infinity ? '∞' : st.D[n]; if (st.P[n] && st.done.includes(n)) edgeSt[key(n, st.P[n])] = 'tree'; }); st.upd.forEach(n => { if (st.P[n]) edgeSt[key(n, st.P[n])] = edgeSt[key(n, st.P[n])] || 'cand'; }); return graph(TOPO.nodes, edges, { nodeSt, edgeSt, labels }); };
  const tbl = st => table(['節點', 'D(v)', 'p(v)', ''], nodes.filter(n => n !== src).map(n => [n, st.D[n] === Infinity ? '∞' : st.D[n], st.P[n] || '—', st.done.includes(n) ? '✓ 確定' : st.upd.includes(n) ? '更新' : '']), nodes.filter(n => n !== src).indexOf(st.add));
  r.steps.forEach((st, i) => out.push(F(i === 0 ? `初始化：N′ = {${src}}` : `第 ${i} 輪：加入 ${st.add}（D = ${st.D[st.add]}）`, i === 0 ? `與 ${src} 直接相鄰的節點，D 先設為鏈路成本；其他設為 ∞。圖上節點下方的數字是目前的 D。` : `${st.add} 是不在 N′ 中 D 最小的節點，它的最短距離就此確定。${st.upd.length ? `經由 ${st.add} 更新了 ${st.upd.map(n => `${n}（${st.D[n]}）`).join('、')}。` : `經由 ${st.add} 沒有找到更短的路。`}`, stage(pic(st), tbl(st)))));
  const ft = nodes.filter(n => n !== src).map(n => { const path = []; let x = n; while (x) { path.unshift(x); x = r.P[x]; } return [n, r.hop[n], r.D[n], path.join(' → ')]; });
  out.push(F(`${src} 的轉送表`, '沿著 p(v) 往回走到來源，就得到完整路徑；轉送表只需要記第一步（下一跳）。', stage(table(['目的地', '下一跳', '成本', '路徑'], ft))));
  return out;
}

/* ───────────── 14 距離向量 ───────────── */
function dvSync(cost, D0, poison, limit = 80, via0 = null) {
  // cost[x][v]：鄰居成本；D0、via0：起始距離矩陣與下一跳（省略時視為直達鄰居）；回傳每一回合的 { D, via }
  const n = cost.length, hist = []; let D = D0.map(r => r.slice()), via = via0 ? via0.map(r => r.slice()) : D0.map((r, x) => r.map((_, y) => x === y ? x : cost[x][y] !== undefined ? y : null));
  for (let r = 1; r <= limit; r++) {
    const ND = D.map(row => row.slice()), NV = via.map(row => row.slice());
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
      if (x === y) continue; let best = Infinity, bv = null;
      for (const [vs, c] of Object.entries(cost[x])) { const vv = +vs, adv = poison && via[vv][y] === x ? Infinity : D[vv][y]; if (c + adv < best) { best = c + adv; bv = vv; } }
      ND[x][y] = best; NV[x][y] = bv;
    }
    const changed = ND.some((row, x) => row.some((d, y) => d !== D[x][y]));
    D = ND; via = NV;
    if (!changed) break;
    hist.push({ D: D.map(r => r.slice()), via: via.map(r => r.slice()) });
  }
  return hist;
}
const DVN = ['x', 'y', 'z'];
function dvScenario(sc) {
  if (sc === 'init') { const cost = [{ 1: 2, 2: 7 }, { 0: 2, 2: 1 }, { 0: 7, 1: 1 }], D0 = [[0, 2, 7], [2, 0, 1], [7, 1, 0]]; return { cost, D0, hist: dvSync(cost, D0, false), text: '三個節點剛啟動，只知道到鄰居的成本：x–y 2、y–z 1、x–z 7。' }; }
  const old = [{ 1: 4, 2: 50 }, { 0: 4, 2: 1 }, { 0: 50, 1: 1 }], start = [[0, 4, 5], [4, 0, 1], [5, 1, 0]];
  const nc = sc === 'good' ? 1 : 60, cost = [{ 1: nc, 2: 50 }, { 0: nc, 2: 1 }, { 0: 50, 1: 1 }];
  const poison = sc === 'poison';
  // 起始狀態：已收斂（y 直達 x、z 經由 y 到 x）
  return { cost, D0: start, hist: dvSync(cost, start, poison, 80, [[0, 1, 1], [0, 1, 2], [1, 1, 2]]), poison, text: `原本 x–y 4、y–z 1、x–z 50，已經收斂：y 到 x 是 4（直達），z 到 x 是 5（經由 y）。現在 x–y 的成本變成 ${nc}。${poison ? '這次使用毒性逆轉：z 經由 y 到 x，所以 z 告訴 y「我到 x 是 ∞」。' : ''}` };
}
function dvFrames(v) {
  const s = dvScenario(v.scenario), out = [], cell2 = (d, via, x, ch) => `${ch ? '<b class="nx-hl">' : ''}${d === Infinity ? '∞' : d}${ch ? '</b>' : ''}${via !== null && via !== x ? `<small> via ${DVN[via]}</small>` : ''}`;
  const view = (D, via, prev) => table(['節點', '到 x', '到 y', '到 z'], D.map((r, x) => [DVN[x], ...r.map((d, y) => cell2(d, via ? via[x][y] : null, x, prev && prev[x][y] !== d))]));
  out.push(F('起始狀態', s.text, stage(view(s.D0, null, null))));
  const H = s.hist, show = H.map((_, i) => i).filter(i => H.length <= 10 || i < 6 || i === H.length - 1 || (i + 1) % 10 === 0);
  show.forEach(i => {
    const prev = i ? H[i - 1].D : s.D0, cur = H[i], dy = cur.D[1][0], dz = cur.D[2][0];
    const skipped = i > 0 && !show.includes(i - 1) ? `（中間省略 ${i - show[show.indexOf(i) - 1] - 1} 回合）` : '';
    out.push(F(`第 ${i + 1} 回合`, `${skipped}每個節點用上一回合鄰居的向量重算 Dx(y) = min_v { c(x, v) + Dv(y) }。y 到 x：${dy === Infinity ? '∞' : dy}，z 到 x：${dz === Infinity ? '∞' : dz}。粗體是這回合改變的值。`, stage(view(cur.D, cur.via, prev))));
  });
  const n = H.length, bad = v.scenario === 'bad';
  out.push(F(`${n} 回合後收斂`, v.scenario === 'good' ? '成本下降是好消息：新的較短距離每回合往外傳一跳，很快就收斂。' : bad ? `成本上升是壞消息：y 以為可以經由 z 到 x（z 的 5 其實是經由 y 自己），z 又以為可以經由 y……兩者每回合輪流加一點，花了 ${n} 回合才讓 z 改走直達的 50。若鏈路完全斷線，會一直數到無限大。` : v.scenario === 'poison' ? `毒性逆轉讓 y 一開始就不會選擇經由 z，只花 ${n} 回合就收斂。和不使用毒性逆轉的情況比較看看。` : `每個節點只和鄰居交換向量，${n} 回合後就得到全網的最短距離。`, stage(view(n ? H[n - 1].D : s.D0, n ? H[n - 1].via : null, null), kv([['收斂回合數', n, bad ? 'bad' : 'ok']]))));
  return out;
}

/* ───────────── 15 分段與 traceroute ───────────── */
function fragment(dataLen, mtu, offset = 0, last = true) {
  const max = Math.floor((mtu - 20) / 8) * 8;
  if (dataLen <= mtu - 20) return [{ len: dataLen, off: offset / 8, mf: last ? 0 : 1 }];
  const out = []; let pos = 0;
  while (pos < dataLen) { const n = Math.min(max, dataLen - pos), fin = pos + n === dataLen; out.push({ len: n, off: (offset + pos) / 8, mf: fin && last ? 0 : 1 }); pos += n; }
  return out;
}
function fragFrames(v) {
  const out = [];
  if (v.mode === 'trace') {
    const hops = v.hops, names = Array.from({ length: hops }, (_, i) => `R${i + 1}`), all = ['你', ...names, '目的地'];
    out.push(F('traceroute：TTL 從 1 開始', `目的地在 ${hops + 1} 跳之外，中間有 ${hops} 台路由器。每台路由器把 TTL 減 1，減到 0 就丟棄並回 ICMP「逾時」（類型 11）。`, stage(pipe(all, 0))));
    for (let t = 1; t <= hops + 1; t++) {
      const reach = t > hops, at = Math.min(t, hops + 1), rtt = (t * 9.5 + (t % 2) * 1.3).toFixed(1);
      const ttlRow = row(all.map((n, i) => cell(n, i === 0 ? `TTL ${t}` : i <= t ? `TTL ${Math.max(0, t - i)}` : '', i === at ? (reach ? 'done' : 'bad') : i < at ? 'on' : 'faint')), 'tight');
      out.push(F(reach ? `TTL = ${t}：抵達目的地` : `TTL = ${t}：${names[t - 1]} 回報`, reach ? '探測封包終於抵達目的主機。traceroute 用的是一個不太可能有人在聽的 UDP 埠，所以目的主機回 ICMP「埠無法到達」（類型 3 代碼 3），traceroute 就知道到終點了。' : `TTL 在 ${names[t - 1]} 減為 0，它丟棄封包並回 ICMP 逾時，來源位址就是它自己，於是你知道第 ${t} 跳是 ${names[t - 1]}，RTT 約 ${rtt} ms。`, stage(ttlRow, kv([['探測 TTL', t], ['回應', reach ? 'ICMP 3/3 埠無法到達' : 'ICMP 11 逾時', reach ? 'ok' : ''], ['RTT', `${rtt} ms`]]))));
    }
    out.push(F('得到整條路徑', `每一跳通常送 3 個探測取得 3 個 RTT。若某台路由器不回 ICMP，就會顯示 * * *；負載平衡也可能讓不同探測走不同的路。`, stage(table(['跳', '路由器', 'RTT'], all.slice(1).map((n, i) => [i + 1, n, `${((i + 1) * 9.5 + ((i + 1) % 2) * 1.3).toFixed(1)} ms`])))));
    return out;
  }
  const total = v.len, data = total - 20, m1 = +v.mtu1, m2 = +v.mtu2;
  if (data <= 0) return [F('長度太小', '總長度要大於 20 位元組的 IP 標頭。', '')];
  const f1 = fragment(data, m1), view = (fs, hi = -1) => table(['片段', '總長度', '資料', '位移欄位', '位元組位置', 'MF'], fs.map((f, i) => [i + 1, f.len + 20, f.len, f.off, f.off * 8, f.mf]), hi);
  out.push(F(`${total} 位元組的資料包`, `20 位元組標頭 + ${data} 位元組資料，識別碼 777。第一段鏈路的 MTU 是 ${m1}，每片最多攜帶 ${m1 - 20} 位元組資料，而且除了最後一片，資料長度要是 8 的倍數：${Math.floor((m1 - 20) / 8) * 8}。`, stage(kv([['總長度', total], ['資料', data], ['MTU', m1]]))));
  if (f1.length === 1) out.push(F('不需要分段', `資料包比 MTU 小，直接送出。`, stage(view(f1))));
  else f1.forEach((f, i) => out.push(F(`第一次分段：片段 ${i + 1}`, `攜帶資料第 ${f.off * 8}–${f.off * 8 + f.len - 1} 位元組，位移欄位 = ${f.off * 8} / 8 = ${f.off}，${f.mf ? 'MF = 1（後面還有）' : 'MF = 0（最後一片）'}。每一片都有自己的 20 位元組標頭，識別碼都是 777。`, stage(view(f1.slice(0, i + 1), i)))));
  let fin = f1;
  if (m2) {
    fin = f1.flatMap(f => fragment(f.len, m2, f.off * 8, f.mf === 0));
    out.push(F(`下一段鏈路 MTU ${m2}：再分段`, `每片最多 ${Math.floor((m2 - 20) / 8) * 8} 位元組資料。片段可以再被切開：位移要加上原本的位置，只有原始資料的最後一段 MF 才是 0。`, stage(view(fin))));
  }
  out.push(F(`目的主機收到 ${fin.length} 片`, `依識別碼把片段收集起來，依位移排序；收到 MF = 0 的那片並且中間沒有缺口，才能重組出原本的 ${data} 位元組。任何一片遺失，整個資料包都作廢。多出來的標頭負擔：${(fin.length - 1) * 20} 位元組。`, stage(view(fin), kv([['片段數', fin.length], ['額外標頭', `${(fin.length - 1) * 20} B`]]))));
  return out;
}

/* ───────────── 16 CRC ───────────── */
function crcSteps(bits, gen) {
  const r = gen.length - 1, w = [...bits + '0'.repeat(r)].map(Number), g = [...gen].map(Number), steps = [];
  for (let i = 0; i < bits.length; i++) if (w[i]) { for (let j = 0; j < g.length; j++) w[i + j] ^= g[j]; steps.push({ i, w: w.slice() }); }
  return { rem: w.slice(-r).join(''), steps, r };
}
function crcCheck(frame, gen) { const g = [...gen].map(Number), w = [...frame].map(Number); for (let i = 0; i + g.length <= w.length; i++) if (w[i]) for (let j = 0; j < g.length; j++) w[i + j] ^= g[j]; return w.slice(-(g.length - 1)).join(''); }
function crcFrames(v) {
  const bits = String(v.data).replace(/[^01]/g, '').slice(0, 24), gen = v.gen, out = [];
  if (!bits) return [F('沒有資料', '請輸入由 0 與 1 組成的資料位元，例如 101110。', '')];
  const { rem, steps, r } = crcSteps(bits, gen), W = bits.length + r;
  const bitRow = (arr, from, to, done) => row(arr.map((b, k) => cell(b, k < bits.length ? '' : 'r', k >= from && k < to ? 'on' : k < done ? 'faint' : k >= bits.length ? 'done' : '')), 'tight left');
  out.push(F(`D = ${bits}，G = ${gen}`, `生成多項式有 ${gen.length} 位元，所以餘數 r = ${r} 位元。先在資料後面補 ${r} 個 0（標 r 的位置）。`, stage(bitRow([...bits + '0'.repeat(r)], -1, -1, 0))));
  let prev = [...bits + '0'.repeat(r)].map(Number);
  steps.forEach((s, k) => { out.push(F(`第 ${s.i + 1} 位是 1：XOR ${gen}`, `把 G 對齊第 ${s.i + 1} 位做 XOR（模 2 減法，不借位）。${k === steps.length - 1 ? '這是最後一次 XOR。' : '接著往右找下一個 1。'}`, stage(cap('XOR 之前'), bitRow(prev, s.i, s.i + gen.length, s.i), cap('XOR 之後'), bitRow(s.w, s.i, s.i + gen.length, s.i)))); prev = s.w; });
  out.push(F(`餘數 R = ${rem}`, `處理完原本的 ${bits.length} 個資料位元後，最後 ${r} 位就是 CRC。傳送 ${bits}${rem}，它可以被 G 整除。`, stage(row([...bits].map(b => cell(b)).concat([...rem].map(b => cell(b, 'CRC', 'done'))), 'tight left'))));
  const frame = bits + rem, k = v.flip, recv = k >= 0 && k < W ? frame.slice(0, k) + (frame[k] === '0' ? '1' : '0') + frame.slice(k + 1) : frame, chk = crcCheck(recv, gen), ok = /^0+$/.test(chk);
  out.push(F(ok ? (recv === frame ? '接收端：餘數為 0，接受' : '接收端：沒有偵測到錯誤') : '接收端：偵測到錯誤', `${recv === frame ? '傳送途中沒有錯誤。' : `第 ${k + 1} 位在途中翻轉。`}接收端用同一個 G 除收到的 ${recv}，餘數 ${chk}。${ok ? (recv === frame ? '' : '這個錯誤剛好讓整串仍能被 G 整除，極少發生。') : '不是全 0，丟棄這個訊框。'}`, stage(row([...recv].map((b, j) => cell(b, '', j === k ? 'bad' : '')), 'tight left'), kv([['餘數', chk, ok ? 'ok' : 'bad'], ['判定', ok ? '接受' : '丟棄', ok && recv === frame ? 'ok' : ok ? 'bad' : '']]))));
  return out;
}

/* ───────────── 17 CSMA/CD 二元指數退避 ───────────── */
function backoffRun(n, seed, maxSlot = 120) {
  const r = rng(seed * 7919 + 13), st = Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(65 + i), next: 0, col: 0, k: null, done: null })), slots = [];
  for (let t = 0; t < maxSlot && st.some(s => s.done === null); t++) {
    const tx = st.filter(s => s.done === null && s.next === t);
    if (tx.length === 1) { tx[0].done = t; slots.push({ t, kind: 'ok', who: [tx[0].id], st: st.map(s => ({ ...s })) }); }
    else if (tx.length > 1) {
      const picks = tx.map(s => { s.col++; const range = 2 ** Math.min(s.col, 10); s.k = Math.floor(r() * range); s.next = t + 1 + s.k; return `${s.id} 第 ${s.col} 次碰撞，從 0–${range - 1} 抽到 K = ${s.k}，第 ${s.next + 1} 個時槽再試`; });
      slots.push({ t, kind: 'col', who: tx.map(s => s.id), picks, st: st.map(s => ({ ...s })) });
    } else slots.push({ t, kind: 'idle', who: [], st: st.map(s => ({ ...s })) });
  }
  return { slots, st };
}
function backoffFrames(v) {
  const { slots, st } = backoffRun(v.n, v.seed), out = [];
  const line = upto => row(slots.slice(0, upto + 1).map(s => cell(s.kind === 'ok' ? s.who[0] : s.kind === 'col' ? '✕' : '·', s.t + 1, s.kind === 'ok' ? 'done' : s.kind === 'col' ? 'bad' : 'faint')), 'tight left');
  const tbl = s => table(['站', '碰撞次數', '上次抽到的 K', '狀態'], s.st.map(x => [x.id, x.col, x.k === null ? '—' : x.k, x.done !== null ? `第 ${x.done + 1} 時槽成功` : `等第 ${x.next + 1} 時槽`]));
  out.push(F(`${v.n} 個站同時有訊框要送`, '時間切成時槽（一個時槽 = 512 位元時間）。所有站在第 1 個時槽都感測到通道閒置，同時開始傳送。', stage(tbl({ st: st.map(s => ({ ...s, col: 0, k: null, done: null, next: 0 })) }))));
  let k = 0;
  slots.forEach((s, i) => {
    if (s.kind === 'idle') { const nextBusy = slots.findIndex((x, j) => j > i && x.kind !== 'idle'); if (nextBusy > 0 && slots[i - 1] && slots[i - 1].kind === 'idle') return; }
    k++;
    out.push(F(s.kind === 'ok' ? `時槽 ${s.t + 1}：${s.who[0]} 成功` : s.kind === 'col' ? `時槽 ${s.t + 1}：${s.who.join('、')} 碰撞` : `時槽 ${s.t + 1}：閒置`, s.kind === 'ok' ? `只有 ${s.who[0]} 在這個時槽傳送，沒有碰撞，訊框成功送出。` : s.kind === 'col' ? `${s.who.length} 個站同時傳送，偵測到碰撞立刻中止並送出干擾訊號。${s.picks.join('；')}。` : '這個時槽沒有人傳送，大家都還在退避等待。', stage(line(i), tbl(s))));
  });
  const end = Math.max(...st.map(s => s.done === null ? 0 : s.done)) + 1, cols = slots.filter(s => s.kind === 'col').length;
  out.push(F(`${end} 個時槽內全部送完`, `共發生 ${cols} 次碰撞。碰撞次數越多，K 的範圍越大（1 → 2 → 4 → 8 …），各站越容易錯開。換一個亂數種子看看不同的抽籤結果。`, stage(line(slots.length - 1), kv([['總時槽', end], ['碰撞', cols, cols ? 'bad' : 'ok'], ['效率', `${(v.n / end * 100).toFixed(0)}%`]]))));
  return out;
}

/* ───────────── 18 交換器自我學習與 ARP ───────────── */
const HOSTS = { A: 1, B: 1, C: 3, D: 4, E: 2 };
function switchRun(seq) {
  const tab = {}, log = [];
  for (const [s, d] of seq) {
    const inp = HOSTS[s], learned = !(s in tab) || tab[s] !== inp; tab[s] = inp;
    let act, ports;
    if (d === '*' || !(d in tab)) { act = 'flood'; ports = [1, 2, 3, 4].filter(p => p !== inp); }
    else if (tab[d] === inp) { act = 'filter'; ports = []; }
    else { act = 'forward'; ports = [tab[d]]; }
    log.push({ s, d, inp, act, ports, learned, tab: { ...tab } });
  }
  return log;
}
function switchFrames(v) {
  const out = [];
  if (v.mode === 'arp') {
    const other = v.target === 'other', tip = other ? '8.8.8.8' : '192.168.1.20', ask = other ? '192.168.1.1' : '192.168.1.20', who = other ? '預設閘道 R' : '主機 B';
    const cols = ['主機 A', '交換器', other ? '路由器 R' : '主機 B', '主機 C'];
    out.push(F(`A（192.168.1.10/24）要送封包給 ${tip}`, `先用遮罩判斷：${tip} ${other ? '不在' : '也在'} 192.168.1.0/24 裡，所以${other ? '要交給預設閘道 192.168.1.1，需要的是閘道的 MAC，而不是 8.8.8.8 的 MAC' : '可以直接送，需要 B 的 MAC'}。A 的 ARP 快取裡沒有 ${ask}。`, stage(kv([['目的 IP', tip], ['要查的 IP', ask], ['ARP 快取', '沒有']]))));
    const m = [L(0, 1, `ARP 請求：誰是 ${ask}？`, 'on'), L(1, 2, '廣播', 'on'), L(1, 3, '廣播', 'on')];
    out.push(F('廣播 ARP 請求', `目的 MAC 是 FF:FF:FF:FF:FF:FF，交換器把它送到所有埠。請求裡帶著 A 的 IP 與 MAC。`, stage(ladder(cols, m))));
    out.push(F(`${who}單播回覆`, `只有擁有 ${ask} 的介面回應，而且直接單播給 A（它從請求中得知 A 的 MAC）。C 收到請求但不是問它，直接忽略；${other ? 'R' : 'B'} 順便把 A 的 IP 與 MAC 記進自己的快取。`, stage(ladder(cols, [...m.map(x => ({ ...x, st: '' })), L(2, 1, `${ask} 在 ${other ? 'R:aa' : 'B:22'}`, 'on'), L(1, 0, '單播', 'on')]))));
    out.push(F('寫入 ARP 快取，送出訊框', `A 把 ${ask} → ${other ? 'R:aa' : 'B:22'} 存入快取（約 20 分鐘後過期）。訊框的目的 MAC 是 ${other ? 'R 的介面；IP 標頭的目的仍是 8.8.8.8，R 收到後會在下一個網段再做一次 ARP' : 'B'}。`, stage(kv([['訊框目的 MAC', other ? 'R:aa' : 'B:22', 'ok'], ['IP 目的', tip], ['ARP 快取', `${ask} → ${other ? 'R:aa' : 'B:22'}`]]))));
    return out;
  }
  const seq = String(v.frames).split(/[，,\s]+/).map(p => p.toUpperCase().match(/^([A-E])>([A-E*])$/)).filter(Boolean).map(m => [m[1], m[2]]).slice(0, 10);
  if (!seq.length) return [F('沒有訊框', '用「來源>目的」描述訊框，以逗號分隔，例如 A>D,D>A,B>A,C>*。主機 A–E，* 表示廣播。', '')];
  const log = switchRun(seq), ports = t => row([1, 2, 3, 4].map(p => cell(`埠 ${p}`, Object.keys(HOSTS).filter(x => HOSTS[x] === p).join(' '), t && t.inp === p ? 'on' : t && t.ports.includes(p) ? 'done' : '')), 'tight');
  out.push(F('交換器剛開機，轉送表是空的', '主機接在交換器的埠上：A 與 B 經由一台集線器共用埠 1，E 在埠 2，C 在埠 3，D 在埠 4。', stage(ports(null), table(['MAC', '埠'], []))));
  log.forEach((x, i) => out.push(F(`${x.s} → ${x.d === '*' ? '廣播' : x.d}：${{ flood: '氾濫', filter: '過濾', forward: '轉送' }[x.act]}`, `${x.learned ? `從埠 ${x.inp} 收到來源 ${x.s}，學到「${x.s} 在埠 ${x.inp}」。` : `${x.s} 已在表中，更新時間。`}${x.act === 'flood' ? (x.d === '*' ? '廣播訊框一律送到其他所有埠。' : `表中沒有 ${x.d}，只好從其他所有埠送出（${x.ports.join('、')}）。`) : x.act === 'filter' ? `${x.d} 也在埠 ${x.inp}，訊框早已在那一側被收到，不必轉送，丟棄。` : `表中 ${x.d} 在埠 ${x.ports[0]}，只從那個埠送出。`}`, stage(ports(x), table(['MAC', '埠'], Object.entries(x.tab).map(([m, p]) => [m, p]), Object.keys(x.tab).indexOf(x.s))))));
  out.push(F('交換器學會了位置', '不需要任何設定，交換器只靠觀察來源位址就建立轉送表。表項會老化（例如 5 分鐘沒更新就刪除），主機搬到別的埠時就能重新學習。', ''));
  return out;
}

/* ───────────── 19 Diffie-Hellman 與 TLS ───────────── */
const GEN = { 23: 5, 47: 5, 97: 5, 101: 2 };
function modpowSteps(g, e, p) { const bits = e.toString(2), steps = []; let r = 1; for (const b of bits) { r = r * r % p; const sq = r; if (b === '1') r = r * g % p; steps.push({ b, sq, r }); } return { r, steps, bits }; }
const modpow = (g, e, p) => modpowSteps(g, e, p).r;
function dhFrames(v) {
  const p = +v.p, g = GEN[p], a = Math.min(Math.max(v.a, 2), p - 2), b = Math.min(Math.max(v.b, 2), p - 2), A = modpow(g, a, p), B = modpow(g, b, p), K = modpow(B, a, p), out = [];
  if (v.mode === 'tls13' || v.mode === 'tls12') {
    const t13 = v.mode === 'tls13', cols = ['瀏覽器', '伺服器'];
    const msgs = t13 ? [['ClientHello + key share（g^a）', 0, '瀏覽器送出支援的加密套件、隨機數，以及自己的 DH 公開值。'], ['ServerHello + key share（g^b）', 1, '伺服器選定套件並送出自己的 DH 公開值。從這一刻起雙方都能算出 g^(ab)，之後的訊息全部加密。'], ['{Certificate, CertificateVerify, Finished}', 1, '憑證證明「這個網域的公鑰是 K」；CertificateVerify 用憑證私鑰對整個交握紀錄簽章，證明伺服器真的持有私鑰，也防止中間人竄改 DH 公開值。'], ['{Finished} + HTTP 請求', 0, '瀏覽器驗證憑證鏈、主機名稱與簽章後送出 Finished，並立刻附上加密的 HTTP 請求。'], ['{HTTP 回應}', 1, '交握只花了 1 個 RTT。']]
      : [['ClientHello', 0, '瀏覽器送出支援的套件與隨機數。TLS 1.2 還不知道伺服器會選哪一種金鑰交換，所以先不送 DH 公開值。'], ['ServerHello, Certificate, ServerKeyExchange, Done', 1, '伺服器選定套件、送出憑證與簽署過的 DH 公開值。'], ['ClientKeyExchange, ChangeCipherSpec, Finished', 0, '瀏覽器送出自己的 DH 公開值並切換到加密。'], ['ChangeCipherSpec, Finished', 1, '伺服器確認。交握花了 2 個 RTT。'], ['{HTTP 請求}', 0, '直到第 3 個 RTT 才開始送應用資料。'], ['{HTTP 回應}', 1, '比 TLS 1.3 多等了 1 個 RTT。']];
    out.push(F(t13 ? 'TLS 1.3 交握' : 'TLS 1.2 交握', 'TCP 三向交握已完成。接下來建立加密通道：交換金鑰、驗證伺服器身分。大括號 {} 表示該訊息已加密。', stage(ladder(cols, []))));
    msgs.forEach((m, i) => out.push(F(m[0], m[2], stage(ladder(cols, msgs.slice(0, i + 1).map((x, j) => L(x[1], 1 - x[1], x[0], j === i ? 'on' : '')))))));
    out.push(F(t13 ? '1 個 RTT 完成交握' : '2 個 RTT 完成交握', t13 ? 'TLS 1.3 第一個訊息就帶著 DH 公開值，並且只允許具前向保密的臨時金鑰交換；之前連過的網站還能用 0-RTT 直接送資料（有重放風險）。' : '把模式換成 TLS 1.3，比較少了哪一趟來回。', stage(kv([['交握 RTT', t13 ? 1 : 2, t13 ? 'ok' : 'bad'], ['第一個請求送出', `第 ${t13 ? 2 : 3} 個 RTT`]]))));
    return out;
  }
  const sa = modpowSteps(g, a, p);
  out.push(F(`公開參數 p = ${p}、g = ${g}`, `p 是質數、g 是模 p 的原根。這兩個數所有人都知道，包括竊聽者。Alice 選祕密 a = ${a}，Bob 選祕密 b = ${b}，從不傳送。`, stage(kv([['p', p], ['g', g], ['Alice 的祕密 a', a], ['Bob 的祕密 b', b]]))));
  out.push(F(`Alice 算 A = g^a mod p = ${A}`, `用快速冪：由高到低看 a 的二進位 ${sa.bits}，每一位先平方，該位是 1 再乘 g，每一步都取 mod p，數字永遠不會超過 p²。共 ${sa.steps.length} 步，而不是 ${a} 次乘法。`, stage(table(['位元', '平方後', '結果'], sa.steps.map(s => [s.b, s.sq, `<b>${s.r}</b>`]), sa.steps.length - 1))));
  out.push(F(`公開交換 A = ${A}、B = ${B}`, `Bob 同樣算出 B = ${g}^${b} mod ${p} = ${B}。兩人在公開的網路上交換 A 與 B，竊聽者看得到。`, stage(ladder(['Alice', '竊聽者 Eve', 'Bob'], [L(0, 2, `A = ${A}`, 'on'), L(2, 0, `B = ${B}`, 'on')]))));
  if (v.mode === 'mitm') {
    const m = Math.min(p - 2, 3 + (a + b) % (p - 4)), Mv = modpow(g, m, p), KA = modpow(Mv, a, p), KB = modpow(Mv, b, p);
    out.push(F('中間人 Mallory 攔截並替換', `Mallory 選自己的祕密 m = ${m}，把 A 與 B 都攔下，分別送出自己的 M = ${Mv}。Alice 以為 M 來自 Bob，Bob 以為 M 來自 Alice。`, stage(ladder(['Alice', 'Mallory', 'Bob'], [L(0, 1, `A = ${A}`, ''), L(1, 2, `M = ${Mv}（冒充 Alice）`, 'bad'), L(2, 1, `B = ${B}`, ''), L(1, 0, `M = ${Mv}（冒充 Bob）`, 'bad')]))));
    out.push(F('兩把不同的金鑰', `Alice 算出 M^a = ${KA}，Bob 算出 M^b = ${KB}，Mallory 兩把都算得出來：她解密 Alice 的訊息、讀完、再用另一把加密轉給 Bob。雙方都沒發現。`, stage(kv([['Alice ↔ Mallory', KA, 'bad'], ['Mallory ↔ Bob', KB, 'bad']])), '解法：伺服器要用憑證的私鑰對 DH 公開值簽章，客戶端驗證憑證後才相信它（TLS 就是這麼做的）。'));
    return out;
  }
  out.push(F(`雙方算出相同的祕密 ${K}`, `Alice 算 B^a = ${B}^${a} mod ${p} = ${K}；Bob 算 A^b = ${A}^${b} mod ${p} = ${modpow(A, b, p)}。因為 (g^b)^a = (g^a)^b = g^(ab)。`, stage(kv([['Alice：B^a mod p', K, 'ok'], ['Bob：A^b mod p', modpow(A, b, p), 'ok']]))));
  const cands = []; for (let x = 1; x < p; x++) if (modpow(g, x, p) === A) cands.push(x);
  out.push(F('竊聽者只能硬試', `Eve 知道 p、g、A、B，要找 x 使 ${g}^x ≡ ${A}（mod ${p}）：試遍 1 到 ${p - 1} 得到 x = ${cands.join('、')}。p 這麼小一下就找到了；實務上 p 有 2048 位元，這個「離散對數問題」目前沒有可行的解法。`, stage(kv([['Eve 找到的 a', cands.join('、'), 'bad'], ['實務上的 p', '2048 位元']])), 'Diffie-Hellman 本身不驗證身分；切換到「中間人攻擊」看看會發生什麼事。'));
  return out;
}

/* ───────────── 20 一個網頁請求的一生 ───────────── */
function journeyPlan(v) {
  const lan = 2, steps = [];
  if (v.fresh === 'boot') {
    steps.push({ name: 'DHCP', t: 2 * lan, proto: 'UDP 68 → 67（廣播）', mac: 'A → FF:FF:FF:FF:FF:FF', ip: '0.0.0.0 → 255.255.255.255', text: 'Discover、Offer、Request、ACK 四則訊息（2 個區網 RTT）：筆電取得 IP 192.168.1.10/24、預設閘道 192.168.1.1、DNS 伺服器 168.95.1.1。' });
    steps.push({ name: 'ARP', t: lan, proto: 'ARP（不是 IP）', mac: 'A → FF:FF:FF:FF:FF:FF；回覆單播', ip: '查 192.168.1.1', text: 'DNS 伺服器不在本子網路，所以先要問出預設閘道的 MAC。' });
  }
  if (v.dns !== 'cached') steps.push({ name: 'DNS', t: v.dnsRtt, proto: 'UDP 51000 → 53', mac: 'A → 閘道 R', ip: '192.168.1.10 → 168.95.1.1', text: `DNS 查詢經過閘道與 ISP 的路由器到達本地 DNS 伺服器；它必要時迭代查詢根、TLD、權威伺服器，回覆 www.example.com 的 IP。` });
  steps.push({ name: 'TCP', t: v.rtt, proto: 'TCP 51001 → 443（SYN）', mac: 'A → 閘道 R', ip: '192.168.1.10 → 93.184.216.34', text: '三向交握：SYN、SYN+ACK 花 1 個 RTT，ACK 可以和下一個訊息一起送。（若經過 NAT，出去時來源會被改寫成公有 IP。）' });
  steps.push({ name: `TLS ${v.tls}`, t: v.rtt * (v.tls === '1.2' ? 2 : 1), proto: 'TCP 51001 → 443', mac: 'A → 閘道 R', ip: '192.168.1.10 → 93.184.216.34', text: v.tls === '1.2' ? 'TLS 1.2 交握要 2 個 RTT 才能開始送應用資料。' : 'TLS 1.3 第一個訊息就帶 DH 公開值，1 個 RTT 完成交握並驗證伺服器憑證。' });
  steps.push({ name: 'HTTP', t: v.rtt, proto: 'TCP 51001 → 443（加密）', mac: 'A → 閘道 R', ip: '192.168.1.10 → 93.184.216.34', text: '送出 GET / 並收到 HTML（1 個 RTT，忽略傳輸時間）。之後同網域的圖片、CSS 可以在同一條連線上並行請求。' });
  return steps;
}
function journeyFrames(v) {
  const steps = journeyPlan(v), names = steps.map(s => s.name), out = [];
  out.push(F('按下 Enter', `${v.fresh === 'boot' ? '筆電剛連上 Wi-Fi，還沒有 IP。' : '筆電已經有 IP 與閘道的 ARP 快取。'}${v.dns === 'cached' ? 'DNS 結果已在快取中。' : ''}到伺服器的 RTT 是 ${v.rtt} ms，到本地 DNS 伺服器 ${v.dnsRtt} ms。`, stage(pipe(names, -1))));
  let total = 0;
  steps.forEach((s, i) => {
    total += s.t;
    out.push(F(`${s.name}：+${s.t} ms`, s.text, stage(pipe(names, i), kv([['傳輸層', h(s.proto)], ['乙太網路', h(s.mac)], ['IP', h(s.ip)], ['累計', `${total} ms`, 'ok']]))));
  });
  out.push(F(`${total} ms 後收到 HTML`, `時間大多花在往返上：${steps.map(s => `${s.name} ${s.t}`).join('、')}（毫秒）。${v.tls === '1.2' ? '換成 TLS 1.3 可省 1 個 RTT；' : ''}CDN 把伺服器放得更近，可以縮短每一個 RTT。`, stage(bars(steps.map(s => [s.name, s.t, total, `${s.t} ms`]))), '頁面上的每個子資源若在不同網域，還要再做一次 DNS、TCP 與 TLS。'));
  return out;
}

/* ───────────── 註冊 ───────────── */
const LABS = {
  switching: { title: '封包交換：儲存轉送管線', prompt: '先猜：把訊息切成 3 個封包經過 3 段鏈路，比整份送快多少？', inputs: [['mode', '傳送方式', 'select', 'packet', [['packet', '切成多個封包'], ['message', '整份訊息當一個封包']]], ['P', '封包數 P（1–6）', 'number', 3, [1, 6, 1]], ['N', '鏈路數 N（1–4）', 'number', 3, [1, 4, 1]]], frames: switchingFrames },
  delay: { title: '四種延遲與排隊', prompt: '先猜：頻寬變成 10 倍，跨洋封包的延遲會變成多少？', inputs: [['mode', '模式', 'select', 'nodal', [['nodal', '一跳的四種延遲'], ['queue', '流量強度與佇列']]], ['L', '封包大小', 'select', '1500', [['64', '64 位元組'], ['576', '576 位元組'], ['1500', '1500 位元組'], ['9000', '9000 位元組']]], ['R', '鏈路速率', 'select', '10000000', [['1000000', '1 Mbps'], ['10000000', '10 Mbps'], ['100000000', '100 Mbps'], ['1000000000', '1 Gbps']]], ['dist', '距離', 'select', '3000000', [['1000', '1 km（區網）'], ['300000', '300 km'], ['3000000', '3000 km'], ['12000000', '12000 km（跨洋）']]], ['queued', '前面排隊的封包數', 'number', 2, [0, 20, 1]], ['rho', '流量強度（佇列模式）', 'select', '0.9', [['0.5', '0.5'], ['0.9', '0.9'], ['1.2', '1.2']]]], frames: delayFrames },
  encap: { title: '封裝、轉送與解封裝', prompt: '先猜：經過路由器時，哪些欄位會改變？', inputs: [['app', '應用', 'select', 'https', [['https', 'HTTPS（TCP）'], ['dns', 'DNS（UDP）']]], ['hops', '路由器數量', 'number', 2, [1, 3, 1]]], frames: encapFrames },
  http: { title: 'HTTP 連線方式與 RTT', prompt: '先猜：1 個 HTML 加 4 張圖，非持續連線要幾個 RTT？持續連線呢？', inputs: [['mode', '連線方式', 'select', 'np', [['np', '非持續、一次一條'], ['npp', '非持續、5 條平行'], ['p', '持續、不管線化'], ['pp', '持續、管線化']]], ['n', '圖片數（0–10）', 'number', 4, [0, 10, 1]]], frames: httpFrames },
  dns: { title: 'DNS 查詢路徑', prompt: '先猜：快取全空時，查一個名稱要經過幾台伺服器？', inputs: [['name', '查詢名稱', 'select', 'www.example.com', [['www.example.com', 'www.example.com'], ['mail.example.com', 'mail.example.com'], ['blog.example.com', 'blog.example.com（CNAME）']]], ['mode', '查詢方式', 'select', 'iter', [['iter', '本地伺服器迭代查詢'], ['rec', '全部遞迴查詢']]], ['cache', '本地伺服器快取', 'select', 'empty', [['empty', '空的'], ['tld', '已有 .com TLD'], ['answer', '已有答案']]]], frames: dnsFrames },
  socket: { title: 'Socket 與位元組串流', prompt: '先猜：客戶端 send 兩次，伺服器 recv 一定拿到兩則分開的訊息嗎？', inputs: [['proto', '協定', 'select', 'tcp', [['tcp', 'TCP'], ['udp', 'UDP']]], ['split', 'TCP 資料怎麼抵達', 'select', 'split', [['whole', '剛好兩次'], ['split', '被切開'], ['merge', '合成一次']]]], frames: socketFrames },
  checksum: { title: '網際網路檢查和', prompt: '先猜：兩個位元同時翻轉，檢查和一定抓得到嗎？', inputs: [['words', '16 位元字（十六進位）', 'text', '4500 0030 4422 BF00 6D88'], ['flip', '傳送途中', 'select', 'none', [['none', '沒有錯誤'], ['one', '1 個位元翻轉'], ['two', '2 個位元互相抵消']]]], frames: checksumFrames },
  arq: { title: '停等協定：rdt 3.0', prompt: '先猜：ACK 遺失時，接收端會不會把同一份資料交給上層兩次？', inputs: [['scenario', '情境', 'select', 'acklost', [['ok', '一切順利'], ['lost', '資料遺失'], ['acklost', 'ACK 遺失'], ['early', '過早逾時']]]], frames: arqFrames },
  window: { title: '滑動視窗：GBN 與 SR', prompt: '先猜：P2 遺失時，Go-Back-N 要重傳幾個封包？', inputs: [['proto', '協定', 'select', 'gbn', [['gbn', 'Go-Back-N'], ['sr', 'Selective Repeat']]], ['N', '視窗大小 N（1–6）', 'number', 4, [1, 6, 1]], ['lost', '第一次傳送就遺失', 'select', '2', [['none', '沒有'], ['2', 'P2'], ['0', 'P0'], ['2+5', 'P2 與 P5'], ['3+4', 'P3 與 P4']]]], frames: windowFrames },
  handshake: { title: 'TCP 三向交握、序號與關閉', prompt: '先猜：SYN 與 FIN 會不會佔用序號？', inputs: [['isnC', '客戶端 ISN', 'number', 1000, [0, 4294967295, 1]], ['isnS', '伺服器 ISN', 'number', 5000, [0, 4294967295, 1]], ['c', '客戶端送出位元組', 'number', 200, [0, 100000, 1]], ['s', '伺服器送出位元組', 'number', 500, [0, 100000, 1]], ['close', '關閉方式', 'select', 'client', [['client', '客戶端先關閉'], ['server', '伺服器先關閉'], ['rst', 'RST 中止']]]], frames: handshakeFrames },
  cwnd: { title: 'TCP 壅塞視窗', prompt: '先猜：cwnd = 12 時收到 3 個重複 ACK，Reno 與 Tahoe 的下一輪各是多少？', inputs: [['algo', '演算法', 'select', 'reno', [['reno', 'TCP Reno'], ['tahoe', 'TCP Tahoe']]], ['ssthresh', '初始 ssthresh', 'number', 8, [2, 64, 1]], ['events', '每輪事件（o 正常、d 重複 ACK、t 逾時）', 'text', 'ooooooodoooootooo']], frames: cwndFrames },
  vlsm: { title: 'CIDR 與 VLSM 子網路劃分', prompt: '先猜：120 台主機最小要用 /幾？', inputs: [['mode', '模式', 'select', 'vlsm', [['vlsm', 'VLSM：依需求切分區塊'], ['single', '單一位址：網路與廣播']]], ['block', '位址區塊（CIDR）', 'text', '200.23.16.0/23'], ['needs', '各子網路主機數（VLSM）', 'text', '60,120,10']], frames: vlsmFrames },
  lpm: { title: '最長前綴匹配與 NAT', prompt: '先猜：目的地同時符合 /21 與 /24，要選哪一個？', inputs: [['mode', '模式', 'select', 'lpm', [['lpm', '轉送表查詢'], ['nat', 'NAT 轉譯']]], ['dst', '目的 IP（查詢模式）', 'text', '200.23.24.170']], frames: lpmFrames },
  dijkstra: { title: 'Dijkstra 與轉送表', prompt: '先猜：從 u 到 z 的最短路徑經過哪些節點？', inputs: [['src', '來源', 'select', 'u', Object.keys(TOPO.nodes).map(n => [n, n])], ['weights', '成本', 'select', 'cost', [['cost', '鏈路成本'], ['hop', '全部為 1（跳數）']]]], frames: dijkstraFrames },
  dv: { title: '距離向量與無限計數', prompt: '先猜：x–y 的成本從 4 變成 60，要幾回合才會收斂？', inputs: [['scenario', '情境', 'select', 'bad', [['init', '初次收斂'], ['good', '好消息：4 → 1'], ['bad', '壞消息：4 → 60'], ['poison', '壞消息 + 毒性逆轉']]]], frames: dvFrames },
  frag: { title: 'IPv4 分段與 traceroute', prompt: '先猜：4000 位元組的資料包遇到 MTU 1500，會切成幾片？位移各是多少？', inputs: [['mode', '模式', 'select', 'frag', [['frag', 'IPv4 分段'], ['trace', 'traceroute']]], ['len', '資料包總長度', 'number', 4000, [21, 65535, 1]], ['mtu1', '第一段 MTU', 'select', '1500', [['1500', '1500'], ['1000', '1000'], ['576', '576']]], ['mtu2', '第二段 MTU', 'select', '0', [['0', '（沒有）'], ['620', '620'], ['576', '576']]], ['hops', '路由器數（traceroute）', 'number', 4, [1, 8, 1]]], frames: fragFrames },
  crc: { title: 'CRC 模 2 長除法', prompt: '先猜：101110 用 G = 1001 計算，CRC 是幾個位元？', inputs: [['data', '資料位元', 'text', '101110'], ['gen', '生成多項式 G', 'select', '1001', [['1001', '1001（x³ + 1）'], ['1011', '1011（x³ + x + 1）'], ['10011', '10011（x⁴ + x + 1）'], ['100000111', '100000111（CRC-8）']]], ['flip', '翻轉第幾位（0 起算，−1 不翻轉）', 'number', -1, [-1, 40, 1]]], frames: crcFrames },
  backoff: { title: 'CSMA/CD 二元指數退避', prompt: '先猜：兩個站碰撞後，下一次又碰撞的機率是多少？', inputs: [['n', '站數（2–5）', 'number', 3, [2, 5, 1]], ['seed', '亂數種子', 'number', 1, [1, 99, 1]]], frames: backoffFrames },
  switch: { title: '交換器自我學習與 ARP', prompt: '先猜：交換器第一次看到某個目的 MAC 時會怎麼做？', inputs: [['mode', '模式', 'select', 'switch', [['switch', '交換器自我學習'], ['arp', 'ARP 查詢']]], ['frames', '訊框（來源>目的）', 'text', 'A>D,D>A,B>A,C>*,E>C,A>E'], ['target', 'ARP 目的地', 'select', 'other', [['same', '同一子網路的主機'], ['other', '網際網路上的主機']]]], frames: switchFrames },
  dh: { title: 'Diffie-Hellman 與 TLS 交握', prompt: '先猜：竊聽者看到 A 與 B，能不能算出共同的祕密？', inputs: [['mode', '模式', 'select', 'dh', [['dh', '金鑰交換'], ['mitm', '中間人攻擊'], ['tls13', 'TLS 1.3 交握'], ['tls12', 'TLS 1.2 交握']]], ['p', '質數 p', 'select', '23', [['23', '23（g = 5）'], ['47', '47（g = 5）'], ['97', '97（g = 5）'], ['101', '101（g = 2）']]], ['a', 'Alice 的祕密 a', 'number', 6, [2, 99, 1]], ['b', 'Bob 的祕密 b', 'number', 15, [2, 99, 1]]], frames: dhFrames },
  journey: { title: '一個網頁請求的一生', prompt: '先猜：從按下 Enter 到收到 HTML，時間主要花在哪裡？', inputs: [['fresh', '筆電狀態', 'select', 'boot', [['boot', '剛連上 Wi-Fi'], ['ready', '已有 IP 與 ARP 快取']]], ['dns', 'DNS', 'select', 'miss', [['miss', '需要查詢'], ['cached', '已在快取']]], ['tls', 'TLS 版本', 'select', '1.3', [['1.3', 'TLS 1.3'], ['1.2', 'TLS 1.2']]], ['rtt', '到伺服器的 RTT（ms）', 'number', 80, [1, 500, 1]], ['dnsRtt', '到 DNS 的 RTT（ms）', 'number', 20, [1, 500, 1]]], frames: journeyFrames }
};
for (const [type, spec] of Object.entries(LABS)) CSLab.frameLab(type, { ...spec, inputs: spec.inputs.map(i => i.length === 4 ? [...i, []] : i) });
CSLab.sim.net = { switchSchedule, nodalDelay, queueSim, httpPlan, dnsSteps, frameDecode, onesSum, arqRun, windowRun, tcpTrace, cwndRun, parseIp, ipStr, parseCidr, vlsm, lpm, LPM_TABLE, natRun, dijkstraRun, TOPO, dvScenario, fragment, crcSteps, crcCheck, backoffRun, switchRun, modpow, journeyPlan, LABS };
})();
