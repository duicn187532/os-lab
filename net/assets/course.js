/* NET LAB 課程設定：交給 shared/cslab-app.js 使用。 */
window.CSLAB_COURSE = {
  id: 'net',
  name: 'NET LAB',
  mark: 'NET',
  title: '計算機網路互動學習',
  storageKey: 'net.progress',
  codeLang: 'python',   // 程式實作頁籤預設的語言（教材範例以 Python 的 socket、struct 為主）；使用者選過之後以他的選擇為準
  eyebrow: 'COMPUTER NETWORKS · TOP-DOWN',
  heroTitle: '一個封包的旅程，<br>從應用層一路走到線路上。',
  heroLead: '{chapters} 章由上而下：HTTP、DNS、Socket，到 TCP 的可靠傳輸與壅塞控制、IP 定址與路由、乙太網路與 ARP，最後是 TLS 與整合；用 {labs} 種逐步實驗親眼看協定怎麼一來一往。',
  footer: '靜態網站 · 進度只存在此瀏覽器<br>實驗是教學用簡化模型；程式實作題在瀏覽器內的沙盒編譯執行，不會上傳你的程式碼，也不會連上網路。',
  disclaimer: 'NET LAB 為原創教學文本，與任何商業教科書均無官方授權關係。章節安排參考常見的由上而下教法；模擬器以教學為目的，並非完整的協定實作。Python 範例只用標準函式庫，需要網路的範例請在自己的電腦上執行。',
  data: window.NET_DATA
};
