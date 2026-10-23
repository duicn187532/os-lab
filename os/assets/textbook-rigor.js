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
const exercises=CSLab.code.list();
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
  command:'node os/linux-labs/l3-verify.cjs --chapter '+z.id,
  checks:[z.invariant,'每一筆輸入都有一行輸出，公開及隱藏測資均由獨立模型驗證。','提交可執行程式、輸入、輸出、反例、系統版本與解釋，不得只複製參考答案。'],
  steps:['在 repository 根目錄安裝 Node.js 22 以上並開啟終端機。',
   '先用紙筆根據狀態表手動推導本章輸入及預期輸出。',
   '執行 node os/linux-labs/l3-verify.cjs --chapter '+z.id+'，核對輸出與獨立檢查器。',
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
  15:eq(v('write_durable'),row(v('fsync'),o('('),v('fd'),o(')'))),
  16:eq(v('empty'),row(v('capacity'),o('−'),v('full'))),
  17:eq(v('Need_{i,j}'),row(v('Max_{i,j}'),o('−'),v('Allocation_{i,j}'))),
  18:eq(v('external_frag'),row(v('free_total'),o('−'),v('largest_hole'))),
  19:eq(v('head_move'),row(v('Σ'),o('|'),sub(v('x'),v('i')),o('−'),sub(v('x'),row(v('i'),o('−'),n(1))),o('|'))),
  20:eq(v('level_{next}'),row(v('min'),o('('),v('level'),o('+'),n(1),o(','),v('max_level'),o(')'))),
  21:eq(v('boot_state'),row(v('firmware'),o('→'),v('kernel'),o('→'),v('PID_1'))),
  22:eq(v('EOF'),row(v('buffer_empty'),o('∧'),v('writers'),o('='),n(0))),
  23:eq(v('proceed'),row(v('predicate'),o('='),v('true'))),
  24:eq(v('VA'),row(v('indices'),o('∥'),v('offset'))),
  25:eq(v('W(t,Δ)'),row(o('{'),v('pages in window'),o('}'))),
  26:eq(v('replay'),row(v('journal_commit'),o('='),v('durable'))),
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
window.OS_TEXTBOOK_READY=true;
})();
