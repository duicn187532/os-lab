/* CS LAB 程式實作：章節的「④ 實作」頁籤。在瀏覽器裡真的編譯 / 執行 C、C++、Python、JavaScript 並以測資評測。
 * 執行環境、評測與編輯器在 shared/code/（ES module，第一次打開實作頁籤才載入；執行環境第一次按「執行」才下載），
 * 隔離方式與限制見 challenge-poc/README.md。這裡只負責題目註冊、畫面、草稿與紀錄。
 * 題目（各課 assets/code.js）：CSLab.code.add({ id, lesson, title, statement, input, output, cases, timeLimitMs, starter, hints, explain, tags })
 *   id：穩定的題目 id（紀錄與草稿以它為鍵）；lesson：章節 id；cases：[{ name, input, output, visible }] 或回傳它的函式（大型測資延後產生）；
 *   starter：{ cpp, python, javascript, c } 起始程式碼（已寫好讀入，留下 TODO）；hints：依序給的提示；explain：通過後看得到的解析。
 * 紀錄：課程進度 store.code[id] = { solved, lang, at, submits, best: { passed, total } }，只在提交（評測全部測資）後更新；
 *   通過之後紀錄固定為已通過（換語言再交只是練習）。草稿另存在 localStorage 的 cslab.code.v1.<課程>.<題目>.<語言>，
 *   語言偏好在 cslab.code.v1.lang（各課共用）。
 * 事件：document 上的 cslab:code，detail = { id, lesson, card, event, ... }，event 是 view | phase | case | judged | ran；
 *   楓之谷外觀的任務 NPC、怪物與經驗值由 shared/cslab-game.js 依這些事件加上。 */
