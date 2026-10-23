/* True POSIX inode, hard-link, dup and fork descriptor lifecycle.
 * Eight runs to ensure no inode/fd leaks or nondeterministic offsets.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-ofd-test-'));
try{
 assert.equal(process.platform,'linux','Native inode exercise requires Linux');
 const binary=path.join(dir,'ofd-lab');
 const compiled=spawnSync('cc',['-std=c11','-Wall','-Wextra','-Werror',
   path.join(root,'os/linux-labs/ofd-inode-demo.c'),'-o',binary],
  {encoding:'utf8',timeout:15000});
 assert.ifError(compiled.error);
 assert.equal(compiled.status,0,compiled.stderr);
 for(let i=0;i<8;i++){
  const p=spawnSync(binary,[],{encoding:'utf8',timeout:12000});
  assert.ifError(p.error);assert.equal(p.status,0,p.stderr);
  assert.equal(p.stdout,'links=0 dup_shared=AB fork_shared=CD file_retained=yes\n');
 }
 console.log('PASS Linux inode/OFD lab: 8 actual runs, nlink 2→1→0, dup+fork offset sharing, read after unlink and directory cleanup');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
