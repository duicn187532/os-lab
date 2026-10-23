# NET LAB：資工系教材深化版

> 設計目標：從「能閱讀觀念」提升到「能推導協定、分析反例、設計實驗，並用程式驗證」。教材以繁體中文原創敘述，並非重製任何教科書。部署環境為 GitHub Pages，所有沙盒程式題均在使用者瀏覽器中執行。

## 課程結構與學習負荷

- 原有 22 章 ID 0–21 **完全保留**；原章的學習進度、筆記、錯題與程式碼草稿仍用既有穩定 ID。
- 新增第 23–28 章（內部 ID 22–27）：**BGP、Wi-Fi、QUIC/HTTP/3、IPv6/NDP/SLAAC、雲端 VPC/LB/NAT、網路故障診斷**。
- 原 22 章的每章 `details` 新增 L2 理論與 L3 可驗證研討題；新增 6 章各有至少六個深入主題、學習目標、案例、逐步操作、四題測驗、術語、程式示例及互動實驗。
- 新增 6 個逐步實驗與 6 個可在 C11/C++17/Python/JavaScript 執行的 Judge 題（含公開/隱藏測資、提示、解析、起始程式）；內容沿用既有的完整沙盒架構。
- 課程時間標示為閱讀估計，**不包含**完成數學推導、程式挑戰與外部實測的時間。

## 教學能力分級

| 層級 | 應有能力 | 典型成果 |
| --- | --- | --- |
| L1 概念 | 能解釋協定解決的問題、主要流程與術語 | 原理閱讀與基本測驗 |
| L2 原理 | 能推導公式、狀態與限制，解釋反例與設計取捨 | 計算過程、狀態轉移表、協定欄位追蹤 |
| L3 驗證 | 能提出可反駁假設、設計測試、使用真實或教學資料判斷 | 模擬器紀錄、程式解題、PCAP 分析報告 |

**達成定義建議：** L1 正確作答至少 80%；L2 提交推導與邊界分析；L3 能提出可重現的測試、給出輸入與期待結果，並解釋模型與現實落差。此為教學建議，網頁目前仍沿用原本「完成測驗」的進度規則，尚未將掌握度評分硬性綁定到進度。

## 新增章節教材重點

### 第 23 章｜BGP 與 AS 政策

- IGP/EGP 的作用不同；BGP 的 NLRI、eBGP/iBGP、NEXT_HOP、LOCAL_PREF、AS_PATH、RIB 概念與路由洩漏。
- **推導：**明訂教學選路：先拒絕迴圈和不可達 NEXT_HOP → 較高 LOCAL_PREF → 較短 AS_PATH。須明確說明它**不是**真實 BGP 完整決策程序。
- **L3：**遇到 RTT 較低卻沒被選的路由時，用匯入/匯出政策與控制平面證據解釋原因。
- 實驗：調整本地 AS、路徑可達性與偏好值，逐步觀察過濾、比較及選路。
- 程式題：寫出簡化政策決策器，處理路徑過濾與同分。

### 第 24 章｜Wi-Fi 802.11

- CSMA/CD 與 CSMA/CA、DCF 退避、busy 時凍結、Hidden Terminal、RTS/CTS、AP/BSS、MCS 與 PHY/MAC 分工。
- **推導：**以固定退避槽比較隱藏節點碰撞與控制訊框的必要性。
- **L3：**記錄實驗拓樸與 RSSI/吞吐/重傳率，區分媒介競爭模型與實際無線通道因素。
- 實驗：模擬 A→B←C 的競爭；明示忽略 IFS、EDCA、PHY、重試。
- 程式題：計算抽象退避回合的先後或碰撞。

### 第 25 章｜QUIC 與 HTTP/3

- UDP 承載、TLS 1.3、Stream 和 Connection flow control、ACK range、重新封裝的重傳、多串流及 0-RTT 重放風險。
- **推導：**同時約束 `MAX_STREAM_DATA`、`MAX_DATA`，並辨別與擁塞控制的差異。
- **L3：**比較在遺失情境下 HTTP/2/TCP 與 HTTP/3/QUIC 的跨 stream Head-of-Line Blocking；使用固定 RTT/丟包率測試。
- 實驗：設定兩層上限與已接收資料，逐步驗證是否可接受下一批資料。
- 程式題：判斷初始狀態與 STREAM/CONNECTION blocked。

### 第 26 章｜IPv6/NDP/SLAAC/PMTU

- Link-local、RA/RS、NS/NA、DAD、NDP、ICMPv6 Packet Too Big 與來源端 PMTU。
- **推導：**不含其他封裝時，單一不分段 UDP Payload 上限為 `PMTU − 40 − 8 − IPv6 擴充標頭長度`，若小於零則此模型無法容納資料。
- **L3：**模擬 ICMPv6 被防火牆阻擋的 PMTU Black Hole，說明來源端與中間路由器的角色。
- 程式題：檢查 UDP payload 是否超過單包限制。

