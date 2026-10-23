/* OS LAB advanced step-by-step experiments. They are models, not Linux kernel. */
'use strict';
(function(){
 const h=CSLab.ui.h;
 const f=(label,desc,visual,sub)=>({label,desc,visual,sub});
 const chips=(...texts)=>'<div class="row wrap">'+texts.map(t=>'<span class="tag">'+h(t)+'</span>').join('')+'</div>';
 const grid=(rows)=>'<div class="nx-scroll"><table class="nx-table"><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+h(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 const labs={
 'os-boot':{title:'OS 啟動階段與故障診斷',prompt:'韌體、Bootloader、Kernel 和 PID 1 的責任在哪裡交接？',
 inputs:[['failure','故障位置','select','none',[['none','正常開機'],['firmware','未找到啟動項'],['root','無法掛載 root filesystem'],['init','PID 1 啟動失敗']]],['efi','啟動類型','select','uefi',[['uefi','UEFI'],['legacy','傳統 BIOS 教學模式']]]],
 frames(v){const stages=[['Firmware','執行裝置初始化並選擇 boot path'],['Bootloader / EFI Stub','載入 kernel image 與必要初始映像'],['Kernel early init','記憶體、排程器與基本驅動初始化'],['Root Filesystem','載入 root 裝置與檔案系統'],['PID 1','啟動第一個 userspace service manager']];const errors={firmware:0,root:3,init:4};return stages.map((r,i)=>f(r[0],r[1]+(errors[v.failure]===i?'；此處故障，中止後續 stages。':''),chips('模式：'+v.efi,'階段 '+(i+1)+' / 5',errors[v.failure]===i?'❌ FAIL':errors[v.failure]!==undefined&&i>errors[v.failure]?'尚未執行':'✓ 檢查完成'),'真實 boot chain 會依 OS/硬體與開機設定不同'));}},
 'os-ipc':{title:'Pipe 的 EOF、繼承與關閉',prompt:'如果父子皆保留寫入端，讀取者何時能看到 EOF？',
 inputs:[['writers','仍開啟的 writer 數','number',1,[0,3,1]],['bytes','Pipe buffer 剩餘資料 bytes','number',4,[0,64,1]],['read','下次 read 請求 bytes','number',8,[1,64,1]],['mode','讀取模式','select','block',[['block','Blocking'],['nonblock','Nonblocking']]]],
 frames(v){const w=+v.writers,b=+v.bytes,n=+v.read,take=Math.min(b,n),end=b===0&&w===0,again=b===0&&w>0&&v.mode==='nonblock';return[
 f('建立 Pipe 與繼承','fork 之後每個仍開啟的 write fd 都可能讓 EOF 延後。',chips('write 端：'+w,'buffer：'+b+' bytes')),
 f('read() 呼叫','Pipe 為 byte stream，read 可以取回少於 n 的資料。',chips('請求：'+n,'返回：'+(b?take:end?'0 (EOF)':again?'-1 (EAGAIN)':'等待/阻塞'))),
 f('哪些情況得到 EOF','所有 writers 都關閉，且 pipe 緩衝內剩餘資料已讀取完。',grid([['writer count',w],['buffer before read',b],['此次讀取 bytes',take],['本次結果',b?take:end?'EOF':again?'EAGAIN':'BLOCK']])),
 f('實務驗證','請測試仍留有 writer 的空 Pipe、所有 writer 關閉但仍有 bytes 的 Pipe。',chips('要檢查每個 fork 後的 close()','要處理 EINTR / partial I/O'))];}},
 'os-condvar':{title:'Condition Variable 正確等待',prompt:'醒來是否可以跳過 predicate 檢查？',
 inputs:[['ready','醒來時 shared predicate','select','no',[['no','False'],['yes','True']]],['wake','醒來原因','select','signal',[['signal','signal/broadcast'],['spurious','spurious wakeup']]],['check','等待條件檢查','select','while',[['while','while (!ready)'],['if','if (!ready)，錯誤示範']]]],
 frames(v){const ok=v.ready==='yes',wrong=v.check==='if'&&!ok;return [
 f('定義共享狀態','Condition Variable 是通知，真正資料狀態由 mutex 保護的 predicate 定義。',chips('ready='+ok,'檢查：'+v.check)),
 f('原子釋鎖並等待','pthread_cond_wait 會原子釋放 mutex/睡眠，返回前重新取得 mutex。',chips('wake='+v.wake)),
 f('返回後再次檢查','即使收到 signal 也無法保證 shared predicate 持續成立。',chips(ok?'條件滿足':'條件未滿足',wrong?'if 錯誤通過':'while 會重新等待')),
 f('不變量與結果',wrong?'錯誤：僅以 if 驗證，醒來後直接操作可能違反條件。':ok?'可以進入受條件保護的操作。':'繼續 wait，直到 predicate 為真。',chips('mutex + predicate + while','spurious wakeup 不是資源可用的證明'))];}},
 'os-cow':{title:'Copy-on-Write：父子映射分離',prompt:'fork 後父子修改相同虛擬位址，對方是否能看到？',
 inputs:[['mode','映射方式','select','private',[['private','MAP_PRIVATE'],['shared','MAP_SHARED']]],['write','寫入者','select','child',[['child','子行程'],['parent','父行程']]],['initial','原本資料','number',5,[0,99,1]],['changed','新資料','number',9,[0,99,1]]],
 frames(v){const old=+v.initial,newer=+v.changed,shared=v.mode==='shared';let parent=v.write==='parent'?newer:shared?newer:old,child=v.write==='child'?newer:shared?newer:old;return [
 f('fork 前的地址映射','單一 page 保存起始值；父子後續在邏輯上可能映射同一物理頁。',chips('value：'+old,'Mapping：'+v.mode)),
 f('fork 後的兩個視角','每個 process 具有獨立虛擬位址空間，私有映射可先共享 backing frame。',grid([['Process','目前值'],['Parent',old],['Child',old]])),
 f('某方執行 write',shared?'MAP_SHARED 的寫入對另一個映射者可見。':'合法 MAP_PRIVATE 寫入造成 COW；寫入者取得私有 frame（模型假設）。',chips('writer='+v.write,'new value='+newer)),
 f('再次讀取及驗證','比較最後父子看到的資料，切換 MAP_SHARED / MAP_PRIVATE 觀察差異。',grid([['Process','最後值'],['Parent',parent],['Child',child]]))];}},
 'os-clock':{title:'Clock Page Replacement 第二次機會',prompt:'Reference bit=1 的 frame 在 hand 到達時會立刻被換出嗎？',
 inputs:[['bits','R bits 模式','select','110',[['110','1 1 0'],['111','1 1 1'],['000','0 0 0'],['101','1 0 1']]],['hand','起始 hand','number',0,[0,2,1]],['page','新 page number','number',4,[0,99,1]]],
 frames(v){
   const bits=v.bits.split('').map(Number), output=[], start=+v.hand;
   output.push(f('初始化','三個頁框已滿，現在從 hand 指向的位置尋找 victim。',chips('bits='+bits.join(''),'hand='+start)));
   let hand=start;
   for(let step=0;step<7;step++){
     if(bits[hand]===0){
       output.push(f('選定 Victim','找到 reference bit = 0 的 frame，可以在該位置載入新頁面。',chips('victim='+hand,'incoming page='+v.page)));
       return output;
     }
     bits[hand]=0;
     output.push(f('給第二次機會','R=1 → 清為 0，hand 繼續掃描下一個 frame。',chips('cleared frame='+hand,'R bits='+bits.join(''))));
     hand=(hand+1)%3;
   }
   return output;
 }},
 'os-journal':{title:'Journaling 與 Crash Recovery',prompt:'斷電發生在 transaction commit 前後，恢復時應如何處理？',
 inputs:[['crash','Crash 時機','select','after_commit',[['before_log','寫日誌前'],['after_log','日誌尚未 commit'],['after_commit','Commit 已持久'],['after_apply','寫回主資料後']]],['old','原值','number',100,[0,999,1]],['new','交易值','number',150,[0,999,1]]],
 frames(v){const commit=['after_commit','after_apply'].includes(v.crash),recovered=commit?+v.new:+v.old;return [
 f('初始狀態','主資料值為 old。Journal 使用交易記錄描述欲變更的值。',chips('old='+v.old,'new='+v.new)),
 f('記錄交易到日誌','Write-ahead log 在寫入主資料前先準備可恢復的資訊；此模型要求 commit marker durable 才算提交。',chips('crash='+v.crash)),
 f('模擬斷電','在指定階段切斷電源：已完成 commit 的交易可 replay，未提交交易不被接受。',chips(commit?'已持久提交':'尚未提交')),
 f('重新啟動與 Recovery','遵守本模型假設時，恢復值為 '+recovered+'。真實 FS 具更細緻的 ordering/data mode。',chips('Recovery value='+recovered,'已提交？'+commit))];}},
 'os-epoll':{title:'Epoll LT/ET 與非阻塞 Drain',prompt:'收到一次 readiness notification，若只讀一部分資料，之後會怎麼樣？',
 inputs:[['mode','通知模式','select','et',[['et','Edge-triggered'],['lt','Level-triggered']]],['pending','Buffer bytes','number',100,[0,200,10]],['read','首次讀取 bytes','number',30,[0,200,10]],['newdata','之後是否有新資料到達','select','no',[['no','沒有'],['yes','有（+10 bytes）']]]],
 frames(v){const b=+v.pending,n=Math.min(b,+v.read),rem=b-n,again=v.mode==='lt'?rem>0:(v.newdata==='yes'&&rem+10>0);return [
 f('資料到達與 readiness','fd 已設定 nonblocking；新的可讀事件使應用收到通知。',chips('buffer='+b,'mode='+v.mode)),
 f('第一次 read','讀取者最多消耗 '+v.read+' bytes，剩下 '+rem+' bytes。',chips('read='+n,'remain='+rem)),
 f('是否重複通知','LT：若仍 ready 會再回報；ET：沒有新 edge 時不能保證再次通知，必須讀到 EAGAIN。',chips(again?'後續可再通知（教學假設）':'不保證新通知','remain='+rem)),
 f('應用端正確性','對 ET 應持續非阻塞 read 至 EAGAIN，並處理負載不足的 backpressure。',chips('drain remaining='+rem,'下一輪新資料='+v.newdata))];}},
 'os-observe':{title:'Linux 效能診斷與證據鏈',prompt:'CPU 使用率低但 p99 很高時，如何避免錯誤判定？',
 inputs:[['symptom','主要觀察','select','latency',[['latency','p99 high; CPU low'],['memory','Major faults high'],['cpu','CPU throttle elevated'],['io','I/O latency high']]],['tool','已使用的工具','select','top',[['top','top'],['strace','strace'],['perf','perf'],['cgroup','cgroup cpu.stat']]]],
 frames(v){const triage={latency:['queue/lock/remote I/O','pidstat + tracing + latency split'],memory:['memory pressure + backing I/O','vmstat + /proc + major fault counters'],cpu:['CPU quota throttling','cgroup cpu.stat + work queue'],io:['storage queue, device or filesystem','iostat -x + disk I/O trace']}[v.symptom];return [
 f('只記錄客觀觀察','目前只有某個症狀與工具，尚未能證實根因。',chips(v.symptom,'tool='+v.tool)),
 f('提出互相競爭的假設','第一個可驗證假設：'+triage[0]+'；另需考慮 workload 或時間同步差異。',chips('假設，而非結論')),
 f('下一個獨立證據','建議追查：'+triage[1]+'，並在相同負載下測量 baseline 與異常。',chips('避免單一指標武斷歸因')),
 f('設計回歸驗證','只改一項因素，再對照 p95/p99、吞吐與錯誤率；列出觀測工具本身的 overhead。',chips('觀測 → 假設 → 實測 → 反證'))];}}
 };
 for(const [name,spec] of Object.entries(labs))CSLab.frameLab(name,spec);
 CSLab.sim.osAdvanced=labs;
})();