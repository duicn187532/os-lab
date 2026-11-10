// DM LAB 端對端檢查（共用 shell 試點）：教材完整保留、24 個逐步實驗、測驗與錯題本、舊進度相容、路由與手機版面。
// 用法：python -m http.server 8000（儲存庫根目錄）後執行 node tests/dm-review.cjs
// 環境變數：CHROMIUM_PATH 指定瀏覽器、TEST_URL 指定網址（預設 http://localhost:8000/dm/）。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const URL = process.env.TEST_URL || 'http://localhost:8000/dm/';

// 1. 舊版單檔中的每一章、每一題都原封不動地搬到 content.js
const old = JSON.parse(execFileSync('git', ['show', 'b564244:dm/index.html'], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n').match(/const COURSES = (\[.*\]);\s*$/m)[1]);
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'dm/assets/content.js'), 'utf8'), ctx);
const D = JSON.parse(JSON.stringify(ctx.window.DM_DATA)); // 跨 realm 陣列需正規化才能 deepStrictEqual
assert.equal(D.lessons.length, old.length);
for (const o of old) {
  const n = D.lessons.find(l => l.id === o.id);
  assert.deepEqual([n.unit, n.title, n.short, n.minutes, n.ask, n.analogy, n.why, n.details, n.steps, n.worked, n.caveat, n.code[1], n.lab], [o.category, o.title, o.tag, o.mins, o.question, o.analogy, o.core, o.concepts, o.steps, o.worked, o.trap, o.code, o.lab], `chapter ${o.id} preserved`);
  assert.deepEqual(n.quiz, o.quiz.map(q => [q.q, q.a, q.correct, q.hint, q.why]), `chapter ${o.id} quiz preserved`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.location().url.includes('/self-research/assets/maple/')) errors.push(m.text()); }); // 楓之谷素材是選用的：只開 os-lab 時載不到，外觀自動退回學術外觀

  // 2. 舊版進度（同一個 localStorage 鍵）在新版中仍然有效
  // 從同源但不執行 app 的頁面寫入舊資料（已開啟的 app 會在離開頁面時存檔，會蓋掉直接注入的資料）
  await page.goto(new globalThis.URL('../', URL).href);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('dm_lab_progress_v1', JSON.stringify({ theme: 'light', done: { 0: true, 3: true }, answers: { 0: { 0: true } }, notes: { 0: '舊筆記' } })); });
  await page.goto(URL);
  assert.equal(await page.evaluate(() => CSApp.countDone()), 2, 'old completed chapters kept');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light', 'old theme kept');
  await page.goto(URL + '#/ch/0/learn');
  assert.equal(await page.locator('#noteArea').inputValue(), '舊筆記', 'old notes kept');
  await page.goto(new globalThis.URL('../', URL).href); await page.evaluate(() => localStorage.clear()); await page.goto(URL + '#/');

  // 3. 每一章：觀念頁、實驗（逐步、調整輸入、回看）、測驗全對
  const ids = D.lessons.map(l => l.id);
  for (const id of ids) {
    await page.evaluate(id => CSApp.navigate(id, 'learn'), id);
    assert((await page.locator('#stage').innerText()).includes(D.lessons.find(l => l.id === id).ask), `learn ${id}`);
    await page.evaluate(id => CSApp.navigate(id, 'lab'), id);
    const before = await page.locator('#labBody').innerText();
    assert(before.length > 20, `lab ${id} renders`);
    const end = page.locator('#labBody [data-act=end]');
    if (await end.isEnabled()) { await end.click(); assert.notEqual(await page.locator('#labBody').innerText(), before, `lab ${id} advances`); }
    for (const sel of await page.locator('#labBody select[data-set]').all()) { const opts = await sel.locator('option').all(); await sel.selectOption({ index: opts.length - 1 }); }
    for (const r of await page.locator('#labBody input[type=range]').all()) await r.fill(await r.getAttribute('max'));
    if (await page.locator('#labBody [data-act=next]').isEnabled()) await page.locator('#labBody [data-act=next]').click();
    if (await page.locator('#undoLab').isEnabled()) await page.locator('#undoLab').click();
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

  // 4. 正解平均分散在每個位置：全課程各位置的正解數相差不超過 1，每章也輪流用遍各位置；重新整理後順序不變
  const answerSlots = () => page.evaluate(() => CSApp.lessons.map(l => l.quiz.map((q, qi) => [q[1].length, CSApp.choiceOrder(l.id, qi).indexOf(q[2])])));
  const slots = await answerSlots(), tally = (qs, n) => [...Array(n).keys()].map(p => qs.filter(([, x]) => x === p).length);
  const counts = tally(slots.flat(), 4);
  assert(Math.max(...counts) - Math.min(...counts) <= 1, `answer positions near-uniform: ${counts}`);
  slots.forEach((qs, i) => { const c = tally(qs, Math.min(...qs.map(([n]) => n))); assert(Math.max(...c) - Math.min(...c) <= 1, `chapter ${i} answer positions: ${c}`); });
  await page.reload(); assert.deepEqual(await answerSlots(), slots, 'choice order stable across reloads');

  // 5. 自動播放、錯題本、搜尋、工具頁
  await page.goto(URL + '#/ch/12/lab');
  await page.locator('#playSpeed').selectOption('350'); await page.locator('#playLab').click(); await page.waitForTimeout(900); await page.locator('#playLab').click();
  assert(await page.evaluate(() => CSApp.state.lab.k) >= 1, 'autoplay advanced');
  await page.evaluate(() => CSApp.navigate(1, 'quiz'));
  await page.locator('[data-quiz=retry]').click().catch(() => {});
  const q = await page.evaluate(() => CSApp.byId[1].quiz[0]);
  const wrong = [0, 1, 2, 3].filter(i => i !== q[2] && i < q[1].length);
  await page.locator(`#stage [data-answer="${wrong[0]}"]`).click(); await page.locator(`#stage [data-answer="${wrong[1]}"]`).click();
  assert(await page.evaluate(() => '1:0' in CSApp.store.wrong), 'wrong answer recorded');
  await page.goto(URL + '#/review'); assert((await page.locator('#content').innerText()).includes('開始複習'));
  await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('/'); await page.keyboard.type('Euler'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => CSApp.state.page), 'lesson', 'search navigates');
  for (const p of ['labs', 'notes', 'formulas']) { await page.goto(URL + '#/' + p); assert((await page.locator('#content').innerText()).length > 40, p); }
  await page.reload(); assert.equal(await page.evaluate(() => CSApp.countDone()), ids.length, 'progress persists');

  // 6. 手機版面
  await page.setViewportSize({ width: 375, height: 812 });
  for (const id of ids) for (const tab of ['learn', 'lab', 'quiz']) {
    await page.evaluate(([id, tab]) => CSApp.navigate(id, tab), [id, tab]);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `mobile overflow: chapter ${id} ${tab}`);
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(`PASS: DM ${ids.length} chapters preserved, ${ids.length} frame labs, ${D.lessons.reduce((a, l) => a + l.quiz.length, 0)} quiz answers, old progress compatible, answer positions balanced and stable, autoplay, wrong-answer log, search, mobile overflow; no browser errors`);
})().catch(e => { console.error(e); process.exit(1); });
