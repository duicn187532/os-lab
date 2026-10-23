/* Editor：不依賴外部套件的輕量程式碼編輯器。<textarea> 負責輸入（游標、選取、復原、行動裝置鍵盤都是瀏覽器原生的），
 * 後面疊一層同樣字型的 <pre> 做語法上色，左邊是行號；捲動時三者同步。
 * 按鍵：Tab / Shift+Tab 縮排或取消縮排（可多行）、Enter 保留縮排（{ 或 Python 的 : 之後多一層）、
 * Ctrl/⌘+Enter 執行。鍵盤使用者按 Esc 之後，下一個 Tab 會離開編輯器（不會被困在裡面）。 */
const KW = {
  c: 'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool bool true false NULL',
  cpp: 'alignas auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern false float for friend if inline int long mutable namespace new noexcept nullptr operator private protected public return short signed sizeof static static_cast struct switch template this throw true try typedef typename union unsigned using virtual void volatile while std',
  python: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield print input range len int str list dict set map',
  javascript: 'async await break case catch class const continue default delete do else export extends false finally for function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while yield console readInput readLine'
};
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function tokenizer(lang) {
  const parts = lang === 'python'
    ? ['(#[^\\n]*)', '("""[\\s\\S]*?(?:"""|$)|\'\'\'[\\s\\S]*?(?:\'\'\'|$)|[rbfu]*"(?:\\\\.|[^"\\\\\\n])*"?|[rbfu]*\'(?:\\\\.|[^\'\\\\\\n])*\'?)', '([^\\s\\S])']
    : ['(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$))', `("(?:\\\\.|[^"\\\\\\n])*"?|'(?:\\\\.|[^'\\\\\\n])*'?${lang === 'javascript' ? '|`(?:\\\\.|[^`\\\\])*`?' : ''})`, lang === 'javascript' ? '([^\\s\\S])' : '(^[ \\t]*#[ \\t]*\\w+)'];
  const re = new RegExp(`${parts[0]}|${parts[1]}|${parts[2]}|(\\b\\d[\\w.]*\\b)|([A-Za-z_]\\w*)`, 'gm');
  const kw = new Set(KW[lang].split(' '));
  return src => {
    let html = '', last = 0;
    src.replace(re, (m, com, str, pre, num, id, at) => {
      if (!m) return m;
      html += esc(src.slice(last, at)); last = at + m.length;
      const cls = com ? 'com' : str ? 'str' : pre ? 'pre' : num ? 'num' : id && kw.has(id) ? 'kw' : '';
      html += cls ? `<span class="tk-${cls}">${esc(m)}</span>` : esc(m);
      return m;
    });
    return html + esc(src.slice(last));
  };
}

export function createEditor(root, { onChange, onRun } = {}) {
  root.classList.add('ed');
  root.innerHTML = '<div class="ed-gutter" aria-hidden="true"><div class="ed-lines"></div></div><div class="ed-main"><pre class="ed-hl" aria-hidden="true"><code></code></pre><textarea class="ed-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="程式碼編輯器" aria-describedby="edHelp"></textarea></div>';
  const ta = root.querySelector('textarea'), code = root.querySelector('code'), hl = root.querySelector('.ed-hl'), lines = root.querySelector('.ed-lines');
  let lang = 'c', paint = tokenizer(lang), escaped = false, count = 0;
  const unit = () => '    ';

  function render() {
    code.innerHTML = paint(ta.value) + '\n';
    const n = ta.value.split('\n').length;
    if (n !== count) { count = n; lines.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); }
    sync();
  }
  function sync() { hl.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`; lines.style.transform = `translateY(${-ta.scrollTop}px)`; }
  // 用 insertText 修改，瀏覽器的復原（Ctrl+Z）才會記得
  function replace(start, end, text, selStart, selEnd) {
    ta.focus();
    ta.setSelectionRange(start, end);
    if (!document.execCommand || !document.execCommand('insertText', false, text)) ta.setRangeText(text, start, end, 'end');
    ta.setSelectionRange(selStart ?? start + text.length, selEnd ?? selStart ?? start + text.length);
    changed();
  }
  const changed = () => { render(); onChange?.(ta.value); };

  ta.addEventListener('input', changed);
  ta.addEventListener('scroll', sync);
  ta.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    if (e.key === 'Escape') { escaped = true; return; }
    if (e.key === 'Tab') {
      if (escaped) { escaped = false; return; } // 讓 Tab 移到下一個元件
      e.preventDefault();
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (s === en && !e.shiftKey) { replace(s, en, unit()); return; }
      const le = v.indexOf('\n', en - (en > s && v[en - 1] === '\n' ? 1 : 0)), stop = le < 0 ? v.length : le;
      const block = v.slice(ls, stop).split('\n');
      const out = block.map(l => e.shiftKey ? l.replace(/^( {1,4}|\t)/, '') : unit() + l).join('\n');
      const delta0 = e.shiftKey ? -(block[0].length - block[0].replace(/^( {1,4}|\t)/, '').length) : unit().length;
      replace(ls, stop, out, Math.max(ls, s + delta0), ls + out.length);
      return;
    }
    escaped = false;
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      const line = v.slice(v.lastIndexOf('\n', s - 1) + 1, s), indent = line.match(/^[ \t]*/)[0];
      const before = line.trimEnd(), next = v[en];
      const open = lang === 'python' ? /:$/.test(before) : /[{[(]$/.test(before);
      if (open && lang !== 'python' && /[}\])]/.test(next || '')) { replace(s, en, `\n${indent}${unit()}\n${indent}`, s + 1 + indent.length + unit().length); return; }
      replace(s, en, `\n${indent}${open ? unit() : ''}`);
    }
  });
  // 打出 } 時，若這一行只有空白，就少縮一層
  ta.addEventListener('beforeinput', e => {
    if (e.inputType !== 'insertText' || e.data !== '}' || lang === 'python') return;
    const v = ta.value, s = ta.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, head = v.slice(ls, s);
    if (/^ {4,}$/.test(head) && ta.selectionEnd === s) { e.preventDefault(); replace(s - 4, s, '}'); }
  });

  return {
    get value() { return ta.value; },
    set value(v) { ta.value = v; ta.scrollTop = 0; ta.scrollLeft = 0; render(); },
    setLanguage(l) { lang = l; paint = tokenizer(l); root.dataset.lang = l; render(); },
    focus: () => ta.focus(),
    textarea: ta
  };
}
