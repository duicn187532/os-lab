/* CS LAB 遊戲層：經驗值與等級、底部狀態列、章節怪物、測驗討伐、主角與升級特效。
 * 做法沿用 self-research（assets/site.js 的經驗值、狀態列與怪物，assets/battle.js 的討伐），只在楓之谷外觀啟用時出現。
 * - 不讀寫課程的進度鍵值，也不改測驗規則：兩次機會、錯題本與測驗紀錄照舊，這裡只把同一個測驗畫成打怪。
 * - 經驗值完全由各課既有的進度推算（讀完觀念、第一次做實驗、完成測驗、題目答對且不在錯題本、寫了筆記），
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
  const EXP = { learn: 30, lab: 30, quiz: 100, elite: 100, boss: 200, right: 10, note: 20, course: 500 };
  const needFor = lv => Math.round((45 * Math.pow(lv, 1.5) + 55) / 10) * 10;
  function levelOf(exp) {
    let lv = 1, into = Math.max(0, exp);
    while (into >= needFor(lv)) { into -= needFor(lv); lv++; }
    return { lv, into, need: needFor(lv), exp };
  }
  const JOBS = [[1, '新手程式員'], [10, '見習工程師'], [20, '工程師'], [30, '資深工程師'], [50, '電腦科學大師']];
  const jobOf = lv => JOBS.reduce((t, j) => lv >= j[0] ? j[1] : t, JOBS[0][1]);
  // 打倒一門課的 BOSS（最後一章）得到的稱號
  const TITLES = { os: '核心守護者', dsa: '演算法劍士', dm: '邏輯賢者', ai: '神經網路術士' };
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
  // 主角：每門課固定殺人鯨或露希妲，服裝依章節換；測驗完成時挑會歡呼的服裝
  function heroFor(key, cheer) {
    const all = S.kind('hero'), fam = (seedOf(C ? C.id : 'cslab') >> 1) % 2 ? 'lucid' : 'orca';
    let list = all.filter(k => S.spec(k).family === fam);
    if (cheer && list.some(k => S.spec(k).acts.cheer)) list = list.filter(k => S.spec(k).acts.cheer);
    return pick(list.length ? list : all, key);
  }
  const petFor = () => pick(S.kind('pet'), C ? C.id : 'cslab');

  // 站在視窗上緣的一排角色；walk 讓怪物在一小段距離來回走（合成器上的 WAAPI，離開畫面就暫停）
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
  // 爆擊數字（BasicEff NoCri1 的數字），放在 host 裡往上飄
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
  function expPop(host, gain) {
    if (!host || gain <= 0) return;
    const pop = document.createElement('span');
    pop.className = 'exp-pop';
    pop.textContent = `EXP +${gain}`;
    host.appendChild(pop);
    setTimeout(() => pop.remove(), 1500);
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

  /* ───────────── 章節標頭：主角與寵物站在左邊，這一章的怪物在右邊巡邏，完成測驗後倒下 ───────────── */
  let scene = null;
  function stageHead() {
    const head = document.querySelector('.lesson-head');
    if (!head || head.querySelector(':scope > .perch')) return;
    const lid = App.state.lesson, hero = heroFor(`${C.id}:${lid}`), pet = petFor();
    scene = { lid, head, party: hero ? perch(head, pet ? [hero, pet] : [hero], 'party') : null, mob: null };
    let room = hero ? Math.max(S.spec(hero).acts.stand[1], S.spec(hero).acts.cheer ? S.spec(hero).acts.cheer[1] : 0) : 0;
    const foe = !App.store.done[lid] && foeFor(lid);
    if (foe) {
      scene.mob = perch(head, [foe.name], 'walk');
      scene.mob.tier = foe.tier;
      room = Math.max(room, tallest(foe.name));
      ['hit', 'die'].forEach(a => S.warm(foe.name, a));
    }
    head.style.setProperty('--perch-h', room);
  }
  function knockDown(p) {
    const m = p.cast[0];
    if (reduce()) { p.wrap.hidden = true; return; }
    m.walker.classList.add('is-hit');
    if (m.walker.patrol) m.walker.patrol.pause();
    S.swapAct(m.spr, m.name, 'hit');
    damage(p.wrap, true);
    setTimeout(() => {
      S.swapAct(m.spr, m.name, 'die', true, 140);
      p.wrap.classList.add('is-down');
      setTimeout(() => { p.wrap.hidden = true; }, 1400);
    }, 260);
  }

  /* ───────────── 測驗討伐 ─────────────
   * 怪物 HP＝題數，答對一題（第一次或第二次）打掉一格；答錯一次被反擊、少一顆心（每題兩顆心＝原本的兩次機會），
   * 兩次都錯就是 MISS，這題沒打中。全部答對才算討伐成功，否則怪物撤退；兩種結果都照原本規則完成測驗。
   * 一輪測驗的戰況記在 WeakMap（以 app 的測驗物件為鍵），不寫進 localStorage。 */
  const battles = new WeakMap();
  function portrait(host, name, plate) {
    let p = host.querySelector(':scope > .npc-portrait');
    if (!p) {
      p = document.createElement('span');
      p.className = 'npc-portrait';
      p.setAttribute('aria-hidden', 'true');
      p.innerHTML = '<span class="npc-fig"><span class="spr"></span></span><span class="npc-name"></span>';
      host.prepend(p);
      S.observe(p);
    }
    const spr = p.querySelector('.npc-fig > .spr');
    if (spr.dataset.npc !== name) { spr.dataset.npc = name; S.setAct(spr, name, 'stand'); }
    p.querySelector('.npc-name').textContent = plate;
    return { p, fig: p.querySelector('.npc-fig'), spr, name, walker: p.querySelector('.npc-fig') };
  }
  function bar(host) {
    let b = host.querySelector(':scope > .bt-bar');
    if (!b) {
      b = document.createElement('div');
      b.className = 'bt-bar';
      b.setAttribute('aria-hidden', 'true');
      b.innerHTML = '<span class="bt-tier"></span><b class="bt-foe"></b><span class="bt-hp"><i></i></span><span class="bt-hearts"></span><p class="bt-say"></p>';
      host.querySelector(':scope > .npc-portrait') ? host.querySelector(':scope > .npc-portrait').after(b) : host.prepend(b);
    }
    return b;
  }
  function battle(target) {
    if (!Skin.active || !App || !target || !target._quiz || !window.MAPLE_SPRITES) return;
    const q = target._quiz.q, review = target.id === 'reviewStage';
    const host = target.querySelector(':scope > .card.quiz, :scope > .card.quiz-done');
    if (!host) return;
    let b = battles.get(q);
    if (!b) {
      const m = pick(S.kind('mob'), `${C.id}:review`);
      b = { foe: review ? (m && { name: m, tier: 'review' }) : foeFor(App.state.lesson), right: new Set(), last: null, n: q.items.length, over: false };
      battles.set(q, b);
    }
    if (!b.foe) return;
    const foeName = b.foe.tier === 'boss' ? `BOSS ${label(b.foe.name)}` : label(b.foe.name) || '怪物';
    if (q.i >= q.items.length) return victory(host, b, q);
    const prev = b.last, fx = { kind: null };
    b.last = { i: q.i, tries: q.tries };
    if (q.revealed && q.correct && !b.right.has(q.i)) { b.right.add(q.i); fx.kind = q.tries === 0 ? 'crit' : 'hit'; }
    else if (prev && prev.i === q.i && q.tries > prev.tries) fx.kind = q.revealed ? 'miss' : 'struck';
    const who = portrait(host, b.foe.name, foeName), el = bar(host);
    el.dataset.tier = b.foe.tier;
    el.querySelector('.bt-tier').textContent = TIER_NAME[b.foe.tier];
    el.querySelector('.bt-foe').textContent = foeName;
    const hp = b.n - b.right.size, hearts = q.revealed && !q.correct ? 0 : 2 - q.tries;
    el.querySelector('.bt-hp i').style.width = `${100 * hp / b.n}%`;
    el.querySelector('.bt-hearts').textContent = '♥'.repeat(hearts) + '♡'.repeat(2 - hearts);
    const say = el.querySelector('.bt-say');
    say.textContent = { crit: '爆擊！一次答對，怪物受到重創。', hit: '命中！第二次答對了。', struck: '被反擊了！還剩一顆心，看看提示再試一次。', miss: 'MISS……這題沒打中，讀完解析再往下。' }[fx.kind] ||
      (q.revealed ? '' : `${foeName} 擋在前面。答對一題打掉一格 HP。`);
    if (fx.kind === 'crit' || fx.kind === 'hit') {
      S.swapAct(who.spr, b.foe.name, 'hit');
      setTimeout(() => { if (who.spr.isConnected) S.swapAct(who.spr, b.foe.name, 'stand'); }, 450);
      damage(who.fig, fx.kind === 'crit');
    } else if (fx.kind === 'struck' && !reduce()) {
      host.classList.remove('is-struck'); void host.offsetWidth; host.classList.add('is-struck');
    }
    ['hit', 'die'].forEach(a => S.warm(b.foe.name, a));
  }
  function victory(host, b, q) {
    const fresh = !b.over;
    b.over = true;
    const win = b.right.size === b.n, foeName = label(b.foe.name) || '怪物';
    const hero = heroFor(`${C.id}:${App.state.lesson}:win`, true);
    const who = hero ? portrait(host, hero, jobOf(now.lv)) : null;
    const el = bar(host);
    el.dataset.tier = b.foe.tier;
    el.classList.add('is-over');
    el.classList.toggle('is-win', win);
    el.querySelector('.bt-tier').textContent = TIER_NAME[b.foe.tier];
    el.querySelector('.bt-foe').textContent = win ? `討伐成功！打倒了${foeName}` : `${foeName}撤退了`;
    el.querySelector('.bt-hp i').style.width = `${100 * (b.n - b.right.size) / b.n}%`;
    el.querySelector('.bt-hearts').textContent = '';
    el.querySelector('.bt-say').textContent = win ? '每一題都答對了，任務完成。' : `答對 ${b.right.size} / ${b.n} 題，任務照樣完成；答錯的題目在錯題本，複習時答對還能得經驗值。`;
    // 剛打完：主角歡呼。完成章節的經驗值由 celebrate 接手（它先執行，會連升級特效一起播）
    if (fresh && who) { victory.hero = who; setTimeout(() => { if (victory.told !== who) cheer(who, false); }, 0); }
  }

  /* ───────────── 收到 app 的事件：重算經驗值、播特效、更新公告 ───────────── */
  function celebrate(g, what) {
    if (!Skin.active) return;
    chat(g.gain > 0 ? gainLines(g, what) : pageLines());
    if (g.gain <= 0) return;
    // EXP 字樣出現在畫面上看得到的角色身上：測驗結束的主角、測驗中的怪物，否則章節標頭的主角
    const done = document.querySelector('.card.quiz-done > .npc-portrait .npc-fig'), foe = document.querySelector('.card.quiz > .npc-portrait .npc-fig');
    const head = scene && scene.party && scene.party.wrap.isConnected ? scene.party : null;
    expPop(done || foe || (head && head.cast[0].walker), g.gain);
    if (done && victory.hero && victory.hero.p.isConnected) { victory.told = victory.hero; cheer(victory.hero, g.up); }
    else if (head) cheer(head.cast[0], g.up);
  }
  const WHAT = { learn: '讀完觀念', lab: '第一次操作實驗', done: '完成測驗' };
  if (App) {
    document.addEventListener('cslab:progress', e => {
      const g = award(), d = e.detail;
      if (d.kind === 'done' && scene && scene.lid === d.lesson && scene.mob && scene.mob.wrap.isConnected && Skin.active) knockDown(scene.mob);
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
  }
  function decorate() {
    if (!Skin.active) return;
    others = othersExp();
    if (App) { mine = courseExp(); now = levelOf(others + mine); } else now = levelOf(others);
    makeHud();
    paintHud();
    chat(pageLines());
    if (!App) return;
    S.whenTable(() => {
      if (!window.MAPLE_SPRITES || !Skin.active) return;
      if (App.state.page === 'lesson') stageHead(); else scene = null;
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
