// OS LAB 端對端檢查：教材完整性、演算法正確性、全部實驗操作、測驗與錯題本、路由、持久化、鍵盤與手機版面。
// 用法：python -m http.server 8000（儲存庫根目錄）後執行 node tests/os-review.cjs
// 環境變數：CHROMIUM_PATH 指定瀏覽器、TEST_URL 指定網址、SHOT_DIR 指定截圖輸出資料夾。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const URL = process.env.TEST_URL || 'http://localhost:8000/os/';
const SHOTS = process.env.SHOT_DIR;

// 1. 原始 16 章的所有教材文字與題目都保留（只新增，不刪改）
const original = JSON.parse(execFileSync('git', ['show', 'c5e9eb7:os/index.html'], { cwd: root, encoding: 'utf8' }).match(/const lessons = (.*);\r?\n/)[1]);
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'os/assets/content.js'), 'utf8'), ctx);
const D = JSON.parse(JSON.stringify(ctx.window.OS_DATA)); // 跨 realm 陣列需正規化才能 deepStrictEqual
for (const o of original) {
  const n = D.lessons.find(l => l.id === o.id);
  assert(n, `lesson ${o.id} kept`);
  for (const k of ['unit', 'title', 'short', 'minutes', 'icon', 'ask', 'analogy', 'why', 'details', 'steps', 'caveat', 'code']) assert.deepEqual(n[k], o[k], `lesson ${o.id}.${k} preserved`);
  assert.deepEqual(n.quiz.slice(0, o.quiz.length), o.quiz, `lesson ${o.id} original quiz preserved`);
}
const ids = new Set(D.glossary.map(g => g.id));
for (const l of D.lessons) {
  assert(l.goals.length >= 3 && l.summary.length >= 3, `lesson ${l.id} goals/summary`);
  assert(l.quiz.length >= 4, `lesson ${l.id} has ≥4 questions`);
  l.terms.forEach(t => assert(ids.has(t), `term ${t}`));
  l.quiz.forEach(q => assert(q.length === 5 && q[2] < q[1].length, `quiz shape ${l.id}`));
}
assert.equal(new Set(D.lessons.map(l => l.lab)).size, D.lessons.length, 'every chapter has its own lab');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear()); await page.reload();

  // 2. 演算法（與教科書手算結果對照）
  const r = await page.evaluate(() => {
    const S = OSApp.sim, T = { avail: [3, 3, 2], alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]], max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]] };
    const granted = S.bankerRequest(T, 1, [1, 0, 2]);
    const disk = ['FCFS', 'SSTF'].map(a => S.diskSchedule([98, 183, 37, 122, 14, 124, 65, 67], 53, a).total).concat(S.diskSchedule([98, 183, 37, 122, 14, 124, 65, 67], 53, 'SCAN', 'down').total);
    const classic = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
    return {
      sched: ['FCFS', 'SJF', 'SRTF', 'RR'].map(a => S.scheduleSim([{ id: 'A', arr: 0, burst: 5 }, { id: 'B', arr: 1, burst: 2 }], a, 2).trace.join('')),
      srtf: S.scheduleSim([{ id: 'P1', arr: 0, burst: 8 }, { id: 'P2', arr: 1, burst: 4 }, { id: 'P3', arr: 2, burst: 2 }], 'SRTF').rows.map(x => x.done),
      race: [S.raceRun(false, 'ABABAB').x, S.raceRun(true, 'AAAAABBBBB').x],
      repl: ['FIFO', 'LRU', 'OPT'].map(algo => S.simulateReplacement({ algo, capacity: 3, refs: classic }).fault),
      belady: [3, 4].map(c => S.simulateReplacement({ algo: 'FIFO', capacity: c, refs: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5] }).fault),
      banker: S.bankerSafety(T.avail, T.alloc, T.max).order, granted: granted.ok,
      p0: S.bankerRequest(granted.trial, 0, [0, 2, 0]).ok, disk,
      fork: S.forkRun([{ t: 'fork' }, { t: 'fork' }, { t: 'fork' }, { t: 'print', v: 'h' }]).ps.length,
      page: S.translate(0x1234, 4096), fit: S.pickHole([{ size: 16, used: true }, { size: 12 }, { size: 12, used: true }, { size: 30 }, { size: 12, used: true }, { size: 18 }], 15, 'best'),
      perm: S.checkAccess(0o640, 'bob', 'write').ok
    };
  });
  assert.deepEqual(r.sched, ['AAAAABB', 'AAAAABB', 'ABBAAAA', 'AABBAAA']);
  assert.deepEqual(r.srtf, [14, 7, 4]);
  assert.deepEqual(r.race, [1, 2]);
  assert.deepEqual(r.repl, [15, 12, 9]);
  assert.deepEqual(r.belady, [9, 10]);
  assert.deepEqual(r.banker, [1, 3, 4, 0, 2]); assert.equal(r.granted, true); assert.equal(r.p0, false);
  assert.deepEqual(r.disk, [640, 236, 236]);
  assert.equal(r.fork, 8);
  assert.deepEqual([r.page.vpn, r.page.offset, r.page.pa], [1, 0x234, 9 * 4096 + 0x234]);
  assert.equal(r.fit, 5); assert.equal(r.perm, false);

  // 3. 每一章：觀念頁、實驗（點過所有可用按鈕）、測驗全對
  const lessonIds = D.lessons.map(l => l.id);
  for (const id of lessonIds) {
    await page.evaluate(id => OSApp.navigate(id, 'learn'), id);
    await page.locator('#noteArea').fill('筆記 ' + id);
    await page.locator('#readEnd').scrollIntoViewIfNeeded();
    await page.evaluate(id => OSApp.navigate(id, 'lab'), id);
    assert((await page.locator('#labBody').innerText()).length > 20, `lab ${id} renders`);
    for (let round = 0; round < 3; round++) {
      const n = await page.locator('#labBody [data-act]:not([disabled])').count();
      for (let i = 0; i < n; i++) {
        const b = page.locator('#labBody [data-act]:not([disabled])').nth(i);
        if (await b.count() && await b.isVisible()) await b.click();
      }
    }
    for (const s of await page.locator('#labBody input[type=range]').all()) await s.fill(await s.getAttribute('max'));
    if (await page.locator('#undoLab').isEnabled()) await page.locator('#undoLab').click();
    await page.locator('#resetLab').click();
    await page.evaluate(id => OSApp.navigate(id, 'quiz'), id);
    const total = await page.evaluate(id => OSApp.byId[id].quiz.length, id);
    for (let j = 0; j < total; j++) {
      const ans = await page.evaluate(([id, j]) => OSApp.byId[id].quiz[j][2], [id, j]);
      await page.locator(`#stage [data-answer="${ans}"]`).click();
      await page.locator('#nextQuiz').click();
    }
    assert((await page.locator('#stage').innerText()).includes(`完成 ${total} 題`), `quiz ${id} finished`);
  }
  assert.equal(await page.evaluate(() => OSApp.countDone()), lessonIds.length);
  assert.equal(await page.evaluate(() => Object.keys(OSApp.store.lab).length), lessonIds.length, 'every lab was used');

  // 4. 正解平均分散在每個位置：全課程各位置的正解數相差不超過 1，每章也輪流用遍各位置；重新整理後順序不變
  const answerSlots = () => page.evaluate(() => OSApp.lessons.map(l => l.quiz.map((q, qi) => [q[1].length, OSApp.choiceOrder(l.id, qi).indexOf(q[2])])));
  const slots = await answerSlots(), tally = (qs, n) => [...Array(n).keys()].map(p => qs.filter(([, x]) => x === p).length);
  const counts = tally(slots.flat(), 3);
  assert(Math.max(...counts) - Math.min(...counts) <= 1, `answer positions near-uniform: ${counts}`);
  slots.forEach((qs, i) => { const c = tally(qs, Math.min(...qs.map(([n]) => n))); assert(Math.max(...c) - Math.min(...c) <= 1, `chapter ${i} answer positions: ${c}`); });
  await page.reload(); assert.deepEqual(await answerSlots(), slots, 'choice order stable across reloads');

  // 5. 錯題本：答錯兩次 → 進入錯題本；在錯題複習中答對 → 移除
  await page.evaluate(() => { for (const k in OSApp.store.wrong) delete OSApp.store.wrong[k]; OSApp.navigate(0, 'quiz'); }); // 綜合複習實驗剛才隨機作答過
  const q0 = await page.evaluate(() => OSApp.byId[0].quiz[0]);
  const wrongs = [0, 1, 2].filter(i => i !== q0[2]);
  await page.locator(`#stage [data-answer="${wrongs[0]}"]`).click();
  assert((await page.locator('#stage').innerText()).includes('還有一次機會'));
  await page.locator(`#stage [data-answer="${wrongs[1]}"]`).click();
  assert(await page.evaluate(() => '0:0' in OSApp.store.wrong));
  await page.goto(URL + '#/review');
  await page.locator('[data-review=start]').click();
  // 選項會以固定種子洗牌顯示，按鍵要用畫面上的字母
  await page.keyboard.press(await page.locator(`#reviewStage [data-answer="${q0[2]}"]`).getAttribute('data-key'));
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => Object.keys(OSApp.store.wrong).length), 0, 'review clears wrong answer');

  // 6. 路由、上一頁、搜尋、播放控制
  await page.goto(URL + '#/ch/4/lab');
  assert.equal(await page.evaluate(() => OSApp.state.tab), 'lab');
  await page.locator('#tab-quiz').click(); await page.goBack();
  assert.equal(await page.evaluate(() => OSApp.state.tab), 'lab', 'browser back returns to previous tab');
  await page.locator('#playSpeed').selectOption('350'); await page.locator('#playLab').click(); await page.waitForTimeout(900); await page.locator('#playLab').click();
  const t = await page.evaluate(() => OSApp.state.lab.t); assert(t >= 2, 'playback advanced');
  await page.locator('#undoLab').click(); assert.equal(await page.evaluate(() => OSApp.state.lab.t), t - 1, 'undo steps back');
  await page.locator('#tab-learn').click(); await page.locator('#tab-lab').click();
  assert.equal(await page.evaluate(() => OSApp.state.lab.t), t - 1, 'lab state kept across tabs');
  await page.locator('[data-set="job:0:burst"]').fill('9'); await page.locator('[data-set="job:0:burst"]').dispatchEvent('change');
  assert.equal(await page.evaluate(() => OSApp.state.lab.jobs[0].burst), 9);
  await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('/'); await page.keyboard.type('銀行家'); await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => OSApp.state.lesson), 17, 'search opens banker chapter');
  for (const p of ['glossary', 'formulas', 'notes', 'labs', 'review']) { await page.goto(URL + '#/' + p); assert((await page.locator('#content').innerText()).length > 50, p); }
  await page.locator('#themeBtn').click(); assert(['light', 'dark'].includes(await page.evaluate(() => document.documentElement.dataset.theme)));
  if (SHOTS) { await page.goto(URL + '#/ch/4/lab'); await page.screenshot({ path: path.join(SHOTS, 'os-desktop.png') }); }

  // 7. 重新整理後保留進度與筆記
  await page.reload();
  assert.equal(await page.evaluate(() => OSApp.countDone()), lessonIds.length);
  assert.equal(await page.evaluate(() => OSApp.store.notes[0]), '筆記 0');

  // 8. 手機版面：選單焦點與 Escape、所有章節所有頁籤不溢位
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(URL + '#/');
  await page.locator('#menu').click(); assert.equal(await page.locator('#menu').getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#menu').getAttribute('aria-expanded'), 'false');
  for (const id of lessonIds) for (const tab of ['learn', 'lab', 'quiz']) {
    await page.evaluate(([id, tab]) => OSApp.navigate(id, tab), [id, tab]);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `mobile overflow: chapter ${id} ${tab}`);
  }
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'os-mobile.png'), fullPage: true });

  assert.deepEqual(errors, []);
  await browser.close();
  console.log(`PASS: ${D.lessons.length} chapters, ${D.lessons.reduce((a, l) => a + l.quiz.length, 0)} quiz answers (positions balanced), ${D.lessons.length} labs exercised, algorithms, wrong-answer review, routing, playback/undo, search, persistence, mobile overflow; no browser errors`);
})().catch(e => { console.error(e); process.exit(1); });
