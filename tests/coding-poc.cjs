// Coding Challenge PoC（challenge-poc/）的功能與安全檢查：三題 × 四種語言真的編譯 / 執行 / 評測、
// Wrong Answer / Compile Error / Runtime Error / Time Limit Exceeded、無窮迴圈可終止且頁面不凍結、停止按鈕、
// 沙箱逃逸與未授權網路（JavaScript、Python、C）、輸出與原始碼上限、程式碼儲存與還原、不動 CS LAB 的資料、手機寬度。
// 這個測試自己啟動 tests/poc-server.cjs（模仿 GitHub Pages 的標頭），另外開一個「誘餌」伺服器記錄有沒有被連到。
// 先執行 challenge-poc/tools/vendor.sh 下載執行環境。
//   node os-lab/tests/coding-poc.cjs
// 環境變數：CHROMIUM_PATH 指定瀏覽器、POC_PORT（預設 8010）、CANARY_PORT（預設 8011）。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const PORT = +(process.env.POC_PORT || 8010), CANARY_PORT = +(process.env.CANARY_PORT || 8011);
const WEB = path.resolve(__dirname, '..', '..'), POC = path.join(__dirname, '..', 'challenge-poc');
const URL_ = `http://localhost:${PORT}/os-lab/challenge-poc/`, CANARY = `http://localhost:${CANARY_PORT}`;

const SOL = {
  'hello-world': {
    c: '#include <stdio.h>\nint main(void) { printf("Hello, CS LAB!\\n"); return 0; }\n',
    cpp: '#include <iostream>\nint main() { std::cout << "Hello, CS LAB!" << std::endl; }\n',
    python: 'print("Hello, CS LAB!")\n',
    javascript: 'console.log("Hello, CS LAB!");\n'
  },
  'a-plus-b': {
    c: '#include <stdio.h>\nint main(void) {\n    long long a, b;\n    scanf("%lld %lld", &a, &b);\n    printf("%lld\\n", a + b);\n    return 0;\n}\n',
    cpp: '#include <iostream>\nint main() { long long a, b; std::cin >> a >> b; std::cout << a + b << "\\n"; }\n',
    python: 'a, b = map(int, input().split())\nprint(a + b)\n',
    javascript: 'const [a, b] = readInput().trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n'
  },
  'binary-search': {
    c: '#include <stdio.h>\n#include <stdlib.h>\nint main(void) {\n    int n; scanf("%d", &n);\n    int *a = malloc(sizeof(int) * (n > 0 ? n : 1));\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    int t; scanf("%d", &t);\n    int lo = 0, hi = n - 1, ans = -1;\n    while (lo <= hi) {\n        int m = lo + (hi - lo) / 2;\n        if (a[m] == t) { ans = m; break; }\n        if (a[m] < t) lo = m + 1; else hi = m - 1;\n    }\n    printf("%d\\n", ans);\n    free(a);\n    return 0;\n}\n',
    cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nint main() {\n    std::ios::sync_with_stdio(false); std::cin.tie(nullptr);\n    int n; std::cin >> n;\n    std::vector<int> a(n);\n    for (int &x : a) std::cin >> x;\n    int t; std::cin >> t;\n    auto it = std::lower_bound(a.begin(), a.end(), t);\n    std::cout << (it != a.end() && *it == t ? int(it - a.begin()) : -1) << "\\n";\n}\n',
    python: 'import sys\ndata = sys.stdin.read().split()\nn = int(data[0])\na = list(map(int, data[1:1 + n]))\nt = int(data[1 + n])\nlo, hi, ans = 0, n - 1, -1\nwhile lo <= hi:\n    m = (lo + hi) // 2\n    if a[m] == t:\n        ans = m\n        break\n    if a[m] < t:\n        lo = m + 1\n    else:\n        hi = m - 1\nprint(ans)\n',
    javascript: 'const lines = readInput().split("\\n");\nconst n = Number(lines[0]);\nconst a = n > 0 ? lines[1].trim().split(/\\s+/).map(Number) : [];\nconst t = Number(lines[2]);\nlet lo = 0, hi = n - 1, ans = -1;\nwhile (lo <= hi) {\n  const m = (lo + hi) >> 1;\n  if (a[m] === t) { ans = m; break; }\n  if (a[m] < t) lo = m + 1; else hi = m - 1;\n}\nconsole.log(ans);\n'
  }
};
const LANGS = ['c', 'cpp', 'python', 'javascript'];

