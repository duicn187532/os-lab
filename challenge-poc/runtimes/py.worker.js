/* Python Worker（classic Worker，執行環境用 import() 載入）：Pyodide（CPython 3.14 編成 WebAssembly），第一次執行時才載入。
 * 每個測資用全新的 __main__ 命名空間，執行後移除玩家程式載入的模組、還原 builtins，避免上一筆測資留下狀態；
 * 直譯器本身沿用（重建一次要數秒）。這是盡力而為的重置，不是隔離：要完全乾淨只能重建 Worker（逾時就會這樣做）。 */
const PYODIDE = 'pyodide-314.0.7/';
let py = null, run = null;
const send = self.postMessage.bind(self); // 玩家程式可能改掉 self.postMessage，先留一份
let sink = null; // 目前測資的輸出 { out: [], err: [], size, cap, limited }

const RUNNER = `
import sys, builtins, traceback
_base_modules = set(sys.modules)
_base_builtins = dict(builtins.__dict__)
class _OutputLimit(BaseException):
    pass
def _cslab_run(src):
    try:
        code = compile(src, "main.py", "exec")
    except (SyntaxError, ValueError) as e:
        return ("compile_error", "".join(traceback.format_exception_only(e)))
    g = {"__name__": "__main__", "__builtins__": builtins}
    try:
        exec(code, g)
        return ("ok", "")
    except SystemExit as e:
        c = e.code
        if c is None or c == 0:
            return ("ok", "")
        return ("exit", f"SystemExit: {c}\\n")
    except _OutputLimit:
        return ("output_limit", "")
    except BaseException as e:
        tb = e.__traceback__.tb_next if e.__traceback__ else None
        return ("error", "".join(traceback.format_exception(type(e), e, tb)))
    finally:
        try:
            sys.stdout.flush(); sys.stderr.flush()
        except BaseException:
            pass
        for m in set(sys.modules) - _base_modules:
            sys.modules.pop(m, None)
        builtins.__dict__.clear()
        builtins.__dict__.update(_base_builtins)
        sys.stdin, sys.stdout, sys.stderr = sys.__stdin__, sys.__stdout__, sys.__stderr__
_cslab_run
`;

async function init(vendor) {
  const t0 = performance.now();
  const { loadPyodide } = await import(new URL(PYODIDE + 'pyodide.mjs', vendor).href);
  py = await loadPyodide({ indexURL: new URL(PYODIDE, vendor).href, fullStdLib: false, packages: [] });
  const writer = which => ({
    write(b) {
      if (!sink) return b.length;
      const room = sink.cap - sink.size, take = Math.min(room, b.length);
      if (take > 0) { sink[which].push(b.slice(0, take)); sink.size += take; }
      if (take < b.length) { sink.limited = true; throw new Error('output limit'); }
      return b.length;
    }
  });
  py.setStdout(writer('out'));
  py.setStderr(writer('err'));
  run = py.runPython(RUNNER);
  return performance.now() - t0;
}

const text = chunks => { let n = 0; chunks.forEach(c => n += c.length); const all = new Uint8Array(n); let o = 0; chunks.forEach(c => { all.set(c, o); o += c.length; }); return new TextDecoder().decode(all); };

self.onmessage = async e => {
  const m = e.data, reply = r => send({ ...r, nonce: m.nonce });
  self.__vendorNonce(m.nonce);
  if (m.type === 'init') {
    try { reply({ initMs: await init(m.vendor) }); }
    catch (err) { reply({ internal: `無法載入 Pyodide：${err && err.message || err}` }); }
    return;
  }
  if (m.type !== 'run') return;
  const data = new TextEncoder().encode(m.stdin || '');
  let pos = 0;
  py.setStdin({ read(buf) { const k = Math.min(buf.length, data.length - pos); buf.set(data.subarray(pos, pos + k)); pos += k; return k; } });
  sink = { out: [], err: [], size: 0, cap: m.outputCap || 1 << 16, limited: false };
  const t0 = performance.now();
  let status = 'internal', detail = '';
  try {
    const r = run(m.source);
    [status, detail] = r.toJs(); r.destroy();
  } catch (err) { status = 'internal'; detail = String(err && err.message || err); }
  const elapsedMs = performance.now() - t0, s = sink; sink = null;
  if (s.limited) status = 'output_limit';
  reply({ py: status, detail, stdout: text(s.out), stderr: text(s.err), elapsedMs, memoryBytes: py._module.HEAPU8.buffer.byteLength });
};
