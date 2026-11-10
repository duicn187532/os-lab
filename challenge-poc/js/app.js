/* Coding Challenge PoC 的畫面：選題 → 選語言 → 寫程式 → 執行（自訂輸入）或提交（全部測資）。
 * 模組分工：registry.js 題目、editor.js 編輯器、runtime.js 執行環境、judge.js 評測、storage.js 儲存；外觀沿用 shared/ 的 CS LAB 樣式與楓之谷外觀。 */
import { CHALLENGES, byId } from './registry.js';
import { createEditor } from '../../shared/code/editor.js';
import { LANGS, execute, stop, isReady, setPhaseListener } from '../../shared/code/runtime.js';
import { judge, VERDICT, verdictOf } from '../../shared/code/judge.js';
import { storage } from './storage.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SHOW = 4000; // 測資顯示的字元上限（大型測資只顯示開頭）
const clip = s => s.length > SHOW ? s.slice(0, SHOW) + `\n…（共 ${s.length.toLocaleString()} 字元，只顯示開頭）` : s;

const ui = storage.ui();
let challenge = byId(ui.challenge) || CHALLENGES[0];
let language = LANGS[ui.language] ? ui.language : 'c';
let busy = false, stopRequested = false, outTab = 'stdout', last = { stdout: '', stderr: '', compile: '' };
let saveTimer = null, lastJudge = null;

const editor = createEditor($('editor'), { onChange: () => scheduleSave(), onRun: () => run() });

/* ---------- 題目與語言 ---------- */
function drawList() {
  $('problemList').innerHTML = CHALLENGES.map((c, i) => {
    const r = storage.result(c.id, language), v = r && VERDICT[r.verdict];
    return `<li><button type="button" class="poc-item" data-id="${c.id}" aria-current="${c === challenge}"><span class="poc-num">${String(i + 1).padStart(2, '0')}</span><span class="poc-name">${esc(c.title)}</span>${v ? `<span class="tag ${v.tone === 'ok' ? 'ok' : 'warn'}" title="${LANGS[language].label} 最近一次提交">${v.tone === 'ok' ? '✓ ' : ''}${esc(r.passed)}/${esc(r.total)}</span>` : ''}</button></li>`;
  }).join('');
}
function drawStatement() {
  const c = challenge, samples = c.cases.filter(x => x.visible);
  $('statement').innerHTML = `<h2 class="label" id="stTitle">${esc(c.title)}</h2>
    <p>${esc(c.statement)}</p>
    <h3>輸入</h3><p>${esc(c.input)}</p>
    <h3>輸出</h3><p>${esc(c.output)}</p>
    <p class="muted small">時限每筆 ${c.timeLimitMs} ms · 測資 ${c.cases.length} 筆（公開 ${samples.length} 筆） · C 與 C++ 不含編譯時間</p>
    ${samples.map((s, i) => `<div class="poc-sample"><div><b>範例輸入 ${i + 1}</b><pre>${esc(s.input) || '<span class="muted">（空）</span>'}</pre></div><div><b>範例輸出 ${i + 1}</b><pre>${esc(s.output)}</pre></div></div>`).join('')}`;
}
function drawLangs() {
  $('langSeg').innerHTML = Object.entries(LANGS).map(([k, l]) => `<button type="button" data-lang="${k}" aria-pressed="${k === language}" title="${esc(l.std)}">${esc(l.label)}</button>`).join('');
  drawRuntime();
}
function drawRuntime(text) {
  const l = LANGS[language];
  $('runtimeStatus').textContent = text || `${l.std} · ${isReady(language) ? '執行環境已就緒' : l.runtime === 'cc' ? '第一次執行會下載編譯器（約 100 MB）' : l.runtime === 'py' ? '第一次執行會下載 Pyodide（約 13 MB）' : '執行環境在沙箱 Worker 裡'}`;
}

function load() {
  const saved = storage.code(challenge.id, language);
  editor.setLanguage(language);
  editor.value = saved ? saved.source : challenge.starter[language];
  $('saveState').textContent = saved ? `已還原 ${new Date(saved.savedAt).toLocaleString()} 的程式碼${saved.version !== challenge.version ? '（題目已更新）' : ''}` : '';
  const first = challenge.cases.find(x => x.visible);
  $('stdin').value = first ? first.input : '';
  drawList(); drawStatement(); drawLangs(); clearResult();
  storage.saveUi({ challenge: challenge.id, language });
}
function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  const ok = storage.saveCode(challenge.id, language, editor.value, challenge.version);
  $('saveState').textContent = ok ? '已自動儲存' : '無法儲存（瀏覽器停用了本機儲存）';
}
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); }
const flush = () => { if (saveTimer) saveNow(); };
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