(async () => {
  // 伺服器：網站（記錄請求）與誘餌（任何請求都記下來）
  const server = spawn(process.execPath, [path.join(__dirname, 'poc-server.cjs'), WEB, String(PORT)], { env: { ...process.env, POC_LOG: '1' } });
  const hits = [];
  server.stdout.on('data', d => String(d).split('\n').forEach(l => { try { hits.push(JSON.parse(l)); } catch (_) { /* 啟動訊息 */ } }));
  const canaryHits = [];
  const canary = http.createServer((req, res) => { canaryHits.push(req.url); res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript' }).end('/* canary */'); }).listen(CANARY_PORT);
  await new Promise(r => setTimeout(r, 500));
  assert(fs.existsSync(path.join(POC, 'vendor')), '先執行 challenge-poc/tools/vendor.sh');

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const ok = (name, cond, extra = '') => { assert(cond, `${name} ${extra}`); console.log('  ✓', name); };

  const editor = '#editor textarea';
  const pick = async (id, lang) => { await page.click(`[data-id="${id}"]`); await page.click(`[data-lang="${lang}"]`); };
  const setCode = src => page.fill(editor, src);
  const finish = (timeout = 300000) => page.waitForFunction(() => document.getElementById('work').getAttribute('aria-busy') === 'false' && document.querySelector('#result .poc-verdict'), null, { timeout });
  const submit = async () => { await page.click('#submitBtn'); await finish(); return page.evaluate(() => ({ verdict: document.querySelector('#result .poc-verdict').dataset.verdict, text: document.querySelector('#result').innerText, cases: [...document.querySelectorAll('#cases .poc-case')].map(li => li.dataset.verdict || li.dataset.state) })); };
  const run = async (stdin = '') => { await page.evaluate(() => { document.getElementById('stdinBox').open = true; }); await page.fill('#stdin', stdin); await page.click('#runBtn'); await finish(); return page.evaluate(() => ({ verdict: document.querySelector('#result .poc-verdict').dataset.verdict, text: document.querySelector('#result').innerText, out: document.getElementById('outPre').textContent })); };
  const tab = async name => { await page.click(`#outTabs [data-out="${name}"]`); return page.locator('#outPre').textContent(); };

  // 0. CS LAB 的資料：先放幾個課程鍵，最後確認完全沒被改
  await page.goto(URL_);
  const cslab = { 'cslab.os': '{"done":[1,2],"quiz":{"q1":true}}', 'cslab.dsa': '{"challenge":{"dsa.binary-search.next-step":{"solved":true}}}', 'cslab.exp': '{"os":120}', 'cslab.skin': 'classic' };
  await page.evaluate(kv => { localStorage.clear(); Object.entries(kv).forEach(([k, v]) => localStorage.setItem(k, v)); }, cslab);
  hits.length = 0;
  await page.reload(); await page.waitForSelector('#problemList [data-id]');

  console.log('1. 延遲載入、沙箱設定、主頁不執行玩家程式');
  ok('page load fetches no runtime', !hits.some(h => /\/vendor\//.test(h.path)), JSON.stringify(hits.map(h => h.path)));
  ok('no sandbox before the first run', await page.locator('iframe').count() === 0);
  const mainJs = fs.readdirSync(path.join(POC, 'js')).map(f => fs.readFileSync(path.join(POC, 'js', f), 'utf8')).join('\n');
  ok('main page code has no eval / new Function', !/\beval\s*\(|new\s+Function\s*\(|\bFunction\s*\(/.test(mainJs));

  console.log('2. 三題 × 四種語言：正確解都是 Accepted');
  const timing = {};
  for (const lang of LANGS) for (const id of Object.keys(SOL)) {
    await pick(id, lang); await setCode(SOL[id][lang]);
    const t0 = Date.now(); const r = await submit(); timing[`${id}/${lang}`] = Date.now() - t0;
    const total = r.cases.length;
    ok(`${id} / ${lang} → AC ${total}/${total}`, r.verdict === 'AC' && r.cases.every(v => v === 'AC') && r.text.includes(`${total} / ${total}`), r.text);
  }
  ok('runtimes loaded only after use (pyodide + clang requested)', hits.some(h => /pyodide-.*\/pyodide\.asm\.wasm/.test(h.path)) && hits.some(h => /llvm\.core\.wasm/.test(h.path)));
  const frames = await page.evaluate(() => [...document.querySelectorAll('iframe')].map(f => ({ sandbox: f.getAttribute('sandbox'), doc: (() => { try { return f.contentDocument === null ? 'null' : 'accessible'; } catch (_) { return 'throws'; } })(), csp: f.srcdoc.match(/Content-Security-Policy" content="([^"]*)"/)?.[1] })));
  ok('one sandbox per runtime (js, py, cc)', frames.length === 3);
  ok('iframes are sandbox="allow-scripts" only, opaque origin', frames.every(f => f.sandbox === 'allow-scripts' && f.doc === 'null'), JSON.stringify(frames));
  ok('JavaScript sandbox CSP has no network and no eval', frames.some(f => /connect-src 'none'/.test(f.csp) && !/unsafe-eval/.test(f.csp)));
  ok('no sandbox may open connections (connect-src \'none\')', frames.every(f => /connect-src 'none'/.test(f.csp)), JSON.stringify(frames.map(f => f.csp)));
  ok('Python / C sandboxes load scripts only from their own vendor folder', frames.filter(f => /wasm-unsafe-eval/.test(f.csp)).length === 2 && frames.filter(f => /wasm-unsafe-eval/.test(f.csp)).every(f => /script-src 'unsafe-inline' blob: http:\/\/localhost:\d+\/os-lab\/challenge-poc\/vendor\/(pyodide|yowasp-clang)-[^ ;]+\/ 'wasm-unsafe-eval'/.test(f.csp)));
  ok('runtime files reach the sandbox through the page cache (fetched by the page, not the sandbox)', hits.filter(h => /llvm\.core\.wasm$/.test(h.path)).length === 1);

  console.log('3. Wrong Answer 由輸出判斷');
  await pick('a-plus-b', 'c'); await setCode(SOL['a-plus-b'].c.replace('a + b', 'a - b'));
  let r = await submit();
  ok('C a − b → WA, only the 0 0 case passes (1/7)', r.verdict === 'WA' && r.text.includes('1 / 7') && r.cases.filter(v => v === 'WA').length === 6, r.text);
  await pick('binary-search', 'python'); await setCode(SOL['binary-search'].python.replace('while lo <= hi', 'while lo < hi'));
  r = await submit();
  ok('Python off-by-one binary search → WA', r.verdict === 'WA' && r.cases.includes('AC'), r.text);
  await pick('hello-world', 'javascript'); await setCode('console.log("hello, cs lab!");');
  r = await submit();
  ok('case matters → WA with first differing line', r.verdict === 'WA' && /第 1 行不同/.test(await page.locator('#cases').innerText()));
  await setCode('console.log("Hello, CS LAB!   ");\nconsole.log("");\n');
  r = await submit();
  ok('trailing spaces and blank lines ignored → AC', r.verdict === 'AC');
  await setCode('console.log(" Hello, CS LAB!");');
  r = await submit();
  ok('leading space is meaningful → WA', r.verdict === 'WA');

  console.log('4. Compile Error（附編譯訊息）');
  for (const [lang, src, re] of [['c', 'int main(void) { return y; }', /main\.c:1:\d+: error: use of undeclared identifier 'y'/], ['cpp', '#include <string>\nint main() { std::string s = 5; }', /main\.cpp:2:\d+: error:/], ['python', 'def f(:\n    pass', /line 1[\s\S]*SyntaxError/], ['javascript', 'const a = 1;\nlet x = ;', /main\.js:2[\s\S]*SyntaxError/]]) {
    await pick('hello-world', lang); await setCode(src);
    r = await submit();
    const msg = await tab('compile');
    ok(`${lang} → CE with message`, r.verdict === 'CE' && re.test(msg) && r.cases[0] === 'CE' && r.cases.slice(1).every(v => v === 'skipped'), msg);
  }

  console.log('5. Runtime Error（附 stderr 或原因）');
  for (const [lang, src, re] of [
    ['c', '#include <stdio.h>\nint main(void) { int *p = (int *)0x7ffffff0; *p = 1; return 0; }', /trap/],
    ['c', '#include <stdlib.h>\nint main(void) { exit(3); }', /結束代碼 3/],
    ['cpp', '#include <vector>\nint main() { std::vector<int> v; return v.at(3); }', /out_of_range|trap/],
    ['python', 'print("before")\nx = [1][5]', /IndexError/],
    ['javascript', 'console.log("before");\nnull.x;', /TypeError[\s\S]*main\.js:2/]]) {
    await pick('hello-world', lang); await setCode(src);
    r = await submit();
    const text = await page.locator('#cases').innerText() + await tab('stderr');
    ok(`${lang} → RE (${re})`, r.verdict === 'RE' && re.test(text), text);
  }

  console.log('6. 無窮迴圈：逾時終止、頁面不凍結、之後能繼續執行');
  for (const lang of LANGS) {
    await pick('hello-world', lang);
    await setCode({ c: 'int main(void) { volatile int x = 0; for (;;) x++; }', cpp: 'int main() { volatile int x = 0; for (;;) x++; }', python: 'while True:\n    pass', javascript: 'while (true) {}' }[lang]);
    await page.click('#submitBtn');
    await page.waitForFunction(() => document.querySelector('#cases [data-state="running"]'));
    const lag = await page.evaluate(() => new Promise(res => { const t = performance.now(); setTimeout(() => res(performance.now() - t), 50); }));
    const clicked = await page.evaluate(() => { document.getElementById('stdinBox').open = !document.getElementById('stdinBox').open; return true; });
    await finish();
    r = await page.evaluate(() => ({ verdict: document.querySelector('#result .poc-verdict').dataset.verdict, text: document.querySelector('#cases').innerText }));
    ok(`${lang} → TLE, main thread stayed responsive (timer lag ${Math.round(lag)} ms)`, r.verdict === 'TLE' && lag < 500 && clicked, r.text);
    await setCode(SOL['hello-world'][lang]);
    r = await submit();
    ok(`${lang} runtime rebuilt → AC afterwards`, r.verdict === 'AC');
  }
  await pick('hello-world', 'javascript'); await setCode('while (true) {}');
  await page.click('#runBtn'); await page.waitForTimeout(300);
  const t0 = Date.now(); await page.click('#stopBtn'); await finish(5000);
  ok('stop button ends a running program within 1.5 s', Date.now() - t0 < 1500 && /已停止/.test(await page.locator('#result').innerText()));

  console.log('7. 沙箱逃逸與未授權網路');
  const before = canaryHits.length;
  await pick('hello-world', 'javascript');
  await setCode(`const C = ${JSON.stringify(CANARY)};
const out = [];
const t = async (name, fn) => { try { const v = await fn(); out.push(name + ':LEAK:' + v); } catch (e) { out.push(name + ':blocked'); } };
(async () => {
  await t('parent', () => self.parent.document.title);
  await t('top', () => self.top.location.href);
  await t('localStorage', () => localStorage.getItem('cslab.os'));
  await t('indexedDB', () => new Promise((res, rej) => { const q = indexedDB.open('x'); q.onsuccess = () => res('open'); q.onerror = () => rej(q.error); }));
  await t('caches', () => caches.keys());
  await t('cookie', () => document.cookie);
  await t('fetch(proto)', () => WorkerGlobalScope.prototype.fetch.call(self, C + '/fetch').then(r => r.status));
  await t('fetch(delete stub)', () => { delete self.fetch; return fetch(C + '/fetch2').then(r => r.status); });
  await t('importScripts(proto)', () => { WorkerGlobalScope.prototype.importScripts.call(self, C + '/import.js'); return 'loaded'; });
  await t('Worker(remote)', () => new Promise((res, rej) => { const w = new Worker(C + '/worker.js'); w.onerror = rej; setTimeout(() => res('started'), 300); }));
  await t('WebSocket', () => new WebSocket('ws://localhost:${CANARY_PORT}/ws'));
  await t('beacon', () => navigator.sendBeacon ? navigator.sendBeacon(C + '/beacon', 'x') || Promise.reject() : Promise.reject());
  await t('eval', () => eval('1 + 1'));
  await t('Function', () => Function('return 1')());
  await t('main page via postMessage', () => { self.postMessage({ type: 'done', id: 1, raw: { js: 'ok', stdout: 'Hello, CS LAB!\\n' } }); return Promise.reject(); });
  console.log(out.join('\\n'));
})();`);
  r = await run('');
  const lines = r.out.trim().split('\n');
  ok('JavaScript: every escape attempt blocked', lines.length === 15 && lines.every(l => l.endsWith(':blocked')), r.out);

  await pick('hello-world', 'python');
  await setCode(`import js
out = []
def t(name, fn):
    try:
        v = fn()
        out.append(f"{name}:LEAK:{v}")
    except BaseException as e:
        out.append(f"{name}:blocked")
def xhr(u):
    x = js.XMLHttpRequest.new(); x.open("GET", u, False); x.send(); return x.status
t("document", lambda: js.document.title)
t("localStorage", lambda: js.localStorage.getItem("cslab.os"))
t("indexedDB", lambda: js.indexedDB.open("x"))
t("xhr canary", lambda: xhr("${CANARY}/py"))
t("xhr main site", lambda: xhr("http://localhost:${PORT}/os-lab/index.html"))
t("xhr own vendor", lambda: xhr("http://localhost:${PORT}/os-lab/challenge-poc/vendor/pyodide-314.0.7/package.json"))
t("importScripts", lambda: js.importScripts("${CANARY}/py.js"))
t("os.system", lambda: __import__("os").system("ls"))
print("\\n".join(out))`);
  r = await run('');
  const pl = r.out.trim().split('\n');
  ok('Python: DOM, storage, network (canary, main site, even its own vendor folder) blocked', pl.length === 8 && pl.filter(l => !/^os\.system/.test(l)).every(l => l.endsWith(':blocked')), r.out);

  await pick('hello-world', 'c');
  await setCode('#include <stdio.h>\nint main(void) {\n    FILE *f = fopen("/etc/passwd", "r");\n    printf("%s\\n", f ? "LEAK" : "blocked");\n    return 0;\n}\n');
  r = await run('');
  ok('C: no file system (fopen fails)', r.out.trim() === 'blocked', r.out);
  await page.waitForTimeout(500);
  ok('canary server never contacted', canaryHits.length === before, JSON.stringify(canaryHits));

  console.log('8. 上限：輸出、原始碼');
  await pick('hello-world', 'javascript'); await setCode('for (;;) console.log("spam spam spam");');
  r = await run('');
  ok('JS output flood → RE with output-limit note, not TLE', r.verdict === 'RE' && /輸出超過/.test(r.text), r.text);
  await pick('hello-world', 'c'); await setCode('#include <stdio.h>\nint main(void) { for (;;) puts("spam"); }');
  r = await run('');
  ok('C output flood → RE with output-limit note', r.verdict === 'RE' && /輸出超過/.test(r.text), r.text);
  await pick('hello-world', 'python'); await setCode('# ' + 'x'.repeat(70 * 1024) + '\nprint(1)');
  r = await run('');
  ok('source over 64 KB rejected before running', r.verdict === 'IE' && /超過上限/.test(r.text), r.text);

  console.log('9. 程式碼儲存與還原、每種語言各自一份');
  await pick('a-plus-b', 'c'); await setCode('/* my C draft */\n');
  await pick('a-plus-b', 'python'); await setCode('# my Python draft\n');
  await pick('binary-search', 'javascript');
  await page.reload(); await page.waitForSelector('#problemList [data-id]');
  ok('last problem and language restored', await page.evaluate(() => CSPoc.challenge === 'binary-search' && CSPoc.language === 'javascript'));
  await pick('a-plus-b', 'c');
  ok('C draft restored after reload', (await page.inputValue(editor)) === '/* my C draft */\n');
  await pick('a-plus-b', 'python');
  ok('Python draft kept separately', (await page.inputValue(editor)) === '# my Python draft\n');
  await page.click('#resetBtn');
  ok('reset restores the starter code', (await page.inputValue(editor)).includes('# TODO: 輸出 a + b'));
  await pick('a-plus-b', 'c');
  ok('reset did not touch the other language', (await page.inputValue(editor)) === '/* my C draft */\n');
  const store = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  ok('CS LAB course data untouched', Object.entries(cslab).every(([k, v]) => store[k] === v), JSON.stringify(store));
  ok('only cslab.poc.v1.* keys added (plus the shared skin flag)', Object.keys(store).every(k => k in cslab || k.startsWith('cslab.poc.v1.') || k === 'cslab.art'), Object.keys(store).join(', '));

  console.log('10. 編輯器：縮排');
  await pick('hello-world', 'c'); await setCode('int main(void) {');
  await page.focus(editor); await page.keyboard.press('End'); await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter'); await page.keyboard.type('return 0;'); await page.keyboard.press('Enter'); await page.keyboard.type('}');
  ok('Enter after { indents, typing } dedents', (await page.inputValue(editor)) === 'int main(void) {\n    return 0;\n}', JSON.stringify(await page.inputValue(editor)));
  await page.keyboard.press('Control+a'); await page.keyboard.press('Tab');
  ok('Tab indents the selected lines', (await page.inputValue(editor)).split('\n').every(l => l.startsWith('    ')));
  await page.keyboard.press('Shift+Tab');
  ok('Shift+Tab removes it', (await page.inputValue(editor)) === 'int main(void) {\n    return 0;\n}');
  await page.keyboard.press('Escape'); await page.keyboard.press('Tab');
  ok('Esc then Tab leaves the editor', await page.evaluate(() => document.activeElement !== document.querySelector('#editor textarea')));
  ok('syntax highlighting rendered', await page.locator('#editor .tk-kw').count() > 0);

  console.log('11. 手機寬度');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage(); mp.on('pageerror', e => errors.push('mobile: ' + e.message));
  await mp.goto(URL_); await mp.waitForSelector('#problemList [data-id]');
  await mp.click('[data-lang="javascript"]'); await mp.fill(editor, SOL['hello-world'].javascript);
  await mp.click('#submitBtn');
  await mp.waitForFunction(() => document.getElementById('work').getAttribute('aria-busy') === 'false' && document.querySelector('#result .poc-verdict'), null, { timeout: 60000 });
  ok('mobile: submit works', await mp.evaluate(() => document.querySelector('#result .poc-verdict').dataset.verdict === 'AC'));
  ok('mobile: no horizontal page scroll', await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const box = await mp.locator('#editor').boundingBox();
  ok('mobile: editor fits the width and is tall enough', box.x >= 0 && box.x + box.width <= 390 && box.height >= 240, JSON.stringify(box));
  await m.close();

  ok('no page errors', errors.length === 0, errors.join('\n'));
  console.log('\n每題提交時間（ms，第一次含下載與初始化）', timing);
  await browser.close(); server.kill(); canary.close();
  console.log('\ncoding-poc: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
