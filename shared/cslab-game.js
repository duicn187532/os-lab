/* CS LAB 遊戲層：經驗值與等級、底部狀態列、章節怪物、測驗討伐、主角與升級特效。
 * 做法沿用 self-research（assets/site.js 的經驗值、狀態列與怪物，assets/battle.js 的討伐），只在楓之谷外觀啟用時出現。
 * - 不讀寫課程的進度鍵值，也不改測驗規則：兩次機會、錯題本與測驗紀錄照舊，這裡只把同一個測驗畫成打怪。
 * - 經驗值完全由各課既有的進度推算（讀完觀念、第一次做實驗、完成測驗、題目答對且不在錯題本、寫了筆記、完成頁尾的互動挑戰、
 *   通過程式實作題），
 *   不逐次累加：還原備份、清除進度，經驗值跟著變。
 * - 各課把自己的總和與稱號快取在 localStorage 的 cslab.exp（{ 課程 id: { exp, title } }），
 *   入口網與其他課加總成同一位角色。和 self-research 的角色分開，不讀寫 study:*。
 * - 狀態列、怪物與特效都是裝飾（aria-hidden）：同樣的進度在側欄、頁籤與測驗回饋裡都有文字。
 * 載入順序：shared/cslab-skin.js 之後。 */
'use strict';
(function () {
  const Skin = window.CSLabSkin;
  if (!Skin) return;
  const S = Skin.sprite, App = window.CSApp || null, C = App ? App.course : null;
  const KEY = 'cslab.exp';
  const lessons = App ? App.lessons : [];

  /* ───────────── 經驗值與等級 ─────────────
   * 一門課全部完成約 LV.10，四門約 LV.18；等級沒有上限，稱號在轉職的等級換。 */
  const EXP = { learn: 30, lab: 30, quiz: 100, elite: 100, boss: 200, right: 10, note: 20, course: 500, challenge: [60, 40, 20], code: 80 };
  // 互動挑戰：依存下來的紀錄算一次（失誤加提示 0 次 60、1–2 次 40、更多 20；先看了解答 0），再挑戰不會再加
  const challengeExp = r => !r || !r.solved || r.revealed ? 0 : EXP.challenge[r.mistakes + r.hints === 0 ? 0 : r.mistakes + r.hints <= 2 ? 1 : 2];
  const Challenges = window.CSLab && window.CSLab.challenge;
  const Code = window.CSLab && window.CSLab.code; // 程式實作題：第一次通過（全部測資）得 EXP.code
  const needFor = lv => Math.round((45 * Math.pow(lv, 1.5) + 55) / 10) * 10;
  function levelOf(exp) {
    let lv = 1, into = Math.max(0, exp);
    while (into >= needFor(lv)) { into -= needFor(lv); lv++; }
    return { lv, into, need: needFor(lv), exp };
  }
  const JOBS = [[1, '新手程式員'], [10, '見習工程師'], [20, '工程師'], [30, '資深工程師'], [50, '電腦科學大師']];
  const jobOf = lv => JOBS.reduce((t, j) => lv >= j[0] ? j[1] : t, JOBS[0][1]);
  // 打倒一門課的 BOSS（最後一章）得到的稱號
  const TITLES = { os: '核心守護者', dsa: '演算法劍士', dm: '邏輯賢者', ai: '神經網路術士', ics: '程式見習生', net: '封包信使' };
  const titleOf = id => TITLES[id] || `${id.toUpperCase()} 制霸者`;

  const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const readAll = () => { try { return obj(JSON.parse(localStorage.getItem(KEY))); } catch (_) { return {}; } };
  function writeMine(rec) {
    const all = readAll(); all[C.id] = rec;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (_) { /* 私密模式 */ }
  }
  const othersExp = () => Object.entries(readAll()).reduce((s, [id, r]) => s + (C && id === C.id ? 0 : Number(obj(r).exp) || 0), 0);

  // 章節等級：每個單元的最後一章是精英，整門課的最後一章是 BOSS
  const tier = {};
  if (lessons.length) {
    const units = {};
    lessons.forEach(l => (units[l.unit] = units[l.unit] || []).push(l));
    Object.values(units).forEach(g => { if (g.length >= 2) tier[g[g.length - 1].id] = 'elite'; });
    tier[lessons[lessons.length - 1].id] = 'boss';
  }
  const TIER_NAME = { normal: '普通', elite: '精英', boss: 'BOSS', review: '複習' };
  function courseExp() {
    const st = App.store;
    let e = 0;
    lessons.forEach(l => {
      if (st.learn[l.id]) e += EXP.learn;
      if (st.lab[l.id]) e += EXP.lab;
      if (String(st.notes[l.id] || '').trim()) e += EXP.note;
      if (!st.done[l.id]) return;
      e += EXP.quiz + (tier[l.id] === 'boss' ? EXP.boss : tier[l.id] === 'elite' ? EXP.elite : 0);
      e += EXP.right * l.quiz.filter((_, qi) => !st.wrong[`${l.id}:${qi}`]).length;
    });
    if (lessons.length && lessons.every(l => st.done[l.id])) e += EXP.course;
    if (Challenges) Challenges.list().forEach(c => { e += challengeExp((st.challenge || {})[c.id]); });
    if (Code) Code.list().forEach(p => { if (((st.code || {})[p.id] || {}).solved) e += EXP.code; });
    return e;
  }
  const bossDown = () => !!(lessons.length && App.store.done[lessons[lessons.length - 1].id]);
  let others = othersExp(), mine = App ? courseExp() : 0, now = levelOf(others + mine);
  if (App) writeMine({ exp: mine, title: bossDown() ? titleOf(C.id) : '' });
  // 進度變了就重算：這次得到多少、有沒有升級或轉職
  function award() {
    const before = now, hadBoss = bossDown.last;
    mine = courseExp(); bossDown.last = bossDown();
    writeMine({ exp: mine, title: bossDown.last ? titleOf(C.id) : '' });
    now = levelOf(others + mine);
    paintHud();
    return { gain: now.exp - before.exp, up: now.lv > before.lv, job: jobOf(now.lv) !== jobOf(before.lv), title: bossDown.last && !hadBoss };
  }
  if (App) bossDown.last = bossDown();

  /* ───────────── 狀態列（UI.wz StatusBar：等級數字、職業、名字、經驗值條，上方一行公告）───────────── */
  let hud = null, ticker = null;
  function makeHud() {
    if (hud) return;
    hud = document.createElement('div');
    hud.className = 'hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = '<div class="hud-chat"><b></b> <span></span></div><div class="hud-row"><div class="hud-left"><span class="hud-lv"></span>' +
      '<span class="hud-name"><span></span><b></b></span></div><div class="hud-gp"><div class="hud-exp"><span class="hud-gray"></span><span class="hud-num"></span></div></div></div>';
    hud.querySelector('.hud-name b').textContent = C ? C.name : 'CS LAB';
    document.body.appendChild(hud);
    document.body.classList.add('has-hud');
    paintHud();
  }
  function paintHud() {
    if (!hud) return;
    const pct = now.into / now.need;
    hud.querySelector('.hud-name span').textContent = jobOf(now.lv);
    hud.querySelector('.hud-num').textContent = `${now.into} / ${now.need} [${(pct * 100).toFixed(2)}%]`;
    // 經驗值條的彩色內部從框左邊 25px 開始（EXP. 字樣下方）
    hud.querySelector('.hud-gray').style.left = `calc(${pct * 100}% + ${25 * pct - 25}px)`;
    const lv = hud.querySelector('.hud-lv');
    if (lv.dataset.lv === String(now.lv)) return;
    lv.dataset.lv = now.lv; lv.textContent = '';
    String(now.lv).split('').forEach(d => { const img = new Image(); img.src = Skin.url(`lv${d}.png`); img.alt = ''; lv.appendChild(img); });
  }
  // 公告列輪流顯示 [標籤, 文字]，每幾秒換一行
  function chat(lines) {
    if (!hud || !lines.length) return;
    clearInterval(ticker);
    let k = 0;
    const tag = hud.querySelector('.hud-chat b'), text = hud.querySelector('.hud-chat span');
    const show = () => { const [t, s] = lines[k++ % lines.length]; tag.textContent = `[${t}]`; text.textContent = s; };
    show();
    if (lines.length > 1) ticker = setInterval(show, 7000);
  }
  const pad = n => String(n).padStart(2, '0');
  const meLine = () => ['角色', `LV.${now.lv} ${jobOf(now.lv)}　累積經驗值 ${now.exp}，再 ${now.need - now.into} 升級`];
  function pageLines() {
    if (!App) {
      const all = readAll(), lines = [['公告', '歡迎來到 CS LAB。每門課讀觀念、做實驗、完成測驗都能獲得經驗值，等級在各課之間共用。'], meLine()];
      Object.entries(all).forEach(([id, r]) => { r = obj(r); if (r.exp) lines.push(['冒險', `${id.toUpperCase()} LAB　經驗值 ${r.exp}${r.title ? `　稱號「${r.title}」` : ''}`]); });
      return lines;
    }
    const st = App.state, lines = [];
    if (st.page === 'lesson') {
      const l = App.byId[st.lesson], i = lessons.indexOf(l), t = tier[l.id] || 'normal', s = App.questState(l);
      lines.push(['任務', `第 ${pad(i + 1)} 章「${l.title}」${t !== 'normal' ? `（${TIER_NAME[t]}）` : ''}：` +
        (s === 'done' ? '已完成。答錯的題目到錯題複習答對，每題再得 +' + EXP.right + '。' : '讀「觀念」、做「實驗」，再到「測驗」打倒守在這一章的怪物。')]);
      // 這一頁的重點輪流出現在公告列（和 self-research 每節的重點一樣）
      if (st.tab === 'learn') {
        (l.goals || []).forEach(g => lines.push(['目標', g]));
        if (l.ask) lines.push(['提問', l.ask]);
        (l.summary || []).forEach(x => lines.push(['重點', x]));
      } else if (st.tab === 'lab') {
        const d = window.CSLab && window.CSLab.registry[l.lab];
        if (d && d.prompt) lines.push(['實驗', `先預測：${d.prompt}`]);
      } else if (window.MAPLE_SPRITES) {
        const f = foeFor(l.id);
        if (f) lines.push(['戰鬥', `${label(f.name)}守在這一章。答對一題打掉一格 HP；每題兩顆心，答錯會被反擊。`]);
      }
      if (st.tab === 'code' && Code) Code.forLesson(l.id).forEach(p => {
        const r = (App.store.code || {})[p.id];
        lines.push(['實作', `「${p.title}」：${r && r.solved ? '已通過，換一種語言再寫一次也是好練習。' : `測資就是怪物的 HP，每通過一筆打掉一格；全部通過打倒牠，第一次通過得 EXP +${EXP.code}。`}`]);
      });
      if (st.tab === 'code') lines.push(['提示', '先按「執行」用範例輸入試跑，輸出對了再「提交評測」；C / C++ 第一次要下載編譯器，請稍候。']);
      if ((st.tab === 'learn' || st.tab === 'lab') && Challenges) Challenges.forLesson(l.id).forEach(c => {
        const r = (App.store.challenge || {})[c.id];
        lines.push(['挑戰', `頁尾的怪物挑戰「${c.title}」：${r && r.solved ? '已通過。' : `先自己操作，驗證後才看得到解析；不看解答、沒有失誤過關得 EXP +${EXP.challenge[0]}。`}`]);
      });
    } else {
      const next = lessons.find(l => !App.store.done[l.id]);
      lines.push(['公告', `歡迎來到 ${C.name}。讀觀念、做實驗、完成測驗都能獲得經驗值。`]);
      if (next) lines.push(['任務', `下一個任務：第 ${pad(lessons.indexOf(next) + 1)} 章「${next.title}」`]);
    }
    lines.push(meLine());
    if (bossDown()) lines.push(['稱號', `「${titleOf(C.id)}」：打倒了 ${C.name} 的 BOSS`]);
    return lines;
  }
  function gainLines(g, what) {
    const lines = [['系統', `${what}，獲得經驗值 +${g.gain}`]];
    if (g.up) lines.unshift(['系統', `等級提升！LV.${now.lv}${g.job ? `　轉職為「${jobOf(now.lv)}」` : ''}`]);
    if (g.title) lines.push(['稱號', `獲得稱號「${titleOf(C.id)}」`]);
    return lines.concat(pageLines());
  }

  /* ───────────── 精靈圖 ───────────── */
  const reduce = () => S.reduceMotion();
  const seedOf = str => { let h = 7; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  const pick = (list, key) => list.length ? list[seedOf(key) % list.length] : null;
  const label = name => S.spec(name).label || S.spec(name).role || '';
  function sprEl(name, act) { const el = document.createElement('span'); el.className = 'spr'; S.setAct(el, name, act); return el; }
  const tallest = name => { const a = S.spec(name).acts; return Math.max(...Object.values(a).map(c => c[1])); };
  // 這一章的怪物：精英章是精英怪，最後一章是 BOSS，其他依課程與章節固定挑一隻
  function foeFor(lid) {
    const t = tier[lid] || 'normal', key = `${C.id}:${lid}`;
    if (t === 'boss' && S.kind('boss').length) return { name: S.kind('boss')[0], tier: t };
    if (t === 'elite' && S.kind('elite').length) return { name: pick(S.kind('elite'), key), tier: t };
    const m = pick(S.kind('mob'), key);
    return m ? { name: m, tier: 'normal' } : null;
  }
  // 隊伍：主角（每門課固定殺人鯨或露希妲）、另一位當夥伴、加上寵物；服裝依章節換，和 self-research 一樣
  const MAIN = (seedOf(C ? C.id : 'cslab') >> 1) % 2 ? 'lucid' : 'orca', MATE = MAIN === 'orca' ? 'lucid' : 'orca';
  function outfit(fam, key, cheer) {
    let list = S.kind('hero').filter(k => S.spec(k).family === fam);
    if (cheer && list.some(k => S.spec(k).acts.cheer)) list = list.filter(k => S.spec(k).acts.cheer);
    return pick(list.length ? list : S.kind('hero'), key);
  }
  const petFor = () => pick(S.kind('pet'), C ? C.id : 'cslab');
  const partyFor = (key, cheer) => [outfit(MAIN, key, cheer), outfit(MATE, key + ':mate'), petFor()].filter(Boolean);
  const roomOf = names => Math.max(0, ...names.map(tallest));

  // 站在視窗上緣的一排角色：party 是隊伍（面向右）、walk 是巡邏的怪物、foe 是站定迎戰的怪物（面向左）。
  // 巡邏用合成器上的 WAAPI，離開畫面就暫停。
  const patrols = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    e.target.classList.toggle('is-off', !e.isIntersecting);
    e.target.querySelectorAll('.walker').forEach(w => { if (w.patrol && !w.classList.contains('is-hit')) { if (e.isIntersecting) w.patrol.play(); else w.patrol.pause(); } });
  }), { rootMargin: '200px 0px' }) : null;
  function perch(host, names, where) {
    const wrap = document.createElement('span');
    wrap.className = `perch perch-${where}`;
    wrap.setAttribute('aria-hidden', 'true');
    const cast = names.map(name => {
      const walk = where === 'walk' && !reduce() && S.spec(name).acts.move;
      const walker = document.createElement('span');
      walker.className = walk ? 'walker' : 'stander';
      const spr = sprEl(name, walk ? 'move' : 'stand');
      walker.appendChild(spr);
      wrap.appendChild(walker);
      if (walk && walker.animate) {
        const d = Math.max(0, (innerWidth <= 640 ? 110 : 170) - S.spec(name).acts.move[0]) + 'px';
        walker.patrol = walker.animate([
          { transform: 'translateX(0) scaleX(-1)', offset: 0 }, { transform: `translateX(${d}) scaleX(-1)`, offset: 0.46 },
          { transform: `translateX(${d}) scaleX(1)`, offset: 0.5 }, { transform: 'translateX(0) scaleX(1)', offset: 0.96 },
          { transform: 'translateX(0) scaleX(-1)', offset: 1 }
        ], { duration: 18000, iterations: Infinity });
      }
      return { name, spr, walker };
    });
    host.appendChild(wrap);
    if (patrols) patrols.observe(wrap);
    return { wrap, cast };
  }
  // 爆擊數字（BasicEff NoCri1 的數字），放在角色身上往上飄
  function damage(host, big) {
    if (reduce() || !S.spec('fx-digits')) return;
    const cell = S.spec('fx-digits').acts.stand, dmg = document.createElement('span');
    dmg.className = 'fx-damage';
    String(big ? 1000 + Math.floor(Math.random() * 9000) : 100 + Math.floor(Math.random() * 900)).split('').forEach(d => {
      const g = document.createElement('span');
      g.className = 'spr';
      g.style.backgroundImage = `url("${Skin.url('spr-fx-digits-stand.png')}")`;
      g.style.setProperty('--w', cell[0]); g.style.setProperty('--h', cell[1]);
      g.style.backgroundPosition = `${-cell[0] * Number(d)}px 0`;
      dmg.appendChild(g);
    });
    host.appendChild(dmg);
    setTimeout(() => dmg.remove(), 1300);
  }
  // 角色頭上浮出的字：EXP、MISS、被打到的心
  function popText(host, text, cls) {
    if (!host) return;
    const pop = document.createElement('span');
    pop.className = cls;
    pop.textContent = text;
    host.appendChild(pop);
    setTimeout(() => pop.remove(), 1500);
  }
  const expPop = (host, gain) => { if (gain > 0) popText(host, `EXP +${gain}`, 'exp-pop'); };
  // 往前衝一下再回來（攻擊、反擊）
  function lunge(el, dx) {
    if (reduce() || !el || !el.animate) return;
    el.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)`, offset: 0.4 }, { transform: 'translateX(0)' }], { duration: 340, easing: 'ease-out' });
  }
  // 主角歡呼；升級時播放光柱與 LEVEL UP 字樣
  function cheer(hero, up) {
    if (!hero || reduce()) return;
    if (S.spec(hero.name).acts.cheer) {
      S.swapAct(hero.spr, hero.name, 'cheer');
      setTimeout(() => { if (hero.spr.isConnected) S.swapAct(hero.spr, hero.name, 'stand'); }, 1800);
    }
    if (!up || !S.spec('fx-levelup')) return;
    const fx = document.createElement('span');
    fx.className = 'fx-levelup';
    const pillar = sprEl('fx-levelup', 'stand');
    S.setAct(pillar, 'fx-levelup', 'stand', true, 110);
    fx.appendChild(pillar);
    hero.walker.appendChild(fx);
    setTimeout(() => {
      const words = sprEl('fx-levelup', 'text');
      words.classList.add('fx-words');
      S.setAct(words, 'fx-levelup', 'text', true, 150);
      fx.appendChild(words);
    }, 900);
    setTimeout(() => fx.remove(), 2400);
  }
  function knockDown(p) {
    const m = p.cast[0];
    if (reduce()) { p.wrap.hidden = true; return; }
    m.walker.classList.add('is-hit');
    if (m.walker.patrol) m.walker.patrol.pause();
    S.swapAct(m.spr, m.name, 'hit');
    damage(m.walker, true);
    setTimeout(() => {
      S.swapAct(m.spr, m.name, 'die', true, 140);
      p.wrap.classList.add('is-down');
      setTimeout(() => { p.wrap.hidden = true; }, 1400);
    }, 260);
  }
  // 沒被打倒的怪物轉身逃走
  function flee(p) {
    const m = p.cast[0];
    if (reduce() || !m.walker.animate) { p.wrap.hidden = true; return; }
    if (S.spec(m.name).acts.move) S.swapAct(m.spr, m.name, 'move');
    m.walker.animate([{ transform: 'scaleX(-1)', opacity: 1 }, { transform: 'translateX(60px) scaleX(-1)', opacity: 0 }], { duration: 1100, delay: 300, easing: 'ease-in', fill: 'forwards' });
  }

  /* ───────────── 場景 ─────────────
   * 章節頁：這一章的怪物在章節標頭上巡邏（測驗頁籤時它到測驗視窗上迎戰）；隊伍站在頁尾的換章按鈕上，
   * 跟著你一章一章走，章節完成後「下一章」上方出現傳送門。課程首頁：隊伍站在 NPC 對話框上，
   * 下一個任務的怪物在「你的進度」上巡邏。入口網：殺人鯨、露希妲、另一位冒險家和寵物站在卷軸上，怪物在標題木牌上。 */
  let scene = {}, arenaNow = null;
  function stageHead() {
    const head = document.querySelector('.lesson-head');
    if (!head || head.querySelector(':scope > .perch') || App.state.tab === 'quiz') return;
    const foe = !App.store.done[App.state.lesson] && foeFor(App.state.lesson);
    if (!foe) return;
    scene.mob = perch(head, [foe.name], 'walk');
    head.style.setProperty('--perch-h', tallest(foe.name));
    ['hit', 'die'].forEach(a => S.warm(foe.name, a));
  }
  function stagePager() {
    const pager = document.querySelector('#content > .pager');
    if (!pager || pager.querySelector(':scope > .perch')) return;
    const names = partyFor(`${C.id}:${App.state.lesson}`);
    scene.party = perch(pager, names, 'party');
    let room = roomOf(names);
    if (S.spec('portal')) {
      const gate = sprEl('portal', 'stand');
      gate.classList.add('pg-portal');
      gate.setAttribute('aria-hidden', 'true');
      pager.appendChild(gate);
      room = Math.max(room, Math.round(S.spec('portal').acts.stand[1] * 0.6) - 10);
    }
    pager.style.setProperty('--perch-h', room);
    pager.classList.toggle('is-clear', !!App.store.done[App.state.lesson]);
  }
  function stageHome() {
    const hero = document.querySelector('#content > .hero');
    if (!hero || hero.querySelector(':scope > .perch')) return;
    const names = partyFor(`${C.id}:home`);
    scene.party = perch(hero, names, 'party');
    hero.style.setProperty('--perch-h', roomOf(names));
    const next = lessons.find(l => !App.store.done[l.id]), card = document.querySelector('.home-grid > .progress-card'), foe = next && foeFor(next.id);
    if (foe && card) { perch(card, [foe.name], 'walk'); card.parentElement.style.setProperty('--perch-h', tallest(foe.name)); }
  }
  function stagePortal() {
    const hero = document.querySelector('.portal .hero');
    if (!hero || hero.querySelector(':scope > .perch')) return;
    const shuffle = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const heroes = S.kind('hero'), one = fam => shuffle(heroes.filter(k => S.spec(k).family === fam))[0];
    const names = [one('orca'), one('lucid'), shuffle(heroes.filter(k => !S.spec(k).family))[0], shuffle(S.kind('pet'))[0]].filter(Boolean);
    scene.party = perch(hero, names, 'party');
    hero.style.setProperty('--perch-h', roomOf(names));
    const mobs = shuffle(S.kind('mob'));
    document.querySelectorAll('.portal .section-head h2, .portal #roadmap > h2').forEach((h, i) => { if (mobs.length) perch(h, [mobs[i % mobs.length]], 'walk'); });
  }

  /* ───────────── 測驗討伐 ─────────────
   * 測驗視窗上緣是戰場：左邊是隊伍，右邊是這一章的怪物；出題的 NPC 留在對話框的肖像欄（cslab-skin.js）。
   * 怪物 HP＝題數，答對一題（第一次或第二次）主角衝上去打掉一格；答錯一次怪物反擊、少一顆心
   * （每題兩顆心＝原本的兩次機會），兩次都錯就是 MISS。全部答對才算討伐成功，否則怪物逃走；
   * 兩種結果都照原本規則完成測驗。一輪的戰況記在 WeakMap（以 app 的測驗物件為鍵），不寫進 localStorage。 */
  const battles = new WeakMap();
  function bar(host) {
    let b = host.querySelector(':scope > .bt-bar');
    if (!b) {
      b = document.createElement('div');
      b.className = 'bt-bar';
      b.setAttribute('aria-hidden', 'true');
      b.innerHTML = '<span class="bt-tier"></span><b class="bt-foe"></b><span class="bt-hp"><i></i></span><span class="bt-hearts"></span><p class="bt-say"></p>';
      const first = host.querySelector(':scope > :not(.npc-portrait):not(.perch)');
      host.insertBefore(b, first);
    }
    return b;
  }
  // 戰場：每次 app 重畫測驗視窗都重新放
  function arena(host, b, withFoe) {
    const names = partyFor(`${C.id}:${App.state.page === 'lesson' ? App.state.lesson : 'review'}:arena`, true);
    const a = { party: perch(host, names, 'party'), foe: withFoe ? perch(host, [b.foe.name], 'foe') : null };
    host.style.setProperty('--perch-h', roomOf(withFoe ? names.concat(b.foe.name) : names));
    host.classList.add('has-arena');
    arenaNow = a;
    return a;
  }
  function battle(target) {
    if (!Skin.active || !App || !target || !target._quiz || !window.MAPLE_SPRITES) return;
    const q = target._quiz.q, review = target.id === 'reviewStage';
    const host = target.querySelector(':scope > .card.quiz, :scope > .card.quiz-done');
    if (!host || host.querySelector(':scope > .perch')) return;
    let b = battles.get(q);
    if (!b) {
      const m = pick(S.kind('mob'), `${C.id}:review`);
      b = { foe: review ? (m && { name: m, tier: 'review' }) : foeFor(App.state.lesson), right: new Set(), last: null, n: q.items.length, over: false };
      battles.set(q, b);
    }
    if (!b.foe) return;
    const foeName = b.foe.tier === 'boss' ? `BOSS ${label(b.foe.name)}` : label(b.foe.name) || '怪物';
    if (q.i >= q.items.length) return victory(host, b);
    const prev = b.last, fx = { kind: null };
    b.last = { i: q.i, tries: q.tries };
    if (q.revealed && q.correct && !b.right.has(q.i)) { b.right.add(q.i); fx.kind = q.tries === 0 ? 'crit' : 'hit'; }
    else if (prev && prev.i === q.i && q.tries > prev.tries) fx.kind = q.revealed ? 'miss' : 'struck';
    const a = arena(host, b, true), el = bar(host), hero = a.party.cast[0], foe = a.foe.cast[0];
    el.dataset.tier = b.foe.tier;
    el.querySelector('.bt-tier').textContent = TIER_NAME[b.foe.tier];
    el.querySelector('.bt-foe').textContent = foeName;
    const hp = b.n - b.right.size, hearts = q.revealed && !q.correct ? 0 : 2 - q.tries;
    el.querySelector('.bt-hp i').style.width = `${100 * hp / b.n}%`;
    el.querySelector('.bt-hearts').textContent = '♥'.repeat(hearts) + '♡'.repeat(2 - hearts);
    el.querySelector('.bt-say').textContent = { crit: '爆擊！一次答對，怪物受到重創。', hit: '命中！第二次答對了。', struck: `${foeName}反擊了！還剩一顆心，看看提示再試一次。`, miss: 'MISS……這題沒打中，讀完解析再往下。' }[fx.kind] ||
      (q.revealed ? '' : `${foeName}擋住了去路。答對一題，${label(hero.name) || '主角'}就打掉牠一格 HP。`);
    if (fx.kind === 'crit' || fx.kind === 'hit') {
      lunge(hero.walker, 26);
      setTimeout(() => {
        if (!foe.spr.isConnected) return;
        S.swapAct(foe.spr, foe.name, 'hit');
        damage(foe.walker, fx.kind === 'crit');
        setTimeout(() => { if (foe.spr.isConnected) S.swapAct(foe.spr, foe.name, 'stand'); }, 450);
      }, 130);
    } else if (fx.kind === 'struck') {
      lunge(foe.walker, -26);
      setTimeout(() => { lunge(hero.walker, -10); popText(hero.walker, '♥ -1', 'fx-ouch'); }, 130);
      if (!reduce()) { host.classList.remove('is-struck'); void host.offsetWidth; host.classList.add('is-struck'); }
    } else if (fx.kind === 'miss') {
      lunge(hero.walker, 26);
      setTimeout(() => popText(foe.walker, 'MISS', 'fx-miss'), 130);
    }
    ['hit', 'die', 'move'].forEach(act => S.warm(b.foe.name, act));
  }
  function victory(host, b) {
    const fresh = !b.over;
    b.over = true;
    const win = b.right.size === b.n, foeName = label(b.foe.name) || '怪物';
    const a = arena(host, b, fresh), el = bar(host);
    el.dataset.tier = b.foe.tier;
    el.classList.add('is-over');
    el.classList.toggle('is-win', win);
    el.querySelector('.bt-tier').textContent = TIER_NAME[b.foe.tier];
    el.querySelector('.bt-foe').textContent = win ? `討伐成功！打倒了${foeName}` : `${foeName}逃走了`;
    el.querySelector('.bt-hp i').style.width = `${100 * (b.n - b.right.size) / b.n}%`;
    el.querySelector('.bt-hearts').textContent = '';
    el.querySelector('.bt-say').textContent = win ? '每一題都答對了，任務完成。' : `答對 ${b.right.size} / ${b.n} 題，任務照樣完成；答錯的題目在錯題本，複習時答對還能得經驗值。`;
    if (!fresh) return;
    if (a.foe) { if (win) { lunge(a.party.cast[0].walker, 26); setTimeout(() => knockDown(a.foe), 130); } else flee(a.foe); }
    // 主角歡呼。完成章節的經驗值由 celebrate 接手（它先執行，會連升級特效一起播）
    const hero = a.party.cast[0];
    victory.hero = hero;
    setTimeout(() => { if (victory.told !== hero) cheer(hero, false); }, 0);
  }

  /* ───────────── 怪物挑戰 ─────────────
   * 頁尾的互動挑戰（shared/cslab-challenge.js）在這個外觀是一場怪物挑戰：NPC 在肖像欄出題，卡片上緣站著一隻小怪
   * （和守在章節的怪物不同），HP＝關數。失誤時牠擋下這一步、卡片震一下，過一關打掉一格 HP，完成時倒下，先看解答則逃走。
   * 只讀挑戰卡片的 data-* 與 cslab:challenge 事件，題目、驗證與紀錄都不經過這裡。 */
  const duels = new WeakMap(); // 卡片 → { foe, perch }
  function duel(card) {
    if (!Skin.active || !window.MAPLE_SPRITES || !card || !card.isConnected) return null;
    let d = duels.get(card);
    if (!d || !d.perch.wrap.isConnected) {
      const lid = App.state.lesson, chapterFoe = foeFor(lid), mobs = S.kind('mob').filter(m => !chapterFoe || m !== chapterFoe.name);
      const name = pick(mobs.length ? mobs : S.kind('mob'), `${C.id}:${lid}:${card.dataset.challenge}`);
      if (!name) return null;
      card.querySelectorAll(':scope > .perch, :scope > .bt-bar').forEach(el => el.remove());
      d = { foe: name, perch: perch(card, [name], 'foe') };
      card.style.setProperty('--perch-h', tallest(name));
      card.classList.add('has-arena');
      ['hit', 'die', 'move'].forEach(act => S.warm(name, act));
      duels.set(card, d);
      Skin.npc(card, `${C.id}:${lid}:challenge`, card.dataset.status === 'solved' ? 'done' : 'open');
      if (card.dataset.over) d.perch.wrap.hidden = true;
    }
    return d;
  }
  function paintDuel(card, d, ev) {
    const el = bar(card), foeName = label(d.foe) || '怪物', over = card.dataset.over, round = +card.dataset.round || 0, rounds = +card.dataset.rounds || 1;
    el.dataset.tier = 'challenge';
    el.classList.toggle('is-over', !!over);
    el.classList.toggle('is-win', over === 'win');
    el.querySelector('.bt-tier').textContent = '挑戰';
    el.querySelector('.bt-foe').textContent = over === 'win' ? `挑戰成功！打倒了${foeName}` : over ? `${foeName}逃走了` : foeName;
    el.querySelector('.bt-hp i').style.width = `${100 * (over === 'win' ? 0 : rounds - round) / rounds}%`;
    el.querySelector('.bt-hearts').textContent = '';
    el.querySelector('.bt-say').textContent = over === 'win' ? (ev.fresh ? '用這一章學到的方法通過了，經驗值記在紀錄上。' : '挑戰完成。') : over ? '看過解答了，這次不算討伐；按「再挑戰一次」可以再練。'
      : ev.event === 'mistake' ? `${foeName}擋下了這一步！看看回饋，想清楚再出手。` : ev.event === 'round' ? `命中！還剩 ${rounds - round} 關。` : `${foeName}出現了。照本章的方法一步一步做，每過一關就打掉牠一格 HP。`;
  }
  function onChallenge(ev) {
    const card = ev.card, d = duel(card);
    if (!d) return;
    paintDuel(card, d, ev);
    const m = d.perch.cast[0];
    if (ev.event === 'mistake') {
      lunge(m.walker, -26);
      setTimeout(() => popText(m.walker, 'MISS', 'fx-miss'), 130);
      if (!reduce()) { card.classList.remove('is-struck'); void card.offsetWidth; card.classList.add('is-struck'); }
    } else if (ev.event === 'round' && !card.dataset.over) {
      S.swapAct(m.spr, d.foe, 'hit');
      damage(m.walker, false);
      setTimeout(() => { if (m.spr.isConnected) S.swapAct(m.spr, d.foe, 'stand'); }, 450);
    } else if (ev.event === 'solved') knockDown(d.perch);
    else if (ev.event === 'revealed') flee(d.perch);
  }

  /* ───────────── 程式實作討伐 ─────────────
   * 「④ 實作」頁籤（shared/cslab-code.js）：題目對話框由委託任務的 NPC 開口，編輯器視窗上緣是戰場。
   * 怪物 HP＝測資筆數：提交時每通過一筆，主角衝上去打掉一格；沒通過的那筆怪物反擊（MISS）。全部通過才倒下，
   * 否則牠留在原地等你修好再來。只讀 cslab:code 事件與卡片，不碰評測與紀錄。 */
  const codeFights = new WeakMap(); // 視窗 → { foe, a, hp, total }
  const CODE_SAY = {
    WA: '答案不對，怪物擋下了攻擊。展開公開測資，比對第一個不同的行。',
    CE: '咒語還沒念對（編譯錯誤）：照「編譯訊息」第一個錯誤的行號修正。',
    RE: '程式在途中倒下了（執行錯誤）：看 stderr，檢查陣列範圍與除以零。',
    TLE: '陷入了時間的迷宮（超過時限）：是無窮迴圈，還是演算法太慢？',
    IE: '傳送門故障了（系統錯誤），重新整理後再試一次。'
  };
  function codeFight(card, ev) {
    if (!Skin.active || !window.MAPLE_SPRITES || !card || !card.isConnected) return null;
    let f = codeFights.get(card);
    if (!f || !f.a.party.wrap.isConnected) {
      const lid = App.state.lesson, avoid = [foeFor(lid) && foeFor(lid).name];
      const mobs = S.kind('mob').filter(m => !avoid.includes(m)), solved = !!(ev.record && ev.record.solved);
      const name = pick(mobs.length ? mobs : S.kind('mob'), `${C.id}:${ev.id}:code`);
      if (!name) return null;
      card.querySelectorAll(':scope > .perch, :scope > .bt-bar').forEach(el => el.remove());
      const names = partyFor(`${C.id}:${lid}:code`, true);
      f = { foe: name, total: ev.total, hp: solved ? 0 : ev.total, a: { party: perch(card, names, 'party'), foe: perch(card, [name], 'foe') } };
      if (solved) f.a.foe.wrap.hidden = true;
      card.style.setProperty('--perch-h', roomOf(names.concat(name)));
      card.classList.add('has-arena');
      ['hit', 'die', 'move'].forEach(act => S.warm(name, act));
      codeFights.set(card, f);
      arenaNow = f.a;
      const brief = document.querySelector('.code-brief');
      if (brief) Skin.npc(brief, `${C.id}:${lid}:code`, solved ? 'done' : ev.record && ev.record.submits ? 'open' : 'new');
    }
    return f;
  }
  function paintCode(card, f, say) {
    const el = bar(card), foeName = label(f.foe) || '怪物', down = f.hp <= 0;
    el.dataset.tier = 'code';
    el.classList.toggle('is-over', down); el.classList.toggle('is-win', down);
    el.querySelector('.bt-tier').textContent = '實作';
    el.querySelector('.bt-foe').textContent = down ? `已打倒${foeName}` : `${foeName}（HP ${f.hp} / ${f.total}）`;
    el.querySelector('.bt-hp i').style.width = `${100 * f.hp / f.total}%`;
    el.querySelector('.bt-hearts').textContent = '';
    if (say !== undefined) el.querySelector('.bt-say').textContent = say;
  }
  function onCode(ev) {
    const card = ev.card, f = codeFight(card, ev);
    if (!f) return;
    const foeName = label(f.foe) || '怪物', hero = f.a.party.cast[0], foe = f.a.foe.cast[0];
    if (ev.event === 'view') return paintCode(card, f, f.hp <= 0 ? '這一題已經通過了。換一種語言再寫一次，看看寫法哪裡不同。' : `${foeName}守著這道題目：牠的 HP 就是 ${f.total} 筆測資。寫好程式、按「提交評測」出手！`);
    if (ev.event === 'judging') { f.hp = f.total; f.a.foe.wrap.hidden = false; f.a.foe.wrap.classList.remove('is-down'); S.swapAct(foe.spr, f.foe, 'stand'); return paintCode(card, f, '出手！每通過一筆測資就打掉一格 HP。'); }
    if (ev.event === 'phase') {
      const t = ev.phase === 'compiling' && ev.info && ev.info.totalLength ? `正在召喚編譯器……（${Math.round(ev.info.doneLength / 1048576)} / ${Math.round(ev.info.totalLength / 1048576)} MB，只有第一次）` : ev.phase === 'loading' ? '正在召喚 Python 直譯器……（只有第一次）' : ev.phase === 'compiling' ? '正在編譯，凝聚力量中……' : null;
      if (t) paintCode(card, f, t);
      return;
    }
    if (ev.event === 'case') {
      if (ev.verdict === 'AC') {
        f.hp = Math.max(0, f.hp - 1);
        lunge(hero.walker, 26);
        setTimeout(() => { if (!foe.spr.isConnected) return; S.swapAct(foe.spr, f.foe, 'hit'); damage(foe.walker, false); setTimeout(() => { if (foe.spr.isConnected && f.hp > 0) S.swapAct(foe.spr, f.foe, 'stand'); }, 400); }, 120);
        return paintCode(card, f, `命中！第 ${ev.index + 1} 筆測資通過。`);
      }
      lunge(foe.walker, -26);
      setTimeout(() => popText(hero.walker, ev.verdict === 'WA' ? 'MISS' : ev.verdict, 'fx-miss'), 130);
      return paintCode(card, f, `第 ${ev.index + 1} 筆沒有通過（${ev.verdict}）。`);
    }
    if (ev.event === 'judged') {
      if (ev.verdict === 'AC') { f.hp = 0; knockDown(f.a.foe); victory.hero = null; return paintCode(card, f, ev.fresh ? `討伐成功！全部 ${f.total} 筆測資通過，任務完成。` : `又打倒了${foeName}一次：全部通過。`); }
      if (ev.verdict === 'STOPPED') return paintCode(card, f, '收手了。這次不記錄，準備好再出手。');
      if (!reduce()) { card.classList.remove('is-struck'); void card.offsetWidth; card.classList.add('is-struck'); }
      return paintCode(card, f, `通過 ${ev.passed} / ${f.total} 筆。${CODE_SAY[ev.verdict] || ''}`);
    }
    if (ev.event === 'ran') paintCode(card, f, ev.status === 'accepted' ? '試跑完成。輸出看起來對了，就按「提交評測」對牠出手。' : `試跑失敗：${CODE_SAY[{ compile_error: 'CE', runtime_error: 'RE', time_limit_exceeded: 'TLE' }[ev.status]] || '看看下方的訊息。'}`);
  }

  /* ───────────── 收到 app 的事件：重算經驗值、播特效、更新公告 ───────────── */
  // 經驗值出現在畫面上的隊伍身上：測驗視窗上的主角，否則頁尾（或首頁）的主角
  const liveParty = () => arenaNow && arenaNow.party.wrap.isConnected ? arenaNow.party : scene.party && scene.party.wrap.isConnected ? scene.party : null;
  function celebrate(g, what) {
    if (!Skin.active) return;
    chat(g.gain > 0 ? gainLines(g, what) : pageLines());
    if (g.gain <= 0) return;
    const p = liveParty();
    if (!p) return;
    const hero = p.cast[0];
    expPop(hero.walker, g.gain);
    if (victory.hero === hero) victory.told = hero;
    cheer(hero, g.up);
  }
  const WHAT = { learn: '讀完觀念', lab: '第一次操作實驗', done: '完成測驗', code: '通過程式實作' };
  if (App) {
    document.addEventListener('cslab:progress', e => {
      const g = award(), d = e.detail;
      if (d.kind === 'done' && Skin.active) {
        if (scene.mob && scene.mob.wrap.isConnected) knockDown(scene.mob);
        const pager = document.querySelector('#content > .pager');
        if (pager && App.state.lesson === d.lesson) pager.classList.add('is-clear');
      }
      // 測驗完成的畫面在這個事件之後才畫出來
      setTimeout(() => celebrate(g, WHAT[d.kind] || '有進展'), 0);
    });
    document.addEventListener('cslab:answer', e => {
      const g = award();
      if (g.gain > 0) setTimeout(() => celebrate(g, e.detail.correct ? '題目答對了' : '作答'), 0);
    });
    let noteTimer = null;
    document.addEventListener('input', e => {
      if (e.target.id !== 'noteArea') return;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => { const g = award(); if (g.gain) celebrate(g, '寫了筆記'); }, 800);
    });
    document.addEventListener('cslab:quiz-view', e => { if (Skin.active) S.whenTable(() => battle(e.detail.target)); });
    document.addEventListener('cslab:code', e => { if (Skin.active) S.whenTable(() => onCode(e.detail)); });
    document.addEventListener('cslab:challenge', e => {
      const ev = e.detail;
      if (ev.event === 'retry' && ev.card) { duels.delete(ev.card); ev.card.querySelectorAll(':scope > .perch, :scope > .bt-bar').forEach(el => el.remove()); }
      if (Skin.active) S.whenTable(() => onChallenge(ev));
      if (ev.event === 'solved' && ev.fresh) { const g = award(); setTimeout(() => celebrate(g, '通過互動挑戰'), 0); }
    });
  }
  function decorate() {
    if (!Skin.active) return;
    others = othersExp();
    if (App) { mine = courseExp(); now = levelOf(others + mine); } else now = levelOf(others);
    makeHud();
    paintHud();
    S.whenTable(() => {
      chat(pageLines());
      if (!window.MAPLE_SPRITES || !Skin.active) return;
      if (!App) { stagePortal(); return; }
      scene = {}; arenaNow = null;
      if (App.state.page === 'lesson') {
        stageHead(); stagePager();
        document.querySelectorAll('#challengeSlot > .challenge').forEach(card => onChallenge({ card, event: 'view' }));
        const lab = document.querySelector('#stage > .code-lab'), p = lab && Code && Code.get(lab.dataset.problem);
        if (p) onCode({ card: lab, event: 'view', id: p.id, total: Code.cases(p).length, record: (App.store.code || {})[p.id] });
      }
      if (App.state.page === 'home') stageHome();
      const t = document.querySelector('#stage, #reviewStage');
      if (t && t._quiz) battle(t);
    });
  }
  if (App) document.addEventListener('cslab:render', decorate);
  // 切回楓之谷外觀：之前的角色已停格，重新放一次
  Skin.onChange(on => {
    if (!on) return;
    document.querySelectorAll('.perch, .bt-bar').forEach(el => el.remove());
    decorate();
  });

  if (Skin.active) decorate();

  // 擴充與測試用
  window.CSLabGame = { EXP, levelOf, jobOf, tier, get level() { return now; }, courseExp: () => App ? courseExp() : 0 };
})();
