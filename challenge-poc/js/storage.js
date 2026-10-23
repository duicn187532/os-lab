/* Progress Storage：只用 localStorage 裡 cslab.poc.v1. 開頭的鍵，不讀也不寫 CS LAB 課程的進度
 * （cslab.os、cslab.exp 等）。外觀偏好沿用 shared/cslab-skin.js 的 cslab.skin，由它自己讀寫。
 *   cslab.poc.v1.code.<題目 id>.<語言>     { source, savedAt }：每種語言各存一份，切換語言不會蓋掉
 *   cslab.poc.v1.result.<題目 id>.<語言>   { verdict, passed, total, at }：最近一次提交
 *   cslab.poc.v1.ui                        { challenge, language }：上次開的題目與語言
 * 鍵的版本（v1）改了就是全新的一組資料；題目的 version 改了，舊的程式碼仍保留，但會標示題目已更新。
 * 私密模式或停用儲存時，讀寫失敗只會讓自動儲存失效，不影響執行。 */
const PREFIX = 'cslab.poc.v1.';
const get = k => { try { const v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : null; } catch (_) { return null; } };
const set = (k, v) => { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch (_) { return false; } };
const del = k => { try { localStorage.removeItem(PREFIX + k); } catch (_) { /* 停用儲存 */ } };

export const storage = {
  PREFIX,
  code: (id, lang) => get(`code.${id}.${lang}`),
  saveCode: (id, lang, source, version) => set(`code.${id}.${lang}`, { source, version, savedAt: new Date().toISOString() }),
  clearCode: (id, lang) => del(`code.${id}.${lang}`),
  result: (id, lang) => get(`result.${id}.${lang}`),
  saveResult: (id, lang, r) => set(`result.${id}.${lang}`, { verdict: r.verdict, passed: r.passed, total: r.total, at: new Date().toISOString() }),
  ui: () => get('ui') || {},
  saveUi: v => set('ui', v)
};
