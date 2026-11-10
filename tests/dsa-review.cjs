// DSA LAB 端對端檢查：教材完整保留、18 個逐步實驗（每章輸出不同）、測驗與錯題本、舊進度相容、路由與手機版面。
// 用法：python -m http.server 8000（儲存庫根目錄）後執行 node tests/dsa-review.cjs
// 環境變數：CHROMIUM_PATH 指定瀏覽器、TEST_URL 指定網址（預設 http://localhost:8000/dsa/）。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const URL = process.env.TEST_URL || 'http://localhost:8000/dsa/';

// 1. 舊版單檔（遷移前的 cdef321）中的每一章、每一題都原封不動地搬到 content.js
const oldSrc = execFileSync('git', ['show', 'cdef321:dsa/index.html'], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
const old = JSON.parse(JSON.stringify(vm.runInNewContext(oldSrc.match(/<script>const CHAPTERS = (\[[\s\S]*?\n\]);/)[1])));
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'dsa/assets/content.js'), 'utf8'), ctx);
const D = JSON.parse(JSON.stringify(ctx.window.DSA_DATA)); // 跨 realm 陣列需正規化才能 deepStrictEqual
const NEW_LAB = { 0: 'memory', 8: 'dcsort', 13: 'dijkstra', 17: 'choose' }; // 舊版與其他章共用實驗、輸出完全相同的章節
assert.equal(D.lessons.length, old.length);
old.forEach((o, i) => {
  const n = D.lessons.find(l => l.id === i);
  assert.deepEqual([n.unit, n.title, n.short, n.analogy, n.caveat, n.details, n.code[1], n.lab], [o.tag, o.title, o.subtitle, o.analogy, o.limit, o.sections, o.code, NEW_LAB[i] || o.lab], `chapter ${i} preserved`);
  assert.deepEqual(n.quiz.map(q => [q[0], q[1], q[2], q[4]]), o.q, `chapter ${i} quiz preserved`);
  n.quiz.forEach((q, j) => assert(q[3] && q[3] !== q[4] && !q[3].includes(q[1][q[2]]), `chapter ${i} q${j} has a hint that does not give the answer away`));
});
const units = [...new Set(old.map(o => o.tag))];
assert.deepEqual(D.lessons.map(l => units.indexOf(l.unit)), [...D.lessons.map(l => units.indexOf(l.unit))].sort((a, b) => a - b), 'lessons ordered by unit');

