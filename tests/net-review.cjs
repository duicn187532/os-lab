// NET LAB 端對端檢查：教材資料完整、21 個逐步實驗（每個選項與兩兩組合都能產生步驟）、模擬器對照課文、測驗全對、
// 錯題本、搜尋、工具頁、兩種外觀與手機版面。程式實作題另由 tests/code-review.cjs net 檢查。
// 用法：node tests/poc-server.cjs <含 os-lab 的目錄> 8000 後執行 node tests/net-review.cjs
// 環境變數：CHROMIUM_PATH 指定瀏覽器、TEST_URL 指定網址（預設 http://localhost:8000/os-lab/net/）。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const URL = process.env.TEST_URL || 'http://localhost:8000/os-lab/net/';

// 1. 教材資料：每章欄位齊全、術語都在術語表、每題選項與正解合法、程式範例是 Python
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'net/assets/content.js'), 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(path.join(root, 'net/assets/advanced-content.js'), 'utf8'), ctx);
const D = JSON.parse(JSON.stringify(ctx.window.NET_DATA));
const terms = new Set(D.glossary.map(g => g.id));
assert.equal(new Set(D.lessons.map(l => l.id)).size, D.lessons.length, 'unique lesson ids');
for (const l of D.lessons) {
  for (const k of ['unit', 'title', 'short', 'minutes', 'goals', 'ask', 'analogy', 'why', 'details', 'steps', 'worked', 'caveat', 'code', 'summary', 'terms', 'lab', 'quiz']) assert(l[k] !== undefined && l[k] !== '', `chapter ${l.id} has ${k}`);
  assert(D.units.includes(l.unit), `chapter ${l.id} unit`);
  assert.equal(l.code[0], 'Python', `chapter ${l.id} code is Python`);
  assert(l.terms.every(t => terms.has(t)), `chapter ${l.id} terms in glossary`);
  assert(l.quiz.length >= 4 && l.quiz.every(q => q.length === 5 && q[2] >= 0 && q[2] < q[1].length && q[3] && q[4]), `chapter ${l.id} quiz`);
}
assert(D.glossary.every(g => D.lessons.some(l => l.id === g.ch)), 'glossary chapters exist');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.location().url.includes('/self-research/assets/maple/')) errors.push(m.text()); });
  await page.goto(URL); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cslab.skin', 'classic'); }); await page.goto(URL + '#/');
  assert.equal(await page.evaluate(() => CSApp.course.codeLang), 'python', 'Python is the default coding language');
  assert.equal(await page.evaluate(() => CSLab.code.list().length), D.lessons.length, 'one coding problem per chapter');

  // 2. 每個實驗的每一個選項都能產生步驟（在瀏覽器裡跑，與畫面相同的程式）
  const labCheck = await page.evaluate(() => {
    const bad = []; let frames = 0;
    for (const [type, spec] of Object.entries(CSLab.sim.net.LABS)) {
      const def = Object.fromEntries(spec.inputs.map(i => [i[0], i[3]]));
      const vs = [def];
      spec.inputs.forEach(i => { if (i[2] === 'select') i[4].forEach(([v]) => vs.push({ ...def, [i[0]]: v })); if (i[2] === 'number') vs.push({ ...def, [i[0]]: i[4][0] }, { ...def, [i[0]]: i[4][1] }); });
      const sels = spec.inputs.filter(i => i[2] === 'select');
      sels.forEach((s1, k) => sels.slice(k + 1).forEach(s2 => s1[4].forEach(([x]) => s2[4].forEach(([y]) => vs.push({ ...def, [s1[0]]: x, [s2[0]]: y })))));
      for (const v of vs) { try { const f = spec.frames(v); frames += f.length; if (!f.length || f.some(x => !x.label || /NaN|undefined|Infinity/.test(x.label + x.desc + (x.visual || '')))) bad.push(type + JSON.stringify(v)); } catch (e) { bad.push(type + ': ' + e.message); } }
    }
    return { bad, frames, n: Object.keys(CSLab.sim.net.LABS).length };
  });
  assert.deepEqual(labCheck.bad, [], 'every lab variant renders');
  const S = await page.evaluate(() => { const s = CSLab.sim.net, ids = Object.keys(s.TOPO.nodes); return {
    win: [s.windowRun('gbn', 6, 4, new Set(['2@1'])).sent, s.windowRun('sr', 6, 4, new Set(['2@1'])).sent],
    reno: s.cwndRun([...'ooooooodooo'], 8, false).map(r => r.cwnd), tahoe: s.cwndRun([...'ooooooodooo'], 8, true).map(r => r.cwnd),
    vlsm: s.vlsm('200.23.16.0/23', [60, 120, 10]).res.map(r => s.ipStr(r.net) + '/' + r.k),
    lpm: ['200.23.22.161', '200.23.24.170', '200.23.40.1'].map(x => s.lpm(s.LPM_TABLE, s.parseIp(x)).port),
    hop: s.dijkstraRun(s.TOPO.edges, ids, 'u').hop, dist: s.dijkstraRun(s.TOPO.edges, ids, 'u').D,
    dv: ['init', 'good', 'bad', 'poison'].map(k => s.dvScenario(k).hist.length),
    frag: s.fragment(3980, 1500).map(f => [f.len, f.off, f.mf]), crc: s.crcSteps('101110', '1001').rem,
    dh: [s.modpow(5, 6, 23), s.modpow(5, 15, 23), s.modpow(19, 6, 23)], sum: s.onesSum([0xBF00, 0x6D88]).sum,
    http: ['np', 'npp', 'p', 'pp'].map(m => s.httpPlan(m, 10).reduce((a, x) => a + x.rtts, 0)),
    tcp: s.tcpTrace(1000, 5000, 200, 500, 'client').map(x => x[1]).slice(0, 5), arq: s.arqRun(['ok', 'acklost', 'ok', 'ok']).sent,
    sw: s.switchRun([['A', 'D'], ['D', 'A'], ['B', 'A'], ['C', '*']]).map(x => x.act), store: s.switchSchedule(3, 3, false).T
  }; });
  assert.deepEqual(S, {
    win: [10, 7], reno: [1, 2, 4, 8, 9, 10, 11, 12, 6, 7, 8], tahoe: [1, 2, 4, 8, 9, 10, 11, 12, 1, 2, 4],
    vlsm: ['200.23.16.128/26', '200.23.16.0/25', '200.23.16.192/28'], lpm: ['介面 0', '介面 1', '介面 3'],
    hop: { u: null, v: 'v', w: 'x', x: 'x', y: 'x', z: 'x' }, dist: { u: 0, v: 2, w: 3, x: 1, y: 2, z: 4 }, dv: [1, 2, 47, 3],
    frag: [[1480, 0, 1], [1480, 185, 1], [1020, 370, 0]], crc: '011', dh: [8, 19, 2], sum: 0x2C89, http: [22, 6, 12, 3],
    tcp: ['SYN seq=1000', 'SYN+ACK seq=5000 ack=1001', 'ACK seq=1001 ack=5001', 'seq=1001 len=200 ack=5001', 'ACK ack=1201'], arq: 4,
    sw: ['flood', 'forward', 'filter', 'flood'], store: 5
  }, 'simulators compute the textbook answers');

  // 3. 每一章：觀念頁、實驗（看結果、調整選項、下一步）、測驗全對
  const ids = D.lessons.map(l => l.id);
  for (const id of ids) {
    await page.evaluate(id => CSApp.navigate(id, 'learn'), id);
    assert((await page.locator('#stage').innerText()).includes(D.lessons.find(l => l.id === id).ask), `learn ${id}`);
    await page.evaluate(id => CSApp.navigate(id, 'lab'), id);
    const before = await page.locator('#labBody').innerText();
    assert(before.length > 20, `lab ${id} renders`);
    const end = page.locator('#labBody [data-act=end]');
    if (await end.count() && await end.isEnabled()) { await end.click(); assert.notEqual(await page.locator('#labBody').innerText(), before, `lab ${id} advances`); }
    for (const sel of await page.locator('#labBody select[data-set]').all()) { const opts = await sel.locator('option').all(); await sel.selectOption({ index: opts.length - 1 }); }
    if (await page.locator('#labBody [data-act=next]').count() && await page.locator('#labBody [data-act=next]').isEnabled()) await page.locator('#labBody [data-act=next]').click();
    await page.evaluate(id => CSApp.navigate(id, 'quiz'), id);
    const n = await page.evaluate(id => CSApp.byId[id].quiz.length, id);
    for (let j = 0; j < n; j++) {
      const ans = await page.evaluate(([id, j]) => CSApp.byId[id].quiz[j][2], [id, j]);
      await page.locator(`#stage [data-answer="${ans}"]`).click(); await page.locator('#nextQuiz').click();
    }
    assert((await page.locator('#stage').innerText()).includes(`完成 ${n} 題`), `quiz ${id}`);
  }
  assert(await page.evaluate(() => Object.keys(CSApp.store.lab).length) >= ids.length - 1, 'every frame lab used (the review lab counts once answered)');

  // 4. 正解位置平均分散、重新整理後順序不變
  const answerSlots = () => page.evaluate(() => CSApp.lessons.map(l => l.quiz.map((q, qi) => [q[1].length, CSApp.choiceOrder(l.id, qi).indexOf(q[2])])));
  const slots = await answerSlots(), tally = (qs, n) => [...Array(n).keys()].map(p => qs.filter(([, x]) => x === p).length);
  const counts = tally(slots.flat(), 4);
  assert(Math.max(...counts) - Math.min(...counts) <= 1, `answer positions near-uniform: ${counts}`);
  await page.reload(); assert.deepEqual(await answerSlots(), slots, 'choice order stable across reloads');

  // 5. 錯題本、搜尋、工具頁
  await page.evaluate(() => CSApp.navigate(2, 'quiz'));
  await page.locator('[data-quiz=retry]').click().catch(() => {});
  const q = await page.evaluate(() => CSApp.byId[2].quiz[0]);
  const wrong = [0, 1, 2, 3].filter(i => i !== q[2] && i < q[1].length);
  await page.locator(`#stage [data-answer="${wrong[0]}"]`).click(); await page.locator(`#stage [data-answer="${wrong[1]}"]`).click();   // 第一次答錯給提示，第二次才記入錯題本
  assert(await page.evaluate(() => '2:0' in CSApp.store.wrong), 'wrong answer recorded');
  await page.goto(URL + '#/review'); assert((await page.locator('#content').innerText()).includes('開始複習'));
  await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('/'); await page.keyboard.type('三向交握'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  assert.notEqual(await page.evaluate(() => CSApp.state.page), 'home', 'search navigates');
  for (const p of ['labs', 'notes', 'formulas', 'glossary']) { await page.goto(URL + '#/' + p); assert((await page.locator('#content').innerText()).length > 40, p); }
  assert.equal(await page.locator('.term').count(), D.glossary.length, 'glossary lists every term');
  await page.goto(URL + '#/'); const home = await page.locator('#content').innerText();
  assert(home.includes(String(D.lessons.length)) && home.includes('程式實作'), 'home shows the dynamic lesson count and coding link');

  // 6. 手機版面（學術外觀與楓之谷外觀）
  await page.setViewportSize({ width: 375, height: 812 });
  for (const skin of ['classic', 'maple']) {
    await page.evaluate(s => { localStorage.setItem('cslab.skin', s); if (s === 'maple') localStorage.setItem('cslab.art', '1'); }, skin); await page.reload();
    for (const id of ids) for (const tab of ['learn', 'lab', 'quiz']) {
      await page.evaluate(([id, tab]) => CSApp.navigate(id, tab), [id, tab]);
      if (tab === 'lab' && await page.locator('#labBody [data-act=end]').count() && await page.locator('#labBody [data-act=end]').isEnabled()) await page.locator('#labBody [data-act=end]').click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `mobile overflow (${skin}): chapter ${id} ${tab}`);
    }
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(`PASS: NET ${ids.length} chapters, ${D.glossary.length} terms, ${labCheck.n} frame labs (${labCheck.frames} frames over every option), ${D.lessons.reduce((a, l) => a + l.quiz.length, 0)} quiz answers, simulators match the textbook, answer positions balanced, wrong-answer log, search, tool pages, mobile in both skins; no browser errors`);
})().catch(e => { console.error(e); process.exit(1); });
