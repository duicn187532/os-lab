/* OS-specific rich textbook layer: MathML, state tables, fully worked derivations and executable L3 contracts.
 * Entries are trusted curriculum authored in repository, never user input.
 * Stored separately to preserve the original 21 IDs, quizzes, progress and Maple mode.
 */
'use strict';
(function(){
const D=window.OS_DATA;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const tag=(name,body)=>'<'+name+'>'+body+'</'+name+'>';
const v=x=>{ const match=String(x).match(/^([A-Za-z\u0370-\u03ff]+)_\{?([^}]+)\}?$/);
 return match ? '<msub>'+tag('mi',esc(match[1]))+tag('mi',esc(match[2]))+'</msub>':tag('mi',esc(x)); };
const n=x=>tag('mn',esc(x)),o=x=>tag('mo',esc(x)),t=x=>tag('mtext',esc(x));
const row=(...xs)=>tag('mrow',xs.join('')),frac=(a,b)=>'<mfrac>'+a+b+'</mfrac>',sub=(a,b)=>'<msub>'+a+b+'</msub>',sup=(a,b)=>'<msup>'+a+b+'</msup>';
const math=(...xs)=>'<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="數學公式">'+row(...xs)+'</math>';
const eq=(lhs,rhs)=>math(lhs,o('='),rhs);
const trace=window.OS_TEXTBOOK_TRACES||[];
if(trace.length!==29)throw Error('29 authored textbook chapter traces required; got '+trace.length);
const exercises=CSLab.code.list().filter(p=>p.id.startsWith("os.textbook."));
if(exercises.length!==29)throw Error('29 code exercises required for executable L3');
const specs=Object.fromEntries(trace.map(z=>{
 const item=exercises.find(p=>p.lesson===z.id);
 if(!item)throw Error('L3 code exercise missing: '+z.id);
 const tests=CSLab.code.cases(item);
 const first=tests.find(c=>c.visible), edge=tests.find(c=>!c.visible)||tests[1];
 if(!first||!edge)throw Error('L3 sample/edge missing: '+z.id);
 return [z.id,{l2:z,symbols:z.symbols,l3:{
  title:'L3｜可重現驗證與反例',input:first.input.trimEnd(),expected:first.output.trimEnd(),
  counterInput:edge.input.trimEnd(),counterExpected:edge.output.trimEnd(),
  counterexample:z.counterexample,
  command:'node os/linux-labs/l3-verify.cjs --chapter '+z.id+'\nnode os/linux-labs/student-verify.cjs --chapter '+z.id+' --language c --source solution.c',
  checks:[z.invariant,'l3-verify 僅核對題庫預期答案；student-verify 才會編譯／執行學生自己的程式，逐筆比對公開與隱藏測資。','提交可執行程式、輸入、輸出、反例、系統版本與解釋，不得只複製參考答案。'],
  steps:['在 repository 根目錄安裝 Node.js 22 以上並開啟終端機。',
   '先用紙筆根據狀態表手動推導本章輸入及預期輸出。',
   '執行 node os/linux-labs/l3-verify.cjs --chapter '+z.id+'，先核對教材與參考預期答案（這不代表自己的程式已通過）。',
   '完成 solution.c 後，執行 node os/linux-labs/student-verify.cjs --chapter '+z.id+' --language c --source solution.c；或選 cpp/python/javascript 與對應檔案。',
   '新增一組能驗證邊界或反例的輸入，記錄錯誤實作為何失敗。']
 }}]}));
for(const [key,s] of Object.entries(specs)){
 const l=D.lessons.find(z=>z.id===Number(key));
 if(!l)throw Error('Textbook material targets missing chapter '+key);
 if(!s.l2||!s.l3||!s.symbols)throw Error('Incomplete textbook content '+key);
 const formula = ({
  0:eq(v('PC_{next}'),row(v('PC'),o('+'),v('instruction_length'))),
  1:eq(v('ret'),row(v('syscall'),o('('),v('args'),o(')'))),
  2:eq(v('P_n'),sup(n(2),v('n'))),
  3:eq(v('speedup'),frac(v('T_1'),v('T_p'))),
  4:eq(sub(v('WT'),v('i')),row(sub(v('CT'),v('i')),o('−'),sub(v('AT'),v('i')),o('−'),sub(v('BT'),v('i')))),
  5:eq(v('balance_A'),row(v('total'),o('−'),v('balance_B'))),
  6:eq(v('VA'),row(v('VPN'),o('×'),v('P'),o('+'),v('offset'))),
  7:eq(v('fault_rate'),frac(v('misses'),v('references'))),
  8:eq(v('link_count_{new}'),row(v('link_count_{old}'),o('+'),v('links'),o('−'),v('unlinks'))),
  9:eq(v('latency'),row(v('queue'),o('+'),v('service'),o('+'),v('transfer'))),
  10:eq(v('perm'),row(n(4),v('r'),o('+'),n(2),v('w'),o('+'),v('x'))),
  11:eq(v('CPU_share'),frac(v('quota'),v('period'))),
  12:eq(v('L'),row(v('λ'),o('×'),v('W'))),
  13:eq(v('T_{end-to-end}'),row(v('T_{queue}'),o('+'),v('T_{CPU}'),o('+'),v('T_{I/O}'),o('+'),v('T_{network}'))),
  14:eq(v('P_n'),sup(n(2),v('n'))),
  15:math(row(t('依需求選擇系統機制'),o('→'),t('明確定義前置條件'),o('→'),t('蒐集執行證據'))),
  16:eq(v('empty'),row(v('capacity'),o('−'),v('full'))),
  17:eq(v('Need_{i,j}'),row(v('Max_{i,j}'),o('−'),v('Allocation_{i,j}'))),
  18:eq(v('external_frag'),row(v('free_total'),o('−'),v('largest_hole'))),
  19:eq(v('head_move'),row(v('Σ'),o('|'),sub(v('x'),v('i')),o('−'),sub(v('x'),row(v('i'),o('−'),n(1))),o('|'))),
  20:eq(v('level_{next}'),row(v('min'),o('('),v('level'),o('+'),n(1),o(','),v('max_level'),o(')'))),
  21:eq(v('boot_state'),row(v('firmware'),o('→'),v('kernel'),o('→'),v('PID_1'))),
  22:eq(v('EOF'),row(v('buffer_empty'),o('∧'),v('writers'),o('='),n(0))),
  23:eq(v('proceed'),row(v('predicate'),o('='),v('true'))),
  24:eq(v('VA'),row(v('indices'),o('∥'),v('offset'))),
  25:math(row(v('W'),o('('),v('t'),o(','),v('Δ'),o(')'),o('='),o('{'),t('在觀察窗口內被引用的不同頁'),o('}'))),
  26:math(row(t('commit record durable'),o('⇒'),t('recovery 可重做已提交交易'))),
  27:eq(v('remaining'),row(v('buffer_before'),o('−'),v('read_bytes'))),
  28:eq(v('throttle_ratio'),frac(v('throttled_periods'),v('total_periods')))
 })[Number(key)];
 l.textbook={
  algorithm:s.l2.algorithm,preconditions:s.l2.preconditions,symbols:s.symbols,
  formula:formula,
  stateHeaders:s.l2.headers,stateRows:s.l2.rows,worked:s.l2.worked,invariant:s.l2.invariant,counterexample:s.l2.counterexample,
  l3:s.l3
 };
}

/* Every formula-card in OS LAB uses MathML, not HTML fragments or plaintext math.
 * Explicitly define every symbol and, where needed, the simplifying assumptions.
 */
const M=(lhs,rhs)=>eq(lhs,rhs);
const add=(name,expr,note)=>{
  const entries=D.formulas.flatMap(g=>g.items).filter(q=>q.name===name);
  if(entries.length!==1)throw Error('Formula definition must be unique: '+name);
  entries[0].mathml=expr;
  entries[0].note=note;
};
add('周轉時間',M(v('TAT'),row(v('CT'),o('−'),v('AT'))),'TAT：周轉時間；CT：完成時刻；AT：到達時刻；單位均為時間。');
add('等待時間',M(v('WT'),row(v('TAT'),o('−'),v('BT'))),'WT：等待時間；TAT：周轉時間；BT：CPU burst；假設單次 CPU burst、無 I/O。');
add('回應時間',M(v('RT'),row(sub(v('t'),t('第一次獲得 CPU')),o('−'),v('AT'))),'RT：回應時間；t：首次執行時刻；AT：到達時刻。');
add('平均等待時間',M(v('WT_avg'),frac(row(o('∑'),sub(v('WT'),v('i'))),v('n'))),'WT_i：第 i 個工作的等待時間；n：工作總數（n>0）。');
add('CPU 使用率',M(v('U'),row(frac(t('CPU 忙碌時間'),t('觀察總時間')),o('×'),n(100),o('%'))),'U：CPU 使用率；使用相同時間單位，並明確指定單核或多核統計方式。');
add('offset 位元數',M(v('k'),row(sub(v('log'),n(2)),o('('),v('P'),o(')'))),'k：頁內位移位元數；P：每頁 bytes，P 必須為 2 的冪。');
add('VPN 與 offset',math(row(v('VPN'),o('='),o('⌊'),frac(v('VA'),v('P')),o('⌋'),o(','),v('offset'),o('='),v('VA'),o('mod'),v('P'))),'VA：虛擬位址（bytes）；P：頁大小（bytes）；VPN：虛擬頁號；offset：頁內位移。');
add('實體位址',M(v('PA'),row(v('PFN'),o('×'),v('P'),o('+'),v('offset'))),'PA：實體位址；PFN：實體頁框號；P：頁大小；offset：頁內位移。');
add('頁表大小',M(v('S'),row(sup(n(2),row(v('v'),o('−'),v('k'))),o('×'),v('PTE_size'))),'S：單級完全展開頁表 bytes；v：虛擬位址總位元；k：頁內位移位元；PTE_size：每個頁表項 bytes。');
add('TLB 有效存取時間',M(v('EAT'),row(v('α'),o('('),v('t'),o('+'),v('m'),o(')'),o('+'),o('('),n(1),o('−'),v('α'),o(')'),o('('),v('t'),o('+'),n(2),v('m'),o(')'))),'α：TLB 命中率；t：TLB 查詢時間；m：每次記憶體存取時間；假設單級頁表、無缺頁。');
add('含缺頁的存取時間',M(v('EAT'),row(o('('),n(1),o('−'),v('p'),o(')'),v('m'),o('+'),v('p'),v('T_fault'))),'p：缺頁機率；m：一般存取時間；T_fault：含缺頁處理的總時間；數值應在相同時間單位。');
add('銀行家：剩餘需求',M(sub(v('Need'),row(v('i'),o(','),v('j'))),row(sub(v('Max'),row(v('i'),o(','),v('j'))),o('−'),sub(v('Allocation'),row(v('i'),o(','),v('j'))))),'i：行程索引；j：資源種類；Max：最大需求；Allocation：已分配；Need：剩餘需求。');
add('銀行家：可前進條件',math(row(sub(v('Need'),v('i')),o('≤'),v('Work'),o('⇒'),v('Work'),o('←'),v('Work'),o('+'),sub(v('Allocation'),v('i')))),'Need_i、Work、Allocation_i：各資源向量；≤ 必須逐維成立。');
add('讀寫頭總移動量',M(v('D'),row(o('∑'),o('|'),sub(v('c'),v('i')),o('−'),sub(v('c'),row(v('i'),o('−'),n(1))),o('|'))),'D：HDD 讀寫頭總位移（tracks）；c_i：第 i 次服務的柱面位置；包含初始讀寫頭位置。');
add('磁碟存取時間',M(v('T'),row(v('T_seek'),o('+'),v('T_rotate'),o('+'),v('T_transfer'))),'T_seek：HDD 尋軌時間；T_rotate：旋轉等待；T_transfer：資料傳輸時間；SSD 不採相同機械模型。');
add("Little's Law",M(v('L'),row(v('λ'),o('×'),v('W'))),'L：穩態平均系統內工作數；λ：到達率（件/秒）；W：平均停留時間（秒）。');
add('使用率',M(v('ρ'),frac(v('λ'),v('μ'))),'ρ：M/M/1 負載率；λ：到達率；μ：平均服務率；穩定性要求 0≤λ<μ。');
add('M/M/1 平均回應時間',M(v('W'),frac(n(1),row(v('μ'),o('−'),v('λ')))),'W：平均停留時間；λ：Poisson 到達率；μ：Exponential 服務率；單伺服器、穩態、λ<μ。');
add('連續 fork',M(sub(v('P'),v('n')),sup(n(2),v('n'))),'P_n：全部成功後的行程總數（含原父行程）；n：每個仍活著的行程都執行 fork 的輪數。');
add('Unix 權限八進位',M(v('m'),row(n(4),v('r'),o('+'),n(2),v('w'),o('+'),v('x'))),'m：單一 owner/group/other 權限數值（0–7）；r、w、x：0 或 1。實際授權需先選身分組並考慮 ACL/capabilities；目錄 x 表示可遍歷。');
add('四級頁表位址拆分',M(v('VA_bits'),row(n(9),o('+'),n(9),o('+'),n(9),o('+'),n(9),o('+'),n(12),o('='),n(48))),'VA_bits：虛擬位址位元數；四級索引各 9 位，4 KiB 頁內偏移 12 位；僅為常見 x86-64 四級模型。');
add('Working Set',M(v('W(t,Δ)'),row(o('{'),t('在 (t−Δ,t] 內被參照的頁面'),o('}'))),'t：觀察終點；Δ：時間窗口長度；W(t,Δ)：期間內不同頁的集合。');
add('Clock Second Chance',math(row(v('R'),o('='),n(1),o('⇒'),v('R'),o('←'),n(0),o(';'),v('R'),o('='),n(0),o('⇒'),t('選此頁換出'))),'R：頁框的 reference bit；hand：循環掃描指標；模型簡化為 Second Chance。');
add('Pipe EOF',math(row(v('EOF'),o('⇔'),v('buffer_empty'),o('∧'),v('writer_count'),o('='),n(0))),'EOF：read 回傳 0；buffer_empty：緩衝已讀盡；writer_count：全部仍開啟的寫入端參照數，假設阻塞 Pipe。');
add('cgroup CPU quota',M(v('CPU_share'),frac(v('quota'),v('period'))),'quota：每 period 可運作的 CPU 時間（μs）；period：週期（μs）；比值為單核等價份額，可大於 1。');
add('SSD IOPS',M(v('IOPS'),frac(t('完成 I/O 次數'),t('觀察時間（秒）'))),'IOPS：每秒完成的 I/O 次數；應同時說明 queue depth、block size、讀寫比例與 p99 延遲。');
add('檔案替換持久化',math(row(v('write(temp)'),o('→'),v('fsync(temp)'),o('→'),v('rename'),o('→'),v('fsync(dir)'))),'temp：同一檔案系統內的暫存檔；dir：父目錄；表示常見 POSIX 耐斷電寫入順序，實際保證視檔案系統及硬體而定。');
if(D.formulas.flatMap(g=>g.items).some(f=>!f.mathml||!f.note))throw Error('All OS formulas require MathML and symbol notes');

window.OS_TEXTBOOK_READY=true;
})();
