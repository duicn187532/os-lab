// 靜態伺服器，模仿 GitHub Pages 的回應標頭：Access-Control-Allow-Origin: *、Cache-Control: max-age=600、ETag，
// 沒有 COOP/COEP（所以沒有 SharedArrayBuffer），也沒有 CSP。Python 的 http.server 不送 CORS 標頭，
// 而 Coding Challenge 的沙箱 iframe 是不透明來源，要靠 CORS 才能載入 vendor/ 的執行環境。
//   node os-lab/tests/poc-server.cjs [根目錄，預設是 os-lab 的上一層] [埠，預設 8000]
// 環境變數 POC_LOG=1：每個請求印一行 JSON { path, status, bytes }（測試用來確認延遲載入與下載量）。
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..')), PORT = +(process.argv[3] || 8000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm', '.zip': 'application/zip', '.tar': 'application/x-tar', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }).end(); return; }
      file = path.join(file, 'index.html');
      try { st = fs.statSync(file); err = null; } catch (e) { err = e; }
    }
    const head = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=600' };
    const log = (status, bytes) => { if (process.env.POC_LOG) console.log(JSON.stringify({ path: p, status, bytes })); };
    if (err) { log(404, 0); res.writeHead(404, { ...head, 'Content-Type': 'text/plain' }).end('404'); return; }
    const etag = `"${st.size.toString(16)}-${st.mtimeMs.toString(16)}"`;
    if (req.headers['if-none-match'] === etag) { log(304, 0); res.writeHead(304, { ...head, ETag: etag }).end(); return; }
    log(200, req.method === 'HEAD' ? 0 : st.size);
    res.writeHead(200, { ...head, ETag: etag, 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, () => console.log(`serving ${ROOT} on :${PORT}`));
