# 跨裝置學習進度同步（Supabase）

目前為可選功能：**未設定 Supabase 時原有教材與 localStorage 照常使用**。不要在公開 GitHub 儲存任何 OAuth client secret、service_role key 或使用者 token。

## 部署

1. 建立一個 Supabase 專案，於 SQL Editor 執行 `study-sync/schema.sql`。
2. 在 Supabase Authentication → Providers 啟用 GitHub、Google，按各供應商的 OAuth 文件設定 callback；Secret 僅填入 Supabase 後台，不可寫入 GitHub Pages。
3. 在 Authentication → URL Configuration 設定 Site URL 與 Additional Redirect URLs，**同時加入** `https://duicn187532.github.io/os-lab/`、各科目網址及 `https://duicn187532.github.io/self-research/`、`https://duicn187532.github.io/self-research/papers/*`。登入跳轉路徑必須在 allow list 內。
4. 把 `study-sync-config.js` 的 `url` 和 `anonKey` 設為專案公開 URL 及 publishable/anon key；兩個 Repository 使用**同一個** Supabase 專案，才可共用登入識別。
5. 測試訪客、不同行動裝置登入、兩帳號隔離、離線編輯與同時寫入；有衝突時手動決定版本，並先匯出 JSON。

## 行為與限制

- 僅同步網站允許的學習紀錄鍵；OAuth 使用 Supabase Auth，資料庫 SELECT 受 RLS 限制，寫入經 CAS 函式檢查登入者、紀錄版本與使用者 ID。
- 第一次同步前保留本機快照於瀏覽器 `__study_sync_first_backup:...`；登入之前建議先使用原有 JSON 匯出功能留下額外備份。
- 多裝置學習採定期檢查、視窗重新聚焦及回到線上後同步；頁面在初始化時已將狀態載入記憶體，所以雲端進度下載後必須點選「重新載入套用」。
- 筆記與程式草稿不做盲目最後寫入獲勝；出現衝突時可明確選擇版本。衝突選擇前請手動備份；更完整的逐欄衝突編輯 UI 可後續擴充。
- 不支援自動將 Google 與 GitHub 兩種登入方式綁為同一身分；如需跨供應商帳號連結，另行導入 Supabase identity linking。
- 免費方案可能有閒置暫停、配額與 CDN 可用性限制；離線本機資料仍能使用。
