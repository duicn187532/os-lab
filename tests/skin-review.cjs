// 外觀層檢查：楓之谷 / 學術外觀切換、素材路徑、狀態不受影響、素材缺少時退回、只載入需要的精靈圖、動態效果與版面。
// 楓之谷素材引用 self-research 已發布的 assets/maple/，所以要在兩個儲存庫的上一層目錄啟動伺服器：
//   cd ..   # 同時放著 os-lab/ 與 self-research/ 的目錄
//   python -m http.server 8000
//   node os-lab/tests/skin-review.cjs
// 環境變數：CHROMIUM_PATH 指定瀏覽器、TEST_ROOT 指定 os-lab 的網址（預設 http://localhost:8000/os-lab/）。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ROOT = process.env.TEST_ROOT || 'http://localhost:8000/os-lab/';
const COURSES = { os: 'os_lab_2026_v1', dsa: 'dsa.progress', dm: 'dm_lab_progress_v1', ai: 'ailab.progress' };
const PREFIX = '../../self-research/assets/maple/';

// 1. 素材路徑只有一個：CSS 的每個 url() 與 JS 的 MAPLE_BASE 都指向 self-research 的 assets/maple/，且檔案存在
const css = fs.readFileSync(path.join(root, 'shared/skin-maple.css'), 'utf8');
const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map(m => m[1]);
assert(urls.length > 40, 'skin uses the game art');
assert.deepEqual(urls.filter(u => !u.startsWith(PREFIX)), [], 'every image comes from the published self-research art');
assert(fs.readFileSync(path.join(root, 'shared/cslab-skin.js'), 'utf8').includes(`new URL('${PREFIX}'`), 'JS uses the same base');
const art = path.join(root, '..', 'self-research/assets/maple');
if (fs.existsSync(art)) assert.deepEqual([...new Set(urls)].filter(u => !fs.existsSync(path.join(art, u.slice(PREFIX.length)))), [], 'every referenced image exists');
assert(!fs.existsSync(path.join(root, 'shared/maple')) && !fs.readdirSync(root, { recursive: true }).some(f => /\.(png|jpe?g)$/i.test(f) && !f.startsWith('.git')), 'no game art copied into os-lab');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text() + ' ' + m.location().url); });
  page.on('request', r => requests.push(r.url()));
  const skinOf = () => page.evaluate(() => document.documentElement.dataset.skin || 'classic');
  const settle = () => page.waitForTimeout(400);

  for (const [course, key] of Object.entries(COURSES)) {
    const URL = ROOT + course + '/';
    await page.goto(ROOT); await page.evaluate(() => localStorage.clear());

    // 2. 預設是楓之谷外觀；切換按鈕可用鍵盤操作，狀態以 aria-pressed 表示
    await page.goto(URL + '#/'); await settle();
    assert.equal(await skinOf(), 'maple', `${course}: maple by default`);
    const btn = page.locator('.skin-btn');
    assert(await btn.isVisible() && (await btn.getAttribute('aria-pressed')) === 'true', `${course}: toggle shown and pressed`);
    assert(await page.locator('.hero > .npc-portrait[aria-hidden=true] .spr').count(), `${course}: home NPC guide`);

    // 3. 做一些進度：讀觀念、做實驗走到一半、測驗答錯一題（進錯題本）
    await page.evaluate(() => CSApp.navigate(CSApp.lessons[1].id, 'learn')); await settle();
    assert(await page.locator('#stage .card.analogy > .npc-portrait .spr').count(), `${course}: ELI5 NPC`);
    const analogy = await page.evaluate(() => CSApp.byId[CSApp.lessons[1].id].analogy);
    assert((await page.locator('#stage .card.analogy').innerText()).includes(analogy), `${course}: ELI5 text kept`);
    await page.evaluate(() => CSApp.navigate(CSApp.lessons[1].id, 'lab')); await settle();
    await page.evaluate(() => { const d = CSLab.registry[CSApp.byId[CSApp.state.lesson].lab]; CSApp.labAct(d.auto ? d.auto.action : 'next'); CSApp.labAct(d.auto ? d.auto.action : 'next'); });
    const labBefore = await page.evaluate(() => JSON.stringify(CSApp.state.lab));
    await page.evaluate(() => CSApp.navigate(CSApp.lessons[1].id, 'quiz')); await settle();
    const q = await page.evaluate(() => CSApp.byId[CSApp.state.lesson].quiz[0]);
    const wrong = [...q[1].keys()].find(i => i !== q[2]);
    await page.locator(`#stage [data-answer="${wrong}"]`).click();
    assert((await page.locator('#stage').innerText()).includes(q[3]), `${course}: hint after first miss in maple`);
    assert(await page.locator('#stage .card.quiz > .npc-portrait').count(), `${course}: quiz NPC`);
    const storeBefore = await page.evaluate(k => localStorage.getItem(k), key);

    // 4. 切到學術外觀：測驗、實驗、進度都不變，只改外觀
    await btn.focus(); await page.keyboard.press('Enter'); await settle();
    assert.equal(await skinOf(), 'classic', `${course}: switched with the keyboard`);
    assert.equal(await page.evaluate(() => localStorage.getItem('cslab.skin')), 'classic');
    assert.equal(await btn.getAttribute('aria-pressed'), 'false');
    assert((await page.locator('#stage').innerText()).includes(q[3]), `${course}: quiz in progress survives the switch`);
    assert.equal(await page.evaluate(() => CSApp.state.quiz.tries), 1, `${course}: quiz attempt count kept`);
    assert.equal(await page.locator('#stage .npc-portrait').evaluate(e => getComputedStyle(e).display), 'none', `${course}: NPC hidden in classic`);
    await page.keyboard.press('Escape');
    const right = await page.evaluate(q => [...document.querySelectorAll('#stage [data-answer]')].find(b => +b.dataset.answer === q[2]).dataset.key, q);
    await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press(right.toLowerCase()); // 第二次機會用鍵盤作答
    assert(await page.evaluate(k => !!CSApp.store.wrong[`${CSApp.state.lesson}:0`], key), `${course}: second-try answer stays in the wrong-answer log`);
    await page.evaluate(() => CSApp.navigate(CSApp.lessons[1].id, 'lab')); await settle();
    assert.equal(await page.evaluate(() => JSON.stringify(CSApp.state.lab)), labBefore, `${course}: lab state kept across the switch`);

    // 5. 重新整理後維持學術外觀，而且開頁就沒有 data-skin（不閃）；課程資料一個鍵都沒有因外觀而變
    await page.reload();
    assert.equal(await skinOf(), 'classic', `${course}: classic persists`);
    const storeAfter = await page.evaluate(k => localStorage.getItem(k), key);
    const strip = s => { const o = JSON.parse(s); delete o.last; delete o.wrong; delete o.lab; return o; };
    assert.deepEqual(strip(storeAfter), strip(storeBefore), `${course}: course store untouched by the skin`);
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('cslab.')).sort()), ['cslab.art', 'cslab.skin'], `${course}: skin keeps to its own keys`);

    // 6. 回到楓之谷：重新整理時開頁就是楓之谷（head 片段），NPC 立刻放回
    await page.locator('.skin-btn').click(); await settle();
    assert.equal(await skinOf(), 'maple');
    await page.evaluate(() => CSApp.navigate(CSApp.lessons[0].id, 'learn')); await settle();
    assert(await page.locator('#stage .card.analogy > .npc-portrait .spr').count(), `${course}: NPC back after switching on`);
    const early = await page.evaluate(async u => { const r = await fetch(u); return (await r.text()).includes("localStorage.getItem('cslab.art')==='1'"); }, URL);
    assert(early, `${course}: head snippet applies the skin before first paint`);

    // 7. 只下載用得到的素材：NPC 與任務圖示，不下載怪物、主角、寵物與特效
    const spr = requests.filter(u => u.includes('/spr-'));
    assert(spr.length > 0 && spr.every(u => /spr-(npc|quest)-/.test(u)), `${course}: only NPC and quest strips fetched: ${spr.filter(u => !/spr-(npc|quest)-/.test(u))}`);
  }

  // 8. 動態：離開畫面的 NPC 暫停（.is-off）、減少動態效果時停在第一格
  await page.goto(ROOT + 'os/#/'); await settle();
  await page.evaluate(() => window.scrollTo(0, 99999)); await page.waitForTimeout(300);
  const offscreen = await page.evaluate(() => { const p = document.querySelector('.hero > .npc-portrait'); return p.getBoundingClientRect().bottom < 0 ? p.classList.contains('is-off') : 'visible'; });
  assert(offscreen === true || offscreen === 'visible', 'NPCs out of view pause');
  const rm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const still = await rm.newPage();
  await still.goto(ROOT + 'dsa/#/ch/1/quiz'); await still.waitForTimeout(500);
  const frames = [];
  for (let i = 0; i < 6; i++) { frames.push(await still.evaluate(() => [...document.querySelectorAll('.spr')].map(s => s.style.backgroundPosition).join())); await still.waitForTimeout(150); }
  assert.equal(new Set(frames).size, 1, 'reduced motion: sprites stand still');
  await rm.close();

  // 9. 素材缺少（例如只部署 os-lab）：自動退回學術外觀、隱藏切換按鈕，課程照常運作
  const bare = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await bare.route('**/self-research/**', r => r.abort());
  const p2 = await bare.newPage();
  await p2.goto(ROOT + 'dsa/#/ch/1/learn'); await p2.waitForTimeout(500);
  assert.equal(await p2.evaluate(() => document.documentElement.dataset.skin || 'classic'), 'classic', 'no art: classic');
  assert(await p2.locator('.skin-btn').isHidden(), 'no art: toggle hidden');
  assert.equal(await p2.evaluate(() => localStorage.getItem('cslab.art')), null, 'no art: not remembered');
  await bare.close();

  // 10. 版面：390px 與 1280px、兩種外觀，首頁、每一章三個頁籤（實驗到最後一步）、工具頁與入口網都沒有水平溢位
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const skin of ['maple', 'classic']) {
      await page.goto(ROOT); await page.evaluate(s => localStorage.setItem('cslab.skin', s), skin); await page.reload(); await settle();
      assert.equal(await skinOf(), skin);
      const bad = [];
      const check = async label => { if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) bad.push(label); };
      await check('portal');
      for (const course of Object.keys(COURSES)) {
        await page.goto(ROOT + course + '/#/'); await settle(); await check(`${course} home`);
        for (const p of ['labs', 'review', 'glossary', 'formulas', 'notes']) { await page.evaluate(p => CSApp.go({ page: p }), p); await check(`${course} ${p}`); }
        const ids = await page.evaluate(() => CSApp.lessons.map(l => l.id));
        for (const id of ids) for (const tab of ['learn', 'lab', 'quiz']) {
          await page.evaluate(([id, tab]) => CSApp.navigate(id, tab), [id, tab]);
          if (tab === 'lab') await page.locator('#labBody [data-act=end]').first().click({ timeout: 300 }).catch(() => {});
          await check(`${course} ch${id} ${tab}`);
          // 桌面的 NPC 對話框：肖像欄（名牌）不能壓到底部的按鈕藍帶
          if (skin === 'maple' && w > 640 && tab !== 'lab' && await page.evaluate(() => [...document.querySelectorAll('.npc-portrait')].some(p => { const box = p.parentElement.getBoundingClientRect(), name = p.querySelector('.npc-name').getBoundingClientRect(); return name.bottom > box.bottom - parseFloat(getComputedStyle(p.parentElement).borderBottomWidth) + 1; }))) bad.push(`${course} ch${id} ${tab}: NPC over the button band`);
        }
      }
      assert.deepEqual(bad, [], `${w}px ${skin}: horizontal overflow`);
    }
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(`PASS: skin art paths (${new Set(urls).size} images, none copied), maple default, keyboard toggle, quiz / lab / progress unchanged by switching, persistence without flash, only NPC strips fetched, offscreen pause, reduced motion, fallback without art, no overflow at 390 / 1280 in both skins (portal, OS, DSA, DM, AI); no browser errors`);
})().catch(e => { console.error(e); process.exit(1); });
