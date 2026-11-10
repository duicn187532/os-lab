/* DSA LAB 互動實驗。
 * 上半部是舊版單檔的實驗程式（configFor 定義輸入、makeFrames 產生步驟、viz 繪製），只把 CSS class 加上 dz- 前綴並改用主題色；
 * 下半部是遷移後新增的專屬實驗，以及透過 CSLab.frameLab 註冊到共用 shell 的轉接層（自動獲得上一步、自動播放與步驟列表）。 */
'use strict';
(function () {
const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function nums(s,limit=12){return String(s||'').split(/[，,\s]+/).filter(Boolean).map(Number).filter(n=>Number.isFinite(n)&&Number.isInteger(n)&&Math.abs(n)<=999).slice(0,limit)}
const frame=(values,note,active=[],done=[],extra={})=>({values:values.slice(),note,active:[...active],done:[...done],...extra});
function configFor(name){const n=(id,label,value,type='text')=>({id,label,value,type});const s=(id,label,value,options)=>({id,label,value,options});switch(name){
case 'array':return [n('values','陣列','4,8,15,16,23,42'),s('op','操作','insert',[['insert','中間插入'],['remove','刪除元素'],['find','線性搜尋']]),n('index','索引 / 尋找值','2','number'),n('value','新元素','99','number')];
case 'complexity':return [n('n','輸入規模 n','12','number'),s('op','時間成長模型','linear',[['constant','O(1)'],['log','O(log n)'],['linear','O(n)'],['nlogn','O(n log n)'],['square','O(n²)']])];
case 'linked':return [n('values','節點數值','10,20,30,40'),s('op','操作','insert',[['insert','插入節點'],['remove','刪除節點']]),n('index','索引','2','number'),n('value','插入值','15','number')];
case 'stack':return [n('values','元素','A,B,C'),s('op','操作','stackpush',[['stackpush','Stack push'],['stackpop','Stack pop'],['enqueue','Queue enqueue'],['dequeue','Queue dequeue']]),n('value','新元素','D')];
case 'recursion':return [n('n','計算 n! （0–7）','4','number')];
case 'search':return [n('values','已排序資料','2,5,7,9,12,16,21,28,32'),n('target','搜尋目標','16','number')];
case 'sort':return [n('values','輸入序列','7,3,9,2,5,1,8'),s('op','排序演算法','bubble',[['bubble','Bubble Sort'],['insertion','Insertion Sort'],['selection','Selection Sort'],['merge','Merge Sort'],['quick','Quick Sort']])];
case 'hash':return [n('values','依序插入的鍵','17,24,8,19,31,10'),n('m','桶數 m（3–11）','7','number')];
case 'bst':return [n('values','依序插入的值','8,3,10,1,6,14,4,7,13')];
case 'heap':return [n('values','依序插入的值','6,9,3,7,2,8'),s('op','優先佇列操作','build',[['build','建立 Min-Heap'],['pop','建立後取出最小值']])];
case 'graph':return [s('op','圖走訪','bfs',[['bfs','BFS'],['dfs','DFS'],['dijkstra','Dijkstra (非負權重)']]),s('start','起點','A',[['A','A'],['B','B'],['C','C'],['D','D'],['E','E'],['F','F']])];
case 'greedy':return [s('op','活動資料集','base',[['base','標準活動集'],['dense','密集重疊集']])];
case 'dp':return [n('n','樓梯階數 n（0–12）','8','number')];
case 'union':return [n('pairs','合併的節點配對（例：0-1,1-2）','0-1,1-2,3-4,2-4')];
default:return []}}
function cellStrip(f){let active=new Set(f.active),done=new Set(f.done);return `<div class="dz-row">${f.values.map((v,i)=>`<div class="dz-cell ${active.has(i)?'active':''} ${done.has(i)?'done':''}">${esc(v)}<small>${i}</small></div>`).join('')}</div>`}
function viz(f){if(f.kind==='bar')return `<div class="dz-bars">${f.values.map((n,i)=>`<div class="dz-bar ${f.active.includes(i)?'active':''} ${f.done.includes(i)?'done':''}" style="height:${Math.max(8,Number(n)/Math.max(1,...f.values)*190)}px">${esc(n)}</div>`).join('')}</div><div class="dz-cap">每根長條代表一筆數值；亮色代表目前比較或交換</div>`;
if(f.kind==='table')return `<div class="dz-row">${f.values.map((n,i)=>`<div class="dz-cell ${f.active.includes(i)?'active':''} ${f.done.includes(i)?'done':''}">${esc(n)}<small>dp[${i}]</small></div>`).join('')}</div>`;
if(f.kind==='hash')return `<div class="dz-row top">${f.buckets.map((a,i)=>`<div class="dz-bucket"><div class="dz-cell ${f.active.includes(i)?'active':''}">${i}</div>${a.map(k=>`<div class="dz-cell key">${esc(k)}</div>`).join('')}</div>`).join('')}</div><div class="dz-cap">h(key) = ((key % m) + m) % m · 以 Chaining 解決碰撞</div>`;
if(f.kind==='nodes')return `<div class="dz-row">${f.values.map((v,i)=>`<div class="dz-node ${f.active.includes(i)?'active':''} ${f.done.includes(i)?'done':''}">${esc(v)}</div>${i<f.values.length-1?'<span class="dz-arrow">→</span>':''}`).join('')}${f.values.length?'<span class="dz-null">→ null</span>':'<span>head → null</span>'}</div><div class="dz-cap">head → next → next，順序不代表連續記憶體</div>`;
if(f.kind==='tree')return treeViz(f);
if(f.kind==='graph')return graphViz(f);
if(f.kind==='unions')return `<div class="dz-row">${f.values.map((root,i)=>`<div class="dz-cell ${f.active.includes(i)?'active':''}">${esc(root)}<small>${i}</small></div>`).join('')}</div><div class="dz-cap">每個位置 i 的值是 parent[i]；同代表即同集合</div>`;
if(f.kind==='complex')return `<div class="dz-row">${f.values.map((v,i)=>`<div class="dz-cell ${f.active.includes(i)?'active':''}">${esc(v)}<small>n=${[1,2,4,8,16,32,64,128][i]}</small></div>`).join('')}</div><div class="dz-cap">顯示不同 n 下模型的近似基本操作次數（超過 9999 顯示 9999+）</div>`;
return cellStrip(f)}
function treeViz(f){let a=f.values;if(!a.length)return '<span class="dz-empty">空樹</span>';let points=[],edges=[],range=460;function rec(i,x,y,dx){if(i>=a.length||a[i]===null)return;points.push({i,x,y,v:a[i]});for(let [child,sign] of [[2*i+1,-1],[2*i+2,1]]){if(child<a.length&&a[child]!==null){edges.push([x,y,x+sign*dx,y+65]);rec(child,x+sign*dx,y+65,Math.max(18,dx/2))}}}rec(0,250,29,117);let h=Math.max(130,...points.map(p=>p.y+35));return `<svg class="dz-svg" viewBox="0 0 500 ${h}" width="500" height="${h}" aria-label="樹狀結構">${edges.map(e=>`<line x1="${e[0]}" y1="${e[1]}" x2="${e[2]}" y2="${e[3]}" class="dz-edge"/>`).join('')}${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="21" class="dz-v ${f.active.includes(p.i)?'on':f.done.includes(p.i)?'done':''}"/><text x="${p.x}" y="${p.y+5}" text-anchor="middle" class="dz-vt">${esc(p.v)}</text>`).join('')}</svg><div class="dz-cap">${f.treeNote||'父節點位置 i；左孩子 2i+1、右孩子 2i+2（本圖僅示意二元樹儲存位置）'}</div>`}
function graphViz(f){let pos={A:[55,85],B:[185,35],C:[185,135],D:[320,26],E:[320,92],F:[320,165]};let edges=[['A','B',4],['A','C',2],['B','D',5],['B','E',1],['C','B',1],['C','E',7],['E','D',2],['E','F',3],['D','F',1]];let lines=edges.map(([u,v,w])=>{let [x1,y1]=pos[u],[x2,y2]=pos[v];let mx=(x1+x2)/2,my=(y1+y2)/2;return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="dz-edge" marker-end="url(#edgeArrow)"/><text x="${mx}" y="${my-4}" class="dz-w">${w}</text>`}).join('');return `<svg class="dz-svg" viewBox="0 0 380 205" width="480" role="img" aria-label="A 至 F 六個節點的有向加權圖"><defs><marker id="edgeArrow" markerWidth="6" markerHeight="6" refX="17" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" class="dz-arrowhead"/></marker></defs>${lines}${Object.entries(pos).map(([node,[x,y]])=>`<circle cx="${x}" cy="${y}" r="20" class="dz-v ${f.active.includes(node)?'on':f.done.includes(node)?'done':''}"/><text x="${x}" y="${y+5}" text-anchor="middle" class="dz-vt">${node}</text>`).join('')}</svg><div class="dz-cap">有向邊權重見連線旁標示；BFS/DFS 忽略權重，Dijkstra 使用非負權重</div>${f.dist?`<div class="dz-cap">目前距離：${Object.entries(f.dist).map(([k,v])=>`${k}=${v===Infinity?'∞':v}`).join('　')}</div>`:''}`}
function makeFrames(id,o){let fs=[],summary='',push=(a,msg,act=[],done=[],extra={})=>fs.push(frame(a,msg,act,done,extra));let a=nums(o.values);const bounded=(x,lo,hi,def=lo)=>Number.isFinite(+x)?Math.max(lo,Math.min(hi,Math.floor(+x))):def;
if(id==='array'){let x=bounded(o.index,0,Math.max(0,a.length));let val=bounded(o.value,-999,999,99);push(a,'初始陣列。元素索引從 0 開始。');if(o.op==='find'){let found=false;for(let i=0;i<a.length;i++){push(a,`檢查 a[${i}]=${a[i]} 是否等於 ${o.index}。`,[i]);if(a[i]===Number(o.index)){push(a,`找到值 ${o.index}，位置是 ${i}。`,[i],[i]);found=true;break}}if(!found)push(a,'找不到目標，已掃描全部元素。')}else if(o.op==='insert'){if(a.length<12){a.push('·');push(a,`先為新元素 ${val} 預留尾端容量。`,[a.length-1]);for(let i=a.length-1;i>x;i--){a[i]=a[i-1];push(a,`把索引 ${i-1} 的值移到索引 ${i}。`,[i-1,i])}a[x]=val;push(a,`將 ${val} 放到索引 ${x}，完成插入。`,[x],[x])}else push(a,'已達 12 個元素的示範上限。')}else{if(x<a.length){for(let i=x;i<a.length-1;i++){a[i]=a[i+1];push(a,`把索引 ${i+1} 的值左移至 ${i}。`,[i])}a.pop();push(a,`刪除索引 ${x} 完成。`)}else push(a,'索引超出可刪除範圍。')}summary='直接索引通常 O(1)；中間插入／刪除與未知值線性搜尋，最壞 O(n)。'}
else if(id==='complexity'){let n=bounded(o.n,1,5000,12);let fn=x=>({constant:1,log:Math.ceil(Math.log2(x+1)),linear:x,nlogn:Math.ceil(x*Math.log2(x+1)),square:x*x})[o.op]||x;let vals=[1,2,4,8,16,32,64,128].map(x=>Math.min(9999,fn(x)));push(vals,`假設基本操作與 ${o.op} 成長模型成正比；n=${n} 對應約 ${fn(n).toLocaleString()} 次操作。`,[],[],{kind:'complex'});for(let i=0;i<vals.length;i++)push(vals,`觀察 n=${[1,2,4,8,16,32,64,128][i]} 時約需 ${vals[i]===9999?'9999+':vals[i]} 次基本操作。`,[i],Array.from({length:i},(_,k)=>k),{kind:'complex'});summary='這只是成長率可視化模型，真實執行時間還會受常數、快取和語言 Runtime 影響。'}
else if(id==='linked'){let x=bounded(o.index,0,a.length,1);let val=bounded(o.value,-999,999,15);push(a,'從 head 開始沿 next 指標走訪。',[],[],{kind:'nodes'});for(let i=0;i<Math.min(x,a.length);i++)push(a,`沿 next 前進到位置 ${i}。`,[i],[],{kind:'nodes'});if(o.op==='insert'){if(a.length<12){push(a,`建立節點 ${val}，先接好新節點的 next。`,[Math.min(x,a.length-1)],[],{kind:'nodes'});a.splice(x,0,val);push(a,`更新前驅節點的 next，節點 ${val} 已插入。`,[x],[x],{kind:'nodes'})}}else{if(x<a.length){a.splice(x,1);push(a,`重新連結指標，移除位置 ${x} 的節點。`,[],[],{kind:'nodes'})}else push(a,'刪除索引超出串列範圍。',[],[],{kind:'nodes'})}summary='走到第 i 個節點需 O(i)；如果已取得前驅指標，實際重接 next 僅需 O(1)。'}
else if(id==='stack'){let a=String(o.values).split(/[，,\s]+/).filter(Boolean).slice(0,10);push(a,`目前元素順序由左到右：${o.op.startsWith('stack')?'最右邊是 stack top':'最左邊是 queue front'}。`);if(['stackpush','enqueue'].includes(o.op)){a.push(String(o.value).slice(0,8)||'D');push(a,`加入 ${o.value}，${o.op==='stackpush'?'放在 stack 頂端':'放在 queue 尾端'}。`,[a.length-1])}else if(a.length){let v=o.op==='stackpop'?a.pop():a.shift();push(a,`取出 ${v}，其餘元素保持原有相對順序。`)}else push(a,'結構為空，無法移除元素。');summary='Stack push/pop、Deque 的 enqueue/popleft 為 O(1)；避免用 Python list.pop(0) 當 queue。'}
else if(id==='recursion'){let n=bounded(o.n,0,7,4);let call=[];push(call,`計算 ${n}!，先理解階乘定義：n! = n × (n−1)!。`);for(let i=n;i>=1;i--){call.push(`f(${i})`);push(call,`呼叫 factorial(${i})，將新的 stack frame 推入堆疊。`,[call.length-1])}call.push('f(0)');push(call,'觸及 base case：factorial(0) = 1。',[call.length-1]);call.pop();let val=1;push(call,'回傳 1，開始展開上一層呼叫。');for(let i=1;i<=n;i++){val*=i;call.pop();push(call,`factorial(${i}) 回傳 ${i} × ${(val/i)} = ${val}。`)}summary=`factorial(${n}) = ${val}，時間 O(n)，呼叫堆疊 O(n)。`}
else if(id==='search'){a=a.sort((x,y)=>x-y);let goal=Number(o.target);let l=0,r=a.length-1;push(a,`在有序陣列中搜尋 ${goal}。候選範圍 [${l}, ${r}]。`);while(l<=r){let m=Math.floor((l+r)/2);push(a,`mid=${m}，比較 a[mid]=${a[m]} 和 ${goal}，候選範圍 [${l}, ${r}]。`,[m]);if(a[m]===goal){push(a,`命中！目標 ${goal} 在索引 ${m}。`,[m],[m]);break}if(a[m]<goal)l=m+1;else r=m-1;push(a,`排除不可能的一半，新的範圍為 [${l}, ${r}]。`)}if(l>r)push(a,`範圍為空，找不到 ${goal}。`);summary='二分搜尋的查找時間 O(log n)、額外空間 O(1)（迭代版）；輸入必須已排序。'}
else if(id==='sort'){a=a.slice(0,11);let act=[],count=0;function snap(msg,active=[],done=[]){if(fs.length<280)push(a,msg,active,done,{kind:'bar'})}snap('原始序列。每個長條高度代表數值。');let n=a.length;if(o.op==='bubble'){for(let i=0;i<n;i++){let swapped=false;for(let j=0;j<n-i-1;j++){snap(`比較索引 ${j} 與 ${j+1}。`,[j,j+1]);count++;if(a[j]>a[j+1]){[a[j],a[j+1]]=[a[j+1],a[j]];swapped=true;snap('相鄰逆序，進行交換。',[j,j+1])}}snap(`本輪結束，右端 ${i+1} 個元素已就位。`,[],Array.from({length:i+1},(_,x)=>n-1-x));if(!swapped)break}}
else if(o.op==='insertion'){for(let i=1;i<n;i++){let key=a[i],j=i-1;snap(`取出第 ${i} 個值 ${key}，向左尋找插入位置。`,[i]);while(j>=0&&a[j]>key){a[j+1]=a[j];snap(`將 ${a[j]} 右移。`,[j,j+1]);j--}a[j+1]=key;snap(`插入 ${key}，前 ${i+1} 個元素保持有序。`,[j+1],Array.from({length:i+1},(_,k)=>k))}}
else if(o.op==='selection'){for(let i=0;i<n;i++){let m=i;for(let j=i+1;j<n;j++){snap(`檢查未排序區段 ${j} 的值 ${a[j]}。`,[m,j]);if(a[j]<a[m])m=j}if(m!==i)[a[i],a[m]]=[a[m],a[i]];snap(`位置 ${i} 已放入剩餘最小值。`,[i,m],Array.from({length:i+1},(_,k)=>k))}}
else if(o.op==='merge'){function merge(l,r){if(r-l<=1)return;let m=(l+r)>>1;merge(l,m);merge(m,r);let x=a.slice(l,m),y=a.slice(m,r),i=0,j=0,k=l;while(i<x.length||j<y.length){if(j===y.length||(i<x.length&&x[i]<=y[j]))a[k++]=x[i++];else a[k++]=y[j++];snap(`合併區間 [${l}, ${m}) 和 [${m}, ${r})。`,[k-1])}snap(`區間 [${l},${r}) 已排序。`,Array.from({length:r-l},(_,z)=>z+l))}merge(0,n)}
else {function quick(l,r){if(l>=r)return;let pivot=a[r],i=l;snap(`以 ${pivot} 為 pivot，對 [${l},${r}] 進行 partition。`,[r]);for(let j=l;j<r;j++){snap(`比較 ${a[j]} 是否 <= pivot ${pivot}。`,[j,r]);if(a[j]<=pivot){[a[i],a[j]]=[a[j],a[i]];snap('放到 pivot 左側區域。',[i,j]);i++}}[a[i],a[r]]=[a[r],a[i]];snap(`pivot ${pivot} 已就位。`,[i],[i]);quick(l,i-1);quick(i+1,r)}quick(0,n-1)}snap('排序完成。',[],a.map((_,i)=>i));summary=`模擬 ${o.op}：${fs.length} 個教學步驟（含比較與狀態變化；非精確 CPU 指令數）。`}
else if(id==='hash'){let m=bounded(o.m,3,11,7);let bucket=Array.from({length:m},()=>[]),v=nums(o.values,16);push([],`初始化 ${m} 個空桶。`,[],[],{kind:'hash',buckets:bucket.map(x=>x.slice())});for(let key of v){let idx=((key%m)+m)%m;let old=bucket[idx].length;bucket[idx].push(key);push([],`插入 ${key}：h(${key})=${idx}${old?'，發生碰撞！用 chaining 接在原桶後面':''}。`,[idx],[],{kind:'hash',buckets:bucket.map(x=>x.slice())})}summary=`元素數 ${v.length}，桶數 ${m}，負載率 α = ${(v.length/m).toFixed(2)}；理想平均查找 O(1)，最差 O(n)。`}
else if(id==='bst'){let v=nums(o.values,15),tree=Array(127).fill(null);push([],`空 BST：每次插入必須維持左小右大的性質。`,[],[],{kind:'tree'});for(let x of v){let idx=0;while(idx<tree.length&&tree[idx]!==null){push(tree.slice(),`插入 ${x}，比較節點 ${tree[idx]}。`,[idx],[],{kind:'tree',treeNote:'BST：左子樹較小，右子樹較大'});idx=x<tree[idx]?idx*2+1:idx*2+2}if(idx<tree.length){tree[idx]=x;push(tree.slice(),`在新的位置插入 ${x}。`,[idx],[],{kind:'tree',treeNote:'BST：左子樹較小，右子樹較大'})}else push(tree.slice(),'示範樹過深，略過這次插入。',[],[],{kind:'tree'})}summary='BST 查找成本取決於高度 h：O(h)；平衡時 O(log n)，退化時 O(n)。'}
else if(id==='heap'){let h=[];push(h,'從空 Min-Heap 開始（用陣列儲存完全二元樹）。',[],[],{kind:'bar'});for(let key of nums(o.values,10)){h.push(key);let i=h.length-1;push(h,`插入 ${key} 到尾端。`,[i],[],{kind:'bar'});while(i>0){let p=(i-1)>>1;if(h[p]<=h[i])break;[h[p],h[i]]=[h[i],h[p]];push(h,`子節點較小，與父節點交換，上浮。`,[p,i],[],{kind:'bar'});i=p}}if(o.op==='pop'&&h.length){let removed=h[0],last=h.pop();if(h.length){h[0]=last;push(h,`取出最小值 ${removed}，末端值 ${last} 移到根。`,[0],[],{kind:'bar'});let i=0;while(true){let l=2*i+1,r=l+1,m=i;if(l<h.length&&h[l]<h[m])m=l;if(r<h.length&&h[r]<h[m])m=r;if(m===i)break;[h[i],h[m]]=[h[m],h[i]];push(h,'將較小子節點與父節點交換，下沉。',[i,m],[],{kind:'bar'});i=m}}else push(h,`取出唯一元素 ${removed}，堆積為空。`,[],[],{kind:'bar'})}push(h,`Min-Heap 根為 ${h.length?h[0]:'空'}。`,[0],[],{kind:'bar'});summary='維持父 ≤ 子。插入與取出最小值 O(log n)，peek O(1)。'}
else if(id==='graph'){const g={A:[['B',4],['C',2]],B:[['D',5],['E',1]],C:[['B',1],['E',7]],D:[['F',1]],E:[['D',2],['F',3]],F:[]};let start=o.start in g?o.start:'A';if(o.op==='dijkstra'){let dist=Object.fromEntries(Object.keys(g).map(k=>[k,Infinity]));dist[start]=0;let seen=new Set();push([],`Dijkstra：起點 ${start} 距離為 0，其餘為 ∞。`,[start],[],{kind:'graph',dist:{...dist}});while(seen.size<6){let u=Object.keys(g).filter(x=>!seen.has(x)).sort((a,b)=>dist[a]-dist[b])[0];if(!u||dist[u]===Infinity)break;seen.add(u);push([],`確定節點 ${u} 的目前最短距離 = ${dist[u]}。`,[u],[...seen],{kind:'graph',dist:{...dist}});for(let [v,w] of g[u])if(dist[u]+w<dist[v]){dist[v]=dist[u]+w;push([],`Relax ${u}→${v}：新距離 ${dist[v]}。`,[u,v],[...seen],{kind:'graph',dist:{...dist}})}}summary='Dijkstra 只適用非負邊；這個小圖以線性找最小距離示範，正式大圖通常搭配 heap。'}else{let seen=new Set([start]),pending=[start],order=[];push([],`從 ${start} 開始，初始化 ${o.op==='dfs'?'Stack':'Queue'}。`,[start],[],{kind:'graph'});while(pending.length){let u=o.op==='dfs'?pending.pop():pending.shift();order.push(u);push([],`拜訪 ${u}。目前遍歷順序：${order.join(' → ')}。`,[u],order.slice(),{kind:'graph'});let neighbors=g[u].map(x=>x[0]);if(o.op==='dfs')neighbors=neighbors.slice().reverse();for(let v of neighbors)if(!seen.has(v)){seen.add(v);pending.push(v);push([],`將 ${v} 加入待訪結構。`,[v],order.slice(),{kind:'graph'})}}summary=`${o.op.toUpperCase()} 順序：${order.join(' → ')}。本例是有向圖；時間 O(V+E)。`}}
else if(id==='greedy'){let intervals=o.op==='dense'?[[0,9],[1,2],[2,4],[4,5],[5,8],[8,10]]:[[1,4],[3,5],[0,6],[5,7],[3,9],[5,9],[6,10],[8,11],[8,12],[2,14],[12,16]];intervals.sort((a,b)=>a[1]-b[1]);let labels=intervals.map(([a,b])=>`${a}–${b}`),end=-Infinity,chosen=[];push(labels,'依照活動結束時間由早到晚排序。');for(let i=0;i<intervals.length;i++){let [s,e]=intervals[i];if(s>=end){chosen.push(i);end=e;push(labels,`接受活動 [${s},${e}]：不與前一個已選活動重疊。`,[i],chosen.slice())}else push(labels,`跳過 [${s},${e}]：開始時間 ${s} 早於上個已選結束時間 ${end}。`,[i],chosen.slice())}summary=`共選出 ${chosen.length} 個不重疊活動。排序 O(n log n)，逐一選取 O(n)。`}
else if(id==='dp'){let n=bounded(o.n,0,12,8),dp=[1];push(dp,'定義 dp[i]：走到第 i 階的方法數。空走 0 階有 1 種。',[0],[],{kind:'table'});if(n>=1){dp.push(1);push(dp,'dp[1] = 1。',[1],[],{kind:'table'})}for(let i=2;i<=n;i++){dp.push(dp[i-1]+dp[i-2]);push(dp,`dp[${i}] = dp[${i-1}] + dp[${i-2}] = ${dp[i-1]} + ${dp[i-2]} = ${dp[i]}。`,[i],[],{kind:'table'})}summary=`到第 ${n} 階共有 ${dp[n]} 種方法。迭代 DP 時間 O(n)，完整表 O(n) 空間，可壓縮至 O(1)。`}
else if(id==='union'){let parent=Array.from({length:8},(_,i)=>i);let find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x};push(parent,'初始 8 個集合，每個元素都是自己的代表。',[],[],{kind:'unions'});let pairs=String(o.pairs).match(/\d+\s*-\s*\d+/g)||[];for(let text of pairs.slice(0,14)){let [a,b]=text.split('-').map(Number);if(a>7||b>7)continue;let ra=find(a),rb=find(b);if(ra===rb){push(parent,`${a} 與 ${b} 已屬同一集合，不必合併。`,[a,b],[],{kind:'unions'});continue}parent[rb]=ra;push(parent,`Union(${a},${b})：讓代表 ${rb} 指向代表 ${ra}。`,[a,b],[],{kind:'unions'})}for(let i=0;i<8;i++)find(i);push(parent,'完成路徑壓縮（本示範未使用 union by rank/size）。',[],[],{kind:'unions'});summary='若配合 Path Compression 與 Union by Rank/Size，可達攤銷 O(α(n))。'}
return {frames:fs.length?fs:[frame([],'輸入無效，請調整資料。')],summary}}

