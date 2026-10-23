/* Actual multi-threaded Linux bounded-queue stress. No simulated interleavings:
 * the kernel schedules eight pthreads over a size-seven ring.
 */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'os-pthread-'));
try{
 assert.equal(process.platform,'linux');
 const exe=path.join(temp,'queue');
 const compiler=spawnSync('cc',['-std=c11','-pthread','-O2','-Wall','-Wextra','-Werror',
   path.join(root,'os/linux-labs/bounded-queue.c'),'-o',exe],
   {encoding:'utf8',timeout:15000});
 assert.ifError(compiler.error);assert.equal(compiler.status,0,compiler.stderr);
 for(let i=0;i<8;i++){
  const r=spawnSync(exe,[],{encoding:'utf8',timeout:15000});
  assert.ifError(r.error);
  assert.equal(r.status,0,'Run '+i+': '+r.stderr);
  assert.equal(r.stdout,'produced=8000 consumed=8000 checksum=31996000 duplicates=0\n');
 }
 console.log('PASS native pthread: 8 iterations × 8000 items; queue capacity 7, 4 producers, 4 consumers, exactly-once and sum invariants');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
