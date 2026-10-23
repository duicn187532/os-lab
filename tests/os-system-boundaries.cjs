/* True Linux integration, not a browser counter or quiz answer oracle. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),{spawnSync}=require('node:child_process');
assert.equal(process.platform,'linux','Linux/WSL2 required');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'os-linux-boundaries-'));
try{
 const exe=path.join(tmp,'boundaries');
 const cc=spawnSync('cc',['-std=c11','-O2','-Wall','-Wextra','-Werror',
  path.join(__dirname,'../os/linux-labs/system-boundaries.c'),'-o',exe],
  {encoding:'utf8',timeout:12000});
 assert.ifError(cc.error);assert.equal(cc.status,0,cc.stderr);
 for(let i=0;i<3;i++){
  const r=spawnSync(exe,[],{encoding:'utf8',timeout:12000});
  assert.ifError(r.error);assert.equal(r.status,0,r.stderr);
  assert.equal(r.stdout,'pipe=EAGAIN,AB,EOF mode=0640 group_write=0 pid_namespace=1 cgroup=1 rusage=1\n');
 }
 console.log('PASS real Linux 3×: EAGAIN/short read/EOF; DAC fchmod/fstat; PID ns, cgroup file, getrusage');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