/* ───────────── 遷移後新增：每章專屬實驗 ─────────────
 * 舊版有四組章節共用同一個實驗且預設值相同，畫面完全一樣（ch0／ch2 陣列、ch1／ch17 Big-O、ch7／ch8 Bubble Sort、ch12／ch13 BFS）。
 * 現在：ch0 記憶體位址與快取行、ch8 預設 Merge Sort（只列分治排序）、ch13 Dijkstra、ch17 需求驅動選型；
 * ch7 只列三種基礎排序、ch12 只列 BFS／DFS；ch4 預設改為「同一串資料：Stack vs Queue」。舊版 configFor / makeFrames 未更動。 */
const hex = n => '0x' + n.toString(16).toUpperCase();
const SIZES = { char: 1, int: 4, double: 8 };

function memoryFrames(o) {
  const fs = [], push = (label, msg, active = [], done = [], extra = {}) => fs.push(frame([], msg, active, done, { kind: 'mem', label, ...extra }));
  const size = SIZES[o.elem] || 4, n = Math.max(2, Math.min(16, +o.count || 12)), idx = Math.max(0, Math.min(n - 1, +o.index || 0)), L = +o.line === 64 ? 64 : 16;
  const vals = Array.from({ length: n }, (_, i) => o.elem === 'char' ? String.fromCharCode(65 + i) : o.elem === 'double' ? (i + 1) / 2 : (i + 1) * 10);
  const linked = o.layout === 'linked', base = 0x1000;
  // 鏈結串列：每個節點約 16 bytes（值 + next 指標），由配置器放在不相鄰的位置。
  const addr = vals.map((_, i) => linked ? 0x5000 + ((i * 11 + 5) % 41) * 64 : base + i * size);
  const cells = vals.map((v, i) => ({ v, addr: addr[i], line: Math.floor(addr[i] / L) }));
  const cached = new Set(); let miss = 0, hit = 0;
  const snap = () => ({ cells, cached: [...cached], miss, hit, linked, L });
  if (!linked) {
    push(`宣告 ${o.elem} a[${n}]`, `每個元素 ${size} byte${size > 1 ? 's' : ''}，從基底位址 ${hex(base)} 起連續排列，共 ${n * size} bytes（${hex(base)}–${hex(base + n * size - 1)}）。格子下方是位址。`, [], [], snap());
    push(`計算 &a[${idx}]`, `&a[${idx}] = base + i × sizeof(${o.elem}) = ${hex(base)} + ${idx} × ${size} = ${hex(addr[idx])}。一次乘法加一次加法就到，不必經過前面的元素，這就是 O(1) 隨機存取。`, [idx], [], snap());
    push('切成快取行', `CPU 不會只搬 1 個 byte，而是一次搬進一整條 ${L} bytes 的快取行（cache line）。一條快取行可以放 ${Math.max(1, L / size)} 個 ${o.elem}；同色的格子屬於同一條快取行。`, [], [], snap());
  } else {
    push(`建立 ${n} 個節點`, `每個節點存「值 + next 指標」（64 位元系統約 16 bytes），由記憶體配置器分配到各處，位址彼此不相鄰。`, [], [], snap());
    push(`找第 ${idx} 個節點`, `沒有「base + i × size」公式可用：只能從 head 出發，沿 next 走 ${idx} 步，成本 O(i)。`, [], [], snap());
  }
  for (let i = 0; i < n; i++) {
    const c = cells[i], isHit = cached.has(c.line);
    if (isHit) hit++; else { miss++; cached.add(c.line); }
    const at = linked && i === idx ? `這就是第 ${idx} 個節點：前面已經跟著 next 走了 ${idx} 步。` : '';
    push(`${linked ? `讀取第 ${i} 個節點` : `讀取 a[${i}]`}：${isHit ? '快取命中' : '快取未命中'}`, `位址 ${hex(c.addr)} 位於快取行 #${c.line - Math.floor(addr.reduce((a, b) => Math.min(a, b)) / L)}。${isHit ? '這條快取行剛才已經搬進來，直接命中。' : '這條快取行還不在快取裡，要從 RAM 搬進來（較慢）。'}${at}累計：未命中 ${miss}、命中 ${hit}。`, [i], Array.from({ length: i }, (_, k) => k), snap());
  }
  const rate = Math.round(hit / n * 100);
  const sum = linked
    ? `${n} 次讀取全部未命中：每個節點在不同的快取行，CPU 每一步都在等記憶體。順序走訪同樣是 O(n)，但常數大很多。`
    : `${n} 次讀取只有 ${miss} 次未命中（≈ ${n} × ${size} ÷ ${L}），命中率 ${rate}%。若改存成鏈結串列，最壞每個節點都未命中。`;
  push('比較：同樣 O(n)，快取效果不同', sum, [], cells.map((_, i) => i), snap());
  return { frames: fs, summary: linked ? '鏈結串列：存取第 i 個 O(i)，順序走訪 O(n) 但快取不友善。' : '陣列：&a[i] = base + i × size，存取 O(1)；連續配置讓順序走訪快取友善。' };
}

