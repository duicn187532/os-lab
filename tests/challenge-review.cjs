// 互動挑戰檢查（shared/cslab-challenge.js 與各課 assets/challenges.js）：四個原型關卡的驗證規則、多種合法答案、
// 容許誤差與邊界、驗證之後才出現解析、失誤與提示存檔、經驗值只算一次、學術外觀是互動自我檢測、楓之谷外觀是怪物挑戰。
// 和 skin-review.cjs 一樣，要在兩個儲存庫的上一層目錄啟動伺服器：
//   cd ..   # 同時放著 os-lab/ 與 self-research/ 的目錄
//   python -m http.server 8000
//   node os-lab/tests/challenge-review.cjs
// 環境變數：CHROMIUM_PATH 指定瀏覽器、TEST_ROOT 指定 os-lab 的網址（預設 http://localhost:8000/os-lab/）。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const ROOT = process.env.TEST_ROOT || 'http://localhost:8000/os-lab/';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // 只開 os-lab 時，外觀層試探素材得到的 404 是預期的（之後退回學術外觀）
  page.on('console', m => { if (m.type() === 'error' && !/\/self-research\/assets\/maple\//.test(m.location().url)) errors.push(m.text() + ' ' + m.location().url); });
  const card = '#challengeSlot .challenge';
  // 捲到頁尾會把「觀念」記為讀完（+30），先捲過去，量經驗值時只剩挑戰的差額
  const open = async (course, ch, tab = 'learn') => { await page.goto('about:blank'); await page.goto(`${ROOT}${course}/#/ch/${ch}/${tab}`); await page.waitForSelector(`${card} .ch-body`); await page.evaluate(() => document.getElementById('readEnd')?.scrollIntoView()); await page.waitForTimeout(300); };
  const act = (a, arg) => page.click(arg === undefined ? `${card} [data-ch-act="${a}"]` : `${card} [data-ch-act="${a}"][data-arg="${arg}"]`);
  const rec = () => page.evaluate(() => { const id = document.querySelector('#challengeSlot .challenge').dataset.challenge; return { id, ...(CSApp.store.challenge[id] || {}) }; });
  const msg = () => page.locator(`${card} .ch-msg`).innerText();
  const tone = () => page.evaluate(() => document.querySelector('#challengeSlot .ch-msg').className);
  const explained = () => page.locator(`${card} .ch-explain`).count();
  const exp = () => page.evaluate(() => CSLabGame.courseExp());

  await page.goto(ROOT); await page.evaluate(() => localStorage.clear());

  // 0. 題目資料：穩定 id、題型、介面、參數、規則、提示、解析與標籤；四門課各一題、只在觀念與實驗頁籤出現
  for (const [course, ch, kind] of [['dsa', 6, 'step'], ['os', 4, 'step'], ['dm', 0, 'counterexample'], ['ai', 2, 'target']]) {
    await open(course, ch);
    const items = await page.evaluate(() => CSLab.challenge.list().map(c => ({ id: c.id, kind: c.kind, ui: c.ui, ok: !!(c.lesson !== undefined && c.title && c.task && c.params && c.rule && c.hints.length && c.explain && c.tags.length) })));
    assert.equal(items.length, 1, `${course}: one prototype`);
    assert(items[0].ok && items[0].kind === kind && /^[a-z]+\.[a-z-]+\.[a-z-]+$/.test(items[0].id), `${course}: complete item with a stable id`);
    assert.equal(await page.locator(card).count(), 1, `${course}: challenge at the end of the learn tab`);
    assert.equal(await page.evaluate(() => document.querySelector('#challengeSlot').previousElementSibling.id), 'stage', 'below the chapter, above the pager');
    assert.equal(await explained(), 0, `${course}: no explanation before trying`);
    assert(await page.locator(`${card} [data-ch-tool="reveal"]`).isDisabled(), `${course}: answer locked before any attempt`);
    await page.evaluate(id => CSApp.navigate(id, 'lab'), ch); await page.waitForTimeout(200);
    assert.equal(await page.locator(card).count(), 1, `${course}: also on the lab tab`);
    await page.evaluate(id => CSApp.navigate(id, 'quiz'), ch); await page.waitForTimeout(200);
    assert.equal(await page.locator(card).count(), 0, `${course}: not on the quiz tab`);
  }

  // 1. DSA Binary Search 下一步：中點取上整或下整都接受；方向錯、範圍未空就宣告找不到都是失誤；失誤存檔、重新整理不歸零
  await open('dsa', 6);
  const e0 = await exp();
  await act('probe', 0);
  assert.equal((await rec()).mistakes, 1, 'not the middle: a mistake');
  assert((await msg()).includes('正中間') && (await tone()).includes('bad'), 'says why, not where');
  await page.reload(); await page.waitForSelector(`${card} .ch-body`);
  assert.equal((await rec()).mistakes, 1, 'mistakes survive a reload');
  assert((await page.locator(`${card} .ch-record`).innerText()).includes('失誤 1 次'), 'record shown');
  // 鍵盤：Tab 到格子、Enter 選取
  await page.focus(`${card} [data-ch-act="probe"][data-arg="5"]`); await page.keyboard.press('Enter');
  assert((await msg()).includes('a[5] = 26'), 'keyboard works');
  await act('left');
  assert.equal((await rec()).mistakes, 2, 'wrong half: a mistake');
  assert(!(await page.locator(`${card} [data-ch-tool="reveal"]`).isDisabled()), 'after two mistakes the answer can be opened');
  await act('right'); await act('probe', 8); await act('left');
  await act('probe', 7); // 6..7 的中點：上整 7（模擬器取下整 6），也是合法的二分搜尋
  await act('found');
  assert.equal(await page.evaluate(() => document.querySelector('#challengeSlot .challenge').dataset.round), '1', 'round 1 done');
  await act('absent');
  assert.equal((await rec()).mistakes, 3, 'declaring "not found" with a non-empty range is a mistake');
  for (const [i, d] of [[5, 'left'], [2, 'right'], [3, 'right'], [4, 'left']]) { await act('probe', i); await act(d); }
  await act('absent');
  let r = await rec();
  assert(r.solved && r.mistakes === 3 && !r.revealed, 'solved with the record kept');
  assert.equal(await explained(), 1, 'explanation after solving');
  assert((await page.locator(`${card} .ch-explain`).innerText()).includes('a[5]=26 → a[8]=39 → a[6]=30 → a[7]=34'), 'reference path from CSLab.sim.dsa');
  assert.equal(await exp() - e0, 20, 'three mistakes: EXP +20');
  // 再挑戰：不改紀錄、不再給經驗值
  await page.click(`${card} [data-ch-tool="retry"]`);
  await act('probe', 3);
  for (const [i, d] of [[5, 'right'], [8, 'left'], [6, 'right'], [7, 'found'], [5, 'left'], [2, 'right'], [3, 'right'], [4, 'left']]) { await act('probe', i); if (d) await act(d); }
  await act('absent');
  assert.deepEqual(await rec(), r, 'replay leaves the record alone');
  assert.equal(await exp() - e0, 20, 'no extra EXP from replays');

  // 2. OS SRTF：還沒到達、不是剩餘最短都是失誤；剩餘時間同分的兩個工作都合法；平均等待時間接受分數與容許誤差
  await open('os', 4);
  await act('pick', 'P4');
  assert((await msg()).includes('t = 5 才到達'), 'not arrived yet');
  await act('pick', 'P1');
  await act('pick', 'P1');
  assert((await msg()).includes('剩餘時間最短'), 'SRTF compares remaining time');
  for (const id of ['P2', 'P3', 'P2']) await act('pick', id);
  await act('pick', 'P4'); // t = 7：P1 與 P4 都剩 5，模擬器選 P1，選 P4 也合法
  assert((await msg()).includes('選哪一個都合法'), 'a tie accepts either job');
  await act('pick', 'P1');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('#challengeSlot .gantt .cell')].map(c => c.textContent).join('')), 'P1P1P2P2P3P2P2P4P4P4P4P4P1P1P1P1P1', 'the player\'s own Gantt');
  const answer = async v => { await page.fill(`${card} [data-ch-set="answer"]`, v); await page.press(`${card} [data-ch-set="answer"]`, 'Enter'); };
  await answer('abc');
  assert.equal((await rec()).mistakes, 2, 'not a number: no mistake');
  await answer('3.27');
  assert.equal((await rec()).mistakes, 3, 'outside the tolerance');
  await answer('13/4');
  r = await rec();
  assert(r.solved, 'fraction accepted');
  const os = await page.locator(`${card} .ch-explain`).innerText();
  assert(os.includes('t = 7（P1、P4 同分，你選了 P4）') && os.includes('3.25'), 'explanation compares with CSLab.sim.scheduleSim');
  for (const [v, ok] of [['3.25', true], ['3.26', true], ['3,25', false], ['3.2', false]]) assert.equal(await page.evaluate(([v]) => CSLab.challenge.num.close(CSLab.challenge.num.parse(v), 3.25, 0.01), [v]), ok, `tolerance: ${v}`);

  // 3. DM 找反例：兩組反例都接受、重複提交同一組不重複扣、有反例時宣告成立是失誤、重言式要宣告成立
  await open('dm', 0);
  await act('submit');
  assert.equal((await rec()).mistakes, 1, 'not a counterexample');
  await act('submit');
  assert.equal((await rec()).mistakes, 1, 'the same row again is not charged twice');
  await act('none');
  assert.equal((await rec()).mistakes, 2, 'claiming no counterexample when there is one');
  await act('flip', 'P'); await act('flip', 'R');
  await act('submit');
  assert.equal(await page.evaluate(() => document.querySelector('#challengeSlot .challenge').dataset.round), '1', 'P=F, Q=T, R=F is a counterexample');
  await act('flip', 'Q'); await act('submit');
  assert.equal((await rec()).mistakes, 3, 'round 2 has no counterexample');
  await act('none');
  assert((await rec()).solved, 'tautology declared');
  assert.equal(await page.locator(`${card} .ch-truth`).first().locator('tr.sel').count(), 2, 'two counterexample rows in the truth table');
  await page.click(`${card} [data-ch-tool="retry"]`);
  await act('flip', 'P'); await act('flip', 'Q'); await act('flip', 'R'); await act('submit');
  assert.equal(await page.evaluate(() => document.querySelector('#challengeSlot .challenge').dataset.round), '1', 'P=F, Q=F, R=F is the other counterexample');

  // 4. AI 學習率：任何符合條件的 η 都接受；邊界 0.20／0.21、0.5、0.51（浮點誤差）、0.79／0.80；發散有說明
  await open('ai', 2);
  const run = async v => { await page.fill(`${card} input.num[data-ch-set="lr"]`, String(v)); await page.press(`${card} input.num[data-ch-set="lr"]`, 'Enter'); };
  await run(0.2);
  assert((await msg()).includes('步伐太小'), '0.20 is just too slow');
  await run(0.6);
  assert((await msg()).includes('跨過了最低點'), 'round 1 forbids crossing');
  await run(0.5);
  assert.equal(await page.evaluate(() => document.querySelector('#challengeSlot .challenge').dataset.round), '1', '0.5 lands on w = 3 from one side');
  await run(0.5);
  assert((await msg()).includes('剛好落在 w = 3'), 'round 2 needs real oscillation');
  await run(1.2);
  assert((await msg()).includes('發散'), 'divergence explained');
  await run(0.8);
  assert((await msg()).includes('還不夠小'), '0.80 oscillates too slowly');
  await page.click(`${card} [data-ch-act="nudge"][data-arg="-0.01"]`);
  assert.equal(await page.inputValue(`${card} input.num[data-ch-set="lr"]`), '0.79', 'nudge buttons');
  await page.click(`${card} [data-ch-act="run"]`);
  assert((await rec()).solved, '0.79 passes');
  assert((await page.locator(`${card} .ch-explain`).innerText()).includes('0.206 ≤ η ≤ 0.5'), 'derived range in the explanation');
  await page.click(`${card} [data-ch-tool="retry"]`);
  await run(0.21); await run(0.51);
  assert.equal(await page.evaluate(() => document.querySelector('#challengeSlot .challenge').dataset.over), 'win', '0.21 and 0.51 pass too (0.51 needs the float tolerance)');

  // 5. 看解答：失誤兩次後才開放；看了之後這題不計經驗值，再挑戰過關也一樣
  await page.evaluate(() => { delete CSApp.store.challenge['ai.gradient-descent.learning-rate']; localStorage.setItem('ailab.progress', JSON.stringify(CSApp.store)); });
  await open('ai', 2);
  const a0 = await exp();
  await run(0.1); await run(0.1);
  await page.click(`${card} [data-ch-tool="reveal"]`);
  assert((await rec()).revealed && await explained() === 1, 'revealed after two mistakes');
  await page.click(`${card} [data-ch-tool="retry"]`); await run(0.3); await run(0.6);
  assert(!(await rec()).solved && await exp() === a0, 'no EXP once the answer was opened');

  // 6. 外觀：學術是「互動自我檢測」；楓之谷是怪物挑戰（NPC、怪物、HP 條），過關時怪物倒下；兩種外觀題目與驗證相同
  //    沒有素材（只開 os-lab 的伺服器）時只有學術外觀，跳過楓之谷的部分
  await open('dm', 0);
  const art = await page.evaluate(() => document.documentElement.dataset.skin === 'maple');
  if (art) {
    assert(await page.locator(`${card} > .perch-foe .spr`).count() && await page.locator(`${card} > .bt-bar[data-tier="challenge"]`).count(), 'maple: a monster with an HP bar');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#challengeSlot .ch-head .label'), '::before').content.includes('怪物挑戰')), true, 'maple: called a monster challenge');
    assert.equal(await page.locator(`${card} .ch-label`).innerText(), '🧩 互動自我檢測', 'the accessible name stays the same');
    await page.locator('.skin-btn').click(); await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#challengeSlot .perch, #challengeSlot .bt-bar, #challengeSlot .npc-portrait')].map(e => getComputedStyle(e).display).filter(d => d !== 'none')), [], 'classic: no game layer on the card');
    assert(await page.locator(`${card} .ch-label`).isVisible(), 'classic: 互動自我檢測');
    await page.locator('.skin-btn').click(); await page.waitForTimeout(300);
    await open('dsa', 6);
    for (const [i, d] of [[5, 'right'], [8, 'left'], [6, 'right'], [7, 'found'], [5, 'left'], [2, 'right'], [3, 'right'], [4, 'left']]) { await act('probe', i); await act(d); }
    await act('absent');
    assert(await page.locator(`${card} > .bt-bar.is-win`).count(), 'maple: the monster is defeated');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#challengeSlot .perch, #challengeSlot .bt-bar')].filter(e => e.getAttribute('aria-hidden') !== 'true').length), 0, 'decorations are hidden from assistive tech');
  } else {
    assert.equal(await page.locator('#challengeSlot .perch, #challengeSlot .bt-bar').count(), 0, 'no art: no monster');
    assert(await page.locator(`${card} .ch-label`).isVisible(), 'no art: 互動自我檢測');
  }

  // 7. 手機 390px：作答中與完成後都沒有水平溢位（兩種外觀）
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } }), p2 = await phone.newPage();
  p2.on('pageerror', e => errors.push(e.message));
  for (const skin of ['maple', 'classic']) {
    await p2.goto(ROOT); await p2.evaluate(s => localStorage.setItem('cslab.skin', s), skin);
    for (const [course, ch] of [['dsa', 6], ['os', 4], ['dm', 0], ['ai', 2]]) {
      await p2.goto(`${ROOT}${course}/#/ch/${ch}/learn`); await p2.waitForSelector(`${card} .ch-body`); await p2.waitForTimeout(400);
      if (course === 'os') for (const id of ['P1', 'P2', 'P3', 'P2', 'P1', 'P4']) await p2.click(`${card} [data-ch-act="pick"][data-arg="${id}"]`);
      if (course === 'ai') { await p2.fill(`${card} input.num[data-ch-set="lr"]`, '0.3'); await p2.press(`${card} input.num[data-ch-set="lr"]`, 'Enter'); }
      assert.equal(await p2.evaluate(() => document.documentElement.scrollWidth), 390, `${skin} ${course}: no horizontal overflow at 390px`);
    }
  }
  await phone.close();

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: four prototypes (DSA binary-search step, OS SRTF pick, DM counterexample, AI learning-rate target) — stable ids and data fields, mid floor/ceil and SRTF ties accepted, wrong steps rejected without the answer, fraction and tolerance, counterexample rows, float boundary 0.51, answer locked until two mistakes, records survive reloads, EXP once (20) and none after reveal, keyboard, classic self-check vs maple monster challenge (classic only without the art), 390px; no browser errors');
})().catch(e => { console.error(e); process.exit(1); });