// 2. 實驗計算：選型、Dijkstra、快取行
const lctx = { window: {}, document: {} }; lctx.window = lctx; vm.createContext(lctx);
for (const f of ['shared/cslab-ui.js', 'dsa/assets/labs.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), lctx);
const sim = lctx.CSLab.sim.dsa;
for (const n of [1e3, 1e5, 1e7]) for (const [task, want] of Object.entries({ grades: 'hash', tasks: 'heap', playlist: 'darr', price: 'bst', undo: 'darr' })) assert.equal(sim.chooseEval(task, n).winner.key, want, `choose ${task} n=${n}`);
const dj = sim.generate('dijkstra', { start: 'A' }).frames.at(-1).dist;
assert.deepEqual(JSON.parse(JSON.stringify(dj)), { A: 0, B: 3, C: 2, D: 6, E: 4, F: 7 }, 'Dijkstra distances from A');
for (const [elem, size] of [['char', 1], ['int', 4], ['double', 8]]) for (const line of [16, 64]) {
  const last = sim.generate('memory', { layout: 'array', elem, count: 12, index: 5, line }).frames.at(-1);
  assert.equal(last.miss, Math.ceil(12 * size / line), `array cache misses ${elem}/${line}`);
  assert.equal(sim.generate('memory', { layout: 'linked', elem, count: 12, index: 5, line }).frames.at(-1).miss, 12, `linked list misses ${elem}/${line}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.location().url.includes('/self-research/assets/maple/')) errors.push(m.text()); }); // 楓之谷素材是選用的：只開 os-lab 時載不到，外觀自動退回學術外觀
  const portal = new globalThis.URL('../', URL).href;

  // 3. 舊版進度（四個 dsa.* 鍵）在第一次開啟新版時匯入；舊鍵不被改動
  // 從同源但不執行 app 的頁面寫入舊資料（已開啟的 app 會在離開頁面時存檔，會蓋掉直接注入的資料）
  const legacy = { 'dsa.complete': '{"0":true,"3":true,"5":false}', 'dsa.answers': '{"0-0":1,"1-0":0}', 'dsa.notes': '{"0":"舊筆記","2":""}', 'dsa.theme': 'light' };
  await page.goto(portal);
  await page.evaluate(legacy => { localStorage.clear(); for (const [k, v] of Object.entries(legacy)) localStorage.setItem(k, v); }, legacy);
  await page.goto(URL);
  assert.equal(await page.evaluate(() => CSApp.countDone()), 2, 'old completed chapters kept');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light', 'old theme kept');
  assert.deepEqual(await page.evaluate(() => Object.keys(CSApp.store.wrong)), ['1:0'], 'old wrong answer goes to the wrong-answer log');
  await page.goto(URL + '#/ch/0/learn');
  assert.equal(await page.locator('#noteArea').inputValue(), '舊筆記', 'old notes kept');
  await page.goto(portal);
  assert.deepEqual(await page.evaluate(keys => keys.map(k => localStorage.getItem(k)), Object.keys(legacy)), Object.values(legacy), 'legacy keys untouched');
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dsa.progress')); s.done = {}; localStorage.setItem('dsa.progress', JSON.stringify(s)); });
  await page.goto(URL); assert.equal(await page.evaluate(() => CSApp.countDone()), 0, 'legacy data imported only once');
  await page.goto(portal); await page.evaluate(() => localStorage.clear()); await page.goto(URL + '#/');

  // 4. 每一章：觀念頁、實驗（預設輸出彼此不同、逐步、調整輸入、回看）、測驗全對
  const ids = D.lessons.map(l => l.id), firstView = {};
  for (const id of ids) {
    const L = D.lessons.find(l => l.id === id);
    await page.evaluate(id => CSApp.navigate(id, 'learn'), id);
    const learn = await page.locator('#stage').innerText();
    assert(learn.includes(L.analogy) && L.details.every(d => learn.includes(d[0])), `learn ${id}`);
    await page.evaluate(id => CSApp.navigate(id, 'lab'), id);
    const before = await page.locator('#labBody').innerText();
    assert(before.length > 20, `lab ${id} renders`);
    firstView[id] = await page.evaluate(() => { const s = CSApp.state.lab; return JSON.stringify(s.v) + document.querySelector('#labBody .frame-visual').innerHTML; });
    await page.locator('#labBody [data-act=next]').click();
    assert.equal(await page.evaluate(() => CSApp.state.lab.k), 1, `lab ${id} advances`);
    await page.locator('#labBody [data-act=end]').click();
    assert.notEqual(await page.locator('#labBody').innerText(), before, `lab ${id} reaches the end`);
    await page.locator('#undoLab').click();
    assert.equal(await page.evaluate(() => CSApp.state.lab.k), 1, `lab ${id} undo`);
    for (const sel of await page.locator('#labBody select[data-set]').all()) { const opts = await sel.locator('option').all(); await sel.selectOption({ index: opts.length - 1 }); }
    assert(await page.locator('#labBody .frame-title').innerText(), `lab ${id} still renders after changing inputs`);
    if (await page.locator('#labBody [data-act=next]').isEnabled()) await page.locator('#labBody [data-act=next]').click();
    await page.evaluate(id => CSApp.navigate(id, 'quiz'), id);
    const n = await page.evaluate(id => CSApp.byId[id].quiz.length, id);
    for (let j = 0; j < n; j++) {
      const ans = await page.evaluate(([id, j]) => CSApp.byId[id].quiz[j][2], [id, j]);
      await page.locator(`#stage [data-answer="${ans}"]`).click(); await page.locator('#nextQuiz').click();
    }
    assert((await page.locator('#stage').innerText()).includes(`完成 ${n} 題`), `quiz ${id}`);
  }
  assert.equal(await page.evaluate(() => CSApp.countDone()), ids.length);
  assert.equal(await page.evaluate(() => Object.keys(CSApp.store.lab).length), ids.length, 'every lab used');
  const same = ids.flatMap((a, i) => ids.slice(i + 1).filter(b => firstView[a] === firstView[b]).map(b => `${a}=${b}`));
  assert.deepEqual(same, [], 'no two chapters open on identical lab output');
  assert.equal(new Set(D.lessons.map(l => l.lab)).size, ids.length, 'one dedicated lab per chapter');
  await page.goto(URL + '#/ch/13/lab'); assert((await page.locator('#labBody').innerText()).includes('Dijkstra'), 'shortest-path chapter starts on Dijkstra');
  await page.goto(URL + '#/ch/8/lab'); assert((await page.locator('#labBody').innerText()).includes('合併區間'), 'divide-and-conquer chapter starts on Merge Sort');

  // 5. 正解平均分散在每個位置：全課程各位置的正解數相差不超過 1，每章也輪流用遍各位置；重新整理後順序不變
  const answerSlots = () => page.evaluate(() => CSApp.lessons.map(l => l.quiz.map((q, qi) => [q[1].length, CSApp.choiceOrder(l.id, qi).indexOf(q[2])])));
  const slots = await answerSlots(), tally = (qs, n) => [...Array(n).keys()].map(p => qs.filter(([, x]) => x === p).length);
  const counts = tally(slots.flat(), 3);
  assert(Math.max(...counts) - Math.min(...counts) <= 1, `answer positions near-uniform: ${counts}`);
  slots.forEach((qs, i) => { const c = tally(qs, Math.min(...qs.map(([n]) => n))); assert(Math.max(...c) - Math.min(...c) <= 1, `chapter ${i} answer positions: ${c}`); });
  await page.reload(); assert.deepEqual(await answerSlots(), slots, 'choice order stable across reloads');

  // 6. 自動播放、錯題本、搜尋、工具頁
  await page.goto(URL + '#/ch/7/lab');
  await page.locator('#playSpeed').selectOption('350'); await page.locator('#playLab').click(); await page.waitForTimeout(900); await page.locator('#playLab').click();
  assert(await page.evaluate(() => CSApp.state.lab.k) >= 1, 'autoplay advanced');
  await page.evaluate(() => CSApp.navigate(1, 'quiz'));
  await page.locator('[data-quiz=retry]').click().catch(() => {});
  const q = await page.evaluate(() => CSApp.byId[1].quiz[0]);
  const wrong = [0, 1, 2].filter(i => i !== q[2]);
  await page.locator(`#stage [data-answer="${wrong[0]}"]`).click();
  assert((await page.locator('#stage').innerText()).includes(q[3]), 'first miss shows the hint');
  await page.locator(`#stage [data-answer="${wrong[1]}"]`).click();
  assert((await page.locator('#stage').innerText()).includes(q[4]), 'second miss shows the explanation');
  assert(await page.evaluate(() => '1:0' in CSApp.store.wrong), 'wrong answer recorded');
  await page.goto(URL + '#/review'); assert((await page.locator('#content').innerText()).includes('開始複習'));
  await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('/'); await page.keyboard.type('Dijkstra'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => CSApp.state.page), 'lesson', 'search navigates');
  await page.goto(URL + '#/labs'); assert.equal(await page.locator('#content').innerText().then(t => ['記憶體位址與快取行', '需求驅動的資料結構選型', 'Dijkstra 最短路徑', '分治排序'].every(x => t.includes(x))), true, 'lab index lists the new labs');
  await page.goto(URL + '#/notes'); assert((await page.locator('#content').innerText()).length > 40, 'notes');
  await page.reload(); assert.equal(await page.evaluate(() => CSApp.countDone()), ids.length, 'progress persists');

  // 7. 手機版面（含每個實驗的最後一步：表格、長條、樹與圖最寬的時候）
  await page.setViewportSize({ width: 375, height: 812 });
  for (const id of ids) for (const tab of ['learn', 'lab', 'quiz']) {
    await page.evaluate(([id, tab]) => CSApp.navigate(id, tab), [id, tab]);
    if (tab === 'lab') await page.locator('#labBody [data-act=end]').click().catch(() => {});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `mobile overflow: chapter ${id} ${tab}`);
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(`PASS: DSA ${ids.length} chapters and ${D.lessons.reduce((a, l) => a + l.quiz.length, 0)} questions preserved, ${ids.length} distinct labs (choose / Dijkstra / cache-line results checked), all quizzes answered, old progress imported, answer positions balanced and stable, hint then explanation, autoplay, wrong-answer log, search, mobile overflow; no browser errors`);
})().catch(e => { console.error(e); process.exit(1); });
