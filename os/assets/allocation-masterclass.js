/* Contiguous allocation L2: address-ordered holes, First/Best/Worst Fit,
 * splitting and adjacency coalescing. Pedagogical memory region, not malloc.
 */
'use strict';
(function(global){
 const clone=x=>JSON.parse(JSON.stringify(x));
 function simulate(total,operations,policy='FIRST'){
  if(!Number.isInteger(total)||total<1||total>100000 ||
    !['FIRST','BEST','WORST'].includes(policy)||!Array.isArray(operations)||operations.length>300)
   throw Error('Invalid contiguous allocator request');
  let holes=[{start:0,size:total}];const blocks=new Map(),trace=[];
  function check(){
   const ranges=[...holes,...blocks.values()].sort((a,b)=>a.start-b.start);
   let address=0;for(const r of ranges){
    if(r.start!==address||r.size<1)throw Error('Address coverage/overlap broken');
    address=r.start+r.size;
   }
   if(address!==total)throw Error('Memory conservation broken');
   if(holes.some((h,i)=>i>0&&holes[i-1].start+holes[i-1].size===h.start))
    throw Error('Uncoalesced adjacent holes');
  }
  for(let i=0;i<operations.length;i++){
   const op=operations[i];if(!op||!['ALLOC','FREE'].includes(op.type))
    throw Error('Expected ALLOC/FREE');
   const before=clone(holes),id=String(op.id);
   let result,start=null;
   if(op.type==='ALLOC'){
    const size=op.size;
    if(!Number.isInteger(size)||size<1||blocks.has(id)||id.length>40)
     throw Error('Invalid requested allocation');
    const candidates=holes.map((h,j)=>({...h,index:j})).filter(h=>h.size>=size);
    candidates.sort((a,b)=>
      policy==='FIRST'?a.start-b.start:
      policy==='BEST'?a.size-b.size||a.start-b.start:
      b.size-a.size||a.start-b.start);
    if(!candidates.length)result='FAIL_FRAGMENTED_OR_INSUFFICIENT';
    else{
     const slot=candidates[0],hole=holes[slot.index],address=hole.start;
     blocks.set(id,{start:address,size});
     if(hole.size===size)holes.splice(slot.index,1);
     else{hole.start+=size;hole.size-=size;}
     start=address;result='ALLOCATED';
    }
   }else{
    if(!blocks.has(id))throw Error('Cannot free unknown allocation');
    const block=blocks.get(id);blocks.delete(id);
    holes.push({...block});
    holes.sort((a,b)=>a.start-b.start);
    const merged=[];
    for(const h of holes){
     const prev=merged.at(-1);
     if(prev&&prev.start+prev.size===h.start)prev.size+=h.size;
     else merged.push({...h});
    }
    holes=merged;result='FREED_COALESCED';start=block.start;
   }
   check();
   trace.push({step:i+1,op:op.type+' '+id+(op.size?' '+op.size:''),before,
    start,result,holes:clone(holes),used:total-holes.reduce((a,x)=>a+x.size,0)});
  }
  return {policy,total,trace,holes:clone(holes),blocks:clone([...blocks])};
 }
 const choose=(holes,size,policy)=>{
  const a=holes.flatMap((h,i)=>h.size>=size?[{...h,index:i}]:[]);
  a.sort((x,y)=>policy==='FIRST'?x.start-y.start:
    policy==='BEST'?x.size-y.size||x.start-y.start:
    y.size-x.size||x.start-y.start);
  return a.length?a[0].index:-1;
 };
 global.OS_ALLOCATOR={simulate,choose};
 const lesson=global.OS_DATA?.lessons.find(x=>x.id===18)?.textbook;
 if(!lesson)return;
 const operations=[
  {type:'ALLOC',id:'A',size:8},{type:'ALLOC',id:'B',size:6},
  {type:'ALLOC',id:'C',size:10},{type:'FREE',id:'B'},
  {type:'ALLOC',id:'D',size:5},{type:'FREE',id:'A'},
  {type:'FREE',id:'C'},{type:'FREE',id:'D'}
 ];
 const ex=simulate(32,operations,'FIRST');
 const holes=[{start:0,size:10},{start:20,size:16},{start:42,size:6}];
 const comparison=['FIRST','BEST','WORST'].map(p=>p+'→hole '+choose(holes,5,p));
 lesson.preconditions='連續配置的地址域 [0,32)，初始為單一 free hole。Allocation 使用 first fit，按起始地址升序掃描，找到第一個可容納請求的空洞；成功時只分裂該空洞，失敗不改狀態。FREE 釋回既有 ID 區間並合併左右相鄰 free holes，維持按地址排序、無 overlap。Best/Worst Fit 作為同資料比較，不代表 Linux glibc malloc 實作。';
 lesson.symbols='M=總地址空間大小，本例 32 units；hole=(start,size) 為空閒連續區間 [start,start+size)；alloc(id,size) 配置新物件；free(id) 歸還區塊；used=M−Σhole.size；external fragmentation 表示總空閒空間足夠但最大連續 hole 不足以容納請求。';
 lesson.algorithm=[
  '初始 holes={[0,32)}、allocated={}。每次 ALLOC 檢查 size>0 且 ID 不重複，按 First Fit 找到地址最早且 size≥request 的 hole。',
  '配置成功：從洞的左端切出 request bytes，剩餘洞改為 [start+request,oldEnd)；若剛好相等就刪除洞；記錄配置區間。',
  '配置失敗：沒有任何單一洞夠大，回 FAIL；不可把兩個不相鄰 holes 容量相加當作可連續配置。',
  'FREE：找到該 ID 對應區間，移回 free 集合並依地址排序；若左右連續接觸（prev.end===next.start），反覆 coalesce 成一個洞。',
  '每步驗證所有 free/allocated 區間不重疊且恰好覆蓋 [0,M)，所以 used+Σfree=M；不得出現相鄰卻未合併的 free holes。',
  '比較相同候選 holes 的 First Fit、Best Fit、Worst Fit：First Fit 選最早地址，Best Fit 選能容納的最小洞，Worst Fit 選最大洞；同尺寸以地址小者破同分。'
 ];
 lesson.stateHeaders=['事件','要求','結果 / 起點','free holes（事件後）','已使用容量'];
 lesson.stateRows=ex.trace.map(s=>[
  String(s.step),s.op,s.result+(s.start===null?'':' @'+s.start),
  s.holes.map(h=>'['+h.start+','+(h.start+h.size)+')').join(' + ')||'無',
  String(s.used)
 ]);
 lesson.worked=[
  'Worked Example：記憶體地址 [0,32)，先 ALLOC A8→A=[0,8)、hole=[8,32)；再 ALLOC B6→B=[8,14)、hole=[14,32)；再 ALLOC C10→C=[14,24)、hole=[24,32)。',
  'FREE B→holes=[8,14) 和 [24,32)；ALLOC D5→D=[8,13)，殘留 [13,14)；FREE A 時合併 A 與 [13,14) 不相鄰，仍須維持兩洞。',
  'FREE C→釋出 [14,24) 並合併左側 [13,14) 與右側 [24,32)，得到 [13,32)；最後 FREE D 與 [0,8) 及 [13,32) 依地址相鄰合併，恢復唯一 [0,32) 的 free hole。',
  '比較 First/Best/Worst Fit：當 free holes 為 [0,10) size10、[20,36) size16、[42,48) size6，要求 5，'+comparison.join('；')+'。別把選擇差異誤判成全部都是 First Fit。',
  '外部碎片化反例：如兩個空洞分別 5 和 6，雖合計 11 units，若需要連續 8 units，仍無法配置；coalescing 只有在地址相鄰時才有幫助。'
 ].join('\n\n');
 lesson.invariant='任一步：所有 free 和 allocated 區間完整覆蓋 [0,M) 且不重疊；成功 ALLOC 減少 Σfree、增加 used 同樣 bytes；失敗不改配置；FREE 必須反向恢復指定尺寸並與鄰洞正確合併；同時存在的物件不能重複使用地址。';
 lesson.counterexample='若 free A 時直接合併 [0,8) 與 [13,14)，兩區間沒有相鄰，會把 [8,13) 仍分配給 D 的位址納入 free 集合，造成雙重配置。';
 lesson.l3.checks.unshift('從地址範圍逐步驗證 First/Best/Worst Fit、分裂、FREE/coalescing、不相鄰洞不可合併、地址全覆蓋與失敗不改狀態。');
 lesson.l3.steps.push('擴充作業：以 tests/os-allocation-model.cjs 的 allocation/free 事件與邊界亂數測資驗證 allocator；提交每筆 hole 和已配置區間。');
})(window);
