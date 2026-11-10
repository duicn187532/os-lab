/* Advanced NET LAB coding challenges: one judged problem per new chapter, 4 languages. */
'use strict';
(function(){
const tasks=[
  {
    "id": "net.bgp.select",
    "lesson": 22,
    "title": "BGP 路由政策：判斷最佳候選",
    "statement": "每筆輸入 local prefA asA1 asA2 reachA prefB asB1 asB2 reachB。0 代表沒有第二段 AS_PATH；reach 是 1/0。先拒絕 NEXT_HOP 不可達或 AS_PATH 含 local AS 的候選，再依較高 LOCAL_PREF、較短路徑、同分選 A 的順序決策。此為教學政策模型，不是完整 BGP 選路順序。",
    "input": "第一行 q (1..100)，接著 q 行 9 個非負整數。",
    "output": "每行輸出 A、B 或 NONE。",
    "tags": [
      "bgp",
      "policy",
      "routing"
    ],
    "hints": [
      "先過濾含 local 的 AS_PATH 和 reach=0。",
      "比 LOCAL_PREF，然後比 AS_PATH 長度，同分選 A。"
    ],
    "explain": "BGP 可受政策選擇影響，不等於最短路徑。請先過濾合法候選再選最佳。",
    "timeLimitMs": 1000,
    "cases": [
      {
        "name": "公開：基本測資",
        "input": "3\n65001 200 65010 65020 1 100 65030 0 1\n65001 200 65001 0 1 100 65030 0 1\n65001 100 65010 0 1 100 65020 0 1\n",
        "output": "A\nB\nA\n",
        "visible": true
      },
      {
        "name": "公開：邊界測資",
        "input": "2\n65001 100 65010 0 0 200 65020 0 0\n65030 150 65010 65020 1 100 65030 0 1\n",
        "output": "NONE\nA\n",
        "visible": true
      },
      {
        "name": "隱藏：綜合測資",
        "input": "3\n65001 90 65010 0 1 100 65020 0 1\n65001 200 65030 65040 1 200 65050 0 1\n65010 10 65010 0 1 10 65010 0 1\n",
        "output": "B\nB\nNONE\n",
        "visible": false
      }
    ],
    "starter": {
      "python": "import sys\nit=iter(sys.stdin.read().split())\nq=int(next(it))\nfor _ in range(q):\n    # TODO: parse inputs and implement this chapter's protocol rule\n    print('TODO')\n",
      "javascript": "const it=readInput().trim().split(/\\s+/);\nlet i=0,q=Number(it[i++]);\nfor(let j=0;j<q;j++){\n  // TODO: parse this case and implement the protocol rule\n  console.log('TODO');\n}\n",
      "cpp": "#include <iostream>\nusing namespace std;\nint main(){int q;cin>>q;while(q--){\n  // TODO: read one case and implement the protocol rule\n  cout<<\"TODO\\n\";\n}}\n",
      "c": "#include <stdio.h>\nint main(void){int q;if(scanf(\"%d\",&q)!=1)return 0;\nwhile(q--){\n  /* TODO: read one case and implement the protocol rule */\n  puts(\"TODO\");\n}return 0;}\n"
    }
  },
  {
    "id": "net.wifi.backoff",
    "lesson": 23,
    "title": "Wi-Fi 隱藏節點：退避比較",
    "statement": "教學抽象模型：A/C 互相聽不到但都能傳到 B。若退避槽相同，輸出 COLLISION；否則數字較小者先傳。忽略通道凍結、IFS、PHY 及 RTS/CTS，此題並非完整的 802.11 DCF 模擬。",
    "input": "第一行 q，接著 q 行 a c（0..10^6）。",
    "output": "每行 A、C、COLLISION。",
    "tags": [
      "wifi",
      "backoff"
    ],
    "hints": [
      "相同槽可能碰撞。",
      "否則較小退避槽先得到機會。"
    ],
    "explain": "感測到媒介閒置也不能保證接收端沒有碰撞，尤其存在隱藏節點時。",
    "timeLimitMs": 1000,
    "cases": [
      {
        "name": "公開：基本測資",
        "input": "3\n2 2\n2 5\n9 1\n",
        "output": "COLLISION\nA\nC\n",
        "visible": true
      },
      {
        "name": "公開：邊界測資",
        "input": "3\n0 0\n0 15\n15 0\n",
        "output": "COLLISION\nA\nC\n",
        "visible": true
      },
      {
        "name": "隱藏：綜合測資",
        "input": "5\n7 8\n8 7\n15 15\n200 300\n300 200\n",
        "output": "A\nC\nCOLLISION\nA\nC\n",
        "visible": false
      }
    ],
    "starter": {
      "python": "import sys\nit=iter(sys.stdin.read().split())\nq=int(next(it))\nfor _ in range(q):\n    # TODO: parse inputs and implement this chapter's protocol rule\n    print('TODO')\n",
      "javascript": "const it=readInput().trim().split(/\\s+/);\nlet i=0,q=Number(it[i++]);\nfor(let j=0;j<q;j++){\n  // TODO: parse this case and implement the protocol rule\n  console.log('TODO');\n}\n",
      "cpp": "#include <iostream>\nusing namespace std;\nint main(){int q;cin>>q;while(q--){\n  // TODO: read one case and implement the protocol rule\n  cout<<\"TODO\\n\";\n}}\n",
      "c": "#include <stdio.h>\nint main(void){int q;if(scanf(\"%d\",&q)!=1)return 0;\nwhile(q--){\n  /* TODO: read one case and implement the protocol rule */\n  puts(\"TODO\");\n}return 0;}\n"
    }
  },
  {
    "id": "net.quic.flow",
    "lesson": 24,
    "title": "QUIC：Stream 與 Connection 流量控制",
    "statement": "每筆 maxData maxStreamA recA recB nextA；若初始 recA>maxStreamA 或 recA+recB>maxData，輸出 INVALID；否則依序檢查新 recA+nextA 是否超過 stream 限制（STREAM）、總量是否超過 connection 限制（CONNECTION），否則 ALLOW。假設資料不重複。",
    "input": "第一行 q，接著 q 行五個非負整數。",
    "output": "每行 INVALID、STREAM、CONNECTION 或 ALLOW。",
    "tags": [
      "quic",
      "flow-control"
    ],
    "hints": [
      "先驗證當前狀態。",
      "先檢查 stream 上限，再檢查 connection 上限。"
    ],
    "explain": "QUIC 的雙層 flow control 與 congestion control 不同。",
    "timeLimitMs": 1000,
    "cases": [
      {
        "name": "公開：基本測資",
        "input": "3\n2000 1500 1200 600 300\n2000 1500 1200 600 100\n3000 1500 1200 600 500\n",
        "output": "CONNECTION\nALLOW\nSTREAM\n",
        "visible": true
      },
      {
        "name": "公開：邊界測資",
        "input": "3\n1000 600 700 0 10\n1000 1000 500 600 1\n100 100 0 0 100\n",
        "output": "INVALID\nINVALID\nALLOW\n",
        "visible": true
      },
      {
        "name": "隱藏：綜合測資",
        "input": "3\n5000 1500 1200 1000 100\n2300 1600 1300 500 300\n2000 1900 1800 0 200\n",
        "output": "ALLOW\nALLOW\nSTREAM\n",
        "visible": false
      }
    ],
    "starter": {
      "python": "import sys\nit=iter(sys.stdin.read().split())\nq=int(next(it))\nfor _ in range(q):\n    # TODO: parse inputs and implement this chapter's protocol rule\n    print('TODO')\n",
      "javascript": "const it=readInput().trim().split(/\\s+/);\nlet i=0,q=Number(it[i++]);\nfor(let j=0;j<q;j++){\n  // TODO: parse this case and implement the protocol rule\n  console.log('TODO');\n}\n",
      "cpp": "#include <iostream>\nusing namespace std;\nint main(){int q;cin>>q;while(q--){\n  // TODO: read one case and implement the protocol rule\n  cout<<\"TODO\\n\";\n}}\n",
      "c": "#include <stdio.h>\nint main(void){int q;if(scanf(\"%d\",&q)!=1)return 0;\nwhile(q--){\n  /* TODO: read one case and implement the protocol rule */\n  puts(\"TODO\");\n}return 0;}\n"
    }
  },
  {
    "id": "net.ipv6.pmtu",
    "lesson": 25,
    "title": "IPv6：Path MTU 和 UDP 負載",
    "statement": "每筆輸入 mtu ext payload（單位 byte）；IPv6 固定標頭 40、UDP 8、擴充標頭 ext。若 payload<=max(0,mtu-48-ext)，輸出 OK，否則 PTB。後面接最大可用 payload。此題限制為單一未分段封包且未考慮其他封裝。",
    "input": "第一行 q，接著 q 行 mtu ext payload。",
    "output": "每行狀態與最大可用 payload，以空格隔開。",
    "tags": [
      "ipv6",
      "mtu",
      "icmpv6"
    ],
    "hints": [
      "扣掉 40+8+ext bytes 標頭。",
      "IPv6 Router 不會自行分段轉送封包。"
    ],
    "explain": "IPv6 需要來源使用 Path MTU discovery 並處理 ICMPv6 Packet Too Big。",
    "timeLimitMs": 1000,
    "cases": [
      {
        "name": "公開：基本測資",
        "input": "3\n1280 0 1232\n1280 0 1250\n1500 16 1440\n",
        "output": "OK 1232\nPTB 1232\nPTB 1436\n",
        "visible": true
      },
      {
        "name": "公開：邊界測資",
        "input": "3\n48 0 0\n40 0 0\n1280 32 1200\n",
        "output": "OK 0\nOK 0\nOK 1200\n",
        "visible": true
      },
      {
        "name": "隱藏：綜合測資",
        "input": "3\n9000 0 8952\n9000 0 8953\n1280 240 1000\n",
        "output": "OK 8952\nPTB 8952\nPTB 992\n",
        "visible": false
      }
    ],
    "starter": {
      "python": "import sys\nit=iter(sys.stdin.read().split())\nq=int(next(it))\nfor _ in range(q):\n    # TODO: parse inputs and implement this chapter's protocol rule\n    print('TODO')\n",
      "javascript": "const it=readInput().trim().split(/\\s+/);\nlet i=0,q=Number(it[i++]);\nfor(let j=0;j<q;j++){\n  // TODO: parse this case and implement the protocol rule\n  console.log('TODO');\n}\n",
      "cpp": "#include <iostream>\nusing namespace std;\nint main(){int q;cin>>q;while(q--){\n  // TODO: read one case and implement the protocol rule\n  cout<<\"TODO\\n\";\n}}\n",
      "c": "#include <stdio.h>\nint main(void){int q;if(scanf(\"%d\",&q)!=1)return 0;\nwhile(q--){\n  /* TODO: read one case and implement the protocol rule */\n  puts(\"TODO\");\n}return 0;}\n"
    }
  },
  {
    "id": "net.cloud.path",
    "lesson": 26,
    "title": "雲端三層網路：第一個阻斷點",
    "statement": "簡化路徑依序檢查入口 port（只允許 443）、LB→App 規則 appAllow、App→DB 規則 dbAllow、回程路由 returnRoute（後三者為 0/1）。輸出 PASS 或第一個不通的環節 ENTRY、APP、DB、RETURN。真實雲端需另驗證服務監聽與設備政策。",
    "input": "第一行 q，接著 q 行 port appAllow dbAllow returnRoute。",
    "output": "每行一個 PASS 或環節代號。",
    "tags": [
      "vpc",
      "firewall",
      "routing"
    ],
    "hints": [
      "按資料流順序檢查。",
      "路由正確也不保證允許存取。"
    ],
    "explain": "網路可達性是正反向路由和網路控制策略共同決定的結果。",
    "timeLimitMs": 1000,
    "cases": [
      {
        "name": "公開：基本測資",
        "input": "3\n443 1 1 1\n80 1 1 1\n443 0 1 1\n",
        "output": "PASS\nENTRY\nAPP\n",
        "visible": true
      },
      {
        "name": "公開：邊界測資",
        "input": "3\n443 1 0 1\n443 1 1 0\n80 0 0 0\n",
        "output": "DB\nRETURN\nENTRY\n",
        "visible": true
      },
      {
        "name": "隱藏：綜合測資",
        "input": "3\n443 0 0 0\n443 1 0 0\n8443 1 1 1\n",
        "output": "APP\nDB\nENTRY\n",
        "visible": false
      }
    ],
    "starter": {
      "python": "import sys\nit=iter(sys.stdin.read().split())\nq=int(next(it))\nfor _ in range(q):\n    # TODO: parse inputs and implement this chapter's protocol rule\n    print('TODO')\n",
      "javascript": "const it=readInput().trim().split(/\\s+/);\nlet i=0,q=Number(it[i++]);\nfor(let j=0;j<q;j++){\n  // TODO: parse this case and implement the protocol rule\n  console.log('TODO');\n}\n",
      "cpp": "#include <iostream>\nusing namespace std;\nint main(){int q;cin>>q;while(q--){\n  // TODO: read one case and implement the protocol rule\n  cout<<\"TODO\\n\";\n}}\n",
      "c": "#include <stdio.h>\nint main(void){int q;if(scanf(\"%d\",&q)!=1)return 0;\nwhile(q--){\n  /* TODO: read one case and implement the protocol rule */\n  puts(\"TODO\");\n}return 0;}\n"
    }
  },
  {
    "id": "net.diagnose.next",
    "lesson": 27,
    "title": "故障診斷：根據症狀決定下一項取證",
    "statement": "觀察到的症狀代碼只有 DNS_NXDOMAIN、SYN_TIMEOUT、TLS_HOSTNAME、HTTP_503、LARGE_FAIL。依本題指定的診斷計畫輸出下一步 DNS_RECORD、SERVER_CAPTURE、CERT_SAN、BACKEND_HEALTH 或 PMTU_ICMP。此輸出僅是下一步測試，不代表根因已確定。",
    "input": "第一行 q，接著 q 行症狀字串。",
    "output": "每行一個下一步驗證代號。",
    "tags": [
      "troubleshooting",
      "diagnosis"
    ],
    "hints": [
      "先分層判斷 DNS/TCP/TLS/HTTP/MTU。",
      "使用映射表，而不是宣稱單一確定原因。"
    ],
    "explain": "真正的故障診斷應記錄觀察、假設、預測及下一個能區分假設的證據。",
    "timeLimitMs": 1000,
    "cases": [
      {
        "name": "公開：基本測資",
        "input": "3\nDNS_NXDOMAIN\nSYN_TIMEOUT\nTLS_HOSTNAME\n",
        "output": "DNS_RECORD\nSERVER_CAPTURE\nCERT_SAN\n",
        "visible": true
      },
      {
        "name": "公開：邊界測資",
        "input": "2\nHTTP_503\nLARGE_FAIL\n",
        "output": "BACKEND_HEALTH\nPMTU_ICMP\n",
        "visible": true
      },
      {
        "name": "隱藏：綜合測資",
        "input": "5\nLARGE_FAIL\nTLS_HOSTNAME\nSYN_TIMEOUT\nHTTP_503\nDNS_NXDOMAIN\n",
        "output": "PMTU_ICMP\nCERT_SAN\nSERVER_CAPTURE\nBACKEND_HEALTH\nDNS_RECORD\n",
        "visible": false
      }
    ],
    "starter": {
      "python": "import sys\nit=iter(sys.stdin.read().split())\nq=int(next(it))\nfor _ in range(q):\n    # TODO: parse inputs and implement this chapter's protocol rule\n    print('TODO')\n",
      "javascript": "const it=readInput().trim().split(/\\s+/);\nlet i=0,q=Number(it[i++]);\nfor(let j=0;j<q;j++){\n  // TODO: parse this case and implement the protocol rule\n  console.log('TODO');\n}\n",
      "cpp": "#include <iostream>\nusing namespace std;\nint main(){int q;cin>>q;while(q--){\n  // TODO: read one case and implement the protocol rule\n  cout<<\"TODO\\n\";\n}}\n",
      "c": "#include <stdio.h>\nint main(void){int q;if(scanf(\"%d\",&q)!=1)return 0;\nwhile(q--){\n  /* TODO: read one case and implement the protocol rule */\n  puts(\"TODO\");\n}return 0;}\n"
    }
  }
];
for(const task of tasks) CSLab.code.add(task);
})();
