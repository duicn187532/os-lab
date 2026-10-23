/* Runtime Adapters：把 ExecutionRequest 交給對應語言的沙箱，回傳 ExecutionResult。只回報「發生了什麼」，對錯由 judge.js 判斷。
 *
 *   ExecutionRequest  { language: 'c' | 'cpp' | 'python' | 'javascript', source, stdin, timeoutMs }
 *   ExecutionResult   { status: 'accepted' | 'compile_error' | 'runtime_error' | 'time_limit_exceeded' | 'internal_error',
 *                       stdout, stderr, compileOutput, elapsedMs, exitCode?, memoryBytes?, note? }
 *   status 'accepted' 只表示程式正常結束（exit 0），不代表答案正確。
 *
 * 隔離：每一種執行環境（js / py / cc）各有一個 sandbox="allow-scripts" 的 srcdoc iframe（不透明來源），
 * iframe 的 meta CSP 不允許任何連線（connect-src 'none'），只能載入自己 vendor/ 目錄的腳本；執行環境的大檔案由父頁
 * 代抓後交給沙箱（見 runtimes/vendor-fetch.js：不透明來源沒有可重用的 HTTP 快取）。玩家程式只在 iframe 建立的 Worker 裡執行。
 * 逾時：父頁計時，到時請 iframe 終止 Worker；iframe 沒回應就整個移除重建。同一時間只跑一個請求（queue）。 */
const BASE = new URL('../', import.meta.url);
export const VENDOR = new URL('vendor/', BASE).href;

export const LIMITS = { sourceBytes: 64 * 1024, stdinBytes: 4 << 20, outputBytes: 64 * 1024 };
// 第一次使用要下載與初始化執行環境，這段時間不算在測資的時限裡，但也有上限
const PREPARE_MS = { js: 15000, py: 120000, cc: 300000 };

export const LANGS = {
  c: { label: 'C', std: 'C11', runtime: 'cc', ext: 'c' },
  cpp: { label: 'C++', std: 'C++17', runtime: 'cc', ext: 'cpp' },
  python: { label: 'Python', std: 'Python 3.14（Pyodide）', runtime: 'py', ext: 'py' },
  javascript: { label: 'JavaScript', std: 'ES2022', runtime: 'js', ext: 'js' }
};

const vendorDir = { py: 'pyodide-314.0.7/', cc: 'yowasp-clang-22.0.0-git20542-10/' };
function csp(kind) {
  const v = vendorDir[kind] ? VENDOR + vendorDir[kind] : null;
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' blob:${v ? ` ${v} 'wasm-unsafe-eval'` : ''}`,
    `worker-src blob:`,
    "connect-src 'none'",
    "base-uri 'none'", "form-action 'none'"
  ].join('; ');
}

