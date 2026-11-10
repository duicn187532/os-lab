/* 沙箱 iframe 裡的主控程式（由 js/runtime.js 放進 srcdoc；iframe 是 sandbox="allow-scripts"，來源是不透明的 null，
 * 讀不到主站的 DOM、localStorage、IndexedDB 與 Cookie；可用的網路由 srcdoc 的 CSP 決定）。
 * 這裡從不執行玩家程式：玩家程式只在這裡建立的 Worker 裡跑，所以無窮迴圈卡住的是 Worker，這裡隨時能 terminate。
 * 訊息協定（只接受父頁的訊息）：
 *   父 → 這裡  { type: 'boot', kind, sources, vendor }   kind 是 js | py | cc；sources 是各 Worker 的原始碼
 *             { type: 'vendor', key, buf | error }        父頁代抓的執行環境檔案（見 vendor-fetch.js）
 *             { type: 'exec', id, req }                   req 是 ExecutionRequest（見 js/runtime.js）
 *             { type: 'kill', id }                        逾時或使用者按停止：終止正在跑的 Worker
 *   這裡 → 父  { type: 'ready' } / { type: 'phase', id, phase, info } / { type: 'done', id, raw } / { type: 'killed', id }
 *             { type: 'vendor', key, url }                請父頁代抓 vendor/ 的檔案 */
'use strict';
(() => {
  const parentWin = window.parent;
  let kind = '', sources = {}, vendor = '';
  const send = msg => parentWin.postMessage(msg, '*');
  const blobUrl = {};
  // Python 與 C/C++ 的 Worker 前面接上 vendor-fetch.js，讓執行環境的檔案經由父頁的 HTTP 快取取得
  const workerUrl = name => blobUrl[name] ||= URL.createObjectURL(new Blob(name === 'py' || name === 'cc' ? [sources['vendor-fetch'], '\n', sources[name]] : [sources[name]], { type: 'text/javascript' }));
  // 一律用 classic Worker：不透明來源的 blob: 不能當 module Worker；需要 ES module 的執行環境在 Worker 裡用 import() 載入
  const spawn = name => new Worker(workerUrl(name), { name });
  // 每個請求一個隨機 nonce，只有 Worker 外層的程式知道（玩家程式開始執行前就收到了），回覆要帶著它；
  // 玩家程式自己呼叫 postMessage 偽造的「結果」沒有 nonce，會被忽略。
  const nonce = () => Array.from(crypto.getRandomValues(new Uint32Array(4)), x => x.toString(16)).join('');
  // 等 Worker 回一則訊息；Worker 自己出錯（例如載入失敗）也算一則結果。onOther 收其他帶 nonce 的訊息（進度）
  const once = (w, msg, onOther) => new Promise(res => {
    const n = nonce();
    w.onmessage = e => { const d = e.data; if (!d || d.nonce !== n) return; if (d.fetch) vendorFetch(w, d.fetch); else if (d.progress) onOther?.(d.progress); else res(d); };
    w.onerror = e => { e.preventDefault?.(); res({ internal: `Worker 錯誤：${e.message || '無法啟動'}` }); };
    w.postMessage({ ...msg, nonce: n });
  });

  // 代抓：Worker → 這裡 → 父頁（只代抓 vendor/ 底下這個執行環境的檔案，由父頁檢查）→ 這裡 → Worker
  const fetching = new Map();
  let fetchSeq = 0;
  function vendorFetch(w, { id, url }) { const key = ++fetchSeq; fetching.set(key, { w, id }); send({ type: 'vendor', key, url: String(url) }); }

  let current = null; // { id, worker, kill() }
  const phase = (id, p, info) => send({ type: 'phase', id, phase: p, info });

  /* JavaScript：每個測資一個全新的 Worker */
  async function execJs(id, req) {
    const w = spawn('js');
    current = { id, kill: () => w.terminate() };
    phase(id, 'running');
    const raw = await once(w, { source: req.source, stdin: req.stdin, outputCap: req.outputCap });
    w.terminate();
    return raw;
  }

  /* Python：Pyodide 常駐在一個 Worker，每個測資用新的命名空間；逾時只能整個 Worker 重建（沒有 SharedArrayBuffer 就無法中斷） */
  let py = null;
  const pyWorker = () => py ||= (() => {
    const w = spawn('py');
    const ready = once(w, { type: 'init', vendor });
    return { w, ready };
  })();
  async function execPy(id, req) {
    const p = pyWorker();
    current = { id, kill: () => { p.w.terminate(); py = null; } };
    phase(id, 'loading');
    const init = await p.ready;
    if (init.internal) { py = null; p.w.terminate(); return init; }
    phase(id, 'running', { initMs: init.initMs });
    const raw = await once(p.w, { type: 'run', source: req.source, stdin: req.stdin, outputCap: req.outputCap });
    return { ...raw, initMs: init.initMs };
  }

  /* C / C++：編譯器常駐一個 Worker（下載與初始化只做一次），同一份原始碼只編譯一次；
     編譯出的 WebAssembly.Module 每個測資交給一個全新的 Worker 執行，逾時只終止那個 Worker。 */
  let cc = null;
  const built = new Map(); // `${lang}\n${source}` → 編譯結果（只留最近幾份）
  const ccWorker = () => cc ||= spawn('cc');
  async function compile(id, req) {
    const key = `${req.language}\n${req.source}`;
    if (built.has(key)) return { ...built.get(key), cached: true };
    const w = ccWorker();
    current = { id, kill: () => { w.terminate(); cc = null; } };
    phase(id, 'compiling');
    const r = await once(w, { language: req.language, source: req.source, vendor }, p => phase(id, 'compiling', p));
    if (r.internal) { w.terminate(); cc = null; return r; }
    if (built.size >= 4) built.delete(built.keys().next().value);
    built.set(key, r);
    return r;
  }
  async function execCc(id, req) {
    const c = await compile(id, req);
    if (c.internal || !c.ok) return { compileError: !c.internal, compileOutput: c.compileOutput || '', compileMs: c.compileMs, internal: c.internal, toolchainMs: c.toolchainMs };
    const w = spawn('wasi');
    current = { id, kill: () => w.terminate() };
    phase(id, 'running');
    const raw = await once(w, { module: c.module, stdin: req.stdin, outputCap: req.outputCap });
    w.terminate();
    return { ...raw, compileOutput: c.compileOutput, compileMs: c.cached ? 0 : c.compileMs, toolchainMs: c.cached ? 0 : c.toolchainMs };
  }

  const exec = { js: execJs, py: execPy, cc: execCc };
  window.addEventListener('message', async e => {
    if (e.source !== parentWin || !e.data || typeof e.data !== 'object') return;
    const m = e.data;
    if (m.type === 'boot') { ({ kind, sources, vendor } = m); send({ type: 'ready' }); return; }
    if (m.type === 'vendor') { const f = fetching.get(m.key); fetching.delete(m.key); if (f) f.w.postMessage({ vendorReply: f.id, buf: m.buf, error: m.error }, m.buf ? [m.buf] : []); return; }
    if (m.type === 'kill') { if (current && current.id === m.id) { current.kill(); current = null; } send({ type: 'killed', id: m.id }); return; }
    if (m.type === 'exec') {
      let raw;
      try { raw = await exec[kind](m.id, m.req); } catch (err) { raw = { internal: String(err && err.message || err) }; }
      if (current && current.id === m.id) current = null;
      send({ type: 'done', id: m.id, raw });
    }
  });
})();
