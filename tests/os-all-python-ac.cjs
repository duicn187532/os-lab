/* Actually execute independent Python student-shaped sources for 29 OS chapters.
 * All 29 runs compile (Python interpreter), process 3 PUBLIC/HIDDEN case groups,
 * and produce the expected output; not a mere answer-oracle comparison.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
  os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const template=fs.readFileSync(path.join(root,'os/linux-labs/python-reference.py'),'utf8');
assert.equal((template.match(/^CHAPTER = -1$/gm)||[]).length,1);
const runner=path.join(root,'os/linux-labs/student-verify.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-python-reference-'));
try{
 for(let id=0;id<29;id++){
  const file=path.join(dir,'os-'+id+'.py');
  fs.writeFileSync(file,template.replace(/^CHAPTER = -1$/m,'CHAPTER = '+id));
  const run=spawnSync('node',[runner,'--chapter',String(id),'--language','python','--source',file],
   {encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
  assert.equal(run.status,0,'Chapter '+id+' must AC on real student verifier: '+run.stdout+' '+run.stderr);
  assert.match(run.stdout,/RESULT 3\/3 groups passed, 0 failed/);
  console.log('AC Python chapter '+id+': three actual public/hidden case groups');
 }
 const bad=path.join(dir,'bad.py');
 fs.writeFileSync(bad,'print("TODO")\n');
 const rejected=spawnSync('node',[runner,'--chapter','17','--language','python','--source',bad],
   {encoding:'utf8',timeout:12000});
 assert.equal(rejected.status,1,'Incorrect Python Banker solution must be rejected');
 assert.match(rejected.stdout,/WRONG ANSWER/);
 console.log('PASS: 29 of 29 Python reference source submissions (87 public/hidden case groups), one rejected mutant');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
