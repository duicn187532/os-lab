// ICS 程式實作題的參考解（測試用）：確認每題的 I/O 規格在每種語言都寫得出來、測資正確、時限合理。
const R = String.raw;
module.exports = {
  'ics.algorithm.max-count': {
    cpp: R`#include <iostream>
using namespace std;int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;long long best,c=0;cin>>best;c=1;for(int i=1;i<n;i++){long long x;cin>>x;if(x>best){best=x;c=1;}else if(x==best)c++;}cout<<best<<" "<<c<<"\n";}`,
    python: R`import sys
d=sys.stdin.buffer.read().split();n=int(d[0]);a=list(map(int,d[1:1+n]));m=max(a);print(m,a.count(m))`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const a=d.slice(1,1+d[0]);let b=a[0],c=0;for(const x of a){if(x>b){b=x;c=1}else if(x===b)c++}console.log(b+" "+c);`,
    c: R`#include <stdio.h>
int main(void){int n;long long b,x,c=1;scanf("%d %lld",&n,&b);for(int i=1;i<n;i++){scanf("%lld",&x);if(x>b){b=x;c=1;}else if(x==b)c++;}printf("%lld %lld\n",b,c);return 0;}`
  },
  'ics.number.base-convert': {
    cpp: R`#include <iostream>
#include <string>
#include <algorithm>
using namespace std;int main(){int q;cin>>q;const string D="0123456789ABCDEF";while(q--){long long n;int b;cin>>n>>b;string s;if(n==0)s="0";while(n>0){s+=D[n%b];n/=b;}reverse(s.begin(),s.end());cout<<s<<"\n";}}`,
    python: R`import sys
d=sys.stdin.read().split();q=int(d[0]);D="0123456789ABCDEF";o=[]
for k in range(q):
    n,b=int(d[1+2*k]),int(d[2+2*k]);s=""
    while n>0: s=D[n%b]+s;n//=b
    o.append(s or "0")
print("\n".join(o))`,
    javascript: R`const d=readInput().trim().split(/\s+/);const o=[];for(let k=0;k<+d[0];k++)o.push(BigInt(d[1+2*k]).toString(+d[2+2*k]).toUpperCase());console.log(o.join("\n"));`,
    c: R`#include <stdio.h>
int main(void){int q;scanf("%d",&q);while(q--){long long n;int b;scanf("%lld %d",&n,&b);char t[70];int l=0;if(!n)t[l++]='0';while(n){t[l++]="0123456789ABCDEF"[n%b];n/=b;}while(l)putchar(t[--l]);putchar('\n');}return 0;}`
  },
  'ics.data.twos-complement': {
    cpp: R`#include <iostream>
#include <string>
using namespace std;int main(){int q;cin>>q;while(q--){char t;cin>>t;if(t=='E'){int w;long long x;cin>>w>>x;unsigned long long u=(unsigned long long)(x+(1LL<<w))&((1ULL<<w)-1);string s(w,'0');for(int i=0;i<w;i++)if(u>>(w-1-i)&1)s[i]='1';cout<<s<<"\n";}else{string s;cin>>s;int w=s.size();long long v=0;for(char c:s)v=v*2+(c-'0');if(s[0]=='1')v-=1LL<<w;cout<<v<<"\n";}}}`,
    python: R`import sys
d=sys.stdin.read().split();q=int(d[0]);p=1;o=[]
for _ in range(q):
    if d[p]=="E":
        w,x=int(d[p+1]),int(d[p+2]);p+=3;o.append(format(x%(1<<w),"0%db"%w))
    else:
        s=d[p+1];p+=2;v=int(s,2);o.append(str(v-(1<<len(s)) if s[0]=="1" else v))
print("\n".join(o))`,
    javascript: R`const d=readInput().trim().split(/\s+/);let p=1;const o=[];for(let k=0;k<+d[0];k++){if(d[p]==="E"){const w=+d[p+1],x=+d[p+2];p+=3;o.push(((x%2**w+2**w)%2**w).toString(2).padStart(w,"0"))}else{const s=d[p+1];p+=2;const v=parseInt(s,2);o.push(String(s[0]==="1"?v-2**s.length:v))}}console.log(o.join("\n"));`
  },
  'ics.logic.binary-add': {
    cpp: R`#include <iostream>
#include <string>
#include <algorithm>
using namespace std;int main(){string a,b,r;cin>>a>>b;int i=a.size()-1,j=b.size()-1,c=0;while(i>=0||j>=0||c){int s=c+(i>=0?a[i--]-'0':0)+(j>=0?b[j--]-'0':0);r+=char('0'+s%2);c=s/2;}while(r.size()>1&&r.back()=='0')r.pop_back();reverse(r.begin(),r.end());cout<<r<<"\n";}`,
    python: R`a=input().strip();b=input().strip();print(bin(int(a,2)+int(b,2))[2:])`,
    javascript: R`const [a,b]=readInput().trim().split(/\s+/);const r=[];let i=a.length-1,j=b.length-1,c=0;while(i>=0||j>=0||c){const s=c+(i>=0?+a[i--]:0)+(j>=0?+b[j--]:0);r.push(s%2);c=s>>1}while(r.length>1&&r[r.length-1]===0)r.pop();console.log(r.reverse().join(""));`
  },
  'ics.cpu.accumulator': {
    cpp: R`#include <iostream>
using namespace std;int main(){long long m[100]={0};int n;cin>>n;for(int i=0;i<n;i++)cin>>m[i];int pc=0;long long acc=0,st=0;for(;;){long long ir=m[pc++];st++;int op=ir/100,a=ir%100;if(op==0)break;if(op==1)acc=m[a];else if(op==2)acc+=m[a];else if(op==3)acc-=m[a];else if(op==4)m[a]=acc;else if(op==5)pc=a;else if(op==6){if(acc==0)pc=a;}else if(op==7){if(acc<0)pc=a;}}cout<<st<<"\n"<<acc<<"\n"<<m[99]<<"\n";}`,
    python: R`import sys
d=sys.stdin.read().split();n=int(d[0]);m=[0]*100
for i in range(n): m[i]=int(d[1+i])
pc=0;acc=0;st=0
while True:
    ir=m[pc];pc+=1;st+=1;op=ir//100;a=ir%100
    if op==0: break
    if op==1: acc=m[a]
    elif op==2: acc+=m[a]
    elif op==3: acc-=m[a]
    elif op==4: m[a]=acc
    elif op==5: pc=a
    elif op==6:
        if acc==0: pc=a
    elif op==7:
        if acc<0: pc=a
print(st);print(acc);print(m[99])`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const m=new Array(100).fill(0);for(let i=0;i<d[0];i++)m[i]=d[1+i];let pc=0,acc=0,st=0;for(;;){const ir=m[pc++];st++;const op=Math.floor(ir/100),a=ir%100;if(op===0)break;if(op===1)acc=m[a];else if(op===2)acc+=m[a];else if(op===3)acc-=m[a];else if(op===4)m[a]=acc;else if(op===5)pc=a;else if(op===6){if(acc===0)pc=a}else if(op===7){if(acc<0)pc=a}}console.log(st+"\n"+acc+"\n"+m[99]);`
  },
  'ics.os.fcfs': {
    cpp: R`#include <cstdio>
#include <vector>
#include <algorithm>
using namespace std;int main(){int n;scanf("%d",&n);vector<long long>a(n),b(n),w(n);vector<int>o(n);for(int i=0;i<n;i++){scanf("%lld %lld",&a[i],&b[i]);o[i]=i;}stable_sort(o.begin(),o.end(),[&](int x,int y){return a[x]<a[y];});long long t=0,tot=0;for(int i:o){if(t<a[i])t=a[i];w[i]=t-a[i];tot+=w[i];t+=b[i];}for(int i=0;i<n;i++)printf("%lld\n",w[i]);printf("%lld\n",tot);}`,
    python: R`import sys
d=sys.stdin.buffer.read().split();n=int(d[0]);a=list(map(int,d[1:1+2*n:2]));b=list(map(int,d[2:2+2*n:2]))
w=[0]*n;t=tot=0
for i in sorted(range(n),key=lambda i:a[i]):
    if t<a[i]: t=a[i]
    w[i]=t-a[i];tot+=w[i];t+=b[i]
print("\n".join(map(str,w)));print(tot)`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const n=d[0];const o=[...Array(n).keys()].sort((x,y)=>d[1+2*x]-d[1+2*y]||x-y);const w=new Array(n);let t=0,tot=0;for(const i of o){const a=d[1+2*i];if(t<a)t=a;w[i]=t-a;tot+=t-a;t+=d[2+2*i]}console.log(w.join("\n")+"\n"+tot);`
  },
  'ics.network.subnet': {
    cpp: R`#include <cstdio>
#include <cstdint>
void p(uint32_t x){printf("%u.%u.%u.%u",x>>24,(x>>16)&255,(x>>8)&255,x&255);}
int main(){int q;scanf("%d",&q);while(q--){unsigned a,b,c,d,k;scanf("%u.%u.%u.%u/%u",&a,&b,&c,&d,&k);uint32_t ip=(a<<24)|(b<<16)|(c<<8)|d,m=k?0xFFFFFFFFu<<(32-k):0,n=ip&m;p(n);printf(" ");p(n|~m);printf(" %lld\n",(1LL<<(32-k))-2);}}`,
    python: R`import sys
t=sys.stdin.read().split();o=[]
f=lambda x:".".join(str(x>>s&255) for s in (24,16,8,0))
for it in t[1:1+int(t[0])]:
    ad,k=it.split("/");k=int(k);a,b,c,d=map(int,ad.split("."));ip=a<<24|b<<16|c<<8|d
    m=((1<<32)-1)^((1<<(32-k))-1);n=ip&m;o.append(f(n)+" "+f(n|((1<<(32-k))-1))+" "+str((1<<(32-k))-2))
print("\n".join(o))`,
    javascript: R`const s=x=>[x>>>24,(x>>>16)&255,(x>>>8)&255,x&255].join(".");const t=readInput().trim().split(/\s+/);const o=[];for(let i=1;i<=+t[0];i++){const [ad,ks]=t[i].split("/");const k=+ks;const [a,b,c,d]=ad.split(".").map(Number);const ip=((a<<24)|(b<<16)|(c<<8)|d)>>>0;const m=k?(0xFFFFFFFF<<(32-k))>>>0:0;const n=(ip&m)>>>0;o.push(s(n)+" "+s((n|~m)>>>0)+" "+(2**(32-k)-2))}console.log(o.join("\n"));`
  },
  'ics.io.greeting': {
    cpp: R`#include <iostream>
#include <string>
using namespace std;int main(){string n,m;int a;cin>>n>>a;getline(cin>>ws,m);if(!m.empty()&&m.back()=='\r')m.pop_back();cout<<"Hi, "<<n<<"! Next year you will be "<<a+1<<".\n"<<"Motto: ["<<m<<"]\n";}`,
    python: R`n,a=input().split();m=input().rstrip("\r");print(f"Hi, {n}! Next year you will be {int(a)+1}.");print(f"Motto: [{m}]")`,
    javascript: R`const l=readInput().split("\n");const [n,a]=l[0].trim().split(/\s+/);console.log("Hi, "+n+"! Next year you will be "+(+a+1)+".\nMotto: ["+l[1].replace(/\r$/,"")+"]");`
  },
  'ics.types.seconds': {
    cpp: R`#include <cstdio>
int main(){int q;scanf("%d",&q);while(q--){long long t;scanf("%lld",&t);printf("%lld:%02lld:%02lld\n",t/3600,t%3600/60,t%60);}}`,
    python: R`import sys
d=sys.stdin.buffer.read().split();print("\n".join("%d:%02d:%02d"%(t//3600,t%3600//60,t%60) for t in map(int,d[1:1+int(d[0])])))`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const o=[];const p=x=>String(x).padStart(2,"0");for(let i=1;i<=d[0];i++){const t=d[i];o.push(Math.floor(t/3600)+":"+p(Math.floor(t%3600/60))+":"+p(t%60))}console.log(o.join("\n"));`
  },
  'ics.branch.days-in-month': {
    cpp: R`#include <cstdio>
int main(){int q;scanf("%d",&q);while(q--){int y,m;scanf("%d %d",&y,&m);int d;switch(m){case 4:case 6:case 9:case 11:d=30;break;case 2:d=((y%4==0&&y%100!=0)||y%400==0)?29:28;break;default:d=31;}printf("%d\n",d);}}`,
    python: R`import sys
d=sys.stdin.buffer.read().split();o=[]
for i in range(int(d[0])):
    y,m=int(d[1+2*i]),int(d[2+2*i])
    o.append(str((29 if (y%4==0 and y%100!=0) or y%400==0 else 28) if m==2 else 30 if m in (4,6,9,11) else 31))
print("\n".join(o))`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const o=[];for(let i=0;i<d[0];i++){const y=d[1+2*i],m=d[2+2*i];o.push(m===2?((y%4===0&&y%100!==0)||y%400===0?29:28):[4,6,9,11].includes(m)?30:31)}console.log(o.join("\n"));`
  },
  'ics.loop.count-primes': {
    cpp: R`#include <cstdio>
#include <vector>
int main(){const int N=3000000;std::vector<char>c(N+1,0);std::vector<int>k(N+1,0);for(int i=2;i<=N;i++){k[i]=k[i-1];if(!c[i]){k[i]++;for(long long j=1LL*i*i;j<=N;j+=i)c[j]=1;}}int q;scanf("%d",&q);while(q--){int n;scanf("%d",&n);printf("%d\n",k[n]);}}`,
    python: R`import sys
from itertools import accumulate
N=3000000;s=bytearray([1])*(N+1);s[0]=s[1]=0
for i in range(2,int(N**.5)+1):
    if s[i]: s[i*i::i]=bytes(len(range(i*i,N+1,i)))
k=list(accumulate(s))
d=sys.stdin.buffer.read().split();print("\n".join(str(k[int(x)]) for x in d[1:1+int(d[0])]))`,
    javascript: R`const N=3000000,c=new Uint8Array(N+1),k=new Int32Array(N+1);for(let i=2;i<=N;i++){k[i]=k[i-1];if(!c[i]){k[i]++;for(let j=i*i;j<=N;j+=i)c[j]=1}}const d=readInput().trim().split(/\s+/).map(Number);const o=[];for(let i=1;i<=d[0];i++)o.push(k[d[i]]);console.log(o.join("\n"));`
  },
  'ics.function.gcd-lcm': {
    cpp: R`#include <cstdio>
long long g(long long a,long long b){while(b){long long r=a%b;a=b;b=r;}return a;}
int main(){int q;scanf("%d",&q);while(q--){long long a,b;scanf("%lld %lld",&a,&b);long long x=g(a,b);printf("%lld %lld\n",x,a/x*b);}}`,
    python: R`import sys
def g(a,b):
    while b: a,b=b,a%b
    return a
d=sys.stdin.buffer.read().split();o=[]
for i in range(int(d[0])):
    a,b=int(d[1+2*i]),int(d[2+2*i]);x=g(a,b);o.append("%d %d"%(x,a//x*b))
print("\n".join(o))`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const o=[];for(let i=0;i<d[0];i++){let a=d[1+2*i],b=d[2+2*i];const A=a,B=b;while(b){[a,b]=[b,a%b]}o.push(a+" "+(BigInt(A/a)*BigInt(B)))}console.log(o.join("\n"));`
  },
  'ics.array.score-stats': {
    cpp: R`#include <cstdio>
#include <vector>
int main(){int n;scanf("%d",&n);std::vector<long long>s(n);long long sum=0,hi,lo;for(int i=0;i<n;i++){scanf("%lld",&s[i]);sum+=s[i];}hi=lo=s[0];for(long long x:s){if(x>hi)hi=x;if(x<lo)lo=x;}int ab=0;for(long long x:s)if(x*n>sum)ab++;printf("%lld %lld %lld\n%.2f\n%d\n",sum,hi,lo,(double)sum/n,ab);}`,
    python: R`import sys
d=sys.stdin.buffer.read().split();n=int(d[0]);s=list(map(int,d[1:1+n]));t=sum(s)
print(t,max(s),min(s));print("%.2f"%(t/n));print(sum(1 for x in s if x*n>t))`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const n=d[0],s=d.slice(1,1+n);let t=0,hi=s[0],lo=s[0];for(const x of s){t+=x;if(x>hi)hi=x;if(x<lo)lo=x}console.log(t+" "+hi+" "+lo+"\n"+(t/n).toFixed(2)+"\n"+s.filter(x=>x*n>t).length);`
  },
  'ics.string.palindrome': {
    cpp: R`#include <iostream>
#include <string>
#include <cctype>
using namespace std;bool p(const string&s){int i=0,j=(int)s.size()-1;while(i<j){if(!isalnum((unsigned char)s[i])){i++;continue;}if(!isalnum((unsigned char)s[j])){j--;continue;}if(tolower((unsigned char)s[i])!=tolower((unsigned char)s[j]))return false;i++;j--;}return true;}
int main(){int q;cin>>q;string l;getline(cin,l);while(q--){getline(cin,l);if(!l.empty()&&l.back()=='\r')l.pop_back();cout<<(p(l)?"Yes":"No")<<"\n";}}`,
    python: R`import sys
L=sys.stdin.read().split("\n");o=[]
for k in range(int(L[0])):
    t=[c.lower() for c in L[1+k] if c.isascii() and c.isalnum()];o.append("Yes" if t==t[::-1] else "No")
print("\n".join(o))`,
    javascript: R`const L=readInput().split("\n");const o=[];for(let k=1;k<=+L[0];k++){const t=L[k].toLowerCase().replace(/[^a-z0-9]/g,"");o.push(t===[...t].reverse().join("")?"Yes":"No")}console.log(o.join("\n"));`
  },
  'ics.pointer.reverse-ranges': {
    cpp: R`#include <cstdio>
#include <utility>
int a[3000];int main(){int n,q;scanf("%d %d",&n,&q);for(int i=0;i<n;i++)scanf("%d",&a[i]);while(q--){int l,r;scanf("%d %d",&l,&r);int*x=&a[l-1],*y=&a[r-1];while(x<y)std::swap(*x++,*y--);}for(int i=0;i<n;i++)printf("%d%c",a[i],i+1<n?' ':'\n');}`,
    python: R`import sys
d=sys.stdin.buffer.read().split();n,q=int(d[0]),int(d[1]);a=d[2:2+n];p=2+n
for _ in range(q):
    l,r=int(d[p])-1,int(d[p+1]);p+=2;a[l:r]=a[l:r][::-1]
print(b" ".join(a).decode())`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const n=d[0],q=d[1],a=d.slice(2,2+n);let p=2+n;for(let k=0;k<q;k++){let l=d[p]-1,r=d[p+1]-1;p+=2;while(l<r){const t=a[l];a[l++]=a[r];a[r--]=t}}console.log(a.join(" "));`
  },
  'ics.class.sort-students': {
    cpp: R`#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;struct S{string n;int s;};int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<S>v(n);for(auto&x:v)cin>>x.n>>x.s;sort(v.begin(),v.end(),[](const S&a,const S&b){return a.s!=b.s?a.s>b.s:a.n<b.n;});for(auto&x:v)cout<<x.n<<" "<<x.s<<"\n";}`,
    python: R`import sys
d=sys.stdin.read().split();n=int(d[0]);v=sorted(((d[1+2*i],int(d[2+2*i])) for i in range(n)),key=lambda s:(-s[1],s[0]))
print("\n".join("%s %d"%x for x in v))`,
    javascript: R`const d=readInput().trim().split(/\s+/);const v=[];for(let i=0;i<+d[0];i++)v.push([d[1+2*i],+d[2+2*i]]);v.sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0));console.log(v.map(x=>x[0]+" "+x[1]).join("\n"));`
  },
  'ics.recursion.permutations': {
    cpp: R`#include <cstdio>
int n,c[9],u[9],l;void go(){if(l==n){for(int i=0;i<n;i++)printf("%d%c",c[i],i+1<n?' ':'\n');return;}for(int x=1;x<=n;x++)if(!u[x]){u[x]=1;c[l++]=x;go();l--;u[x]=0;}}int main(){scanf("%d",&n);go();}`,
    python: R`import sys
from itertools import permutations
n=int(input());sys.stdout.write("\n".join(" ".join(map(str,p)) for p in permutations(range(1,n+1)))+"\n")`,
    javascript: R`const n=+readInput().trim();const c=[],u=[],o=[];(function go(){if(c.length===n){o.push(c.join(" "));return}for(let x=1;x<=n;x++)if(!u[x]){u[x]=1;c.push(x);go();c.pop();u[x]=0}})();console.log(o.join("\n"));`
  },
  'ics.complexity.sort-unique': {
    cpp: R`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<int>v(n);for(int&x:v)cin>>x;sort(v.begin(),v.end());v.erase(unique(v.begin(),v.end()),v.end());cout<<v.size()<<"\n";for(size_t i=0;i<v.size();i++)cout<<v[i]<<(i+1<v.size()?" ":"\n");}`,
    python: R`import sys
d=sys.stdin.buffer.read().split();v=sorted(set(map(int,d[1:1+int(d[0])])));print(len(v));print(" ".join(map(str,v)))`,
    javascript: R`const d=readInput().trim().split(/\s+/).map(Number);const v=[...new Set(d.slice(1,1+d[0]))].sort((a,b)=>a-b);console.log(v.length+"\n"+v.join(" "));`
  },
  'ics.security.caesar': {
    cpp: R`#include <iostream>
#include <string>
using namespace std;int main(){int q;cin>>q;while(q--){char m;long long k;string s;cin>>m>>k;getline(cin>>ws,s);if(!s.empty()&&s.back()=='\r')s.pop_back();if(m=='D')k=-k;k=((k%26)+26)%26;for(char&c:s){if(c>='A'&&c<='Z')c=char((c-'A'+k)%26+'A');else if(c>='a'&&c<='z')c=char((c-'a'+k)%26+'a');}cout<<s<<"\n";}}`,
    python: R`import sys
L=sys.stdin.read().split("\n");o=[]
for i in range(int(L[0])):
    m,k=L[1+2*i].split();k=int(k)*(1 if m=="E" else -1)%26;s=L[2+2*i].rstrip("\r")
    o.append("".join(chr((ord(c)-65+k)%26+65) if "A"<=c<="Z" else chr((ord(c)-97+k)%26+97) if "a"<=c<="z" else c for c in s))
print("\n".join(o))`,
    javascript: R`const L=readInput().split("\n");const o=[];for(let i=0;i<+L[0];i++){const [m,ks]=L[1+2*i].trim().split(/\s+/);let k=(m==="E"?1:-1)*Number(ks);k=((k%26)+26)%26;o.push(L[2+2*i].replace(/\r$/,"").replace(/[A-Za-z]/g,c=>{const b=c<="Z"?65:97;return String.fromCharCode((c.charCodeAt(0)-b+k)%26+b)}))}console.log(o.join("\n"));`
  },
  'ics.project.bank': {
    cpp: R`#include <iostream>
#include <unordered_map>
#include <string>
using namespace std;int main(){ios::sync_with_stdio(false);cin.tie(nullptr);unordered_map<string,long long>b;int q;cin>>q;string c,a,d;long long x;while(q--){cin>>c>>a;if(c=="OPEN"){if(b.count(a))cout<<"ERROR\n";else{b[a]=0;cout<<"OK\n";}}else if(c=="BALANCE"){auto it=b.find(a);if(it==b.end())cout<<"ERROR\n";else cout<<it->second<<"\n";}else if(c=="DEPOSIT"){cin>>x;auto it=b.find(a);if(it==b.end()||x<=0)cout<<"ERROR\n";else cout<<(it->second+=x)<<"\n";}else if(c=="WITHDRAW"){cin>>x;auto it=b.find(a);if(it==b.end()||x<=0||x>it->second)cout<<"ERROR\n";else cout<<(it->second-=x)<<"\n";}else{cin>>d>>x;auto i=b.find(a),j=b.find(d);if(i==b.end()||j==b.end()||a==d||x<=0||x>i->second)cout<<"ERROR\n";else{i->second-=x;j->second+=x;cout<<i->second<<" "<<j->second<<"\n";}}}}`,
    python: R`import sys
L=sys.stdin.read().split("\n");b={};o=[];E="ERROR"
for line in L[1:1+int(L[0])]:
    p=line.split();c=p[0];a=p[1]
    if c=="OPEN":
        if a in b: o.append(E)
        else: b[a]=0;o.append("OK")
    elif c=="BALANCE": o.append(str(b[a]) if a in b else E)
    elif c=="DEPOSIT":
        x=int(p[2])
        if a not in b or x<=0: o.append(E)
        else: b[a]+=x;o.append(str(b[a]))
    elif c=="WITHDRAW":
        x=int(p[2])
        if a not in b or x<=0 or x>b[a]: o.append(E)
        else: b[a]-=x;o.append(str(b[a]))
    else:
        d=p[2];x=int(p[3])
        if a not in b or d not in b or a==d or x<=0 or x>b[a]: o.append(E)
        else: b[a]-=x;b[d]+=x;o.append("%d %d"%(b[a],b[d]))
print("\n".join(o))`,
    javascript: R`const L=readInput().split("\n");const b=new Map(),o=[],E="ERROR";for(let i=1;i<=+L[0];i++){const p=L[i].trim().split(/\s+/),c=p[0],a=p[1];if(c==="OPEN"){if(b.has(a))o.push(E);else{b.set(a,0n);o.push("OK")}}else if(c==="BALANCE")o.push(b.has(a)?String(b.get(a)):E);else if(c==="DEPOSIT"){const x=BigInt(p[2]);if(!b.has(a)||x<=0n)o.push(E);else{b.set(a,b.get(a)+x);o.push(String(b.get(a)))}}else if(c==="WITHDRAW"){const x=BigInt(p[2]);if(!b.has(a)||x<=0n||x>b.get(a))o.push(E);else{b.set(a,b.get(a)-x);o.push(String(b.get(a)))}}else{const d=p[2],x=BigInt(p[3]);if(!b.has(a)||!b.has(d)||a===d||x<=0n||x>b.get(a))o.push(E);else{b.set(a,b.get(a)-x);b.set(d,b.get(d)+x);o.push(b.get(a)+" "+b.get(d))}}}console.log(o.join("\n"));`
  }
};
