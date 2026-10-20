/* CS LAB 共用應用程式：路由、進度、課程頁、測驗、錯題本、術語、公式、筆記與搜尋。
 * 每門課提供 window.CSLAB_COURSE = { id, name, mark, storageKey, eyebrow, heroTitle, heroLead, disclaimer, footer, data }
 * data = { units, lessons, glossary, formulas }；lesson 欄位見 README「課程資料格式」，除 id、unit、title、quiz 外皆可省略。 */
'use strict';
(function () {
  const C = window.CSLAB_COURSE, D = C.data, Labs = window.CSLab, { h } = Labs.ui;
  const lessons = D.lessons, byId = Object.fromEntries(lessons.map(l => [l.id, l]));
  const glossaryList = D.glossary || [], formulas = D.formulas || [];
  const units = D.units || [...new Set(lessons.map(l => l.unit))];
  const pos = id => lessons.findIndex(l => l.id === id);
  const glossary = Object.fromEntries(glossaryList.map(g => [g.id, g]));
  const $ = id => document.getElementById(id);
  const labName = l => Labs.registry[l.lab]?.title || '';
  const pad = n => String(n).padStart(2, '0');

  /* ───────────── 頁面骨架 ───────────── */
  function mount() {
    const tools = [['#/labs', '🧪 實驗總覽'], ['#/review', '↺ 錯題複習 <span class="badge" id="wrongBadge" hidden>0</span>'], formulas.length && ['#/formulas', '∑ 公式速查'], glossaryList.length && ['#/glossary', '🔤 術語表'], ['#/notes', '✎ 我的筆記']].filter(Boolean);
    document.body.insertAdjacentHTML('afterbegin', `<a class="skip-link" href="#main">跳至課程內容</a>
<div class="app">
  <aside class="side" id="side" aria-label="章節選單">
    <div class="brand"><a class="brand-mark" href="#/" aria-label="${h(C.name)} 課程地圖">${h(C.mark)}</a><div><a class="brand-name" href="#/">${h(C.name)}</a><a class="brand-sub" href="../">← CS LAB 入口</a></div></div>
    <div class="side-progress"><div class="row between"><span id="progressNum"></span><span id="progressPct" class="muted"></span></div><div class="bar" role="progressbar" aria-label="完成章節比例" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="progressBar"></i></div></div>
    <nav class="side-links" aria-label="學習工具">${tools.map(([href, t]) => `<a href="${href}">${t}</a>`).join('')}</nav>
    <nav id="sidebarNav" aria-label="課程章節"></nav>
    <p class="side-foot">${C.footer || '完全離線的靜態網站 · 進度只存在此瀏覽器'}</p>
  </aside>
  <div class="backdrop" id="backdrop"></div>
  <main class="main" id="main" tabindex="-1">
    <header class="topbar"><button type="button" class="icon-btn menu-btn" id="menu" aria-label="開啟章節選單" aria-controls="side" aria-expanded="false">☰</button><div class="crumb" id="crumb"></div><button type="button" class="search-btn" id="searchBtn" aria-label="搜尋（快捷鍵 /）"><span>⌕ 搜尋章節、術語、實驗</span><kbd>/</kbd></button><button type="button" class="icon-btn" id="helpBtn" aria-label="鍵盤快捷鍵說明">?</button><button type="button" class="icon-btn" id="themeBtn" aria-label="切換主題">☾</button></header>
    <div class="content" id="content"></div>
  </main>
</div>
<button type="button" class="scrolltop" id="scrollTop" aria-label="回到頂部">↑</button>
<dialog class="palette" id="palette" aria-label="搜尋"><form method="dialog" class="palette-box"><input id="paletteInput" type="search" placeholder="搜尋章節、術語、實驗…" aria-label="搜尋" aria-controls="paletteList" autocomplete="off"><ul id="paletteList" role="listbox"></ul><p class="palette-foot"><kbd>↑</kbd><kbd>↓</kbd> 選擇　<kbd>Enter</kbd> 前往　<kbd>Esc</kbd> 關閉</p></form></dialog>
<dialog class="help" id="help" aria-labelledby="helpTitle"><form method="dialog"><h2 id="helpTitle">鍵盤快捷鍵</h2><dl class="keys"><dt><kbd>/</kbd> 或 <kbd>Ctrl</kbd>+<kbd>K</kbd></dt><dd>搜尋章節、術語與實驗</dd><dt><kbd>[</kbd> <kbd>]</kbd></dt><dd>上一章 / 下一章</dd><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>在「觀念 / 實驗 / 測驗」頁籤間切換（焦點在頁籤上時）</dd><dt><kbd>A</kbd>–<kbd>D</kbd></dt><dd>測驗作答</dd><dt><kbd>Enter</kbd></dt><dd>測驗下一題</dd><dt><kbd>?</kbd></dt><dd>開啟這個說明</dd></dl><p class="muted small">學習進度、筆記與錯題本存在這個瀏覽器的 localStorage，不會上傳。可在「我的筆記」頁面備份與還原。</p><div class="row"><button class="btn primary" value="close">知道了</button></div></form></dialog>`);
    document.querySelector('noscript')?.remove();
  }
  mount();

  /* ───────────── 本機儲存（各課沿用舊鍵值，舊進度與筆記不會遺失） ───────────── */
  const KEY = C.storageKey;
  const blank = () => ({ done: {}, notes: {}, last: lessons[0].id, learn: {}, lab: {}, wrong: {}, guess: {}, theme: null });
  function load() { try { const s = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); if (s.theme !== 'light' && s.theme !== 'dark') s.theme = null; return s; } catch (_) { return blank(); } }
  const store = load();
  let saveTimer = null;
  function save(now) { clearTimeout(saveTimer); const write = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) { /* 私密模式等情況下忽略 */ } }; if (now) write(); else saveTimer = setTimeout(write, 250); }
  const countDone = () => lessons.filter(l => store.done[l.id]).length;
  const wrongKeys = () => Object.keys(store.wrong).filter(k => { const [lid, qi] = k.split(':').map(Number); return byId[lid] && byId[lid].quiz[qi]; });

  function recordAnswer(lid, qi, ok) {
    const k = `${lid}:${qi}`;
    if (ok) delete store.wrong[k]; else store.wrong[k] = { n: (store.wrong[k]?.n || 0) + 1, at: Date.now() };
    save(); renderSidebarMeta();
  }
  function pickReview(n) {
    const wrong = wrongKeys().sort((a, b) => store.wrong[a].at - store.wrong[b].at).map(k => k.split(':').map(Number));
    const pool = []; lessons.forEach(l => { if (l.lab !== 'review') l.quiz.forEach((_, qi) => pool.push([l.id, qi])); });
    const shuffled = pool.filter(([a, b]) => !wrong.some(([c, d]) => a === c && b === d)).sort(() => Math.random() - 0.5);
    return [...wrong.slice(0, Math.ceil(n / 2)), ...shuffled].slice(0, n).sort(() => Math.random() - 0.5);
  }
  // 選項顯示順序：消除「正解總在同一位置」的偏差，又讓每次看到的順序一致（只取決於課程 id 與教材）。
  // 先替每題決定正解的顯示位置：章內輪流用遍每個位置、全課程各位置次數也均衡（同分時以固定種子決定），再以固定種子打亂其餘選項。
  function seeded(key) {
    let seed = 2166136261; for (const ch of key) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619); // FNV-1a
    return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // mulberry32
  }
  const shuffle = (a, rand) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let answerSlots = null;
  function answerSlot(lid, qi) {
    if (!answerSlots) {
      answerSlots = {}; const total = [];
      for (const l of lessons) {
        const rand = seeded(`${C.id}:${l.id}`), local = [];
        for (const i of shuffle(l.quiz.map((_, i) => i), rand)) {
          const slots = [...l.quiz[i][1].keys()], score = p => (local[p] || 0) * 1e6 + (total[p] || 0);
          const min = Math.min(...slots.map(score)), best = slots.filter(p => score(p) === min), p = best[Math.floor(rand() * best.length)];
          local[p] = (local[p] || 0) + 1; total[p] = (total[p] || 0) + 1; answerSlots[`${l.id}:${i}`] = p;
        }
      }
    }
    return answerSlots[`${lid}:${qi}`];
  }
  function choiceOrder(lid, qi) {
    const [, options, answer] = byId[lid].quiz[qi];
    const others = shuffle([...options.keys()].filter(i => i !== answer), seeded(`${C.id}:${lid}:${qi}`));
    others.splice(answerSlot(lid, qi), 0, answer);
    return others;
  }
  const chapterLabel = id => `第 ${pos(id) + 1} 章 · ${byId[id].title}`;
  const labCtx = { lesson: id => byId[id], chapterLabel, pickReview, recordAnswer, choiceOrder };

  /* ───────────── 狀態與路由 ───────────── */
  const state = { page: 'home', lesson: lessons[0].id, tab: 'learn', lab: null, labFor: null, history: [], quiz: null, reviewQuiz: null, palette: null };
  const TABS = [['learn', '① 觀念'], ['lab', '② 實驗'], ['quiz', '③ 測驗']];
  const PAGES = ['glossary', 'formulas', 'review', 'notes', 'labs'];

  function parseHash() {
    const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (p[0] === 'ch' && byId[+p[1]] !== undefined) return { page: 'lesson', lesson: +p[1], tab: TABS.some(t => t[0] === p[2]) ? p[2] : 'learn' };
    if (PAGES.includes(p[0])) return { page: p[0] };
    return { page: 'home' };
  }
  const hashFor = r => r.page === 'lesson' ? `#/ch/${r.lesson}/${r.tab || 'learn'}` : r.page === 'home' ? '#/' : `#/${r.page}`;
  function go(route, opts = {}) {
    const target = hashFor(route);
    if (location.hash !== target) { if (opts.replace) history.replaceState(null, '', target); else history.pushState(null, '', target); }
    applyRoute(route, opts);
  }
  // 錨點連結觸發 hashchange（部分瀏覽器也會觸發 popstate），以 lastHash 去除重複。
  let lastHash = null;
  const onHash = () => { if (location.hash === lastHash) return; applyRoute(parseHash()); };
  window.addEventListener('popstate', onHash);
  window.addEventListener('hashchange', onHash);
  function applyRoute(r, opts = {}) {
    stopPlayback(); lastHash = location.hash;
    const sameLesson = r.page === 'lesson' && state.page === 'lesson' && state.lesson === r.lesson;
    state.page = r.page;
    if (r.page === 'lesson') {
      if (!sameLesson) { state.lesson = r.lesson; state.quiz = null; }
      if (state.labFor !== r.lesson) { state.lab = null; state.labFor = r.lesson; state.history = []; }
      state.tab = r.tab; store.last = r.lesson; save();
    }
    if (r.page === 'review' && !opts.keepReview) state.reviewQuiz = null;
    setMenu(false); render();
    if (!opts.keepScroll) {
      if (sameLesson) document.querySelector('.tabs')?.scrollIntoView({ block: 'nearest', behavior: motion() });
      else window.scrollTo({ top: 0, behavior: 'auto' });
      if (!sameLesson) $('main').focus({ preventScroll: true });
    }
  }
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const navigate = (id, tab = 'learn') => go({ page: 'lesson', lesson: id, tab });

  /* ───────────── 版面 ───────────── */
  const TITLES = { glossary: '術語表', formulas: '公式速查', review: '錯題複習', notes: '我的筆記', labs: '實驗總覽' };
  function render() {
    renderSidebar();
    document.body.dataset.page = state.page;
    ({ home: renderHome, lesson: renderLesson, glossary: renderGlossary, formulas: renderFormulas, review: renderReview, notes: renderNotes, labs: renderLabIndex })[state.page]();
    document.title = state.page === 'lesson' ? `${byId[state.lesson].title}｜${C.name}` : state.page === 'home' ? `${C.name} — ${C.title}` : `${TITLES[state.page]}｜${C.name}`;
  }
  const crumb = html => { $('crumb').innerHTML = html; };
  const crumbFor = label => crumb(`<a href="#/">課程地圖</a> / <b>${label}</b>`);

  function renderSidebarMeta() {
    const done = countDone(), pct = Math.round(done / lessons.length * 100);
    $('progressNum').textContent = `${done} / ${lessons.length} 章`;
    $('progressPct').textContent = pct + '%';
    $('progressBar').style.width = pct + '%';
    $('progressBar').parentElement.setAttribute('aria-valuenow', pct);
    const w = wrongKeys().length, badge = $('wrongBadge'); badge.textContent = w; badge.hidden = !w;
  }
  const chapterStatus = l => ({ learn: !!store.learn[l.id], lab: !!store.lab[l.id], quiz: !!store.done[l.id] });
  const dots = l => { const s = chapterStatus(l); return `<span class="dots" aria-label="觀念${s.learn ? '已讀' : '未讀'}、實驗${s.lab ? '已做' : '未做'}、測驗${s.quiz ? '完成' : '未完成'}"><i class="${s.learn ? 'on' : ''}"></i><i class="${s.lab ? 'on' : ''}"></i><i class="${s.quiz ? 'on' : ''}"></i></span>`; };
  function renderSidebar() {
    renderSidebarMeta();
    $('sidebarNav').innerHTML = units.map(unit => {
      const group = lessons.filter(l => l.unit === unit); if (!group.length) return '';
      return `<div class="nav-group"><div class="nav-unit">${h(unit)}</div>${group.map(l => { const on = state.page === 'lesson' && state.lesson === l.id; return `<a class="nav-item${on ? ' active' : ''}${store.done[l.id] ? ' done' : ''}" href="#/ch/${l.id}/learn"${on ? ' aria-current="page"' : ''}><span class="nav-num">${pad(pos(l.id) + 1)}</span><span class="nav-text"><b>${h(l.title)}</b>${l.short ? `<small>${h(l.short)}</small>` : ''}</span>${dots(l)}</a>`; }).join('')}</div>`;
    }).join('');
    document.querySelectorAll('.side-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === hashFor({ page: state.page })));
  }

  /* ───────────── 首頁 ───────────── */
  function renderHome() {
    crumb('<b>課程地圖</b>');
    const done = countDone(), last = byId[store.last] ? store.last : lessons[0].id, started = done > 0 || Object.keys(store.learn).length > 0;
    const next = lessons.find(l => !store.done[l.id]) || lessons[0];
    const totalQ = lessons.reduce((a, l) => a + l.quiz.length, 0), w = wrongKeys().length;
    const labCount = new Set(lessons.map(l => l.lab)).size;
    const lead = (C.heroLead || '').replace('{labs}', labCount).replace('{chapters}', lessons.length);
    const tools = [['#/review', '錯題複習', w ? `${w} 題待複習` : '目前沒有錯題'], formulas.length && ['#/formulas', '公式速查', `${formulas.reduce((a, g) => a + g.items.length, 0)} 個公式`], glossaryList.length && ['#/glossary', '術語表', `${glossaryList.length} 個中英對照`], ['#/notes', '我的筆記', '匯出 Markdown'], ['#/labs', '實驗總覽', `${labCount} 個互動實驗`]].filter(Boolean).slice(0, 4);
    $('content').innerHTML = `
    <section class="hero">
      <p class="eyebrow">${h(C.eyebrow || C.name)}</p>
      <h1>${C.heroTitle}</h1>
      <p class="lead">${h(lead)}</p>
      <div class="row">${started ? `<a class="btn primary" href="#/ch/${last}/learn">繼續：${h(byId[last].title)} →</a><a class="btn secondary" href="#/ch/${next.id}/learn">下一個未完成章節</a>` : `<a class="btn primary" href="#/ch/${lessons[0].id}/learn">從第 1 章開始 →</a><a class="btn secondary" href="#/labs">先逛逛互動實驗</a>`}</div>
      <div class="hero-stats"><div><b>${lessons.length}</b><span>章節</span></div><div><b>${totalQ}</b><span>測驗題</span></div><div><b>${labCount}</b><span>互動實驗</span></div>${glossaryList.length ? `<div><b>${glossaryList.length}</b><span>術語</span></div>` : ''}</div>
    </section>
    <div class="home-grid">
      <section class="card progress-card"><h2>你的進度</h2><div class="ring" style="--p:${done / lessons.length}"><b>${Math.round(done / lessons.length * 100)}%</b></div><p>${done} / ${lessons.length} 章完成測驗</p><p class="muted">每章三個圓點依序代表：觀念已讀、實驗做過、測驗完成。</p></section>
      <section class="card"><h2>學習方法</h2><ol class="method"><li><b>先預測</b>：每章開頭先寫下你的猜測，錯了才記得住。</li><li><b>再操作</b>：在模擬器中改參數、逐步執行，對照自己的預測。</li><li><b>後檢核</b>：每題兩次機會；答錯的題目自動進入錯題本。</li><li><b>隔天複習</b>：用混合練習與錯題複習把記憶拉回來。</li></ol></section>
      <section class="card"><h2>工具箱</h2><div class="tools">${tools.map(([href, t, s]) => `<a href="${href}"><b>${t}</b><span>${s}</span></a>`).join('')}</div></section>
    </div>
    <h2 class="section-title">完整學習地圖</h2>
    <p class="muted small">主線：${units.filter(u => lessons.some(l => l.unit === u)).map(h).join(' → ')}</p>
    <div class="course-grid">${lessons.map(l => `<a class="course-card${store.done[l.id] ? ' done' : ''}" href="#/ch/${l.id}/learn"><div class="cc-top"><span class="cc-num">CH ${pad(pos(l.id) + 1)} · ${h(l.unit)}</span>${dots(l)}</div><h4>${h(l.title)}</h4><p>${h(l.short || l.ask || '')}</p><div class="cc-meta">${l.minutes ? `<span>⏱ ${l.minutes} 分鐘</span>` : ''}<span>🧪 ${h(labName(l))}</span></div></a>`).join('')}</div>
    ${C.disclaimer ? `<p class="disclaimer">${h(C.disclaimer)}</p>` : ''}`;
  }

  function renderLabIndex() {
    crumbFor('實驗總覽');
    $('content').innerHTML = `<header class="page-head"><h1>互動實驗總覽</h1><p class="lead">每一章都有對應的模擬器。點任一個直接進入該章的實驗頁。</p></header>
    <div class="lab-grid">${lessons.map(l => `<a class="lab-card" href="#/ch/${l.id}/lab"><span class="cc-num">CH ${pad(pos(l.id) + 1)} · ${h(l.unit)}</span><h3>${h(labName(l))}</h3><p>${h(Labs.registry[l.lab]?.prompt || '')}</p>${store.lab[l.id] ? '<span class="tag ok">做過了</span>' : ''}</a>`).join('')}</div>`;
  }

  /* ───────────── 章節頁 ───────────── */
  function renderLesson() {
    const l = byId[state.lesson], p = pos(l.id), prev = lessons[p - 1], next = lessons[p + 1];
    crumb(`<a href="#/">課程地圖</a> / ${h(l.unit)} / <b>第 ${p + 1} 章</b>`);
    $('content').innerHTML = `
    <header class="lesson-head">
      <div class="lh-meta"><span class="cc-num">CHAPTER ${pad(p + 1)} · ${h(l.unit)}</span>${dots(l)}</div>
      <h1>${h(l.title)}</h1>
      ${l.short ? `<p class="lead">${h(l.short)}</p>` : ''}
      <div class="chips">${l.minutes ? `<span>⏱ 約 ${l.minutes} 分鐘</span>` : ''}<span>🧪 ${h(labName(l))}</span><span>✎ ${l.quiz.length} 題測驗</span></div>
    </header>
    <nav class="tabs" role="tablist" aria-label="本章學習階段">${TABS.map(([k, t]) => `<a role="tab" id="tab-${k}" href="#/ch/${l.id}/${k}" aria-selected="${state.tab === k}" aria-controls="stage" tabindex="${state.tab === k ? 0 : -1}" class="${chapterStatus(l)[k] ? 'complete' : ''}">${t}</a>`).join('')}</nav>
    <div id="stage" role="tabpanel" aria-labelledby="tab-${state.tab}"></div>
    <nav class="pager" aria-label="章節切換">${prev ? `<a class="pager-link" href="#/ch/${prev.id}/learn"><small>← 上一章</small><b>${h(prev.title)}</b></a>` : '<span></span>'}${next ? `<a class="pager-link next" href="#/ch/${next.id}/learn"><small>下一章 →</small><b>${h(next.title)}</b></a>` : `<a class="pager-link next" href="#/review"><small>全部讀完了 →</small><b>前往錯題複習</b></a>`}</nav>`;
    ({ learn: renderLearn, lab: renderLab, quiz: renderQuiz })[state.tab](l);
  }

  function renderLearn(l) {
    const code = Array.isArray(l.code) ? l.code : l.code ? [l.codeLang || 'Code', l.code] : null;
    const details = (l.details || []).map(d => Array.isArray(d) ? d : [null, d]);
    const card = (cls, label, body) => `<section class="card ${cls}"><h2 class="label">${label}</h2>${body}</section>`;
    $('stage').innerHTML = [
      l.goals?.length && card('goals', '🎯 學完這一章，你能夠…', `<ul>${l.goals.map(g => `<li>${h(g)}</li>`).join('')}</ul>`),
      l.ask && card('ask', '❔ 先想一想', `<p class="ask-q">${h(l.ask)}</p><label class="guess"><span>寫下你現在的猜測（讀完再回來對照，只存在這台裝置）</span><textarea id="guessArea" rows="2" placeholder="我覺得……">${h(store.guess[l.id] || '')}</textarea></label>`),
      l.analogy && card('analogy', '✦ 生活類比（ELI5）', `<p>${h(l.analogy)}</p>`),
      l.why && card('', l.whyLabel || '⚙ 正式原理：這個概念到底是什麼？', `<p>${h(l.why)}</p>`),
      details.length && `<h2 class="section-title">深入原理</h2>` + (details.every(d => d[0]) ? `<div class="detail-grid">${details.map(d => `<article class="detail"><h3>${h(d[0])}</h3><p>${h(d[1])}</p></article>`).join('')}</div>` : `<section class="card"><ul class="concepts">${details.map(d => `<li>${d[0] ? `<b>${h(d[0])}</b>：` : ''}${h(d[1])}</li>`).join('')}</ul></section>`),
      l.steps?.length && card('', '▤ 一步一步還原流程', `<ol class="timeline">${l.steps.map(s => `<li>${h(s)}</li>`).join('')}</ol>`),
      l.worked && card('worked', '✍ 範例演練', `<p>${h(l.worked)}</p>`),
      l.caveat && `<aside class="callout warn"><b>⚠ 常見誤解 / 適用界線</b><p>${h(l.caveat)}</p></aside>`,
      code && `<section class="code-card"><div class="code-head"><span>${h(code[0])}</span><button type="button" class="btn ghost sm" id="copyCode">複製</button></div><pre><code>${h(code[1])}</code></pre></section>`,
      l.summary?.length && card('summary', '✓ 重點回顧', `<ul>${l.summary.map(s => `<li>${h(s)}</li>`).join('')}</ul>`),
      l.terms?.length && card('', '🔤 關鍵術語', `<div class="term-chips">${l.terms.filter(t => glossary[t]).map(t => `<button type="button" class="term-chip" data-term="${t}" aria-expanded="false">${h(glossary[t].zh)}<small>${h(glossary[t].en)}</small></button>`).join('')}</div><div id="termDef" class="term-def" hidden></div>`),
      card('', '✎ 用自己的話解釋這一章', `${l.ask ? `<p class="muted">${h(l.ask)}</p>` : ''}<textarea id="noteArea" class="note-area" rows="5" placeholder="試著不看上面的內容，用三到五句話解釋。">${h(store.notes[l.id] || '')}</textarea><p class="muted small" id="noteStatus">筆記自動儲存在這個瀏覽器。${store.guess[l.id] ? '別忘了對照你一開始的猜測。' : ''}</p>`),
      `<div class="cta"><a class="btn primary" href="#/ch/${l.id}/lab">進入互動實驗 →</a><a class="btn secondary" href="#/ch/${l.id}/quiz">直接挑戰測驗</a></div><div id="readEnd" aria-hidden="true"></div>`
    ].filter(Boolean).join('');
    observeRead(l.id);
  }
  let readObserver = null;
  function observeRead(id) {
    readObserver?.disconnect();
    if (store.learn[id] || !('IntersectionObserver' in window)) return;
    readObserver = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { markLearn(id); readObserver.disconnect(); } });
    readObserver.observe($('readEnd'));
  }
  function markLearn(id) { if (store.learn[id]) return; store.learn[id] = Date.now(); save(); renderSidebar(); document.querySelector('#tab-learn')?.classList.add('complete'); }

  /* ───────────── 互動實驗 ───────────── */
  const labDef = () => Labs.registry[byId[state.lesson].lab];
  function renderLab() {
    const def = labDef();
    if (!def) { $('stage').innerHTML = '<section class="card"><p class="muted">這一章的實驗尚未提供。</p></section>'; return; }
    if (!state.lab) state.lab = def.init(labCtx);
    $('stage').innerHTML = `<section class="lab">
      <header class="lab-head"><div><span class="cc-num">INTERACTIVE LAB</span><h2>${h(def.title)}</h2></div><div class="lab-tools"><button type="button" class="btn ghost sm" id="undoLab" aria-label="回上一步">↶ 上一步</button><button type="button" class="btn ghost sm" id="resetLab">↻ 重設</button></div></header>
      <div class="predict"><b>先預測</b><p>${h(def.prompt)}</p></div>
      ${def.auto ? `<div class="playback" aria-label="自動播放控制"><button type="button" class="btn secondary sm" id="playLab" aria-pressed="false">▶ 自動播放</button><label class="field inline"><span>速度</span><select class="select" id="playSpeed"><option value="1400">慢</option><option value="800" selected>標準</option><option value="350">快</option></select></label><span class="muted small">每次前進一步；隨時可暫停或「上一步」回看。</span></div>` : ''}
      <div id="labBody" class="lab-body" aria-live="polite"></div>
      <p class="muted small">這是刻意簡化的教學模型，用來建立直覺，不能取代正式的定義、證明或真實系統實驗。</p></section>`;
    drawLab();
  }
  function drawLab() {
    const body = $('labBody'); if (!body) return;
    Labs.morph(body, labDef().view(state.lab, labCtx));
    const undo = $('undoLab'); if (undo) undo.disabled = !state.history.length;
  }
  function labMutate(fn, record = true) {
    if (record) { state.history.push(JSON.stringify(state.lab)); if (state.history.length > 150) state.history.shift(); }
    fn(state.lab);
    if (!store.lab[state.lesson]) { store.lab[state.lesson] = Date.now(); save(); renderSidebar(); document.querySelector('#tab-lab')?.classList.add('complete'); }
    drawLab();
  }
  function labAct(action, arg) { const def = labDef(); if (def?.act) labMutate(s => def.act(s, action, arg, labCtx)); }

  let playTimer = null, playDelay = 800;
  function stopPlayback() { clearTimeout(playTimer); playTimer = null; const b = $('playLab'); if (b) { b.textContent = '▶ 自動播放'; b.setAttribute('aria-pressed', 'false'); } }
  function playTick() {
    const def = labDef();
    if (state.page !== 'lesson' || state.tab !== 'lab' || !def?.auto || def.auto.done(state.lab)) { stopPlayback(); return; }
    labAct(def.auto.action);
    if (def.auto.done(state.lab)) stopPlayback(); else playTimer = setTimeout(playTick, playDelay);
  }
  function togglePlayback() {
    if (playTimer) { stopPlayback(); return; }
    const def = labDef(); if (!def?.auto) return;
    if (def.auto.done(state.lab)) labMutate(s => Object.assign(s, def.init(labCtx), keepSettings(s)));
    const b = $('playLab'); b.textContent = '⏸ 暫停'; b.setAttribute('aria-pressed', 'true');
    playTimer = setTimeout(playTick, Math.min(playDelay, 400));
  }
  // 播放到底後再按播放：保留使用者設定，只把進度歸零。
  function keepSettings(s) { const keep = { ...s }; ['t', 'k', 'i'].forEach(k => { if (k in keep) keep[k] = 0; }); if ('inIsr' in keep) { keep.inIsr = false; keep.irq = false; keep.log = keep.log.slice(0, 1); } return keep; }

  /* ───────────── 測驗 ───────────── */
  const newQuiz = items => ({ items, i: 0, tries: 0, picked: [], revealed: false, correct: false, first: 0 });
  function renderQuiz(l) {
    if (!state.quiz) state.quiz = newQuiz(l.quiz.map((_, qi) => [l.id, qi]));
    drawQuiz($('stage'), state.quiz, {
      onFinish: q => { store.done[l.id] = { first: q.first, total: q.items.length, at: new Date().toISOString() }; save(true); renderSidebar(); document.querySelector('#tab-quiz')?.classList.add('complete'); },
      finishHtml: () => { const next = lessons[pos(l.id) + 1]; return `<div class="row center"><button type="button" class="btn secondary" data-quiz="retry">再做一次</button>${next ? `<a class="btn primary" href="#/ch/${next.id}/learn">前往下一章：${h(next.title)} →</a>` : '<a class="btn primary" href="#/review">前往錯題複習 →</a>'}</div>`; }
    });
  }
  function drawQuiz(target, q, hooks) {
    if (q.i >= q.items.length) {
      const pct = Math.round(q.first / q.items.length * 100);
      target.innerHTML = `<section class="card quiz-done"><div class="big-check">✓</div><h2>完成 ${q.items.length} 題</h2><p class="lead">第一次就答對 <b>${q.first}</b> 題（${pct}%）。${pct === 100 ? '非常扎實！' : pct >= 50 ? '答錯過的題目已加入錯題本，隔天再複習一次效果最好。' : '建議回到「觀念」與「實驗」再走一遍，然後再挑戰。'}</p>${hooks.finishHtml(q)}</section>`;
      return;
    }
    const [lid, qi] = q.items[q.i], item = byId[lid].quiz[qi], ready = q.revealed, order = choiceOrder(lid, qi);
    target.innerHTML = `<section class="card quiz">
      <div class="quiz-top"><span class="muted">第 ${q.i + 1} / ${q.items.length} 題${hooks.showChapter ? ` · ${h(chapterLabel(lid))}` : ''}</span><div class="quiz-progress" aria-hidden="true">${q.items.map((_, i) => `<i class="${i < q.i ? 'on' : i === q.i ? 'cur' : ''}"></i>`).join('')}</div></div>
      <h2 class="q">${h(item[0])}</h2>
      <div class="choices" role="group" aria-label="選項">${order.map((i, p) => { const picked = q.picked.includes(i); const cls = ready ? (i === item[2] ? ' right' : picked ? ' wrong' : '') : picked ? ' wrong' : ''; return `<button type="button" class="choice${cls}" data-answer="${i}" data-key="${String.fromCharCode(65 + p)}"${ready || picked ? ' disabled' : ''}><span class="key">${String.fromCharCode(65 + p)}</span>${h(item[1][i])}</button>`; }).join('')}</div>
      ${q.tries === 1 && !ready ? `<div class="feedback miss" role="status"><b>還有一次機會。</b><p>提示：${h(item[3])}</p></div>` : ''}
      ${ready ? `<div class="feedback ${q.correct ? 'ok' : 'bad'}" role="status"><b>${q.correct ? (q.tries === 0 ? '✓ 一次答對！' : '✓ 答對了') : '再看一次推理過程'}</b><p>正解：${h(item[1][item[2]])}</p><p>${h(item[4])}</p></div><div class="row"><button type="button" class="btn primary" id="nextQuiz">${q.i === q.items.length - 1 ? '看結果 →' : '下一題 →'}</button><span class="muted small">按 Enter 繼續</span></div>` : '<p class="muted small">可以用鍵盤 A–D 作答。</p>'}
    </section>`;
    target._quiz = { q, hooks };
  }
  function answer(target, n) {
    const { q, hooks } = target._quiz; if (q.revealed || q.picked.includes(n)) return;
    const [lid, qi] = q.items[q.i], item = byId[lid].quiz[qi];
    // 第一次就答對才算掌握；第二次才答對仍留在錯題本。
    if (n === item[2]) { q.correct = true; q.revealed = true; if (q.tries === 0) q.first++; recordAnswer(lid, qi, q.tries === 0); }
    else { q.picked.push(n); q.tries++; if (q.tries >= 2) { q.revealed = true; q.correct = false; recordAnswer(lid, qi, false); } }
    drawQuiz(target, q, hooks);
    target.querySelector('#nextQuiz, .choice:not([disabled])')?.focus({ preventScroll: true });
  }
  function nextQuestion(target) {
    const { q, hooks } = target._quiz; if (!q.revealed) return;
    q.i++; q.tries = 0; q.picked = []; q.revealed = false; q.correct = false;
    if (q.i >= q.items.length) hooks.onFinish?.(q);
    drawQuiz(target, q, hooks);
    target.querySelector('.choice, .quiz-done .btn')?.focus({ preventScroll: true });
  }

  /* ───────────── 錯題複習 ───────────── */
  function renderReview() {
    crumbFor('錯題複習');
    const keys = wrongKeys();
    if (state.reviewQuiz) {
      $('content').innerHTML = `<header class="page-head"><h1>錯題複習</h1><p class="lead">答對的題目會從錯題本移除；再次答錯會留下來。</p></header><div id="reviewStage"></div>`;
      drawQuiz($('reviewStage'), state.reviewQuiz, { showChapter: true, finishHtml: () => `<div class="row center"><a class="btn primary" href="#/review" data-review="reset">回到錯題本</a></div>` });
      return;
    }
    const byLesson = {}; keys.forEach(k => { const lid = +k.split(':')[0]; (byLesson[lid] ||= []).push(k); });
    $('content').innerHTML = `<header class="page-head"><h1>錯題複習</h1><p class="lead">答錯的題目會自動收集在這裡。間隔一段時間再練習（spaced retrieval），比連續重複同一題更能留下長期記憶。</p></header>
    ${keys.length ? `<div class="row"><button type="button" class="btn primary" data-review="start">開始複習 ${keys.length} 題 →</button><button type="button" class="btn secondary" data-review="mixed">改做 8 題混合練習</button></div>
      <div class="review-list">${Object.entries(byLesson).sort((a, b) => pos(+a[0]) - pos(+b[0])).map(([lid, ks]) => `<section class="card"><div class="row between"><h3>${h(chapterLabel(+lid))}</h3><a class="btn ghost sm" href="#/ch/${lid}/learn">回到章節</a></div><ul>${ks.map(k => { const qi = +k.split(':')[1]; return `<li>${h(byId[+lid].quiz[qi][0])} <span class="tag warn">錯 ${store.wrong[k].n} 次</span></li>`; }).join('')}</ul></section>`).join('')}</div>`
      : `<section class="card center"><div class="big-check">✓</div><h2>目前沒有錯題</h2><p class="muted">完成章末測驗時答錯的題目會出現在這裡。也可以直接做一組跨章節的混合練習。</p><div class="row center"><button type="button" class="btn primary" data-review="mixed">開始 8 題混合練習</button></div></section>`}`;
  }

  /* ───────────── 術語表、公式、筆記 ───────────── */
  function renderGlossary() {
    crumbFor('術語表');
    $('content').innerHTML = `<header class="page-head"><h1>術語表</h1><p class="lead">${glossaryList.length} 個術語的中英對照與簡明定義，點章節可回到原文。</p></header>
    <input type="search" class="search-input" id="glossaryFilter" placeholder="篩選術語" aria-label="篩選術語"><div class="glossary" id="glossaryList"></div>`;
    drawGlossary('');
  }
  function drawGlossary(q) {
    q = q.trim().toLowerCase();
    const items = glossaryList.filter(g => !q || `${g.zh} ${g.en} ${g.def} ${g.id}`.toLowerCase().includes(q)).sort((a, b) => pos(a.ch) - pos(b.ch));
    $('glossaryList').innerHTML = items.map(g => `<article class="term" id="term-${g.id}"><h3>${h(g.zh)} <small>${h(g.en)}</small></h3><p>${h(g.def)}</p>${byId[g.ch] ? `<a href="#/ch/${g.ch}/learn" class="small">${h(chapterLabel(g.ch))} →</a>` : ''}</article>`).join('') || '<p class="muted">找不到符合的術語。</p>';
  }
  function renderFormulas() {
    crumbFor('公式速查');
    $('content').innerHTML = `<header class="page-head"><h1>公式與符號速查</h1><p class="lead">考前快速複習。每個公式都標出所屬章節，建議到該章的實驗中實際代入數字驗算一次。</p></header>
    ${formulas.map(g => `<section class="formula-group"><h2 class="section-title">${h(g.group)}</h2><div class="formula-grid">${g.items.map(f => `<article class="formula-card"><h3>${h(f.name)}</h3><div class="math">${f.tex}</div>${f.note ? `<p class="muted small">${f.note}</p>` : ''}${byId[f.ch] ? `<a class="small" href="#/ch/${f.ch}/lab">在${h(chapterLabel(f.ch))}中練習 →</a>` : ''}</article>`).join('')}</div></section>`).join('')}`;
  }
  function renderNotes() {
    crumbFor('我的筆記');
    const written = lessons.filter(l => (store.notes[l.id] || '').trim() || (store.guess[l.id] || '').trim());
    $('content').innerHTML = `<header class="page-head"><h1>我的筆記</h1><p class="lead">所有章節的猜測與反思都集中在這裡。資料只存在這個瀏覽器；換裝置前請先匯出。</p></header>
    <div class="row"><button type="button" class="btn primary" id="exportNotes"${written.length ? '' : ' disabled'}>下載 Markdown</button><button type="button" class="btn secondary" id="exportProgress">備份學習進度（JSON）</button><label class="btn secondary" for="importProgress">還原備份</label><input type="file" id="importProgress" accept="application/json" hidden><button type="button" class="btn ghost" id="printNotes">列印</button></div>
    <p class="muted small" id="ioStatus" role="status"></p>
    ${written.length ? written.map(l => `<section class="card note-card"><div class="row between"><h3>${h(chapterLabel(l.id))}</h3><a class="btn ghost sm" href="#/ch/${l.id}/learn">編輯</a></div>${store.guess[l.id] ? `<p class="muted small">一開始的猜測</p><p class="prewrap">${h(store.guess[l.id])}</p>` : ''}${store.notes[l.id] ? `<p class="muted small">我的解釋</p><p class="prewrap">${h(store.notes[l.id])}</p>` : ''}</section>`).join('') : '<section class="card center"><p class="muted">還沒有任何筆記。每章「觀念」頁的最後可以用自己的話寫下解釋。</p></section>'}`;
  }
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0); }

  /* ───────────── 搜尋（命令面板） ───────────── */
  function searchIndex() {
    const items = [];
    const flat = v => Array.isArray(v) ? v.flat(2).join(' ') : (v || '');
    lessons.forEach(l => items.push({ kind: '章節', title: `${pos(l.id) + 1}. ${l.title}`, sub: l.short || '', href: `#/ch/${l.id}/learn`, text: [l.title, l.short, l.ask, l.analogy, l.why, flat(l.details), flat(l.steps), l.worked, l.caveat, flat(l.goals), flat(l.summary)].join(' ') }));
    lessons.forEach(l => { if (Labs.registry[l.lab]) items.push({ kind: '實驗', title: labName(l), sub: `第 ${pos(l.id) + 1} 章`, href: `#/ch/${l.id}/lab`, text: labName(l) + ' ' + Labs.registry[l.lab].prompt }); });
    glossaryList.forEach(g => items.push({ kind: '術語', title: `${g.zh}　${g.en}`, sub: g.def, href: '#/glossary', term: g.id, text: `${g.zh} ${g.en} ${g.def}` }));
    [formulas.length && ['公式速查', '#/formulas'], glossaryList.length && ['術語表', '#/glossary'], ['錯題複習', '#/review'], ['我的筆記', '#/notes'], ['實驗總覽', '#/labs'], ['課程地圖', '#/']].filter(Boolean).forEach(([t, href]) => items.push({ kind: '頁面', title: t, sub: '', href, text: t }));
    return items;
  }
  let INDEX = null;
  function openPalette() {
    INDEX ||= searchIndex();
    const dlg = $('palette'); if (dlg.open) return;
    state.palette = { sel: 0, results: [] };
    $('paletteInput').value = ''; drawPalette(''); dlg.showModal(); $('paletteInput').focus();
  }
  function drawPalette(q) {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const score = it => { const t = it.title.toLowerCase(), x = it.text.toLowerCase(); if (!words.every(w => x.includes(w) || t.includes(w))) return -1; return words.reduce((a, w) => a + (t.includes(w) ? 3 : 1), 0) + (it.kind === '章節' ? 0.5 : 0); };
    const res = words.length ? INDEX.map(it => [score(it), it]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).slice(0, 12).map(x => x[1]) : INDEX.filter(it => it.kind === '頁面' || it.kind === '章節').slice(0, 10);
    state.palette.results = res; state.palette.sel = 0;
    $('paletteList').innerHTML = res.map((it, i) => `<li role="option" id="pal-${i}" aria-selected="${i === 0}"><a href="${it.href}"><span class="kind">${it.kind}</span><b>${h(it.title)}</b><small>${h(it.sub)}</small></a></li>`).join('') || '<li class="empty">找不到相符的內容</li>';
    $('paletteInput').setAttribute('aria-activedescendant', res.length ? 'pal-0' : '');
  }
  function movePalette(d) {
    const p = state.palette, n = p.results.length; if (!n) return;
    p.sel = (p.sel + d + n) % n;
    document.querySelectorAll('#paletteList [role=option]').forEach((li, i) => li.setAttribute('aria-selected', i === p.sel));
    $(`pal-${p.sel}`)?.scrollIntoView({ block: 'nearest' }); $('paletteInput').setAttribute('aria-activedescendant', `pal-${p.sel}`);
  }
  function choosePalette(it) { $('palette').close(); if (!it) return; location.hash = it.href; if (it.term) setTimeout(() => { $('glossaryFilter').value = glossary[it.term].zh; drawGlossary(glossary[it.term].zh); }, 0); }

  /* ───────────── 選單、主題 ───────────── */
  function setMenu(open) {
    $('side').classList.toggle('open', open); $('backdrop').classList.toggle('show', open);
    $('menu').setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open);
    const mobile = matchMedia('(max-width: 900px)').matches;
    $('side').inert = mobile && !open; if (mobile && !open) $('side').setAttribute('aria-hidden', 'true'); else $('side').removeAttribute('aria-hidden');
    if (open) $('side').querySelector('a,button')?.focus();
  }
  const isDark = () => store.theme ? store.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  function applyTheme() {
    if (store.theme) document.documentElement.dataset.theme = store.theme; else delete document.documentElement.dataset.theme;
    const dark = isDark();
    $('themeBtn').textContent = dark ? '☀' : '☾'; $('themeBtn').setAttribute('aria-label', dark ? '切換為淺色主題' : '切換為深色主題');
    const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = dark ? '#0b1120' : '#f6f7fb';
  }

  /* ───────────── 事件 ───────────── */
  document.addEventListener('click', e => {
    const el = e.target.closest('button, a'); if (!el) return;
    if (el.closest('#palette') && el.matches('a')) { e.preventDefault(); choosePalette(state.palette.results[[...$('paletteList').querySelectorAll('a')].indexOf(el)]); return; }
    if (el.dataset.go !== undefined && el.dataset.go !== '') { navigate(+el.dataset.go); return; }
    if (el.dataset.act) { labAct(el.dataset.act, el.dataset.arg); return; }
    if (el.dataset.answer !== undefined) { answer(el.closest('#stage, #reviewStage'), +el.dataset.answer); return; }
    if (el.dataset.quiz === 'retry') { state.quiz = null; renderQuiz(byId[state.lesson]); return; }
    if (el.dataset.term) { toggleTerm(el); return; }
    if (el.dataset.review) {
      if (el.dataset.review === 'reset') { e.preventDefault(); state.reviewQuiz = null; renderReview(); window.scrollTo({ top: 0 }); return; }
      const items = el.dataset.review === 'start' ? wrongKeys().map(k => k.split(':').map(Number)) : pickReview(8);
      state.reviewQuiz = newQuiz(items); renderReview(); return;
    }
    switch (el.id) {
      case 'nextQuiz': nextQuestion(el.closest('#stage, #reviewStage')); break;
      case 'resetLab': stopPlayback(); state.lab = labDef().init(labCtx); state.history = []; drawLab(); break;
      case 'undoLab': stopPlayback(); if (state.history.length) { state.lab = JSON.parse(state.history.pop()); drawLab(); } break;
      case 'playLab': togglePlayback(); break;
      case 'menu': setMenu(!$('side').classList.contains('open')); break;
      case 'searchBtn': openPalette(); break;
      case 'themeBtn': store.theme = isDark() ? 'light' : 'dark'; save(); applyTheme(); break;
      case 'helpBtn': $('help').showModal(); break;
      case 'printNotes': print(); break;
      case 'copyCode': {
        const l = byId[state.lesson], code = Array.isArray(l.code) ? l.code[1] : l.code, done = t => { el.textContent = t; setTimeout(() => { el.textContent = '複製'; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => done('已複製 ✓'), () => done('請手動選取複製')); else done('請手動選取複製');
        break;
      }
      case 'exportNotes': download(`${C.id}-lab-notes.md`, `# ${C.name} 筆記\n\n${lessons.filter(l => store.notes[l.id] || store.guess[l.id]).map(l => `## ${chapterLabel(l.id)}\n\n${l.ask ? `**問題：** ${l.ask}\n\n` : ''}${store.guess[l.id] ? `**一開始的猜測：** ${store.guess[l.id]}\n\n` : ''}${store.notes[l.id] ? `**我的解釋：**\n\n${store.notes[l.id]}\n` : ''}`).join('\n')}`, 'text/markdown'); break;
      case 'exportProgress': download(`${C.id}-lab-progress.json`, JSON.stringify(store, null, 2), 'application/json'); break;
      case 'scrollTop': window.scrollTo({ top: 0, behavior: motion() }); break;
    }
    if (el.matches('a[href^="#"]') && el.closest('#side')) setMenu(false);
  });
  function toggleTerm(chip) {
    const box = $('termDef'), open = chip.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.term-chip').forEach(c => c.setAttribute('aria-expanded', 'false'));
    if (open) { box.hidden = true; return; }
    const g = glossary[chip.dataset.term]; chip.setAttribute('aria-expanded', 'true');
    box.hidden = false; box.innerHTML = `<b>${h(g.zh)}</b>（${h(g.en)}）：${h(g.def)}${g.ch !== state.lesson && byId[g.ch] ? ` <a href="#/ch/${g.ch}/learn">詳見${h(chapterLabel(g.ch))}</a>` : ''}`;
  }
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'noteArea') { store.notes[state.lesson] = el.value; save(); $('noteStatus').textContent = '已自動儲存 ✓'; }
    else if (el.id === 'guessArea') { store.guess[state.lesson] = el.value; save(); }
    else if (el.id === 'glossaryFilter') drawGlossary(el.value);
    else if (el.id === 'paletteInput') drawPalette(el.value);
    else if (el.dataset.set !== undefined && el.hasAttribute('data-live')) { const def = labDef(); stopPlayback(); labMutate(s => def.set(s, el.dataset.set, el.value, labCtx, el), false); }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'playSpeed') { playDelay = +el.value; return; }
    if (el.id === 'importProgress') { importProgress(el.files[0]); el.value = ''; return; }
    if (el.dataset.set !== undefined && state.page === 'lesson') { const def = labDef(); stopPlayback(); labMutate(s => def.set(s, el.dataset.set, el.type === 'checkbox' ? el.checked : el.value, labCtx, el)); }
  });
  function importProgress(file) {
    if (!file) return;
    file.text().then(t => { const data = JSON.parse(t); if (typeof data !== 'object' || !data || !data.done) throw new Error('格式不符'); Object.keys(store).forEach(k => delete store[k]); Object.assign(store, blank(), data); save(true); applyTheme(); render(); $('ioStatus').textContent = '已還原備份 ✓'; })
      .catch(err => { $('ioStatus').textContent = '無法讀取這個檔案：' + err.message; });
  }
  document.addEventListener('keydown', e => {
    const typing = e.target.matches('input, textarea, select, [contenteditable]');
    if ($('palette').open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); movePalette(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); movePalette(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); choosePalette(state.palette.results[state.palette.sel]); }
      return;
    }
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Escape' && $('side').classList.contains('open')) { setMenu(false); $('menu').focus(); return; }
    if (e.target.matches('[role=tab]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const keys = TABS.map(t => t[0]); let i = keys.indexOf(state.tab);
      i = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
      navigate(state.lesson, keys[i]); setTimeout(() => $(`tab-${keys[i]}`)?.focus(), 0); return;
    }
    if (e.key === 'Tab' && $('side').classList.contains('open') && matchMedia('(max-width: 900px)').matches) {
      const nodes = [...$('side').querySelectorAll('a, button, input')], first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '?') { $('help').showModal(); return; }
    if (state.page === 'lesson' && (e.key === '[' || e.key === ']')) { const n = lessons[pos(state.lesson) + (e.key === ']' ? 1 : -1)]; if (n) navigate(n.id, state.tab); return; }
    const quizTarget = state.page === 'lesson' && state.tab === 'quiz' ? $('stage') : state.page === 'review' ? $('reviewStage') : null;
    if (quizTarget?._quiz && quizTarget.querySelector('.quiz')) {
      const k = e.key.toUpperCase();
      if (/^[A-D]$/.test(k)) { const b = quizTarget.querySelector(`[data-key="${k}"]`); if (b && !b.disabled) { e.preventDefault(); answer(quizTarget, +b.dataset.answer); } }
      else if (e.key === 'Enter' && quizTarget._quiz.q.revealed && !e.target.matches('button, a')) { e.preventDefault(); nextQuestion(quizTarget); }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
  $('backdrop').addEventListener('click', () => setMenu(false));
  matchMedia('(max-width: 900px)').addEventListener('change', () => setMenu(false));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  window.addEventListener('scroll', () => { $('scrollTop').classList.toggle('show', scrollY > 600); }, { passive: true });
  window.addEventListener('pagehide', () => save(true));

  // 供測試與除錯使用
  window.CSApp = { course: C, state, store, lessons, byId, navigate, go, countDone, recordAnswer, pickReview, choiceOrder, labAct, sim: Labs.sim };
  window.OSApp = window.CSApp;

  applyTheme();
  const initial = parseHash();
  if (!location.hash) history.replaceState(null, '', hashFor(initial));
  applyRoute(initial, { keepScroll: true });
})();
