/* OS LAB L2: page-replacement execution traces and Clock Second Chance.
 * Frames are model slots; FIFO and LRU lists are ordered oldest -> newest.
 * OPT is an offline lower bound: it requires knowledge of future references.
 * This educational model does not simulate Linux reclaim, dirty-page writeback,
 * per-process working sets, page-table walks or physical-memory races.
 */
'use strict';
(function(global){
 function replacement(refs,capacity,policy){
  if(!['FIFO','LRU','OPT'].includes(policy))throw Error('Unknown replacement policy');
  if(!Array.isArray(refs)||!refs.length||refs.length>500||
     !refs.every(Number.isSafeInteger)||!Number.isInteger(capacity)||capacity<1||capacity>64)
   throw Error('Provide 1..500 integer references and 1..64 frames');
  const frames=[],trace=[];
  let faults=0,hits=0;
  refs.forEach((page,i)=>{
   const existing=frames.indexOf(page),hit=existing>=0;
   let victim=null;
   if(hit){
    hits++;
    if(policy==='LRU'){frames.splice(existing,1);frames.push(page);}
   }else{
    faults++;
    if(frames.length===capacity){
     if(policy==='OPT'){
      const distances=frames.map(p=>{
       const future=refs.indexOf(p,i+1);return future<0?Infinity:future;
      });
      const index=distances.indexOf(Math.max(...distances));
      victim=frames.splice(index,1)[0];
     }else victim=frames.shift();
    }
    frames.push(page);
   }
   if(new Set(frames).size!==frames.length||frames.length>capacity)
    throw Error('Frame invariant violated');
   trace.push({step:i+1,reference:page,hit,fault:!hit,victim,
     frames:frames.slice(),faults,hits});
  });
  if(hits+faults!==refs.length)throw Error('Reference conservation failed');
  return {policy,capacity,faults,hits,trace};
 }
 function clock(bits,initialHand,misses){
  if(!Array.isArray(bits)||bits.length<1||bits.length>64||
     !bits.every(x=>x===0||x===1)||
     !Number.isInteger(initialHand)||initialHand<0||initialHand>=bits.length||
     !Number.isInteger(misses)||misses<0||misses>300)
    throw Error('Malformed Clock state');
  const r=bits.slice(),steps=[],victims=[];
  let hand=initialHand;
  for(let i=0;i<misses;i++){
   const before=r.slice(),startHand=hand,cleared=[];
   let scanned=0;
   while(r[hand]===1){
    cleared.push(hand);r[hand]=0;hand=(hand+1)%r.length;
    if(++scanned>r.length)throw Error('Clock failed to make progress');
   }
   const victim=hand;victims.push(victim);
   r[victim]=1;hand=(hand+1)%r.length;
   steps.push({miss:i+1,startHand,before,cleared,victim,after:r.slice(),nextHand:hand});
  }
  return {victims,bits:r,hand,steps};
 }
 global.OS_REPLACEMENT={replacement,clock};
 const lessons=global.OS_DATA?.lessons;
 if(!lessons)return;
 const get=id=>{
  const lesson=lessons.find(l=>l.id===id);
  if(!lesson?.textbook)throw Error('Load replacement masterclass after textbook-rigor, chapter '+id);
  return lesson.textbook;
 };
 const refs=[7,0,1,2,0,3,0,4,2,3,0,3,2];
 const fifo=replacement(refs,3,'FIFO'),lru=replacement(refs,3,'LRU'),opt=replacement(refs,3,'OPT');
 const t=get(7);
 t.preconditions='單一行程、3 個空白 page frames、逐步接收 page references；缺頁時若空框存在先裝入，否則淘汰。所有頁大小相同、沒有 pin/dirty/I/O/讀寫延遲，命中不算 fault。FIFO 按載入次序、LRU 按最近一次使用、OPT 預知整個未來；模型不是 Linux 實際 reclaim。';
 t.symbols='k=可用實體頁框數，本例 k=3；p_i=第 i 次頁面參照；F_i=處理至第 i 次後的 resident page 集合；Faults=缺頁總數；Hits=命中總數；victim=發生滿框缺頁時被逐出的頁；LRU 次序左端最久未使用、右端最近使用。';
 t.algorithm=[
  '起始 frames=[]、faults=0、hits=0，依輸入順序讀取 p_i。若命中，Hits 增加且不載入；若未命中，Faults 增加並在滿框時挑選 victim。',
  'FIFO：保持「最早載入 → 最新載入」佇列；命中不改變次序。只有發生缺頁且 frames 已滿時淘汰隊首，再把新頁加到隊尾。',
  'LRU：保持「最久未使用 → 最近使用」次序；任何 hit 都把該頁移到右端。miss 且滿框淘汰左端。LRU 與 FIFO 的關鍵區別正是命中時會不會更新次序。',
  'OPT：缺頁且滿框時逐一查詢 frames 中頁面下一次被參照的位置；淘汰未來最晚再次使用（或再也不用）的頁。若多個頁均不再使用，依現有 frame 順序決定，僅供離線理論下界分析。',
  '每次紀錄 [輸入頁、hit/fault、victim、所有 frame 內容、累計缺頁]；結束時檢查 Hits+Faults=參照總數、resident frame 數≤k、頁面不重複。'
 ];
 t.stateHeaders=['步驟','參照頁','FIFO 命中/缺頁','FIFO 淘汰 / Frames','LRU 淘汰 / Frames','OPT 淘汰 / Frames'];
 t.stateRows=refs.map((p,i)=>{
  const f=fifo.trace[i],l=lru.trace[i],o=opt.trace[i];
  const cell=z=>(z.victim===null?'—':z.victim)+' / ['+z.frames.join(', ')+']';
  return [String(i+1),String(p),f.hit?'HIT':'FAULT',cell(f),cell(l),cell(o)];
 });
 t.worked=[
  'Worked Example：參照序列 [7,0,1,2,0,3,0,4,2,3,0,3,2]，三個空白 frame；各步狀態見上表。',
  '前四次 7,0,1,2 均缺頁；第 4 次滿框，三種演算法都先淘汰 7，剩 [0,1,2]。第 5 次參照 0 是命中：FIFO 保留 [0,1,2]，LRU 變成 [1,2,0]。',
  '第 6 次參照 3：FIFO 淘汰 0→[1,2,3]；LRU 淘汰 1→[2,0,3]；OPT 因 1 從此不再使用，淘汰 1→[0,2,3]。因此三者開始分歧。',
  '第 7 次參照 0：FIFO 缺頁、淘汰 1；LRU/OPT 都命中。這一筆可直接抓出「誤把 FIFO 命中當成更新時間戳」的錯誤。',
  '完整結果：FIFO faults='+fifo.faults+'、hits='+fifo.hits+'；LRU faults='+lru.faults+'、hits='+lru.hits+'；OPT faults='+opt.faults+'、hits='+opt.hits+'。OPT 代表固定參照序列與容量下的理論最少 fault 數，不是實務可部署的預知策略。',
  '反例：Belady anomaly 的 FIFO 序列 [1,2,3,4,1,2,5,1,2,3,4,5]，容量 3 時 fault=9、容量 4 時 fault=10；LRU/OPT 具 stack inclusion，不會隨容量增加而多 fault。'
 ].join('\n\n');
 t.invariant='每次參照恰發生 HIT 或 FAULT 其中之一；Hits+Faults=參照總數。任一步 |frames|≤k 且 frame 不重複；hit 不增加 faults，miss 必增加 1；FIFO hit 不改變隊列、LRU hit 必更新 recency；OPT 只能以未來參照作離線比較。';
 t.counterexample='只記錄 FIFO/LRU faults 卻沒有逐次 frame 與 victim，不能證明用的是正確演算法。若 FIFO 在 hit 0 後把 0 移到尾端，第 6 次參照 3 會錯誤淘汰 1。容量越大 faults 越少不是 FIFO 的普遍性質：Belady 序列 3 框 9 faults，4 框 10 faults。';
 t.l3.checks.unshift('用 k=3 的 13 筆參照逐步驗證 FIFO/LRU/OPT，不只核對總缺頁；追加 Belady 序列及 LRU stack property 邊界測試。');
 t.l3.steps.push('L3 進階程式挑戰：node os/linux-labs/student-verify.cjs --challenge os.capstone.lru --language python --source lru.py；提交逐步 frame 狀態與 FIFO 誤實作的反例。');
 const initialBits=[1,1,0],example=clock(initialBits,0,4);
 const c=get(25);
 c.preconditions='Clock / Second Chance 抽象：三個已被占用的頁框，初始 reference bits R=[1,1,0]，hand=0，發生連續四次缺頁。每次從 hand 開始，遇 R=1 清成 0 並往前；遇 R=0 淘汰該框、載入新頁並設 R=1，再把 hand 推到下一格。每次 miss 的新頁不會在同一輪立刻重掃。';
 c.symbols='R_j∈{0,1}：第 j 個 frame 的 reference bit；hand：下一次開始掃描的循環索引；victim：挑到的替換框索引；k=框總數（本例 3）；m=連續發生的 miss 次數（本例 4）。框索引自 0 起算。';
 c.algorithm=[
  '先驗證每個 R_j 為 0 或 1、0≤hand<k，並明確區分「頁面本身」和「框索引」。本題所有框已滿。',
  '收到一個 miss，從 hand 開始巡迴；若 R[hand]=1，就清成 0、hand=(hand+1) mod k，持續重試。清理過的 R bit 必須保留改變。',
  '遇到 R[hand]=0，選該框為 victim；實際換入新頁，依此模型 R[victim]=1，然後 hand 前進一格；本次缺頁處理完成。',
  '依相同流程處理下一個 miss，不可重新把 hand 設為 0；記錄每輪「原始 R、掃描/清除索引、victim、替換後 R、next hand」。',
  '驗證：每次 miss 恰好淘汰一框；迴圈在最多 k+1 次 R bit 檢查後可選 victim；所有 R bit 均仍為 0/1、hand 永遠在 [0,k)；不要把它當真正 Linux reclaim 實作。'
 ];
 c.stateHeaders=['缺頁回合','原 hand / R0R1R2','清除 R=1 的 frame','victim','替換後 R0R1R2 / next hand'];
 c.stateRows=example.steps.map(s=>[
  String(s.miss),s.startHand+' / '+s.before.join(''),s.cleared.join(' → ')||'無',
  String(s.victim),s.after.join('')+' / '+s.nextHand
 ]);
 c.worked=[
  'Worked Example：R=[1,1,0]、hand=0、連續 4 次 miss；每輪完整狀態見上表。',
  '第一次從 frame 0 出發：R0=1 清 0，R1=1 清 0，R2=0 可替換，victim=2；載入新頁後 R=[0,0,1]，next hand=0。',
  '第二次開始 hand=0 且 R0=0，直接替換 frame 0，R=[1,0,1]，next hand=1。第三次替換 frame 1，R=[1,1,1]，next hand=2。',
  '第四次起 R 全 1，依序清除 R2、R0、R1 後回到 frame 2（現為 0），替換 frame 2、設 R2=1，最終 R=[0,0,1]、hand=0。',
  '完整 victims='+example.victims.join(' → ')+'；最終 R='+example.bits.join('')+'；本模型要分辨「Second Chance 清 bit」和「replacement 後設 bit」兩個不同事件。'
 ].join('\n\n');
 c.invariant='每輪開始與結束 0≤hand<k，所有 R_j∈{0,1}。掃到 R=1 時只能清除並前進，不得直接淘汰；首次掃到 R=0 才選 victim。每次 miss 恰好有一個 victim，替換後 R[victim]=1。';
 c.counterexample='R=[1,1,1] 時若直接淘汰起點框而沒有清除其餘 R bit，結果可能碰巧一樣，但後續 miss 的 frame 順序與 reference bits 都會錯。R=[1,1,0]、hand=0 的第一次 victim 必定是 2，不是 0。';
 c.l3.checks.unshift('Clock 須提交逐個 frame 的掃描／清除、victim、next hand 狀態，不得僅用最後 fault count 驗收。');
 c.l3.steps.push('L3 進階程式挑戰：node os/linux-labs/student-verify.cjs --challenge os.capstone.clock --language python --source clock.py；注意 Clock victim 是框索引，不是 page ID。');
})(window);
