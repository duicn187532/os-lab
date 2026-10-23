/* NET LAB 進階逐步實驗：純計算、固定輸入，不呼叫網路。 */
'use strict';
(function () {
  const h=CSLab.ui.h, F=(label,desc,visual,sub)=>({label,desc,visual,sub});
  const line=(...cells)=>'<div class="nx-row">'+cells.map(x=>'<div class="nx-cell">'+h(x)+'</div>').join('')+'</div>';
  const table=(cols,rows)=>'<div class="nx-scroll"><table class="nx-table"><thead><tr>'+cols.map(x=>'<th>'+h(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+h(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  const LABS={
    'net-bgp':{
      title:'BGP 政策路由決策',prompt:'先猜：較高 LOCAL_PREF 和較短 AS_PATH 衝突時，哪條路會獲選？',
      inputs:[['local','本地 AS','select','65001',[['65001','65001'],['65010','65010'],['65030','65030']]],['prefA','A 路徑的 LOCAL_PREF','number',200,[0,500,10]],['prefB','B 路徑的 LOCAL_PREF','number',100,[0,500,10]],['reachA','A 的 NEXT_HOP','select','yes',[['yes','可達'],['no','不可達']]]],
      frames(v){
        const local=+v.local, entries=[{id:'A',pref:+v.prefA,path:[65010,65020],ok:v.reachA==='yes'},{id:'B',pref:+v.prefB,path:[65030],ok:true}];
        const valid=entries.filter(r=>r.ok&&!r.path.includes(local));
        const sorted=valid.slice().sort((a,b)=>b.pref-a.pref||a.path.length-b.path.length||a.id.localeCompare(b.id));
        const win=sorted[0]||null;
        return [
          F('取得 BGP 前綴候選','兩條路線都宣告到同一網段；此實驗只示範有限的選路政策。',table(['候選','LOCAL_PREF','AS_PATH','下一跳'],entries.map(r=>[r.id,r.pref,r.path.join(' '),r.ok?'可達':'不可達']))),
          F('排除不可達與本地 AS 迴圈','先剔除不可達 NEXT_HOP，或 AS_PATH 含自己自治系統號碼的候選。',table(['候選','是否保留','原因'],entries.map(r=>[r.id,r.ok&&!r.path.includes(local)?'保留':'排除',!r.ok?'下一跳不可達':r.path.includes(local)?'AS_PATH 含本地 AS':'符合資格']))),
          F('依政策排序','僅對合法候選比較較高 LOCAL_PREF，再比較較短 AS_PATH；實際 BGP 會有更多步驟。',table(['優先序','候選','LOCAL_PREF','AS_PATH 長度'],sorted.map((r,i)=>[i+1,r.id,r.pref,r.path.length]))),
          F('選出出口','本次簡化選路結果：'+(win?'路徑 '+win.id:'無可用路由')+'。政策選路不能等同最低 RTT。',line('結果：'+(win?win.id:'DROP'),'本地 AS：'+local))
        ];
      }
    },
    'net-wifi':{
      title:'Wi-Fi 競爭視窗與隱藏節點',prompt:'A 與 C 聽不到彼此，若兩者選到相同退避槽會發生什麼？',
      inputs:[['a','站點 A 退避槽','number',2,[0,15,1]],['c','站點 C 退避槽','number',2,[0,15,1]],['rts','RTS/CTS','select','off',[['off','關閉'],['on','開啟（理想化協調）']]]],
      frames(v){
        const same=+v.a===+v.c,control=v.rts==='on';
        return [
          F('拓樸與感測','A 和 C 都能傳給 B，但互相聽不到；這是隱藏節點的基本條件。',line('A → B ← C','A 與 C 無法彼此感測')),
          F('選取退避時槽','本實驗只比較同一回合的初始退避，不模擬 PHY、IFS、凍結與重試細節。',table(['站點','退避槽'],[['A',v.a],['C',v.c]])),
          F('媒介競爭結果',same?(control?'初始控制訊框仍可能碰撞，RTS/CTS 並非完全消除碰撞。':'兩站同時嘗試傳送，接收端 B 可能產生碰撞。'):'較少退避時槽的站點先獲得傳送機會，另一站的實際等待視感測與後續忙碌而定。',line(same?'同槽競爭':'優先：'+(+v.a<+v.c?'A':'C'),control?'有控制訊框開銷':'無 RTS/CTS 開銷')),
          F('設計上的取捨',control?'RTS/CTS 可能在大資料框或隱藏節點環境降低重傳代價，但額外增加控制時序。':'省下 RTS/CTS 控制成本，但在隱藏節點環境仍可能增加資料碰撞。',line('不代表實際 Wi-Fi 吞吐量','真實系統涉及 EDCA、NAV 與干擾'))
        ];
      }
    },
    'net-quic':{
      title:'QUIC 雙層流量控制',prompt:'某 stream 還有空間，是否一定可以繼續接收資料？',
      inputs:[['conn','MAX_DATA','number',2000,[100,10000,100]],['limitA','A 的 MAX_STREAM_DATA','number',1500,[100,10000,100]],['recvA','A 已收到新資料量','number',1200,[0,10000,100]],['recvB','B 已收到新資料量','number',600,[0,10000,100]],['next','下一批 A 資料位元組','number',300,[1,4000,100]]],
      frames(v){
        const [conn,limit,a,b,n]=[+v.conn,+v.limitA,+v.recvA,+v.recvB,+v.next], nextA=a+n, nextTotal=a+b+n;
        const streamOK=nextA<=limit,connectionOK=nextTotal<=conn;
        const initialOK=a<=limit&&a+b<=conn,accepted=initialOK&&streamOK&&connectionOK;
        return [
          F('檢查目前狀態','假設資料從各 stream offset 0 起連續到達，且沒有重複 bytes。',table(['設定','目前'],[['MAX_DATA',conn],['MAX_STREAM_DATA(A)',limit],['A 已收到',a],['B 已收到',b]])),
          F('預測 A 的新 offset','stream A 的資料總 offset 不得超過自己的 MAX_STREAM_DATA。',line('A 新 offset：'+nextA,'Stream 限制：'+limit,streamOK?'符合':'超出')),
          F('檢查 connection 總額','兩個 stream 的不重複已接收位元組總計不得超出 MAX_DATA。',line('連線新總量：'+nextTotal,'連線限制：'+conn,connectionOK?'符合':'超出')),
          F('結果與診斷',!initialOK?'初始狀態已違反本實驗的接收限制，請調整參數。':accepted?'本批資料在兩層 flow control 下允許接收。':!streamOK?'本批資料受 stream-level flow control 限制。':'本批資料受 connection-level flow control 限制。',line(accepted?'ALLOW':'BLOCK','注意：此模型未模擬 congestion window'))
        ];
      }
    },
    'net-ipv6':{
      title:'IPv6 Path MTU 與 ICMPv6',prompt:'IPv6 路由器遇到超過下一跳 MTU 的封包，是自行分段還是回報來源？',
      inputs:[['mtu','路徑 MTU（bytes）','number',1280,[1280,9000,1]],['ext','擴充標頭（bytes）','number',0,[0,256,8]],['payload','UDP Payload（bytes）','number',1250,[0,9000,1]],['ptb','Packet Too Big 可達來源','select','yes',[['yes','可達'],['no','遭防火牆攔截']]]],
      frames(v){
        const [mtu,ext,payload]=[+v.mtu,+v.ext,+v.payload], header=40+ext+8,total=header+payload,max=Math.max(0,mtu-header),oversize=total>mtu;
        return [
          F('建立 IPv6 資料包','假設單一 IPv6 固定標頭、選定擴充標頭及 UDP；忽略其他封裝。',table(['欄位','長度 bytes'],[['IPv6 固定標頭',40],['擴充標頭',ext],['UDP 標頭',8],['UDP 資料',payload],['合計',total]])),
          F('比較下一跳 MTU','路由器不得在轉送途中分段。',line('總長：'+total,'PMTU：'+mtu,total<=mtu?'可轉送':'超過 MTU')),
          F('來源如何恢復',oversize?(v.ptb==='yes'?'路由器丟棄並回傳 ICMPv6 Packet Too Big，讓來源調整資料量。':'路由器丟棄；若 Packet Too Big 被攔截，來源可能持續送出過大的封包，形成 PMTU black hole。'):'封包長度未超過本路徑 MTU，不必因本次 MTU 限制分段。',line('建議單一 UDP payload 上限：'+max+' bytes',oversize?'需來源調整':'無需調整')),
          F('與 IPv4 不同','IPv6 不用 ARP；路由器也不會替來源分段。NDP/RA/PMTU 的 ICMPv6 不應一律封鎖。',line('總長 '+total,'可直接轉送 '+(oversize?'否':'是')))
        ];
      }
    },
    'net-cloud':{
      title:'雲端三層網路排錯',prompt:'路由、入站規則與回程缺哪一項會導致連線失敗？',
      inputs:[['fault','故障注入','select','none',[['none','無故障'],['lb','LB→App 安全規則拒絕'],['db','App→DB 安全規則拒絕'],['return','回程路由不正確']]],['entry','外網入口','select','443',[['443','HTTPS 443'],['80','HTTP 80（未允許）']]]],
      frames(v){
        const edge=[['Internet','LB:443',v.entry==='443'],['LB','App:8080',v.fault!=='lb'],['App','DB:5432',v.fault!=='db'],['DB','回程',v.fault!=='return']];
        const first=edge.find(x=>!x[2]);
        return [
          F('辨識三層架構','示範 Web / App / DB，假定入口 LB 只開 443，App 和 DB 均沒有公網直連位址。',line('Internet → LB','LB → App:8080','App → DB:5432')),
          F('檢查正向流量','路由表決定路徑，安全規則決定是否允許；全部要通過。',table(['來源','目標','狀態'],edge.slice(0,3).map(e=>[e[0],e[1],e[2]?'允許':'拒絕']))),
          F('檢查回程','有狀態安全群組可能自動允許已建立流量的回覆，但仍必須有回程可達性。',line('回程：'+(edge[3][2]?'可達':'錯誤'),'模式：示意，不代表特定雲端')),
          F('診斷結果',first?'連線失敗，第一個需調查的環節：'+first[0]+'→'+first[1]+'。':'模擬路徑可達；實務仍要確認服務監聽、TLS 和健康檢查。',line(first?'BLOCK':'PASS','不要把 NAT 與防火牆混為一談'))
        ];
      }
    },
    'net-diagnose':{
      title:'分層故障診斷與證據鏈',prompt:'只依一個症狀下結論容易誤判；請先預測下一步該收集哪個證據。',
      inputs:[['symptom','觀察到的症狀','select','dns',[['dns','DNS NXDOMAIN'],['syn','TCP SYN 重送且無回應'],['tls','TLS 憑證名稱不符'],['http','HTTP 503'],['pmtu','小封包可用、大封包失敗']]],['capture','證據位置','select','client',[['client','僅客戶端'],['both','兩端皆可抓包']]]],
      frames(v){
        const facts={
          dns:['DNS 層回覆 NXDOMAIN','名稱打錯、解析器快取或權威資料問題','查詢權威 DNS 與指定 resolver；核對正確名稱'],
          syn:['有 SYN 重傳、沒有看見 SYN-ACK','請求/回覆丟失、路由或防火牆問題','從服務端擷取封包並檢查監聽與路由'],
          tls:['TCP 連線成功，TLS 驗證失敗','SAN/hostname 不符或代理指向錯誤','檢查憑證 SAN、請求主機名稱、信任鏈'],
          http:['收到 HTTP 503 Service Unavailable','代理無健康後端、服務過載或暫停','對照代理和後端健康檢查、請求追蹤'],
          pmtu:['小請求成功但大傳輸逾時','PMTU black hole、封裝 MTU 或其他路徑問題','觀察 ICMP Packet Too Big 與 DF / MTU 探測']
        };
        const [obs,hyp,verify]=facts[v.symptom];
        return [
          F('記錄客觀觀察','不要在觀察欄直接寫出「一定是某設備故障」。',line(obs,'抓包位置：'+(v.capture==='both'?'雙端':'僅客戶端'))),
          F('提出可反駁的假設','同一症狀可能來自數種因素，需明確標註「可能」。',line('合理假設：'+hyp)),
          F('尋找下一個獨立訊號','應採取能區分不同假設的測試，而不是只重試相同操作。',line('下一步：'+verify)),
          F('寫出結論的證據限制',v.capture==='client'?'單端觀測不能證明目標確實收到或回覆封包；建議取得服務端或中間設備資訊。':'雙端抓包可大幅縮小丟包範圍，但須留意時間同步、NIC offload 和抓包遺失。',line('觀察 → 假設 → 驗證','不要永久關閉 TLS 驗證'))
        ];
      }
    }
  };
  for(const [id,spec] of Object.entries(LABS)) CSLab.frameLab(id,spec);
  if(CSLab.sim && CSLab.sim.net && CSLab.sim.net.LABS) Object.assign(CSLab.sim.net.LABS,LABS);
})();
