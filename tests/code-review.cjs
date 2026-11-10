// 程式實作頁籤（shared/cslab-code.js、各課 assets/code.js）的檢查：
// 1. 題目資料完整、每章一個「④ 實作」頁籤；2. 每題的參考解在各語言都通過、起始程式碼能編譯執行（只是答案不對）、
// 暴力解會逾時；3. 學術外觀的操作流程：草稿、語言切換、執行、提交、紀錄、經驗值只算一次、離開頁籤會停止；
// 4. 楓之谷外觀：任務 NPC、怪物 HP＝測資數、答錯擋下、通過打倒、手機寬度；5. Python 輸出不會跨測資殘留。
// 自己啟動 tests/poc-server.cjs（模仿 GitHub Pages 的 CORS 標頭）；先執行 shared/code/tools/vendor.sh。
//   node os-lab/tests/code-review.cjs [課程，預設 dsa]
// 環境變數：CHROMIUM_PATH、CODE_PORT（預設 8020）、QUICK=1 只跑每題的 Python 參考解（省時間）。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path'), fs = require('node:fs');

const COURSE = process.argv[2] || 'dsa', PORT = +(process.env.CODE_PORT || 8020);
const WEB = path.resolve(__dirname, '..', '..'), ROOT = `http://localhost:${PORT}/os-lab/`;
const SOL = require(path.join(__dirname, 'fixtures', `${COURSE}-solutions.cjs`));
const ok = (name, cond, extra = '') => { assert(cond, `${name} ${extra}`); console.log('  ✓', name); };