### 第 27 章｜雲端與企業網路

- VPC/VNet、CIDR、路由、NAT、Security Group/ACL、L4/L7 LB、TLS 終結、回程流量。
- **L2：**對正向路由、防火牆、服務監聽與回程路由分別驗證。
- **L3：**從 Internet→LB→App→DB 畫出最小權限流量矩陣並驗證失敗情境。
- 程式題：按優先順序找出第一個拒絕的環節。

### 第 28 章｜網路故障診斷

- DNS、TCP、TLS、HTTP、PMTU 五層診斷；Wireshark/tcpdump/curl/dig 的角色及觀測侷限。
- **L2：**SYN timeout、RST、Certificate SAN 錯誤、HTTP 503 與封包重傳的不同可能原因。
- **L3：**用「觀察→假設→下一項證據→驗證→回歸」撰寫診斷報告。
- 程式題：根據觀察選擇合理的下一個取證類別，而非武斷判定根因。

## 資工系研討與作業規範

每章的 L3 題可用下列紀錄格式提交：

1. **問題與前提：**假設採何種協定版本、MTU、RTT、拓樸、標頭長度及簡化條件。
2. **模型與推導：**先寫狀態轉移、公式、單位與適用界限，避免只有結果數值。
3. **操作與結果：**記錄輸入、模擬器參數、程式版本、實際輸出與可能誤差。
4. **反例與限制：**找至少一個會讓簡化模型失效的情境。
5. **工程意義：**若部署於真實網路，需哪些其他指標、設備配置或封包證據。

### 範例：TCP/QUIC 比較

命題：「HTTP/3 一定比 HTTP/2 快」不是可以直接接受的結論。控制變因為伺服器、檔案大小、RTT、丟包率、網路位置與快取狀態；比較無丟失、單 stream 遺失與不同 stream 遺失。在報告中拆開握手延遲、資料交付、壅塞控制與應用層等待，才能解釋觀察到的差異。

## 參考標準（原文可供進階查證）

- BGP-4: [RFC 4271](https://www.rfc-editor.org/rfc/rfc4271)
- BGP RPKI Origin Validation: [RFC 6811](https://www.rfc-editor.org/rfc/rfc6811)
- IEEE Wi-Fi MAC/PHY: [IEEE 802.11-2024](https://standards.ieee.org/ieee/802.11/10548/)
- QUIC Transport: [RFC 9000](https://www.rfc-editor.org/rfc/rfc9000)
- QUIC/TLS: [RFC 9001](https://www.rfc-editor.org/rfc/rfc9001)
- HTTP/3: [RFC 9114](https://www.rfc-editor.org/rfc/rfc9114)
- IPv6 Specification: [RFC 8200](https://www.rfc-editor.org/rfc/rfc8200)
- IPv6 Neighbor Discovery: [RFC 4861](https://www.rfc-editor.org/rfc/rfc4861)
- IPv6 SLAAC: [RFC 4862](https://www.rfc-editor.org/rfc/rfc4862)
- Wireshark 使用文件：[User's Guide](https://www.wireshark.org/docs/wsug_html_chunked/)

上述標準用於定義術語與協定邊界。網站的所有模擬均是**為學習而設計的簡化模型**，不是 RFC/IEEE 標準堆疊、商用網路測試器、雲端可部署模板或真實無線射頻模擬。

## 檔案和相容性

| 檔案 | 作用 |
| --- | --- |
| `net/assets/advanced-content.js` | 既有 22 章 L2/L3 加深、6 章新教材、公式與術語 |
| `net/assets/advanced-labs.js` | 6 種新的互動步驟實驗 |
| `net/assets/advanced-code.js` | 6 道四語言可判題的程式任務 |
| `net/index.html` | 在原有模組載入順序的正確位置載入上述內容 |
| `tests/net-textbook-review.cjs` | Node 無瀏覽器靜態教材完整性與進階實驗測試 |
| `tests/net-review.cjs` | 擴充既有 Playwright 測試至新增章節 |

舊的 `net.progress` key、舊章節 ID 與既有程式題 ID 不變。新增章節採 22–27 的穩定 ID。

## 驗證

在 repo 根目錄：

```sh
node tests/net-textbook-review.cjs
```

進行瀏覽器回歸測試時，需先安裝既有測試相依（如 Playwright）並啟動 `tests/poc-server.cjs` 提供的本機站點，再執行：

```sh
node tests/net-review.cjs
```

**驗證狀態注意：**這次新增內容已執行原始碼載入、章節欄位、進階實驗步驟與新增程式題資料的靜態核對。遠端環境未取得可直接執行 Chromium/Playwright 的瀏覽器，因此瀏覽器回歸、所有四語言編譯與 GitHub Pages 實際展示仍需於合併前依既有 CI 或本機測試確認。
