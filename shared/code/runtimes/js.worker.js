/* JavaScript Worker：一個測資一個全新的 Worker。玩家程式以 blob: 腳本 importScripts 載入（行號就是原始碼的行號），
 * 不經過 eval / Function；沙箱 iframe 的 CSP 沒有 'unsafe-eval'，玩家程式裡的 eval 也會被擋下。
 * 提供的 API：readInput() 回傳整份 stdin、readLine() 依序回傳下一行（讀完回傳 null）；console.log / info 寫到 stdout，
 * console.error / warn 寫到 stderr。主程式同步執行完、而且沒有待處理的計時器之後才算結束（setInterval 不清掉就會逾時）。
 * 網路與儲存：CSP 沒有 connect-src（fetch、XHR、WebSocket 都會被擋），不透明來源沒有 IndexedDB / Cache / Cookie；
 * 這裡另外把常見入口換成會丟錯的版本，只是讓錯誤訊息比較好懂，真正的限制在 CSP 與 sandbox。 */
'use strict';
self.onmessage = e => {
  self.onmessage = null;
  const { source, stdin, outputCap, nonce } = e.data;
  const postRaw = self.postMessage.bind(self), post = m => postRaw({ ...m, nonce }), blobs = [];
  const cap = outputCap || 1 << 16, out = [], err = [];
  let size = 0, limited = false, failure = null, finished = false;
  class OutputLimit extends Error {}

  const fmt = (v, depth = 0) => {
    if (typeof v === 'string') return depth ? `'${v}'` : v;
    if (typeof v === 'bigint') return v + 'n';
    if (typeof v === 'function') return `[Function: ${v.name || '(anonymous)'}]`;
    if (v === null || typeof v !== 'object') return String(v);
    if (depth > 2) return Array.isArray(v) ? '[Array]' : '[Object]';
    if (v instanceof Error) return v.stack || String(v);
    if (Array.isArray(v)) return v.length ? `[ ${v.map(x => fmt(x, depth + 1)).join(', ')} ]` : '[]';
    if (v instanceof Map) return `Map(${v.size}) { ${[...v].map(([k, x]) => `${fmt(k, depth + 1)} => ${fmt(x, depth + 1)}`).join(', ')} }`;
    if (v instanceof Set) return `Set(${v.size}) { ${[...v].map(x => fmt(x, depth + 1)).join(', ')} }`;
    const keys = Object.keys(v);
    return keys.length ? `{ ${keys.map(k => `${k}: ${fmt(v[k], depth + 1)}`).join(', ')} }` : '{}';
  };
  const write = (buf, args) => {
    if (limited) throw new OutputLimit('輸出超過上限');
    const line = args.map(a => fmt(a)).join(' ') + '\n';
    const room = cap - size;
    if (line.length > room) { buf.push(line.slice(0, Math.max(room, 0))); size = cap; limited = true; throw new OutputLimit('輸出超過上限'); }
    buf.push(line); size += line.length;
  };
  const con = {
    log: (...a) => write(out, a), info: (...a) => write(out, a), debug: (...a) => write(out, a),
    error: (...a) => write(err, a), warn: (...a) => write(err, a)
  };
  const lines = String(stdin || '').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  let li = 0;
  const api = {
    readInput: () => String(stdin || ''),
    readLine: () => li < lines.length ? lines[li++].replace(/\r$/, '') : null,
    console: con
  };
  // 計時器：記下還沒觸發的 setTimeout 與還在跑的 setInterval，全部結束才回報
  const pending = new Set(), native = { st: self.setTimeout.bind(self), ct: self.clearTimeout.bind(self), si: self.setInterval.bind(self), ci: self.clearInterval.bind(self) };
  const wrap = fn => function () { try { return fn.apply(this, arguments); } catch (x) { fail(x); } finally { check(); } };
  const timers = {
    setTimeout: (fn, ms, ...a) => { const id = native.st(() => { pending.delete(id); wrap(fn)(...a); }, ms); pending.add(id); return id; },
    clearTimeout: id => { pending.delete(id); native.ct(id); check(); },
    setInterval: (fn, ms, ...a) => { const id = native.si(wrap(() => fn(...a)), ms); pending.add(id); return id; },
    clearInterval: id => { pending.delete(id); native.ci(id); check(); }
  };
  const blocked = name => () => { throw new Error(`${name} 在 Coding Challenge 裡停用：程式只能讀 stdin、寫 stdout`); };
  const lockdown = { fetch: blocked('fetch'), XMLHttpRequest: blocked('XMLHttpRequest'), WebSocket: blocked('WebSocket'), EventSource: blocked('EventSource'), importScripts: blocked('importScripts') };

  // 第一行前面接上 PREFIX（標記「已經開始執行」），所以第一行的欄位要扣掉它的長度
  const PREFIX = '__cslabRan();';
  const where = s => String(s).replace(/blob:[^\s)]*?:(\d+):(\d+)/g, (_, l, c) => `main.js:${l}:${l === '1' ? Math.max(1, c - PREFIX.length) : c}`).replace(/blob:[^\s)]+/g, 'main.js');
  function fail(x) {
    if (x instanceof OutputLimit || limited) { limited = true; return; }
    if (failure) return;
    failure = x instanceof Error ? where(x.stack && x.stack.includes(x.message) ? x.stack : `${x.name}: ${x.message}\n${x.stack || ''}`) : `Uncaught ${fmt(x, 1)}`;
  }
  let t0 = 0;
  function finish(kind) {
    if (finished) return; finished = true;
    const elapsedMs = performance.now() - t0;
    post({ js: kind || (limited ? 'output_limit' : failure ? 'error' : 'ok'), detail: failure || '', stdout: out.join(''), stderr: err.join(''), elapsedMs });
  }
  // 微任務（Promise）都跑完之後，若沒有待處理的計時器就結束
  function check() { native.st(() => { if (!pending.size || limited || failure) finish(); }, 0); }

  self.addEventListener('error', ev => { ev.preventDefault(); if (!finished) { fail(ev.error ?? new Error(ev.message)); check(); } });
  self.addEventListener('unhandledrejection', ev => { ev.preventDefault(); fail(ev.reason); check(); });

  // 語法錯誤（還沒開始執行就失敗）回報為 Compile Error，附上行號
  let ran = false;
  const url = URL.createObjectURL(new Blob([PREFIX, source], { type: 'text/javascript' })); blobs.push(url);
  const load = self.importScripts.bind(self);
  Object.assign(self, api, timers, lockdown, { __cslabRan: () => { ran = true; delete self.__cslabRan; } });
  t0 = performance.now();
  try { load(url); }
  catch (x) {
    if (x instanceof SyntaxError && !ran) { finished = true; syntaxLine(x); return; }
    fail(x);
  }
  check();

  // importScripts 的語法錯誤訊息沒有行號；把原始碼單獨當成一個 Worker 腳本載入，解析失敗時 error 事件會帶行號。
  // 這份原始碼剛剛已經解析失敗，所以這個 Worker 不會執行任何玩家程式；一秒內沒有結果就只回報原本的訊息。
  function syntaxLine(x) {
    const msg = `${x.name}: ${x.message.replace(/^Failed to execute 'importScripts' on 'WorkerGlobalScope': /, '')}`;
    const done = line => { post({ js: 'compile_error', detail: line ? `main.js:${line}\n${msg}` : msg, stdout: '', stderr: '', elapsedMs: 0 }); };
    let w;
    try { w = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))); } catch (_) { done(0); return; }
    const t = native.st(() => { w.terminate(); done(0); }, 1000);
    w.onerror = ev => { ev.preventDefault(); native.ct(t); w.terminate(); done(ev.lineno); };
  }
};
