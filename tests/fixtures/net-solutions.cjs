// NET 程式實作題的參考解（測試用）：確認每題的 I/O 規格在每種語言都寫得出來、測資正確、時限合理。
const R = String.raw;
module.exports = {
  'net.switching.store-forward': {
    python: R`import sys
def main():
    d=sys.stdin.buffer.read().split();p=1;out=[]
    for _ in range(int(d[0])):
        M,P,H,k=int(d[p]),int(d[p+1]),int(d[p+2]),int(d[p+3]);p+=4
        Rr=[int(x) for x in d[p:p+k]];p+=k
        dl=[int(x) for x in d[p:p+k]];p+=k
        n=(M+P-1)//P;last=[0]*k
        f=[8000//r for r in Rr]
        for j in range(n):
            b=(P if j<n-1 else M-P*(n-1))+H
            a=0
            for i in range(k):
                s=a if a>last[i] else last[i]
                last[i]=s+b*f[i] if 8000%Rr[i]==0 else s+b*8000//Rr[i]
                a=last[i]+dl[i]
        out.append(str(last[k-1]+dl[k-1]))
    print("\n".join(out))
main()`,
    cpp: R`#include <vector>
#include <algorithm>
#include <cstdio>
using namespace std;int main(){int q;scanf("%d",&q);while(q--){long long M,P,H;int k;scanf("%lld %lld %lld %d",&M,&P,&H,&k);vector<long long>R(k),d(k),last(k,0);for(auto&x:R)scanf("%lld",&x);for(auto&x:d)scanf("%lld",&x);long long n=(M+P-1)/P;for(long long j=0;j<n;j++){long long b=(j<n-1?P:M-P*(n-1))+H,a=0;for(int i=0;i<k;i++){long long s=max(a,last[i]);last[i]=s+b*8000/R[i];a=last[i]+d[i];}}printf("%lld\n",last[k-1]+d[k-1]);}}`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);let p=1;const o=[];for(let t=0;t<d[0];t++){const M=d[p],P=d[p+1],H=d[p+2],k=d[p+3];p+=4;const R=d.slice(p,p+k);p+=k;const dl=d.slice(p,p+k);p+=k;const n=Math.ceil(M/P),last=new Array(k).fill(0);for(let j=0;j<n;j++){const b=(j<n-1?P:M-P*(n-1))+H;let a=0;for(let i=0;i<k;i++){const s=a>last[i]?a:last[i];last[i]=s+b*8000/R[i];a=last[i]+dl[i];}}o.push(String(last[k-1]+dl[k-1]));}console.log(o.join("\n"));`
  },
  'net.delay.router-queue': {
    python: R`import sys
from collections import deque
def main():
    d=sys.stdin.buffer.read().split();R,B,n=int(d[0]),int(d[1]),int(d[2])
    q=deque();out=[];drops=0
    for i in range(n):
        a,s=int(d[3+2*i]),int(d[4+2*i]);t=s*8000//R
        while q and q[0]<=a: q.popleft()
        if not q: f=a+t
        elif len(q)-1<B: f=q[-1]+t
        else:
            drops+=1;out.append("DROP");continue
        q.append(f);out.append(str(f))
    out.append("dropped %d"%drops);print("\n".join(out))
main()`,
    cpp: R`#include <string>
#include <deque>
#include <cstdio>
using namespace std;int main(){long long R,B;int n;scanf("%lld %lld %d",&R,&B,&n);deque<long long>q;long long drops=0;string o;char buf[32];for(int i=0;i<n;i++){long long a,s;scanf("%lld %lld",&a,&s);long long t=s*8000/R;while(!q.empty()&&q.front()<=a)q.pop_front();long long f;if(q.empty())f=a+t;else if((long long)q.size()-1<B)f=q.back()+t;else{drops++;o+="DROP\n";continue;}q.push_back(f);snprintf(buf,32,"%lld\n",f);o+=buf;}printf("%sdropped %lld\n",o.c_str(),drops);}`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const[R,B,n]=d;const q=[];let h=0,drops=0;const o=[];for(let i=0;i<n;i++){const a=d[3+2*i],t=d[4+2*i]*8000/R;while(h<q.length&&q[h]<=a)h++;const c=q.length-h;let f;if(c===0)f=a+t;else if(c-1<B)f=q[q.length-1]+t;else{drops++;o.push("DROP");continue;}q.push(f);o.push(String(f));}o.push("dropped "+drops);console.log(o.join("\n"));`
  },
  'net.layers.parse-frame': {
    python: R`import sys
def mac(b): return ":".join("%02x"%x for x in b)
def main():
    t=sys.stdin.read().split();out=[]
    for k in range(int(t[0])):
        b=bytes.fromhex(t[1+k]);et=b[12]<<8|b[13];head=mac(b[6:12])+" > "+mac(b[0:6])
        if et!=0x0800: out.append(head+" type=0x%04x"%et);continue
        ip=b[14:];ihl=(ip[0]&15)*4;tot=ip[2]<<8|ip[3];ttl=ip[8];pr=ip[9]
        s=".".join(map(str,ip[12:16]));dd=".".join(map(str,ip[16:20]));l4=ip[ihl:]
        if pr in (6,17):
            sp=l4[0]<<8|l4[1];dp=l4[2]<<8|l4[3];hl=(l4[12]>>4)*4 if pr==6 else 8
            out.append("%s %s %s:%d > %s:%d ttl=%d len=%d"%(head,"TCP" if pr==6 else "UDP",s,sp,dd,dp,ttl,tot-ihl-hl))
        else: out.append("%s IP %s > %s proto=%d ttl=%d len=%d"%(head,s,dd,pr,ttl,tot-ihl))
    print("\n".join(out))
main()`,
    cpp: R`#include <string>
#include <vector>
#include <cstdio>
#include <cstring>
using namespace std;int hv(char c){return c<='9'?c-'0':c-'a'+10;}int main(){int q;scanf("%d",&q);static char h[4096];string o;char buf[256];while(q--){scanf("%s",h);int n=strlen(h)/2;vector<int>b(n);for(int i=0;i<n;i++)b[i]=hv(h[2*i])*16+hv(h[2*i+1]);snprintf(buf,256,"%02x:%02x:%02x:%02x:%02x:%02x > %02x:%02x:%02x:%02x:%02x:%02x",b[6],b[7],b[8],b[9],b[10],b[11],b[0],b[1],b[2],b[3],b[4],b[5]);o+=buf;int et=b[12]<<8|b[13];if(et!=0x0800){snprintf(buf,256," type=0x%04x\n",et);o+=buf;continue;}int*ip=&b[14];int ihl=(ip[0]&15)*4,tot=ip[2]<<8|ip[3],ttl=ip[8],pr=ip[9];int*l=ip+ihl;if(pr==6||pr==17){int hl=pr==6?(l[12]>>4)*4:8;snprintf(buf,256," %s %d.%d.%d.%d:%d > %d.%d.%d.%d:%d ttl=%d len=%d\n",pr==6?"TCP":"UDP",ip[12],ip[13],ip[14],ip[15],l[0]<<8|l[1],ip[16],ip[17],ip[18],ip[19],l[2]<<8|l[3],ttl,tot-ihl-hl);}else snprintf(buf,256," IP %d.%d.%d.%d > %d.%d.%d.%d proto=%d ttl=%d len=%d\n",ip[12],ip[13],ip[14],ip[15],ip[16],ip[17],ip[18],ip[19],pr,ttl,tot-ihl);o+=buf;}fputs(o.c_str(),stdout);}`,
    javascript: R`const t=readInput().trim().split(/\s+/);const o=[];const x2=v=>v.toString(16).padStart(2,"0");for(let k=0;k<+t[0];k++){const h=t[1+k],b=[];for(let i=0;i<h.length;i+=2)b.push(parseInt(h.substr(i,2),16));const mac=a=>b.slice(a,a+6).map(x2).join(":");const head=mac(6)+" > "+mac(0);const et=b[12]<<8|b[13];if(et!==0x800){o.push(head+" type=0x"+et.toString(16).padStart(4,"0"));continue;}const ip=b.slice(14),ihl=(ip[0]&15)*4,tot=ip[2]<<8|ip[3],ttl=ip[8],pr=ip[9],s=ip.slice(12,16).join("."),dd=ip.slice(16,20).join("."),l=ip.slice(ihl);if(pr===6||pr===17){const hl=pr===6?(l[12]>>4)*4:8;o.push(head+" "+(pr===6?"TCP":"UDP")+" "+s+":"+(l[0]<<8|l[1])+" > "+dd+":"+(l[2]<<8|l[3])+" ttl="+ttl+" len="+(tot-ihl-hl));}else o.push(head+" IP "+s+" > "+dd+" proto="+pr+" ttl="+ttl+" len="+(tot-ihl));}console.log(o.join("\n"));`
  },
  'net.http.parse-requests': {
    python: R`import sys
def main():
    s=sys.stdin.read();i=0;n=len(s);out=[]
    while i<n:
        j=s.index("\n",i);m,path,ver=s[i:j].split(" ");i=j+1;h={}
        while True:
            j=s.index("\n",i);l=s[i:j];i=j+1
            if not l: break
            c=l.index(":");h[l[:c].strip().lower()]=l[c+1:].strip()
        ln=int(h.get("content-length","0"));i+=ln
        cv=h.get("connection","").lower()
        ka=(cv!="close") if ver=="HTTP/1.1" else (cv=="keep-alive")
        if ver=="HTTP/1.1" and "host" not in h: out.append("400")
        else: out.append("%s %s %s %d %s"%(m,path,h.get("host","-"),ln,"keep-alive" if ka else "close"))
    print("\n".join(out))
main()`,
    cpp: R`#include <iostream>
#include <string>
#include <map>
#include <sstream>
#include <iterator>
using namespace std;string trim(const string&x){size_t a=x.find_first_not_of(' '),b=x.find_last_not_of(' ');return a==string::npos?"":x.substr(a,b-a+1);}int main(){string s((istreambuf_iterator<char>(cin)),istreambuf_iterator<char>());size_t i=0;string o;while(i<s.size()){size_t j=s.find('\n',i);string st=s.substr(i,j-i);i=j+1;istringstream ss(st);string m,p,v;ss>>m>>p>>v;map<string,string>h;while(true){j=s.find('\n',i);string l=s.substr(i,j-i);i=j+1;if(l.empty())break;size_t c=l.find(':');string k=trim(l.substr(0,c));for(auto&ch:k)ch=tolower(ch);h[k]=trim(l.substr(c+1));}long long len=h.count("content-length")?stoll(h["content-length"]):0;i+=len;string cv=h.count("connection")?h["connection"]:"";for(auto&ch:cv)ch=tolower(ch);bool ka=v=="HTTP/1.1"?cv!="close":cv=="keep-alive";if(v=="HTTP/1.1"&&!h.count("host"))o+="400\n";else o+=m+" "+p+" "+(h.count("host")?h["host"]:"-")+" "+to_string(len)+" "+(ka?"keep-alive":"close")+"\n";}cout<<o;}`,
    javascript: R`const s=readInput();let i=0;const o=[];while(i<s.length){let j=s.indexOf("\n",i);const[m,p,v]=s.slice(i,j).split(" ");i=j+1;const h={};for(;;){j=s.indexOf("\n",i);const l=s.slice(i,j);i=j+1;if(l==="")break;const c=l.indexOf(":");h[l.slice(0,c).trim().toLowerCase()]=l.slice(c+1).trim();}const len=+(h["content-length"]||0);i+=len;const cv=(h.connection||"").toLowerCase(),ka=v==="HTTP/1.1"?cv!=="close":cv==="keep-alive";if(v==="HTTP/1.1"&&!("host" in h))o.push("400");else o.push(m+" "+p+" "+(h.host||"-")+" "+len+" "+(ka?"keep-alive":"close"));}console.log(o.join("\n"));`
  },
  'net.dns.resolve-cache': {
    python: R`import sys
def main():
    d=sys.stdin.buffer.read().split();n=int(d[0]);z={};p=1
    for _ in range(n):
        z[d[p]]=(d[p+1]==b"A",d[p+2],int(d[p+3]));p+=4
    m=int(d[p]);p+=1;cache={};out=[]
    for _ in range(m):
        t=int(d[p]);cur=d[p+1];p+=2;seen=set();miss=0
        while True:
            if cur in seen: ans="LOOP";break
            seen.add(cur);c=cache.get(cur)
            if c is not None and t<c[1]: rec=c[0]
            else:
                miss+=1;rec=z.get(cur)
                if rec is None: ans="NXDOMAIN";break
                cache[cur]=(rec,t+rec[2])
            if rec[0]: ans=rec[1].decode();break
            cur=rec[1]
        out.append("%s %d"%(ans,miss))
    print("\n".join(out))
main()`,
    cpp: R`#include <iostream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
using namespace std;struct Rc{bool a;string v;long long ttl;};int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;unordered_map<string,Rc>z;z.reserve(n*2);for(int i=0;i<n;i++){string nm,ty,v;long long t;cin>>nm>>ty>>v>>t;z[nm]={ty=="A",v,t};}int m;cin>>m;unordered_map<string,pair<const Rc*,long long>>c;string o;for(int i=0;i<m;i++){long long t;string cur;cin>>t>>cur;unordered_set<string>seen;int miss=0;string ans;while(true){if(seen.count(cur)){ans="LOOP";break;}seen.insert(cur);const Rc*r;auto it=c.find(cur);if(it!=c.end()&&t<it->second.second)r=it->second.first;else{miss++;auto zt=z.find(cur);if(zt==z.end()){ans="NXDOMAIN";break;}r=&zt->second;c[cur]={r,t+r->ttl};}if(r->a){ans=r->v;break;}cur=r->v;}o+=ans+" "+to_string(miss)+"\n";}cout<<o;}`,
    javascript: R`const d=readInput().trim().split(/\s+/);let p=1;const n=+d[0],z=new Map();for(let i=0;i<n;i++){z.set(d[p],[d[p+1]==="A",d[p+2],+d[p+3]]);p+=4;}const m=+d[p++],c=new Map(),o=[];for(let i=0;i<m;i++){const t=+d[p];let cur=d[p+1];p+=2;const seen=new Set();let miss=0,ans;for(;;){if(seen.has(cur)){ans="LOOP";break;}seen.add(cur);let r;const e=c.get(cur);if(e&&t<e[1])r=e[0];else{miss++;r=z.get(cur);if(!r){ans="NXDOMAIN";break;}c.set(cur,[r,t+r[2]]);}if(r[0]){ans=r[1];break;}cur=r[1];}o.push(ans+" "+miss);}console.log(o.join("\n"));`
  },
  'net.socket.length-framing': {
    python: R`import sys
def main():
    data=sys.stdin.read().split("\n");k=int(data[0]);out=[];buf="";need=-1
    for c in data[1:1+k]:
        buf+=c;pos=0
        while True:
            if need<0:
                j=buf.find(":",pos)
                if j<0: break
                need=int(buf[pos:j]);pos=j+1
            if len(buf)-pos<need: break
            out.append(buf[pos:pos+need]);pos+=need;need=-1
        if pos: buf=buf[pos:]
    rest=len(buf)+(len(str(need))+1 if need>=0 else 0)
    if rest: out.append("INCOMPLETE %d"%rest)
    print("\n".join(out))
main()`,
    cpp: R`#include <iostream>
#include <string>
using namespace std;int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int k;cin>>k;string buf,c,o;long long need=-1;size_t pos=0;for(int i=0;i<k;i++){cin>>c;buf+=c;while(true){if(need<0){size_t j=buf.find(':',pos);if(j==string::npos)break;need=stoll(buf.substr(pos,j-pos));pos=j+1;}if((long long)(buf.size()-pos)<need)break;o.append(buf,pos,need);o+='\n';pos+=need;need=-1;}if(pos>(1<<16)||pos==buf.size()){buf.erase(0,pos);pos=0;}}long long rest=buf.size()-pos+(need>=0?to_string(need).size()+1:0);if(rest)o+="INCOMPLETE "+to_string(rest)+"\n";cout<<o;}`,
    javascript: R`const L=readInput().split("\n");const k=+L[0],o=[];let buf="",need=-1;for(let i=1;i<=k;i++){buf+=L[i];let pos=0;for(;;){if(need<0){const j=buf.indexOf(":",pos);if(j<0)break;need=+buf.slice(pos,j);pos=j+1;}if(buf.length-pos<need)break;o.push(buf.slice(pos,pos+need));pos+=need;need=-1;}if(pos)buf=buf.slice(pos);}const rest=buf.length+(need>=0?String(need).length+1:0);if(rest)o.push("INCOMPLETE "+rest);console.log(o.join("\n"));`
  },
  'net.udp.checksum': {
    python: R`import sys
def ssum(b,s):
    if len(b)%2: b+=b"\0"
    s+=sum(int.from_bytes(b[i:i+2],"big") for i in range(0,len(b),2))
    while s>>16: s=(s&0xFFFF)+(s>>16)
    return s
def main():
    t=sys.stdin.read().split();p=1;out=[]
    for _ in range(int(t[0])):
        k=t[p];b=bytes.fromhex(t[p+1]);p+=2
        if k=="C": out.append("%04X"%(~ssum(b,0)&0xFFFF))
        else:
            out.append("OK" if ssum(b,int(t[p],16))==0xFFFF else "BAD");p+=1
    print("\n".join(out))
main()`,
    cpp: R`#include <iostream>
#include <string>
#include <cstdio>
using namespace std;int hv(char c){return c<='9'?c-'0':(c|32)-'a'+10;}unsigned ss(const string&h,unsigned long long s){size_t n=h.size();for(size_t i=0;i<n;i+=4){unsigned w=hv(h[i])<<12|hv(h[i+1])<<8;if(i+2<n)w|=hv(h[i+2])<<4|hv(h[i+3]);s+=w;}while(s>>16)s=(s&0xFFFF)+(s>>16);return s;}int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int q;cin>>q;string o,k,h;char b[8];while(q--){cin>>k>>h;if(k=="C"){snprintf(b,8,"%04X",~ss(h,0)&0xFFFF);o+=b;}else{string c;cin>>c;o+=ss(h,stoul(c,nullptr,16))==0xFFFF?"OK":"BAD";}o+='\n';}cout<<o;}`,
    javascript: R`const t=readInput().trim().split(/\s+/);const o=[];const ss=(h,s)=>{for(let i=0;i<h.length;i+=4){s+=parseInt(i+2<h.length?h.substr(i,4):h.substr(i,2)+"00",16);s=(s&0xFFFF)+(s>>>16);}return s;};let p=1;for(let i=0;i<+t[0];i++){const k=t[p],h=t[p+1];p+=2;if(k==="C")o.push((~ss(h,0)&0xFFFF).toString(16).toUpperCase().padStart(4,"0"));else o.push(ss(h,parseInt(t[p++],16))===0xFFFF?"OK":"BAD");}console.log(o.join("\n"));`
  },
  'net.rdt.stop-and-wait': {
    python: R`import sys
def main():
    d=sys.stdin.read().split();n,rtt,to=int(d[0]),int(d[1]),int(d[2]);ev=d[3];L=len(ev)
    t=sent=dup=0;i=0
    for _ in range(n):
        dl=False
        while True:
            e=ev[i] if i<L else "o";i+=1;sent+=1
            if e!="d":
                if dl: dup+=1
                dl=True
            if e=="o": t+=rtt;break
            t+=to
    print(t,sent,dup)
main()`,
    cpp: R`#include <cstdio>
#include <cstring>
using namespace std;static char ev[2000005];int main(){long long n,rtt,to;scanf("%lld %lld %lld %s",&n,&rtt,&to,ev);size_t L=strlen(ev),i=0;long long t=0,sent=0,dup=0;for(long long k=0;k<n;k++){bool dl=false;while(true){char e=i<L?ev[i]:'o';i++;sent++;if(e!='d'){if(dl)dup++;dl=true;}if(e=='o'){t+=rtt;break;}t+=to;}}printf("%lld %lld %lld\n",t,sent,dup);}`,
    javascript: R`const d=readInput().trim().split(/\s+/);const n=+d[0],rtt=+d[1],to=+d[2],ev=d[3];let t=0,sent=0,dup=0,i=0;for(let k=0;k<n;k++){let dl=false;for(;;){const e=i<ev.length?ev[i]:"o";i++;sent++;if(e!=="d"){if(dl)dup++;dl=true;}if(e==="o"){t+=rtt;break;}t+=to;}}console.log(t+" "+sent+" "+dup);`
  },
  'net.window.gbn-sr': {
    python: R`import sys
def run(n,N,lost,gbn):
    tries=[0]*n;acked=bytearray(n);fq=[];head=0;base=nxt=exp=0;sent=0
    def send(s):
        tries[s]+=1;fq.append((s,(s*10+tries[s]) in lost))
    while nxt<min(base+N,n): send(nxt);nxt+=1
    while base<n:
        while head<len(fq):
            s,dr=fq[head];head+=1
            if dr: continue
            if gbn:
                if s!=exp: continue
                exp+=1;base=exp
            else:
                acked[s]=1
                while base<n and acked[base]: base+=1
            while nxt<min(base+N,n): send(nxt);nxt+=1
        if base>=n: break
        for s in range(base,nxt):
            if gbn or not acked[s]: send(s)
    return len(fq)
def main():
    d=sys.stdin.read().split();n,N,L=int(d[0]),int(d[1]),int(d[2])
    lost={int(d[3+2*i])*10+int(d[4+2*i]) for i in range(L)}
    print(run(n,N,lost,True),run(n,N,lost,False))
main()`,
    cpp: R`#include <vector>
#include <unordered_set>
#include <algorithm>
#include <cstdio>
#include <utility>
using namespace std;int n,N;unordered_set<long long>lost;long long run(bool g){vector<int>tr(n,0);vector<char>ac(n,0);vector<pair<int,bool>>f;size_t h=0;int b=0,nx=0,ex=0;auto send=[&](int s){tr[s]++;f.push_back({s,lost.count((long long)s*10+tr[s])>0});};while(nx<min(b+N,n))send(nx++);while(b<n){while(h<f.size()){auto[s,dr]=f[h++];if(dr)continue;if(g){if(s!=ex)continue;ex++;b=ex;}else{ac[s]=1;while(b<n&&ac[b])b++;}while(nx<min(b+N,n))send(nx++);}if(b>=n)break;for(int s=b;s<nx;s++)if(g||!ac[s])send(s);}return f.size();}int main(){int L;scanf("%d %d %d",&n,&N,&L);for(int i=0;i<L;i++){long long s,k;scanf("%lld %lld",&s,&k);lost.insert(s*10+k);}printf("%lld %lld\n",run(true),run(false));}`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const[n,N,L]=d;const lost=new Set();for(let i=0;i<L;i++)lost.add(d[3+2*i]*10+d[4+2*i]);function run(g){const tr=new Int32Array(n),ac=new Uint8Array(n),fs=[],fl=[];let h=0,b=0,nx=0,ex=0;const send=s=>{tr[s]++;fs.push(s);fl.push(lost.has(s*10+tr[s]));};while(nx<Math.min(b+N,n))send(nx++);while(b<n){while(h<fs.length){const s=fs[h],dr=fl[h];h++;if(dr)continue;if(g){if(s!==ex)continue;ex++;b=ex;}else{ac[s]=1;while(b<n&&ac[b])b++;}while(nx<Math.min(b+N,n))send(nx++);}if(b>=n)break;for(let s=b;s<nx;s++)if(g||!ac[s])send(s);}return fs.length;}console.log(run(true)+" "+run(false));`
  },
  'net.tcp.seq-ack': {
    python: R`import sys
def main():
    L=sys.stdin.read().split("\n");x,y=map(int,L[0].split());m=int(L[1]);M=1<<32
    c=(x+1)%M;s=(y+1)%M
    out=["C>S SYN seq=%d"%x,"S>C SYN+ACK seq=%d ack=%d"%(y,c),"C>S ACK seq=%d ack=%d"%(c,s)]
    for i in range(m):
        op=L[2+i].split()
        if op[0]=="C": out.append("C>S DATA seq=%d ack=%d len=%s"%(c,s,op[1]));c=(c+int(op[1]))%M
        elif op[0]=="S": out.append("S>C DATA seq=%d ack=%d len=%s"%(s,c,op[1]));s=(s+int(op[1]))%M
        elif op[0]=="CF": out.append("C>S FIN seq=%d ack=%d"%(c,s));c=(c+1)%M
        else: out.append("S>C FIN seq=%d ack=%d"%(s,c));s=(s+1)%M
    print("\n".join(out))
main()`,
    cpp: R`#include <string>
#include <cstdio>
#include <cstring>
#include <cstdint>
using namespace std;int main(){unsigned long long X,Y;int m;scanf("%llu %llu %d",&X,&Y,&m);uint32_t x=X,y=Y,c=x+1,s=y+1;string o;char b[200];snprintf(b,200,"C>S SYN seq=%u\nS>C SYN+ACK seq=%u ack=%u\nC>S ACK seq=%u ack=%u\n",x,y,c,c,s);o+=b;char op[4];for(int i=0;i<m;i++){scanf("%3s",op);if(!strcmp(op,"C")||!strcmp(op,"S")){unsigned k;scanf("%u",&k);if(op[0]=='C'){snprintf(b,200,"C>S DATA seq=%u ack=%u len=%u\n",c,s,k);c+=k;}else{snprintf(b,200,"S>C DATA seq=%u ack=%u len=%u\n",s,c,k);s+=k;}}else if(op[0]=='C'){snprintf(b,200,"C>S FIN seq=%u ack=%u\n",c,s);c++;}else{snprintf(b,200,"S>C FIN seq=%u ack=%u\n",s,c);s++;}o+=b;}fputs(o.c_str(),stdout);}`,
    javascript: R`const L=readInput().split("\n");const[x,y]=L[0].split(" ").map(Number),m=+L[1],M=4294967296;let c=(x+1)%M,s=(y+1)%M;const o=["C>S SYN seq="+x,"S>C SYN+ACK seq="+y+" ack="+c,"C>S ACK seq="+c+" ack="+s];for(let i=0;i<m;i++){const op=L[2+i].split(" ");if(op[0]==="C"){o.push("C>S DATA seq="+c+" ack="+s+" len="+op[1]);c=(c+ +op[1])%M;}else if(op[0]==="S"){o.push("S>C DATA seq="+s+" ack="+c+" len="+op[1]);s=(s+ +op[1])%M;}else if(op[0]==="CF"){o.push("C>S FIN seq="+c+" ack="+s);c=(c+1)%M;}else{o.push("S>C FIN seq="+s+" ack="+c);s=(s+1)%M;}}console.log(o.join("\n"));`
  },
  'net.tcp.cwnd': {
    python: R`import sys
def main():
    d=sys.stdin.read().split();tahoe=d[0]=="TAHOE";ss=int(d[1]);cw=1;tot=0
    for e in d[2]:
        tot+=cw
        if e=="o": cw=min(cw*2,ss) if cw<ss else cw+1
        else:
            ss=max(cw//2,2);cw=1 if (e=="t" or tahoe) else ss
    print(tot,cw,ss)
main()`,
    cpp: R`#include <algorithm>
#include <cstdio>
using namespace std;static char ev[1000005];int main(){char a[8];long long ss;scanf("%7s %lld %s",a,&ss,ev);bool th=a[0]=='T';long long cw=1,tot=0;for(int i=0;ev[i];i++){tot+=cw;if(ev[i]=='o')cw=cw<ss?min(cw*2,ss):cw+1;else{ss=max(cw/2,2LL);cw=(ev[i]=='t'||th)?1:ss;}}printf("%lld %lld %lld\n",tot,cw,ss);}`,
    javascript: R`const[a,s0,ev]=readInput().trim().split(/\s+/);let ss=+s0,cw=1,tot=0;const th=a==="TAHOE";for(let i=0;i<ev.length;i++){const e=ev[i];tot+=cw;if(e==="o")cw=cw<ss?Math.min(cw*2,ss):cw+1;else{ss=Math.max(Math.floor(cw/2),2);cw=e==="t"||th?1:ss;}}console.log(tot+" "+cw+" "+ss);`
  },
  'net.ip.vlsm': {
    python: R`import sys
def main():
    d=sys.stdin.read().split();p=1;out=[]
    for _ in range(int(d[0])):
        blk,n=d[p],int(d[p+1]);hs=list(map(int,d[p+2:p+2+n]));p+=2+n
        ip,k0=blk.split("/");k0=int(k0);a=[int(x) for x in ip.split(".")]
        st=(a[0]<<24)|(a[1]<<16)|(a[2]<<8)|a[3];end=st+(1<<(32-k0));cur=st;res=["FAIL"]*n
        for i in sorted(range(n),key=lambda i:(-hs[i],i)):
            k=2
            while (1<<k)-2<hs[i]: k+=1
            if 32-k<k0 or cur+(1<<k)>end: continue
            res[i]="%d.%d.%d.%d/%d"%(cur>>24&255,cur>>16&255,cur>>8&255,cur&255,32-k);cur+=1<<k
        out.extend(res)
    print("\n".join(out))
main()`,
    cpp: R`#include <string>
#include <vector>
#include <algorithm>
#include <cstdio>
#include <numeric>
using namespace std;int main(){int T;scanf("%d",&T);string o;char b[40];while(T--){unsigned a,bb,c,d,k0;int n;scanf("%u.%u.%u.%u/%u %d",&a,&bb,&c,&d,&k0,&n);vector<long long>h(n);for(auto&x:h)scanf("%lld",&x);unsigned long long st=(unsigned long long)a<<24|bb<<16|c<<8|d,en=st+(1ULL<<(32-k0)),cur=st;vector<int>id(n);iota(id.begin(),id.end(),0);stable_sort(id.begin(),id.end(),[&](int x,int y){return h[x]>h[y];});vector<string>r(n,"FAIL");for(int i:id){int k=2;while((1LL<<k)-2<h[i])k++;if(32-k<(int)k0||cur+(1ULL<<k)>en)continue;snprintf(b,40,"%llu.%llu.%llu.%llu/%d",cur>>24&255,cur>>16&255,cur>>8&255,cur&255,32-k);r[i]=b;cur+=1ULL<<k;}for(auto&s:r)o+=s+"\n";}fputs(o.c_str(),stdout);}`,
    javascript: R`const d=readInput().trim().split(/\s+/);const o=[];let p=1;const n2=n=>[24,16,8,0].map(k=>Math.floor(n/2**k)%256).join(".");for(let t=0;t<+d[0];t++){const blk=d[p],n=+d[p+1],h=d.slice(p+2,p+2+n).map(Number);p+=2+n;const[ip,ks]=blk.split("/"),k0=+ks,st=ip.split(".").reduce((a,x)=>a*256+ +x,0),en=st+2**(32-k0);let cur=st;const r=new Array(n).fill("FAIL");const id=h.map((_,i)=>i).sort((x,y)=>h[y]-h[x]||x-y);for(const i of id){let k=2;while(2**k-2<h[i])k++;if(32-k<k0||cur+2**k>en)continue;r[i]=n2(cur)+"/"+(32-k);cur+=2**k;}o.push(...r);}console.log(o.join("\n"));`
  },
  'net.forward.lpm': {
    python: R`import sys
def main():
    d=sys.stdin.buffer.read().split();n=int(d[0]);tab=[{} for _ in range(33)]
    def ip2n(s):
        a,b,c,e=s.split(b".");return (int(a)<<24)|(int(b)<<16)|(int(c)<<8)|int(e)
    for i in range(n):
        ip,k=d[1+2*i].split(b"/");tab[int(k)][ip2n(ip)]=d[2+2*i].decode()
    lens=[(k,tab[k],((1<<32)-1)^((1<<(32-k))-1)) for k in range(32,-1,-1) if tab[k]]
    q=int(d[1+2*n]);out=[]
    for j in range(q):
        a=ip2n(d[2+2*n+j]);ans="DROP"
        for k,t,mask in lens:
            v=t.get(a&mask)
            if v is not None: ans=v;break
        out.append(ans)
    print("\n".join(out))
main()`,
    cpp: R`#include <string>
#include <vector>
#include <unordered_map>
#include <cstdio>
#include <cstdint>
using namespace std;int main(){int n;scanf("%d",&n);vector<unordered_map<uint32_t,int>>t(33);vector<string>names;char port[64];for(int i=0;i<n;i++){unsigned a,b,c,d,k;scanf("%u.%u.%u.%u/%u %63s",&a,&b,&c,&d,&k,port);t[k][a<<24|b<<16|c<<8|d]=names.size();names.push_back(port);}vector<int>ls;for(int k=32;k>=0;k--)if(t[k].size())ls.push_back(k);int q;scanf("%d",&q);string o;while(q--){unsigned a,b,c,d;scanf("%u.%u.%u.%u",&a,&b,&c,&d);uint32_t x=a<<24|b<<16|c<<8|d;int ans=-1;for(int k:ls){uint32_t m=k==0?0:0xFFFFFFFFu<<(32-k);auto it=t[k].find(x&m);if(it!=t[k].end()){ans=it->second;break;}}o+=ans<0?"DROP":names[ans];o+='\n';}fputs(o.c_str(),stdout);}`,
    javascript: R`const d=readInput().trim().split(/\s+/);const n=+d[0],t=Array.from({length:33},()=>new Map());const ip=s=>{const a=s.split(".");return((+a[0]<<24)|(+a[1]<<16)|(+a[2]<<8)|+a[3])>>>0;};for(let i=0;i<n;i++){const[a,k]=d[1+2*i].split("/");t[+k].set(ip(a),d[2+2*i]);}const ls=[];for(let k=32;k>=0;k--)if(t[k].size)ls.push([t[k],k===0?0:(0xFFFFFFFF<<(32-k))>>>0]);const q=+d[1+2*n],o=[];for(let j=0;j<q;j++){const a=ip(d[2+2*n+j]);let ans="DROP";for(const[m,mask]of ls){const v=m.get((a&mask)>>>0);if(v!==undefined){ans=v;break;}}o.push(ans);}console.log(o.join("\n"));`
  },
  'net.route.dijkstra': {
    python: R`import sys,heapq
def main():
    d=sys.stdin.buffer.read().split();n,m,s=int(d[0]),int(d[1]),int(d[2])
    adj=[[] for _ in range(n+1)]
    for i in range(m):
        u,v,w=int(d[3+3*i]),int(d[4+3*i]),int(d[5+3*i]);adj[u].append((v,w));adj[v].append((u,w))
    INF=1<<60;dist=[INF]*(n+1);dist[s]=0;pq=[(0,s)];order=[]
    while pq:
        du,u=heapq.heappop(pq)
        if du>dist[u]: continue
        order.append(u)
        for v,w in adj[u]:
            nd=du+w
            if nd<dist[v]: dist[v]=nd;heapq.heappush(pq,(nd,v))
    hop=[INF]*(n+1)
    for v in order:
        if v==s: continue
        dv=dist[v];b=INF
        for u,w in adj[v]:
            if dist[u]+w==dv:
                c=v if u==s else hop[u]
                if c<b: b=c
        hop[v]=b
    out=[]
    for v in range(1,n+1):
        out.append("0 -" if v==s else ("INF -" if dist[v]==INF else "%d %d"%(dist[v],hop[v])))
    print("\n".join(out))
main()`,
    cpp: R`#include <string>
#include <vector>
#include <algorithm>
#include <climits>
#include <cstdio>
#include <queue>
#include <utility>
using namespace std;int main(){int n,m,s;scanf("%d %d %d",&n,&m,&s);vector<vector<pair<int,int>>>g(n+1);for(int i=0;i<m;i++){int u,v,w;scanf("%d %d %d",&u,&v,&w);g[u].push_back({v,w});g[v].push_back({u,w});}const long long INF=LLONG_MAX/4;vector<long long>d(n+1,INF);d[s]=0;priority_queue<pair<long long,int>,vector<pair<long long,int>>,greater<>>pq;pq.push({0,s});vector<int>ord;while(!pq.empty()){auto[du,u]=pq.top();pq.pop();if(du>d[u])continue;ord.push_back(u);for(auto[v,w]:g[u])if(du+w<d[v]){d[v]=du+w;pq.push({d[v],v});}}vector<int>hop(n+1,INT_MAX);for(int v:ord){if(v==s)continue;for(auto[u,w]:g[v])if(d[u]+w==d[v])hop[v]=min(hop[v],u==s?v:hop[u]);}string o;char b[48];for(int v=1;v<=n;v++){if(v==s)o+="0 -\n";else if(d[v]==INF)o+="INF -\n";else{snprintf(b,48,"%lld %d\n",d[v],hop[v]);o+=b;}}fputs(o.c_str(),stdout);}`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const[n,m,s]=d;const head=new Int32Array(n+1).fill(-1),nx=new Int32Array(2*m),to=new Int32Array(2*m),wt=new Int32Array(2*m);let e=0;for(let i=0;i<m;i++){const u=d[3+3*i],v=d[4+3*i],w=d[5+3*i];to[e]=v;wt[e]=w;nx[e]=head[u];head[u]=e++;to[e]=u;wt[e]=w;nx[e]=head[v];head[v]=e++;}const dist=new Float64Array(n+1).fill(Infinity);dist[s]=0;const hk=[0],hv=[s];const push=(k,v)=>{hk.push(k);hv.push(v);let i=hk.length-1;while(i){const p=(i-1)>>1;if(hk[p]<=hk[i])break;[hk[p],hk[i]]=[hk[i],hk[p]];[hv[p],hv[i]]=[hv[i],hv[p]];i=p;}};const pop=()=>{const k=hk[0],v=hv[0],lk=hk.pop(),lv=hv.pop();if(hk.length){hk[0]=lk;hv[0]=lv;let i=0;for(;;){const a=2*i+1,b=a+1;let mi=i;if(a<hk.length&&hk[a]<hk[mi])mi=a;if(b<hk.length&&hk[b]<hk[mi])mi=b;if(mi===i)break;[hk[mi],hk[i]]=[hk[i],hk[mi]];[hv[mi],hv[i]]=[hv[i],hv[mi]];i=mi;}}return[k,v];};const ord=[];while(hk.length){const[k,u]=pop();if(k>dist[u])continue;ord.push(u);for(let x=head[u];x>=0;x=nx[x]){const v=to[x],nd=k+wt[x];if(nd<dist[v]){dist[v]=nd;push(nd,v);}}}const hop=new Float64Array(n+1).fill(Infinity);for(const v of ord){if(v===s)continue;let b=Infinity;for(let x=head[v];x>=0;x=nx[x]){const u=to[x];if(dist[u]+wt[x]===dist[v]){const c=u===s?v:hop[u];if(c<b)b=c;}}hop[v]=b;}const o=[];for(let v=1;v<=n;v++)o.push(v===s?"0 -":dist[v]===Infinity?"INF -":dist[v]+" "+hop[v]);console.log(o.join("\n"));`
  },
  'net.route.distance-vector': {
    python: R`import sys
def main():
    d=sys.stdin.read().split();n,m,P=int(d[0]),int(d[1]),int(d[2]);I=16
    c=[[I]*(n+1) for _ in range(n+1)];p=3
    for _ in range(m):
        u,v,w=int(d[p]),int(d[p+1]),int(d[p+2]);p+=3;c[u][v]=c[v][u]=w
    cu,cv,cc=int(d[p]),int(d[p+1]),int(d[p+2])
    D=[[I]*(n+1) for _ in range(n+1)];V=[[-1]*(n+1) for _ in range(n+1)]
    for x in range(1,n+1):
        D[x][x]=0;V[x][x]=x
        for y in range(1,n+1):
            if y!=x and c[x][y]<I: D[x][y]=c[x][y];V[x][y]=y
    def phase():
        nonlocal D,V
        r=0
        while True:
            ND=[row[:] for row in D];NV=[row[:] for row in V];ch=False
            for x in range(1,n+1):
                nb=[(v,c[x][v]) for v in range(1,n+1) if v!=x and c[x][v]<I]
                Dx=ND[x];Vx=NV[x]
                for y in range(1,n+1):
                    if y==x: continue
                    b=I;bv=-1
                    for v,cv2 in nb:
                        a=I if (P and V[v][y]==x) else D[v][y]
                        if cv2+a<b: b=cv2+a;bv=v
                    if b>=I: b=I;bv=-1
                    if b!=D[x][y] or bv!=V[x][y]: ch=True
                    Dx[y]=b;Vx[y]=bv
            if not ch: return r
            D,V=ND,NV;r+=1
    r1=phase();c[cu][cv]=c[cv][cu]=cc;r2=phase()
    print(r1,r2)
    print("\n".join(" ".join(map(str,D[x][1:])) for x in range(1,n+1)))
main()`,
    cpp: R`#include <vector>
#include <cstdio>
using namespace std;int n,P,c[61][61];vector<vector<int>>D,V;int phase(){int r=0;while(true){auto ND=D,NV=V;bool ch=false;for(int x=1;x<=n;x++)for(int y=1;y<=n;y++){if(x==y)continue;int b=16,bv=-1;for(int v=1;v<=n;v++){if(v==x||c[x][v]>=16)continue;int a=(P&&V[v][y]==x)?16:D[v][y];if(c[x][v]+a<b){b=c[x][v]+a;bv=v;}}if(b>=16){b=16;bv=-1;}if(b!=D[x][y]||bv!=V[x][y])ch=true;ND[x][y]=b;NV[x][y]=bv;}if(!ch)return r;D=ND;V=NV;r++;}}int main(){int m;scanf("%d %d %d",&n,&m,&P);for(int i=1;i<=n;i++)for(int j=1;j<=n;j++)c[i][j]=16;for(int i=0;i<m;i++){int u,v,w;scanf("%d %d %d",&u,&v,&w);c[u][v]=c[v][u]=w;}int cu,cv,cc;scanf("%d %d %d",&cu,&cv,&cc);D.assign(n+1,vector<int>(n+1,16));V.assign(n+1,vector<int>(n+1,-1));for(int x=1;x<=n;x++){D[x][x]=0;V[x][x]=x;for(int y=1;y<=n;y++)if(y!=x&&c[x][y]<16){D[x][y]=c[x][y];V[x][y]=y;}}int r1=phase();c[cu][cv]=c[cv][cu]=cc;int r2=phase();printf("%d %d\n",r1,r2);for(int x=1;x<=n;x++)for(int y=1;y<=n;y++)printf("%d%c",D[x][y],y==n?'\n':' ');}`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const[n,m,P]=d,I=16;const c=Array.from({length:n+1},()=>new Array(n+1).fill(I));let p=3;for(let i=0;i<m;i++){c[d[p]][d[p+1]]=c[d[p+1]][d[p]]=d[p+2];p+=3;}const[cu,cv,cc]=d.slice(p,p+3);let D=Array.from({length:n+1},()=>new Array(n+1).fill(I)),V=Array.from({length:n+1},()=>new Array(n+1).fill(-1));for(let x=1;x<=n;x++){D[x][x]=0;V[x][x]=x;for(let y=1;y<=n;y++)if(y!==x&&c[x][y]<I){D[x][y]=c[x][y];V[x][y]=y;}}function phase(){let r=0;for(;;){const ND=D.map(a=>a.slice()),NV=V.map(a=>a.slice());let ch=false;for(let x=1;x<=n;x++){const nb=[];for(let v=1;v<=n;v++)if(v!==x&&c[x][v]<I)nb.push(v);for(let y=1;y<=n;y++){if(y===x)continue;let b=I,bv=-1;for(const v of nb){const a=P&&V[v][y]===x?I:D[v][y];if(c[x][v]+a<b){b=c[x][v]+a;bv=v;}}if(b>=I){b=I;bv=-1;}if(b!==D[x][y]||bv!==V[x][y])ch=true;ND[x][y]=b;NV[x][y]=bv;}}if(!ch)return r;D=ND;V=NV;r++;}}const r1=phase();c[cu][cv]=c[cv][cu]=cc;const r2=phase();console.log(r1+" "+r2+"\n"+D.slice(1).map(a=>a.slice(1).join(" ")).join("\n"));`
  },
  'net.ip.fragment': {
    python: R`import sys
def main():
    d=sys.stdin.read().split();p=1;out=[]
    for _ in range(int(d[0])):
        L,k=int(d[p]),int(d[p+1]);ms=list(map(int,d[p+2:p+2+k]));p+=2+k
        fs=[(L-20,0,0)]
        for mtu in ms:
            mx=(mtu-20)//8*8;nf=[]
            for ln,off,mf in fs:
                if ln+20<=mtu: nf.append((ln,off,mf));continue
                pos=0
                while pos<ln:
                    c=min(mx,ln-pos);nf.append((c,off+pos//8,mf if pos+c==ln else 1));pos+=c
            fs=nf
        out.append(str(len(fs)))
        out.extend("%d %d %d"%(ln+20,off,mf) for ln,off,mf in fs)
    print("\n".join(out))
main()`,
    cpp: R`#include <string>
#include <vector>
#include <algorithm>
#include <cstdio>
#include <array>
using namespace std;int main(){int q;scanf("%d",&q);string o;char b[40];while(q--){int L,k;scanf("%d %d",&L,&k);vector<array<int,3>>f={{L-20,0,0}};for(int i=0;i<k;i++){int mtu;scanf("%d",&mtu);int mx=(mtu-20)/8*8;vector<array<int,3>>g;for(auto&x:f){if(x[0]+20<=mtu){g.push_back(x);continue;}for(int pos=0;pos<x[0];pos+=mx){int c=min(mx,x[0]-pos);g.push_back({c,x[1]+pos/8,pos+c==x[0]?x[2]:1});}}f=g;}o+=to_string(f.size())+"\n";for(auto&x:f){snprintf(b,40,"%d %d %d\n",x[0]+20,x[1],x[2]);o+=b;}}fputs(o.c_str(),stdout);}`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const o=[];let p=1;for(let t=0;t<d[0];t++){const L=d[p],k=d[p+1],ms=d.slice(p+2,p+2+k);p+=2+k;let f=[[L-20,0,0]];for(const mtu of ms){const mx=Math.floor((mtu-20)/8)*8,g=[];for(const[ln,off,mf]of f){if(ln+20<=mtu){g.push([ln,off,mf]);continue;}for(let pos=0;pos<ln;pos+=mx){const c=Math.min(mx,ln-pos);g.push([c,off+pos/8,pos+c===ln?mf:1]);}}f=g;}o.push(String(f.length));for(const[ln,off,mf]of f)o.push((ln+20)+" "+off+" "+mf);}console.log(o.join("\n"));`
  },
  'net.link.crc': {
    python: R`import sys
def rem(bits,g):
    r=len(g)-1;G=int(g,2);top=1<<r;x=0
    for ch in bits+"0"*r:
        x=(x<<1)|(ch=="1")
        if x&top: x^=G
    return format(x,"0%db"%r)
def main():
    d=sys.stdin.read().split();out=[]
    for i in range(int(d[0])):
        k,s,g=d[1+3*i],d[2+3*i],d[3+3*i];r=len(g)-1
        out.append(rem(s,g) if k=="E" else ("OK" if rem(s[:-r],g)==s[-r:] else "ERR"))
    print("\n".join(out))
main()`,
    cpp: R`#include <iostream>
#include <string>
using namespace std;string rem(const string&s,size_t n,const string&g){int r=g.size()-1;unsigned long long G=stoull(g,nullptr,2),top=1ULL<<r,x=0;for(size_t i=0;i<n+r;i++){x=x<<1|(i<n&&s[i]=='1');if(x&top)x^=G;}string o(r,'0');for(int i=0;i<r;i++)if(x>>(r-1-i)&1)o[i]='1';return o;}int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int q;cin>>q;string o,k,s,g;while(q--){cin>>k>>s>>g;size_t r=g.size()-1;if(k=="E")o+=rem(s,s.size(),g)+"\n";else o+=rem(s,s.size()-r,g)==s.substr(s.size()-r)?"OK\n":"ERR\n";}cout<<o;}`,
    javascript: R`const d=readInput().trim().split(/\s+/);const o=[];function rem(s,n,g){const r=g.length-1,G=BigInt("0b"+g);let x=0n;const top=1n<<BigInt(r);if(r<=31){let gx=parseInt(g,2),t=2**r,y=0;for(let i=0;i<n+r;i++){y=y*2+(i<n&&s[i]==="1"?1:0);if(y>=t)y=(y^gx)>>>0;}return y.toString(2).padStart(r,"0");}for(let i=0;i<n+r;i++){x=(x<<1n)|(i<n&&s[i]==="1"?1n:0n);if(x&top)x^=G;}return x.toString(2).padStart(r,"0");}for(let i=0;i<+d[0];i++){const k=d[1+3*i],s=d[2+3*i],g=d[3+3*i],r=g.length-1;o.push(k==="E"?rem(s,s.length,g):rem(s,s.length-r,g)===s.slice(-r)?"OK":"ERR");}console.log(o.join("\n"));`
  },
  'net.mac.backoff': {
    python: R`import sys,heapq
def main():
    d=sys.stdin.buffer.read().split();n=int(d[0]);K=[];at={};h=[]
    for i in range(n):
        row=d[1+16*i:17+16*i];s=int(row[0]);K.append(row[1:])
        if s not in at: at[s]=[];heapq.heappush(h,s)
        at[s].append(i)
    col=[0]*n;res=[-1]*n
    while h:
        t=heapq.heappop(h);w=at.pop(t)
        if len(w)==1: res[w[0]]=t;continue
        for i in w:
            col[i]+=1
            if col[i]>=16: continue
            nt=t+1+int(K[i][col[i]-1])
            if nt not in at: at[nt]=[];heapq.heappush(h,nt)
            at[nt].append(i)
    print("\n".join(map(str,res)))
main()`,
    cpp: R`#include <string>
#include <vector>
#include <map>
#include <cstdio>
#include <array>
using namespace std;int main(){int n;scanf("%d",&n);vector<array<int,15>>K(n);map<long long,vector<int>>at;for(int i=0;i<n;i++){long long s;scanf("%lld",&s);for(auto&k:K[i])scanf("%d",&k);at[s].push_back(i);}vector<int>col(n,0);vector<long long>res(n,-1);while(!at.empty()){auto it=at.begin();long long t=it->first;vector<int>w=move(it->second);at.erase(it);if(w.size()==1){res[w[0]]=t;continue;}for(int i:w){if(++col[i]>=16)continue;at[t+1+K[i][col[i]-1]].push_back(i);}}string o;for(auto x:res)o+=to_string(x)+"\n";fputs(o.c_str(),stdout);}`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const n=d[0],at=new Map(),h=[];const push=t=>{h.push(t);let i=h.length-1;while(i){const p=(i-1)>>1;if(h[p]<=h[i])break;[h[p],h[i]]=[h[i],h[p]];i=p;}};const pop=()=>{const top=h[0],l=h.pop();if(h.length){h[0]=l;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<h.length&&h[a]<h[m])m=a;if(b<h.length&&h[b]<h[m])m=b;if(m===i)break;[h[m],h[i]]=[h[i],h[m]];i=m;}}return top;};const add=(t,i)=>{if(!at.has(t)){at.set(t,[]);push(t);}at.get(t).push(i);};for(let i=0;i<n;i++)add(d[1+16*i],i);const col=new Array(n).fill(0),res=new Array(n).fill(-1);while(h.length){const t=pop(),w=at.get(t);at.delete(t);if(w.length===1){res[w[0]]=t;continue;}for(const i of w){if(++col[i]>=16)continue;add(t+1+d[1+16*i+col[i]],i);}}console.log(res.join("\n"));`
  },
  'net.link.switch-learning': {
    python: R`import sys
def main():
    d=sys.stdin.buffer.read().split();A,n=int(d[1]),int(d[2]);tab={};out=[];B=b"ff:ff:ff:ff:ff:ff"
    for i in range(n):
        t=int(d[3+4*i]);p=int(d[4+4*i]);s=d[5+4*i];x=d[6+4*i]
        tab[s]=(p,t)
        if x==B: out.append("FLOOD");continue
        e=tab.get(x)
        if e is None or t-e[1]>A:
            if e is not None: del tab[x]
            out.append("FLOOD")
        elif e[0]==p: out.append("FILTER")
        else: out.append("FORWARD %d"%e[0])
    print("\n".join(out))
main()`,
    cpp: R`#include <iostream>
#include <string>
#include <unordered_map>
#include <utility>
using namespace std;int main(){ios::sync_with_stdio(false);cin.tie(nullptr);long long P,A;int n;cin>>P>>A>>n;unordered_map<string,pair<int,long long>>t;t.reserve(1<<16);string o,s,x;for(int i=0;i<n;i++){long long tm;int p;cin>>tm>>p>>s>>x;t[s]={p,tm};if(x=="ff:ff:ff:ff:ff:ff"){o+="FLOOD\n";continue;}auto it=t.find(x);if(it==t.end()||tm-it->second.second>A){if(it!=t.end())t.erase(it);o+="FLOOD\n";}else if(it->second.first==p)o+="FILTER\n";else o+="FORWARD "+to_string(it->second.first)+"\n";}cout<<o;}`,
    javascript: R`const d=readInput().trim().split(/\s+/);const A=+d[1],n=+d[2],t=new Map(),o=[];for(let i=0;i<n;i++){const tm=+d[3+4*i],p=+d[4+4*i],s=d[5+4*i],x=d[6+4*i];t.set(s,[p,tm]);if(x==="ff:ff:ff:ff:ff:ff"){o.push("FLOOD");continue;}const e=t.get(x);if(!e||tm-e[1]>A){if(e)t.delete(x);o.push("FLOOD");}else if(e[0]===p)o.push("FILTER");else o.push("FORWARD "+e[0]);}console.log(o.join("\n"));`
  },
  'net.security.dh': {
    python: R`import sys
def main():
    d=sys.stdin.read().split();out=[]
    for i in range(int(d[0])):
        p,g,a,b=map(int,d[1+4*i:5+4*i]);A=pow(g,a,p);B=pow(g,b,p)
        out.append("%d %d %d"%(A,B,pow(B,a,p)))
    print("\n".join(out))
main()`,
    cpp: R`#include <string>
#include <cstdio>
using namespace std;typedef unsigned long long u;u mm(u a,u b,u p){return (unsigned __int128)a*b%p;}u pw(u g,u e,u p){u r=1;g%=p;while(e){if(e&1)r=mm(r,g,p);g=mm(g,g,p);e>>=1;}return r;}int main(){int q;scanf("%d",&q);string o;char b[80];while(q--){u p,g,a,bb;scanf("%llu %llu %llu %llu",&p,&g,&a,&bb);u A=pw(g,a,p),B=pw(g,bb,p);snprintf(b,80,"%llu %llu %llu\n",A,B,pw(B,a,p));o+=b;}fputs(o.c_str(),stdout);}`,
    javascript: R`const d=readInput().trim().split(/\s+/);const o=[];const pw=(g,e,p)=>{let r=1n;g%=p;while(e>0n){if(e&1n)r=r*g%p;g=g*g%p;e>>=1n;}return r;};for(let i=0;i<+d[0];i++){const[p,g,a,b]=d.slice(1+4*i,5+4*i).map(BigInt);const A=pw(g,a,p),B=pw(g,b,p);o.push(A+" "+B+" "+pw(B,a,p));}console.log(o.join("\n"));`
  },
  'net.web.page-load': {
    python: R`import sys
def main():
    d=sys.stdin.read().split();p=1;out=[]
    for _ in range(int(d[0])):
        dns,rtt,tls=int(d[p]),int(d[p+1]),int(d[p+2]);mode,k,main_d,m=d[p+3],int(d[p+4]),d[p+5],int(d[p+6]);p+=7
        h={0:0,12:2,13:1}[tls];worst=0
        for _ in range(m):
            dom,c=d[p],int(d[p+1]);p+=2;o=dom!=main_d
            if mode=="NP": t=(dns if o else 0)+(c+k-1)//k*(2+h)*rtt
            elif mode=="P": t=(dns+(1+h)*rtt if o else 0)+c*rtt
            else: t=(dns+(1+h)*rtt if o else 0)+rtt
            worst=max(worst,t)
        out.append(str(dns+(2+h)*rtt+worst))
    print("\n".join(out))
main()`,
    cpp: R`#include <iostream>
#include <string>
#include <algorithm>
using namespace std;int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int q;cin>>q;string o;while(q--){long long dns,rtt,k;int tls,m;string mode,md;cin>>dns>>rtt>>tls>>mode>>k>>md>>m;long long h=tls==0?0:tls==12?2:1,w=0;for(int i=0;i<m;i++){string dom;long long c;cin>>dom>>c;bool ot=dom!=md;long long t=mode=="NP"?(ot?dns:0)+(c+k-1)/k*(2+h)*rtt:mode=="P"?(ot?dns+(1+h)*rtt:0)+c*rtt:(ot?dns+(1+h)*rtt:0)+rtt;w=max(w,t);}o+=to_string(dns+(2+h)*rtt+w)+"\n";}cout<<o;}`,
    javascript: R`const d=readInput().trim().split(/\s+/);const o=[];let p=1;for(let t=0;t<+d[0];t++){const dns=+d[p],rtt=+d[p+1],tls=+d[p+2],mode=d[p+3],k=+d[p+4],md=d[p+5],m=+d[p+6];p+=7;const h=tls===0?0:tls===12?2:1;let w=0;for(let i=0;i<m;i++){const dom=d[p],c=+d[p+1];p+=2;const ot=dom!==md;const x=mode==="NP"?(ot?dns:0)+Math.ceil(c/k)*(2+h)*rtt:mode==="P"?(ot?dns+(1+h)*rtt:0)+c*rtt:(ot?dns+(1+h)*rtt:0)+rtt;if(x>w)w=x;}o.push(String(dns+(2+h)*rtt+w));}console.log(o.join("\n"));`
  },
  'net.review.tcp-trace': {
    python: R`import sys
def main():
    d=sys.stdin.buffer.read().split();n=int(d[0]);C={};order=[]
    for i in range(n):
        s,x,f=d[1+5*i],d[2+5*i],d[3+5*i];seq,ln=int(d[4+5*i]),int(d[5+5*i])
        key=(s,x) if s<x else (x,s);c=C.get(key)
        if c is None:
            c=C[key]={"cl":s,"sv":x,"hi":{},"by":{s:0,x:0},"re":0,"fin":set(),"rst":False};order.append(key)
        if b"R" in f: c["rst"]=True
        if b"S" in f: c["hi"][s]=seq+1;continue
        if ln>0:
            hi=c["hi"][s];e=seq+ln
            if e<=hi: c["re"]+=1
            else: c["by"][s]+=e-max(seq,hi);c["hi"][s]=e
        if b"F" in f: c["fin"].add(s);c["hi"][s]=max(c["hi"][s],seq+ln+1)
    out=[]
    for k in order:
        c=C[k];st="RESET" if c["rst"] else ("CLOSED" if len(c["fin"])==2 else "OPEN")
        out.append("%s > %s %d %d %d %s"%(c["cl"].decode(),c["sv"].decode(),c["by"][c["cl"]],c["by"][c["sv"]],c["re"],st))
    print("\n".join(out))
main()`,
    cpp: R`#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>
using namespace std;struct Cn{string cl,sv;long long hi[2]={0,0},by[2]={0,0};int re=0;bool fin[2]={0,0},rst=0;};int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;unordered_map<string,int>id;vector<Cn>v;string s,x,f;for(int i=0;i<n;i++){long long seq,ln;cin>>s>>x>>f>>seq>>ln;string key=s<x?s+" "+x:x+" "+s;auto it=id.find(key);int c;if(it==id.end()){c=v.size();id[key]=c;Cn z;z.cl=s;z.sv=x;v.push_back(z);}else c=it->second;Cn&C=v[c];int dir=s==C.cl?0:1;if(f.find('R')!=string::npos)C.rst=1;if(f.find('S')!=string::npos){C.hi[dir]=seq+1;continue;}if(ln>0){long long e=seq+ln;if(e<=C.hi[dir])C.re++;else{C.by[dir]+=e-max(seq,C.hi[dir]);C.hi[dir]=e;}}if(f.find('F')!=string::npos){C.fin[dir]=1;C.hi[dir]=max(C.hi[dir],seq+ln+1);}}string o;for(auto&C:v)o+=C.cl+" > "+C.sv+" "+to_string(C.by[0])+" "+to_string(C.by[1])+" "+to_string(C.re)+" "+(C.rst?"RESET":C.fin[0]&&C.fin[1]?"CLOSED":"OPEN")+"\n";cout<<o;}`,
    javascript: R`const d=readInput().trim().split(/\s+/);const n=+d[0],M=new Map(),v=[];for(let i=0;i<n;i++){const s=d[1+5*i],x=d[2+5*i],f=d[3+5*i],seq=+d[4+5*i],ln=+d[5+5*i];const key=s<x?s+" "+x:x+" "+s;let c=M.get(key);if(!c){c={cl:s,sv:x,hi:[0,0],by:[0,0],re:0,fin:[0,0],rst:0};M.set(key,c);v.push(c);}const r=s===c.cl?0:1;if(f.includes("R"))c.rst=1;if(f.includes("S")){c.hi[r]=seq+1;continue;}if(ln>0){const e=seq+ln;if(e<=c.hi[r])c.re++;else{c.by[r]+=e-Math.max(seq,c.hi[r]);c.hi[r]=e;}}if(f.includes("F")){c.fin[r]=1;c.hi[r]=Math.max(c.hi[r],seq+ln+1);}}console.log(v.map(c=>c.cl+" > "+c.sv+" "+c.by[0]+" "+c.by[1]+" "+c.re+" "+(c.rst?"RESET":c.fin[0]&&c.fin[1]?"CLOSED":"OPEN")).join("\n"));`
  }
};
