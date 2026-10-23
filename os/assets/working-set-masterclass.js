/* Working Set / residency demand masterclass, teaching abstraction only.
 * A reference-window \u0394 counts references, NOT elapsed milliseconds.
 * Demand > frames flags capacity pressure; it does not prove that a
 * particular OS is thrashing without observed faults and I/O.
 */
'use strict';
(function(global){
  function trace(references,delta){
    if(!Array.isArray(references)||references.length<1||references.length>2000||
      !references.every(Number.isSafeInteger)||!Number.isInteger(delta)||
      delta<1||delta>2000)throw Error('Expected 1..2000 integer references and valid positive window');
    return references.map((reference,i)=>{
      const from=Math.max(0,i+1-delta),window=references.slice(from,i+1);
      const pages=[...new Set(window)];
      return {step:i+1,reference,from:from+1,to:i+1,window,pages,size:pages.length};
    });
  }
  function demand(streams,delta,frames){
    if(!Array.isArray(streams)||streams.length===0||streams.length>32||
      !Number.isInteger(frames)||frames<1||frames>100000)throw Error('Invalid demand inputs');
    const parts=streams.map(a=>trace(a,delta));
    const steps=Math.min(...parts.map(x=>x.length));
    return Array.from({length:steps},(_,i)=>{
      const sizes=parts.map(p=>p[i].size),total=sizes.reduce((a,b)=>a+b,0);
      return {step:i+1,sizes,total,frames,shortage:Math.max(0,total-frames),
        capacityPressure:total>frames};
    });
  }
  global.OS_WORKING_SET={trace,demand};
  const c=global.OS_DATA?.lessons.find(x=>x.id===25)?.textbook;
  if(!c)return;
  const p=[1,2,1,3,4,2,5,2,3,6],q=[7,7,8,9,7,8,10,11,8,7];
  const delta=4,own=trace(p,delta),paired=demand([p,q],delta,6);
  if(own.map(x=>x.size).join(',')!=='1,2,2,3,4,4,4,3,3,4')throw Error('Working-set manual counts inconsistent');
  // Preserve the existing Clock trace instead of replacing it: two algorithms
  // have different meanings (replacement victim vs reference locality).
  c.algorithm.push(
    'Working Set（另一種分析，不是 Clock victim 選擇）：定義參照視窗 \u0394=4，WS(t,\u0394) 是第 t 次參照結束後，最近最多四個 reference 中曾出現的 page 集合；WSS(t,\u0394)=|WS|。每次向右移動視窗，記錄離窗與進窗的 page。',
    '對兩個行程在各自第 t 筆參照的教學快照，需求 D(t)=WSS_P(t,\u0394)+WSS_Q(t,\u0394)；若 D(t)>可用 frame F，代表這兩個 Working Set 無法同時完全常駐，屬容量壓力，不可只憑不等式宣告已觀測到 thrashing。',
    '調整 \u0394 作敏感度分析：固定 t 且相同歷史時，較大參照視窗的 Working Set 只會相同或增加；但固定 \u0394 隨時間移動時，WSS 可能增加也可能減少。',
    '實際 Linux 驗證須以 minor/major faults、RSS、swap I/O 與壓力訊號交叉判斷；頁面第一次被觸碰的 minor fault 不等於交換造成的 thrashing。'
  );
  c.worked += '\n\nWorking Set 完整範例：P 的參照序列 [1,2,1,3,4,2,5,2,3,6]、\u0394=4；每次最近四筆 references 和 WSS 見下方獨立狀態表。WSS 依序為 '+
    own.map(x=>x.size).join(', ')+'。第 8 步 WS=[4,2,5]，WSS=3；第 10 步 WS=[5,2,3,6]，WSS=4，說明移動視窗時 WSS 非單調。';
  c.worked += '\n\n多行程容量需求例題：Q 的參照序列 [7,7,8,9,7,8,10,11,8,7]、同樣 \u0394=4；實體 frame 總數 F=6。第 5 步 P=4、Q=3，D=7，容量缺口=1；這只說明兩行程最近參照集合合計大於 F，並不等價於 Linux 已發生持續換頁抖動。各時點需求見第二張表。';
  c.symbols += ' Working Set：\u0394 為回看參照個數（不是秒），WS_i(t,\u0394) 為行程 i 的最近 \u0394 筆不同頁集合，WSS_i=|WS_i|；D(t)=\u03a3WSS_i；F=所有行程合計可用實體頁框數，D>F 是容量壓力警訊。';
  c.invariant += ' 同一行程固定 t，若 \u0394_a\u2264\u0394_b 則 WS(t,\u0394_a)\u2286WS(t,\u0394_b)，故 WSS 不減；任一步 1\u2264WSS\u2264min(\u0394,t)，且 D=\u03a3_i WSS_i。容量超額不是 thrashing 發生的充分證據。';
  c.counterexample += ' 對 P 的參照序列第 7→8 步，WSS 由 4 減成 3，因此不能誤稱「時間越往後工作集合一定越大」。D>F 的快照不能直接當做缺頁率或 swap 次數；要有時間序列觀測才可診斷 thrashing。';
  c.extraTables ||= [];
  c.extraTables.push({
    title:'Working Set｜\u0394=4 逐次滑動視窗',
    description:'P 的最近至多四筆 references，列出不同頁集合與大小；此表不是 Clock hand / victim。',
    headers:['步驟','新參照','最近四筆 references','WS(t,4)','WSS'],
    rows:own.map(s=>[String(s.step),String(s.reference),'['+s.window.join(', ')+']',
      '{'+s.pages.join(', ')+'}',String(s.size)])
  });
  c.extraTables.push({
    title:'雙行程需求 D(t) 與容量壓力',
    description:'以各行程的第 t 筆參照作同步快照；F=6。超額只代表需要額外 frames 的估計，非真實 OS 換頁觀測。',
    headers:['t','WSS_P','WSS_Q','D(t)','F','D>F／缺額'],
    rows:paired.map(s=>[String(s.step),String(s.sizes[0]),String(s.sizes[1]),
      String(s.total),String(s.frames),s.capacityPressure?'是／'+s.shortage:'否／0'])
  });
  c.l3.checks.push('對 WS(t,\u0394) 的每一步列出滑動視窗、distinct pages、WSS；以 \u0394=1、4、10 驗證包含關係，並檢驗 D>F 不能直接等同 thrashing。');
  c.l3.steps.push('用 Linux / WSL2 執行 node tests/os-linux-pagefault.cjs，蒐集 getrusage minor/major page faults 的第一次觸碰與重複觸碰差異；不能把 minor faults 誤認為 swap。');
})(window);
