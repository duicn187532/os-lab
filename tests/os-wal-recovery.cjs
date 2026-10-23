/* Process-crash recovery of actual JSONL WAL with fsync and failpoints.
 * This deliberately does not claim to emulate an actual power interruption.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),{spawnSync}=require('node:child_process');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'os-wal-crash-'));
const script=path.resolve(__dirname,'../os/linux-labs/wal-recovery-demo.py');
const log=path.join(work,'events.jsonl');
const invoke=(args,exit=0)=>{
 const r=spawnSync('python3',[script,...args],{encoding:'utf8',timeout:12000});
 assert.ifError(r.error);
 assert.equal(r.status,exit,'Command '+args.join(' ')+' failed: '+r.stderr);
 return r.stdout.trim();
};
try{
 assert.equal(invoke(['init',log,'10']),'initialized=10');
 assert.equal(invoke(['recover',log]),'value=10 committed=0 pending=0 torn_tail=0');
 assert.equal(invoke(['write',log,'T1','21','before_commit'],71),'');
 assert.equal(invoke(['recover',log]),'value=10 committed=0 pending=1 torn_tail=0',
  'No COMMIT -> ignore incomplete transaction');
 assert.equal(invoke(['write',log,'T2','22','after_fsync'],72),'');
 assert.equal(invoke(['recover',log]),'value=22 committed=1 pending=1 torn_tail=0',
  'Real fsync before process exit -> complete commit recovered');
 assert.equal(invoke(['write',log,'T3','33']),'committed=T3');
 assert.equal(invoke(['recover',log]),'value=33 committed=2 pending=1 torn_tail=0');
 fs.appendFileSync(log,'{"kind":"COMMIT","tx":"trunc');
 assert.equal(invoke(['recover',log]),'value=33 committed=2 pending=1 torn_tail=1',
  'Torn trailing record must not retroactively commit incomplete transaction');
 assert.equal(invoke(['write',log,'!INVALID!','42'],1),'');
 console.log('PASS WAL Linux process crash: incomplete ignored, post-fsync commit survives process exit, successive commits, trailing torn JSON rejected');
}finally{fs.rmSync(work,{recursive:true,force:true});}