const sourceCache = {};
const text = path => sourceCache[path] ||= fetch(new URL(path, BASE)).then(r => { if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`); return r.text(); });
const WORKERS = { js: { js: 'runtimes/js.worker.js' }, py: { py: 'runtimes/py.worker.js', 'vendor-fetch': 'runtimes/vendor-fetch.js' }, cc: { cc: 'runtimes/cc.worker.js', wasi: 'runtimes/wasi.worker.js', 'vendor-fetch': 'runtimes/vendor-fetch.js' } };

/* 一個執行環境的沙箱：建立、啟動、送出請求、終止、重建 */
class Sandbox {
  constructor(kind, onPhase) { this.kind = kind; this.onPhase = onPhase; this.frame = null; this.booting = null; this.pending = null; this.seq = 0; this.ready = false; }
  boot() {
    return this.booting ||= (async () => {
      const [host, ...srcs] = await Promise.all([text('runtimes/host.js'), ...Object.values(WORKERS[this.kind]).map(text)]);
      const sources = Object.fromEntries(Object.keys(WORKERS[this.kind]).map((k, i) => [k, srcs[i]]));
      const f = document.createElement('iframe');
      f.hidden = true; f.title = `${this.kind} sandbox`;
      f.setAttribute('sandbox', 'allow-scripts');
      f.setAttribute('aria-hidden', 'true');
      f.srcdoc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp(this.kind)}"><script>${host.replace(/<\/script/gi, '<\\/script')}<\/script>`;
      this.frame = f;
      const ready = new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('沙箱沒有回應')), 10000);
        this.listener = e => {
          if (e.source !== f.contentWindow || !e.data || typeof e.data !== 'object') return;
          const m = e.data;
          if (m.type === 'ready') { clearTimeout(t); this.ready = true; res(); }
          else if (m.type === 'vendor') this.vendor(m);
          else this.handle(m);
        };
        window.addEventListener('message', this.listener);
      });
      f.addEventListener('load', () => f.contentWindow.postMessage({ type: 'boot', kind: this.kind, sources, vendor: VENDOR }, '*'), { once: true });
      document.body.appendChild(f);
      try { await ready; } catch (e) { this.destroy(); throw e; }
    })();
  }
  // 代抓沙箱要的執行環境檔案：只接受這個執行環境自己的 vendor 目錄，經過一般的 HTTP 快取
  async vendor({ key, url }) {
    const dir = VENDOR + vendorDir[this.kind];
    let msg;
    try {
      const u = new URL(url);
      if (!vendorDir[this.kind] || !u.href.startsWith(dir) || u.search || u.hash || /%2e|%2f|\.\./i.test(u.pathname)) throw new Error(`不允許的路徑：${url}`);
      const r = await fetch(u.href);
      if (!r.ok) throw new Error(`HTTP ${r.status}：${u.pathname}`);
      msg = { type: 'vendor', key, buf: await r.arrayBuffer() };
    } catch (e) { msg = { type: 'vendor', key, error: String(e.message || e) }; }
    this.frame?.contentWindow.postMessage(msg, '*', msg.buf ? [msg.buf] : []);
  }
  destroy() {
    if (this.listener) window.removeEventListener('message', this.listener);
    this.frame?.remove(); this.frame = null; this.booting = null; this.ready = false;
  }
  handle(m) {
    const p = this.pending;
    if (!p || m.id !== p.id) return;
    if (m.type === 'phase') {
      this.onPhase?.(this.kind, m.phase, m.info);
      if (m.phase === 'running' && !p.running) { p.running = true; clearTimeout(p.timer); p.timer = setTimeout(() => p.expire('time_limit_exceeded'), p.req.timeoutMs + 250); }
      else if (!p.running) { clearTimeout(p.timer); p.timer = setTimeout(() => p.expire('internal_error', '準備執行環境逾時'), PREPARE_MS[this.kind]); }
    }
    if (m.type === 'done') p.finish(m.raw || {});
  }
  // 送出一個請求；回傳 Promise<{ raw } | { expired: status, note }>
  async exec(req) {
    await this.boot();
    const id = ++this.seq;
    return new Promise(resolve => {
      const p = this.pending = {
        id, req, running: false,
        finish: raw => { if (this.pending !== p) return; clearTimeout(p.timer); this.pending = null; resolve({ raw }); },
        expire: (status, note) => {
          if (this.pending !== p) return;
          clearTimeout(p.timer); this.pending = null;
          this.kill(id).then(() => resolve({ expired: status, note }));
        }
      };
      p.cancel = () => p.expire('internal_error', '已停止執行');
      p.timer = setTimeout(() => p.expire('internal_error', '準備執行環境逾時'), PREPARE_MS[this.kind]);
      this.frame.contentWindow.postMessage({ type: 'exec', id, req }, '*');
    });
  }
  // 請 iframe 終止 Worker；一秒內沒回應（理論上不會，iframe 從不跑玩家程式）就整個重建
  kill(id) {
    return new Promise(res => {
      const f = this.frame;
      if (!f) { res(); return; }
      const t = setTimeout(() => { window.removeEventListener('message', ack); this.destroy(); res(); }, 1000);
      const ack = e => { if (e.source === f.contentWindow && e.data?.type === 'killed' && e.data.id === id) { clearTimeout(t); window.removeEventListener('message', ack); res(); } };
      window.addEventListener('message', ack);
      f.contentWindow.postMessage({ type: 'kill', id }, '*');
    });
  }
}

