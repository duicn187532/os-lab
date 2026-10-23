/* OS LAB academic evidence: client-side records are NOT certified mastery.
 * Independent storage key preserves old progress (os_lab_2026_v1) unchanged.
 */
'use strict';
(function(global){
 const A=global.OSApp;
 if(!A || A.course.id!=='os')return;
 const KEY='os_lab_academic_v1';
 const escape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
   .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 function read(){
  try{const o=JSON.parse(localStorage.getItem(KEY)||'{}');
   return o?.version===1&&o.records&&typeof o.records==='object'?
     o:{version:1,records:{}};}
  catch(_){return {version:1,records:{}};}
 }
 const db=read();
 const entry=id=>db.records[id]||{};
 function save(){try{localStorage.setItem(KEY,JSON.stringify(db));return true;}
   catch(_){return false;}}
 function status(id){
  if(!A.byId[id])return null;
  const old=A.store,e=entry(id);
  const viewed=Boolean(old.learn[id]||old.lab[id]||old.done[id]);
  const completed=Boolean(old.learn[id]&&old.lab[id]&&old.done[id]);
  const tasks=global.CSLab.code.forLesson(id);
  const codePassed=tasks.filter(p=>old.code[p.id]?.solved).length;
  // Only the first newly observed quiz completion is allowed here.
  // Historical done.first was mutable / unaudited, so not silently imported.
  const quiz=Number.isInteger(e.quiz?.first)&&Number.isInteger(e.quiz?.total)&&
    e.quiz.total>0&&e.quiz.first>=Math.ceil(e.quiz.total*0.8);
  const l2=Number.isInteger(e.l2?.total)&&e.l2.total>=8&&e.l2.total<=10&&
    Number.isInteger(e.l2.derivation)&&e.l2.derivation>=3&&e.l2.derivation<=4&&
    typeof e.l2.note==='string'&&e.l2.note.trim().length>=25;
  const l3=tasks.length>0&&codePassed===tasks.length;
  return {id,viewed,completed,quiz,l2,l3,codePassed,codeTotal:tasks.length,
    readyForReview:completed&&quiz&&l2&&l3,mastered:false};
 }
 const all=()=>A.lessons.map(l=>status(l.id));
 const exportEvidence=()=>JSON.stringify({
  schema:'os-lab-academic-v1',exportedAt:new Date().toISOString(),
  warning:'SELF-REPORTED LOCAL DATA; NOT AN ACADEMIC CERTIFICATE',
  chapters:all().map(s=>({...s,quizRecord:entry(s.id).quiz||null,
    l2Record:entry(s.id).l2||null}))
 },null,2);
 function panel(id){
  const s=status(id),e=entry(id),el=document.createElement('section');
  el.className='card os-mastery';
  el.setAttribute('aria-label','OS 學習證據與掌握度');
  el.innerHTML='<h2>L1–L3｜學習證據與掌握度</h2>'+
   '<p class="muted">原有測驗完成紀錄不會自動變成 Mastered。本機資料未經教師驗證，不是正式成績或認證。</p>'+
   '<div class="os-mastery-states">'+
    '<span>Viewed：'+(s.viewed?'已接觸':'未接觸')+'</span>'+
    '<span>Completed：'+(s.completed?'教學流程完成':'閱讀／實驗／測驗尚未全數完成')+'</span>'+
    '<span>Mastered：待外部教師審核</span></div>'+
   '<p class="muted">首次測驗紀錄 ≥80%：'+(s.quiz?'符合':'待補／未達')+
   '；L2 自評格式：'+(s.l2?'符合':'待補')+
   '；瀏覽器程式題 AC：'+s.codePassed+'/'+s.codeTotal+
   '；送審條件：'+(s.readyForReview?'已具備本機證據':'尚未具備')+'。</p>'+
   '<details><summary>填寫 L2 推導自評（不代表教師核可）</summary>'+
    '<div class="os-mastery-form">'+
     '<label>整體分數 0–10<input type="number" min="0" max="10" step="1" data-field="total" value="'+
       (e.l2?.total??'')+'"></label>'+
     '<label>逐步推導分數 0–4<input type="number" min="0" max="4" step="1" data-field="derivation" value="'+
       (e.l2?.derivation??'')+'"></label>'+
     '<label>完整推導、狀態表與反例（至少 25 字）<textarea rows="4" data-field="note">'+
       escape(e.l2?.note||'')+'</textarea></label>'+
     '<div class="row"><button type="button" class="btn secondary" data-save>儲存本機自評</button>'+
      '<button type="button" class="btn ghost" data-export>複製全課送審 JSON</button></div>'+
     '<p role="status" data-message class="muted"></p>'+
    '</div></details>';
  el.querySelector('[data-save]').addEventListener('click',()=>{
    const get=k=>el.querySelector('[data-field="'+k+'"]');
    const ts=get('total').value,ds=get('derivation').value,note=get('note').value.trim();
    const total=Number(ts),derivation=Number(ds);
    if(ts===''||ds===''||!Number.isInteger(total)||total<0||total>10||
      !Number.isInteger(derivation)||derivation<0||derivation>4||note.length<25){
      el.querySelector('[data-message]').textContent='請填合法整數及至少 25 字證據。';return;
    }
    db.records[id]={...entry(id),l2:{total,derivation,note,at:new Date().toISOString()}};
    const persisted=save();
    refresh();
    document.querySelector('.os-mastery [data-message]').textContent=
      persisted?'本機自評已儲存，仍待教師驗證。':'儲存失敗：瀏覽器未開放 localStorage。';
  });
  el.querySelector('[data-export]').addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(exportEvidence());
    el.querySelector('[data-message]').textContent='已複製 JSON（僅供送審，非證書）。';
   }catch(_){el.querySelector('[data-message]').textContent='無剪貼簿權限；可使用 OS_ACADEMIC.exportEvidence() 取得資料。';}
  });
  return el;
 }
 function refresh(){
  document.querySelector('.os-mastery')?.remove();
  document.querySelector('.os-mastery-summary')?.remove();
  if(A.state.page==='lesson'){
   document.querySelector('.lesson-head')?.insertAdjacentElement('afterend',panel(A.state.lesson));
  }else if(A.state.page==='home'){
   const s=all(),summary=document.createElement('aside');summary.className='card os-mastery-summary';
   summary.setAttribute('aria-label','學習證據總覽');
   summary.innerHTML='<h2>OS LAB 學術進度（不同於既有完成比例）</h2>'+
     '<p>Viewed '+s.filter(x=>x.viewed).length+'/29；Completed '+
      s.filter(x=>x.completed).length+'/29；可送審 '+
      s.filter(x=>x.readyForReview).length+'/29。Mastered 須外部教師審核，靜態網站不自動核發。</p>';
   document.querySelector('#content')?.prepend(summary);
  }
 }
 document.addEventListener('cslab:render',refresh);
 document.addEventListener('cslab:progress',ev=>{
  const d=ev.detail;
  if(d?.kind!=='done'||!Number.isInteger(d.lesson)||!A.byId[d.lesson])return;
  const old=entry(d.lesson);
  if(!old.quiz){
   db.records[d.lesson]={...old,quiz:{first:d.first,total:d.total,at:new Date().toISOString()}};
   save();
  }
  refresh();
 });
 document.addEventListener('cslab:code',ev=>{if(ev.detail?.event==='judged')refresh();});
 global.OS_ACADEMIC={status,all,exportEvidence,refresh};
 refresh();
})(window);