function stackCompare(o) {
  const items = String(o.values).split(/[，,\s]+/).filter(Boolean).slice(0, 8);
  const fs = [], stack = [], queue = [], outS = [], outQ = [];
  const push = (label, msg, extra = {}) => fs.push(frame([], msg, [], [], { kind: 'dual', label, stack: stack.slice(), queue: queue.slice(), outS: outS.slice(), outQ: outQ.slice(), ...extra }));
  if (!items.length) { push('沒有資料', '請在「元素」輸入以逗號分隔的資料，例如 A,B,C。'); return { frames: fs, summary: '' }; }
  push('準備兩個空容器', `把同一串資料 ${items.join(', ')} 依序放進 Stack 與 Queue，再全部取出，比較取出的順序。`);
  for (const x of items) { stack.push(x); queue.push(x); push(`放入 ${x}`, `Stack push ${x}：放在頂端（最右邊）。Queue enqueue ${x}：排在尾端（最右邊）。`, { hot: 'in' }); }
  while (stack.length) {
    const s = stack.pop(), q = queue.shift(); outS.push(s); outQ.push(q);
    push(`取出：Stack ${s}、Queue ${q}`, `Stack pop 取出最後放入的 ${s}（LIFO）；Queue dequeue 取出最先放入的 ${q}（FIFO）。`, { hot: 'out' });
  }
  push('比較取出順序', `Stack：${outS.join(' → ')}，順序被反轉（LIFO）。Queue：${outQ.join(' → ')}，保持原順序（FIFO）。BFS 用 Queue 逐層前進；DFS、函式呼叫與括號配對用 Stack。`);
  return { frames: fs, summary: 'Stack push/pop 與 Queue enqueue/dequeue（用 deque 或環狀陣列）都是 O(1)。' };
}

