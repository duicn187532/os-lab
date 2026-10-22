/* CS LAB 外觀層：楓之谷外觀（shared/skin-maple.css）與原本學術外觀的切換、遊戲素材的載入，以及 NPC 精靈圖。
 * 只改外觀：不讀寫課程進度、測驗紀錄或實驗狀態。外觀選擇存在 localStorage 的 cslab.skin（'maple' | 'classic'），
 * 所有課程與入口網共用。這裡確認素材載得到才套用，否則維持學術外觀並隱藏切換按鈕；確認過的結果記在 cslab.art，
 * 頁面 <head> 的一行程式依這兩個鍵先加上 data-skin，之後開頁就不會閃一下原本外觀，沒有素材的部署也不會去要圖。
 * 載入順序：放在 shared/cslab-app.js 之後（沒有 cslab-app 的頁面，例如入口網，也可以單獨使用）。
 * 第二階段的擴充介面：window.CSLabSkin（見檔尾）與 cslab-app.js 發出的 cslab:* DOM 事件。 */
'use strict';
(function () {
  const root = document.documentElement;
  const KEY = 'cslab.skin';
  // 遊戲素材的唯一位置：self-research 已發布的 assets/maple/（同一網域）。skin-maple.css 的 url() 用同一個相對路徑。
  const MAPLE_BASE = new URL('../../self-research/assets/maple/', document.currentScript.src).href;
  const url = file => MAPLE_BASE + file;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const read = () => { try { return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'maple'; } catch (_) { return 'maple'; } };
  let skin = read(), artReady = false;
  const listeners = [];
  const active = () => skin === 'maple' && artReady;
  function apply() {
    if (active()) root.dataset.skin = 'maple'; else delete root.dataset.skin;
    document.querySelectorAll('.skin-btn').forEach(b => { b.hidden = !artReady; b.setAttribute('aria-pressed', String(skin === 'maple')); b.title = skin === 'maple' ? '切換為學術閱讀外觀' : '切換為楓之谷外觀'; });
    if (active()) loadTable(); else stopAll();
    listeners.forEach(fn => fn(active()));
  }
  function set(v) { skin = v === 'classic' ? 'classic' : 'maple'; try { localStorage.setItem(KEY, skin); } catch (_) { /* 私密模式 */ } apply(); }

  /* 切換按鈕：放在頁面的 [data-skin-slot]，或 CS LAB shell 頂列的主題按鈕之前 */
  function addButton() {
    const slot = document.querySelector('[data-skin-slot]') || document.getElementById('themeBtn');
    if (!slot || document.querySelector('.skin-btn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'icon-btn skin-btn'; b.hidden = true;
    b.setAttribute('aria-label', '楓之谷外觀'); b.textContent = '🍁';
    b.addEventListener('click', () => set(skin === 'maple' ? 'classic' : 'maple'));
    if (slot.matches('[data-skin-slot]')) slot.appendChild(b); else slot.before(b);
  }

  /* 素材探測：win9.png 載得到才啟用（GitHub Pages 以外的部署、或本機只開 os-lab 時會退回學術外觀） */
  const probe = new Image();
  const remember = ok => { try { if (ok) localStorage.setItem('cslab.art', '1'); else localStorage.removeItem('cslab.art'); } catch (_) { /* 私密模式 */ } };
  probe.onload = () => { artReady = true; remember(true); apply(); };
  probe.onerror = () => { artReady = false; remember(false); apply(); };
  probe.src = url('win9.png');

  /* ───────────── 精靈圖（沿用 self-research 的 sprites.js 與逐格播放方式）─────────────
   * sprites.js 只在楓之谷外觀啟用時載入；每張動作條在第一次需要時才下載。
   * 所有精靈圖都是裝飾：aria-hidden、不接收點擊；離開畫面或分頁隱藏時暫停，減少動態效果時只顯示第一格。 */
  let table = null, tableDone = false;
  const tableWait = [];
  function loadTable() {
    if (table) return;
    table = document.createElement('script');
    table.onload = table.onerror = () => { tableDone = true; tableWait.splice(0).forEach(fn => fn()); };
    table.src = url('sprites.js');
    document.head.appendChild(table);
  }
  const whenTable = fn => { if (tableDone) fn(); else { tableWait.push(fn); loadTable(); } };
  const spec = name => window.MAPLE_SPRITES && window.MAPLE_SPRITES[name];

  let live = [], clock = null;
  const TICK = 60;
  function tick() {
    if (document.hidden) return;
    live = live.filter(sp => {
      const el = sp.el;
      if (!el.isConnected) return false;
      if (el.closest('.is-off')) return true;
      sp.acc += TICK; if (sp.acc < sp.ms) return true;
      sp.acc = 0; sp.i = (sp.i + 1) % sp.n;
      el.style.backgroundPosition = `${-sp.w * sp.i}px 0`;
      return true;
    });
    if (!live.length) { clearInterval(clock); clock = null; }
  }
  function stopAll() { live = []; clearInterval(clock); clock = null; }
  function setAct(el, name, act) {
    const acts = spec(name).acts; if (!acts[act]) act = 'stand';
    const c = acts[act];
    el.style.backgroundImage = `url("${url(`spr-${name}-${act}.png`)}")`;
    el.style.backgroundPosition = '0 0';
    el.style.setProperty('--w', c[0]); el.style.setProperty('--h', c[1]);
    live = live.filter(sp => sp.el !== el);
    if (c[2] < 2 || reduceMotion.matches || !active()) return;
    live.push({ el, w: c[0], n: c[2], i: 0, acc: 0, ms: 170 });
    if (!clock) clock = setInterval(tick, TICK);
  }
  // 換動作前先下載並解碼新的動作條，舊畫格留到那時候，避免閃空白；最後一次要求為準
  const strips = {};
  function fetchStrip(name, act) {
    const u = url(`spr-${name}-${act}.png`);
    if (!strips[u]) { const img = new Image(); img.src = u; strips[u] = (img.decode ? img.decode() : new Promise(ok => { img.onload = img.onerror = ok; })).catch(() => {}); }
    return strips[u];
  }
  function swapAct(el, name, act) {
    if (!spec(name).acts[act]) act = 'stand';
    const want = el.dataset.want = `${name}/${act}`;
    fetchStrip(name, act).then(() => { if (el.dataset.want === want) setAct(el, name, act); });
  }
  const offscreen = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '120px 0px' }) : null;

  // NPC 名單：sprites.js 裡 kind 為 npc 的角色（名牌用台灣版名稱或角色描述）；依鍵值固定挑選，同一章每次都是同一位
  const npcs = () => Object.keys(window.MAPLE_SPRITES || {}).filter(k => spec(k).kind === 'npc');
  function pickNpc(key, avoid) {
    const list = npcs().filter(n => n !== avoid); if (!list.length) return null;
    let h = 7; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return list[h % list.length];
  }
  // 在宿主元素放入 NPC 肖像（宿主的 CSS 決定是對話框的肖像欄還是站在框上）；quest：new | open | done
  function npc(host, name, quest) {
    if (!active() || !host || !name || !spec(name)) return null;
    let p = host.querySelector(':scope > .npc-portrait');
    if (!p) {
      p = document.createElement('span'); p.className = 'npc-portrait'; p.setAttribute('aria-hidden', 'true');
      p.innerHTML = '<span class="npc-fig"><span class="spr"></span></span><span class="npc-name"></span>';
      host.prepend(p);
      if (offscreen) offscreen.observe(p);
    }
    const spr = p.querySelector('.npc-fig > .spr');
    if (spr.dataset.npc !== name) { spr.dataset.npc = name; delete spr.dataset.want; fetchStrip(name, 'stand').then(() => { if (spr.dataset.npc === name && !spr.dataset.want) setAct(spr, name, 'stand'); }); }
    p.querySelector('.npc-name').textContent = spec(name).role || spec(name).label || 'NPC';
    let mark = p.querySelector('.npc-quest > .spr');
    if (quest && spec(`quest-${quest}`)) {
      if (!mark) { const q = document.createElement('span'); q.className = 'npc-quest'; q.innerHTML = '<span class="spr"></span>'; p.querySelector('.npc-fig').appendChild(q); mark = q.firstChild; }
      if (mark.dataset.q !== quest) { mark.dataset.q = quest; swapAct(mark, `quest-${quest}`, 'stand'); }
    } else if (mark) mark.parentElement.remove();
    return { el: p, spr, say: on => swapAct(spr, name, on ? 'say' : 'stand') };
  }

  /* ───────────── CS LAB shell（cslab-app.js）的裝飾 ─────────────
   * app 每次重繪都會換掉內容，所以收到 cslab:render / cslab:quiz-view 就重新放 NPC；楓之谷外觀關閉時什麼都不做。 */
  const App = () => window.CSApp;
  const course = () => App() ? App().course.id : 'cslab';
  function decorate() {
    if (!active() || !App()) return;
    whenTable(() => {
      const st = App().state;
      if (st.page === 'home') npc(document.querySelector('.hero'), pickNpc(`${course()}:home`), 'new');
      if (st.page === 'lesson' && st.tab === 'learn') npc(document.querySelector('#stage .card.analogy'), chapterNpc(st.lesson), 'new');
      const quiz = document.querySelector('#stage, #reviewStage');
      if (quiz && quiz._quiz) quizNpc(quiz);
    });
  }
  const chapterNpc = id => pickNpc(`${course()}:${id}`);
  function quizNpc(target) {
    if (!active() || !App() || !target || !target._quiz) return;
    whenTable(() => {
      const { q } = target._quiz, finished = q.i >= q.items.length;
      const host = target.querySelector(':scope > .card.quiz, :scope > .card.quiz-done'); if (!host) return;
      const lid = finished ? (App().state.page === 'lesson' ? App().state.lesson : 'review') : q.items[q.i][0];
      const who = npc(host, target.id === 'reviewStage' ? pickNpc(`${course()}:review`) : chapterNpc(lid), finished ? 'done' : q.revealed ? 'open' : 'new');
      // 解析出現時 NPC 換成說話的畫格
      if (who) who.say(!finished && q.revealed);
    });
  }
  document.addEventListener('cslab:render', decorate);
  document.addEventListener('cslab:quiz-view', e => quizNpc(e.detail.target));
  // 測驗完成時，章節標頭的任務圖示（可接受 → 進行中 → 可完成）跟著更新，不必等下一次重繪
  document.addEventListener('cslab:progress', e => {
    const head = document.querySelector('.lesson-head'), A = App();
    if (head && A && A.state.page === 'lesson' && A.state.lesson === e.detail.lesson) head.dataset.status = A.questState(A.byId[e.detail.lesson]);
  });
  listeners.push(on => { if (on) decorate(); });
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) stopAll(); });

  addButton();
  apply();

  // 擴充介面（第二階段 RPG 系統）：查詢 / 切換外觀、取得素材網址、放置 NPC，並在外觀切換時收到通知。
  window.CSLabSkin = {
    get skin() { return skin; }, get active() { return active(); }, get artReady() { return artReady; },
    set, url, npc: (host, key, quest) => new Promise(ok => whenTable(() => ok(npc(host, pickNpc(key), quest)))),
    onChange: fn => listeners.push(fn)
  };
})();
