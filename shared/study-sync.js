/* Optional, offline-first learning sync for GitHub Pages. No build step. */
(function () {
  'use strict';
  if (window.StudySyncV1) return;
  window.StudySyncV1 = true;
  var scriptUrl = document.currentScript && document.currentScript.src;
  var scope = scriptUrl && scriptUrl.indexOf('/shared/') !== -1 ? 'os-lab' : 'self-research';
  var configUrl = new URL('study-sync-config.js', scriptUrl).href;
  var ownerKey = '__study_sync_owner_v1:' + scope;
  var userId = null, client = null, session = null, syncing = false, needsReload = false;
  var meta = {}, conflicts = {}, status = '', initial = true, lastSync = 0, initialized = false;
  var ui = {}, known = null;
  var schema = 'study_sync_entries';

  function read(key, fallback) {
    try { var x = localStorage.getItem(key); return x === null ? fallback : JSON.parse(x); }
    catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }
  function raw(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function storageKey() { return '__study_sync_meta_v1:' + scope + ':' + userId; }
  function valid(k) {
    if (scope === 'self-research') return k.indexOf('study:') === 0;
    var fixed = ['os_lab_2026_v1', 'dsa.progress', 'ailab.progress',
      'dm_lab_progress_v1', 'ics.progress', 'net.progress', 'co-lab-v1',
      'la-lab-v1', 'asm-done'];
    return fixed.indexOf(k) !== -1 || k.indexOf('cslab.code.v1.') === 0 ||
      !!(window.CSLAB_COURSE && k === window.CSLAB_COURSE.storageKey);
  }
  function entries() {
    var result = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && valid(k)) result[k] = localStorage.getItem(k);
      }
    } catch (_) { /* storage blocked */ }
    return result;
  }
  function localSet(key, value) {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    needsReload = true; // Existing lesson apps cache storage in memory.
  }
  function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function parse(s) { try { return JSON.parse(s); } catch (_) { return undefined; } }
  function fail() { throw Error('CONFLICT'); }
  function mergeDeep(a, b, path) {
    if (equal(a, b)) return a;
    if (a === undefined || a === null) return b;
    if (b === undefined || b === null) return a;
    if (path === 'last' || path === 'theme' || path === 'study:level' ||
        path === 'study:mode' || path === 'study:skin') return b;
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      if (/done|solved|complete/.test(path)) return a || b;
      fail();
    }
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (Array.isArray(a) && Array.isArray(b)) {
      if (path.indexOf(':qstat.') !== -1) {
        if (a.length !== b.length) fail();
        return a.map(function (x, i) { return mergeDeep(x, b[i], path + '.' + i); });
      }
      var z = a.slice();
      b.forEach(function (x) { if (!z.some(function (y) { return equal(x, y); })) z.push(x); });
      return z;
    }
    if (typeof a === 'object' && typeof b === 'object' &&
        !Array.isArray(a) && !Array.isArray(b)) {
      if (typeof a.at === 'number' && typeof b.at === 'number' && a.at !== b.at)
        return a.at > b.at ? a : b;
      var out = {}, keys = new Set(Object.keys(a).concat(Object.keys(b)));
      keys.forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(a, k) &&
            Object.prototype.hasOwnProperty.call(b, k))
          out[k] = mergeDeep(a[k], b[k], path + '.' + k);
        else out[k] = Object.prototype.hasOwnProperty.call(b, k) ? b[k] : a[k];
      });
      return out;
    }
    fail(); // Text notes and program drafts require explicit resolution.
  }
  function mergeValues(key, cloudValue, localValue) {
    if (cloudValue === localValue) return cloudValue;
    if (cloudValue === null || localValue === null) fail();
    var a = parse(cloudValue), b = parse(localValue);
    if (a === undefined || b === undefined) fail();
    // Do not silently choose one side for free-form writing.
    if (typeof a === 'string' || typeof b === 'string') fail();
    return JSON.stringify(mergeDeep(a, b, key));
  }
  function message(text) { status = text; render(); }
  function styleUi() {
    var style = document.createElement('style');
    style.textContent = '#study-sync-root{position:fixed;right:12px;bottom:12px;z-index:99990;font:14px/1.5 system-ui,sans-serif;color:#182235}' +
      '#study-sync-root button{cursor:pointer;border:1px solid #9baac2;border-radius:8px;padding:7px 10px;background:#fff;color:#172337;font:inherit}' +
      '#study-sync-root button:disabled{opacity:.5;cursor:not-allowed}' +
      '#study-sync-root .ss-trigger{background:#163b5c;color:white;border:1px solid #83b7d4;box-shadow:0 3px 14px #0004}' +
      '#study-sync-root .ss-panel{background:#fff;color:#182235;border:1px solid #a7b4c5;border-radius:12px;padding:14px;margin-bottom:8px;width:min(328px,calc(100vw - 24px));max-height:75vh;overflow:auto;box-shadow:0 8px 36px #0005}' +
      '#study-sync-root .ss-panel[hidden]{display:none}' +
      '#study-sync-root .ss-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}' +
      '#study-sync-root .ss-status{font-size:12px;margin:9px 0;color:#394962;overflow-wrap:anywhere}' +
      '#study-sync-root .ss-conflict{padding:8px;border:1px solid #d49a59;border-radius:6px;margin:8px 0;overflow-wrap:anywhere}' +
      '#study-sync-root .ss-heading{font-weight:700;font-size:16px}';
    document.head.appendChild(style);
  }
  function el(tag, cls, text) {
    var x = document.createElement(tag);
    if (cls) x.className = cls;
    if (text !== undefined) x.textContent = text;
    return x;
  }
  function button(text, fn) {
    var x = el('button', '', text);
    x.type = 'button'; x.addEventListener('click', fn); return x;
  }
  function render() {
    if (!ui.root) return;
    ui.label.textContent = '☁ ' + (userId ? (needsReload ? '待重新載入' : '學習同步') : '訪客模式');
    ui.status.textContent = status || (userId ? '已登入，進度將同步至雲端。' : '未登入：學習進度只保留在此瀏覽器。');
    ui.identity.textContent = userId ? ('帳號：' + ((session && session.user && session.user.email) || userId.slice(0, 8))) : '免登入可使用完整教材';
    ui.github.hidden = !!userId || !client;
    ui.google.hidden = !!userId || !client;
    ui.logout.hidden = !userId;
    ui.now.hidden = !userId;
    ui.reload.hidden = !needsReload;
    ui.offline.hidden = !!client;
    ui.conflicts.replaceChildren();
    var keys = Object.keys(conflicts);
    if (keys.length) {
      ui.conflicts.appendChild(el('strong', '', '有 ' + keys.length + ' 筆衝突，未覆蓋任何一方：'));
      keys.forEach(function (key) {
        var row = el('div', 'ss-conflict');
        row.appendChild(el('div', '', key));
        var actions = el('div', 'ss-actions');
        actions.appendChild(button('保留本機版本', function () { resolve(key, 'local'); }));
        actions.appendChild(button('採用雲端版本', function () { resolve(key, 'remote'); }));
        row.appendChild(actions);
        ui.conflicts.appendChild(row);
      });
    }
  }
  function createUi() {
    if (!document.body) return;
    styleUi();
    ui.root = el('div'); ui.root.id = 'study-sync-root';
    var panel = el('section', 'ss-panel'); panel.hidden = true;
    panel.setAttribute('aria-label', '學習進度同步');
    panel.appendChild(el('div', 'ss-heading', '學習進度同步'));
    ui.identity = el('div', 'ss-status');
    ui.status = el('div', 'ss-status');
    ui.offline = el('div', 'ss-status', '尚未設定 Supabase；目前維持原有訪客儲存模式。');
    panel.appendChild(ui.identity);
    panel.appendChild(ui.status);
    panel.appendChild(ui.offline);
    var actions = el('div', 'ss-actions');
    ui.github = button('GitHub 登入', function () { login('github'); });
    ui.google = button('Google 登入', function () { login('google'); });
    ui.logout = button('安全登出', logout);
    ui.now = button('立即同步', function () { sync(true); });
    ui.reload = button('重新載入套用', function () { location.reload(); });
    actions.appendChild(ui.github); actions.appendChild(ui.google);
    actions.appendChild(ui.now); actions.appendChild(ui.reload);
    actions.appendChild(ui.logout);
    actions.appendChild(button('匯出本機與衝突備份', backup));
    panel.appendChild(actions);
    ui.conflicts = el('div');
    panel.appendChild(ui.conflicts);
    ui.label = button('☁ 訪客模式', function () {
      panel.hidden = !panel.hidden;
      ui.label.setAttribute('aria-expanded', String(!panel.hidden));
    });
    ui.label.className = 'ss-trigger';
    ui.label.setAttribute('aria-expanded', 'false');
    ui.root.appendChild(panel); ui.root.appendChild(ui.label);
    document.body.appendChild(ui.root);
    render();
  }
  function backup() {
    var data = { format: 'study-sync-backup-v1', app: scope,
      exported: new Date().toISOString(), entries: entries(), conflicts: conflicts };
    var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = scope + '-progress-backup.json';
    a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = url;
      s.onload = resolve; s.onerror = function () { reject(Error('無法載入同步元件')); };
      document.head.appendChild(s);
    });
  }
  async function login(provider) {
    try {
      var redirect = location.origin + location.pathname; // no lesson # route on OAuth callback
      var result = await client.auth.signInWithOAuth({ provider: provider,
        options: { redirectTo: redirect } });
      if (result.error) throw result.error;
    } catch (e) { message('登入失敗：' + e.message); }
  }
  async function logout() {
    if (Object.keys(conflicts).length) { message('請先處理衝突並下載備份，再登出。'); return; }
    await sync(true);
    if (Object.keys(conflicts).length || status.indexOf('失敗') !== -1) {
      message('同步未完成；為保護本機資料，已取消登出。'); return;
    }
    // Archive and remove signed-in data before returning to guest mode. Without
    // this, the next account could accidentally import the previous user's cache.
    write('__study_sync_logout_backup:' + scope + ':' + userId + ':' + Date.now(),
      { exported: new Date().toISOString(), entries: entries() });
    var result = await client.auth.signOut();
    if (result.error) { message('登出失敗：' + result.error.message); return; }
    Object.keys(entries()).forEach(function (k) { localStorage.removeItem(k); });
    localStorage.setItem(ownerKey, 'guest');
    location.reload();
  }
  function switchUser(next, user) {
    if (userId === next && initialized) { session = user ? { user: user } : null; render(); return; }
    var old = raw(ownerKey) || 'guest';
    // Never import one signed-in account's cached progress into another account.
    if (old !== 'guest' && old !== next) {
      Object.keys(entries()).forEach(function (k) { localStorage.removeItem(k); });
      needsReload = true;
    }
    localStorage.setItem(ownerKey, next || 'guest');
    userId = next;
    session = user ? { user: user } : null;
    meta = userId ? read(storageKey(), {}) : {};
    conflicts = {};
    initialized = true;
    initial = true;
    if (userId) {
      var backupKey = '__study_sync_first_backup:' + scope + ':' + userId;
      if (!raw(backupKey)) write(backupKey, { exported: new Date().toISOString(), entries: entries() });
      sync(true);
    } else {
      message('訪客模式：可繼續學習，進度只保留在此瀏覽器。');
      if (needsReload) render();
    }
  }
  function storeMeta() { if (userId) write(storageKey(), meta); }
  function resolve(key, choice) {
    var c = conflicts[key];
    if (!c) return;
    // Keep a durable local snapshot of both alternatives before choosing.
    write('__study_sync_conflict_backup:' + scope + ':' + userId + ':' + Date.now(),
      { key: key, local: c.local, cloud: c.value, revision: c.revision });
    if (choice === 'remote') {
      localSet(key, c.value);
      meta[key] = { revision: c.revision, base: c.value };
    } else meta[key] = { revision: c.revision, base: c.value };
    delete conflicts[key];
    storeMeta(); render();
    if (choice === 'local') sync(true);
    else message('已採用雲端資料，請重新載入頁面套用。');
  }
  async function cas(key, value, revision) {
    var r = await client.rpc('study_sync_cas', {
      p_app_id: scope, p_storage_key: key,
      p_value: value, p_expected_revision: revision
    });
    if (r.error) throw r.error;
    return r.data && r.data[0];
  }
  async function sync(force) {
    if (!userId || !client || syncing || needsReload) return;
    if (!force && Date.now() - lastSync < 6000) return;
    syncing = true;
    message('正在同步…');
    try {
      var result = await client.from(schema).select('storage_key,value,revision').eq('app_id', scope);
      if (result.error) throw result.error;
      var cloud = {};
      (result.data || []).forEach(function (row) { if (valid(row.storage_key)) cloud[row.storage_key] = row; });
      var local = entries(), keys = new Set(Object.keys(local).concat(Object.keys(cloud), Object.keys(meta)));
      var found = {}, downloaded = 0, uploaded = 0;
      for (var key of keys) {
        if (!valid(key)) continue;
        var row = cloud[key] || { value: null, revision: 0 };
        var value = Object.prototype.hasOwnProperty.call(local, key) ? local[key] : null;
        var base = meta[key];
        var target = value;
        if (value === row.value) {
          meta[key] = { revision: row.revision, base: value };
          continue;
        }
        if (base && value === base.base) {
          localSet(key, row.value); downloaded++;
          meta[key] = { revision: row.revision, base: row.value };
          continue;
        }
        if (row.revision === 0 && value === null) continue;
        if (!base && value === null && row.revision > 0) {
          localSet(key, row.value); downloaded++;
          meta[key] = { revision: row.revision, base: row.value };
          continue;
        }
        try {
          if (base && base.revision === row.revision) target = value;
          else if (row.revision === 0) target = value;
          else target = mergeValues(key, row.value, value);
        } catch (_) {
          found[key] = { local: value, value: row.value, revision: row.revision };
          continue;
        }
        if (target !== value) { localSet(key, target); downloaded++; }
        if (target === row.value) {
          meta[key] = { revision: row.revision, base: row.value };
          continue;
        }
        var success = false;
        for (var attempt = 0; attempt < 2; attempt++) {
          var answer = await cas(key, target, row.revision);
          if (answer && answer.applied) {
            meta[key] = { revision: Number(answer.revision), base: target };
            uploaded++; success = true; break;
          }
          if (!answer) throw Error('同步服務未回傳版本');
          row = { revision: Number(answer.revision), value: answer.value };
          try { target = mergeValues(key, row.value, target); }
          catch (_) { break; }
        }
        if (!success) found[key] = { local: value, value: row.value, revision: row.revision };
      }
      storeMeta();
      conflicts = found;
      lastSync = Date.now(); initial = false;
      message(Object.keys(found).length ? '有版本衝突，需選擇保留版本。' :
        needsReload ? '已取得雲端變更，請重新載入套用。' :
        '已同步（上傳 ' + uploaded + ' 筆，下載 ' + downloaded + ' 筆）');
    } catch (e) {
      message('同步失敗：' + (e && e.message ? e.message : '網路或設定問題') + '；本機進度仍保留。');
    } finally { syncing = false; }
  }
  async function setup() {
    createUi();
    try { await loadScript(configUrl); }
    catch (_) { message('同步設定檔尚未部署，仍可使用訪客模式。'); return; }
    var c = window.STUDY_SYNC_CONFIG || {};
    if (!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(c.url || '') || !c.anonKey) {
      message('尚未設定雲端專案，仍可使用訪客模式。'); return;
    }
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.min.js');
      if (!window.supabase || !window.supabase.createClient) throw Error('SDK 未載入');
      client = window.supabase.createClient(c.url, c.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange(function (_event, current) {
        setTimeout(function () { switchUser(current && current.user ? current.user.id : null, current && current.user); }, 0);
      });
      var result = await client.auth.getSession();
      if (result.error) throw result.error;
      switchUser(result.data.session && result.data.session.user ? result.data.session.user.id : null,
        result.data.session && result.data.session.user);
      window.addEventListener('online', function () { sync(true); });
      window.addEventListener('focus', function () { sync(false); });
      window.addEventListener('storage', function () { sync(false); });
      setInterval(function () { if (!document.hidden) sync(false); }, 15000);
    } catch (e) { message('雲端服務啟動失敗：' + e.message + '；本機學習不受影響。'); }
    render();
  }
  window.StudySync = { sync: function () { return sync(true); }, backup: backup };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();