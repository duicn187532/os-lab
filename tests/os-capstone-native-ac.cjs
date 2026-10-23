/* All eight advanced OS capstones execute independently authored C11, C++17
 * and Python solutions through the actual student verifier. JavaScript coverage
 * is supplied by tests/os-capstone-student.cjs. No oracle-only acceptance.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const native=fs.readFileSync(path.join(root,'os/linux-labs/capstone-native-reference.c'),'utf8');
const python=fs.readFileSync(path.join(root,'os/linux-labs/capstone-python-reference.py'),'utf8');
const ids=['srtf','lru','banker','pagetable','clock','journal','alloc','epoll'];
assert.equal((native.match(/^#define CHALLENGE -1$/gm)||[]).length,1);
assert.equal((python.match(/^CHALLENGE = "choose"$/gm)||[]).length,1);
const runner=path.join(root,'os/linux-labs/student-verify.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'os-capstone-native-'));
try{
 let completed=0;
 for(let i=0;i<8;i++){
  for(const [lang,ext] of [['c','c'],['cpp','cpp'],['python','py']]){
   const file=path.join(temp,'advanced-'+i+'.'+ext);
   const src=lang==='python'
    ?python.replace(/^CHALLENGE = "choose"$/m,'CHALLENGE = "'+ids[i]+'"')
    :native.replace(/^#define CHALLENGE -1$/m,'#define CHALLENGE '+i);
   fs.writeFileSync(file,src);
   const r=spawnSync('node',[runner,'--challenge','os.capstone.'+ids[i],
    '--language',lang,'--source',file],{encoding:'utf8',timeout:30000});
   assert.equal(r.status,0,lang+' / '+ids[i]+' failed: '+r.stdout+' '+r.stderr);
   assert.match(r.stdout,/RESULT 3\/3 groups passed, 0 failed/);
   completed++;
   console.log('AC '+lang+' os.capstone.'+ids[i]+' 3/3 groups');
  }
 }
 const failed=path.join(temp,'wrong.py');fs.writeFileSync(failed,'print("0")\n');
 const r=spawnSync('node',[runner,'--challenge','os.capstone.banker',
  '--language','python','--source',failed],{encoding:'utf8',timeout:10000});
 assert.equal(r.status,1,'Incorrect Banker Python must be rejected');
 assert.match(r.stdout,/WRONG ANSWER/);
 console.log('PASS '+completed+' accepted advanced C/C++/Python source submissions, 72 case groups, deliberate mutant rejected');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
