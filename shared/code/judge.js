/* Judge：逐筆執行測資、比較輸出、決定結果。執行環境（runtime.js）只回報程式發生了什麼；對錯只在這裡判斷。
 * 每筆測資都是獨立的一次執行（新的 Worker / 新的 WebAssembly 實例 / 新的 Python 命名空間）。
 * 輸出比較規則（四種語言相同）：\r\n 視為 \n；每一行行尾的空白與 tab 忽略；檔尾的空行忽略。
 * 其他差異都算錯：行首空白、字中間的空白數量、大小寫、多印或少印的行。
 * 這是個人學習用的自我檢查，不是防作弊的評測系統：程式、測資與判斷都在你自己的瀏覽器裡。 */
import { execute } from './runtime.js';

export const VERDICT = {
  AC: { label: 'Accepted', zh: '通過', tone: 'ok' },
  WA: { label: 'Wrong Answer', zh: '答案錯誤', tone: 'bad' },
  CE: { label: 'Compile Error', zh: '編譯錯誤', tone: 'bad' },
  RE: { label: 'Runtime Error', zh: '執行錯誤', tone: 'bad' },
  TLE: { label: 'Time Limit Exceeded', zh: '超過時限', tone: 'warn' },
  IE: { label: 'Internal Error', zh: '系統錯誤', tone: 'warn' }
};
const FROM_STATUS = { compile_error: 'CE', runtime_error: 'RE', time_limit_exceeded: 'TLE', internal_error: 'IE' };

// 時限：題目的 timeLimitMs 是 C 的時限，其他語言放寬：Python 3 倍、JavaScript 1.5 倍；C++ 也是 3 倍，
// 因為瀏覽器版 libc++ 的 iostream 很慢（實測 cin 讀一個整數約 3 µs，scanf 約 0.05 µs），不放寬的話照題意寫的 cin 會逾時。
// 各語言另有指定（timeLimits）時以題目為準；timeFactor: false 表示所有語言同一個時限。
export const TIME_FACTOR = { c: 1, cpp: 3, javascript: 1.5, python: 3 };
export const timeLimit = (challenge, language) => (challenge.timeLimits && challenge.timeLimits[language]) || Math.round((challenge.timeLimitMs || 2000) * (challenge.timeFactor === false ? 1 : TIME_FACTOR[language] || 1));

export const normalize = s => String(s ?? '').replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
export const same = (actual, expected) => normalize(actual) === normalize(expected);

// 第一個不同的行（給錯誤訊息用）
export function firstDiff(actual, expected) {
  const a = normalize(actual).split('\n'), e = normalize(expected).split('\n');
  for (let i = 0; i < Math.max(a.length, e.length); i++) if (a[i] !== e[i]) return { line: i + 1, actual: a[i], expected: e[i] };
  return null;
}

export function verdictOf(result, expected) {
  if (result.status !== 'accepted') return FROM_STATUS[result.status] || 'IE';
  return same(result.stdout, expected) ? 'AC' : 'WA';
}

/* 提交：依序跑完所有測資（遇到編譯錯誤、系統錯誤或逾時就停下，其餘測資標為未執行）。onCase(i, caseResult) 用來即時更新畫面。
 * 整體結果：全部通過是 AC，否則是第一個沒通過的測資的結果。 */
export async function judge(challenge, language, source, { onCase, shouldStop } = {}) {
  const cases = challenge.cases, results = [];
  for (let i = 0; i < cases.length; i++) {
    if (shouldStop?.()) break;
    const c = cases[i];
    const r = await execute({ language, source, stdin: c.input, timeoutMs: timeLimit(challenge, language), outputBytes: challenge.outputBytes });
    const v = verdictOf(r, c.output);
    const cr = { index: i, name: c.name, visible: !!c.visible, verdict: v, result: r, diff: v === 'WA' ? firstDiff(r.stdout, c.output) : null };
    results.push(cr);
    onCase?.(i, cr);
    // 編譯錯誤、系統錯誤：再跑也一樣；超過時限：每次都要終止並重建執行環境（Python 要數秒），後面的測資不再執行
    if (v === 'CE' || v === 'IE' || v === 'TLE') break;
  }
  const passed = results.filter(r => r.verdict === 'AC').length;
  const failed = results.find(r => r.verdict !== 'AC');
  const complete = results.length === cases.length;
  return { verdict: failed ? failed.verdict : complete ? 'AC' : 'IE', passed, total: cases.length, results, stopped: !complete && !failed };
}