const sandboxes = {};
let onPhase = null;
export function setPhaseListener(fn) { onPhase = fn; }
const sandbox = kind => sandboxes[kind] ||= new Sandbox(kind, (...a) => onPhase?.(...a));

/* 一次只執行一個請求：避免同時初始化同一個執行環境、也限制使用者同時開很多個 Worker */
let chain = Promise.resolve(), active = null;
export function execute(req) {
  const run = chain.then(() => executeNow(req));
  chain = run.catch(() => {});
  return run;
}
export function stop() { active?.pending?.cancel?.(); }
export function isReady(language) { return !!sandboxes[LANGS[language]?.runtime]?.ready; }
export function reset(language) { const k = LANGS[language]?.runtime; sandboxes[k]?.destroy(); delete sandboxes[k]; }

const clip = (s, n = LIMITS.outputBytes) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n) + '\n…（已截斷）' : s; };
const result = (status, extra = {}) => ({ status, stdout: '', stderr: '', compileOutput: '', elapsedMs: 0, ...extra });

async function executeNow(req) {
  const lang = LANGS[req.language];
  if (!lang) return result('internal_error', { note: `不支援的語言：${req.language}` });
  const bytes = new TextEncoder().encode(req.source || '').length;
  if (bytes > LIMITS.sourceBytes) return result('internal_error', { note: `原始碼 ${bytes} bytes，超過上限 ${LIMITS.sourceBytes} bytes` });
  if ((req.stdin || '').length > LIMITS.stdinBytes) return result('internal_error', { note: 'stdin 超過上限' });
  const sb = sandbox(lang.runtime);
  active = sb;
  let r;
  try { r = await sb.exec({ language: req.language, source: req.source, stdin: req.stdin || '', timeoutMs: req.timeoutMs || 2000, outputCap: LIMITS.outputBytes }); }
  catch (e) { reset(req.language); return result('internal_error', { note: String(e.message || e) }); }
  finally { active = null; }
  if (r.expired) return result(r.expired, { elapsedMs: r.expired === 'time_limit_exceeded' ? req.timeoutMs : 0, note: r.expired === 'time_limit_exceeded' ? `超過時限 ${req.timeoutMs} ms，已終止執行並重建執行環境` : r.note });
  return normalize(lang.runtime, r.raw, req);
}

// 各執行環境的原始回報 → ExecutionResult
function normalize(kind, raw, req) {
  const base = { stdout: clip(raw.stdout), stderr: clip(raw.stderr), compileOutput: clip(raw.compileOutput || ''), elapsedMs: Math.round((raw.elapsedMs || 0) * 10) / 10, memoryBytes: raw.memoryBytes, compileMs: raw.compileMs, initMs: raw.initMs };
  if (raw.internal) return result('internal_error', { ...base, note: raw.internal });
  const tle = base.elapsedMs > req.timeoutMs;
  const outLimit = `輸出超過 ${LIMITS.outputBytes / 1024} KB 上限，已停止執行`;
  if (kind === 'cc') {
    if (raw.compileError) return result('compile_error', base);
    if (tle) return result('time_limit_exceeded', base);
    if (raw.limited) return result('runtime_error', { ...base, note: outLimit });
    if (raw.trap) return result('runtime_error', { ...base, note: `WebAssembly trap：${raw.trap}`, exitCode: raw.code });
    if (raw.code !== 0) return result('runtime_error', { ...base, note: `結束代碼 ${raw.code}`, exitCode: raw.code });
    return result('accepted', { ...base, exitCode: 0 });
  }
  const s = raw.py || raw.js;
  if (s === 'compile_error') return result('compile_error', { ...base, compileOutput: clip(raw.detail) });
  if (tle) return result('time_limit_exceeded', base);
  if (s === 'output_limit') return result('runtime_error', { ...base, note: outLimit });
  if (s === 'error' || s === 'exit') return result('runtime_error', { ...base, stderr: clip(base.stderr + raw.detail) });
  if (s === 'ok') return result('accepted', base);
  return result('internal_error', { ...base, note: raw.detail || '未知的執行結果' });
}