$('problemList').addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (!b || busy) return;
  flush(); challenge = byId(b.dataset.id); load();
});
$('langSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-lang]'); if (!b || busy || b.dataset.lang === language) return;
  flush(); language = b.dataset.lang; load();
});
$('resetBtn').addEventListener('click', () => {
  if (busy) return;
  if (editor.value !== challenge.starter[language] && !confirm(`把 ${LANGS[language].label} 的程式碼重設為起始程式碼？目前的內容會被取代（其他語言不受影響）。`)) return;
  editor.value = challenge.starter[language]; storage.clearCode(challenge.id, language);
  $('saveState').textContent = '已重設為起始程式碼';
});

/* ---------- 結果 ---------- */
function clearResult() { $('result').innerHTML = ''; $('cases').innerHTML = ''; setOut({ stdout: '', stderr: '', compile: '' }); }
function setOut(o) {
  last = o;
  document.querySelectorAll('#outTabs [data-out]').forEach(b => {
    const k = b.dataset.out, on = k === outTab;
    b.setAttribute('aria-pressed', on); b.setAttribute('aria-selected', on);
    b.classList.toggle('has', !!o[k]);
  });
  $('outPre').textContent = o[outTab] || '（沒有內容）';
}
$('outTabs').addEventListener('click', e => { const b = e.target.closest('[data-out]'); if (b) { outTab = b.dataset.out; setOut(last); } });
const pickTab = r => { outTab = r.status === 'compile_error' ? 'compile' : r.stderr && r.status !== 'accepted' ? 'stderr' : 'stdout'; };
const note = r => r.note ? `<p class="small">${esc(r.note)}</p>` : '';
const ms = r => `${r.elapsedMs} ms${r.compileMs ? ` · 編譯 ${Math.round(r.compileMs)} ms` : ''}${r.memoryBytes ? ` · 記憶體 ${(r.memoryBytes / 1048576).toFixed(1)} MiB` : ''}`;

function banner(v, title, body) {
  const V = VERDICT[v];
  $('result').innerHTML = `<div class="note ${V.tone} poc-verdict" data-verdict="${v}"><b>${esc(V.label)}</b> <span>${esc(V.zh)}</span>${title ? ` · ${title}` : ''}${body || ''}</div>`;
}

const line = t => t === undefined ? '（沒有這一行）' : t === '' ? '（空行）' : `<code>${esc(t)}</code>`;
function caseRow(c, cr) {
  const head = `<span class="poc-case-name">#${c.index + 1} ${esc(c.name)}</span>`;
  if (!cr) return `<li class="poc-case" data-state="${c.state || 'pending'}">${head}<span class="muted small">${c.state === 'running' ? '執行中…' : c.state === 'skipped' ? '未執行' : '等待中'}</span></li>`;
  const V = VERDICT[cr.verdict], r = cr.result;
  const detail = cr.visible ? `<details${cr.verdict !== 'AC' ? ' open' : ''}><summary>input / expected / actual</summary><div class="poc-io"><div><b>input</b><pre>${esc(clip(challenge.cases[c.index].input)) || '<span class="muted">（空）</span>'}</pre></div><div><b>expected</b><pre>${esc(clip(challenge.cases[c.index].output))}</pre></div><div><b>actual</b><pre>${esc(clip(r.stdout)) || '<span class="muted">（沒有輸出）</span>'}</pre></div></div>${r.stderr ? `<b>stderr</b><pre>${esc(clip(r.stderr))}</pre>` : ''}</details>` : '<span class="muted small">隱藏測資：只顯示結果</span>';
  const diff = cr.diff ? `<p class="small">第 ${cr.diff.line} 行不同：期望 ${line(cr.diff.expected)}，實際 ${line(cr.diff.actual)}</p>` : '';
  return `<li class="poc-case" data-state="done" data-verdict="${cr.verdict}">${head}<span class="tag ${V.tone === 'ok' ? 'ok' : 'warn'}">${esc(V.label)}</span><span class="muted small">${ms(r)}</span>${cr.visible || cr.verdict !== 'WA' ? diff : ''}${note(r)}${detail}</li>`;
}

