/* Five chapter state tables tied to actual Linux system boundary checks. */
'use strict';
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ids=[1,9,10,11,28];
const lessons=ids.map(id=>({id,textbook:{stateRows:[],stateHeaders:[],algorithm:[],
 worked:'',invariant:'',counterexample:'',l3:{steps:[],checks:[]}}}));
const win={window:{OS_DATA:{lessons}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/system-boundaries-masterclass.js'),'utf8'),
 win,{filename:'system-boundaries-masterclass.js'});
assert.deepEqual(JSON.parse(JSON.stringify(win.window.OS_SYSTEM_BOUNDARIES.chapters)),ids);
for(const l of lessons){
 const x=l.textbook;
 assert(x.stateRows.length>=4&&x.stateHeaders.length===4);
 assert(x.stateRows.every(row=>row.length===4));
 assert(x.worked.includes('Linux Worked Example'));
 assert(x.l3.checks.some(t=>t.includes('實際執行 Linux')));
}
console.log('PASS five L2 syscall, I/O, DAC, namespace and observability causal traces');
