/* Native end-to-end grading regression: solves FIFO in four languages,
 * rejects wrong answers, and confirms the local grader does NOT auto-pass starters.
 * The exercise oracle and the student's code are separate processes.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-student-test-'));
const runner=path.join(__dirname,'..','os/linux-labs/student-verify.cjs');
const solutions={
 c:`#include <stdio.h>
int main(void){int q;if(scanf("%d",&q)!=1)return 1;
while(q--){int cap,n,frames[8],len=0,miss=0,p;scanf("%d %d",&cap,&n);
for(int k=0;k<n;k++){scanf("%d",&p);int found=0;for(int i=0;i<len;i++)if(frames[i]==p)found=1;
if(!found){miss++;if(len==cap){for(int i=1;i<len;i++)frames[i-1]=frames[i];len--;}
frames[len++]=p;}}
printf("%d\\n",miss);}return 0;}`,
 cpp:`#include <iostream>
#include <vector>
using namespace std;
int main(){int q;cin>>q;while(q--){int c,n,p,f=0;cin>>c>>n;vector<int> a;
while(n--){cin>>p;bool hit=false;for(int v:a)if(v==p)hit=true;
if(!hit){f++;if((int)a.size()==c)a.erase(a.begin());a.push_back(p);}}
cout<<f<<'\\n';}}`,
 python:`import sys
a=iter(map(int,sys.stdin.read().split()))
for _ in range(next(a)):
    c,n=next(a),next(a); frames=[]; misses=0
    for _ in range(n):
        p=next(a)
        if p not in frames:
            misses+=1
            if len(frames)==c: frames.pop(0)
            frames.append(p)
    print(misses)`,
 javascript:`const a=readInput().trim().split(/\\s+/).map(Number);let i=0,q=a[i++];
while(q--){let cap=a[i++],n=a[i++],f=[],miss=0;
while(n--){let p=a[i++];if(!f.includes(p)){miss++;if(f.length===cap)f.shift();f.push(p);}}
console.log(miss);}`
};
try{
 for(const [lang,src] of Object.entries(solutions)){
   const ext={c:'c',cpp:'cpp',python:'py',javascript:'js'}[lang],p=path.join(dir,'solution.'+ext);
   fs.writeFileSync(p,src);
   const r=spawnSync('node',[runner,'--chapter','7','--language',lang,'--source',p],
      {encoding:'utf8',timeout:30000});
   assert.equal(r.status,0,lang+' must pass '+r.stdout+' '+r.stderr);
   assert.match(r.stdout,/RESULT 3\/3 groups passed, 0 failed/);
   console.log('AC '+lang+' 3/3 public+hidden case groups');
 }
 const broken=path.join(dir,'wrong.js');fs.writeFileSync(broken,'console.log("0");');
 const fail=spawnSync('node',[runner,'--chapter','7','--language','javascript','--source',broken],
   {encoding:'utf8',timeout:10000});
 assert.equal(fail.status,1,'Wrong student answer must be rejected');
 assert.match(fail.stdout,/WRONG ANSWER|RUNTIME ERROR/);
 console.log('REJECTED incorrect student solution');
 const syntax=path.join(dir,'syntax.c');fs.writeFileSync(syntax,'int main( {');
 const compile=spawnSync('node',[runner,'--chapter','7','--language','c','--source',syntax],
   {encoding:'utf8',timeout:20000});
 assert.equal(compile.status,1,'Invalid C must produce compilation failure');
 assert.match(compile.stderr,/COMPILE ERROR/);
 console.log('REJECTED invalid C compilation');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
