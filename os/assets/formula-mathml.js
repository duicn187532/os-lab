/* Native MathML equivalents for every OS formula, with explicit symbol/units.
 * Mathematical markup is markup, not code-font approximation.
 */
'use strict';
(function(){
const D=window.OS_DATA;
const e=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const mi=x=>'<mi>'+e(x)+'</mi>',mn=x=>'<mn>'+e(x)+'</mn>',mo=x=>'<mo>'+e(x)+'</mo>',mt=x=>'<mtext>'+e(x)+'</mtext>';
const row=(...parts)=>'<mrow>'+parts.join('')+'</mrow>';
const sub=(x,y)=>'<msub>'+x+y+'</msub>',sup=(x,y)=>'<msup>'+x+y+'</msup>';
const frac=(x,y)=>'<mfrac>'+x+y+'</mfrac>',msqrt=x=>'<msqrt>'+x+'</msqrt>';
const eq=(left,right)=>row(left,mo('='),right);
const math=body=>'<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">'+body+'</math>';
const f={
'周轉時間':[eq(mi('TAT'),row(mi('CT'),mo('−'),mi('AT'))),'TAT、CT、AT 單位皆為時間；分別為周轉、完成時刻與到達時刻'],
'等待時間':[eq(mi('WT'),row(mi('TAT'),mo('−'),mi('BT'))),'WT=等待、TAT=周轉、BT=CPU burst；適用無 I/O 的單一 burst 模型'],
'回應時間':[eq(mi('RT'),row(sub(mi('t'),mt('首次執行')),mo('−'),mi('AT'))),'RT=首次獲得 CPU 的時刻與到達時刻之差'],
'平均等待時間':[eq(sub(mi('WT'),mi('avg')),frac(row(mo('∑'),sub(mi('WT'),mi('i'))),mi('n'))),'n=工作數；WT_i=第 i 筆等待時間；各工作都必須納入'],
'CPU 使用率':[eq(mi('U'),row(frac(mt('CPU 忙碌時間'),mt('總觀測時間')),mo('×'),mn(100),mo('%'))),'U=CPU 忙碌比例；同一核心及同一觀測窗口'],
'offset 位元數':[eq(mi('k'),row(sub(mi('log'),mn(2)),mo('('),mi('P'),mo(')'))),'P=page size（bytes），需為 2 的冪；k=offset 位元數'],
'VPN 與 offset':[row(eq(mi('VPN'),row(mo('⌊'),frac(mi('VA'),mi('P')),mo('⌋'))),mo(','),eq(mi('offset'),row(mi('VA'),mo('mod'),mi('P')))),'VA=虛擬地址(bytes)；P=頁大小(bytes)；VPN=虛擬頁號'],
'實體位址':[eq(mi('PA'),row(mi('PFN'),mo('×'),mi('P'),mo('+'),mi('offset'))),'PFN=實體頁框號；P=page size(bytes)；PA=實體地址(bytes)'],
'頁表大小':[eq(sub(mi('S'),mi('PT')),row(sup(mn(2),row(mi('v'),mo('−'),mi('k'))),mo('×'),mi('s'))),'v=VA bits；k=offset bits；s=每筆 PTE bytes，假設展開單層頁表'],
'TLB 有效存取時間':[eq(mi('EAT'),row(mi('α'),mo('×'),row(mi('t'),mo('+'),mi('m')),mo('+'),row(mn(1),mo('−'),mi('α')),mo('×'),row(mi('t'),mo('+'),mn(2),mi('m')))),'α=TLB hit probability；t=TLB 查詢；m=memory access latency；單層頁表模型'],
'含缺頁的存取時間':[eq(mi('EAT'),row(row(mn(1),mo('−'),mi('p')),mo('×'),mi('m'),mo('+'),mi('p'),mo('×'),mi('F'))),'p=缺頁率；m=正常存取時間；F=一次 page fault 的完整處理時間'],
'銀行家：剩餘需求':[eq(sub(mi('Need'),mi('i')),row(sub(mi('Max'),mi('i')),mo('−'),sub(mi('Allocation'),mi('i')))),'i=行程；向量內各分量代表資源種類，必須逐維相減'],
'銀行家：可前進條件':[row(sub(mi('Need'),mi('i')),mo('≤'),mi('Work'),mo('⇒'),eq(mi('Work'),row(mi('Work'),mo('+'),sub(mi('Allocation'),mi('i'))))),'逐資源判定 Need_i≤Work；Work 是可用資源向量'],
'讀寫頭總移動量':[eq(mi('D'),row(mo('∑'),mo('|'),sub(mi('c'),mi('i')),mo('−'),sub(mi('c'),row(mi('i'),mo('−'),mn(1))),mo('|'))),'c_0=讀寫頭起點；c_i=第 i 個服務柱面（tracks）'],
'磁碟存取時間':[eq(mi('T'),row(sub(mi('T'),mi('seek')),mo('+'),sub(mi('T'),mi('rotation')),mo('+'),sub(mi('T'),mi('transfer')))),'僅 HDD；seek=尋軌，rotation=旋轉等待，transfer=傳輸，均為時間'],
"Little's Law":[eq(mi('L'),row(mi('λ'),mo('×'),mi('W'))),'λ=穩態平均到達率（件/秒）；W=平均停留秒數；L=平均件數'],
'使用率':[eq(mi('ρ'),frac(mi('λ'),mi('μ'))),'λ=平均到達率；μ=服務率，兩者需相同時間單位'],
'M/M/1 平均回應時間':[eq(mi('W'),frac(mn(1),row(mi('μ'),mo('−'),mi('λ')))),'M/M/1：λ<μ；λ=Poisson 到達率，μ=exponential 服務率（件/秒），W=平均停留秒數'],
'連續 fork':[eq(sub(mi('P'),mi('n')),sup(mn(2),mi('n'))),'n=所有 process 均成功執行的 fork 輪數；P_n 包括原始父行程'],
'Unix 權限八進位':[eq(mi('m'),row(mn(4),mi('r'),mo('+'),mn(2),mi('w'),mo('+'),mi('x'))),'m=一組八進位 digit（0..7）；r/w/x=允許旗標（0 或 1）；目錄 execute 表示穿越'],
'四級頁表位址拆分':[eq(mn(48),row(mn(9),mo('+'),mn(9),mo('+'),mn(9),mo('+'),mn(9),mo('+'),mn(12))),'單位皆為 bits；四級各 9-bit index，末 12-bit offset；僅典型 x86-64/4KiB 模型'],
'Working Set':[eq(mi('W'),row(mo('{'),mt('在視窗 Δ 內被存取之不同頁面'),mo('}'))),'Δ=時間窗口；W=近期不同 page 集合，不是數值總和'],
'Clock Second Chance':[row(mi('R'),mo('='),mn(1),mo('⇒'),mt('清零、hand 前進'),mo(';'),mi('R'),mo('='),mn(0),mo('⇒'),mt('置換')),'R=單一頁框的 reference bit；hand=循環掃描指標'],
'Pipe EOF':[eq(mi('EOF'),row(mi('empty'),mo('∧'),mi('writers'),mo('='),mn(0))),'empty=Pipe buffer 無資料；writers=全部寫入端參照數；EOF 表示 read 回傳 0'],
'cgroup CPU quota':[eq(mi('share'),frac(mi('quota'),mi('period'))),'quota/period 均為 μs，share 為單 CPU 等價數；可能大於 1'],
'SSD IOPS':[eq(mi('IOPS'),frac(mt('已完成 I/O 操作數'),mt('經過秒數'))),'IOPS=次/秒；須搭配 queue depth、p99 與讀寫比例'],
'檔案替換持久化':[row(mi('write'),mo('→'),mi('fsync'),mo('→'),mi('rename'),mo('→'),mi('fsync(directory)')),'典型 POSIX 同目錄暫存檔模式；掉電保證受 FS 與硬體語意影響']
};
let changed=0;
for(const group of D.formulas)for(const entry of group.items){
 const r=f[entry.name]; if(!r)throw Error('MathML not defined for '+entry.name);
 entry.mathml=math(r[0]);entry.note=r[1];changed++;
}
if(changed!==27)throw Error('Expected 27 formulas; got '+changed);
window.OS_MATHML_COUNT=changed;
})();