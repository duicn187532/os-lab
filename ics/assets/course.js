/* ICS LAB 課程設定：交給 shared/cslab-app.js 使用。 */
window.CSLAB_COURSE = {
  id: 'ics',
  name: 'ICS LAB',
  mark: 'ICS',
  title: '計算機概論互動學習',
  storageKey: 'ics.progress',
  codeLang: 'cpp',   // 程式實作頁籤預設的語言（教材的程式以 C++ 為主）；使用者選過之後以他的選擇為準
  eyebrow: 'INTRODUCTION TO COMPUTER SCIENCE · C++ FIRST',
  heroTitle: '從 0 與 1 出發，<br>一路寫出自己的 C++ 程式。',
  heroLead: '{chapters} 章從數字系統、邏輯閘、CPU、作業系統與網路，走到 C++ 的變數、迴圈、函式、指標、類別與遞迴；用 {labs} 種逐步實驗看見電腦內部發生的每一步。',
  footer: '靜態網站 · 進度只存在此瀏覽器<br>實驗是教學用簡化模型；程式實作題在瀏覽器內的沙盒編譯執行，不會上傳你的程式碼。',
  disclaimer: 'ICS LAB 為原創教學文本，與任何商業教科書均無官方授權關係。模擬器以教學為目的，並非完整的硬體或作業系統實作；C++ 範例以 C++17 標準函式庫撰寫，請也在自己的開發環境（g++ 或 clang++）練習。',
  data: window.ICS_DATA
};
