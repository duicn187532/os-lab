/* DSA LAB 課程設定：交給 shared/cslab-app.js 使用。 */
(function () {
  // 舊版把進度分存在四個鍵（dsa.complete、dsa.answers、dsa.notes、dsa.theme）。共用 shell 只用一個鍵，
  // 第一次開啟新版時把舊資料匯入；舊鍵保留不動，所以退回舊版也不會遺失任何東西。
  const KEY = 'dsa.progress', D = window.DSA_DATA;
  try {
    if (localStorage.getItem(KEY) !== null) return;
    const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } };
    const done = read('dsa.complete') || {}, answers = read('dsa.answers') || {}, notes = read('dsa.notes') || {};
    const theme = String(localStorage.getItem('dsa.theme') || '').replace(/"/g, ''); // 舊版存的是未經 JSON 編碼的字串
    const byId = Object.fromEntries(D.lessons.map(l => [l.id, l]));
    const s = { done: {}, notes: {}, wrong: {}, theme: theme === 'light' || theme === 'dark' ? theme : null };
    for (const [id, ok] of Object.entries(done)) if (ok && byId[id]) s.done[id] = true;
    for (const [id, text] of Object.entries(notes)) if (byId[id] && typeof text === 'string' && text.trim()) s.notes[id] = text;
    for (const [k, choice] of Object.entries(answers)) {
      const [id, qi] = k.split('-').map(Number), q = byId[id]?.quiz[qi];
      if (q && choice !== q[2]) s.wrong[`${id}:${qi}`] = { n: 1, at: Date.now() }; // 最後一次作答仍是錯的 → 放進錯題本
    }
    if (Object.keys(s.done).length || Object.keys(s.notes).length || Object.keys(s.wrong).length || s.theme) localStorage.setItem(KEY, JSON.stringify(s));
  } catch (_) { /* 私密模式等情況下略過 */ }
})();

window.CSLAB_COURSE = {
  id: 'dsa',
  name: 'DSA LAB',
  mark: 'DSA',
  title: '資料結構與演算法互動學習',
  storageKey: 'dsa.progress',
  eyebrow: 'DATA STRUCTURES & ALGORITHMS · SEE EVERY STEP',
  heroTitle: '看懂資料如何流動，<br>讓演算法真正動起來。',
  heroLead: '{chapters} 章從記憶體出發，先用 ELI5 類比建立直覺，再回到原理與 Python / C 範例；用 {labs} 種逐步實驗親眼看資料結構怎麼變化。',
  footer: '完全離線的靜態網站 · 進度只存在此瀏覽器<br>模擬器是教學用簡化模型，不會執行輸入的程式碼。',
  disclaimer: 'DSA LAB 為原創教學文本，與任何商業教科書均無官方授權關係。模擬器以教學為目的，並非完整的生產環境實作；Python、C 範例請在自己的開發環境執行。',
  data: window.DSA_DATA
};
