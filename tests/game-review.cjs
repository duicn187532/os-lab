// 遊戲層檢查（shared/cslab-game.js）：經驗值由課程進度推算、各課加總成同一位角色、測驗討伐的畫面跟著原本的測驗走、
// 狀態列與角色只在楓之谷外觀出現、不可聚焦、減少動態效果時不走動、沒有素材時完全不出現。
// 和 skin-review.cjs 一樣，要在兩個儲存庫的上一層目錄啟動伺服器：
//   cd ..   # 同時放著 os-lab/ 與 self-research/ 的目錄
//   python -m http.server 8000
//   node os-lab/tests/game-review.cjs
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
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text() + ' ' + m.location().url); });
  const settle = () => page.waitForTimeout(400);
  const ready = () => page.waitForFunction(() => document.documentElement.dataset.skin === 'maple' && document.querySelector('.hud-lv img'));
  const seed = (key, fn) => page.evaluate(([key, fn]) => { const s = CSApp.store; new Function('s', 'L', fn)(s, CSApp.lessons); localStorage.setItem(key, JSON.stringify(s)); }, [key, fn]);

  // 1. 經驗值從進度推算：OS 前三章讀完、第一章做過實驗、第二章寫了筆記、三章測驗都完成且沒有錯題
  //    3×30 + 30 + 20 + 3×100 + 精英（第二章是「基礎」單元的最後一章）100 + 12 題 ×10 = 660
  await page.goto(ROOT); await page.evaluate(() => localStorage.clear());
  await page.goto(ROOT + 'os/#/'); await ready();
  assert.deepEqual(await page.evaluate(() => [CSLabGame.level.lv, CSLabGame.level.exp]), [1, 0], 'a new reader starts at LV.1');
  await seed('os_lab_2026_v1', "L.slice(0, 3).forEach(l => { s.learn[l.id] = 1; s.done[l.id] = { first: 4, total: 4, at: '' }; }); s.lab[L[0].id] = 1; s.notes[L[1].id] = '我的解釋';");
  await page.reload(); await ready();
  assert.equal(await page.evaluate(() => CSLabGame.courseExp()), 660, 'EXP is derived from the stored progress');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('cslab.exp'))), { os: { exp: 660, title: '' } }, 'the course caches its sum');
  assert.equal(await page.evaluate(() => CSLabGame.tier[CSApp.lessons[1].id] + ' ' + CSLabGame.tier[CSApp.lessons.at(-1).id]), 'elite boss', 'chapter tiers');

  // 2. 第二門課加進同一位角色：DSA 第一章完成（單章單元，不是精英）= 100 + 3×10 = 130，合計 790 → LV.4
  await page.goto(ROOT + 'dsa/#/'); await ready();
  await seed('dsa.progress', "s.done[L[0].id] = { first: 3, total: 3, at: '' };");
  await page.reload(); await ready();
  assert.deepEqual(await page.evaluate(() => [CSLabGame.courseExp(), CSLabGame.level.exp, CSLabGame.level.lv]), [130, 790, 4], 'courses add up to one reader');
  await page.goto(ROOT); await ready();
  assert.deepEqual(await page.evaluate(() => [CSLabGame.level.exp, CSLabGame.level.lv]), [790, 4], 'the portal shows the total');
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.hud-lv img')].map(i => i.src.split('/').pop())), ['lv4.png'], 'level digits from the game art');
  assert.equal(await page.evaluate(() => localStorage.getItem('os_lab_2026_v1') !== null && Object.keys(localStorage).filter(k => !/^(cslab\.|os_lab_2026_v1|dsa\.progress)/.test(k)).length), 0, 'no other keys written');

  // 3. 測驗討伐：OS 第五章（未完成、普通怪）的怪物站在章節標頭，測驗裡答錯被反擊、答對扣 HP，答完完成章節並得到經驗值
  await page.goto(ROOT + 'os/#/'); await ready();
  const lid = await page.evaluate(() => CSApp.lessons[4].id);
  await page.evaluate(id => CSApp.navigate(id, 'learn'), lid); await settle();
  assert(await page.locator('.lesson-head > .perch-walk .spr').count(), 'the chapter monster patrols the header of an open chapter');
  assert.equal(await page.locator('#content > .pager > .perch-party .spr').count(), 3, 'protagonist, companion and pet wait at the chapter pager');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('#content > .pager > .perch-party .spr')].slice(0, 2).map(e => /^hero-(orca|lucid)/.test(e.style.backgroundImage.split('spr-')[1])).join()), 'true,true', 'the party is 殺人鯨 and 露希妲');
  assert(await page.locator('#stage .card.goals > .npc-portrait .npc-quest').count() && await page.locator('#stage .card.analogy > .npc-portrait').count(), 'quest-giver and guide NPCs');
  await page.evaluate(id => CSApp.navigate(id, 'quiz'), lid); await settle();
  assert(await page.locator('#stage .card.quiz > .bt-bar').count(), 'battle bar on the quiz');
  assert(await page.locator('#stage .card.quiz > .perch-party .spr').count() && await page.locator('#stage .card.quiz > .perch-foe .spr').count(), 'the party faces the monster on the quiz window');
  assert(await page.locator('#stage .card.quiz > .npc-portrait').count(), 'the NPC still asks the questions');
  const answer = right => page.evaluate(r => { const t = document.getElementById('stage'), { q } = t._quiz, [l, qi] = q.items[q.i], it = CSApp.byId[l].quiz[qi]; const n = r ? it[2] : [0, 1, 2, 3].find(i => i !== it[2] && !q.picked.includes(i)); t.querySelector(`[data-answer="${n}"]`).click(); }, right);
  const bar = () => page.evaluate(() => { const b = document.querySelector('#stage .bt-bar'); return { hp: b.querySelector('.bt-hp i').style.width, hearts: b.querySelector('.bt-hearts').textContent, say: b.querySelector('.bt-say').textContent }; });
  assert.deepEqual((await bar()).hearts, '♥♥', 'two hearts: the two tries');
  await answer(false);
  let b1 = await bar();
  assert(b1.hearts === '♥♡' && b1.say.includes('反擊') && b1.hp === '100%', 'a miss costs a heart, not HP');
  assert.equal(await page.evaluate(() => CSApp.state.quiz.tries), 1, 'the quiz still gives the second try');
  await answer(false);
  b1 = await bar();
  assert(b1.hearts === '♡♡' && b1.say.includes('MISS') && b1.hp === '100%', 'two misses: the question is lost');
  const total = await page.evaluate(() => CSApp.state.quiz.items.length);
  const before = await page.evaluate(() => CSLabGame.level.exp);
  for (let i = 1; i < total; i++) {
    await page.click('#nextQuiz'); await answer(true);
    assert.equal((await bar()).hp, `${100 * (total - i) / total}%`, 'each right answer takes one HP');
  }
  await page.click('#nextQuiz'); await page.waitForTimeout(100);
  assert((await page.locator('#stage .bt-bar.is-over').innerText()).includes('逃走'), 'not every question right: the monster runs away');
  assert(await page.evaluate(id => !!CSApp.store.done[id] && CSApp.store.done[id].first === CSApp.store.done[id].total - 1, lid), 'the quiz still records the chapter as done');
  const gain = await page.evaluate(() => CSLabGame.level.exp) - before;
  assert.equal(gain, 100 + 10 * (total - 1), 'EXP for the chapter: the quiz and every question not in the wrong-answer log');
  assert.equal(await page.locator('#stage .card.quiz-done .exp-pop').innerText(), `EXP +${gain}`, 'the gain shows on the hero');
  assert(await page.locator('#content > .pager.is-clear').count(), 'a portal opens by the next chapter once this one is done');
  await page.evaluate(id => CSApp.navigate(id, 'learn'), lid); await settle();
  assert.equal(await page.locator('.lesson-head > .perch').count(), 0, 'a done chapter has no monster left');

  // 4. 錯題複習答對，錯題本少一題，經驗值 +10
  await page.evaluate(() => CSApp.go({ page: 'review' })); await settle();
  await page.locator('[data-review="start"]').click();
  {
    const e0 = await page.evaluate(() => CSLabGame.level.exp);
    await page.evaluate(() => { const t = document.getElementById('reviewStage'), { q } = t._quiz, [l, qi] = q.items[q.i]; t.querySelector(`[data-answer="${CSApp.byId[l].quiz[qi][2]}"]`).click(); });
    assert.equal(await page.evaluate(() => CSLabGame.level.exp) - e0, 10, 'clearing a wrong answer in review earns EXP');
    assert.equal(await page.locator('#reviewStage .bt-bar[data-tier="review"]').count(), 1, 'review battle');
  }

  // 5. 裝飾：不可聚焦、對輔助技術隱藏；學術外觀時全部隱藏
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.hud, .perch, .bt-bar')].filter(e => e.getAttribute('aria-hidden') !== 'true' || e.querySelector('a, button, input, [tabindex]')).length), 0, 'game layer is decorative');
  await page.locator('.skin-btn').click(); await settle();
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.hud, .perch, .bt-bar')].map(e => getComputedStyle(e).display).filter(d => d !== 'none')), [], 'classic hides the game');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).paddingBottom), '0px', 'classic keeps its own spacing');
  await page.locator('.skin-btn').click(); await settle();
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.hud')).display), 'block', 'back in maple');

  // 6. 減少動態效果：角色不巡邏、不播特效
  const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const still = await rm.newPage();
  await still.goto(ROOT + 'ai/#/ch/' + 2 + '/learn'); await still.waitForTimeout(700);
  assert(await still.locator('.lesson-head > .perch .spr').count(), 'reduced motion: characters still shown');
  assert.equal(await still.locator('.walker').count(), 0, 'reduced motion: no patrol');
  await rm.close();

  // 7. 沒有素材：狀態列與角色都不出現，課程照常
  const bare = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await bare.route('**/self-research/**', r => r.abort());
  const p2 = await bare.newPage();
  await p2.goto(ROOT + 'dm/#/ch/1/quiz'); await p2.waitForTimeout(600);
  assert.equal(await p2.locator('.hud, .perch, .bt-bar').count(), 0, 'no art: no game layer');
  assert(await p2.locator('#stage .choice').count(), 'no art: quiz works');
  await bare.close();

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: EXP derived from course progress (660 / 130 / 790 → LV.4), one reader across courses and the portal, party (殺人鯨, 露希妲, pet) at the pager and on the quiz, quest NPCs, battle follows the quiz (hearts = tries, HP = right answers, monster runs away, chapter done, EXP pop, portal, monster gone), review EXP, decorative and hidden in classic, reduced motion, no art; no browser errors');
})().catch(e => { console.error(e); process.exit(1); });
