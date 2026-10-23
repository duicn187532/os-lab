/* Independently compiled C11 and C++17 solutions for ALL 29 textbook tasks.
 * Each source is evaluated by the same grader used for actual students.
 * This is stronger than checking only that TODO starter code compiles.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
  path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'os/linux-labs/native-reference.c'),'utf8');
assert.equal((source.match(/^#define CHAPTER -1$/gm)||[]).length,1);
const grader=path.join(root,'os/linux-labs/student-verify.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-native-reference-'));
try{
 let passed=0;
 for(const [lang,ext] of [['c','c'],['cpp','cpp']]){
  for(let id=0;id<29;id++){
   const file=path.join(dir,'os-'+id+'.'+ext);
   fs.writeFileSync(file,source.replace(/^#define CHAPTER -1$/m,'#define CHAPTER '+id));
   const r=spawnSync('node',[grader,'--chapter',String(id),
    '--language',lang,'--source',file],{encoding:'utf8',timeout:30000});
   assert.equal(r.status,0,lang+' chapter '+id+': '+r.stdout+' '+r.stderr);
   assert.match(r.stdout,/RESULT 3\/3 groups passed, 0 failed/);
   passed++;
   console.log('AC '+lang+' ch '+id+': three actual groups');
  }
 }
 const bad=path.join(dir,'wrong.c');fs.writeFileSync(bad,'int main(void){return 0;}');
 const r=spawnSync('node',[grader,'--chapter','17','--language','c','--source',bad],
   {encoding:'utf8',timeout:30000});
 assert.equal(r.status,1,'Native answer with missing outputs must fail');
 assert.match(r.stdout,/WRONG ANSWER/);
 console.log('PASS: '+passed+' actual C11/C++17 reference submissions × 3 public/hidden groups; wrong mutant rejected.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