(async () => {
  assert(fs.existsSync(path.join(__dirname, '..', 'shared', 'code', 'vendor')), '先執行 shared/code/tools/vendor.sh');
  const server = spawn(process.execPath, [path.join(__dirname, 'poc-server.cjs'), WEB, String(PORT)]);
  await new Promise(r => setTimeout(r, 500));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const course = `${ROOT}${COURSE}/`;
  const open = async (hash) => { await page.goto('about:blank'); await page.goto(course + hash); await page.waitForFunction(() => window.CSApp); };
  const finish = (p = page) => p.waitForFunction(() => document.querySelector('.code-lab')?.getAttribute('aria-busy') === 'false' && document.querySelector('.code-verdict[data-verdict]:not([data-verdict="JUDGING"]):not([data-verdict="RUNNING"])'), null, { timeout: 600000 });
  const editorReady = (p = page) => p.waitForFunction(() => document.querySelector('.code-editor textarea'), null, { timeout: 30000 });

  await page.goto(course); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cslab.skin', 'classic'); });

  console.log('1. 題目資料與頁籤');
  await open('#/');
  const meta = await page.evaluate(() => ({ lessons: CSApp.lessons.map(l => l.id), items: CSLab.code.list().map(p => ({ id: p.id, lesson: p.lesson, full: !!(p.title && p.statement && p.input && p.output && p.hints?.length && p.explain && p.tags?.length && ['cpp', 'python', 'javascript', 'c'].every(k => p.starter[k])), cases: CSLab.code.cases(p).length, visible: CSLab.code.cases(p).filter(c => c.visible).length })) }));
  ok(`every chapter has a coding problem (${meta.items.length})`, meta.lessons.every(id => meta.items.some(p => p.lesson === id)));
  ok('problem data complete, stable ids, 1–2 public samples', meta.items.every(p => p.full && /^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$/.test(p.id) && p.cases >= 3 && p.visible >= 1 && p.visible <= 2), JSON.stringify(meta.items.filter(p => !p.full)));
  ok('solutions provided for every problem', meta.items.every(p => SOL[p.id] && SOL[p.id].cpp && SOL[p.id].python && SOL[p.id].javascript));
  await open(`#/ch/${meta.lessons[0]}/learn`);
  ok('lesson has a fourth tab ④ 實作', (await page.locator('.tabs [role=tab]').allInnerTexts()).join('|') === '① 觀念|② 實驗|③ 測驗|④ 實作');
  ok('no runtime downloaded on a normal chapter page', !(await page.evaluate(() => performance.getEntriesByType('resource').some(e => /\/shared\/code\//.test(e.name)))));

  console.log('2. 參考解、起始程式碼、暴力解（直接呼叫評測，與畫面相同的程式）');
  await page.evaluate(() => CSLab.code.load().then(m => { window.__M = m; }));
  const judge = (id, lang, src) => page.evaluate(async ([id, lang, src]) => { const p = CSLab.code.get(id); const r = await __M.judge({ ...p, cases: CSLab.code.cases(p) }, lang, src); return { verdict: r.verdict, passed: r.passed, total: r.total, max: Math.max(0, ...r.results.map(x => x.result.elapsedMs)), bad: r.results.filter(x => x.verdict !== 'AC').map(x => `${x.name}:${x.verdict}`) }; }, [id, lang, src]);
  const slow = [];
  for (const p of meta.items) {
    const langs = process.env.QUICK ? ['python'] : Object.keys(SOL[p.id]);
    for (const lang of langs) {
      const r = await judge(p.id, lang, SOL[p.id][lang]);
      ok(`${p.id} / ${lang} → AC ${r.passed}/${r.total} (max ${r.max} ms)`, r.verdict === 'AC', r.bad.join(', '));
      slow.push([r.max, `${p.id}/${lang}`]);
    }
    if (process.env.QUICK) continue;
    for (const lang of ['cpp', 'python', 'javascript', 'c']) {
      const src = await page.evaluate(([id, lang]) => CSLab.code.get(id).starter[lang], [p.id, lang]);
      const r = await judge(p.id, lang, src);
      assert(r.verdict === 'WA', `${p.id} starter ${lang} should compile/run and be WA, got ${r.verdict} ${r.bad.join(', ')}`);
    }
    console.log(`  ✓ ${p.id}: starters compile and run in 4 languages (WA until finished)`);
  }
  const BRUTE = {
    dsa: {
      'dsa.complexity.max-subarray': ['c', '#include <stdio.h>\nlong long a[200005];int main(void){int n;scanf("%d",&n);for(int i=0;i<n;i++)scanf("%lld",&a[i]);long long best=a[0];for(int i=0;i<n;i++){long long s=0;for(int j=i;j<n;j++){s+=a[j];if(s>best)best=s;}}printf("%lld\\n",best);return 0;}'],
      'dsa.array.prefix-sum': ['python', 'import sys\nd=sys.stdin.buffer.read().split()\nn,q=int(d[0]),int(d[1])\na=list(map(int,d[2:2+n]))\nv=list(map(int,d[2+n:]))\nprint("\\n".join(str(sum(a[v[2*k]-1:v[2*k+1]])) for k in range(q)))'],
      'dsa.dcsort.inversions': ['cpp', '#include <cstdio>\nlong long a[200005];int main(){int n;scanf("%d",&n);for(int i=0;i<n;i++)scanf("%lld",&a[i]);long long c=0;for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)if(a[i]>a[j])c++;printf("%lld\\n",c);}']
    },
    ics: {
      'ics.loop.count-primes': ['cpp', '#include <cstdio>\nint main(){int q;scanf("%d",&q);while(q--){int n,c=0;scanf("%d",&n);for(int k=2;k<=n;k++){bool p=true;for(int d=2;d*d<=k;d++)if(k%d==0){p=false;break;}c+=p;}printf("%d\\n",c);}}'],
      'ics.complexity.sort-unique': ['cpp', '#include <cstdio>\n#include <algorithm>\nint a[100005],u[100005];int main(){int n,k=0;scanf("%d",&n);for(int i=0;i<n;i++){int x;scanf("%d",&x);bool seen=false;for(int j=0;j<k;j++)if(u[j]==x){seen=true;break;}if(!seen)u[k++]=x;}std::sort(u,u+k);printf("%d\\n",k);for(int i=0;i<k;i++)printf("%d%c",u[i],i+1<k?\' \':\'\\n\');}']
    },
    net: {
      'net.forward.lpm': ['cpp', '#include <cstdio>\n#include <vector>\n#include <string>\nstruct E{unsigned net,mask;int id;};int main(){int n;scanf("%d",&n);std::vector<E>t(n);std::vector<std::string>nm(n);char p[64];for(int i=0;i<n;i++){unsigned a,b,c,d,k;scanf("%u.%u.%u.%u/%u %63s",&a,&b,&c,&d,&k,p);t[i]={a<<24|b<<16|c<<8|d,k?0xFFFFFFFFu<<(32-k):0u,i};nm[i]=p;}int q;scanf("%d",&q);while(q--){unsigned a,b,c,d;scanf("%u.%u.%u.%u",&a,&b,&c,&d);unsigned x=a<<24|b<<16|c<<8|d;int best=-1;unsigned bm=0;for(auto&e:t)if((x&e.mask)==e.net&&(best<0||e.mask>bm)){best=e.id;bm=e.mask;}puts(best<0?"DROP":nm[best].c_str());}}'],
      'net.route.dijkstra': ['c', '#include <stdio.h>\n#include <stdlib.h>\n#include <limits.h>\nint main(void){int n,m,s;scanf("%d %d %d",&n,&m,&s);int*u=malloc(4*m),*v=malloc(4*m),*w=malloc(4*m),*h=malloc(4*(n+1));long long*d=malloc(8*(n+1));for(int i=0;i<m;i++)scanf("%d %d %d",&u[i],&v[i],&w[i]);for(int i=0;i<=n;i++){d[i]=LLONG_MAX/4;h[i]=INT_MAX;}d[s]=0;for(int it=1;it<n;it++){int ch=0;for(int i=0;i<m;i++)for(int r=0;r<2;r++){int a=r?v[i]:u[i],b=r?u[i]:v[i];long long nd=d[a]+w[i];int nh=a==s?b:h[a];if(nd<d[b]||(nd==d[b]&&nh<h[b])){d[b]=nd;h[b]=nh;ch=1;}}if(!ch)break;}for(int x=1;x<=n;x++){if(x==s)puts("0 -");else if(d[x]>=LLONG_MAX/4)puts("INF -");else printf("%lld %d\\n",d[x],h[x]);}return 0;}']
    }
  };
  if (BRUTE[COURSE] && !process.env.QUICK) {
    for (const [id, [lang, src]] of Object.entries(BRUTE[COURSE])) {
      const r = await judge(id, lang, src);
      ok(`${id}: brute force in ${lang} → TLE on the large case (passes the small ones: ${r.passed})`, r.verdict === 'TLE' && r.passed >= 2);
    }
  }
  console.log('  slowest:', slow.sort((a, b) => b[0] - a[0]).slice(0, 4).map(([t, k]) => `${k} ${t} ms`).join(', '));

  console.log('3. Python 的輸出不會跨測資殘留');
  const leak = await page.evaluate(async () => { await __M.execute({ language: 'python', source: 'for i in range(100000): print("spam", i)', stdin: '', timeoutMs: 5000 }); return (await __M.execute({ language: 'python', source: 'print("clean")', stdin: '', timeoutMs: 5000 })).stdout; });
  ok('after an output-limit run the next program starts clean', leak === 'clean\n', JSON.stringify(leak));

  console.log('4. 學術外觀：草稿、語言、執行、提交、紀錄、經驗值');
  const target = meta.items[Math.min(6, meta.items.length - 1)], tl = target.lesson;
  await open(`#/ch/${tl}/code`); await editorReady();
  ok('coding tab shows the problem, samples and editor', await page.locator('.code-brief .code-title').innerText() === (await page.evaluate(id => CSLab.code.get(id).title, target.id)) && await page.locator('.code-sample').count() >= 1);
  await page.click('[data-code-lang="cpp"]'); await editorReady();
  await page.fill('.code-editor textarea', '// my C++ draft\n');
  await page.click('[data-code-lang="python"]'); await editorReady();
  await page.fill('.code-editor textarea', '# my Python draft\n');
  await page.waitForTimeout(600);
  await open(`#/ch/${tl}/code`); await editorReady();
  ok('language preference restored (Python)', await page.getAttribute('[data-code-lang="python"]', 'aria-pressed') === 'true');
  ok('Python draft restored after reload', await page.inputValue('.code-editor textarea') === '# my Python draft\n');
  await page.click('[data-code-lang="cpp"]'); await editorReady();
  ok('C++ draft kept separately', await page.inputValue('.code-editor textarea') === '// my C++ draft\n');
  await page.click('[data-code="reset"]');
  ok('reset restores the C++ starter', await page.inputValue('.code-editor textarea') === await page.evaluate(id => CSLab.code.get(id).starter.cpp, target.id));
  await page.click('[data-code-lang="python"]'); await editorReady();
  const exp0 = await page.evaluate(() => CSLabGame.courseExp());
  await page.fill('.code-editor textarea', SOL[target.id].python);
  await page.click('[data-code="run"]'); await finish();
  ok('run uses the sample input and compares with its output', /相同/.test(await page.locator('.code-result').innerText()));
  await page.click('[data-code="submit"]'); await finish();
  const rec = await page.evaluate(id => CSApp.store.code[id], target.id);
  ok('submit → Accepted, record saved as solved', rec && rec.solved && rec.lang === 'python' && rec.submits === 1 && /Accepted/.test(await page.locator('.code-result').innerText()));
  ok('explanation appears after passing', await page.locator('.code-explain').count() === 1);
  ok('tab ④ marked complete', await page.evaluate(() => document.getElementById('tab-code').classList.contains('complete')));
  ok('EXP +80 for the first pass', await page.evaluate(() => CSLabGame.courseExp()) - exp0 === 80);
  await page.click('[data-code="submit"]'); await finish();
  ok('passing again adds no EXP', await page.evaluate(() => CSLabGame.courseExp()) - exp0 === 80 && (await page.evaluate(id => CSApp.store.code[id].submits, target.id)) === 2);
  await page.fill('.code-editor textarea', 'while True:\n    pass\n');
  await page.click('[data-code="submit"]');
  await page.waitForFunction(() => document.querySelector('.code-case[data-state="running"]'));
  await page.click('#tab-learn');
  await page.waitForFunction(() => !CSLab.code.busy, null, { timeout: 8000 });
  ok('leaving the tab stops the running program', true);
  ok('a later wrong submission does not undo the pass', await page.evaluate(id => CSApp.store.code[id].solved, target.id));
  await page.keyboard.press('/'); await page.keyboard.type(await page.evaluate(id => CSLab.code.get(id).title.slice(0, 4), target.id));
  ok('search finds the coding problem', await page.locator('#paletteList').innerText().then(t => t.includes('實作')));
  await page.keyboard.press('Escape');

  console.log('5. 楓之谷外觀：任務 NPC、怪物 HP、答錯擋下、通過打倒');
  const art = fs.existsSync(path.join(WEB, 'self-research', 'assets', 'maple', 'win9.png'));
  if (!art) console.log('  （沒有 self-research 素材，略過楓之谷外觀）');
  else {
    const t2 = meta.items.find(p => p.lesson !== tl);
    await page.evaluate(() => localStorage.setItem('cslab.skin', 'maple'));
    await open(`#/ch/${t2.lesson}/code`); await editorReady();
    await page.waitForSelector('.code-lab > .perch-foe', { timeout: 15000 });
    ok('quest NPC on the problem dialog', await page.locator('.code-brief > .npc-portrait').count() === 1);
    ok('party and monster stand on the editor window', await page.locator('.code-lab > .perch-party').count() === 1 && await page.locator('.code-lab > .perch-foe').count() === 1);
    ok('HP bar shows the number of test cases', new RegExp(`HP ${t2.cases} / ${t2.cases}`).test(await page.locator('.code-lab .bt-bar').innerText()));
    await page.click('[data-code-lang="python"]'); await editorReady(); await page.waitForSelector('.code-lab > .perch-foe');
    await page.fill('.code-editor textarea', 'print(0)\n');
    await page.click('[data-code="submit"]'); await finish();
    const say = await page.locator('.code-lab .bt-bar').innerText();
    ok('wrong answer: monster still standing, bar reports passed / total', !/已打倒/.test(say) && /通過 \d+ \/ \d+ 筆/.test(say), say);
    await page.fill('.code-editor textarea', SOL[t2.id].python);
    await page.click('[data-code="submit"]'); await finish();
    await page.waitForTimeout(400);
    const won = await page.locator('.code-lab .bt-bar').innerText(), hud = await page.locator('.hud-chat').innerText();
    ok('accepted: monster knocked down, EXP (or the level-up it caused) announced in the HUD', /已打倒/.test(won) && /通過程式實作|等級提升/.test(hud), JSON.stringify([won, hud]));
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mp = await m.newPage(); mp.on('pageerror', e => errors.push('mobile: ' + e.message));
    await mp.goto(course); await mp.evaluate(() => { localStorage.setItem('cslab.skin', 'maple'); localStorage.setItem('cslab.art', '1'); });
    await mp.goto(`${course}#/ch/${t2.lesson}/code`); await editorReady(mp); await mp.waitForTimeout(800);
    ok('mobile (maple): no horizontal page scroll on the coding tab', await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const box = await mp.locator('.code-editor').boundingBox();
    ok('mobile: editor fits the screen', box.x >= 0 && box.x + box.width <= 390 && box.height >= 200, JSON.stringify(box));
    await m.close();
  }

  console.log('6. 進度資料');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem(CSApp.course.storageKey)));
  ok('progress keeps its old fields and only adds code records', ['done', 'notes', 'learn', 'lab', 'wrong', 'challenge', 'code'].every(k => k in store) && Object.keys(store.code).every(id => meta.items.some(p => p.id === id)));
  ok('drafts live in cslab.code.v1.* keys, not in course progress', await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('cslab.code.v1.')).length >= 3) && !JSON.stringify(store).includes('my Python draft'));
  ok('no page errors', errors.length === 0, errors.join('\n'));
  await browser.close(); server.kill();
  console.log(`\ncode-review (${COURSE}): all checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
