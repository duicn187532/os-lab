/* Browser WASM integration for C, C++, Python actual Judge (not native-only smoke). */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const URL=process.env.TEST_URL||'http://localhost:8000/os-lab/os/';
const progs={"6":{"c":"#include <stdio.h>\nint main(void){int q;if(scanf(\"%d\",&q)!=1)return 0;while(q--){long long a,p;if(scanf(\"%lld %lld\",&a,&p)!=2)return 1;printf(\"%lld %lld\\n\",a/p,a%p);}return 0;}","cpp":"#include <iostream>\nusing namespace std;\nint main(){int q;cin>>q;while(q--){long long a,p;cin>>a>>p;cout<<(a/p)<<\" \"<<(a%p)<<\"\\n\";}}","python":"import sys\nv=iter(sys.stdin.read().split());q=int(next(v))\nfor _ in range(q):\n a,p=int(next(v)),int(next(v))\n print(a//p,a%p)"},"17":{"c":"#include <stdio.h>\nint main(void){\n int q;if(scanf(\"%d\",&q)!=1)return 0;\n while(q--){\n  int work[2],a[2][2],m[2][2],done[2]={0,0},order[2],ok=1;\n  if(scanf(\"%d%d\",&work[0],&work[1])!=2)return 1;\n  for(int i=0;i<2;i++)if(scanf(\"%d%d%d%d\",&a[i][0],&a[i][1],&m[i][0],&m[i][1])!=4)return 1;\n  for(int r=0;r<2;r++){\n   int picked=-1;\n   for(int i=0;i<2;i++)if(!done[i]&&m[i][0]-a[i][0]<=work[0]&&m[i][1]-a[i][1]<=work[1]){picked=i;break;}\n   if(picked<0){ok=0;break;}\n   done[picked]=1;order[r]=picked;\n   for(int j=0;j<2;j++)work[j]+=a[picked][j];\n  }\n  if(ok)printf(\"SAFE P%dP%d\\n\",order[0],order[1]);else puts(\"UNSAFE\");\n }return 0;\n}","cpp":"#include <iostream>\nusing namespace std;\nint main(){int q;cin>>q;while(q--){\n int work[2],a[2][2],m[2][2],done[2]={0,0},order[2],ok=1;\n cin>>work[0]>>work[1];\n for(int i=0;i<2;i++)cin>>a[i][0]>>a[i][1]>>m[i][0]>>m[i][1];\n for(int r=0;r<2;r++){\n  int pick=-1;\n  for(int i=0;i<2;i++)if(!done[i]&&m[i][0]-a[i][0]<=work[0]&&m[i][1]-a[i][1]<=work[1]){pick=i;break;}\n  if(pick<0){ok=0;break;}done[pick]=1;order[r]=pick;\n  for(int j=0;j<2;j++)work[j]+=a[pick][j];\n }\n if(ok)cout<<\"SAFE P\"<<order[0]<<\"P\"<<order[1]<<\"\\n\";else cout<<\"UNSAFE\\n\";\n }}","python":"import sys\nit=iter(sys.stdin.read().split());q=int(next(it))\nfor _ in range(q):\n work=[int(next(it)),int(next(it))]\n allocation=[];maximum=[]\n for i in range(2):\n  allocation.append([int(next(it)),int(next(it))])\n  maximum.append([int(next(it)),int(next(it))])\n done=[False,False];order=[]\n for turn in range(2):\n  pick=next((i for i in range(2) if not done[i] and all(maximum[i][j]-allocation[i][j]<=work[j] for j in range(2))),None)\n  if pick is None:break\n  order.append(pick);done[pick]=True\n  for j in range(2):work[j]+=allocation[pick][j]\n print(\"SAFE P\"+str(order[0])+\"P\"+str(order[1]) if len(order)==2 else \"UNSAFE\")"}};
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(URL+'#/');
  await page.waitForFunction(()=>Boolean(window.CSLab?.code?.load));
  await page.evaluate(async()=>{window.__OS_ML_JUDGE__=(await CSLab.code.load()).judge;});
  const passed=[];
  for(const [lesson,solutions] of Object.entries(progs))for(const [language,code] of Object.entries(solutions)){
   const res=await page.evaluate(async({lesson,language,code})=>{
    const p=CSLab.code.get('os.textbook.'+lesson);
    const r=await __OS_ML_JUDGE__({...p,cases:CSLab.code.cases(p)},language,code);
    return {verdict:r.verdict,passed:r.passed,total:r.total,bad:r.results?.filter(x=>x.verdict!=='AC').map(x=>x.name+': '+x.verdict)};
   },{lesson,language,code});
   assert.equal(res.verdict,'AC',lesson+' '+language+' '+JSON.stringify(res));
   assert.equal(res.passed,res.total);
   passed.push(lesson+'/'+language+':'+res.total);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: Actual Chromium sandbox C/C++/Python test groups '+passed.join(' | '));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
