/* OS LAB 互動實驗：共用工具、執行與排程、並行相關實驗。
 * 每個實驗註冊為 { title, prompt, init(ctx), view(s, ctx), act(s, action, arg, ctx), set(s, key, value, ctx), auto }。
 * act / set 直接修改狀態；app 負責重繪、回上一步（歷史）、自動播放。純計算函式掛在 OSLabs.sim 供測試使用。 */
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
  const num = (key, value, lo, hi, o = {}) => `<input class="num" type="number" inputmode="numeric" min="${lo}" max="${hi}" value="${value}" data-set="${key}"${o.label ? ` aria-label="${h(o.label)}"` : ''}${o.live ? ' data-live' : ''}>`;
  const field = (label, control) => `<label class="field"><span>${label}</span>${control}</label>`;
  const range = (key, value, lo, hi, step, label) => `<input class="range" type="range" min="${lo}" max="${hi}" step="${step}" value="${value}" data-set="${key}" data-live aria-label="${h(label)}">`;
  const panel = (title, body, extra = '') => `<section class="board">${title ? `<div class="board-title">${title}${extra ? `<span>${extra}</span>` : ''}</div>` : ''}${body}</section>`;
  const avg = (rows, k) => rows.length ? rows.reduce((a, r) => a + r[k], 0) / rows.length : 0;
  const fmt = (n, d = 2) => Number.isInteger(n) ? String(n) : n.toFixed(d);

  const registry = {};
  window.OSLabs = { registry, sim: {}, ui: { h, clamp, int, btn, seg, stat, stats, note, num, field, range, panel, avg, fmt }, register(type, def) { registry[type] = def; } };
  const { register, sim } = window.OSLabs;

  /* ───────────── CPU 指令週期 ───────────── */
  const CPU_OPS = [
    { asm: 'LOAD  R1, [0x2000]', effect: '從位址 0x2000 讀出 7，放進 R1' },
    { asm: 'ADD   R1, 5', effect: 'R1 = 7 + 5 = 12' },
    { asm: 'STORE [0x2004], R1', effect: '把 R1 的 12 寫到位址 0x2004' }
  ];
  const STAGES = ['FETCH', 'DECODE', 'EXECUTE', 'RETIRE'];
  const STAGE_TEXT = ['依 PC 從記憶體取出指令', '解析運算碼與運算元', '執行運算、讀寫資料', '完成指令，PC 前進到下一條'];
  register('cpu', {
    title: 'CPU 指令週期與計時器中斷',
    prompt: 'CPU 如何知道下一條要執行哪個指令？如果在指令執行到一半時發生 timer interrupt，CPU 會立刻跳走嗎？',
    init: () => ({ t: 0, irq: false, irqServed: 0, inIsr: false, log: ['PC = 0x1000，等待執行第一條指令。'] }),
    auto: { action: 'next', done: s => s.t >= 12 && !s.inIsr },
    view(s) {
      const step = Math.min(2, Math.floor(s.t / 4)), phase = s.t % 4, finished = s.t >= 12;
      const r1 = s.t >= 7 ? 12 : s.t >= 3 ? 7 : 0, mem = s.t >= 11 ? 12 : 0;
      const pc = 0x1000 + 4 * Math.floor(s.t / 4);
      return `<div class="grid-2">
        ${panel('程式（指令記憶體）', `<ol class="asm">${CPU_OPS.map((op, i) => `<li class="${!finished && step === i ? 'on' : ''}${s.t >= (i + 1) * 4 ? ' done' : ''}"><code>0x${(0x1000 + i * 4).toString(16)}</code><span>${op.asm}</span></li>`).join('')}</ol>
          <div class="mem"><div><code>0x2000</code><b>7</b></div><div class="${mem ? 'flash' : ''}"><code>0x2004</code><b>${mem}</b></div></div>`)}
        ${panel('CPU 狀態', `${stats([stat('PC', '0x' + pc.toString(16)), stat('R1', r1, { tone: s.t === 7 || s.t === 3 ? 'hot' : '' }), stat('完成階段', `${s.t} / 12`), stat('已處理中斷', s.irqServed)])}
          <div class="pipeline">${STAGES.map((x, i) => `<div class="${!finished && !s.inIsr && phase === i ? 'on' : ''}"><b>${x}</b><small>${STAGE_TEXT[i]}</small></div>`).join('')}</div>
          ${s.irq ? note('⏱ 中斷訊號已到達，等目前指令完成後才處理（中斷在指令邊界被檢查）。', 'warn') : ''}
          ${s.inIsr ? note('🛡 進入核心的中斷處理程式：儲存 PC 與暫存器 → 更新計時、做排程決策 → 恢復狀態返回。這次選擇繼續執行原程式。', 'info') : ''}`)}
      </div>
      ${note(h(s.log[s.log.length - 1]))}
      <div class="row">${btn('next', finished && !s.inIsr ? '三條指令都完成了' : s.inIsr ? '從中斷返回 →' : `執行 ${STAGES[phase]} →`, { kind: 'primary', disabled: finished && !s.inIsr })}${btn('irq', '⏱ 觸發 timer interrupt', { disabled: s.irq || s.inIsr || finished })}</div>`;
    },
    act(s, a) {
      if (a === 'irq') { s.irq = true; s.log.push('計時器發出中斷請求；CPU 會在目前指令結束時檢查。'); return; }
      if (a !== 'next') return;
      if (s.inIsr) { s.inIsr = false; s.log.push(`中斷處理完成，恢復 PC = 0x${(0x1000 + 4 * Math.floor(s.t / 4)).toString(16)}，從被打斷的位置繼續。`); return; }
      if (s.t >= 12) return;
      if (s.irq && s.t % 4 === 0) { s.irq = false; s.inIsr = true; s.irqServed++; s.log.push('指令邊界：CPU 發現待處理中斷，切換到 kernel mode 並跳到中斷向量。'); return; }
      const step = Math.floor(s.t / 4), phase = s.t % 4; s.t++;
      s.log.push(`${CPU_OPS[step].asm}：${STAGES[phase]} — ${phase === 2 ? CPU_OPS[step].effect : STAGE_TEXT[phase]}。${phase === 3 && step < 2 ? ` PC → 0x${(0x1004 + step * 4).toString(16)}` : ''}`);
      if (s.irq && s.t % 4 === 0 && s.t < 12) s.log[s.log.length - 1] += '（有待處理中斷，下一步先處理它）';
    }
  });

  /* ───────────── System call 路徑 ───────────── */
  const SYS = [
    { name: '應用程式呼叫 read()', mode: 'user', text: '程式執行 read(fd, buf, 4096)，這只是一般的函式呼叫，仍在 user mode。' },
    { name: 'C 函式庫準備系統呼叫', mode: 'user', text: '把系統呼叫編號與參數放進暫存器，執行 syscall / ecall 等陷入指令。' },
    { name: '陷入核心（mode switch）', mode: 'kernel', text: 'CPU 切換到 kernel mode，跳到系統呼叫進入點，保存使用者暫存器。', mode1: true },
    { name: '核心驗證參數', mode: 'kernel', text: '檢查 fd 是否有效、buf 是否屬於這個行程且可寫、檔案是否允許讀取。' },
    { name: '查詢 page cache', mode: 'kernel', text: '若資料已在記憶體快取中，直接複製；否則透過驅動程式送出 I/O 請求。' },
    { name: '等待裝置（Blocked）', mode: 'blocked', text: '執行緒進入 Waiting，排程器改跑其他 Ready 工作——這裡才發生 context switch。', miss: true },
    { name: '中斷喚醒', mode: 'kernel', text: '裝置完成後發出中斷；核心把等待的執行緒移回 Ready，等待再次被排程。', miss: true },
    { name: '複製資料並返回', mode: 'user', text: '把資料複製到 buf，回傳讀取的位元組數，切回 user mode 繼續執行。' }
  ];
  const sysPath = hit => SYS.map((x, i) => i).filter(i => !(hit && SYS[i].miss));
  register('syscall', {
    title: 'read() 系統呼叫的完整路徑',
    prompt: 'read() 進入核心之後，是否一定會讓 CPU 切換去跑別的行程？切換「快取命中」再走一次比較看看。',
    init: () => ({ i: 0, hit: false }),
    auto: { action: 'next', done: s => s.i >= sysPath(s.hit).length - 1 },
    view(s) {
      const path = sysPath(s.hit), cur = path[s.i], info = SYS[cur];
      const seen = path.slice(0, s.i + 1);
      const modeSwitches = seen.filter((idx, k) => k > 0 && (SYS[idx].mode === 'user') !== (SYS[seen[k - 1]].mode === 'user')).length;
      const ctx = seen.includes(5) ? (seen.includes(6) ? 2 : 1) : 0;
      return `<div class="row between">${seg('hit', s.hit ? 1 : 0, [[0, '資料不在快取（需讀裝置）'], [1, 'page cache 命中']], '快取情境')}<span class="muted">步驟 ${s.i + 1} / ${path.length}</span></div>
      <ol class="flow">${SYS.map((x, i) => { const skipped = !path.includes(i), k = path.indexOf(i); return `<li class="mode-${x.mode}${i === cur ? ' on' : ''}${k >= 0 && k < s.i ? ' done' : ''}${skipped ? ' skip' : ''}"><span class="badge">${x.mode === 'user' ? 'USER' : x.mode === 'kernel' ? 'KERNEL' : 'WAIT'}</span><b>${x.name}</b>${skipped ? '<small>快取命中，略過</small>' : ''}</li>`; }).join('')}</ol>
      ${panel(info.name, `<p>${info.text}</p>${stats([stat('目前模式', info.mode === 'user' ? 'User mode' : info.mode === 'kernel' ? 'Kernel mode' : 'Blocked（Waiting）', { tone: info.mode === 'user' ? '' : 'hot' }), stat('模式切換次數', modeSwitches), stat('Context switch', ctx)])}`)}
      ${s.i === path.length - 1 ? note(s.hit ? '這次只發生了 user → kernel → user 的模式切換，沒有 context switch：進入核心 ≠ 換行程。' : '需要等裝置時，執行緒讓出 CPU（context switch），完成後再被喚醒排程。比較兩種情境的計數器。', 'ok') : ''}
      <div class="row">${btn('prev', '← 上一步', { disabled: s.i === 0 })}${btn('next', '下一步 →', { kind: 'primary', disabled: s.i >= path.length - 1 })}</div>`;
    },
    act(s, a, arg) {
      const n = sysPath(s.hit).length;
      if (a === 'next') s.i = Math.min(n - 1, s.i + 1);
      if (a === 'prev') s.i = Math.max(0, s.i - 1);
      if (a === 'set:hit') { s.hit = arg === '1'; s.i = 0; }
    }
  });

  /* ───────────── 行程狀態 ───────────── */
  const TRANS = {
    admit: ['New', 'Ready', '允許進入（admit）', '行程建立完成，PCB 就緒，加入 Ready 佇列。'],
    dispatch: ['Ready', 'Running', '排程器選中（dispatch）', '排程器選中它，載入暫存器內容，開始在 CPU 上執行。'],
    timeout: ['Running', 'Ready', '時間片用完（timer interrupt）', '計時器中斷，時間片用完，被搶先回到 Ready 佇列尾端。'],
    block: ['Running', 'Waiting', '發出 I/O 請求', '呼叫 read() 等待磁碟，進入 Waiting，CPU 讓給別人。'],
    wake: ['Waiting', 'Ready', 'I/O 完成（中斷）', 'I/O 完成，被移回 Ready——仍要等排程器選中才能執行。'],
    exit: ['Running', 'Terminated', '呼叫 exit()', '程式結束，等待父行程 wait() 回收結束狀態。']
  };
  const WHY_NOT = {
    'Waiting>dispatch': 'Waiting 中的行程在等事件，事件沒完成前不能被排程。',
    'Ready>block': '只有正在執行的行程才能發出 I/O 請求；Ready 行程根本沒在 CPU 上。',
    'Ready>exit': '要執行到 exit() 才會結束，Ready 行程目前沒有在執行。',
    'Ready>timeout': '時間片只對 Running 中的行程計時。',
    'Waiting>exit': 'Waiting 中的行程沒有在執行，不會自己呼叫 exit()（被 kill 是另一回事）。',
    'Running>wake': '「喚醒」是給 Waiting 行程用的；Running 行程沒在等事件。'
  };
  const STATES = ['New', 'Ready', 'Running', 'Waiting', 'Terminated'];
  register('process', {
    title: '行程狀態機與 PCB',
    prompt: 'Running 中的行程發出磁碟讀取，下一個狀態是 Ready 還是 Waiting？I/O 完成後能不能直接回到 Running？試著按下「不合法」的轉換看看。',
    init: () => ({ status: 'New', cpu: 0, switches: 0, log: [['info', 'fork() 建立了 PID 1234，狀態為 New。']] }),
    view(s) {
      return `<div class="states">${STATES.map(x => `<div class="state${s.status === x ? ' on' : ''}" data-state="${x}"><b>${x}</b><small>${{ New: '建立中', Ready: '等 CPU', Running: '執行中', Waiting: '等事件', Terminated: '已結束' }[x]}</small></div>`).join('')}</div>
      <div class="grid-2">
        ${panel('觸發事件', `<div class="events">${Object.entries(TRANS).map(([k, t]) => `<button type="button" class="event${t[0] === s.status ? ' legal' : ''}" data-act="go" data-arg="${k}"><b>${t[2]}</b><small>${t[0]} → ${t[1]}</small></button>`).join('')}</div>`)}
        ${panel('PCB（簡化）', `<dl class="pcb"><dt>PID</dt><dd>1234</dd><dt>狀態</dt><dd><b>${s.status}</b></dd><dt>已用 CPU 時間片</dt><dd>${s.cpu}</dd><dt>被切換次數</dt><dd>${s.switches}</dd><dt>等待原因</dt><dd>${s.status === 'Waiting' ? '磁碟 I/O' : '—'}</dd></dl>`)}
      </div>
      <ol class="log">${s.log.slice(-5).reverse().map(([tone, t]) => `<li class="${tone}">${h(t)}</li>`).join('')}</ol>`;
    },
    act(s, a, arg) {
      if (a !== 'go') return;
      const t = TRANS[arg];
      if (s.status === 'Terminated') { s.log.push(['bad', '行程已結束，不會再有狀態轉換。按「重設」重新開始。']); return; }
      if (t[0] !== s.status) { s.log.push(['bad', `✗ ${s.status} 不能「${t[2]}」。${WHY_NOT[s.status + '>' + arg] || `這個事件只適用於 ${t[0]} 狀態。`}`]); return; }
      if (arg === 'dispatch') s.cpu++;
      if (arg === 'timeout' || arg === 'block') s.switches++;
      s.status = t[1]; s.log.push(['ok', `✓ ${t[0]} → ${t[1]}：${t[3]}`]);
    }
  });

  /* ───────────── Thread 共享與私有 ───────────── */
  const THREAD_ITEMS = [
    ['全域變數 counter', 'shared', '全域資料區屬於整個行程。'],
    ['malloc() 取得的緩衝區', 'shared', 'Heap 由所有執行緒共用。'],
    ['函式內的區域變數 i', 'private', '區域變數放在各自的 stack 上。'],
    ['程式計數器 PC', 'private', '每個執行流執行到不同位置。'],
    ['開啟的檔案描述符 fd 3', 'shared', '開啟檔案表屬於行程。'],
    ['暫存器內容', 'private', 'context switch 時各自保存。'],
    ['程式碼（text 區段）', 'shared', '同一份程式碼，各自執行不同位置。'],
    ['執行緒 ID（TID）', 'private', '每個執行緒有自己的識別碼。']
  ];
  register('thread', {
    title: '執行緒：哪些共享、哪些私有？',
    prompt: '先把每個項目分類，再看右側的記憶體配置圖驗證。哪一類錯誤最容易造成 race condition？',
    init: () => ({ n: 2, ans: {} }),
    view(s) {
      const done = Object.keys(s.ans).length, correct = THREAD_ITEMS.filter((it, i) => s.ans[i] === it[1]).length;
      return `<div class="grid-2">
      ${panel('分類練習', `<ul class="sorter">${THREAD_ITEMS.map((it, i) => { const a = s.ans[i]; return `<li class="${a ? (a === it[1] ? 'ok' : 'bad') : ''}"><span>${it[0]}${a ? `<small>${a === it[1] ? '✓ ' : '✗ '}${it[2]}</small>` : ''}</span><span class="seg">${['shared', 'private'].map(v => `<button type="button" data-act="sort" data-arg="${i}:${v}" aria-pressed="${a === v}">${v === 'shared' ? '共享' : '私有'}</button>`).join('')}</span></li>`; }).join('')}</ul>
        ${stats([stat('已作答', `${done} / ${THREAD_ITEMS.length}`), stat('答對', correct, { tone: done === THREAD_ITEMS.length && correct === done ? 'ok' : '' })])}`)}
      ${panel('一個行程的記憶體配置', `<div class="addr-space"><div class="shared"><b>共享區（整個行程）</b><div>Code（text）</div><div>Data / 全域變數</div><div>Heap（malloc）</div><div>開啟的檔案、訊號處理</div></div>
        <div class="threads">${Array.from({ length: s.n }, (_, i) => `<div class="th"><b>T${i + 1}</b><div>Stack</div><div>PC</div><div>暫存器</div><div>TID</div></div>`).join('')}</div></div>
        <div class="row">${btn('add', '＋ 建立執行緒', { disabled: s.n >= 4 })}${btn('remove', '－ 結束執行緒', { disabled: s.n <= 1 })}</div>
        <p class="muted">每多一個執行緒，只多一份 stack 與暫存器狀態；共享區不會被複製——這就是建立執行緒比建立行程便宜的原因。</p>`, `${s.n} 個執行緒`)}
      </div>`;
    },
    act(s, a, arg) {
      if (a === 'add') s.n = Math.min(4, s.n + 1);
      if (a === 'remove') s.n = Math.max(1, s.n - 1);
      if (a === 'sort') { const [i, v] = arg.split(':'); s.ans[i] = v; }
    }
  });

  /* ───────────── CPU 排程 ───────────── */
  const ALGOS = { FCFS: 'FCFS', SJF: 'SJF', SRTF: 'SRTF', RR: 'RR', PRI: 'Priority', PPRI: 'Priority（搶先）' };
  sim.scheduleSim = function (jobs, algo, q = 2) {
    const rows = jobs.map((p, i) => ({ ...p, pri: p.pri ?? 0, index: i, remaining: p.burst, first: null, done: null }));
    const preemptive = algo === 'SRTF' || algo === 'PPRI';
    const key = { FCFS: p => [p.arr, p.index], SJF: p => [p.burst, p.arr, p.index], SRTF: p => [p.remaining, p.arr, p.index], PRI: p => [p.pri, p.arr, p.index], PPRI: p => [p.pri, p.arr, p.index] }[algo];
    const cmp = (a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
    let t = 0, running = null, quantumLeft = 0; const trace = [], queues = [], ready = [], arrived = new Set();
    while (rows.some(p => p.remaining > 0) && t < 200) {
      if (algo === 'RR') {
        rows.filter(p => p.arr === t && !arrived.has(p.id)).forEach(p => { ready.push(p); arrived.add(p.id); });
        if (running && quantumLeft === 0 && running.remaining > 0) { ready.push(running); running = null; }
        if (!running) { running = ready.shift() || null; quantumLeft = q; }
        queues.push(ready.map(p => p.id));
      } else {
        const pool = rows.filter(p => p.remaining > 0 && p.arr <= t).sort(cmp);
        if (preemptive || !running) running = pool[0] || null;
        queues.push(pool.filter(p => p !== running).map(p => p.id));
      }
      if (!running) { trace.push('idle'); t++; continue; }
      if (running.first === null) running.first = t;
      trace.push(running.id); running.remaining--; if (algo === 'RR') quantumLeft--; t++;
      if (running.remaining === 0) { running.done = t; running = null; }
    }
    let switches = 0, last = null;
    for (const id of trace) { if (id === 'idle') continue; if (last && last !== id) switches++; last = id; }
    return { trace, queues, switches, rows: rows.map(p => ({ id: p.id, arr: p.arr, burst: p.burst, pri: p.pri, done: p.done, first: p.first, tat: p.done - p.arr, wt: p.done - p.arr - p.burst, rt: p.first - p.arr })) };
  };
  const PRESET_JOBS = [{ id: 'P1', arr: 0, burst: 6, pri: 3 }, { id: 'P2', arr: 1, burst: 3, pri: 1 }, { id: 'P3', arr: 2, burst: 4, pri: 4 }, { id: 'P4', arr: 4, burst: 2, pri: 2 }];
  const jobClass = (jobs, id) => id === 'idle' ? 'idle' : 'j' + jobs.findIndex(p => p.id === id);
  register('schedule', {
    title: 'CPU 排程模擬器',
    prompt: '在推進之前，先在紙上畫出你預測的 Gantt 圖。把 RR 的時間片從 2 改成 10，或切到 SRTF，平均等待時間會怎麼變？',
    init: () => ({ algo: 'RR', quantum: 2, t: 0, jobs: PRESET_JOBS.map(j => ({ ...j })) }),
    auto: { action: 'step', done: s => s.t >= sim.scheduleSim(s.jobs, s.algo, s.quantum).trace.length },
    view(s) {
      const sol = sim.scheduleSim(s.jobs, s.algo, s.quantum), len = sol.trace.length, reached = Math.min(s.t, len);
      const usesPri = s.algo === 'PRI' || s.algo === 'PPRI', finished = reached === len;
      const running = reached > 0 ? sol.trace[reached - 1] : null;
      return `<div class="row wrap">${seg('algo', s.algo, Object.entries(ALGOS), '排程演算法')}${s.algo === 'RR' ? field('時間片 q', num('quantum', s.quantum, 1, 10, { label: '時間片' })) : ''}</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>工作</th><th>到達 AT</th><th>CPU burst BT</th>${usesPri ? '<th>優先權（小 = 高）</th>' : ''}<th></th></tr></thead><tbody>${s.jobs.map((p, i) => `<tr><td><span class="chip j${i}">${p.id}</span></td><td>${num(`job:${i}:arr`, p.arr, 0, 20, { label: `${p.id} 到達時間` })}</td><td>${num(`job:${i}:burst`, p.burst, 1, 12, { label: `${p.id} CPU burst` })}</td>${usesPri ? `<td>${num(`job:${i}:pri`, p.pri, 0, 9, { label: `${p.id} 優先權` })}</td>` : ''}<td>${s.jobs.length > 2 ? `<button type="button" class="icon-btn" data-act="del" data-arg="${i}" aria-label="移除 ${p.id}">✕</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="row">${btn('addJob', '＋ 新增工作', { disabled: s.jobs.length >= 6 })}${btn('random', '🎲 隨機工作組')}${btn('preset', '還原範例')}</div>
      ${panel('Gantt Chart', `<div class="gantt-scroll"><div class="gantt" style="--n:${len}">${sol.trace.map((id, i) => `<div class="cell ${i < reached ? jobClass(s.jobs, id) : 'unseen'}${i === reached - 1 ? ' now' : ''}" title="t=${i}"><b>${i < reached ? (id === 'idle' ? '·' : id) : '?'}</b></div>`).join('')}</div><div class="gantt-axis" style="--n:${len}">${sol.trace.map((_, i) => `<span>${i}</span>`).join('')}<span>${len}</span></div></div>
        <div class="readyq"><span>t = ${reached}　CPU：<b>${!running ? '—' : running === 'idle' ? '閒置' : running}</b></span><span>Ready 佇列：${(reached > 0 ? sol.queues[reached - 1] : []).map(id => `<span class="chip ${jobClass(s.jobs, id)}">${id}</span>`).join('') || '<em>空</em>'}</span></div>`, `${reached} / ${len} ticks`)}
      <div class="row">${btn('step', '+1 tick →', { kind: 'primary', disabled: finished })}${btn('all', '跑到最後', { disabled: finished })}${btn('restart', '回到 t = 0', { disabled: reached === 0 })}</div>
      ${finished ? this.results(s, sol) : '<p class="muted">完整統計會在最後一個 tick 顯示——先專心預測每一格。</p>'}`;
    },
    results(s, sol) {
      const all = Object.keys(ALGOS).map(a => { const r = sim.scheduleSim(s.jobs, a, s.quantum); return { a, wt: avg(r.rows, 'wt'), tat: avg(r.rows, 'tat'), rt: avg(r.rows, 'rt'), sw: r.switches }; });
      const best = Math.min(...all.map(x => x.wt));
      return panel('結果', `<div class="table-wrap"><table class="table"><thead><tr><th>工作</th><th>CT</th><th>TAT = CT − AT</th><th>WT = TAT − BT</th><th>RT</th></tr></thead><tbody>${sol.rows.map(p => `<tr><td>${p.id}</td><td>${p.done}</td><td>${p.done} − ${p.arr} = <b>${p.tat}</b></td><td>${p.tat} − ${p.burst} = <b>${p.wt}</b></td><td>${p.first} − ${p.arr} = <b>${p.rt}</b></td></tr>`).join('')}</tbody></table></div>
        ${stats([stat('平均等待', fmt(avg(sol.rows, 'wt'))), stat('平均周轉', fmt(avg(sol.rows, 'tat'))), stat('平均回應', fmt(avg(sol.rows, 'rt'))), stat('Context switch', sol.switches)])}
        <div class="board-title" style="margin-top:16px">同一組工作，換演算法比較</div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>演算法</th><th>平均 WT</th><th>平均 TAT</th><th>平均 RT</th><th>切換</th></tr></thead><tbody>${all.map(x => `<tr class="${x.a === s.algo ? 'sel' : ''}"><td>${ALGOS[x.a]}${x.wt === best ? ' <span class="tag ok">WT 最低</span>' : ''}</td><td>${fmt(x.wt)}</td><td>${fmt(x.tat)}</td><td>${fmt(x.rt)}</td><td>${x.sw}</td></tr>`).join('')}</tbody></table></div>`);
    },
    act(s, a, arg) {
      const len = sim.scheduleSim(s.jobs, s.algo, s.quantum).trace.length;
      if (a === 'step') s.t = Math.min(len, s.t + 1);
      if (a === 'all') s.t = len;
      if (a === 'restart') s.t = 0;
      if (a === 'set:algo') { s.algo = arg; s.t = 0; }
      if (a === 'addJob') { const id = 'P' + (Math.max(...s.jobs.map(j => +j.id.slice(1))) + 1); s.jobs.push({ id, arr: s.jobs.length, burst: 3, pri: 2 }); s.t = 0; }
      if (a === 'del') { s.jobs.splice(+arg, 1); s.t = 0; }
      if (a === 'preset') { s.jobs = PRESET_JOBS.map(j => ({ ...j })); s.t = 0; }
      if (a === 'random') { const n = 3 + Math.floor(Math.random() * 3); s.jobs = Array.from({ length: n }, (_, i) => ({ id: 'P' + (i + 1), arr: i === 0 ? 0 : Math.floor(Math.random() * 7), burst: 1 + Math.floor(Math.random() * 7), pri: Math.floor(Math.random() * 5) })); s.t = 0; }
    },
    set(s, key, v) {
      s.t = 0;
      if (key === 'quantum') s.quantum = int(v, 1, 10, 2);
      const m = key.match(/^job:(\d+):(arr|burst|pri)$/);
      if (m) s.jobs[+m[1]][m[2]] = int(v, m[2] === 'burst' ? 1 : 0, m[2] === 'arr' ? 20 : m[2] === 'burst' ? 12 : 9, s.jobs[+m[1]][m[2]]);
    }
  });

  /* ───────────── MLFQ ───────────── */
  sim.mlfqSim = function (jobs, { quanta = [2, 4, Infinity], boost = 0 } = {}) {
    const ps = jobs.map((j, i) => ({ ...j, index: i, rem: j.burst, level: 0, used: 0, first: null, done: null }));
    const qs = [[], [], []]; let running = null, t = 0; const trace = [], snaps = [], events = [];
    while (ps.some(p => p.rem > 0) && t < 200) {
      const ev = [];
      ps.filter(p => p.arr === t).forEach(p => { qs[0].push(p); ev.push(`${p.id} 到達，進入 Q0`); });
      if (boost && t > 0 && t % boost === 0) {
        const all = [...(running ? [running] : []), ...qs[0], ...qs[1], ...qs[2]]; qs[0] = []; qs[1] = []; qs[2] = [];
        all.forEach(p => { p.level = 0; p.used = 0; qs[0].push(p); }); running = null; if (all.length) ev.push('Priority boost：所有工作回到 Q0');
      }
      if (running) { const higher = qs.slice(0, running.level).some(q => q.length); if (higher) { qs[running.level].unshift(running); ev.push(`${running.id} 被更高優先的工作搶先`); running = null; } }
      if (!running) { const q = qs.find(x => x.length); running = q ? q.shift() : null; }
      snaps.push({ queues: qs.map(q => q.map(p => p.id)), running: running && running.id, level: running && running.level });
      if (!running) { trace.push({ id: 'idle', level: -1 }); events.push(ev); t++; continue; }
      if (running.first === null) running.first = t;
      trace.push({ id: running.id, level: running.level }); running.rem--; running.used++; t++;
      if (running.rem === 0) { running.done = t; ev.push(`${running.id} 完成`); running = null; }
      else if (running.used >= quanta[running.level]) { const from = running.level; running.level = Math.min(2, running.level + 1); running.used = 0; qs[running.level].push(running); ev.push(`${running.id} 用完 Q${from} 時間片 → 降到 Q${running.level}`); running = null; }
      events.push(ev);
    }
    return { trace, snaps, events, rows: ps.map(p => ({ id: p.id, arr: p.arr, burst: p.burst, done: p.done, tat: p.done - p.arr, rt: p.first - p.arr })) };
  };
  const MLFQ_JOBS = [{ id: 'A', arr: 0, burst: 12 }, { id: 'B', arr: 0, burst: 8 }, { id: 'C', arr: 6, burst: 2 }, { id: 'D', arr: 14, burst: 3 }];
  register('mlfq', {
    title: 'MLFQ 多層回饋佇列',
    prompt: '長工作 A、B 一開始在 Q0；之後到達的短工作 C、D 會等很久嗎？開啟 priority boost 後，已經掉到 Q1、Q2 的 A、B 會發生什麼事？',
    init: () => ({ t: 0, boost: 0, jobs: MLFQ_JOBS.map(j => ({ ...j })) }),
    auto: { action: 'step', done: s => s.t >= sim.mlfqSim(s.jobs, { boost: s.boost }).trace.length },
    view(s) {
      const r = sim.mlfqSim(s.jobs, { boost: s.boost }), len = r.trace.length, reached = Math.min(s.t, len), snap = reached > 0 ? r.snaps[reached - 1] : { queues: [[], [], []], running: null };
      const cls = id => id === 'idle' ? 'idle' : 'j' + s.jobs.findIndex(j => j.id === id);
      return `<div class="row wrap">${field('Priority boost', seg('boost', s.boost, [[0, '關閉'], [10, '每 10 tick'], [20, '每 20 tick']], 'priority boost'))}</div>
      <div class="table-wrap"><table class="table compact"><thead><tr><th>工作</th><th>到達</th><th>CPU burst</th></tr></thead><tbody>${s.jobs.map((p, i) => `<tr><td><span class="chip j${i}">${p.id}</span></td><td>${num(`job:${i}:arr`, p.arr, 0, 30, { label: `${p.id} 到達時間` })}</td><td>${num(`job:${i}:burst`, p.burst, 1, 20, { label: `${p.id} burst` })}</td></tr>`).join('')}</tbody></table></div>
      <div class="grid-2">
        ${panel('三層佇列', ['Q0 · 時間片 2（最高）', 'Q1 · 時間片 4', 'Q2 · FCFS（最低）'].map((name, i) => `<div class="mlq${snap.running && snap.level === i ? ' active' : ''}"><span>${name}</span><div>${snap.running && snap.level === i ? `<span class="chip ${cls(snap.running)} run">▶ ${snap.running}</span>` : ''}${snap.queues[i].map(id => `<span class="chip ${cls(id)}">${id}</span>`).join('') || (snap.running && snap.level === i ? '' : '<em>空</em>')}</div></div>`).join(''), reached ? `第 ${reached} 個 tick（t = ${reached - 1} → ${reached}）` : 't = 0')}
        ${panel('這一個 tick 發生了什麼', `<ul class="events-log">${(reached > 0 ? r.events[reached - 1] : []).map(e => `<li>${h(e)}</li>`).join('') || '<li class="muted">按「+1 tick」開始</li>'}</ul>`)}
      </div>
      ${panel('Gantt（顏色深淺 = 所在佇列）', `<div class="gantt" style="--n:${len}">${r.trace.map((x, i) => `<div class="cell ${i < reached ? cls(x.id) + ' lv' + x.level : 'unseen'}${i === reached - 1 ? ' now' : ''}"><b>${i < reached ? (x.id === 'idle' ? '·' : x.id) : '?'}</b>${i < reached && x.level >= 0 ? `<small>Q${x.level}</small>` : ''}</div>`).join('')}</div>`, `${reached} / ${len}`)}
      <div class="row">${btn('step', '+1 tick →', { kind: 'primary', disabled: reached >= len })}${btn('all', '跑到最後', { disabled: reached >= len })}${btn('restart', '回到 t = 0', { disabled: reached === 0 })}</div>
      ${reached >= len ? panel('結果', `<div class="table-wrap"><table class="table compact"><thead><tr><th>工作</th><th>完成</th><th>周轉</th><th>回應</th></tr></thead><tbody>${r.rows.map(p => `<tr><td>${p.id}</td><td>${p.done}</td><td>${p.tat}</td><td>${p.rt}</td></tr>`).join('')}</tbody></table></div>${note('短工作（C、D）的回應時間很小：它們一到達就進入最高優先的 Q0。長工作逐層下降——這就是 MLFQ「不需預知 burst」卻能近似 SJF 的方式。', 'ok')}`) : ''}`;
    },
    act(s, a, arg) {
      const len = sim.mlfqSim(s.jobs, { boost: s.boost }).trace.length;
      if (a === 'step') s.t = Math.min(len, s.t + 1);
      if (a === 'all') s.t = len;
      if (a === 'restart') s.t = 0;
      if (a === 'set:boost') { s.boost = +arg; s.t = 0; }
    },
    set(s, key, v) { const m = key.match(/^job:(\d+):(arr|burst)$/); if (m) { s.jobs[+m[1]][m[2]] = int(v, m[2] === 'burst' ? 1 : 0, m[2] === 'burst' ? 20 : 30, s.jobs[+m[1]][m[2]]); s.t = 0; } }
  });

  /* ───────────── Race condition 與死結 ───────────── */
  const PROG = { plain: ['load', 'add', 'store'], lock: ['lock', 'load', 'add', 'store', 'unlock'] };
  const OPTEXT = { load: 'r = x', add: 'r = r + 1', store: 'x = r', lock: 'lock(m)', unlock: 'unlock(m)' };
  sim.raceStep = function (s, who) {
    const prog = PROG[s.lock ? 'lock' : 'plain'], op = prog[s.pc[who]];
    if (op === undefined) return `Thread ${who} 已經執行完畢。`;
    if (op === 'lock') { if (s.holder && s.holder !== who) { s.blocked[who] = true; return `Thread ${who} 嘗試 lock(m)，但 ${s.holder} 持有鎖 → ${who} 被阻塞等待。`; } s.holder = who; s.blocked[who] = false; }
    if (op === 'unlock') { s.holder = null; const other = who === 'A' ? 'B' : 'A'; s.blocked[other] = false; }
    if (op === 'load') s.reg[who] = s.x;
    if (op === 'add') s.reg[who]++;
    if (op === 'store') s.x = s.reg[who];
    s.pc[who]++; s.trace.push(who);
    return { lock: `Thread ${who} 取得鎖，進入臨界區。`, unlock: `Thread ${who} 釋放鎖。`, load: `Thread ${who} 讀取共享 x = ${s.x} 到自己的暫存器。`, add: `Thread ${who} 在暫存器中加 1，得到 ${s.reg[who]}（共享 x 仍是 ${s.x}）。`, store: `Thread ${who} 寫回 x = ${s.x}。` }[op];
  };
  sim.raceRun = (lock, order) => { const s = { lock, x: 0, pc: { A: 0, B: 0 }, reg: { A: null, B: null }, holder: null, blocked: { A: false, B: false }, trace: [] }; order.split('').forEach(w => sim.raceStep(s, w)); return s; };
  const raceInit = lock => ({ mode: 'counter', lock, x: 0, pc: { A: 0, B: 0 }, reg: { A: null, B: null }, holder: null, blocked: { A: false, B: false }, trace: [], msg: '共享變數 x = 0。由你決定下一步讓哪個 Thread 執行。' });
  const dlInit = order => ({ mode: 'deadlock', order, pc: { T1: 0, T2: 0 }, holds: { A: null, B: null }, waiting: { T1: null, T2: null }, msg: '兩個執行緒都需要鎖 A 與鎖 B。由你決定交錯順序。' });
  const DL = { T1: ['A', 'B'], T2: { same: ['A', 'B'], opposite: ['B', 'A'] } };
  sim.deadlockStep = function (s, who) {
    const seq = who === 'T1' ? DL.T1 : DL.T2[s.order]; const pc = s.pc[who];
    if (pc >= 3) return `${who} 已完成。`;
    if (pc === 2) { Object.keys(s.holds).forEach(r => { if (s.holds[r] === who) s.holds[r] = null; }); s.pc[who] = 3; s.waiting[who] = null; return `${who} 完成工作，釋放兩把鎖。`; }
    const r = seq[pc];
    if (s.holds[r] && s.holds[r] !== who) { s.waiting[who] = r; return `${who} 想取得鎖 ${r}，但被 ${s.holds[r]} 持有 → 等待。`; }
    s.holds[r] = who; s.waiting[who] = null; s.pc[who]++; return `${who} 取得鎖 ${r}。`;
  };
  const isDeadlocked = s => s.mode === 'deadlock' && s.waiting.T1 && s.waiting.T2 && s.holds[s.waiting.T1] === 'T2' && s.holds[s.waiting.T2] === 'T1';
  register('race', {
    title: 'Race condition、Mutex 與死結',
    prompt: '兩個 Thread 各做一次 x = x + 1，沒有鎖時，你能找到讓結果變成 1 的交錯嗎？加上 mutex 之後呢？再切到「兩把鎖」模式，找出讓兩個執行緒永遠卡住的順序。',
    init: () => raceInit(false),
    view(s) {
      const top = `<div class="row wrap">${seg('mode', s.mode, [['counter', '共享計數器'], ['deadlock', '兩把鎖與死結']], '實驗模式')}${s.mode === 'counter' ? seg('lock', s.lock ? 1 : 0, [[0, '不加鎖'], [1, '使用 mutex']], '鎖') : seg('order', s.order, [['opposite', 'T2 先 B 後 A'], ['same', 'T2 也先 A 後 B']], 'T2 取鎖順序')}</div>`;
      return top + (s.mode === 'counter' ? this.counter(s) : this.deadlock(s));
    },
    counter(s) {
      const prog = PROG[s.lock ? 'lock' : 'plain'], done = s.pc.A >= prog.length && s.pc.B >= prog.length;
      const col = who => `<div class="thread-col"><div class="board-title">Thread ${who}${s.blocked[who] ? ' <span class="tag warn">阻塞中</span>' : ''}${s.holder === who ? ' <span class="tag ok">持有鎖</span>' : ''}</div><ol class="code-steps">${prog.map((op, i) => `<li class="${i < s.pc[who] ? 'done' : i === s.pc[who] ? 'next' : ''}"><code>${OPTEXT[op]}</code></li>`).join('')}</ol><div class="reg">暫存器 r = <b>${s.reg[who] ?? '—'}</b></div>${btn('run', `執行 ${who} 的下一步`, { kind: 'primary', arg: who, disabled: s.pc[who] >= prog.length })}</div>`;
      return `<div class="race">${col('A')}<div class="shared-var"><span>共享變數</span><b>x = ${s.x}</b>${s.lock ? `<small>鎖：${s.holder ? s.holder + ' 持有' : '可用'}</small>` : ''}</div>${col('B')}</div>
      <div class="trace">執行順序：${s.trace.map(w => `<span class="chip ${w === 'A' ? 'j0' : 'j1'}">${w}</span>`).join('') || '<em>尚未開始</em>'}</div>
      ${note(h(s.msg), s.msg.includes('阻塞') ? 'warn' : '')}
      ${done ? note(s.x === 2 ? '✓ 最終 x = 2，兩次更新都保留了。' + (s.lock ? '有 mutex 時，無論你怎麼交錯，讀改寫都不會互相穿插。' : '這次的交錯剛好沒有重疊——但「剛好」不是正確性。') : '✗ 最終 x = 1：遺失更新（lost update）！兩個 Thread 都讀到 0，後寫回的覆蓋了先寫回的。', s.x === 2 ? 'ok' : 'bad') : ''}
      <div class="row">${btn('preset', '示範：輪流交錯', { arg: 'alt' })}${btn('preset', '示範：依序執行', { arg: 'serial' })}</div>`;
    },
    deadlock(s) {
      const dead = isDeadlocked(s), seq2 = DL.T2[s.order];
      const col = (who, seq) => `<div class="thread-col"><div class="board-title">${who}${s.waiting[who] ? ` <span class="tag warn">等待鎖 ${s.waiting[who]}</span>` : ''}</div><ol class="code-steps">${[`lock(${seq[0]})`, `lock(${seq[1]})`, '工作 → unlock 全部'].map((c, i) => `<li class="${i < s.pc[who] ? 'done' : i === s.pc[who] ? 'next' : ''}"><code>${c}</code></li>`).join('')}</ol>${btn('dl', `執行 ${who} 的下一步`, { kind: 'primary', arg: who, disabled: s.pc[who] >= 3 || dead })}</div>`;
      const edge = (from, to, cls) => `<line class="${cls}" x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}" marker-end="url(#arr)"/>`;
      const P = { T1: [50, 40], T2: [50, 140], A: [230, 40], B: [230, 140] }, edges = [];
      ['A', 'B'].forEach(r => { if (s.holds[r]) edges.push(edge(P[r], P[s.holds[r]], 'assign')); });
      ['T1', 'T2'].forEach(t => { if (s.waiting[t]) edges.push(edge(P[t], P[s.waiting[t]], 'request' + (dead ? ' cycle' : ''))); });
      return `<div class="race">${col('T1', DL.T1)}<div class="rag"><svg viewBox="0 0 280 180" role="img" aria-label="資源配置圖"><defs><marker id="arr" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>${edges.join('')}${['T1', 'T2'].map(t => `<circle cx="${P[t][0]}" cy="${P[t][1]}" r="18" class="node-p"/><text x="${P[t][0]}" y="${P[t][1] + 5}">${t}</text>`).join('')}${['A', 'B'].map(r => `<rect x="${P[r][0] - 18}" y="${P[r][1] - 18}" width="36" height="36" rx="6" class="node-r"/><text x="${P[r][0]}" y="${P[r][1] + 5}">${r}</text>`).join('')}</svg><small>資源配置圖：實線 R → T 為持有，虛線 T → R 為請求</small></div>${col('T2', seq2)}</div>
      ${note(h(s.msg), dead ? 'bad' : '')}
      ${dead ? note('☠ 死結！T1 持有 A 等 B，T2 持有 B 等 A——圖中出現環（循環等待）。四個必要條件同時成立。試試讓 T2 也「先 A 後 B」：統一鎖順序就不可能形成環。', 'bad') : ''}
      ${s.pc.T1 >= 3 && s.pc.T2 >= 3 ? note('✓ 兩個執行緒都完成了。', 'ok') : ''}`;
    },
    act(s, a, arg) {
      if (a === 'set:mode') { Object.keys(s).forEach(k => delete s[k]); Object.assign(s, arg === 'counter' ? raceInit(false) : dlInit('opposite')); return; }
      if (a === 'set:lock') { const n = raceInit(arg === '1'); Object.keys(s).forEach(k => delete s[k]); Object.assign(s, n); return; }
      if (a === 'set:order') { Object.keys(s).forEach(k => delete s[k]); Object.assign(s, dlInit(arg)); return; }
      if (a === 'run') s.msg = sim.raceStep(s, arg);
      if (a === 'preset') {
        const n = raceInit(s.lock); Object.keys(s).forEach(k => delete s[k]); Object.assign(s, n);
        const len = PROG[s.lock ? 'lock' : 'plain'].length; let turn = 'A';
        for (let k = 0; k < 30 && (s.pc.A < len || s.pc.B < len); k++) {
          let who = arg === 'serial' ? (s.pc.A < len ? 'A' : 'B') : turn;
          if (s.pc[who] >= len || s.blocked[who]) who = who === 'A' ? 'B' : 'A';
          sim.raceStep(s, who); turn = who === 'A' ? 'B' : 'A';
        }
        s.msg = `已執行完畢，順序：${s.trace.join(' → ')}`;
      }
      if (a === 'dl') s.msg = sim.deadlockStep(s, arg);
    }
  });

  /* ───────────── Semaphore：有界緩衝區 ───────────── */
  const bufInit = (n = 4, mode = 'sem') => ({ n, mode, slots: Array(n).fill(null), inp: 0, out: 0, next: 1, sem: { empty: n, full: 0, mutex: 1 }, waitP: false, waitC: false, dead: false, log: [['info', `緩衝區有 ${n} 格；empty = ${n}、full = 0、mutex = 1。`]] });
  sim.bufferProduce = function (s) {
    if (s.mode === 'none') {
      const over = s.slots[s.inp] !== null; const item = s.next++; s.slots[s.inp] = item; s.inp = (s.inp + 1) % s.n;
      return over ? ['bad', `✗ 沒有同步：緩衝區已滿，覆寫了尚未被消費的資料！（放入 #${item}）`] : ['ok', `放入 #${item}（沒有任何檢查）`];
    }
    if (s.mode === 'wrong' && s.sem.empty === 0) { s.sem.mutex = 0; s.waitP = true; s.dead = true; return ['bad', '生產者先 wait(mutex) 成功（mutex = 0），再 wait(empty) 時發現 empty = 0 → 抱著 mutex 睡著了。']; }
    if (s.sem.empty === 0) { s.waitP = true; return ['warn', 'wait(empty)：empty = 0，沒有空位 → 生產者被阻塞，等待消費者 signal(empty)。']; }
    s.sem.empty--; const item = s.next++; s.slots[s.inp] = item; s.inp = (s.inp + 1) % s.n; s.sem.full++;
    return ['ok', `wait(empty) → wait(mutex) → 放入 #${item} → signal(mutex) → signal(full)`];
  };
  sim.bufferConsume = function (s) {
    if (s.mode === 'none') {
      const item = s.slots[s.out]; s.slots[s.out] = null; s.out = (s.out + 1) % s.n;
      return item === null ? ['bad', '✗ 沒有同步：緩衝區是空的，消費者讀到垃圾 / 重複的資料！'] : ['ok', `取出 #${item}（沒有任何檢查）`];
    }
    if (s.dead) { s.waitC = true; return ['bad', '消費者 wait(full) 通過，但 wait(mutex) 時 mutex = 0（被睡著的生產者握著）→ 消費者也被阻塞。死結！']; }
    if (s.sem.full === 0) { s.waitC = true; return ['warn', 'wait(full)：full = 0，沒有資料 → 消費者被阻塞，等待生產者 signal(full)。']; }
    s.sem.full--; const item = s.slots[s.out]; s.slots[s.out] = null; s.out = (s.out + 1) % s.n; s.sem.empty++;
    return ['ok', `wait(full) → wait(mutex) → 取出 #${item} → signal(mutex) → signal(empty)`];
  };
  register('buffer', {
    title: '生產者–消費者：有界緩衝區',
    prompt: '緩衝區滿了之後再按「生產」，生產者會怎樣？切到「不加同步」或「錯誤的 wait 順序」，看看會出什麼問題。',
    init: () => bufInit(),
    view(s) {
      const tone = { empty: s.sem.empty === 0 ? 'hot' : '', full: s.sem.full === 0 ? 'hot' : '', mutex: s.sem.mutex === 0 ? 'hot' : '' };
      return `<div class="row wrap">${seg('mode', s.mode, [['sem', '正確使用 semaphore'], ['none', '不加同步'], ['wrong', '錯誤順序：先 mutex 再 empty']], '模式')}${field('緩衝區大小', seg('n', s.n, [[2, '2'], [3, '3'], [4, '4'], [6, '6']], '大小'))}</div>
      <div class="pc-wrap">
        <div class="actor${s.waitP ? ' blocked' : ''}"><b>🧑‍🍳 生產者</b><small>${s.waitP ? '阻塞中（等待）' : '可執行'}</small>${btn('produce', '生產一筆 →', { kind: 'primary', disabled: s.waitP })}</div>
        <div class="slots">${s.slots.map((v, i) => `<div class="slot${v === null ? ' empty' : ''}${i === s.inp ? ' in' : ''}${i === s.out ? ' out' : ''}"><b>${v === null ? '' : '#' + v}</b><small>${i === s.inp ? 'in' : ''}${i === s.inp && i === s.out ? ' / ' : ''}${i === s.out ? 'out' : ''}</small></div>`).join('')}</div>
        <div class="actor${s.waitC ? ' blocked' : ''}"><b>🍣 消費者</b><small>${s.waitC ? '阻塞中（等待）' : '可執行'}</small>${btn('consume', '← 消費一筆', { kind: 'primary', disabled: s.waitC })}</div>
      </div>
      ${s.mode === 'none' ? note('這個模式完全沒有 semaphore：沒有人檢查緩衝區是滿還是空。', 'warn') : stats([stat('empty（空位）', s.sem.empty, { tone: tone.empty }), stat('full（資料數）', s.sem.full, { tone: tone.full }), stat('mutex', s.sem.mutex, { tone: tone.mutex })])}
      ${s.dead && s.waitC ? note('☠ 死結：生產者持有 mutex 等 empty，消費者等 mutex 才能釋放 empty。正確順序是「先 wait(empty)，再 wait(mutex)」。', 'bad') : ''}
      <ol class="log">${s.log.slice(-5).reverse().map(([tone, t]) => `<li class="${tone}">${h(t)}</li>`).join('')}</ol>`;
    },
    act(s, a, arg) {
      if (a === 'set:mode' || a === 'set:n') { const n = bufInit(a === 'set:n' ? +arg : s.n, a === 'set:mode' ? arg : s.mode); Object.keys(s).forEach(k => delete s[k]); Object.assign(s, n); return; }
      if (a === 'produce') {
        s.log.push(sim.bufferProduce(s));
        if (s.waitC && s.sem.full > 0 && s.mode === 'sem') { s.waitC = false; s.log.push(['info', 'signal(full) 喚醒了等待中的消費者。']); s.log.push(sim.bufferConsume(s)); }
      }
      if (a === 'consume') {
        s.log.push(sim.bufferConsume(s));
        if (s.waitP && s.sem.empty > 0 && s.mode === 'sem') { s.waitP = false; s.log.push(['info', 'signal(empty) 喚醒了等待中的生產者。']); s.log.push(sim.bufferProduce(s)); }
      }
    }
  });

  /* ───────────── 銀行家演算法 ───────────── */
  const TEXTBOOK = { avail: [3, 3, 2], alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]], max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]] };
  const UNSAFE = { avail: [1, 1, 1], alloc: [[1, 1, 0], [1, 0, 1], [0, 1, 1]], max: [[3, 3, 2], [2, 1, 2], [1, 3, 3]] };
  const R = ['A', 'B', 'C'];
  const vec = v => `(${v.join(', ')})`;
  sim.bankerSafety = function (avail, alloc, max) {
    const need = max.map((m, i) => m.map((x, j) => x - alloc[i][j]));
    let work = avail.slice(); const done = alloc.map(() => false), order = [], steps = [];
    let progress = true;
    while (progress && order.length < alloc.length) {
      progress = false;
      for (let i = 0; i < alloc.length; i++) {
        if (done[i]) continue;
        const ok = need[i].every((n, j) => n <= work[j]);
        const before = work.slice();
        if (ok) { work = work.map((w, j) => w + alloc[i][j]); done[i] = true; order.push(i); progress = true; }
        steps.push({ i, need: need[i], work: before, ok, after: work.slice() });
      }
    }
    return { safe: order.length === alloc.length, order, steps, need };
  };
  sim.bankerRequest = function (st, p, req) {
    const { need } = sim.bankerSafety(st.avail, st.alloc, st.max);
    if (req.some((r, j) => r > need[p][j])) return { ok: false, reason: `請求 ${vec(req)} 超過 P${p} 宣告的剩餘需求 Need ${vec(need[p])}，這是錯誤。` };
    if (req.some((r, j) => r > st.avail[j])) return { ok: false, reason: `請求 ${vec(req)} 超過目前可用 ${vec(st.avail)}，P${p} 必須等待。` };
    const trial = { avail: st.avail.map((a, j) => a - req[j]), alloc: st.alloc.map((row, i) => i === p ? row.map((x, j) => x + req[j]) : row.slice()), max: st.max };
    const res = sim.bankerSafety(trial.avail, trial.alloc, trial.max);
    return res.safe ? { ok: true, trial, reason: `假裝分配後仍安全，安全序列 ${res.order.map(i => 'P' + i).join(' → ')}，可以核准。` } : { ok: false, reason: '假裝分配後找不到安全序列（不安全狀態），拒絕並讓 P' + p + ' 等待。' };
  };
  const bankInit = (d = TEXTBOOK) => ({ avail: d.avail.slice(), alloc: d.alloc.map(r => r.slice()), max: d.max.map(r => r.slice()), k: 0, rp: 1, req: [1, 0, 2], reqMsg: null });
  register('banker', {
    title: '銀行家演算法：安全性檢查與請求',
    prompt: '先手算每個行程的 Need = Max − Allocation，再猜一個安全序列。然後一步一步檢查：誰能先完成？',
    init: () => bankInit(),
    auto: { action: 'step', done: s => s.k >= sim.bankerSafety(s.avail, s.alloc, s.max).steps.length },
    view(s) {
      const r = sim.bankerSafety(s.avail, s.alloc, s.max), shown = r.steps.slice(0, s.k), finished = s.k >= r.steps.length;
      const doneSet = new Set(shown.filter(x => x.ok).map(x => x.i)), cur = shown[shown.length - 1];
      const work = cur ? cur.after : s.avail;
      return `<div class="row wrap">${btn('load', '教科書範例（5 行程）', { arg: 'textbook' })}${btn('load', '不安全範例', { arg: 'unsafe' })}<span class="muted">可直接修改表格中的數字</span></div>
      <div class="table-wrap"><table class="table banker"><thead><tr><th rowspan="2">行程</th><th colspan="3">Allocation</th><th colspan="3">Max</th><th colspan="3">Need = Max − Alloc</th><th rowspan="2">狀態</th></tr><tr>${[0, 1, 2].map(() => R.map(x => `<th>${x}</th>`).join('')).join('')}</tr></thead><tbody>
      ${s.alloc.map((row, i) => `<tr class="${cur && cur.i === i ? (cur.ok ? 'sel ok' : 'sel bad') : ''}"><td><b>P${i}</b></td>${row.map((v, j) => `<td>${num(`alloc:${i}:${j}`, v, 0, 9, { label: `P${i} Allocation ${R[j]}` })}</td>`).join('')}${s.max[i].map((v, j) => `<td>${num(`max:${i}:${j}`, v, 0, 9, { label: `P${i} Max ${R[j]}` })}</td>`).join('')}${r.need[i].map(v => `<td class="${v < 0 ? 'neg' : ''}">${v}</td>`).join('')}<td>${doneSet.has(i) ? '<span class="tag ok">完成</span>' : ''}</td></tr>`).join('')}
      </tbody><tfoot><tr><td>Available</td>${s.avail.map((v, j) => `<td>${num(`avail:${j}`, v, 0, 12, { label: `Available ${R[j]}` })}</td>`).join('')}<td colspan="7"></td></tr></tfoot></table></div>
      ${r.need.some(n => n.some(v => v < 0)) ? note('有 Need 為負數：Allocation 不能超過 Max，請修正表格。', 'bad') : ''}
      ${panel('安全性演算法', `${stats([stat('Work', vec(work)), stat('已完成', `${doneSet.size} / ${s.alloc.length}`), stat('序列', shown.filter(x => x.ok).map(x => 'P' + x.i).join(' → ') || '—')])}
        ${cur ? note(`檢查 P${cur.i}：Need ${vec(cur.need)} ≤ Work ${vec(cur.work)}？ ${cur.ok ? `是 → P${cur.i} 可以完成並歸還 Allocation，Work 變成 ${vec(cur.after)}。` : '否 → 暫時跳過，之後再檢查。'}`, cur.ok ? 'ok' : 'warn') : note('Work 從 Available 開始。按「檢查下一個」逐一比較。')}
        ${finished ? note(r.safe ? `✓ 安全！安全序列：${r.order.map(i => 'P' + i).join(' → ')}` : '✗ 不安全：剩下的行程沒有一個能以目前的 Work 滿足需求。這不代表已經死結，但系統無法保證所有行程都能完成。', r.safe ? 'ok' : 'bad') : ''}
        <div class="row">${btn('step', '檢查下一個 →', { kind: 'primary', disabled: finished })}${btn('all', '直接算完', { disabled: finished })}${btn('restart', '重新檢查', { disabled: s.k === 0 })}</div>`)}
      ${panel('資源請求試算', `<div class="row wrap">${field('行程', `<select class="select" data-set="rp">${s.alloc.map((_, i) => `<option value="${i}"${s.rp === i ? ' selected' : ''}>P${i}</option>`).join('')}</select>`)}${R.map((x, j) => field(x, num(`req:${j}`, s.req[j], 0, 9, { label: `請求 ${x}` }))).join('')}${btn('request', '試算請求', { kind: 'primary' })}</div>
        ${s.reqMsg ? note(h(s.reqMsg.reason), s.reqMsg.ok ? 'ok' : 'bad') + (s.reqMsg.ok ? `<div class="row">${btn('grant', '核准並套用到表格', { kind: 'primary' })}</div>` : '') : '<p class="muted">教科書範例：先試 P1 請求 (1, 0, 2) 並核准，接著再試 P4 請求 (3, 3, 0) 與 P0 請求 (0, 2, 0)，預測結果各是什麼？</p>'}`)}`;
    },
    act(s, a, arg) {
      const len = sim.bankerSafety(s.avail, s.alloc, s.max).steps.length;
      if (a === 'step') s.k = Math.min(len, s.k + 1);
      if (a === 'all') s.k = len;
      if (a === 'restart') s.k = 0;
      if (a === 'load') { const n = bankInit(arg === 'unsafe' ? UNSAFE : TEXTBOOK); if (arg === 'unsafe') { n.rp = 0; n.req = [1, 0, 0]; } Object.assign(s, n); }
      if (a === 'request') s.reqMsg = sim.bankerRequest(s, s.rp, s.req);
      if (a === 'grant' && s.reqMsg && s.reqMsg.ok) { s.avail = s.reqMsg.trial.avail; s.alloc = s.reqMsg.trial.alloc; s.reqMsg = null; s.k = 0; }
    },
    set(s, key, v) {
      const [k, i, j] = key.split(':');
      if (k === 'rp') { s.rp = int(v, 0, s.alloc.length - 1, 0); s.reqMsg = null; return; }
      if (k === 'req') { s.req[+i] = int(v, 0, 9, 0); s.reqMsg = null; return; }
      if (k === 'avail') s.avail[+i] = int(v, 0, 12, s.avail[+i]);
      if (k === 'alloc' || k === 'max') s[k][+i][+j] = int(v, 0, 9, s[k][+i][+j]);
      s.k = 0; s.reqMsg = null;
    }
  });
})();
