/* Build and run REAL Linux fork/exec/waitpid and epoll LT/ET.
 * This is a kernel integration test, not a browser simulator or JS oracle.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-posix-real-'));
function exec(cmd,args,expected=0){
 const r=spawnSync(cmd,args,{encoding:'utf8',timeout:12000,maxBuffer:131072});
 assert.ifError(r.error);
 assert.equal(r.status,expected,cmd+' '+args.join(' ')+': '+r.stdout+' '+r.stderr);
 return r;
}
try{
 assert.equal(process.platform,'linux','These exercises need actual Linux/WSL2');
 const c='-std=c11';
 for(const name of ['process-exec-demo','epoll-demo']){
  exec('cc',[c,'-Wall','-Wextra','-Werror',
   path.join(root,'os/linux-labs/'+name+'.c'),'-o',path.join(dir,name)]);
 }
 assert.equal(exec(path.join(dir,'process-exec-demo'),[]).stdout,'child-exit=7\n');
 const bad=exec(path.join(dir,'process-exec-demo'),['--missing']);
 assert.equal(bad.stdout,'child-exit=127\n');
 assert.match(bad.stderr,/child: exec failed \(2\)/,'ENOENT must be handled by the child');
 const usage=exec(path.join(dir,'process-exec-demo'),['bad'],64);
 assert.match(usage.stderr,/usage:/);
 const ep=exec(path.join(dir,'epoll-demo'),[]).stdout.trim().split('\n');
 assert.deepEqual(ep,[
  'LT first=1 after_partial=1 after_new=1 unread_before_drain=3',
  'ET first=1 after_partial=0 after_new=1 unread_before_drain=3'
 ]);
 console.log('PASS true Linux: fork/exec/waitpid success, exec ENOENT, usage rejection, LT/ET partial-read and EAGAIN invariants');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