'use strict';
(function () {
  const { h } = CSLab.ui;
  const BASE = new URL('code/', document.currentScript.src).href;
  const items = [];
  const LANGS = [['cpp', 'C++', 'C++17'], ['python', 'Python', 'Python 3'], ['javascript', 'JavaScript', 'ES2022'], ['c', 'C', 'C11']];
  const LABEL = Object.fromEntries(LANGS.map(([k, l]) => [k, l]));
  const VERDICT = { AC: ['Accepted', '通過'], WA: ['Wrong Answer', '答案錯誤'], CE: ['Compile Error', '編譯錯誤'], RE: ['Runtime Error', '執行錯誤'], TLE: ['Time Limit Exceeded', '超過時限'], IE: ['Internal Error', '系統錯誤'] };
  const SHOW = 4000;
  const clip = s => s.length > SHOW ? s.slice(0, SHOW) + `\n…（共 ${s.length.toLocaleString()} 字元，只顯示開頭）` : s;

  let mods = null, M = null; // mods：載入中的 Promise；M：載入完成的模組
  const load = () => mods ||= Promise.all(['editor', 'runtime', 'judge'].map(n => import(BASE + n + '.js'))).then(([e, r, j]) => (M = { ...e, ...r, ...j }));
  const casesOf = p => (p._cases ||= typeof p.cases === 'function' ? p.cases() : p.cases);

  /* ---------- 草稿與偏好（不放進課程進度，避免每打一個字就重寫整份進度） ---------- */
  const DKEY = 'cslab.code.v1.';
  const lsGet = k => { try { return localStorage.getItem(DKEY + k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(DKEY + k, v); return true; } catch (_) { return false; } };
  const lsDel = k => { try { localStorage.removeItem(DKEY + k); } catch (_) { /* 停用儲存 */ } };
  const draftKey = (p, lang) => `${env.course}.${p.id}.${lang}`;

  let env = null;            // { store, save, course, lang }
  let ui = null;             // 目前畫面上的實作頁：{ p, lang, editor, busy, ... }
  const live = {};           // 題目 id → { stdin, out, result, cases }（這次開頁的畫面狀態，切頁籤回來還在）
  const emit = (p, event, extra = {}) => document.dispatchEvent(new CustomEvent('cslab:code', { detail: { id: p.id, lesson: p.lesson, card: document.querySelector('.code-lab'), event, total: casesOf(p).length, record: rec(p), ...extra } }));
  const rec = p => Object.assign({ solved: false, lang: null, at: null, submits: 0, best: null }, (env.store.code || {})[p.id]);
  const put = (p, r) => { (env.store.code ||= {})[p.id] = r; env.save(); };

  function mount(stage, lessonId, e) {
    env = e;
    stopActive();
    const list = items.filter(p => p.lesson === lessonId);
    if (!list.length) { stage.innerHTML = '<section class="card"><p class="muted">這一章還沒有程式實作題。</p></section>'; return; }
    const pick = list.find(p => p.id === (ui && ui.lessonPick && ui.lessonPick[lessonId])) || list[0];
    draw(stage, list, pick);
  }

  function langPref(p) {
    const saved = lsGet('lang');
    return LANGS.some(l => l[0] === saved) ? saved : env.lang || 'cpp';
  }

  function draw(stage, list, p) {
    const lang = ui && ui.p === p ? ui.lang : langPref(p), r = rec(p), cases = casesOf(p), samples = cases.filter(c => c.visible);
    const st = live[p.id] ||= { stdin: samples[0] ? samples[0].input : '', out: null, result: null, rows: null, hints: 0 };
    stage.innerHTML = `
    <section class="card code-brief" data-problem="${h(p.id)}">
      <h2 class="label"><span class="code-label">⌨ 程式實作</span></h2>
      ${env.course === 'os' ? '<p class="os-practice-integrity" role="note"><strong>教學練習判題，非正式保密評量。</strong>本頁全部測資與正確輸出均隨 JavaScript 傳送到瀏覽器；「額外練習」只是不在畫面直接揭露輸入輸出，不能防止查看來源、修改紀錄或作弊。通過只代表本機練習，正式能力評定需教師或可信伺服器另行驗收。</p>' : ''}
      ${list.length > 1 ? `<div class="seg code-picks" role="group" aria-label="本章的實作題">${list.map((x, i) => `<button type="button" data-code-pick="${h(x.id)}" aria-pressed="${x === p}">${i + 1}. ${h(x.title)}${rec(x).solved ? ' ✓' : ''}</button>`).join('')}</div>` : ''}
      <h3 class="code-title">${h(p.title)}</h3>
      <p class="code-task">${h(p.statement)}</p>
      <div class="code-io"><div><h4>輸入</h4><p>${h(p.input)}</p></div><div><h4>輸出</h4><p>${h(p.output)}</p></div></div>
      ${samples.map((s, i) => `<div class="code-sample"><div><b>範例輸入 ${i + 1}</b><pre>${h(clip(s.input)) || '<span class="muted">（空）</span>'}</pre></div><div><b>範例輸出 ${i + 1}</b><pre>${h(clip(s.output))}</pre></div></div>`).join('')}
      <p class="muted small">每筆測資時限 C ${p.timeLimitMs || 2000} ms（不含編譯），JavaScript 1.5 倍，C++ 與 Python 3 倍 · 共 ${cases.length} 筆測資，公開 ${samples.length} 筆 · ${r.solved ? `✓ 已用 ${h(LABEL[r.lang] || r.lang)} 通過` : r.submits ? `提交 ${r.submits} 次，最佳 ${r.best ? `${r.best.passed} / ${r.best.total}` : '—'}` : '還沒提交過'}</p>
    </section>
    <section class="lab code-lab" data-problem="${h(p.id)}" aria-labelledby="codeLabTitle" data-verdict="${st.result ? st.result.verdict || '' : ''}">
      <header class="lab-head"><div><span class="cc-num">CODING QUEST</span><h2 id="codeLabTitle">${h(p.title)}</h2></div></header>
      <div class="row between wrap code-bar"><div class="seg" role="group" aria-label="程式語言">${LANGS.map(([k, l, s]) => `<button type="button" data-code-lang="${k}" aria-pressed="${k === lang}" title="${s}">${l}</button>`).join('')}</div><span class="muted small code-status" role="status"></span></div>
      <div class="code-editor"><p class="muted small">載入編輯器…</p></div>
      <p class="muted small" id="codeHelp">Tab 縮排、Shift+Tab 取消縮排、Ctrl/⌘+Enter 執行；按 Esc 再按 Tab 離開編輯器。程式碼自動存在這台裝置，每種語言各一份。</p>
      <div class="row wrap code-actions">
        <button type="button" class="btn secondary" data-code="run" title="用下方的自訂輸入執行一次（Ctrl/⌘+Enter）">▶ 執行</button>
        <button type="button" class="btn primary" data-code="submit">✔ 提交評測</button>
        <button type="button" class="btn warn" data-code="stop" disabled>■ 停止</button>
        <button type="button" class="btn ghost" data-code="reset">↺ 起始程式碼</button>
        <span class="muted small code-save" aria-live="polite"></span>
      </div>
      <details class="code-stdin"><summary>自訂輸入（stdin）</summary><textarea rows="4" spellcheck="false" aria-label="自訂輸入 stdin" data-code-stdin>${h(st.stdin)}</textarea></details>
      <div class="code-result" aria-live="polite"></div>
      <div class="code-out"><div class="seg" role="tablist" aria-label="輸出">${[['stdout', 'stdout'], ['stderr', 'stderr'], ['compile', '編譯訊息']].map(([k, t], i) => `<button type="button" role="tab" data-code-out="${k}" aria-pressed="${i === 0}" aria-selected="${i === 0}">${t}</button>`).join('')}</div><pre class="code-pre" role="tabpanel" tabindex="0" aria-label="輸出內容">（還沒有執行）</pre></div>
      <ol class="code-cases" aria-label="測資結果"></ol>
      ${(p.hints || []).length ? `<div class="code-hints">${hintsHtml(p, st)}</div>` : ''}
      ${r.solved ? explainHtml(p) : ''}
      <p class="muted small">程式在你的瀏覽器裡、隔離的沙箱中編譯與執行；C / C++ 第一次要下載約 100 MB 的編譯器，Python 約 13 MB。這是自我練習，不是防作弊的評測。</p>
    </section>`;
    ui = { ...(ui || {}), p, list, lang, stage, editor: null, busy: false, outTab: 'stdout', lessonPick: { ...(ui && ui.lessonPick), [p.lesson]: p.id } };
    const mine = ui;
    status();
    if (st.out) setOut(st.out);
    if (st.result) paintResult(st.result);
    if (st.rows) paintCases(st.rows);
    load().then(m => {
      if (ui !== mine || !stage.isConnected) return;
      const host = stage.querySelector('.code-editor');
      host.innerHTML = '';
      mine.editor = m.createEditor(host, { onChange: () => scheduleSave(), onRun: () => run() });
      mine.editor.textarea.setAttribute('aria-describedby', 'codeHelp');
      mine.editor.setLanguage(lang);
      const saved = lsGet(draftKey(p, lang));
      mine.editor.value = saved !== null ? saved : p.starter[lang] || '';
      stage.querySelector('.code-save').textContent = saved !== null ? '已還原上次的程式碼' : '';
      status();
    }).catch(err => { if (ui === mine) stage.querySelector('.code-editor').innerHTML = `<p class="note bad">無法載入編輯器：${h(err.message || err)}</p>`; });
    emit(p, 'view');
  }

  const hintsHtml = (p, st) => `${p.hints.slice(0, st.hints).map((t, i) => `<p><b>提示 ${i + 1}</b>　${h(t)}</p>`).join('')}${st.hints < p.hints.length ? `<button type="button" class="btn ghost sm" data-code="hint">💡 提示（${st.hints} / ${p.hints.length}）</button>` : ''}`;
  // 解析只在通過之後出現
  const explainHtml = p => p.explain ? `<div class="code-explain"><h4>解析</h4><p>${h(p.explain)}</p>${(p.tags || []).length ? `<div class="ch-tags">${p.tags.map(t => `<span class="tag">#${h(t)}</span>`).join('')}</div>` : ''}</div>` : '';
  const $ = sel => ui && ui.stage.querySelector(sel);
  function status(text) {
    const el = $('.code-status'); if (!el) return;
    const l = LANGS.find(x => x[0] === ui.lang);
    el.textContent = text || `${l[2]} · ${ui.lang === 'cpp' || ui.lang === 'c' ? '第一次執行會下載編譯器' : ui.lang === 'python' ? '第一次執行會下載 Pyodide' : '在沙箱 Worker 裡執行'}${ui.lang === 'cpp' ? '；大量輸入時 cin 較慢，可改用 scanf' : ''}`;
    if (!text && M && M.isReady(ui.lang)) el.textContent = `${l[2]} · 執行環境已就緒${ui.lang === 'cpp' ? '；大量輸入時 cin 較慢，可改用 scanf' : ''}`;
  }

  /* ---------- 草稿 ---------- */
  let saveTimer = null;
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); }
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = null;
    if (!ui || !ui.editor) return;
    const ok = lsSet(draftKey(ui.p, ui.lang), ui.editor.value), el = $('.code-save');
    if (el) el.textContent = ok ? '已自動儲存' : '無法儲存（瀏覽器停用了本機儲存）';
  }
  const flush = () => { if (saveTimer) saveNow(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  /* ---------- 結果畫面 ---------- */
  function setOut(o) {
    live[ui.p.id].out = o;
    ui.stage.querySelectorAll('[data-code-out]').forEach(b => { const on = b.dataset.codeOut === ui.outTab; b.setAttribute('aria-pressed', on); b.setAttribute('aria-selected', on); b.classList.toggle('has', !!o[b.dataset.codeOut]); });
    $('.code-pre').textContent = o[ui.outTab] || '（沒有內容）';
  }
  const pickTab = r => { ui.outTab = r.status === 'compile_error' ? 'compile' : r.stderr && r.status !== 'accepted' ? 'stderr' : 'stdout'; };
  const ms = r => `${r.elapsedMs} ms${r.compileMs ? ` · 編譯 ${Math.round(r.compileMs)} ms` : ''}`;
  function paintResult(res) {
    live[ui.p.id].result = res;
    const el = $('.code-result'); if (!el) return;
    $('.code-lab').dataset.verdict = res.verdict || '';
    el.innerHTML = `<div class="note ${res.tone} code-verdict" data-verdict="${res.verdict || res.kind}">${res.html}</div>`;
  }
  const lineOf = t => t === undefined ? '（沒有這一行）' : t === '' ? '（空行）' : `<code>${h(t)}</code>`;
  function caseRow(row) {
    const displayName = env.course === 'os' && !casesOf(ui.p)[row.index]?.visible
      ? '額外練習：輸入與答案存在本機程式碼中' : row.name;
    const head = `<span class="code-case-name">#${row.index + 1} ${h(displayName)}</span>`;
    if (!row.cr) return `<li class="code-case" data-state="${row.state}">${head}<span class="muted small">${row.state === 'running' ? '執行中…' : row.state === 'skipped' ? '未執行' : '等待中'}</span></li>`;
    const cr = row.cr, r = cr.result, c = casesOf(ui.p)[row.index], V = VERDICT[cr.verdict];
    const detail = cr.visible ? `<details${cr.verdict !== 'AC' ? ' open' : ''}><summary>input / expected / actual</summary><div class="code-iox"><div><b>input</b><pre>${h(clip(c.input)) || '<span class="muted">（空）</span>'}</pre></div><div><b>expected</b><pre>${h(clip(c.output))}</pre></div><div><b>actual</b><pre>${h(clip(r.stdout)) || '<span class="muted">（沒有輸出）</span>'}</pre></div></div>${r.stderr ? `<b>stderr</b><pre>${h(clip(r.stderr))}</pre>` : ''}</details>` : (env.course === 'os' ? '<span class="muted small">本機額外練習：介面不顯示輸入輸出，但網站程式碼含完整測資；不是秘密評測</span>' : '<span class="muted small">隱藏測資：只顯示結果</span>');
    return `<li class="code-case" data-state="done" data-verdict="${cr.verdict}">${head}<span class="tag ${cr.verdict === 'AC' ? 'ok' : 'warn'}">${V[0]}</span><span class="muted small">${ms(r)}</span>${cr.diff && cr.visible ? `<p class="small">第 ${cr.diff.line} 行不同：期望 ${lineOf(cr.diff.expected)}，實際 ${lineOf(cr.diff.actual)}</p>` : ''}${r.note ? `<p class="small">${h(r.note)}</p>` : ''}${detail}</li>`;
  }
  function paintCases(rows) { live[ui.p.id].rows = rows; const el = $('.code-cases'); if (el) el.innerHTML = rows ? rows.map(caseRow).join('') : ''; }

  function setBusy(b) {
    ui.busy = b;
    ui.stage.querySelectorAll('[data-code="run"], [data-code="submit"], [data-code="reset"], [data-code-lang], [data-code-pick]').forEach(x => { x.disabled = b; });
    const stop = $('[data-code="stop"]'); if (stop) stop.disabled = !b;
    $('.code-lab')?.setAttribute('aria-busy', b);
    document.body.classList.toggle('code-busy', b);
  }
  function stopActive() { if (ui && ui.busy) { ui.stopRequested = true; M && M.stop(); } }

  /* ---------- 執行與提交 ---------- */
  async function run() {
    if (!ui || ui.busy || !ui.editor) return;
    flush();
    const mine = ui, p = ui.p;
    setBusy(true); mine.stopRequested = false;
    paintCases(null);
    paintResult({ tone: '', kind: 'RUNNING', html: '執行中…' });
    const m = await load();
    const stdin = $('[data-code-stdin]').value;
    live[p.id].stdin = stdin;
    m.setPhaseListener((kind, phase, info) => phaseText(p, phase, info));
    const r = await m.execute({ language: mine.lang, source: mine.editor.value, stdin, timeoutMs: m.timeLimit(p, mine.lang), outputBytes: p.outputBytes });
    if (ui !== mine) return;
    setBusy(false); status();
    pickTab(r); setOut({ stdout: r.stdout, stderr: r.stderr, compile: r.compileOutput });
    const v = { compile_error: 'CE', runtime_error: 'RE', time_limit_exceeded: 'TLE', internal_error: 'IE' }[r.status];
    if (v) paintResult({ verdict: v, tone: v === 'TLE' || v === 'IE' ? 'warn' : 'bad', html: `<b>${VERDICT[v][0]}</b> ${VERDICT[v][1]} · ${ms(r)}${r.note ? `<p class="small">${h(r.note)}</p>` : ''}` });
    else {
      const match = casesOf(p).find(c => c.visible && c.input === stdin), mv = match ? m.verdictOf(r, match.output) : null;
      paintResult({ kind: mv || 'RUN', tone: mv === 'AC' ? 'ok' : mv ? 'bad' : 'info', html: `<b>程式正常結束</b> · ${ms(r)}${match ? ` · 與「${h(match.name)}」的期望輸出${mv === 'AC' ? '相同' : '不同'}` : ''}<br><span class="small muted">「執行」只跑一次你的輸入；按「提交評測」才會跑全部測資並記錄。</span>` });
    }
    emit(p, 'ran', { status: r.status });
  }
  function phaseText(p, phase, info) {
    if (!ui || !ui.busy) return;
    let t = { loading: '正在載入執行環境…', compiling: '正在編譯…', running: '執行中…' }[phase] || '';
    if (phase === 'compiling' && info && info.totalLength) t = `正在下載編譯器 ${Math.round(info.doneLength / 1048576)} / ${Math.round(info.totalLength / 1048576)} MB…`;
    status(t);
    emit(p, 'phase', { phase, info });
  }

  async function submit() {
    if (!ui || ui.busy || !ui.editor) return;
    flush();
    const mine = ui, p = ui.p, lang = ui.lang, source = ui.editor.value, cases = casesOf(p);
    setBusy(true); mine.stopRequested = false;
    const rows = cases.map((c, index) => ({ index, name: c.name, state: index ? 'pending' : 'running', cr: null }));
    paintCases(rows);
    paintResult({ tone: '', kind: 'JUDGING', html: `評測中… 0 / ${cases.length}` });
    emit(p, 'judging');
    const m = await load();
    m.setPhaseListener((kind, phase, info) => phaseText(p, phase, info));
    const res = await m.judge({ ...p, cases }, lang, source, {
      shouldStop: () => mine.stopRequested,
      onCase: (i, cr) => {
        rows[i].cr = cr; rows[i].state = 'done'; if (rows[i + 1]) rows[i + 1].state = 'running';
        if (ui === mine) { paintCases(rows); paintResult({ tone: '', kind: 'JUDGING', html: `評測中… ${i + 1} / ${cases.length}` }); }
        emit(p, 'case', { index: i, verdict: cr.verdict });
      }
    });
    rows.forEach(r => { if (!r.cr) r.state = 'skipped'; });
    if (ui === mine) { setBusy(false); status(); paintCases(rows); }
    const shown = res.results.find(x => x.verdict !== 'AC') || res.results[res.results.length - 1];
    if (ui === mine && shown) { pickTab(shown.result); setOut({ stdout: shown.result.stdout, stderr: shown.result.stderr, compile: shown.result.compileOutput }); }
    if (res.stopped || mine.stopRequested) {
      if (ui === mine) paintResult({ kind: 'STOPPED', tone: 'warn', html: `<b>已停止評測</b> · 通過 ${res.passed} / ${res.total}（這次不記錄）` });
      emit(p, 'judged', { verdict: 'STOPPED', passed: res.passed });
      return;
    }
    // 紀錄：通過一次就固定為已通過
    const r = rec(p), fresh = res.verdict === 'AC' && !r.solved;
    r.submits++;
    if (!r.best || res.passed > r.best.passed || res.verdict === 'AC') r.best = { passed: res.passed, total: res.total };
    if (fresh) { r.solved = true; r.lang = lang; r.at = new Date().toISOString(); }
    put(p, r);
    const V = VERDICT[res.verdict];
    const why = { WA: '輸出和期望不同：展開公開測資比對第一個不同的行。', CE: '編譯沒有通過：看「編譯訊息」的第一個錯誤（行號:欄號）。', RE: '程式在執行途中出錯：看 stderr 或下方的原因。', TLE: '超過時限：可能是無窮迴圈，或演算法太慢（看看題目的資料量）。', IE: '執行環境出了問題：重新整理後再試一次。' }[res.verdict] || '';
    if (ui === mine) {
      paintResult({ verdict: res.verdict, tone: res.verdict === 'AC' ? 'ok' : res.verdict === 'TLE' || res.verdict === 'IE' ? 'warn' : 'bad', html: `<b>${V[0]}</b> ${V[1]} · 通過 <b class="code-pass">${res.passed} / ${res.total}</b> 筆測資${res.verdict === 'AC' ? (fresh ? '　🎉 第一次通過，已記錄！' : '') : `<p class="small">${why}${shown ? ` 第一個沒通過的是 #${shown.index + 1} ${h(shown.name)}。` : ''}</p>`}` });
      if (res.verdict === 'AC' && !$('.code-explain')) $('.code-cases').insertAdjacentHTML('afterend', explainHtml(p));
    }
    emit(p, 'judged', { verdict: res.verdict, passed: res.passed, fresh, lang });
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-code], [data-code-lang], [data-code-pick], [data-code-out]');
    if (!el || el.disabled || !ui || !el.closest('.code-lab, .code-brief')) return;
    if (el.dataset.codeOut) { ui.outTab = el.dataset.codeOut; setOut(live[ui.p.id].out || { stdout: '', stderr: '', compile: '' }); return; }
    if (ui.busy && el.dataset.code !== 'stop') return;
    if (el.dataset.codeLang) { flush(); ui.lang = el.dataset.codeLang; lsSet('lang', ui.lang); draw(ui.stage, ui.list, ui.p); return; }
    if (el.dataset.codePick) { flush(); const p = items.find(x => x.id === el.dataset.codePick); if (p) draw(ui.stage, ui.list, p); return; }
    switch (el.dataset.code) {
      case 'run': run(); break;
      case 'submit': submit(); break;
      case 'stop': ui.stopRequested = true; M && M.stop(); break;
      case 'hint': { const st = live[ui.p.id]; st.hints++; $('.code-hints').innerHTML = hintsHtml(ui.p, st); $('.code-hints p:last-of-type')?.setAttribute('tabindex', '-1'); $('.code-hints p:last-of-type')?.focus(); break; }
      case 'reset':
        if (!ui.editor) return;
        if (ui.editor.value !== (ui.p.starter[ui.lang] || '') && !confirm(`把 ${LABEL[ui.lang]} 的程式碼換回起始程式碼？目前的內容會被取代（其他語言不受影響）。`)) return;
        ui.editor.value = ui.p.starter[ui.lang] || ''; lsDel(draftKey(ui.p, ui.lang));
        $('.code-save').textContent = '已換回起始程式碼';
        break;
    }
  });
  document.addEventListener('input', e => { if (e.target.matches('[data-code-stdin]') && ui) live[ui.p.id].stdin = e.target.value; });

  CSLab.code = {
    LANGS, add: p => { items.push(p); }, list: () => items.slice(), forLesson: id => items.filter(p => p.lesson === id), get: id => items.find(p => p.id === id),
    cases: casesOf, mount, stop: stopActive, get busy() { return !!(ui && ui.busy); }, load
  };
})();
