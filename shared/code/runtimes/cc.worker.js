/* C / C++ 編譯器 Worker（classic Worker，執行環境用 import() 載入）：在瀏覽器裡用 YoWASP 的 Clang/LLD（LLVM 編成 WebAssembly）真的編譯玩家程式，
 * 目標是 wasm32-wasip1。C 與 C++ 共用同一套工具鏈：clang 與 clang++ 是同一個 llvm.core.wasm 的兩個入口。
 * 第一次使用時下載工具鏈（約 100 MB，之後走瀏覽器快取），編譯結果是 WebAssembly.Module，交回沙箱主控程式執行。 */
const CLANG = 'yowasp-clang-22.0.0-git20542-10/gen/bundle.js';
const FLAGS = {
  c: { cmd: 'clang', file: 'main.c', args: ['-std=c11'] },
  // wasi-libc 的 libc++ 沒有例外處理的執行期支援，所以關掉例外：throw 會是編譯錯誤，標準庫丟例外會變成 abort（Runtime Error）
  cpp: { cmd: 'clang++', file: 'main.cpp', args: ['-std=c++17', '-fno-exceptions'] }
};
// -O2、顯示一般警告；連結時限制線性記憶體最多 64 MiB、堆疊 1 MiB
const COMMON = ['-O2', '-Wall', '-fno-color-diagnostics', '-Wl,--max-memory=67108864', '-Wl,-z,stack-size=1048576', '-o', 'main.wasm'];

let toolchain = null, toolchainMs = 0;
const load = vendor => toolchain ||= (async () => {
  const t0 = performance.now();
  const mod = await import(new URL(CLANG, vendor).href);
  toolchainMs = performance.now() - t0;
  return mod;
})();
const decode = chunks => new TextDecoder().decode(new Uint8Array(chunks.flatMap(c => Array.from(c))));

self.onmessage = async e => {
  const { language, source, vendor, nonce } = e.data, f = FLAGS[language], reply = r => self.postMessage({ ...r, nonce });
  self.__vendorNonce(nonce);
  if (!f) { reply({ internal: `不支援的語言 ${language}` }); return; }
  let tc;
  try { tc = await load(vendor); } catch (err) { toolchain = null; reply({ internal: `無法載入 C/C++ 工具鏈：${err && err.message || err}` }); return; }
  const firstMs = toolchainMs; toolchainMs = 0;
  const err = [];
  const t0 = performance.now();
  let files = null, failed = false;
  try {
    files = await tc.commands[f.cmd]([...f.args, ...COMMON, f.file], { [f.file]: source }, {
      stdout: b => { if (b) err.push(b); }, stderr: b => { if (b) err.push(b); },
      fetchProgress: ({ doneLength, totalLength }) => reply({ progress: { doneLength, totalLength } })
    });
  } catch (x) {
    if (x && typeof x.code === 'number') failed = true; // clang 以非零結束：編譯或連結錯誤
    else { reply({ internal: `編譯器內部錯誤：${x && x.message || x}` }); return; }
  }
  const compileMs = performance.now() - t0, compileOutput = decode(err).slice(0, 1 << 16);
  if (failed || !files || !files['main.wasm']) { reply({ ok: false, compileOutput, compileMs, toolchainMs: firstMs }); return; }
  try {
    const module = await WebAssembly.compile(files['main.wasm']);
    reply({ ok: true, module, compileOutput, compileMs, toolchainMs: firstMs, wasmBytes: files['main.wasm'].length });
  } catch (x) { reply({ internal: `無法載入編譯結果：${x && x.message || x}` }); }
};
