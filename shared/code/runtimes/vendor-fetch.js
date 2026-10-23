/* 接在 Python 與 C/C++ Worker 原始碼前面（host.js 組合）：把執行環境對 vendor/ 的 fetch 轉給父頁代抓。
 * 原因：沙箱 iframe 是不透明來源，Chrome 的 HTTP 快取依框架來源分區，不透明來源每次都是新的分區，等於沒有快取
 * （C/C++ 每次開頁都要重新下載 100 MB）。父頁是一般來源，快取正常；它只代抓 vendor/ 底下這個執行環境自己的檔案。
 * 因此沙箱的 CSP 可以完全不給 connect-src：Worker 裡（包括玩家程式）連 vendor/ 也連不到。 */
(() => {
  const waiting = new Map();
  let seq = 0, nonce = null;
  const TYPES = { wasm: 'application/wasm', json: 'application/json', zip: 'application/zip', tar: 'application/x-tar', js: 'text/javascript', mjs: 'text/javascript' };
  // 每個請求的 nonce 由外層的 onmessage 記下來（見各 Worker），這裡借用同一個
  self.__vendorNonce = n => { nonce = n; };
  self.addEventListener('message', e => {
    const d = e.data;
    if (!d || !d.vendorReply) return;
    e.stopImmediatePropagation();
    const w = waiting.get(d.vendorReply); waiting.delete(d.vendorReply);
    if (w) d.buf ? w.res(d.buf) : w.rej(new Error(d.error || '無法載入執行環境檔案'));
  });
  self.fetch = (input, init) => {
    const url = String(input && input.url || input);
    const id = ++seq;
    return new Promise((res, rej) => {
      waiting.set(id, { res, rej });
      self.postMessage({ nonce, fetch: { id, url } });
    }).then(buf => new Response(buf, { status: 200, headers: { 'Content-Type': TYPES[url.split('?')[0].split('.').pop()] || 'application/octet-stream', 'Content-Length': String(buf.byteLength) } }));
  };
})();