/* ---------- 執行與提交 ---------- */
function setBusy(b) {
  busy = b;
  ['runBtn', 'submitBtn', 'resetBtn'].forEach(id => $(id).disabled = b);
  $('stopBtn').disabled = !b;
  document.querySelectorAll('#langSeg button, #problemList button').forEach(x => x.disabled = b);
  $('work').setAttribute('aria-busy', b);
}
const PHASE = { loading: '正在載入執行環境…', compiling: '正在編譯…', running: '執行中…' };
setPhaseListener((kind, phase, info) => {
  if (!busy) return;
  let t = PHASE[phase] || '';
  if (phase === 'compiling' && info && info.totalLength) t = `正在下載編譯器 ${Math.round(info.doneLength / 1048576)} / ${Math.round(info.totalLength / 1048576)} MB…`;
  drawRuntime(t);
});

async function run() {
  if (busy) return;
  flush(); setBusy(true); clearResult(); stopRequested = false;
  $('result').innerHTML = '<div class="note">執行中…</div>';
  const r = await execute({ language, source: editor.value, stdin: $('stdin').value, timeoutMs: challenge.timeLimitMs });
  setBusy(false); drawRuntime();
  pickTab(r);
  setOut({ stdout: r.stdout, stderr: r.stderr, compile: r.compileOutput });
  const v = { accepted: null, compile_error: 'CE', runtime_error: 'RE', time_limit_exceeded: 'TLE', internal_error: 'IE' }[r.status];
  if (!v) {
    // 執行沒有評測；若自訂輸入正好是某筆公開測資，順便比對
    const match = challenge.cases.find(x => x.visible && x.input === $('stdin').value);
    const mv = match ? verdictOf(r, match.output) : null;
    $('result').innerHTML = `<div class="note ${mv === 'AC' ? 'ok' : mv ? 'bad' : 'info'} poc-verdict" data-verdict="${mv || 'RUN'}"><b>程式正常結束</b> · ${ms(r)}${match ? ` · 與範例「${esc(match.name)}」的期望輸出${mv === 'AC' ? '相同' : '不同'}` : ''}<br><span class="small muted">「執行」只跑一次你的輸入；要看是否通過所有測資請按「提交評測」。</span></div>`;
  } else banner(v, ms(r), note(r));
}

async function submit() {
  if (busy) return;
  flush(); setBusy(true); stopRequested = false; clearResult();
  const rows = challenge.cases.map((c, index) => ({ index, name: c.name, state: 'pending' }));
  const done = [];
  const paint = () => { $('cases').innerHTML = rows.map((c, i) => caseRow(c, done[i])).join(''); };
  rows[0].state = 'running'; paint();
  $('result').innerHTML = `<div class="note">評測中… 0 / ${rows.length}</div>`;
  const res = await judge(challenge, language, editor.value, {
    shouldStop: () => stopRequested,
    onCase: (i, cr) => { done[i] = cr; if (rows[i + 1]) rows[i + 1].state = 'running'; paint(); $('result').innerHTML = `<div class="note">評測中… ${i + 1} / ${rows.length}</div>`; }
  });
  rows.forEach((c, i) => { if (!done[i]) c.state = 'skipped'; });
  paint();
  setBusy(false); drawRuntime();
  const shown = res.results.find(x => x.verdict !== 'AC') || res.results[res.results.length - 1];
  if (shown) { pickTab(shown.result); setOut({ stdout: shown.result.stdout, stderr: shown.result.stderr, compile: shown.result.compileOutput }); }
  if (res.stopped || stopRequested) { $('result').innerHTML = `<div class="note warn poc-verdict" data-verdict="STOPPED"><b>已停止評測</b> · 通過 ${res.passed} / ${res.total}（這次不記錄）</div>`; return; }
  lastJudge = res;
  storage.saveResult(challenge.id, language, res);
  banner(res.verdict, `通過 <b class="poc-pass">${res.passed} / ${res.total}</b> 筆測資`, shown && res.verdict !== 'AC' ? `<p class="small">第一個沒通過的是 #${shown.index + 1} ${esc(shown.name)}。</p>${note(shown.result)}` : '');
  drawList();
}

$('runBtn').addEventListener('click', run);
$('submitBtn').addEventListener('click', submit);
$('stopBtn').addEventListener('click', () => { stopRequested = true; stop(); });

load();
// 給測試與效能量測讀取目前狀態（唯讀）
window.CSPoc = { get challenge() { return challenge.id; }, get language() { return language; }, get lastJudge() { return lastJudge; }, editor };
