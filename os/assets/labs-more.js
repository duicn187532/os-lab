/* OS LAB 互動實驗：記憶體、儲存、系統、整合與複習。 */
'use strict';
(function () {
  const { register, sim, ui } = window.OSLabs;
  const { h, int, btn, seg, stat, stats, note, num, field, range, panel, fmt } = ui;

  /* ───────────── 分頁與 TLB ───────────── */
  const PT = [5, 9, null, 2, 7, null, 12, 3, 14, null, 1, null, 6, 11, null, 4];
  const PERM = ['r-x', 'rw-', '', 'rw-', 'r--', '', 'rw-', 'rw-', 'r-x', '', 'rw-', '', 'rw-', 'r--', '', 'rw-'];
  sim.translate = function (va, pageSize) {
    const k = Math.log2(pageSize), vpn = Math.floor(va / pageSize), offset = va % pageSize;
    const pfn = vpn < PT.length ? PT[vpn] : null;
    return { k, vpn, offset, pfn, pa: pfn === null ? null : pfn * pageSize + offset };
  };
  const parseVA = raw => { raw = String(raw || '').trim(); const v = /^0x[\da-f]+$/i.test(raw) ? parseInt(raw, 16) : /^\d+$/.test(raw) ? Number(raw) : NaN; return Number.isSafeInteger(v) && v >= 0 && v <= 0xffff ? v : null; };
  const hex = (n, w = 4) => '0x' + n.toString(16).toUpperCase().padStart(w, '0');
  register('paging', {
    title: '位址轉譯：VPN、offset、頁表與 TLB',
    prompt: '頁面大小 4 KiB 時，虛擬位址 0x1234 的 offset 是多少？先手算，再按「轉譯」。把頁面改成 1 KiB，VPN 的位元數會怎麼變？',
    init: () => ({ input: '0x1234', va: 0x1234, size: 4096, tlb: [], hits: 0, misses: 0, last: null, alpha: 90, m: 100, t: 0 }),
    view(s) {
      const r = s.va === null ? null : sim.translate(s.va, s.size), vbits = 16 - Math.log2(s.size);
      const bits = s.va === null ? '' : s.va.toString(2).padStart(16, '0').split('').map((b, i) => `<span class="${i < vbits ? 'vpn' : 'off'}">${b}</span>`).join('');
      const eat = (s.alpha / 100) * (s.t + s.m) + (1 - s.alpha / 100) * (s.t + 2 * s.m);
      const rows = Math.min(16, 0x10000 / s.size);
      return `<div class="row wrap">${field('虛擬位址（16 位元）', `<input class="text" data-set="input" value="${h(s.input)}" spellcheck="false" aria-label="虛擬位址" placeholder="0x1234">`)}${btn('translate', '轉譯 →', { kind: 'primary' })}${field('頁面大小', seg('size', s.size, [[1024, '1 KiB'], [2048, '2 KiB'], [4096, '4 KiB']], '頁面大小'))}</div>
      <div class="row">${['0x1234', '0x3ABC', '0x0FFF', '0x5000', '0xC123'].map(v => btn('example', v, { arg: v })).join('')}</div>
      ${s.va === null ? note('請輸入 0x0000–0xFFFF 或 0–65535 範圍內的位址。', 'bad') : `
      ${panel('位元拆解', `<div class="bits" aria-label="二進位位址">${bits}</div><div class="bits-legend"><span class="vpn">VPN：高 ${vbits} bits = ${r.vpn}</span><span class="off">offset：低 ${r.k} bits = ${hex(r.offset, 3)}（${r.offset}）</span></div>`, `page size = 2<sup>${r.k}</sup> = ${s.size}`)}
      <div class="grid-2">
        ${panel('TLB（2 筆，LRU）', `<table class="table compact"><thead><tr><th>VPN</th><th>PFN</th></tr></thead><tbody>${[0, 1].map(i => s.tlb[i] ? `<tr class="${s.last && s.last.vpn === s.tlb[i].vpn ? 'sel' : ''}"><td>${s.tlb[i].vpn}</td><td>${s.tlb[i].pfn}</td></tr>` : '<tr><td>—</td><td>—</td></tr>').join('')}</tbody></table>${stats([stat('TLB hit', s.hits, { tone: 'ok' }), stat('TLB miss', s.misses, { tone: 'hot' })])}`)}
        ${panel('頁表（前 ' + rows + ' 項）', `<div class="pt">${Array.from({ length: rows }, (_, v) => `<div class="${v === r.vpn ? 'on' : ''}${PT[v] === null ? ' invalid' : ''}"><b>${v}</b><span>${PT[v] === null ? '無效' : '→ ' + PT[v]}</span><small>${PERM[v]}</small></div>`).join('')}</div>`)}
      </div>
      ${s.last ? (s.last.pfn === null ? note(`VPN ${s.last.vpn} 沒有有效映射 → 觸發 page fault 例外。核心會判斷：這是合法但尚未載入的頁（配置或從磁碟載入），還是非法存取（送出 SIGSEGV）？`, 'bad') : note(`${s.last.hit ? 'TLB 命中，不必查頁表。' : 'TLB 未命中 → 查頁表取得 PFN，並放入 TLB。'} PA = PFN ${s.last.pfn} × ${s.size} + offset ${s.last.offset} = <b>${s.last.pa}</b>（${hex(s.last.pa, 5)}）。offset 原封不動地保留。`, 'ok')) : note('按「轉譯」執行一次位址轉譯。同一頁的位址再轉譯一次，觀察 TLB 命中。')}`}
      ${panel('有效存取時間（EAT）', `<div class="sliders">${field(`TLB 命中率 α = ${s.alpha}%`, range('alpha', s.alpha, 0, 100, 1, 'TLB 命中率'))}${field(`記憶體存取 m = ${s.m} ns`, range('m', s.m, 10, 200, 10, '記憶體存取時間'))}${field(`TLB 查詢 t = ${s.t} ns`, range('t', s.t, 0, 20, 1, 'TLB 查詢時間'))}</div>
        <p class="formula">EAT = α(t + m) + (1 − α)(t + 2m) = ${fmt(s.alpha / 100)} × ${s.t + s.m} + ${fmt(1 - s.alpha / 100)} × ${s.t + 2 * s.m} = <b>${fmt(eat, 1)} ns</b></p>
        <p class="muted">比沒有分頁的單次存取慢 ${fmt((eat / s.m - 1) * 100, 1)}%。命中率從 90% 提高到 99%，差多少？</p>`)}`;
    },
    act(s, a, arg) {
      if (a === 'example') s.input = arg;
      if (a === 'set:size') { s.size = +arg; s.tlb = []; s.last = null; s.hits = s.misses = 0; }
      if (a === 'translate' || a === 'example') {
        s.va = parseVA(s.input); if (s.va === null) { s.last = null; return; }
        const r = sim.translate(s.va, s.size), found = s.tlb.findIndex(e => e.vpn === r.vpn);
        if (found >= 0) { s.hits++; const e = s.tlb.splice(found, 1)[0]; s.tlb.unshift(e); s.last = { ...r, hit: true }; return; }
        s.misses++; s.last = { ...r, hit: false };
        if (r.pfn !== null) { s.tlb.unshift({ vpn: r.vpn, pfn: r.pfn }); s.tlb = s.tlb.slice(0, 2); }
      }
    },
    set(s, key, v) {
      if (key === 'input') { s.input = String(v).slice(0, 12); s.va = parseVA(s.input); }
      if (key === 'alpha') s.alpha = int(v, 0, 100, 90);
      if (key === 'm') s.m = int(v, 10, 200, 100);
      if (key === 't') s.t = int(v, 0, 20, 0);
    }
  });

  /* ───────────── 連續配置 ───────────── */
  const ALLOC0 = [{ name: 'OS', size: 16, used: true }, { size: 12 }, { name: 'P1', size: 12, used: true }, { size: 30 }, { name: 'P2', size: 12, used: true }, { size: 18 }];
  const STRAT = { first: 'First Fit', best: 'Best Fit', worst: 'Worst Fit', next: 'Next Fit' };
  const addrOf = (blocks, idx) => blocks.slice(0, idx).reduce((a, b) => a + b.size, 0);
  sim.pickHole = function (blocks, size, strategy, cursor = 0) {
    const holes = blocks.map((b, i) => ({ ...b, i, addr: addrOf(blocks, i) })).filter(b => !b.used && b.size >= size);
    if (!holes.length) return -1;
    if (strategy === 'best') return holes.sort((a, b) => a.size - b.size || a.i - b.i)[0].i;
    if (strategy === 'worst') return holes.sort((a, b) => b.size - a.size || a.i - b.i)[0].i;
    if (strategy === 'next') { const after = holes.find(b => b.addr >= cursor); return (after || holes[0]).i; }
    return holes[0].i;
  };
  const coalesce = blocks => blocks.reduce((out, b) => { const last = out[out.length - 1]; if (last && !last.used && !b.used) last.size += b.size; else out.push({ ...b }); return out; }, []);
  register('alloc', {
    title: '連續記憶體配置與碎片',
    prompt: '目前有三個空洞：12、30、18 KB。請求 15 KB 時，First / Best / Worst Fit 各會選哪一個？連續配置幾次之後，比較剩下的空洞。',
    init: () => ({ blocks: ALLOC0.map(b => ({ ...b })), strategy: 'first', size: 15, seq: 3, cursor: 0, msg: null }),
    view(s) {
      const total = s.blocks.reduce((a, b) => a + b.size, 0), free = s.blocks.filter(b => !b.used), freeSum = free.reduce((a, b) => a + b.size, 0), largest = Math.max(0, ...free.map(b => b.size));
      const frag = freeSum ? 1 - largest / freeSum : 0;
      const preview = Object.keys(STRAT).map(k => { const i = sim.pickHole(s.blocks, s.size, k, s.cursor); return [k, i < 0 ? '放不下' : `位址 ${addrOf(s.blocks, i)} 的 ${s.blocks[i].size} KB 空洞`]; });
      return `<div class="row wrap">${seg('strategy', s.strategy, Object.entries(STRAT), '放置策略')}${field('請求大小（KB）', num('size', s.size, 1, 60, { label: '請求大小' }))}${btn('alloc', '配置 →', { kind: 'primary' })}${btn('compact', '壓縮（compaction）')}</div>
      ${panel('記憶體（共 ' + total + ' KB）', `<div class="memmap">${s.blocks.map((b, i) => `<button type="button" class="blk${b.used ? ' used' : ' free'}${b.name === 'OS' ? ' os' : ''}${s.msg && s.msg.i === i ? ' new' : ''}" style="flex:${b.size}" data-act="${b.used && b.name !== 'OS' ? 'free' : 'noop'}" data-arg="${i}" title="${b.used ? b.name : '空閒'} · ${b.size} KB · 位址 ${addrOf(s.blocks, i)}"${b.used && b.name !== 'OS' ? '' : ' tabindex="-1"'}><b>${b.used ? b.name : ''}</b><small>${b.size}</small></button>`).join('')}</div><div class="memaxis"><span>0</span><span>${total} KB</span></div><p class="muted">點一下行程區塊可以釋放它（相鄰空洞會自動合併）。</p>`)}
      ${stats([stat('空閒總量', freeSum + ' KB'), stat('最大空洞', largest + ' KB'), stat('空洞數量', free.length), stat('外部碎片指標', fmt(frag * 100, 0) + '%', { tone: frag > 0.5 ? 'hot' : '' })])}
      ${s.msg ? note(s.msg.text, s.msg.ok ? 'ok' : 'bad') : ''}
      <details class="peek"><summary>偷看：四種策略各會選哪個空洞？（先自己預測）</summary><ul>${preview.map(([k, t]) => `<li><b>${STRAT[k]}</b>：${t}</li>`).join('')}</ul></details>`;
    },
    act(s, a, arg) {
      if (a === 'set:strategy') s.strategy = arg;
      if (a === 'alloc') {
        const i = sim.pickHole(s.blocks, s.size, s.strategy, s.cursor);
        const freeSum = s.blocks.filter(b => !b.used).reduce((x, b) => x + b.size, 0);
        if (i < 0) { s.msg = { ok: false, text: freeSum >= s.size ? `配置失敗：空閒總量 ${freeSum} KB ≥ ${s.size} KB，但沒有任何單一空洞夠大——這就是外部碎片。試試「壓縮」。` : `配置失敗：空閒總量只有 ${freeSum} KB。` }; return; }
        const hole = s.blocks[i], name = 'P' + s.seq++, addr = addrOf(s.blocks, i);
        const parts = [{ name, size: s.size, used: true }]; if (hole.size > s.size) parts.push({ size: hole.size - s.size });
        s.blocks.splice(i, 1, ...parts); s.cursor = addr + s.size;
        s.msg = { ok: true, i, text: `${STRAT[s.strategy]} 選擇位址 ${addr} 的 ${hole.size} KB 空洞，放入 ${name}（${s.size} KB）${hole.size > s.size ? `，剩下 ${hole.size - s.size} KB 的新空洞` : '，剛好用完'}。` };
      }
      if (a === 'free') { const b = s.blocks[+arg]; if (!b || !b.used || b.name === 'OS') return; s.blocks[+arg] = { size: b.size }; s.blocks = coalesce(s.blocks); s.msg = { ok: true, text: `釋放 ${b.name}（${b.size} KB），並與相鄰的空洞合併。` }; }
      if (a === 'compact') { const used = s.blocks.filter(b => b.used), free = s.blocks.filter(b => !b.used).reduce((x, b) => x + b.size, 0); s.blocks = [...used, ...(free ? [{ size: free }] : [])]; s.msg = { ok: true, text: `壓縮：把所有行程搬到低位址，空閒空間合併成一個 ${free} KB 的空洞。代價是搬移資料並更新所有位址（需要可重新定位）。` }; }
    },
    set(s, key, v) { if (key === 'size') s.size = int(v, 1, 60, 15); }
  });

  /* ───────────── 頁面置換 ───────────── */
  sim.simulateReplacement = function (l) {
    const frames = [], queue = [], last = {}, history = [], refs = l.refs, n = l.t ?? refs.length;
    for (let i = 0; i < n; i++) {
      const page = refs[i], hit = frames.includes(page); let victim = null;
      if (!hit) {
        if (frames.length < l.capacity) { frames.push(page); queue.push(page); }
        else {
          if (l.algo === 'FIFO') victim = queue.shift();
          else if (l.algo === 'LRU') victim = frames.slice().sort((a, b) => last[a] - last[b])[0];
          else { const nextUse = p => { const k = refs.indexOf(p, i + 1); return k < 0 ? Infinity : k; }; victim = frames.slice().sort((a, b) => nextUse(b) - nextUse(a) || frames.indexOf(a) - frames.indexOf(b))[0]; }
          frames[frames.indexOf(victim)] = page; if (l.algo === 'FIFO') queue.push(page);
        }
      }
      last[page] = i; history.push({ page, hit, victim, frames: frames.slice() });
    }
    return { frames, history, hit: history.filter(x => x.hit).length, fault: history.filter(x => !x.hit).length };
  };
  const parseRefs = t => String(t).split(/[\s,]+/).filter(Boolean).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 99).slice(0, 24);
  register('replacement', {
    title: '頁面置換：FIFO、LRU、OPT',
    prompt: '序列中 0 反覆出現，FIFO 與 LRU 誰會比較「照顧」它？試試 Belady 序列：FIFO 從 3 個頁框改成 4 個，缺頁數會減少嗎？',
    init: () => ({ algo: 'FIFO', capacity: 3, t: 0, refs: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2], text: '7 0 1 2 0 3 0 4 2 3 0 3 2' }),
    auto: { action: 'step', done: s => s.t >= s.refs.length },
    view(s) {
      const r = sim.simulateReplacement(s), finished = s.t >= s.refs.length, cur = r.history[s.t - 1];
      return `<div class="row wrap">${seg('algo', s.algo, [['FIFO', 'FIFO'], ['LRU', 'LRU'], ['OPT', 'OPT（最佳）']], '演算法')}${field('頁框數', seg('capacity', s.capacity, [1, 2, 3, 4, 5].map(n => [n, n]), '頁框數'))}</div>
      <div class="row wrap">${field('參考序列', `<input class="text wide" data-set="text" value="${h(s.text)}" aria-label="參考序列" spellcheck="false">`)}${btn('belady', 'Belady 序列')}${btn('classic', '教科書序列')}</div>
      ${panel('逐步表格', `<div class="table-wrap"><table class="table frames"><thead><tr><th>參考</th>${s.refs.map((p, i) => `<th class="${i === s.t - 1 ? 'now' : ''}${i >= s.t ? ' dim' : ''}">${p}</th>`).join('')}</tr></thead><tbody>
        ${Array.from({ length: s.capacity }, (_, f) => `<tr><th>頁框 ${f}</th>${s.refs.map((_, i) => { const hst = r.history[i]; if (!hst) return '<td class="dim"></td>'; const v = hst.frames[f]; const changed = !hst.hit && v === hst.page && (i === 0 || r.history[i - 1].frames[f] !== v); return `<td class="${changed ? 'new' : ''}${i === s.t - 1 ? ' now' : ''}">${v ?? ''}</td>`; }).join('')}</tr>`).join('')}
        <tr class="faults"><th>結果</th>${s.refs.map((_, i) => { const hst = r.history[i]; return `<td>${hst ? (hst.hit ? '<span class="hit">✓</span>' : '<span class="miss">F</span>') : ''}</td>`; }).join('')}</tr></tbody></table></div>`, `第 ${s.t} / ${s.refs.length} 次存取`)}
      ${stats([stat('命中 Hit', r.hit, { tone: 'ok' }), stat('缺頁 Fault', r.fault, { tone: 'hot' }), stat('缺頁率', s.t ? fmt(r.fault / s.t * 100, 0) + '%' : '—')])}
      ${cur ? note(`存取頁 ${cur.page}：${cur.hit ? '命中，已在頁框中。' : cur.victim === null ? '缺頁，放入空頁框。' : `缺頁，${s.algo === 'FIFO' ? '最早進入' : s.algo === 'LRU' ? '最久沒被使用' : '未來最晚才會用到'}的頁 ${cur.victim} 被置換。`}`, cur.hit ? 'ok' : 'warn') : ''}
      <div class="row">${btn('step', '存取下一頁 →', { kind: 'primary', disabled: finished })}${btn('all', '跑完整個序列', { disabled: finished })}${btn('restart', '從頭開始', { disabled: s.t === 0 })}</div>
      ${finished ? panel('比較', `<div class="table-wrap"><table class="table compact"><thead><tr><th>頁框數</th>${[1, 2, 3, 4, 5].map(n => `<th>${n}</th>`).join('')}</tr></thead><tbody>${['FIFO', 'LRU', 'OPT'].map(a => { const fs = [1, 2, 3, 4, 5].map(n => sim.simulateReplacement({ algo: a, capacity: n, refs: s.refs }).fault); return `<tr class="${a === s.algo ? 'sel' : ''}"><td>${a}</td>${fs.map((f, i) => `<td class="${i > 0 && f > fs[i - 1] ? 'anomaly' : ''}">${f}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div><p class="muted">表格是不同頁框數下的缺頁次數。標紅的格子代表「頁框變多，缺頁反而變多」——Belady's anomaly，只會出現在 FIFO 這類演算法。</p>`) : ''}`;
    },
    act(s, a, arg) {
      if (a === 'step') s.t = Math.min(s.refs.length, s.t + 1);
      if (a === 'all') s.t = s.refs.length;
      if (a === 'restart') s.t = 0;
      if (a === 'set:algo') { s.algo = arg; s.t = 0; }
      if (a === 'set:capacity') { s.capacity = +arg; s.t = 0; }
      if (a === 'belady') { s.text = '1 2 3 4 1 2 5 1 2 3 4 5'; s.refs = parseRefs(s.text); s.algo = 'FIFO'; s.t = 0; }
      if (a === 'classic') { s.text = '7 0 1 2 0 3 0 4 2 3 0 3 2'; s.refs = parseRefs(s.text); s.t = 0; }
    },
    set(s, key, v) { if (key === 'text') { const refs = parseRefs(v); if (refs.length) { s.refs = refs; s.text = refs.join(' '); s.t = 0; } } }
  });

  /* ───────────── 檔案寫入與持久化 ───────────── */
  register('storage', {
    title: 'write()、page cache 與 fsync()',
    prompt: '寫入 v2 之後立刻斷電，重開機讀到的是 v1 還是 v2？如果先等背景回寫，或先呼叫 fsync() 呢？',
    init: () => ({ ver: 1, cache: 1, disk: 1, dirty: false, fd: null, log: [['info', '磁碟上的 data.txt 內容是 v1。']] }),
    view(s) {
      return `<div class="grid-3 storage">
        ${panel('行程', `<dl class="pcb"><dt>fd 表</dt><dd>0 stdin · 1 stdout · 2 stderr${s.fd !== null ? ` · <b>${s.fd} → data.txt</b>` : ''}</dd></dl><div class="row">${btn('open', 'open("data.txt")', { disabled: s.fd !== null })}${btn('write', `write(fd, "v${s.ver + 1}")`, { kind: 'primary', disabled: s.fd === null })}${btn('fsync', 'fsync(fd)', { disabled: s.fd === null })}</div>`)}
        ${panel('核心 · page cache（RAM）', `<div class="store-box${s.dirty ? ' dirty' : ''}"><b>v${s.cache}</b><small>${s.dirty ? '● dirty：尚未寫回' : '○ 與磁碟一致'}</small></div>${btn('writeback', '⏲ 背景回寫（約 30 秒後）', { disabled: !s.dirty })}`)}
        ${panel('儲存裝置（持久）', `<div class="store-box disk"><b>v${s.disk}</b><small>inode 1342 · 資料區塊</small></div>${btn('crash', '⚡ 模擬斷電並重開機', { kind: 'warn' })}`)}
      </div>
      <ol class="log">${s.log.slice(-6).reverse().map(([tone, t]) => `<li class="${tone}">${h(t)}</li>`).join('')}</ol>
      <p class="muted">教學模型：斷電時 dirty 的快取內容全部消失。真實系統還有日誌（journaling）、裝置寫入快取與 FUA / flush 指令等細節。</p>`;
    },
    act(s, a) {
      if (a === 'open') { s.fd = 3; s.log.push(['info', 'open() 回傳 fd 3：行程的 fd 3 → 核心的開啟檔案物件 → inode 1342。']); }
      if (a === 'write') { s.ver++; s.cache = s.ver; s.dirty = true; s.log.push(['ok', `write() 回傳成功：v${s.ver} 已在 page cache，但磁碟上仍是 v${s.disk}。`]); }
      if (a === 'fsync') { if (s.dirty) { s.disk = s.cache; s.dirty = false; s.log.push(['ok', `fsync() 等到 v${s.disk} 寫入裝置才返回——現在才真正耐久。`]); } else s.log.push(['info', 'fsync()：沒有 dirty 資料，立即返回。']); }
      if (a === 'writeback') { s.disk = s.cache; s.dirty = false; s.log.push(['info', `核心的回寫執行緒把 v${s.disk} 寫回磁碟（時機由核心決定，程式無法得知）。`]); }
      if (a === 'crash') { const lost = s.dirty; s.cache = s.disk; s.dirty = false; s.fd = null; s.log.push([lost ? 'bad' : 'ok', lost ? `⚡ 斷電！page cache 中尚未回寫的 v${s.ver} 遺失，重開機後讀到 v${s.disk}。` : `⚡ 斷電後重開機：讀到 v${s.disk}，沒有資料遺失。`]); s.ver = s.disk; }
    }
  });

  /* ───────────── 磁碟排程 ───────────── */
  const DISK_ALGOS = { FCFS: 'FCFS', SSTF: 'SSTF', SCAN: 'SCAN', CSCAN: 'C-SCAN', LOOK: 'LOOK', CLOOK: 'C-LOOK' };
  sim.diskSchedule = function (reqs, head, algo, dir = 'up', max = 199) {
    let path = [head];
    const up = reqs.filter(r => r >= head).sort((a, b) => a - b), down = reqs.filter(r => r < head).sort((a, b) => b - a);
    if (algo === 'FCFS') path = path.concat(reqs);
    else if (algo === 'SSTF') { const left = reqs.slice(); let cur = head; while (left.length) { left.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur) || a - b); cur = left.shift(); path.push(cur); } }
    else {
      const first = dir === 'up' ? up : down, second = dir === 'up' ? down : up, edge = dir === 'up' ? max : 0, other = dir === 'up' ? 0 : max;
      path = path.concat(first);
      if (algo === 'SCAN') { if (second.length) path.push(edge); path = path.concat(second); }
      if (algo === 'LOOK') path = path.concat(second);
      if (algo === 'CSCAN') { if (second.length) { path.push(edge, other); path = path.concat(second.slice().reverse()); } }
      if (algo === 'CLOOK') path = path.concat(second.slice().reverse());
    }
    path = path.filter((c, i) => i === 0 || c !== path[i - 1]);
    const moves = path.slice(1).map((c, i) => Math.abs(c - path[i]));
    return { path, moves, total: moves.reduce((a, b) => a + b, 0) };
  };
  const parseCyl = t => String(t).split(/[\s,]+/).filter(Boolean).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 199).slice(0, 14);
  register('disk', {
    title: '磁碟排程：讀寫頭的移動路徑',
    prompt: '讀寫頭在 53，先用紙筆算出 SSTF 的服務順序與總移動量，再一步步驗證。SCAN 的方向改成往下，結果一樣嗎？',
    init: () => ({ algo: 'FCFS', dir: 'up', head: 53, text: '98 183 37 122 14 124 65 67', reqs: [98, 183, 37, 122, 14, 124, 65, 67], k: 0 }),
    auto: { action: 'step', done: s => s.k >= sim.diskSchedule(s.reqs, s.head, s.algo, s.dir).moves.length },
    view(s) {
      const r = sim.diskSchedule(s.reqs, s.head, s.algo, s.dir), n = r.moves.length, k = Math.min(s.k, n), finished = k >= n;
      const W = 600, H = 34 + r.path.length * 26, x = c => 20 + c / 199 * (W - 40), y = i => 22 + i * 26;
      const served = new Set(r.path.slice(0, k + 1));
      const svg = `<svg class="diskplot" viewBox="0 0 ${W} ${H}" role="img" aria-label="讀寫頭移動路徑"><line class="axis" x1="20" y1="10" x2="${W - 20}" y2="10"/>${[0, 50, 100, 150, 199].map(c => `<text class="tick" x="${x(c)}" y="8">${c}</text>`).join('')}${s.reqs.map(c => `<line class="req${served.has(c) ? ' done' : ''}" x1="${x(c)}" y1="12" x2="${x(c)}" y2="${H - 6}"/>`).join('')}<polyline class="path" points="${r.path.slice(0, k + 1).map((c, i) => `${x(c)},${y(i)}`).join(' ')}"/>${r.path.slice(0, k + 1).map((c, i) => `<circle class="${i === k ? 'head' : 'pt'}" cx="${x(c)}" cy="${y(i)}" r="${i === k ? 6 : 4}"/><text class="lbl" x="${x(c) + 9}" y="${y(i) + 4}">${c}</text>`).join('')}</svg>`;
      return `<div class="row wrap">${seg('algo', s.algo, Object.entries(DISK_ALGOS), '演算法')}${['SCAN', 'CSCAN', 'LOOK', 'CLOOK'].includes(s.algo) ? seg('dir', s.dir, [['up', '先往大號'], ['down', '先往小號']], '方向') : ''}</div>
      <div class="row wrap">${field('起點', num('head', s.head, 0, 199, { label: '讀寫頭起點' }))}${field('請求佇列（0–199）', `<input class="text wide" data-set="text" value="${h(s.text)}" aria-label="請求佇列" spellcheck="false">`)}${btn('random', '🎲 隨機')}</div>
      ${panel('路徑（由上往下為服務順序）', svg, `${k} / ${n} 段移動`)}
      ${stats([stat('目前位置', r.path[k]), stat('本段移動', k ? r.moves[k - 1] : 0), stat('累計移動', r.moves.slice(0, k).reduce((a, b) => a + b, 0), { tone: 'hot' })])}
      <div class="row">${btn('step', '移到下一個 →', { kind: 'primary', disabled: finished })}${btn('all', '跑完', { disabled: finished })}${btn('restart', '回到起點', { disabled: k === 0 })}</div>
      ${finished ? panel('比較所有演算法', `<p class="formula">${s.algo} 路徑：${r.path.join(' → ')}　總移動量 = <b>${r.total}</b></p><div class="table-wrap"><table class="table compact"><thead><tr><th>演算法</th><th>總移動量</th></tr></thead><tbody>${Object.entries(DISK_ALGOS).map(([a, name]) => `<tr class="${a === s.algo ? 'sel' : ''}"><td>${name}</td><td>${sim.diskSchedule(s.reqs, s.head, a, s.dir).total}</td></tr>`).join('')}</tbody></table></div><p class="muted">C-SCAN / C-LOOK 的回程跳躍計入總移動量；部分教科書不計入，作答時請依題目約定。</p>`) : ''}`;
    },
    act(s, a, arg) {
      const n = sim.diskSchedule(s.reqs, s.head, s.algo, s.dir).moves.length;
      if (a === 'step') s.k = Math.min(n, s.k + 1);
      if (a === 'all') s.k = n;
      if (a === 'restart') s.k = 0;
      if (a === 'set:algo') { s.algo = arg; s.k = 0; }
      if (a === 'set:dir') { s.dir = arg; s.k = 0; }
      if (a === 'random') { s.reqs = Array.from({ length: 8 }, () => Math.floor(Math.random() * 200)); s.text = s.reqs.join(' '); s.k = 0; }
    },
    set(s, key, v) {
      if (key === 'head') s.head = int(v, 0, 199, 53);
      if (key === 'text') { const r = parseCyl(v); if (r.length) { s.reqs = r; s.text = r.join(' '); } }
      s.k = 0;
    }
  });

  /* ───────────── I/O：輪詢、中斷、DMA ───────────── */
  sim.ioTimeline = function (blocks, lat, isr) {
    const poll = [], intr = [], dma = [];
    for (let b = 0; b < blocks; b++) { for (let i = 0; i < lat; i++) poll.push('spin'); poll.push('copy'); }
    for (let b = 0; b < blocks; b++) { for (let i = 0; i < lat; i++) intr.push('free'); for (let i = 0; i < isr; i++) intr.push('isr'); }
    dma.push('setup'); for (let i = 0; i < blocks * lat; i++) dma.push('free'); for (let i = 0; i < isr; i++) dma.push('isr');
    const busy = t => t.filter(x => x !== 'free').length;
    return { poll, intr, dma, busy: { poll: busy(poll), intr: busy(intr), dma: busy(dma) } };
  };
  register('io', {
    title: 'I/O 方式比較：輪詢、中斷、DMA',
    prompt: '讀取 6 個區塊時，哪一種方式讓 CPU 最空閒？把裝置延遲調到 1、中斷成本調到 3，結論會改變嗎？',
    init: () => ({ blocks: 6, lat: 4, isr: 1 }),
    view(s) {
      const r = sim.ioTimeline(s.blocks, s.lat, s.isr);
      const row = (name, tl, desc) => { const busy = tl.filter(x => x !== 'free').length; return `<div class="io-row"><div class="io-head"><b>${name}</b><small>${desc}</small></div><div class="io-cells">${tl.map(x => `<i class="${x}" title="${{ spin: '忙等輪詢', copy: 'CPU 複製資料', free: 'CPU 可做其他工作', isr: '中斷處理', setup: '設定 DMA' }[x]}"></i>`).join('')}</div><div class="io-stat">完成 ${tl.length} tick · CPU 被占用 <b>${busy}</b>（${fmt(busy / tl.length * 100, 0)}%）</div></div>`; };
      return `<div class="sliders">${field(`區塊數 = ${s.blocks}`, range('blocks', s.blocks, 1, 12, 1, '區塊數'))}${field(`每區塊裝置延遲 = ${s.lat} tick`, range('lat', s.lat, 1, 8, 1, '裝置延遲'))}${field(`每次中斷處理成本 = ${s.isr} tick`, range('isr', s.isr, 1, 4, 1, '中斷成本'))}</div>
      ${panel('CPU 時間線', `${row('輪詢 Polling', r.poll, 'CPU 反覆讀狀態暫存器，每塊完成後自己複製資料')}${row('中斷 Interrupt', r.intr, '裝置工作時 CPU 去做別的事，每塊完成觸發一次中斷')}${row('DMA', r.dma, 'CPU 只設定一次，裝置把整批資料直接寫進記憶體')}
        <div class="legend"><span><i class="spin"></i>忙等</span><span><i class="copy"></i>CPU 搬資料</span><span><i class="isr"></i>中斷處理</span><span><i class="setup"></i>設定 DMA</span><span><i class="free"></i>CPU 空閒，可執行其他行程</span></div>`)}
      ${note(s.lat <= s.isr ? `裝置延遲（${s.lat}）不大於中斷成本（${s.isr}）時，中斷模式的總時間反而較長：等待太短，處理中斷與切換的開銷不划算——這就是高速 NVMe 有時改用 polling 的原因。` : `裝置延遲（${s.lat}）明顯大於中斷成本（${s.isr}）時，中斷與 DMA 讓 CPU 在等待期間去執行其他 Ready 行程。資料量大時 DMA 只需一次中斷，最省 CPU。`, 'info')}`;
    },
    set(s, key, v) { if (key === 'blocks') s.blocks = int(v, 1, 12, 6); if (key === 'lat') s.lat = int(v, 1, 8, 4); if (key === 'isr') s.isr = int(v, 1, 4, 1); }
  });

  /* ───────────── Unix 權限 ───────────── */
  const WHO = ['owner', 'group', 'others'], BITS = [['r', 4], ['w', 2], ['x', 1]];
  const USERS = { alice: { name: 'alice（檔案擁有者）', cls: 'owner' }, bob: { name: 'bob（dev 群組成員）', cls: 'group' }, carol: { name: 'carol（其他人）', cls: 'others' }, root: { name: 'root（超級使用者）', cls: 'root' } };
  sim.checkAccess = function (mode, user, op) {
    const digit = c => (mode >> (6 - 3 * WHO.indexOf(c))) & 7, bit = { read: 4, write: 2, exec: 1 }[op];
    if (user === 'root') { if (op !== 'exec') return { ok: true, why: 'root 會略過讀寫權限檢查（DAC）。但仍受 SELinux、唯讀掛載、不可變屬性等其他機制限制。' }; const any = (mode & 0o111) !== 0; return { ok: any, why: any ? '執行時，root 也需要至少一組 x 位元被設定。' : '沒有任何 x 位元——即使是 root 也不能直接執行。' }; }
    const cls = USERS[user].cls, d = digit(cls), ok = (d & bit) !== 0;
    return { ok, why: `${user} 屬於 ${cls} 類別，只看 ${cls} 這一組權限（${d} = ${BITS.map(([c, v]) => d & v ? c : '-').join('')}）。${cls === 'owner' && !ok && (digit('group') & bit) ? '注意：即使 group 有這個權限，擁有者也只套用 owner 這組！' : ''}` };
  };
  const symbolic = m => '-' + WHO.map((_, i) => BITS.map(([c, v]) => (m >> (6 - 3 * i)) & v ? c : '-').join('')).join('');
  register('perm', {
    title: 'Unix 權限：rwx、八進位與存取檢查',
    prompt: 'chmod 640 之後，同群組的 bob 能寫入嗎？如果把模式設成 070，擁有者 alice 自己還能讀嗎？',
    init: () => ({ mode: 0o640, user: 'bob', op: 'write', octal: '640' }),
    view(s) {
      const res = sim.checkAccess(s.mode, s.user, s.op);
      return `<div class="grid-2">
      ${panel('權限位元', `<table class="table perm"><thead><tr><th></th>${BITS.map(([c, v]) => `<th>${c}（${v}）</th>`).join('')}<th>數字</th></tr></thead><tbody>${WHO.map((w, i) => `<tr><th>${w}</th>${BITS.map(([c, v]) => { const on = (s.mode >> (6 - 3 * i)) & v; return `<td><button type="button" class="bit${on ? ' on' : ''}" data-act="toggle" data-arg="${6 - 3 * i}:${v}" aria-pressed="${!!on}" aria-label="${w} ${c}">${on ? c : '-'}</button></td>`; }).join('')}<td><b>${(s.mode >> (6 - 3 * i)) & 7}</b></td></tr>`).join('')}</tbody></table>
        <div class="row wrap">${field('八進位', `<input class="text" data-set="octal" value="${h(s.octal)}" maxlength="3" inputmode="numeric" aria-label="八進位權限">`)}<code class="big">${symbolic(s.mode)}</code></div>
        <div class="row wrap">${[['600', 'SSH 私鑰'], ['644', '一般檔案'], ['755', '程式 / 目錄'], ['770', '團隊共用'], ['777', '⚠ 全開']].map(([m, t]) => btn('preset', `${m} ${t}`, { arg: m })).join('')}</div>
        <p class="formula">ls -l：<code>${symbolic(s.mode)} 1 alice dev 2048 report.txt</code></p>`)}
      ${panel('存取檢查', `${field('使用者', `<select class="select" data-set="user">${Object.entries(USERS).map(([k, u]) => `<option value="${k}"${s.user === k ? ' selected' : ''}>${u.name}</option>`).join('')}</select>`)}${field('操作', seg('op', s.op, [['read', '讀取'], ['write', '寫入'], ['exec', '執行']], '操作'))}
        <div class="verdict ${res.ok ? 'ok' : 'bad'}"><b>${res.ok ? '✓ 允許' : '✗ 拒絕（EACCES）'}</b><p>${h(res.why)}</p></div>
        <p class="muted">檢查順序：是擁有者 → 只看 owner；否則屬於群組 → 只看 group；否則看 others。第一個符合的類別決定結果，不會「往下找更寬鬆的」。</p>`)}
      </div>
      ${s.mode === 0o777 ? note('777 讓任何人都能修改檔案——違反最小特權原則。網站上傳目錄設成 777 是常見的入侵管道。', 'bad') : ''}`;
    },
    act(s, a, arg) {
      if (a === 'toggle') { const [shift, v] = arg.split(':').map(Number); s.mode ^= v << shift; s.octal = s.mode.toString(8).padStart(3, '0'); }
      if (a === 'preset') { s.mode = parseInt(arg, 8); s.octal = arg; }
      if (a === 'set:op') s.op = arg;
    },
    set(s, key, v) {
      if (key === 'user' && USERS[v]) s.user = v;
      if (key === 'octal') { s.octal = String(v).slice(0, 3); if (/^[0-7]{3}$/.test(s.octal)) s.mode = parseInt(s.octal, 8); }
    }
  });

  /* ───────────── VM vs Container ───────────── */
  const SCEN = {
    syscall: { q: '容器 / VM 中的程式呼叫 open()', vm: ['app', 'guest'], ct: ['app', 'host'], vmT: '由 VM 自己的 guest kernel 處理；需要碰磁碟時，再經 hypervisor 存取虛擬磁碟。', ctT: '直接進入 host kernel——容器裡沒有另一顆核心。namespace 讓它只看得到自己的檔案系統視角。' },
    uname: { q: '執行 uname -r 看核心版本', vm: ['guest'], ct: ['host'], vmT: '顯示 guest OS 的核心版本，可以和主機完全不同（甚至 Windows）。', ctT: '顯示 host 的核心版本：Ubuntu 映像跑在 Fedora 主機上，看到的是 Fedora 的核心。' },
    exploit: { q: '某個核心漏洞被利用', vm: ['guest'], ct: ['host', 'all'], vmT: '攻擊者通常只能控制那一台 guest；要突破還得再攻破 hypervisor，邊界較厚。', ctT: '所有容器共用同一顆 host kernel，核心漏洞可能讓攻擊者逃出容器、影響整台主機上的所有容器。' },
    limit: { q: '限制最多 512 MB 記憶體', vm: ['hyp'], ct: ['rt'], vmT: '在建立 VM 時配置虛擬記憶體大小，由 hypervisor 管理。', ctT: '由 cgroups 的 memory.max 限制；超過時 OOM killer 會在該 cgroup 內結束行程。' },
    boot: { q: '啟動一個新的執行環境', vm: ['guest', 'hyp'], ct: ['rt'], vmT: '要開機一整套 guest OS：通常需要數秒到數十秒，映像以 GB 計。', ctT: '只是用新的 namespace 建立一個行程：通常在毫秒到一秒內，映像以 MB 計。' }
  };
  register('isolation', {
    title: 'VM 與 Container 的軟體堆疊',
    prompt: '在 Ubuntu 容器中執行 uname -r，看到的是誰的核心版本？選一個情境，觀察兩邊各由哪一層處理。',
    init: () => ({ sc: 'syscall' }),
    view(s) {
      const c = SCEN[s.sc], on = (side, layer) => (side === 'vm' ? c.vm : c.ct).includes(layer) || (side === 'ct' && c.ct.includes('all') && layer !== 'hw') ? ' on' : '';
      const L = (side, id, text, cls = '') => `<div class="layer ${cls}${on(side, id)}">${text}</div>`;
      return `<div class="row wrap">${seg('sc', s.sc, Object.entries(SCEN).map(([k, v]) => [k, v.q]), '情境')}</div>
      <div class="grid-2">
        ${panel('虛擬機器（VM）', `<div class="stack"><div class="pair">${L('vm', 'app', 'App A', 'app')}${L('vm', 'app', 'App B', 'app')}</div><div class="pair">${L('vm', 'guest', 'Guest kernel A', 'kern')}${L('vm', 'guest', 'Guest kernel B', 'kern')}</div>${L('vm', 'hyp', 'Hypervisor（KVM、Hyper-V…）', 'hyp')}${L('vm', 'hw', '實體硬體', 'hw')}</div>${note(c.vmT)}`)}
        ${panel('容器（Container）', `<div class="stack"><div class="pair">${L('ct', 'app', 'App A + 函式庫', 'app')}${L('ct', 'app', 'App B + 函式庫', 'app')}</div>${L('ct', 'rt', 'namespaces（視角隔離）＋ cgroups（資源限制）', 'rt')}${L('ct', 'host', '共用的 Host kernel', 'kern')}${L('ct', 'hw', '實體硬體', 'hw')}</div>${note(c.ctT)}`)}
      </div>
      <div class="table-wrap"><table class="table compact"><thead><tr><th></th><th>VM</th><th>Container</th></tr></thead><tbody><tr><td>核心</td><td>每台 VM 各自一顆</td><td>共用 host kernel</td></tr><tr><td>隔離邊界</td><td>硬體虛擬化，較強</td><td>核心機制（namespaces、cgroups、seccomp），較薄</td></tr><tr><td>啟動時間</td><td>秒～數十秒</td><td>毫秒～秒</td></tr><tr><td>映像大小</td><td>GB 等級</td><td>MB 等級</td></tr><tr><td>可跑不同 OS</td><td>可以</td><td>只能跑與 host 相容的核心介面</td></tr></tbody></table></div>`;
    },
    act(s, a, arg) { if (a === 'set:sc') s.sc = arg; }
  });

  /* ───────────── 佇列與效能 ───────────── */
  register('queue', {
    title: '使用率、延遲與 Little\'s Law',
    prompt: '伺服器每秒能處理 100 個請求。到達率從 50 提高到 90，平均回應時間會增加 80% 還是 5 倍？先猜，再拖動滑桿。',
    init: () => ({ mu: 100, lam: 50 }),
    view(s) {
      const stable = s.lam < s.mu, rho = s.lam / s.mu, W = stable ? 1000 / (s.mu - s.lam) : Infinity, L = stable ? rho / (1 - rho) : Infinity, Wq = stable ? W - 1000 / s.mu : Infinity, p99 = W * Math.log(100);
      const Wp = 340, Hp = 180, pts = []; for (let r = 0; r <= 0.97; r += 0.01) pts.push([r, 1 / (1 - r)]);
      const X = r => 36 + r * (Wp - 50), Y = v => Hp - 24 - Math.min(v, 34) / 34 * (Hp - 40);
      const svg = `<svg class="curve" viewBox="0 0 ${Wp} ${Hp}" role="img" aria-label="回應時間對使用率的曲線"><line class="axis" x1="36" y1="${Hp - 24}" x2="${Wp - 10}" y2="${Hp - 24}"/><line class="axis" x1="36" y1="10" x2="36" y2="${Hp - 24}"/>${[0, 0.5, 0.8, 0.9].map(r => `<text class="tick" x="${X(r)}" y="${Hp - 8}">${r * 100}%</text>`).join('')}<text class="tick" x="6" y="18">W</text><polyline class="line" points="${pts.map(([r, v]) => `${X(r)},${Y(v)}`).join(' ')}"/>${stable ? `<circle class="dot" cx="${X(rho)}" cy="${Y(1 / (1 - rho))}" r="6"/>` : ''}</svg>`;
      return `<div class="sliders">${field(`服務率 μ = ${s.mu} 請求/秒`, range('mu', s.mu, 20, 200, 10, '服務率'))}${field(`到達率 λ = ${s.lam} 請求/秒`, range('lam', s.lam, 0, 220, 1, '到達率'))}</div>
      <div class="grid-2">
        ${panel('M/M/1 佇列模型', stable ? stats([stat('使用率 ρ = λ/μ', fmt(rho * 100, 0) + '%', { tone: rho > 0.85 ? 'hot' : '' }), stat('平均回應 W', fmt(W, 1) + ' ms', { tone: rho > 0.85 ? 'hot' : '' }), stat('其中排隊 Wq', fmt(Wq, 1) + ' ms'), stat('p99 回應（約）', fmt(p99, 0) + ' ms'), stat('系統中平均數量 L', fmt(L, 2)), stat('吞吐量', s.lam + ' 請求/秒')]) : note(`λ（${s.lam}）≥ μ（${s.mu}）：到達比服務快，佇列會無限增長、延遲持續上升。系統不穩定——吞吐量被卡在 ${s.mu}，多出來的請求只會排隊或被丟棄。`, 'bad'))}
        ${panel('回應時間 vs 使用率', svg + '<p class="muted">縱軸以「無排隊時的服務時間」為 1 倍。曲線在 80% 之後急遽上升。</p>')}
      </div>
      ${stable ? note(`Little's Law 驗算：L = λ × W = ${s.lam} × ${fmt(W / 1000, 4)} 秒 = <b>${fmt(s.lam * W / 1000, 2)}</b>，與佇列模型算出的 L 相同。${rho > 0.85 ? ' 使用率已超過 85%：再多一點流量，延遲就會暴增。這就是「CPU 100% 不代表系統表現最好」。' : ''}`, rho > 0.85 ? 'warn' : 'ok') : ''}`;
    },
    set(s, key, v) { if (key === 'mu') s.mu = int(v, 20, 200, 100); if (key === 'lam') s.lam = int(v, 0, 220, 50); }
  });

  /* ───────────── API 請求的旅程 ───────────── */
  sim.journey = function (o) {
    const db = { cache: 0.3, ssd: 2.5, hdd: 12 }[o.db];
    return [
      ['DNS 查詢', o.dns ? 0 : 20, 'net', '網路', 3],
      ['TCP + TLS 交握', o.keep ? 0 : 2 * o.rtt, 'net', '網路', 13],
      ['請求傳到伺服器', o.rtt / 2, 'net', '網路', 13],
      ['網卡中斷、核心網路堆疊、喚醒 worker', 0.05, 'cpu', 'CPU / 核心', 9],
      ['等待空閒 worker（排隊）', o.busy ? 30 : 0, 'queue', '排程 / 排隊', 12],
      ['應用程式邏輯', 2, 'cpu', 'CPU / 核心', 4],
      ['資料庫讀取', db, 'io', '儲存 I/O', 8],
      ['序列化並回應', o.rtt / 2 + 1, 'net', '網路', 13]
    ].map(([name, ms, cat, label, ch]) => ({ name, ms, cat, label, ch }));
  };
  register('journey', {
    title: '一個 API 請求的延遲分解',
    prompt: '使用者覺得 API 很慢。在你調整任何選項前，先猜猜看：哪一段最可能占最多時間？',
    init: () => ({ rtt: 40, dns: true, keep: false, busy: false, db: 'hdd' }),
    view(s, ctx) {
      const st = sim.journey(s), total = st.reduce((a, x) => a + x.ms, 0), top = st.slice().sort((a, b) => b.ms - a.ms)[0];
      const cats = {}; st.forEach(x => { cats[x.label] = (cats[x.label] || 0) + x.ms; });
      return `<div class="grid-2">
      ${panel('情境設定', `${field(`網路往返 RTT = ${s.rtt} ms`, range('rtt', s.rtt, 2, 150, 1, 'RTT'))}
        <div class="checks">${[['dns', 'DNS 結果已快取'], ['keep', '重用既有連線（keep-alive）'], ['busy', '伺服器忙碌：所有 worker 都在處理別的請求']].map(([k, t]) => `<label><input type="checkbox" data-set="${k}"${s[k] ? ' checked' : ''}> ${t}</label>`).join('')}</div>
        ${field('資料在哪裡', seg('db', s.db, [['cache', '記憶體快取'], ['ssd', 'SSD'], ['hdd', 'HDD']], '資料位置'))}`)}
      ${panel('總延遲', `<div class="big-num">${fmt(total, 1)} <small>ms</small></div><div class="stack-bar">${st.filter(x => x.ms > 0).map(x => `<i class="${x.cat}" style="flex:${x.ms}" title="${x.name} ${fmt(x.ms, 2)} ms"></i>`).join('')}</div><div class="legend">${Object.entries(cats).map(([k, v]) => `<span><i class="${st.find(x => x.label === k).cat}"></i>${k} ${fmt(v / total * 100, 0)}%</span>`).join('')}</div>`)}
      </div>
      <div class="table-wrap"><table class="table compact journey"><thead><tr><th>階段</th><th>時間</th><th>占比</th><th>對應章節</th></tr></thead><tbody>${st.map(x => `<tr class="${x === top ? 'sel' : ''}${x.ms === 0 ? ' dim' : ''}"><td><i class="dot ${x.cat}"></i>${x.name}</td><td>${fmt(x.ms, 2)} ms</td><td><span class="bar" style="--w:${x.ms / total * 100}%"></span>${fmt(x.ms / total * 100, 1)}%</td><td><button type="button" class="link" data-go="${x.ch}">${h(ctx.chapterLabel(x.ch))}</button></td></tr>`).join('')}</tbody></table></div>
      ${note(`最大的一塊是「${top.name}」（${fmt(top.ms / total * 100, 0)}%）。先優化它才有感；把只占 1% 的應用程式邏輯加速一倍，使用者幾乎感覺不到。`, 'info')}`;
    },
    act(s, a, arg) { if (a === 'set:db') s.db = arg; },
    set(s, key, v, ctx, el) { if (key === 'rtt') s.rtt = int(v, 2, 150, 40); if (['dns', 'keep', 'busy'].includes(key)) s[key] = el.checked; }
  });

  /* ───────────── fork 行程樹 ───────────── */
  const FORK_PROGS = {
    loop: { label: 'for 迴圈 n 次 fork', code: n => [`for (int i = 0; i < ${n}; i++)`, '    fork();', 'printf("hi\\n");'], ops: n => [...Array(n).fill({ t: 'fork', line: 1 }), { t: 'print', v: 'hi', line: 2 }] },
    seq: { label: 'fork → A → fork → B', code: () => ['fork();', 'printf("A");', 'fork();', 'printf("B");'], ops: () => [{ t: 'fork', line: 0 }, { t: 'print', v: 'A', line: 1 }, { t: 'fork', line: 2 }, { t: 'print', v: 'B', line: 3 }] },
    child: { label: 'if (fork() == 0) fork();', code: () => ['if (fork() == 0)', '    fork();', 'printf("X");'], ops: () => [{ t: 'fork', line: 0 }, { t: 'forkIf', cond: 'child', line: 1 }, { t: 'print', v: 'X', line: 2 }] },
    and: { label: 'fork() && fork();', code: () => ['fork() && fork();', 'printf("Y");'], ops: () => [{ t: 'fork', line: 0 }, { t: 'forkIf', cond: 'parent', line: 0 }, { t: 'print', v: 'Y', line: 1 }] }
  };
  sim.forkRun = function (ops, upto = ops.length) {
    const ps = [{ id: 1, parent: null, ret: null, out: '' }]; let next = 2;
    for (const op of ops.slice(0, upto)) {
      for (const p of ps.slice()) {
        if (op.t === 'print') p.out += op.v;
        if (op.t === 'fork' || (op.t === 'forkIf' && p.ret === op.cond)) { const c = { id: next++, parent: p.id, ret: 'child', out: '' }; p.ret = 'parent'; ps.push(c); }
      }
    }
    return { ps, prints: ps.reduce((a, p) => a + p.out.length, 0) };
  };
  register('fork', {
    title: 'fork() 行程樹與輸出預測',
    prompt: '先在下方輸入你的預測：總共有幾個行程？會印出幾次？再一步一步執行驗證。',
    init: () => ({ prog: 'loop', n: 3, k: 0, guessP: '', guessO: '' }),
    auto: { action: 'step', done: s => s.k >= FORK_PROGS[s.prog].ops(s.n).length },
    view(s) {
      const P = FORK_PROGS[s.prog], ops = P.ops(s.n), code = P.code(s.n), r = sim.forkRun(ops, s.k), finished = s.k >= ops.length;
      const curLine = s.k > 0 ? ops[s.k - 1].line : -1;
      const kids = id => r.ps.filter(p => p.parent === id);
      const tree = p => `<li><span class="proc${p.id === 1 ? ' root' : ''}">P${p.id}${p.out ? `<small>印出 ${h(p.out)}</small>` : ''}</span>${kids(p.id).length ? `<ul>${kids(p.id).map(tree).join('')}</ul>` : ''}</li>`;
      const final = sim.forkRun(ops), counts = {}; final.ps.forEach(p => [...p.out].forEach(ch => { counts[ch] = (counts[ch] || 0) + 1; }));
      return `<div class="row wrap">${seg('prog', s.prog, Object.entries(FORK_PROGS).map(([k, v]) => [k, v.label]), '程式')}${s.prog === 'loop' ? field('n', seg('n', s.n, [1, 2, 3, 4].map(x => [x, x]), 'n')) : ''}</div>
      <div class="grid-2">
        ${panel('程式碼', `<pre class="code-mini">${code.map((l, i) => `<span class="${i === curLine ? 'on' : ''}">${h(l)}</span>`).join('\n')}</pre>
          <div class="row wrap">${field('預測行程總數', `<input class="num" data-set="guessP" value="${h(s.guessP)}" inputmode="numeric" aria-label="預測行程總數">`)}${field('預測輸出字元總數', `<input class="num" data-set="guessO" value="${h(s.guessO)}" inputmode="numeric" aria-label="預測輸出數">`)}</div>
          <div class="row">${btn('step', '執行下一個操作 →', { kind: 'primary', disabled: finished })}${btn('all', '全部執行', { disabled: finished })}${btn('restart', '從頭開始', { disabled: s.k === 0 })}</div>`)}
        ${panel('行程樹', `<ul class="ptree">${tree(r.ps[0])}</ul>`, `${r.ps.length} 個行程`)}
      </div>
      ${finished ? note(`結果：共 <b>${final.ps.length}</b> 個行程，輸出 ${Object.entries(counts).map(([c, n]) => `「${h(c)}」${n} 次`).join('、')}（共 ${final.prints} 個字元）。${s.guessP !== '' ? (Number(s.guessP) === final.ps.length ? ' 行程數預測正確！' : ` 你預測 ${h(s.guessP)} 個行程——差在哪一步？`) : ''}${s.guessO !== '' ? (Number(s.guessO) === final.prints ? ' 輸出數預測正確！' : ` 你預測輸出 ${h(s.guessO)} 個字元。`) : ''} 輸出的「順序」每次執行都可能不同，因為父子行程的執行先後由排程器決定。`, 'ok') : ''}
      ${s.prog === 'and' ? '<p class="muted">提示：在 a && b 中，若 a 為 0（假）就不會執行 b。子行程中 fork() 回傳 0。</p>' : ''}${s.prog === 'seq' ? '<p class="muted">進階陷阱：printf("A") 沒有換行時，「A」可能還在 stdio 緩衝區裡；fork 會連同緩衝區一起複製，所以實際終端機上可能看到更多個 A。這裡計算的是每個行程「執行了幾次 printf」。</p>' : ''}`;
    },
    act(s, a, arg) {
      const len = FORK_PROGS[s.prog].ops(s.n).length;
      if (a === 'step') s.k = Math.min(len, s.k + 1);
      if (a === 'all') s.k = len;
      if (a === 'restart') s.k = 0;
      if (a === 'set:prog') { s.prog = arg; s.k = 0; }
      if (a === 'set:n') { s.n = +arg; s.k = 0; }
    },
    set(s, key, v) { if (key === 'guessP' || key === 'guessO') s[key] = String(v).replace(/\D/g, '').slice(0, 3); }
  });

  /* ───────────── 綜合複習（混合題） ───────────── */
  register('review', {
    title: '綜合混合練習',
    prompt: '題目來自所有章節並隨機混合，優先出現你曾經答錯的題目。作答前先想：這題屬於哪一章的觀念？',
    init: ctx => ({ items: ctx.pickReview(8), i: 0, choice: null, score: 0, seed: Date.now() }),
    view(s, ctx) {
      if (!s.items.length) return note('題庫還沒有準備好。', 'warn');
      if (s.i >= s.items.length) return `<div class="center">${stats([stat('得分', `${s.score} / ${s.items.length}`, { tone: s.score === s.items.length ? 'ok' : '' })])}<p>${s.score === s.items.length ? '全部答對！你已經能跨章節運用這些觀念。' : '答錯的題目已加入錯題本，可以到「錯題複習」頁面再練一次。'}</p><div class="row center">${btn('again', '再來一組', { kind: 'primary' })}<a class="btn secondary sm" href="#/review">前往錯題複習</a></div></div>`;
      const [lid, qi] = s.items[s.i], L = ctx.lesson(lid), q = L.quiz[qi], answered = s.choice !== null;
      return `<div class="row between"><span class="muted">第 ${s.i + 1} / ${s.items.length} 題 · 得分 ${s.score}</span>${answered ? `<span class="tag">${h(ctx.chapterLabel(lid))}</span>` : '<span class="tag">章節隱藏中</span>'}</div>
      <h3 class="q">${h(q[0])}</h3>
      <div class="choices">${q[1].map((c, i) => `<button type="button" class="choice${answered ? (i === q[2] ? ' right' : i === s.choice ? ' wrong' : '') : ''}" data-act="answer" data-arg="${i}"${answered ? ' disabled' : ''}><span class="key">${String.fromCharCode(65 + i)}</span>${h(c)}</button>`).join('')}</div>
      ${answered ? note(`${s.choice === q[2] ? '✓ 答對了。' : '✗ 正解是「' + h(q[1][q[2]]) + '」。'} ${h(q[4])}`, s.choice === q[2] ? 'ok' : 'bad') + `<div class="row">${btn('next', s.i === s.items.length - 1 ? '看結果 →' : '下一題 →', { kind: 'primary' })}<button type="button" class="btn ghost sm" data-go="${lid}">回到「${h(L.title)}」複習</button></div>` : ''}`;
    },
    act(s, a, arg, ctx) {
      if (a === 'answer' && s.choice === null) { s.choice = +arg; const [lid, qi] = s.items[s.i], ok = s.choice === ctx.lesson(lid).quiz[qi][2]; if (ok) s.score++; ctx.recordAnswer(lid, qi, ok); }
      if (a === 'next') { s.i++; s.choice = null; }
      if (a === 'again') { s.items = ctx.pickReview(8); s.i = 0; s.choice = null; s.score = 0; }
    }
  });
})();
