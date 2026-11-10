// Coding Challenge PoC 的效能量測（不是通過 / 失敗的測試）：每種語言在全新的瀏覽器環境（沒有快取）與已快取時，
// 第一次提交 Hello World 要多久、下載多少、Hello World 與 Binary Search 的執行時間、記憶體、無窮迴圈多久被終止。
// 本機回環網路下的數字：實際下載時間要另外依網速估算（表格最後一欄）。
//   node os-lab/tests/coding-poc-perf.cjs
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path'), fs = require('node:fs'), zlib = require('node:zlib');

const PORT = +(process.env.POC_PORT || 8012), WEB = path.resolve(__dirname, '..', '..');
const URL_ = `http://localhost:${PORT}/os-lab/challenge-poc/`;
const SRC = {
  hello: { c: '#include <stdio.h>\nint main(void){puts("Hello, CS LAB!");}', cpp: '#include <iostream>\nint main(){std::cout<<"Hello, CS LAB!\\n";}', python: 'print("Hello, CS LAB!")', javascript: 'console.log("Hello, CS LAB!")' },
  bs: {
    c: '#include <stdio.h>\n#include <stdlib.h>\nint main(void){int n;scanf("%d",&n);int*a=malloc(sizeof(int)*(n?n:1));for(int i=0;i<n;i++)scanf("%d",&a[i]);int t;scanf("%d",&t);int lo=0,hi=n-1,r=-1;while(lo<=hi){int m=lo+(hi-lo)/2;if(a[m]==t){r=m;break;}if(a[m]<t)lo=m+1;else hi=m-1;}printf("%d\\n",r);}',
    cpp: '#include <iostream>\n#include <vector>\nint main(){std::ios::sync_with_stdio(false);std::cin.tie(nullptr);int n;std::cin>>n;std::vector<int>a(n);for(int&x:a)std::cin>>x;int t;std::cin>>t;int lo=0,hi=n-1,r=-1;while(lo<=hi){int m=lo+(hi-lo)/2;if(a[m]==t){r=m;break;}if(a[m]<t)lo=m+1;else hi=m-1;}std::cout<<r<<"\\n";}',
    python: 'import sys\nd=sys.stdin.read().split()\nn=int(d[0]);a=list(map(int,d[1:1+n]));t=int(d[1+n])\nlo,hi,r=0,n-1,-1\nwhile lo<=hi:\n  m=(lo+hi)//2\n  if a[m]==t:\n    r=m;break\n  if a[m]<t: lo=m+1\n  else: hi=m-1\nprint(r)',
    javascript: 'const L=readInput().split("\\n");const n=+L[0];const a=n?L[1].trim().split(/\\s+/).map(Number):[];const t=+L[2];let lo=0,hi=n-1,r=-1;while(lo<=hi){const m=(lo+hi)>>1;if(a[m]===t){r=m;break}if(a[m]<t)lo=m+1;else hi=m-1}console.log(r)'
  },
  loop: { c: 'int main(void){volatile int x=0;for(;;)x++;}', cpp: 'int main(){volatile int x=0;for(;;)x++;}', python: 'while True: pass', javascript: 'while(true){}' }
};
const mb = b => (b / 1048576).toFixed(1) + ' MB';

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'poc-server.cjs'), WEB, String(PORT)], { env: { ...process.env, POC_LOG: '1' } });
  const hits = [];
  server.stdout.on('data', d => String(d).split('\n').forEach(l => { try { hits.push(JSON.parse(l)); } catch (_) { /* */ } }));
  await new Promise(r => setTimeout(r, 500));
  const rows = [], os = require('node:os');
  for (const lang of ['c', 'cpp', 'python', 'javascript']) {
    // 每種語言一個全新的使用者資料夾：一般 Chrome 的磁碟快取（Playwright 預設的無痕環境只有很小的記憶體快取，放不下大檔）
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poc-perf-'));
    const ctx = await chromium.launchPersistentContext(dir, { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
    const submit = async (page, id, src) => {
      await page.click(`[data-id="${id}"]`); await page.click(`[data-lang="${lang}"]`); await page.fill('#editor textarea', src);
      const t0 = Date.now(); await page.click('#submitBtn');
      await page.waitForFunction(() => document.getElementById('work').getAttribute('aria-busy') === 'false' && document.querySelector('#result .poc-verdict'), null, { timeout: 600000 });
      return { wall: Date.now() - t0, res: await page.evaluate(() => CSPoc.lastJudge) };
    };
    let page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('[data-id]');
    hits.length = 0;
    const cold = await submit(page, 'hello-world', SRC.hello[lang]);
    const vendor = hits.filter(h => /\/vendor\//.test(h.path) && h.status === 200);
    const runtimeJs = hits.filter(h => /\/runtimes\//.test(h.path));
    const bytes = vendor.reduce((a, h) => a + h.bytes, 0);
    const gz = vendor.reduce((a, h) => a + zlib.gzipSync(fs.readFileSync(path.join(WEB, h.path)), { level: 6 }).length, 0);
    const warm = await submit(page, 'hello-world', SRC.hello[lang] + '\n'); // 執行環境已就緒，原始碼不同（C/C++ 要重新編譯）
    const bs = await submit(page, 'binary-search', SRC.bs[lang]);
    const big = bs.res.results.filter(r => /大型/.test(r.name)).map(r => r.result.elapsedMs);
    const mem = Math.max(...bs.res.results.map(r => r.result.memoryBytes || 0));
    const loopT0 = Date.now(); const loop = await submit(page, 'hello-world', SRC.loop[lang]); const loopWall = Date.now() - loopT0;
    // 已快取：同一個瀏覽器環境開新分頁再關掉舊的（HTTP 快取還在，沙箱與執行環境要重新建立）
    const old = page; page = await ctx.newPage(); await old.close(); await page.goto(URL_); await page.waitForSelector('[data-id]');
    hits.length = 0;
    const cached = await submit(page, 'hello-world', SRC.hello[lang]);
    const refetched = hits.filter(h => /\/vendor\//.test(h.path) && h.status === 200).reduce((a, h) => a + h.bytes, 0);
    await ctx.close(); fs.rmSync(dir, { recursive: true, force: true });
    rows.push({
      lang, files: vendor.length + runtimeJs.length, download: bytes ? `${mb(bytes)}（gzip 約 ${mb(gz)}）` : `0（只有 ${runtimeJs.length} 個 Worker 原始碼，${(runtimeJs.reduce((a, h) => a + h.bytes, 0) / 1024).toFixed(0)} KB）`,
      cold: cold.wall, cached: cached.wall, cachedBytes: refetched,
      hello: `${cold.res.results[0].result.elapsedMs} ms 執行 / 提交 ${warm.wall} ms`,
      bs: `大型 ${big.join('、')} ms / 13 筆提交 ${bs.wall} ms`,
      mem: mem ? mb(mem) + '（WebAssembly 線性記憶體）' : '未取得',
      loop: `${loop.res.verdict}，${loopWall} ms 後回報`,
      est: bytes ? `20 Mbps 約 ${Math.round(gz * 8 / 20e6)} s、100 Mbps 約 ${Math.round(gz * 8 / 100e6)} s（若有 gzip）` : '—'
    });
    console.log(rows[rows.length - 1]);
  }
  console.log('\n| 語言 | 下載量（第一次） | 冷啟動（第一次提交 Hello World） | 已快取初始化 | Hello World | Binary Search | 記憶體峰值 | 無窮迴圈 | 實際網路估計 |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  rows.forEach(r => console.log(`| ${r.lang} | ${r.download} | ${r.cold} ms | ${r.cached} ms（重新下載 ${mb(r.cachedBytes)}） | ${r.hello} | ${r.bs} | ${r.mem} | ${r.loop} | ${r.est} |`));
  server.kill();
})().catch(e => { console.error(e); process.exit(1); });
