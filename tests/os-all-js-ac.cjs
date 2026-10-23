/* Actual Node/browser-compatible source grading for all 29 JavaScript tasks.
 * Unlike reference-oracle tests, this submits real user-shaped JS programs.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const original=fs.readFileSync(path.join(root,'os/linux-labs/javascript-reference.js'),'utf8');
assert.equal((original.match(/^const CHAPTER=-1;$/gm)||[]).length,1);
const runner=path.join(root,'os/linux-labs/student-verify.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'os-js-ac-'));
try{
 for(let id=0;id<29;id++){
  const file=path.join(temp,id+'.js');
  fs.writeFileSync(file,original.replace(/^const CHAPTER=-1;$/m,'const CHAPTER='+id+';'));
  const r=spawnSync('node',[runner,'--chapter',String(id),'--language','javascript','--source',file],
   {encoding:'utf8',timeout:15000});
  assert.equal(r.status,0,'Chapter '+id+' JS source failed: '+r.stdout+' '+r.stderr);
  assert.match(r.stdout,/RESULT 3\/3 groups passed, 0 failed/);
  console.log('AC JavaScript ch '+id+': 3 actual groups');
 }
 const bad=path.join(temp,'bad.js');fs.writeFileSync(bad,"console.log('TODO')\n");
 const r=spawnSync('node',[runner,'--chapter','4','--language','javascript','--source',bad],
  {encoding:'utf8',timeout:10000});
 assert.equal(r.status,1,'Deliberately invalid scheduler must fail');
 console.log('PASS 29 actual JavaScript algorithm solutions × three public/hidden groups');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
