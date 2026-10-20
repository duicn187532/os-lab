// AI LAB 端對端檢查（共用 shell）：教材完整保留、24 個逐步實驗、測驗與錯題本、舊進度相容、路由與手機版面。
// 用法：python -m http.server 8000（儲存庫根目錄）後執行 node tests/ai-review.cjs
// 環境變數：CHROMIUM_PATH 指定瀏覽器、TEST_URL 指定網址（預設 http://localhost:8000/ai/）。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const URL = process.env.TEST_URL || 'http://localhost:8000/ai/';

// 1. 舊版單檔（遷移前 cdef321）中的每一章、每一題都原封不動地搬到 content.js
const src = execFileSync('git', ['show', 'cdef321:ai/index.html'], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
const a = src.indexOf('const CHAPTERS = '), old = JSON.parse(vm.runInNewContext(src.slice(a, src.indexOf('</script>', a)) + ';JSON.stringify(CHAPTERS)'));
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'ai/assets/content.js'), 'utf8'), ctx);
const D = JSON.parse(JSON.stringify(ctx.window.AI_DATA)); // 跨 realm 陣列需正規化才能 deepStrictEqual
assert.equal(D.lessons.length, old.length);
old.forEach((o, i) => {
  const n = D.lessons.find(l => l.id === i);
  assert.deepEqual([n.unit, n.title, n.short, n.analogy, n.why, n.details, n.caveat, n.code[1], n.lab], [o.tag, o.title, o.subtitle, o.analogy, o.formula, o.sections, o.limit, o.code, o.lab], `chapter ${i} preserved`);
  assert.deepEqual(n.quiz.map(([q, opts, right, , why]) => [q, opts, right, why]), o.q, `chapter ${i} quiz preserved`);
  n.quiz.forEach((q, j) => assert(q[3] && q[3].length > 4, `chapter ${i} question ${j} has a hint`));
});
// 依單元排序：同一單元的章節相鄰
const unitOrder = D.lessons.map(l => D.units.indexOf(l.unit));
assert.deepEqual(unitOrder, [...unitOrder].sort((x, y) => x - y), 'lessons ordered by unit');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const portal = new globalThis.URL('../', URL).href;

  // 2. 舊版進度（四個 ailab.* 鍵）在第一次開啟新版時合併進來；舊網址 #/chapter/i/tab 仍可用
  // 從同源但不執行 app 的頁面寫入舊資料（已開啟的 app 會在離開頁面時存檔，會蓋掉直接注入的資料）
  await page.goto(portal);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ailab.completed', JSON.stringify({ 0: true, 3: true, 5: false })); localStorage.setItem('ailab.notes', JSON.stringify({ 0: '舊筆記' })); localStorage.setItem('ailab.theme', JSON.stringify('light')); localStorage.setItem('ailab.answers', JSON.stringify({ '1-0': 0, '1-1': 0 })); });
  await page.goto(URL + '#/chapter/3/lab');
  assert.equal(await page.evaluate(() => CSApp.countDone()), 2, 'old completed chapters kept');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light', 'old theme kept');
  assert.deepEqual(await page.evaluate(() => [CSApp.state.page, CSApp.state.lesson, CSApp.state.tab, location.hash]), ['lesson', 3, 'lab', '#/ch/3/lab'], 'old hash route redirected');
  assert.deepEqual(await page.evaluate(() => Object.keys(CSApp.store.wrong)), ['1:0'], 'old wrong answer moved to the wrong-answer log');
  await page.goto(URL + '#/ch/0/learn');
  assert.equal(await page.locator('#noteArea').inputValue(), '舊筆記', 'old notes kept');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ailab.completed'))[0]), true, 'legacy keys left in place');
  await page.goto(portal); await page.evaluate(() => localStorage.clear()); await page.goto(URL + '#/');

  // 3. 每種實驗至少 5 步，且可以逐步前進；小數參數（學習率、門檻）不會被取整
  const short = await page.evaluate(() => Object.entries(CSApp.sim.ai.labs).map(([t, s]) => [t, CSApp.sim.ai.frames(t, Object.fromEntries(s.inputs.map(i => [i[0], i[3]]))).length]).filter(([, n]) => n < 5));
  assert.deepEqual(short, [], 'every lab shows the mechanism in at least 5 steps');
  await page.evaluate(() => CSApp.navigate(2, 'lab'));
  await page.locator('#labBody input[data-set=lr]').fill('0.35');
  assert.equal(await page.evaluate(() => CSApp.state.lab.v.lr), 0.35, 'decimal input kept');

  // 4. 每一章：觀念頁、實驗（逐步、調整輸入、回看）、測驗全對
  const ids = D.lessons.map(l => l.id);
  for (const id of ids) {
    const L = D.lessons.find(l => l.id === id);
    await page.evaluate(id => CSApp.navigate(id, 'learn'), id);
    const learn = await page.locator('#stage').innerText();
    assert(learn.includes(L.analogy) && learn.includes(L.details[0][0]) && learn.includes(L.why), `learn ${id}`);
    await page.evaluate(id => CSApp.navigate(id, 'lab'), id);
    const before = await page.locator('#labBody').innerText();
    assert(before.length > 20, `lab ${id} renders`);
    await page.locator('#labBody [data-act=next]').click();
    assert.equal(await page.evaluate(() => CSApp.state.lab.k), 1, `lab ${id} steps forward`);
    const end = page.locator('#labBody [data-act=end]');
    if (await end.isEnabled()) await end.click();
    const after = await page.locator('#labBody').innerText();
    assert.notEqual(after, before, `lab ${id} advances`);
    assert(after.includes('結論：'), `lab ${id} shows its conclusion on the last step`);
    for (const sel of await page.locator('#labBody select[data-set]').all()) { const opts = await sel.locator('option').all(); await sel.selectOption({ index: opts.length - 1 }); }
    for (const r of await page.locator('#labBody input[type=range]').all()) await r.fill(await r.getAttribute('max'));
    if (await page.locator('#labBody [data-act=next]').isEnabled()) await page.locator('#labBody [data-act=next]').click();
    if (await page.locator('#undoLab').isEnabled()) await page.locator('#undoLab').click();
    await page.evaluate(id => CSApp.navigate(id, 'quiz'), id);
    const n = L.quiz.length;
    for (let j = 0; j < n; j++) { await page.locator(`#stage [data-answer="${L.quiz[j][2]}"]`).click(); await page.locator('#nextQuiz').click(); }
    assert((await page.locator('#stage').innerText()).includes(`完成 ${n} 題`), `quiz ${id}`);
  }
  assert.equal(await page.evaluate(() => CSApp.countDone()), ids.length);
  assert.equal(await page.evaluate(() => Object.keys(CSApp.store.lab).length), ids.length, 'every lab used');

  // 5. 正解平均分散在每個位置：全課程各位置的正解數相差不超過 1，每章也輪流用遍各位置；重新整理後順序不變
  const answerSlots = () => page.evaluate(() => CSApp.lessons.map(l => l.quiz.map((q, qi) => [q[1].length, CSApp.choiceOrder(l.id, qi).indexOf(q[2])])));
  const slots = await answerSlots(), tally = (qs, n) => [...Array(n).keys()].map(p => qs.filter(([, x]) => x === p).length);
  const counts = tally(slots.flat(), 3);
  assert(Math.max(...counts) - Math.min(...counts) <= 1, `answer positions near-uniform: ${counts}`);
  slots.forEach((qs, i) => { const c = tally(qs, Math.min(...qs.map(([n]) => n))); assert(Math.max(...c) - Math.min(...c) <= 1, `chapter ${i} answer positions: ${c}`); });
  await page.reload(); assert.deepEqual(await answerSlots(), slots, 'choice order stable across reloads');

  // 6. 自動播放、提示、錯題本、搜尋、工具頁
  await page.goto(URL + '#/ch/4/lab');
  await page.locator('#playSpeed').selectOption('350'); await page.locator('#playLab').click(); await page.waitForTimeout(900); await page.locator('#playLab').click();
  assert(await page.evaluate(() => CSApp.state.lab.k) >= 1, 'autoplay advanced');
  await page.evaluate(() => CSApp.navigate(1, 'quiz'));
  await page.locator('[data-quiz=retry]').click().catch(() => {});
  const q = D.lessons.find(l => l.id === 1).quiz[0], wrong = [0, 1, 2].filter(i => i !== q[2]);
  await page.locator(`#stage [data-answer="${wrong[0]}"]`).click();
  assert((await page.locator('#stage').innerText()).includes(q[3]), 'hint shown after the first miss');
  await page.locator(`#stage [data-answer="${wrong[1]}"]`).click();
  assert(await page.evaluate(() => '1:0' in CSApp.store.wrong), 'wrong answer recorded');
  await page.goto(URL + '#/review'); assert((await page.locator('#content').innerText()).includes('開始複習'));
  await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('/'); await page.keyboard.type('Attention'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => CSApp.state.page), 'lesson', 'search navigates');
  for (const p of ['labs', 'notes', 'formulas']) { await page.goto(URL + '#/' + p); assert((await page.locator('#content').innerText()).length > 40, p); }
  assert.equal(await page.locator('.formula-card').count(), 3 + ids.length, 'formula sheet: 3 typeset formulas + one per chapter');
  await page.reload(); assert.equal(await page.evaluate(() => CSApp.countDone()), ids.length, 'progress persists');

  // 7. 手機版面：每一章的三個頁籤，以及每個實驗的每一步
  await page.setViewportSize({ width: 375, height: 812 });
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  for (const id of ids) {
    for (const tab of ['learn', 'lab', 'quiz']) { await page.evaluate(([id, tab]) => CSApp.navigate(id, tab), [id, tab]); assert(await fits(), `mobile overflow: chapter ${id} ${tab}`); }
    await page.evaluate(id => CSApp.navigate(id, 'lab'), id);
    const steps = await page.locator('#labBody .frame-steps li').count();
    for (let k = 1; k < steps; k++) { await page.evaluate(k => CSApp.labAct('goto', k), k); assert(await fits(), `mobile overflow: chapter ${id} lab step ${k + 1}`); }
  }
  for (const p of ['', 'labs', 'formulas', 'review', 'notes']) { await page.goto(URL + '#/' + p); assert(await fits(), `mobile overflow: ${p || 'home'}`); }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(`PASS: AI ${ids.length} chapters preserved (+${D.lessons.reduce((a, l) => a + l.quiz.length, 0)} hints), ${ids.length} frame labs (all ≥5 steps), quiz answers, old ailab.* progress and #/chapter routes compatible, answer positions balanced and stable, autoplay, wrong-answer log, search, mobile overflow incl. every lab step; no browser errors`);
})().catch(e => { console.error(e); process.exit(1); });