/* 需求驅動的資料結構選型（第 18 章綜合實戰）：操作次數 × 每次成本，估計總基本操作數。 */
const OPS = { index: '依位置 i 取值', search: '依鍵查找', insert: '新增一筆', remove: '刪除指定鍵', min: '取出最小值', range: '範圍查詢', lifo: '存取最近一筆（push / pop）' };
const DS = {
  darr: ['動態陣列', { index: '1', search: 'n', insert: '1*', remove: 'n', min: 'n', range: 'n', lifo: '1*' }],
  sorted: ['有序陣列', { index: '1', search: 'log n', insert: 'n', remove: 'n', min: '1', range: 'log n', lifo: null }],
  list: ['鏈結串列', { index: 'n', search: 'n', insert: '1', remove: 'n', min: 'n', range: 'n', lifo: '1' }],
  hash: ['雜湊表', { index: null, search: '1', insert: '1', remove: '1', min: 'n', range: 'n', lifo: null }],
  bst: ['平衡 BST', { index: 'n', search: 'log n', insert: 'log n', remove: 'log n', min: 'log n', range: 'log n', lifo: null }],
  heap: ['Min-Heap', { index: null, search: 'n', insert: 'log n', remove: 'n', min: 'log n', range: 'n', lifo: null }]
};
const WHY = {
  darr: '動態陣列以「base + i × size」O(1) 定位任何位置，尾端追加攤銷 O(1)，連續記憶體也對快取友善；代價是中間插入、刪除要搬移 O(n)。',
  sorted: '有序陣列可以二分搜尋與快速範圍查詢，但每次插入都要搬移元素，只適合「很少更新、大量查詢」。',
  list: '鏈結串列在已知位置插入刪除 O(1)，但找到位置要 O(n)，而且節點分散、快取不友善。',
  hash: '雜湊表把鍵直接算成桶的位置，平均 O(1) 查找、新增與刪除；代價是額外空間、無法依順序走訪，大量碰撞時最差退化成 O(n)。',
  bst: '平衡 BST 讓新增、刪除與範圍查詢都維持 O(log n)（範圍查詢另加輸出的 k 筆），而且資料保持有序；代價是指標多、常數較大。',
  heap: 'Min-Heap 的根永遠是最小值，新增與取出最小值都是 O(log n)，用陣列儲存、不需要旋轉平衡；但它不支援快速查找任意鍵。'
};
const TIE_ORDER = ['darr', 'heap', 'hash', 'sorted', 'bst', 'list']; // 漸近成本相同時：連續記憶體、實作簡單者優先
const TASKS = {
  grades: ['學號查成績', '學籍系統每天依學號查詢 10 萬次，新增、刪除學生各 1 千次；不需要依學號排序列出。', { search: 1e5, insert: 1e3, remove: 1e3 }],
  tasks: ['任務排程', '不斷加入新任務，並反覆取出最緊急（優先值最小）的任務：新增與取出各 5 萬次。', { insert: 5e4, min: 5e4 }],
  playlist: ['播放清單', '依位置跳播第 i 首 10 萬次，偶爾在尾端加歌（1 千次）。', { index: 1e5, insert: 1e3 }],
  price: ['商品價格區間查詢', '陸續上架 1 萬件商品（價格不按順序），並查詢 1 萬次「價格介於 a 到 b 的商品」。', { insert: 1e4, range: 1e4 }],
  undo: ['編輯器復原（Undo）', '每次編輯記錄一筆（10 萬次），按「復原」時取出最近的一筆（5 萬次）。', { lifo: 1.5e5 }]
};
const costOf = (c, n) => ({ '1': 1, '1*': 1, 'log n': Math.log2(n), n, 'n log n': n * Math.log2(n) })[c];
const sup = s => String(s).replace(/[0-9]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const approx = x => x < 1e4 ? Math.round(x).toLocaleString('en-US') : `${(x / 10 ** Math.floor(Math.log10(x))).toFixed(1)}×10${sup(Math.floor(Math.log10(x)))}`;
const big = c => c === null ? '✗' : `O(${c.replace('*', '')})${c.endsWith('*') ? '*' : ''}`;
function chooseEval(task, n) {
  const [, , ops] = TASKS[task] || TASKS.grades;
  const rows = Object.entries(DS).map(([key, [name, cost]]) => {
    const missing = Object.keys(ops).filter(op => cost[op] === null);
    const total = missing.length ? Infinity : Object.entries(ops).reduce((a, [op, cnt]) => a + cnt * costOf(cost[op], n), 0);
    return { key, name, cost, missing, total };
  });
  const ranked = rows.filter(r => r.total < Infinity).sort((a, b) => a.total - b.total || TIE_ORDER.indexOf(a.key) - TIE_ORDER.indexOf(b.key));
  return { ops, rows, ranked, winner: ranked[0] };
}
function chooseFrames(o) {
  const n = [1e3, 1e5, 1e7].includes(+o.n) ? +o.n : 1e5, task = TASKS[o.task] ? o.task : 'grades', [title, story] = TASKS[task];
  const { ops, rows, ranked, winner } = chooseEval(task, n), opKeys = Object.keys(ops), fs = [];
  const push = (label, msg, extra = {}) => fs.push(frame([], msg, [], [], { kind: 'choose', label, opKeys, ops, rows, n, shown: 0, ...extra }));
  push(`讀需求：${title}`, `${story}資料量 n = ${n.toLocaleString('en-US')}。先把需求翻譯成「哪些操作、各做幾次」。`, { phase: 'ops' });
  push('列出候選結構', '把每個候選結構對這些操作的成本（Big-O）列成表；✗ 表示不支援或沒有合理的做法，* 表示攤銷成本。', { phase: 'table' });
  rows.forEach((r, i) => {
    const detail = r.missing.length
      ? `${r.name} 不支援「${r.missing.map(k => OPS[k]).join('、')}」，直接淘汰。`
      : `${opKeys.map(k => `${approx(ops[k])} 次 × ${big(r.cost[k])}`).join(' + ')} ≈ ${approx(r.total)} 次基本操作。`;
    push(`評估：${r.name}`, detail, { phase: 'table', shown: i + 1, mark: i });
  });
  const tie = ranked[1] && ranked[1].total === winner.total;
  push('比較估計成本', `依估計總操作數排序：${ranked.map(r => `${r.name} ${approx(r.total)}`).join('、')}。長條長度採對數刻度（log₁₀），長一截就代表多好幾倍。`, { phase: 'bars', ranked });
  push(`選擇：${winner.name}`, `${WHY[winner.key]}${tie ? `${ranked[1].name} 的漸近成本相同；Big-O 打平時，再比較常數、記憶體區域性與實作難度。` : ''}`, { phase: 'bars', ranked, pick: winner.key });
  push('先寫測試，再用實測驗證', '選型只是假設：替空集合、單一元素、重複鍵、極大輸入與最差輸入順序寫測試，再用 profiler 量測真正的瓶頸。', { phase: 'tests', pick: winner.key, ranked });
  return { frames: fs, summary: `估計值 = Σ 次數 × 單次成本（log 以 2 為底，忽略常數）。只用來比較成長趨勢，不是實際執行時間。` };
}

/* 新增視覺元件；其餘交給舊版 viz()。 */
const { stat, stats } = CSLab.ui;
function vizPlus(f) {
  if (f.kind === 'mem') {
    const first = Math.min(...f.cells.map(c => c.line));
    const row = f.cells.map((c, i) => `<div class="dz-cell mem l${(c.line - first) % 2}${f.active.includes(i) ? ' active' : ''}${f.done.includes(i) ? ' done' : ''}${f.cached.includes(c.line) ? ' cached' : ''}">${esc(c.v)}<small>${hex(c.addr)}</small></div>${f.linked && i < f.cells.length - 1 ? '<span class="dz-arrow">→</span>' : ''}`).join('');
    return `<div class="dz-row mem-row">${row}${f.linked ? '<span class="dz-null">→ null</span>' : ''}</div>${stats([stat('快取未命中', f.miss, { tone: f.miss ? 'hot' : '' }), stat('快取命中', f.hit, { tone: f.hit ? 'ok' : '' }), stat('已載入快取行', f.cached.length), stat('快取行大小', f.L + ' B')])}<div class="dz-cap">${f.linked ? '節點位址不連續：每個節點通常落在不同的快取行' : '同色格子在同一條快取行；外框發亮代表該行已在快取中'}</div>`;
  }
  if (f.kind === 'dual') {
    const lane = (name, xs, note, outs) => `<div class="dz-lane"><div class="dz-lane-head"><b>${name}</b><span>${note}</span></div><div class="dz-row left">${xs.length ? xs.map((x, i) => `<div class="dz-cell${(name === 'Stack' ? i === xs.length - 1 : i === 0) && xs.length ? ' active' : ''}">${esc(x)}</div>`).join('') : '<span class="dz-empty">空</span>'}</div><div class="dz-out">取出順序：${outs.length ? outs.map(esc).join(' → ') : '—'}</div></div>`;
    return lane('Stack', f.stack, '右端是 top，push / pop 都在這裡', f.outS) + lane('Queue', f.queue, '左端是 front（取出），右端是 rear（放入）', f.outQ);
  }
  if (f.kind === 'choose') {
    if (f.phase === 'ops') return `<div class="dz-table-wrap"><table class="dz-table"><thead><tr><th>操作</th><th>次數</th></tr></thead><tbody>${f.opKeys.map(k => `<tr><td>${OPS[k]}</td><td>${approx(f.ops[k])}</td></tr>`).join('')}</tbody></table></div>`;
    if (f.phase === 'table') return `<div class="dz-table-wrap"><table class="dz-table"><thead><tr><th>結構</th>${f.opKeys.map(k => `<th>${OPS[k]}</th>`).join('')}<th>估計總操作</th></tr></thead><tbody>${f.rows.map((r, i) => `<tr class="${i === f.mark ? 'mark' : ''}${i < f.shown && r.missing.length ? ' out' : ''}"><td>${r.name}</td>${f.opKeys.map(k => `<td class="${r.cost[k] === null ? 'no' : ''}">${big(r.cost[k])}</td>`).join('')}<td>${i < f.shown ? (r.missing.length ? '淘汰' : approx(r.total)) : '…'}</td></tr>`).join('')}</tbody></table></div>`;
    const max = Math.log10(Math.max(...f.ranked.map(r => r.total))) + 0.5;
    const bars = `<div class="dz-hbars">${f.ranked.map(r => `<div class="dz-hbar${r.key === f.pick ? ' pick' : ''}"><span>${r.name}</span><i style="width:${Math.max(4, Math.log10(r.total) / max * 100)}%"></i><b>${approx(r.total)}</b></div>`).join('')}</div>`;
    if (f.phase === 'tests') return bars + `<div class="dz-chips">${['空集合', '單一元素', '重複的鍵', `n = ${f.n.toLocaleString('en-US')} 的極大輸入`, '最差輸入順序', 'profiler 實測'].map(t => `<span>${t}</span>`).join('')}</div>`;
    return bars;
  }
  return viz(f);
}

/* ───────────── 接上共用 shell（CSLab.frameLab） ───────────── */
const TITLES = { memory: '記憶體位址與快取行', complexity: 'Big-O 成長階梯', array: '陣列的搬移與存取', linked: '鏈結串列的重連', stack: '堆疊與佇列', recursion: '呼叫堆疊：階乘', search: 'Binary Search', sort: '基礎排序：比較與交換', dcsort: '分治排序：Merge 與 Quick', hash: '雜湊碰撞與桶', bst: '二元搜尋樹的插入', heap: 'Min-Heap 上浮與下沉', graph: 'BFS／DFS 圖走訪', dijkstra: 'Dijkstra 最短路徑', greedy: '區間排程貪心選擇', dp: '動態規劃填表', union: 'Union-Find 連通性', choose: '需求驅動的資料結構選型' };
const pick = (f, keep) => ({ ...f, options: f.options.filter(([v]) => keep.includes(v)) });
function labConfig(type) {
  const n = (id, label, value, type = 'text') => ({ id, label, value, type }), s = (id, label, value, options) => ({ id, label, value, options });
  switch (type) {
    case 'memory': return [s('layout', '資料配置', 'array', [['array', '陣列：連續配置'], ['linked', '鏈結串列：節點分散']]), s('elem', '元素型別', 'int', [['char', 'char（1 byte）'], ['int', 'int（4 bytes）'], ['double', 'double（8 bytes）']]), n('count', '元素個數（2–16）', '12', 'number'), n('index', '要定位的索引 i', '5', 'number'), s('line', '快取行大小', '16', [['16', '16 bytes（縮小示意）'], ['64', '64 bytes（常見 CPU）']])];
    case 'sort': return configFor('sort').map(f => f.id === 'op' ? pick(f, ['bubble', 'insertion', 'selection']) : f);
    case 'dcsort': return configFor('sort').map(f => f.id === 'op' ? { ...pick(f, ['merge', 'quick']), value: 'merge' } : f);
    case 'graph': return configFor('graph').map(f => f.id === 'op' ? pick(f, ['bfs', 'dfs']) : f);
    case 'dijkstra': return configFor('graph').filter(f => f.id !== 'op');
    case 'stack': return configFor('stack').map(f => f.id === 'op' ? { ...f, value: 'compare', options: [['compare', '同一串資料：Stack vs Queue'], ...f.options] } : f);
    case 'choose': return [s('task', '情境', 'grades', Object.entries(TASKS).map(([k, [t]]) => [k, t])), s('n', '資料量 n', '100000', [['1000', '1,000'], ['100000', '100,000'], ['10000000', '10,000,000']])];
    default: return configFor(type);
  }
}
const RANGES = { array: { index: [-999, 999], value: [-999, 999] }, complexity: { n: [1, 5000] }, linked: { index: [0, 12], value: [-999, 999] }, recursion: { n: [0, 7] }, search: { target: [-999, 999] }, hash: { m: [3, 11] }, dp: { n: [0, 12] }, memory: { count: [2, 16], index: [0, 15] } };
const inputsFor = type => labConfig(type).map(f => f.options ? [f.id, f.label, 'select', f.value, f.options] : f.type === 'number' ? [f.id, f.label, 'number', Number(f.value), [...RANGES[type][f.id], 1]] : [f.id, f.label, 'text', f.value, []]);
function generate(type, v) {
  if (type === 'memory') return memoryFrames(v);
  if (type === 'choose') return chooseFrames(v);
  if (type === 'stack' && v.op === 'compare') return stackCompare(v);
  if (type === 'dcsort') return makeFrames('sort', v);
  if (type === 'dijkstra') return makeFrames('graph', { ...v, op: 'dijkstra' });
  return makeFrames(type, v);
}
// 舊版每一步只有一句說明：第一句當步驟標題，其餘當內文；太長時在第一個逗號或冒號斷開。
function splitNote(note) {
  const t = String(note), i = t.indexOf('。');
  let head = i >= 0 ? t.slice(0, i) : t, rest = i >= 0 ? t.slice(i + 1) : '';
  if (head.length > 26) { const j = head.search(/[，：；]/); if (j > 0 && j < 26) { rest = head.slice(j + 1) + (i >= 0 ? '。' : '') + rest; head = head.slice(0, j); } }
  return [head, rest];
}
function toFrames(type, v) {
  const { frames, summary } = generate(type, v);
  return frames.map((f, i) => { const [label, desc] = f.label ? [f.label, f.note] : splitNote(f.note); return { label, desc, visual: `<div class="dz-stage">${vizPlus(f)}</div>`, sub: i === frames.length - 1 ? summary : '' }; });
}
const PROMPT = '先預測結果，再一步一步前進。觀察三件事：① 哪些元素被檢查或搬移？② 每一輪維持了什麼不變量？③ 輸入放大為 n 時，步數如何成長？';
const PROMPTS = { memory: '先猜：依序讀完整個陣列，會有幾次快取未命中？換成鏈結串列又是幾次？', choose: '先猜：這個情境該選哪一種資料結構？寫下理由，再看估計成本是否支持你的直覺。', stack: '先猜：同一串資料放進 Stack 和 Queue 再全部取出，兩邊的取出順序各是什麼？' };
Object.keys(TITLES).forEach(type => CSLab.frameLab(type, { title: TITLES[type], prompt: PROMPTS[type] || PROMPT, inputs: inputsFor(type), frames: v => toFrames(type, v) }));
CSLab.sim.dsa = { generate, toFrames, inputsFor, chooseEval, makeFrames };
})();
