/* Independent OFD proof and exhaustive event-by-event lifecycle checks. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const lesson={id:8,textbook:{l3:{checks:[],steps:[]}}};
const context={window:{OS_DATA:{lessons:[lesson]}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../os/assets/fs-masterclass.js'),'utf8'),
 context,{filename:'fs-masterclass.js',timeout:4000});
const trace=context.window.OS_OFD.inodeTrace;
const result=JSON.parse(JSON.stringify(trace('ABCDE')));
assert.equal(result.readout,'ABCD');
assert.equal(result.alive,false);
assert.equal(result.trace.at(-1).offset,5);
assert.deepEqual(result.trace.slice(0,4).map(x=>x.links),[1,2,1,0]);
assert.equal(result.trace[3].alive,true,'unlink all names must not close existing OFD');
assert.equal(result.trace.find(x=>x.event==='read 1 byte').byte,'A');
const reads=result.trace.filter(x=>x.event==='read 1 byte');
assert.deepEqual(reads.map(x=>x.byte),['A','B','C','D','E']);
assert.deepEqual(reads.map(x=>x.offset),[1,2,3,4,5]);
let checked=0;for(let n=4;n<=64;n++){
 const value=Array.from({length:n},(_,i)=>String.fromCharCode(65+(i%26))).join('');
 const r=JSON.parse(JSON.stringify(trace(value)));
 assert.equal(r.readout,value.slice(0,4),'Sequential sharing across FD and child');
 assert.equal(r.trace.at(-1).offset,n);
 assert(r.trace.slice(0,-1).every(x=>x.alive),'Inode retained until last descriptor close');
 assert.equal(r.trace.at(-1).alive,false);
 checked++;
}
const t=lesson.textbook;
assert.equal(t.stateRows.length,result.trace.length);
assert(t.worked.includes('waitpid')&&t.counterexample.includes('unlink'));
assert(t.l3.steps.some(x=>x.includes('os-ofd-inode.cjs')));
console.log('PASS OS L2 inode/OFD: 61 scenario lengths, hard-link invariants, dup+fork offset ownership and step trace.');
