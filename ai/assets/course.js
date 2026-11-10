/* AI LAB 課程設定：交給 shared/cslab-app.js 使用。 */
(function () {
  const KEY = 'ailab.progress';
  // 舊版把進度分成 ailab.completed / answers / notes / theme 四個鍵（以章節索引為鍵）。
  // 第一次開啟新版時合併成共用 shell 的單一紀錄；舊鍵保留不刪，章節 id 就是舊版索引，所以可以直接對應。
  try {
    if (localStorage.getItem(KEY) === null) {
      const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } };
      const completed = get('ailab.completed') || {}, answers = get('ailab.answers') || {}, notes = get('ailab.notes') || {}, theme = get('ailab.theme');
      const byId = Object.fromEntries(window.AI_DATA.lessons.map(l => [l.id, l]));
      const store = { done: {}, notes: {}, wrong: {} };
      Object.keys(completed).forEach(i => { if (completed[i] && byId[i]) store.done[i] = true; });
      Object.keys(notes).forEach(i => { if (typeof notes[i] === 'string' && notes[i] && byId[i]) store.notes[i] = notes[i]; });
      // 舊版答案 "章-題": 選項；最後一次選錯的題目放進錯題本。
      Object.keys(answers).forEach(k => { const [i, j] = k.split('-').map(Number), q = byId[i]?.quiz[j]; if (q && answers[k] !== q[2]) store.wrong[`${i}:${j}`] = { n: 1, at: Date.now() }; });
      if (theme === 'light' || theme === 'dark') store.theme = theme;
      if (Object.keys(store.done).length || Object.keys(store.notes).length || Object.keys(store.wrong).length || store.theme) localStorage.setItem(KEY, JSON.stringify(store));
    }
  } catch (_) { /* 私密模式等情況下略過 */ }
  // 舊版網址 #/chapter/3/lab → #/ch/3/lab（notes 頁籤已併入「觀念」頁的筆記區）。
  const m = location.hash.match(/^#\/chapter\/(\d+)(?:\/(lesson|lab|quiz|notes))?$/);
  if (m) history.replaceState(null, '', `#/ch/${m[1]}/${({ lab: 'lab', quiz: 'quiz' })[m[2]] || 'learn'}`);
})();

window.CSLAB_COURSE = {
  id: 'ai',
  name: 'AI LAB',
  mark: 'AI',
  title: 'AI 演算法與模型互動學習',
  storageKey: 'ailab.progress', // 由舊版四個 ailab.* 鍵合併而來：已完成章節、筆記、錯題與主題設定會保留
  eyebrow: 'INTERACTIVE AI COURSE · FROM FIRST PRINCIPLES',
  heroTitle: '從一個公式開始，<br>親手拆解 AI 的運作。',
  heroLead: '數學 → 傳統機器學習 → 深度學習 → Transformer / LLM → RAG / Agent。先用 ELI5 類比建立直覺，再讀核心公式與 Python 範例，最後用 {labs} 種逐步實驗看見模型如何計算。',
  footer: '完全離線的靜態網站 · 進度只存在此瀏覽器<br>示意實驗不等於大型模型的真實輸出。',
  disclaimer: 'AI LAB 的實驗都是在瀏覽器內計算的教學小模型，部分分數（Attention 的 Q·K、RAG 的語義分數、Token ID、Diffusion 的雜訊）是人工設定的示意資料，不代表任何大型模型的真實輸出或準確率。',
  data: window.AI_DATA
};
