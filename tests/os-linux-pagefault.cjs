/* Compile and run getrusage() first-touch against real Linux memory. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),{spawnSync}=require('node:child_process');
assert.equal(process.platform,'linux','Requires Linux or WSL2');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'os-pagefault-'));
try{
 const executable=path.join(tmp,'pagefault');
 const file=path.resolve(__dirname,'../os/linux-labs/pagefault-observe.c');
 const cc=spawnSync('cc',['-std=c11','-O2','-Wall','-Wextra','-Werror',
   file,'-o',executable],{encoding:'utf8',timeout:12000});
 assert.ifError(cc.error);assert.equal(cc.status,0,cc.stderr);
 for(let run=0;run<4;run++){
  const out=spawnSync(executable,[],{encoding:'utf8',timeout:12000});
  assert.ifError(out.error);assert.equal(out.status,0,out.stderr);
  const p=Object.fromEntries(out.stdout.trim().split(/\s+/).map(pair=>pair.split('=')));
  assert.equal(Number(p.pages),256);
  assert.equal(Number(p.checksum),32640);
  assert(Number(p.page_bytes)>=4096);
  assert(Number(p.minor_first)>0,'First touched anonymous pages cause minor faults');
  assert(Number(p.minor_second)>=0,'Minor fault count cannot decrease');
  assert(Number(p.major_first)>=0&&Number(p.major_second)>=0);
  console.log('Linux first-touch #'+run+': '+out.stdout.trim());
 }
 console.log('PASS Linux anonymous memory getrusage: 4 true kernel observations; major faults are separately reported');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
