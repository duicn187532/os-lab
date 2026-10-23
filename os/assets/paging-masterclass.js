/* Four-level 4 KiB x86-64 paging model and fork COW visibility; L2 teaching
 * abstraction, NOT a live page-table reader, kernel MMU or TLB simulator.
 * LA48 sample inputs use canonical low-half nonnegative virtual addresses.
 */
'use strict';
(function(global){
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const indexes=va=>{
 if(!valid(va)||va>=2**47)throw Error('Expect low-half LA48 canonical address');
 return [
  Math.floor(va/2**39)%512,Math.floor(va/2**30)%512,
  Math.floor(va/2**21)%512,Math.floor(va/2**12)%512,va%4096
 ];
};
const walk=(va,entries,access)=>{
 if(!['R','W','X'].includes(access))throw Error('Access must be R, W or X');
 const idx=indexes(va);
 if(!Array.isArray(entries)||entries.length!==4)throw Error('Four levels required');
 const names=['PML4','PDPT','PD','PT'],trace=[];
 for(let level=0;level<4;level++){
  const p=entries[level];
  if(!p||typeof p!=='object')throw Error('Malformed paging entry');
  const state={level:names[level],index:idx[level],
    present:Boolean(p.present),write:Boolean(p.write),execute:Boolean(p.execute)};
  trace.push(state);
  if(!p.present)return {status:'PAGE_FAULT',where:names[level],trace,indices:idx};
  // Permission is the intersection of all traversed paging-level permissions.
  if(access==='W'&&!p.write||access==='X'&&!p.execute)
   return {status:'PROTECTION',where:names[level],trace,indices:idx};
 }
 const pfn=entries[3].pfn;
 if(!valid(pfn)||pfn>2**40)throw Error('Invalid physical frame number');
 return {status:'OK',pa:pfn*4096+idx[4],pfn,trace,indices:idx};
};
const cow=(mode,writer,oldValue,newValue)=>{
 if(!['PRIVATE','SHARED'].includes(mode)||!['P','C'].includes(writer)||
    !valid(oldValue)||!valid(newValue))throw Error('Malformed COW scenario');
 const state=[
  {event:'fork',parent:oldValue,child:oldValue,sharesPhysical:true},
  mode==='SHARED'?
    {event:'write '+writer,parent:newValue,child:newValue,sharesPhysical:true,cowFault:0}:
    {event:'write '+writer,parent:writer==='P'?newValue:oldValue,
     child:writer==='C'?newValue:oldValue,sharesPhysical:false,cowFault:1}
 ];
 return {mode,writer,trace:state,result:state.at(-1)};
};
global.OS_PAGING={indexes,walk,cow};
const lessons=global.OS_DATA?.lessons;
if(!lessons)return;
const byId=id=>{const s=lessons.find(l=>l.id===id)?.textbook;
 if(!s)throw Error('Paging masterclass loaded before textbook');return s;};
const va=0x12345678,idx=indexes(va),entries=[
 {present:true,write:true,execute:true},
 {present:true,write:true,execute:true},
 {present:true,write:true,execute:true},
 {present:true,write:true,execute:false,pfn:7}
];
const ok=walk(va,entries,'R'),xDenied=walk(va,entries,'X');
const absent=walk(va,entries.map((p,i)=>i===2?{...p,present:false}:p),'R');
if(ok.status!=='OK'||ok.pa!==7*4096+idx[4]||
 xDenied.status!=='PROTECTION'||absent.status!=='PAGE_FAULT')
 throw Error('Authored MMU examples incorrect');
const x=byId(6);
x.preconditions='x86-64 LA48 四級 4 KiB page 模型，僅示範 canonical low-half VA，無 huge page／PCID／全域 TLB／OS page-fault handler。每級一個 9-bit 索引，最後 12-bit offset。PML4→PDPT→PD→PT 全部 present 才能翻譯；W/X 權限沿整條路徑逐級相交；以簡化布林 execute 表示 NX 檢查。';
x.symbols='VA：虛擬位址；PML4_i、PDPT_i、PD_i、PT_i：每級 9-bit 索引（0..511）；offset：頁內偏移（0..4095）；PFN：實體頁框號；PA=PFN×4096+offset；PTE：Page Table Entry。VA 以位元右移拆分，示範值為 0x12345678。';
x.algorithm=[
 '驗證 LA48 虛擬位址為合法 canonical low-half，求索引 [VA>>39, VA>>30, VA>>21, VA>>12] 的低 9 位，offset=VA mod 4096。',
 '依 PML4→PDPT→PD→PT 四層順序讀取目標索引的表項；任一層 present=0 即產生 PAGE_FAULT 並交由 OS handler 處理。',
 '如存取型別為 W，任一層 write=0 即 PROTECTION；若為 X，任一層 execute=0 同樣拒絕；不可只看最末層 PTE。',
 '只有全部通過時，取最末 PT entry 的 PFN 並輸出 PA=PFN×4096+offset；後續 TLB 快取與 COW fault 屬其他獨立階段。',
 '以追蹤表記每層索引、present、write、execute 及最後輸出；補一個中間層不存在與一個不可執行的反例。'
];
x.stateHeaders=['層級','VA 索引','Present','Writable','Executable'];
x.stateRows=ok.trace.map(s=>[s.level,String(s.index),String(s.present),
 String(s.write),String(s.execute)]);
x.worked=[
 '完整例題：VA=0x12345678，索引 (PML4,PDPT,PD,PT,offset)=('+idx.join(', ')+')。',
 '四層 entry 均 present=true、write=true；唯 PT 的 execute=false、PFN=7；R 存取成功，PA=7×4096+'+idx[4]+'='+ok.pa+'（十進位）。',
 '同一 VA 執行 X，因 PT.execute=false，輸出 PROTECTION 而不是 PAGE_FAULT；同一 VA 若 PD.present=false 則在 PD 層 PAGE_FAULT，不能計算出合法 PA。',
 'page fault 對應不存在或尚未載入的映射；protection fault 是權限違反。TLB miss 本身不代表 page fault，後續 page-walk 可能成功。',
 '前提限制：此模型未納 huge pages、NX 在不同級的架構細節、特權／SMEP/SMAP 或 TLB shootdown；真實 Linux 地址轉換還有更完整的權限及 fault 分流。'
].join('\n\n');
x.invariant='同一 VA 的四個 9-bit index 和 12-bit offset 能重組原 VA；讀／寫／執行必須同時滿足路徑全部 present 和相應權限，跨層拒絕必須停在第一個失敗表項；PA offset 與 VA offset 相同。';
x.counterexample='中間層缺失時即使末層 PTE 填有 PFN 也不能跳過 page fault；只有末層 execute=false 仍可讀取資料，但不可執行；TLB miss 不等於 page fault。';
x.l3.checks.unshift('四級索引需能回組 VA，並分別驗證中間層 PAGE_FAULT、路徑權限 PROTECTION 與成功 PA；輸入同一 VA 但改 PTE 權限時不得誤回相同結果。');
const t=byId(24),pvt=cow('PRIVATE','C',5,9),shared=cow('SHARED','C',5,9);
t.preconditions='fork 後的同一初始 anonymous mapping：讀取父子都見 5；MAP_PRIVATE 在寫入前可共享實體頁，以 COW 延遲複製。第一次對 PRIVATE 的寫入會建立私有副本；MAP_SHARED 寫入對另一方可見。此模型以已有效、已載入的頁為前提，只計 COW protection/write fault，不把其他 minor/major faults 混為一談。';
t.symbols='P：父行程，C：子行程；old=5、new=9；sharedPhysical：目前兩者是否仍指向相同物理資料；COW fault：因唯讀共享的 private page 寫入而需要複製的例外；MAP_PRIVATE/MAP_SHARED 分別是私有／共享 mapping。';
t.algorithm=[
 '父行程建立可寫 anonymous mapping 並把 old=5 寫入；fork 後父、子看到相同邏輯值，但 private mapping 的實體頁可先共享。',
 'PRIVATE：第一個 writer 試圖寫入時發生 COW fault，核心配置私有 frame 並複製原資料後寫入 new=9；未寫入方維持 old。',
 'SHARED：writer 直接修改共享 mapping，父子讀取都見 new。要確認可見性需明確指定 waitpid、同步點與資料競爭前提。',
 '驗證親子兩個讀取值與 sharesPhysical、COW fault 的狀態；分別讓 parent/child 寫入，對照 private/shared。',
 '真實系統驗收：先跑本章 mmap C 範例，改成 MAP_SHARED 並等 child 完成後再讀；不要把瀏覽器抽象模擬器當作 mmap syscall 證據。'
];
t.stateHeaders=['操作','Parent 值','Child 值','共享實體頁','COW faults'];
t.stateRows=[
 ['fork',String(pvt.trace[0].parent),String(pvt.trace[0].child),'是','0'],
 ['MAP_PRIVATE child writes',String(pvt.result.parent),String(pvt.result.child),'否','1'],
 ['fork + MAP_SHARED',String(shared.trace[0].parent),String(shared.trace[0].child),'是','0'],
 ['MAP_SHARED child writes',String(shared.result.parent),String(shared.result.child),'是','0']
];
t.worked=[
 'MAP_PRIVATE：fork 後 Parent=5、Child=5；Child 將值改為 9，第一次寫入觸發 COW fault，複製私有頁後 Parent=5、Child=9。結果不因父子在不同 CPU 執行而改變。',
 'MAP_SHARED：fork 後兩者皆為 5；Child 寫入 9 並適當同步後，Parent=9、Child=9。模型不包含未同步並行讀寫造成的 data race。',
 '反過來由 Parent 寫：PRIVATE 會得到 Parent=9、Child=5；SHARED 仍得到 Parent=9、Child=9。',
 'fork/COW 與 page table walk 不同：fork 後 OS 會把 private page 對應標為 COW/不可直接寫，而實際 copy 往往延到第一次 write fault。不要因 fork 本身出現就假設每頁已被複製。'
].join('\n\n');
t.invariant='對 MAP_PRIVATE，單一 writer 寫入後兩個行程的值各自獨立且未寫入者保持 old；對 MAP_SHARED，在同步後兩者觀察到相同 new。COW fault 只在首次私有映射寫入才有必要，不可把合法 COW fault 判為程式非法存取。';
t.counterexample='若把 MAP_PRIVATE 的 child write 視為直接修改父行程的實體頁，會錯誤預測 Parent=9；若把 fork 當成一定立即複製整個地址空間，又會高估實際複製量。';
t.l3.checks.unshift('比較 MAP_PRIVATE 與 MAP_SHARED 真實 mmap 程式的父子可見性，檢查 waitpid 同步順序；區分合法 COW fault 與真正的 PROTECTION fault。');
})(window);
