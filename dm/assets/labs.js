/* DM LAB 互動實驗：24 種逐步實驗。LAB_DEFS 定義輸入，labFrames(type, 輸入值) 產生步驟畫面；
 * 每種實驗透過 CSLab.frameLab 註冊，因此自動獲得上一步、自動播放與步驟列表。 */
'use strict';
(function () {
const LAB_DEFS={
  truth:{name:'命題運算真值表',inputs:[['op','邏輯式','select','imp', [['imp','P → Q'],['and','P ∧ Q'],['or','P ∨ Q'],['eq','P ↔ Q'],['xor','P ⊕ Q']]]]},
  normal:{name:'等價式逐列檢驗',inputs:[['mode','比較對象','select','dem1',[['dem1','¬(P∧Q) 與 ¬P∨¬Q'],['dem2','¬(P∨Q) 與 ¬P∧¬Q'],['impl','P→Q 與 ¬P∨Q'],['wrong','¬(P∧Q) 與 ¬P∧¬Q（不等價）']]]]},
  quant:{name:'量詞與反例檢查',inputs:[['cond','性質 P(x)','select','even',[['even','x 為偶數'],['gt','x > 2'],['prime','x 為質數']]],['scope','論域','select','1234',[['1234','{1,2,3,4}'],['2468','{2,4,6,8}'],['123','{1,2,3}']]]]},
  sets:{name:'集合計算與冪集',inputs:[['a','集合 A','select','123',[['123','{1,2,3}'],['12','{1,2}'],['234','{2,3,4}']]],['b','集合 B','select','34',[['34','{3,4}'],['23','{2,3}'],['45','{4,5}']]],['op','運算','select','cap',[['cap','交集 A∩B'],['cup','聯集 A∪B'],['diff','差集 A−B'],['sym','對稱差 A△B'],['power','冪集 P(A)']]]]},
  relation:{name:'關係性質查核',inputs:[['kind','R ⊆ A×A','select','equiv',[['equiv','等價關係範例'],['leq','≤ 偏序'],['cycle','循環 1→2→3→1'],['bad','缺少自反邊']]]]},
  function:{name:'單射／滿射／雙射判別',inputs:[['mapping','對應規則','select','bij',[['bij','1→a, 2→b, 3→c'],['inj','1→a, 2→b, 3→c（B 多出 d）'],['surj','1→a, 2→b, 3→b'],['none','1→a, 2→a, 3→b（B 多出 c）']]]]},
  proof:{name:'奇數平方的逆否證明',inputs:[['n','嘗試一個奇數（僅驗算）','number',7,[-99,99,2]]]},
  induction:{name:'三角數公式歸納推演',inputs:[['k','歸納變數 k','range',5,[1,20,1]]]},
  count:{name:'乘法／加法／鴿籠原理',inputs:[['method','計數情境','select','product',[['product','搭配服裝：乘法'],['sum','互斥菜單：加法'],['hole','分盒子：鴿籠']]],['a','第一個數量','range',4,[1,15,1]],['b','第二個數量','range',3,[1,12,1]]]},
  comb:{name:'排列、組合與 Pascal 三角形',inputs:[['n','總人數 n','range',7,[2,13,1]],['r','選取人數 r','range',3,[0,9,1]]]},
  inclusion:{name:'容斥公式即時計算',inputs:[['a','A 的人數','range',15,[0,30,1]],['b','B 的人數','range',12,[0,30,1]],['both','兩者都符合','range',5,[0,20,1]]]},
  recurrence:{name:'Fibonacci 與重疊子問題',inputs:[['n','計算 F(n)','range',8,[2,18,1]]]},
  genfunc:{name:'生成函數係數卷積',inputs:[['a','A(x) 多項式','select','111',[['111','1 + x + x²'],['11','1 + x'],['121','1 + 2x + x²']]],['b','B(x) 多項式','select','11',[['11','1 + x'],['111','1 + x + x²'],['12','1 + 2x']]]]},
  euclid:{name:'歐幾里得除法步驟',inputs:[['a','整數 a','number',252,[1,9999,1]],['b','整數 b','number',105,[1,9999,1]]]},
  mod:{name:'同餘、逆元與快速冪',inputs:[['a','底數 a','range',3,[1,20,1]],['m','模數 m','range',7,[2,25,1]],['exp','指數 e','range',5,[1,16,1]]]},
  graph:{name:'握手引理：度數計算',inputs:[['preset','選擇圖','select','triangle',[['triangle','三角形'],['path','四點路徑'],['star','中心星狀'],['cycle','五點環']]]]},
  traverse:{name:'BFS／DFS 逐步探索',inputs:[['method','演算法','select','bfs',[['bfs','廣度優先 BFS'],['dfs','深度優先 DFS']]],['start','起點','select','0',[['0','A'],['1','B'],['2','C'],['3','D'],['4','E']]]]},
  euler:{name:'Euler 路徑存在性',inputs:[['preset','測試圖','select','path',[['path','四點路徑'],['triangle','三角形'],['star','四個端點的星狀'],['split','兩個獨立分量']]]]},
  tree:{name:'樹的 n−1 性質',inputs:[['n','節點數 n','range',6,[2,9,1]],['extra','額外加邊','select','0',[['0','不加'],['1','加一條樹外邊']]]]},
  poset:{name:'整除偏序與 Hasse 邊',inputs:[['set','元素集合','select','1236',[['1236','{1,2,3,6}'],['1248','{1,2,4,8}'],['1234','{1,2,3,4}']]]]},
  circuit:{name:'半加器／全加器',inputs:[['mode','電路','select','half',[['half','半加器'],['full','全加器']]],['a','輸入 A','select','1',[['0','0'],['1','1']]],['b','輸入 B','select','1',[['0','0'],['1','1']]],['cin','進位 Cin','select','0',[['0','0'],['1','1']]]]},
  prob:{name:'有限樣本空間條件機率',inputs:[['event','事件 A','select','even',[['even','偶數'],['gt4','大於 4'],['prime','質數']]],['given','條件 B','select','gt3',[['gt3','大於 3'],['even','偶數'],['prime','質數']]]]},
  dfa:{name:'DFA 字串逐字元轉移',inputs:[['word','二進位輸入（最多 12 位）','text','1101',[]]]},
  invariant:{name:'加總迴圈不變量',inputs:[['n','求 1 到 n 的總和','range',7,[1,18,1]]]}
};
function h(v){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
const bool=v=>v?'真':'假';
function table(headers,rows,mark=-1){return `<div class="tablewrap"><table class="matrix"><thead><tr>${headers.map(s=>`<th>${h(s)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i===mark?'selected':''}">${r.map(c=>`<td>${h(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function pill(items,color=''){return `<div class="chipslab">${items.map(x=>`<span class="labpill ${color}">${h(x)}</span>`).join('')}</div>`;}
function stage(label,desc,visual='',sub=''){return {label,desc,visual,sub};}
function block(label,text){return `<div class="boxnum"><span class="minor">${h(label)}</span><strong>${h(text)}</strong></div>`;}
function metric(pairs){return `<div class="labmetrics">${pairs.map(([k,v])=>block(k,v)).join('')}</div>`;}
function bars(vals,hot=[]){let max=Math.max(1,...vals);return `<div class="bars">${vals.map((v,i)=>`<div class="barcol"><div class="bar ${hot.includes(i)?'hot':''}" style="height:${Math.round(12+v/max*87)}%"></div><b>${h(v)}</b><span>${i}</span></div>`).join('')}</div>`;}
function graphView(names,edges,active=[],opt={}){const n=names.length;const pos=names.map((_,i)=>({x:170+Math.cos(-Math.PI/2+i*2*Math.PI/n)*123,y:150+Math.sin(-Math.PI/2+i*2*Math.PI/n)*103}));const lines=edges.map(e=>{let [u,v]=e;return `<line x1="${pos[u].x}" y1="${pos[u].y}" x2="${pos[v].x}" y2="${pos[v].y}" stroke="${active.includes(u)&&active.includes(v)?'#79f8d2':'#586e91'}" stroke-width="${active.includes(u)&&active.includes(v)?'3':'2'}"/>`;}).join('');return `<div class="graphpad"><svg viewBox="0 0 340 300" role="img" aria-label="圖論節點及其邊">${lines}${names.map((name,i)=>`<circle cx="${pos[i].x}" cy="${pos[i].y}" r="22" fill="${active.includes(i)?'#8ff2cf':'#1b3051'}" stroke="${active.includes(i)?'#cff8e6':'#82a8e6'}" stroke-width="2"/><text x="${pos[i].x}" y="${pos[i].y+5}" fill="${active.includes(i)?'#08251f':'#f6faff'}" text-anchor="middle" font-size="15" font-weight="750">${h(name)}</text>`).join('')}</svg></div>`;}
function gcd(a,b){while(b)[a,b]=[b,a%b];return a;}
function C(n,r){if(r<0||r>n)return 0;r=Math.min(r,n-r);let v=1;for(let i=1;i<=r;i++)v=v*(n-i+1)/i;return Math.round(v);}
function labFrames(type,v){let f=[];const push=(title,explain,visual='',sub='')=>f.push(stage(title,explain,visual,sub));
 if(type==='truth'||type==='normal'){
  const rows=[[0,0],[0,1],[1,0],[1,1]];
  let op=v.op;let test=(p,q)=>op==='and'&&p&&q||op==='or'&&(p||q)||op==='eq'&&(p===q)||op==='xor'&&(p!==q)||op==='imp'&&(!p||q);
  let mode=v.mode;let expressions={dem1:[(p,q)=>!(p&&q),(p,q)=>!p||!q],dem2:[(p,q)=>!(p||q),(p,q)=>!p&&!q],impl:[(p,q)=>!p||q,(p,q)=>!p||q],wrong:[(p,q)=>!(p&&q),(p,q)=>!p&&!q]};
  let tests=expressions[mode]||expressions.dem1;
  let results=rows.map(([p,q])=>type==='truth'?[bool(test(p,q))]:[bool(tests[0](p,q)),bool(tests[1](p,q)),tests[0](p,q)===tests[1](p,q)?'✓':'✗']);
  let heads=type==='truth'?['P','Q','結果']:['P','Q','左式','右式','相同？'];
  push('確定命題變數','此處有 P、Q 兩個布林變數，因此要檢查 2²＝4 種可能賦值。',metric([['變數','2'],['真值列數','4']]));
  for(let i=0;i<rows.length;i++){const tab=rows.map(([p,q],j)=>[p,q,...(j<=i?results[j]:results[j].map(()=> '—'))]);push(`第 ${i+1} 列：P=${rows[i][0]}、Q=${rows[i][1]}`,type==='truth'?`依所選運算式計算，這列的真值是「${results[i][0]}」。`:`左右兩式${results[i][2]==='✓'?'相等':'不相等'}：${results[i].slice(0,2).join(' / ')}。`,table(heads,tab,i));}
  push('整張表檢查完成',type==='truth'?'真值表可用於找重言式、矛盾式或反例。':`兩式${results.every(r=>r[2]==='✓')?'在所有賦值下相同，因此邏輯等價':'至少有一列不同，故不等價' }。`,table(heads,rows.map(([p,q],i)=>[p,q,...results[i]])));
 }
 else if(type==='quant'){
  const domains={1234:[1,2,3,4],2468:[2,4,6,8],123:[1,2,3]};const U=domains[v.scope]||domains['1234'];const pred=x=>v.cond==='even'?x%2===0:v.cond==='gt'?x>2:x>1&&![2,3,5,7,11].some(d=>d<x&&x%d===0);
  let b=[];push('建立論域與述詞','請注意量詞的真假依賴論域；此處逐一評估 P(x)。',pill(U.map(x=>`x=${x}`)));
  for(let x of U){b.push([x,bool(pred(x))]);push(`檢查 x=${x}`,`P(${x})=${bool(pred(x))}。${!pred(x)?'這是全稱命題可能的反例。':''}`,table(['x','P(x)'],b,b.length-1));}
  push('綜合量詞',`∀x P(x)=${bool(U.every(pred))}；∃x P(x)=${bool(U.some(pred))}。${U.some(x=>!pred(x))?'一個反例就能推翻全稱命題。':'此論域沒有反例。'}`,metric([['∀x P(x)',bool(U.every(pred))],['∃x P(x)',bool(U.some(pred))]]));
 }
 else if(type==='sets'){
  const sets={123:[1,2,3],12:[1,2],234:[2,3,4],34:[3,4],23:[2,3],45:[4,5]};const A=sets[v.a]||sets['123'],B=sets[v.b]||sets['34'];
  push('確認輸入集合','集合沒有順序與重複；運算依元素是否屬於 A、B 決定。',metric([['A','{'+A.join(', ')+'}'],['B','{'+B.join(', ')+'}']]));
  if(v.op==='power'){let power=[[]];A.forEach((item,k)=>{power=[...power,...power.map(p=>[...p,item])];push(`檢查第 ${k+1} 個元素：${item}`,`已有 ${power.length} 個子集合。這個元素每種情況都可選或不選。`,pill(power.map(p=>'{'+p.join(',')+'}')));});push('冪集完成',`|P(A)|=2^${A.length}=${power.length}。`,pill(power.map(p=>'{'+p.join(',')+'}')));}
  else {const keys=[...new Set([...A,...B])].sort((a,b)=>a-b);let out=[];for(const x of keys){const ina=A.includes(x),inb=B.includes(x);const keep=v.op==='cap'?ina&&inb:v.op==='cup'?ina||inb:v.op==='diff'?ina&&!inb:ina!==inb;if(keep)out.push(x);push(`判定元素 ${x}`,`在 A？${bool(ina)}；在 B？${bool(inb)}，因此${keep?'保留':'排除'}。`,metric([['已選集合','{'+out.join(',')+'}'],['目前元素',x]]));}push('計算結果',`依 ${v.op==='cap'?'交集':v.op==='cup'?'聯集':v.op==='diff'?'差集':'對稱差'} 定義得到下列集合。`,pill(out.length?out:['∅']));}
 }
 else if(type==='relation'){
  const A=[1,2,3],D=[[1,1],[2,2],[3,3]],R=v.kind==='equiv'?[...D,[1,2],[2,1]]:v.kind==='leq'?A.flatMap(a=>A.filter(b=>a<=b).map(b=>[a,b])):v.kind==='cycle'?[[1,2],[2,3],[3,1]]:[[1,1],[1,2],[2,2],[3,2]];
  const has=(a,b)=>R.some(e=>e[0]===a&&e[1]===b);
  const reflex=A.every(a=>has(a,a));const sym=R.every(([a,b])=>has(b,a));const anti=R.every(([a,b])=>a===b||!has(b,a));const trans=R.every(([a,b])=>R.filter(e=>e[0]===b).every(([,c])=>has(a,c)));
  push('列出有序對','關係 R 不只是把數字連起來；箭頭方向不能忽略。',pill(R.map(e=>`(${e.join(',')})`)));
  [['自反','每個 a 都應有 (a,a)',reflex],['對稱','若 (a,b) 存在，也要有 (b,a)',sym],['反對稱','若 a≠b，不能同時有 (a,b) 與 (b,a)',anti],['遞移','若 (a,b),(b,c) 存在，必須有 (a,c)',trans]].forEach(([label,desc,flag])=>push(`檢查${label}性`,`${desc}。檢查結果：${flag?'滿足':'不滿足'}。`,metric([[label,flag?'✓ 滿足':'✗ 不滿足']])));
  push('判定關係種類',`等價關係：${bool(reflex&&sym&&trans)}；偏序：${bool(reflex&&anti&&trans)}。`,metric([['等價關係',bool(reflex&&sym&&trans)],['偏序',bool(reflex&&anti&&trans)]]));
 }
 else if(type==='function'){
  let outputs=v.mapping==='bij'?['a','b','c']:v.mapping==='inj'?['a','b','c']:v.mapping==='surj'?['a','b','b']:['a','a','b'];const B=v.mapping==='inj'?['a','b','c','d']:['a','b','c'];
  push('輸入、對應域','定義域 A={1,2,3}；對應域 B 與映射 f 如下。',metric([['A','{1,2,3}'],['B','{'+B.join(',')+'}']]));
  outputs.forEach((o,i)=>push(`計算 f(${i+1})`,`元素 ${i+1} 的輸出為 ${o}。`,pill(outputs.slice(0,i+1).map((x,j)=>`${j+1} → ${x}`))));
  const inj=new Set(outputs).size===outputs.length,surj=B.every(b=>outputs.includes(b));push('單射與滿射檢查',`輸出是否互異：${bool(inj)}；對應域是否被覆蓋：${bool(surj)}。`,metric([['單射',bool(inj)],['滿射',bool(surj)],['雙射',bool(inj&&surj)]]));
 }
 else if(type==='proof'){
  const raw=Math.trunc(+v.n||7),n=raw%2===0?raw+1:raw,k=(n-1)/2;
  push('待證命題','若 n² 為偶數，則 n 為偶數。改證等價的逆否命題：「n 若為奇數，n² 為奇數」。',metric([['原命題','n² 偶 ⇒ n 偶'],['逆否命題','n 奇 ⇒ n² 奇']]));
  push('以任意整數 k 表示奇數','設 n=2k+1，其中 k 是任意整數。這一步具有一般性，不依賴輸入樣例。',metric([['形式','n=2k+1'],['樣例 k',k]]));
  push('展開平方','n²=(2k+1)²=4k²+4k+1=2(2k²+2k)+1。',metric([['一般形式','2×整數+1'],['樣例 n²',n*n]]));
  push('完成逆否證明','因 2k²+2k 必為整數，所以 n² 為奇數。逆否等價，原命題得證。樣例只用來協助理解。',pill(['✓ 證明適用所有整數 k','有限測試 ≠ 一般性證明']));
 }
 else if(type==='induction'){
  let k=Math.max(1,Math.min(20,Math.trunc(+v.k||5)));push('基底案例 n=1','左式 1，右式 1×2/2=1，故 P(1) 成立。',metric([['左式','1'],['右式','1']]));
  push(`假設 P(k)，此例 k=${k}`,'歸納假設：1+2+⋯+k = k(k+1)/2。注意：必須假設任意 k 成立，不能只驗算本例。',metric([['左式',k*(k+1)/2],['右式',`${k}×${k+1}/2`]]));
  push('推進到 k+1','在左右等式同加 k+1，得到 k(k+1)/2+(k+1)。',metric([['新增項',k+1],['步驟後數值',(k+1)*(k+2)/2]]));
  push('代數化簡與總結','提取 (k+1) 得到 (k+1)(k+2)/2，恰為 P(k+1)。基底與步驟皆成立，故 ∀n≥1 得證。',pill(['P(1) ✓','P(k) ⇒ P(k+1) ✓','∀n≥1 ✓']));
 }
 else if(type==='count'){
  let a=+v.a,b=+v.b;if(v.method==='product'){push('確認逐步選擇',`第一步 ${a} 種、第二步每種情況 ${b} 種。`,metric([['第一步',a],['第二步',b]]));for(let i=1;i<=a;i++)push(`處理第 ${i} 個第一步選擇`,`每個分支都產生 ${b} 種搭配，累計 ${i*b} 種。`,bars(Array.from({length:a},(_,j)=>j<i?b:0),[i-1]));push('乘法原理',`共有 ${a}×${b}=${a*b} 種。`,metric([['搭配數',a*b]]));}
  else if(v.method==='sum'){push('兩類互斥選擇','情境假設類別 A、B 不重疊，且最後只選一種。',metric([['A',a],['B',b]]));push('合併選擇','相加即可，不會重複計數。',metric([['總選擇數',a+b]]));}
  else{push('建立分配問題',`把 ${a} 個物品放進 ${b} 個盒子。`,metric([['物品',a],['盒子',b]]));push('計算平均數',`平均每盒 ${a}/${b}≈${(a/b).toFixed(2)}。`,metric([['平均數',(a/b).toFixed(2)]]));push('向上取整','一定至少有一盒不少於平均數的上整數，這是保證下界，不是每盒都如此。',metric([['某盒至少',Math.ceil(a/b)]]));}
 }
 else if(type==='comb'){
  let n=+v.n,r=Math.min(n,Math.max(0,+v.r));let fact=1;for(let i=2;i<=n;i++)fact*=i;
  push('選擇模式','n 個不同物件中取 r 個，先區分順序有無影響結果。',metric([['n',n],['r',r]]));
  let p=1;for(let i=0;i<r;i++){p*=n-i;push(`排列第 ${i+1} 個位置`,`${n-i} 種新選擇，現在可排 ${p} 種。`,metric([['排列累積',p]]));}
  if(r===0)push('空排列','不選任何人只有一種方式。',metric([['P(n,0)','1']]));
  push('消去組合內部順序',`每組 r 人會被重複排列 r! 次，因此 C(${n},${r})=P(${n},${r})/${r}!=${C(n,r)}。`,metric([['排列 P(n,r)',p],['組合 C(n,r)',C(n,r)]]));
 }
 else if(type==='inclusion'){
  const a=+v.a,b=+v.b,both=Math.min(a,b,+v.both),overlap=both;
  push('列出集合人數',`|A|=${a}，|B|=${b}，|A∩B|=${overlap}（若輸入超過最小集合大小，交集自動截斷）。`,metric([['|A|',a],['|B|',b],['|A∩B|',overlap]]));
  push('直接相加','直接計算 |A|+|B| 會把同時符合者重複計算兩遍。',metric([['重複前總數',a+b]]));
  push('減去重複的人',`|A∪B|=${a}+${b}−${overlap}=${a+b-overlap}。`,metric([['聯集',a+b-overlap],['恰一種',a+b-2*overlap]]));
 }
 else if(type==='recurrence'){
  const n=+v.n;let a=0,b=1;push('設定初始條件','F(0)=0、F(1)=1；這兩個值才能唯一決定後面各項。',metric([['F(0)',0],['F(1)',1]]));let seq=[0,1];for(let i=2;i<=n;i++){const c=a+b;a=b;b=c;seq.push(c);push(`計算 F(${i})`,`F(${i})=F(${i-1})+F(${i-2})=${seq[i-1]}+${seq[i-2]}=${c}。`,bars(seq.slice(0,i+1),[i]));}push('數列已得到',`F(${n})=${seq[n]}。此為逐項計算版本，計算時間 Θ(n)，並非純遞迴的指數重算。`,pill(seq.map((x,i)=>`F${i}=${x}`)));
 }
 else if(type==='genfunc'){
  const opts={111:[1,1,1],11:[1,1],121:[1,2,1],12:[1,2]};const A=opts[v.a]||opts['111'],B=opts[v.b]||opts['11'],out=Array(A.length+B.length-1).fill(0);
  push('讀取多項式係數',`A(x) 的係數 [${A}]，B(x) 的係數 [${B}]；位置 k 表示 xᵏ。`,metric([['A 係數',A.join(', ')],['B 係數',B.join(', ')]]));
  for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++){out[i+j]+=A[i]*B[j];push(`乘上 x^${i+j} 的貢獻`,`a${i}×b${j}=${A[i]}×${B[j]}=${A[i]*B[j]}，加到 c${i+j}。`,bars(out,[i+j]));}
  push('卷積結果',`C(x)=A(x)B(x)，係數為 [${out.join(', ')}]。`,pill(out.map((x,i)=>`x^${i}: ${x}`)));
 }
 else if(type==='euclid'){
  let a=Math.max(1,Math.min(9999,Math.floor(+v.a||252))),b=Math.max(1,Math.min(9999,Math.floor(+v.b||105))),orig=[a,b];push('初始化','我們要求 gcd(a,b)，用餘數取代較大的數並保持 gcd 不變。',metric([['a',a],['b',b]]));let n=0;while(b&&n++<30){const q=Math.floor(a/b),r=a%b;push(`第 ${n} 次除法`,`${a}=${q}×${b}+${r}，故 gcd(${a},${b})=gcd(${b},${r})。`,metric([['商 q',q],['餘數 r',r]]));[a,b]=[b,r];}push('演算法終止',`餘數為 0，故 gcd(${orig[0]},${orig[1]})=${a}。`,metric([['最大公因數',a],['除法次數',n]]));
 }
 else if(type==='mod'){
  const a=+v.a,m=+v.m,e=+v.exp;push('取餘與同餘',`${a} mod ${m} = ${a%m}。`,metric([['模數',m],['底數餘數',a%m]]));
  const g=gcd(a,m);push('檢查模逆元',`gcd(${a},${m})=${g}，${g===1?'互質，存在乘法逆元':'不互質，沒有乘法逆元'}。`,metric([['gcd',g],['逆元存在',bool(g===1)]]));
  if(g===1){const inverse=Array.from({length:m},(_,i)=>i).find(x=>a*x%m===1);push('搜尋逆元',`${a}×${inverse} ≡1 (mod ${m})。`,metric([['模逆元',inverse]]));}
  let result=1,base=a%m,k=e,step=0;while(k>0){push(`快速冪步驟 ${++step}`,`目前 exponent=${k}（${k%2?'奇數：乘入 base':'偶數：跳過乘入'}），result=${result}，base=${base}。`,metric([['result',result],['base',base],['exponent',k]]));if(k%2)result=result*base%m;base=base*base%m;k=Math.floor(k/2);}push('模冪完成',`${a}^${e} mod ${m} = ${result}。`,metric([['結果',result]]));
 }
 else if(type==='graph'||type==='euler'){
  const specs={triangle:[[0,1],[1,2],[0,2]],path:[[0,1],[1,2],[2,3]],star:[[0,1],[0,2],[0,3],[0,4]],cycle:[[0,1],[1,2],[2,3],[3,4],[4,0]],split:[[0,1],[1,2],[0,2],[3,4]]};let E=specs[v.preset]||specs.triangle,n=Math.max(...E.flat())+1,names='ABCDE'.slice(0,n).split(''),deg=Array(n).fill(0);
  push('列出頂點與邊','固定無向圖，選定不同圖形比較度數與 Euler 條件。',graphView(names,E));
  for(let i=0;i<E.length;i++){let [a,b]=E[i];deg[a]++;deg[b]++;push(`處理邊 ${names[a]}–${names[b]}`,'無向邊的兩端度數各加 1；一條邊貢獻 2 次握手。',graphView(names,E,[a,b]),`目前度數：${deg.map((x,j)=>`${names[j]}:${x}`).join('　')}`);}
  const odd=deg.filter(x=>x%2).length,sum=deg.reduce((a,b)=>a+b,0);const adj=Array.from({length:n},()=>[]);for(const [a,b] of E){adj[a].push(b);adj[b].push(a)}let seen=new Set([E[0][0]]),todo=[E[0][0]];while(todo.length){const x=todo.pop();for(const y of adj[x])if(!seen.has(y)){seen.add(y);todo.push(y)}}const connected=deg.every((x,i)=>x===0||seen.has(i));
  push(type==='graph'?'握手引理驗證':'Euler 存在性判定',type==='graph'?`總度數 ${sum}=2×${E.length}。奇度頂點 ${odd} 個，必為偶數。`:`非孤立點是否連通：${bool(connected)}；奇度頂點 ${odd} 個。${!connected?'非零度子圖不連通，不存在單次走遍所有邊的 Euler 路徑。':odd===0?'存在 Euler 迴路。':odd===2?'存在開放 Euler 路徑。':'奇度點多於 2，沒有 Euler 路徑。'}`,metric([['邊數',E.length],['度數總和',sum],['奇度頂點',odd]]));
 }
 else if(type==='traverse'){
  const E=[[0,1],[0,2],[1,3],[2,4],[3,4]],adj=Array.from({length:5},()=>[]);for(const [a,b] of E){adj[a].push(b);adj[b].push(a)}for(const a of adj)a.sort();const names='ABCDE'.split(''),start=+v.start,seen=new Set([start]),todo=[start],order=[];
  push('初始化探索集合',`${v.method==='bfs'?'BFS 使用 FIFO Queue':'DFS 使用 LIFO Stack'}；起點 ${names[start]} 先被標記。`,graphView(names,E,[start]),`待訪問：${names[start]}`);
  while(todo.length){const u=v.method==='bfs'?todo.shift():todo.pop();order.push(u);let nei=adj[u].slice();if(v.method==='dfs')nei.reverse();for(let w of nei)if(!seen.has(w)){seen.add(w);todo.push(w)}push(`訪問 ${names[u]}`,`已訪問：${order.map(x=>names[x]).join('→')}。`,graphView(names,E,order),`待處理：${todo.map(x=>names[x]).join(',')||'空'}`);}
  push('探索結束',`本例 ${v.method.toUpperCase()} 走訪順序：${order.map(x=>names[x]).join('→')}。鄰居依字母序；DFS 使用堆疊進行反向壓入，以保持較小鄰居優先。`,pill(order.map(x=>names[x])));
 }
 else if(type==='tree'){
  const n=+v.n,E=Array.from({length:n-1},(_,i)=>[Math.floor((i)/2),i+1]);push('建立連通無環的樹',`節點數 ${n}，原先邊數 ${n-1}。`,graphView('ABCDEFGHI'.slice(0,n).split(''),E),`目前樹的邊數為 n−1。`);
  for(let k=1;k<E.length;k++)push(`加入樹邊 ${k+1}`,`依循父子連結逐步加入 ${k+1} 條邊，仍不形成環。`,graphView('ABCDEFGHI'.slice(0,n).split(''),E.slice(0,k+1)));
  if(v.extra==='1'){let edge=[1,2];if(E.some(([a,b])=>(a===edge[0]&&b===edge[1])||(a===edge[1]&&b===edge[0])))edge=[0,2];push('額外加上一條非樹邊',`原樹的兩端已有唯一簡單路徑，新增 ${edge.map(x=>'ABCDEFGHI'[x]).join('–')} 後形成環。`,graphView('ABCDEFGHI'.slice(0,n).split(''),[...E,edge],edge));}push('總結樹的性質',`本例 ${v.extra==='1'?'已成為含環圖，不再是樹':'依然是連通無環圖：n 個節點恰好 n−1 條邊'}。`,metric([['頂點數',n],['總邊數',n-1+(v.extra==='1'?1:0)]]));
 }
 else if(type==='poset'){
  let A=({1236:[1,2,3,6],1248:[1,2,4,8],1234:[1,2,3,4]})[v.set]||[1,2,3,6];push('建立偏序 a | b','定義 a≼b 當且僅當 a 整除 b。',pill(A));let all=[];for(const a of A)for(const b of A)if(a!==b&&b%a===0){all.push([a,b]);push(`比較 ${a} 與 ${b}`,`${b} 可被 ${a} 整除，因此 ${a} ≺ ${b}。`,pill(all.map(([x,y])=>`${x}→${y}`)));}
  const cover=all.filter(([a,b])=>!A.some(c=>c!==a&&c!==b&&c%a===0&&b%c===0));push('刪除遞移冗餘邊',`Hasse 圖只保留覆蓋關係：${cover.map(x=>x.join('→')).join('、')}。`,pill(cover.map(x=>x.join('→'))));
 }
 else if(type==='circuit'){
  const a=+v.a,b=+v.b,ci=v.mode==='full'?+v.cin:0;push('輸入電路訊號',`A=${a}、B=${b}${v.mode==='full'?`、Cin=${ci}`:''}，所有輸入為二元位元。`,metric([['A',a],['B',b],['Cin',ci]]));
  const xor=a^b;push('第一次 XOR',`A⊕B=${xor}；當兩位不同時 XOR 為 1。`,metric([['A⊕B',xor]]));
  if(v.mode==='full')push('第二次 XOR 與進位',`Sum=(A⊕B)⊕Cin=${xor^ci}；Carry=(A∧B)∨(Cin∧(A⊕B))=${(a&b)|(ci&xor)}。`,metric([['Sum',xor^ci],['Carry',(a&b)|(ci&xor)]]));
  push('二進位相加完成',`輸入十進位總和 ${a+b+ci} = ${Math.floor((a+b+ci)/2)}×2+${(a+b+ci)%2}。`,metric([['Sum',((a+b+ci)%2)],['Carry',Math.floor((a+b+ci)/2)]]));
 }
 else if(type==='prob'){
  const U=[1,2,3,4,5,6],pred=(tag,x)=>tag==='even'?x%2===0:tag==='gt4'?x>4:tag==='gt3'?x>3:[2,3,5].includes(x),A=U.filter(x=>pred(v.event,x)),B=U.filter(x=>pred(v.given,x)),AB=A.filter(x=>B.includes(x));
  push('列出公平六面骰樣本空間','樣本空間 Ω={1,2,3,4,5,6}，每個結果機率都為 1/6。',pill(U));push('確認事件 A、B',`A={${A.join(',')}}；B={${B.join(',')}}。`,metric([['|A|',A.length],['|B|',B.length]]));push('找出交集',`A∩B={${AB.join(',')}}；交集 ${AB.length} 個結果。`,pill(AB.length?AB:['∅']));push('條件機率計算',`P(A|B)=P(A∩B)/P(B)=(${AB.length}/6)/(${B.length}/6)=${AB.length}/${B.length}≈${(AB.length/B.length).toFixed(3)}。`,metric([['P(A)',(A.length/6).toFixed(3)],['P(A|B)',(AB.length/B.length).toFixed(3)]]));
 }
 else if(type==='dfa'){
  const raw=String(v.word??'1101').trim();if(!/^[01]{0,12}$/.test(raw)){push('輸入格式不符','請輸入 0、1 組成的二進位字串，長度最多 12；空字串可以模擬，但不被接受。',pill(['可輸入例如：1101、1010、01']));push('無法進行轉移','修改上方輸入後重新執行。');return f;}
  // q0: no relevant suffix; q1: ends in 0; q2: ends in 01
  const trans={q0:{0:'q1',1:'q0'},q1:{0:'q1',1:'q2'},q2:{0:'q1',1:'q0'}};let state='q0';push('初始狀態',`待辨識語言：所有以「01」結尾的二進位字串。初始狀態 q0。`,pill(['q0 初始','q1 尾碼 0','q2 尾碼 01（接受）']));
  for(let i=0;i<raw.length;i++){let before=state,stateNew=trans[state][raw[i]];state=stateNew;push(`讀取第 ${i+1} 位：${raw[i]}`,`δ(${before},${raw[i]})=${state}；處理到前綴「${raw.slice(0,i+1)}」。`,metric([['舊狀態',before],['輸入',raw[i]],['新狀態',state]]));}
  push('檢查最終接受狀態',`處理完整個字串後位於 ${state}；${state==='q2'?'接受字串':'拒絕字串'}。`,metric([['輸入',raw||'ε'],['結果',state==='q2'?'✓ 接受':'✗ 拒絕']]));
 }
 else if(type==='invariant'){
  const n=+v.n;let sum=0;push('初始化 i=0, sum=0','迴圈不變量：處理完前 i 個整數後，sum=i(i+1)/2。此時 0=0。',metric([['i',0],['sum',0],['公式值',0]]));
  for(let i=1;i<=n;i++){sum+=i;push(`第 ${i} 輪：加入 ${i}`,`sum ← sum+${i}；現在 sum=${sum}，而 ${i}×${i+1}/2=${i*(i+1)/2}，不變量保持。`,metric([['i',i],['sum',sum],['不變量',sum===i*(i+1)/2?'✓ 成立':'✗ 不成立']]));}
  push('退出條件 + 不變量 ⇒ 結果',`退出時 i=n=${n}，所以 sum=n(n+1)/2=${sum}。這是算法正確性證明的核心。`,metric([['總和',sum]]));
 }
 if(f.length===1)f.push(stage('完成','已計算最後結果。',f[0].visual));return f;
}

Object.entries(LAB_DEFS).forEach(([type, def]) => CSLab.frameLab(type, { title: def.name, inputs: def.inputs, frames: v => labFrames(type, v) }));
CSLab.sim.dmFrames = labFrames;
})();
