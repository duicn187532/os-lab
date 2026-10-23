/* 執行一個已編譯的 C/C++ 程式（WASI preview1 command 模組），一個測資一個 Worker：記憶體、全域變數、檔案描述子都從零開始。
 * 只提供最小的 WASI：stdin（一次給完）、stdout/stderr（有上限）、時鐘、亂數、argv/environ（空）、proc_exit。
 * 沒有檔案系統、沒有網路；其餘 import 一律回傳 ENOSYS（52）。逾時由外層終止這個 Worker。 */
'use strict';
const ENOSYS = 52, EBADF = 8;
class Exit { constructor(code) { this.code = code; } }
class OutputLimit {}

function runWasi(module, stdinText, OUT_CAP = 1 << 16) {
  const stdin = new TextEncoder().encode(stdinText || '');
  let inPos = 0, memory;
  const out = { 1: [], 2: [] }, size = { 1: 0, 2: 0 };
  const view = () => new DataView(memory.buffer), bytes = () => new Uint8Array(memory.buffer);
  const iovs = (ptr, len) => Array.from({ length: len }, (_, i) => [view().getUint32(ptr + i * 8, true), view().getUint32(ptr + i * 8 + 4, true)]);
  const wasi = {
    fd_write(fd, iov, n, nw) {
      if (fd !== 1 && fd !== 2) return EBADF;
      let total = 0;
      for (const [p, l] of iovs(iov, n)) {
        const room = OUT_CAP - size[fd], take = Math.min(l, Math.max(room, 0));
        if (take) { out[fd].push(bytes().slice(p, p + take)); size[fd] += take; }
        total += l;
        if (take < l) throw new OutputLimit();
      }
      view().setUint32(nw, total, true); return 0;
    },
    fd_read(fd, iov, n, nr) {
      if (fd !== 0) return EBADF;
      let total = 0;
      for (const [p, l] of iovs(iov, n)) { const k = Math.min(l, stdin.length - inPos); bytes().set(stdin.subarray(inPos, inPos + k), p); inPos += k; total += k; if (k < l) break; }
      view().setUint32(nr, total, true); return 0;
    },
    // 檔案類型回報 6（SOCKET_STREAM）：不是終端機，libc 才會整塊緩衝（終端機是逐行輸出），也表示不能 seek
    fd_fdstat_get(fd, ptr) { if (fd > 2) return EBADF; const v = view(); v.setUint8(ptr, 6); v.setUint16(ptr + 2, 0, true); v.setBigUint64(ptr + 8, 0n, true); v.setBigUint64(ptr + 16, 0n, true); return 0; },
    fd_close: () => 0, fd_seek: () => 70 /* ESPIPE */, fd_prestat_get: () => EBADF, fd_prestat_dir_name: () => EBADF,
    environ_sizes_get(c, s) { view().setUint32(c, 0, true); view().setUint32(s, 0, true); return 0; }, environ_get: () => 0,
    args_sizes_get(c, s) { view().setUint32(c, 1, true); view().setUint32(s, 5, true); return 0; },
    args_get(argv, buf) { view().setUint32(argv, buf, true); bytes().set([109, 97, 105, 110, 0], buf); return 0; }, // "main"
    clock_time_get(id, prec, ptr) { view().setBigUint64(ptr, BigInt(Math.round((id === 0 ? Date.now() : performance.now()) * 1e6)), true); return 0; },
    clock_res_get(id, ptr) { view().setBigUint64(ptr, 1000n, true); return 0; },
    random_get(p, l) { crypto.getRandomValues(bytes().subarray(p, p + l)); return 0; },
    sched_yield: () => 0,
    proc_exit(code) { throw new Exit(code); }
  };
  const imports = { wasi_snapshot_preview1: new Proxy(wasi, { get: (t, k) => t[k] || (() => ENOSYS) }) };
  const inst = new WebAssembly.Instance(module, imports);
  memory = inst.exports.memory;
  const text = fd => { const all = new Uint8Array(size[fd]); let o = 0; for (const a of out[fd]) { all.set(a, o); o += a.length; } return new TextDecoder().decode(all); };
  let code = 0, trap = null, limited = false;
  const t0 = performance.now();
  try { inst.exports._start(); }
  catch (e) { if (e instanceof Exit) code = e.code; else if (e instanceof OutputLimit) limited = true; else trap = e; }
  return { code, trap: trap ? String(trap.message || trap) : null, limited, stdout: text(1), stderr: text(2), elapsedMs: performance.now() - t0, memoryBytes: memory.buffer.byteLength };
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof module === 'undefined') {
  self.onmessage = e => { const { module, stdin, outputCap, nonce } = e.data; let r; try { r = runWasi(module, stdin, outputCap); } catch (err) { r = { internal: String(err && err.message || err) }; } self.postMessage({ ...r, nonce }); };
} else if (typeof module !== 'undefined') module.exports = { runWasi };
