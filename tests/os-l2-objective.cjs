/* Objective L2 exercises: independent simple arithmetic/state checks.
 * All answers are public, so an AC is local practice evidence only.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const win={},source=fs.readFileSync(path.join(__dirname,'../os/assets/l2-objective.js'),'utf8');
new vm.Script(source,{filename:'l2-objective.js'}).runInNewContext({window:win});
const L=win.OS_L2_OBJECTIVE;
assert.equal(L.all.length,29,'Every chapter must have an objective L2 item');
const topics=new Set();
for(const q of L.all){
 assert.equal(q.id,L.all.indexOf(q),'Stable chapter IDs');
 assert(q.prompt.length>=20&&q.explanation.length>=22,'No label-only L2 question');
 assert(['numeric','state'].includes(q.kind));
 const ok=L.check(q.id,q.expected);
 assert.equal(ok.correct,true,'Canonical answer for chapter '+q.id);
 const wrong=q.kind==='numeric'?String(Number(q.expected)+1):'OBVIOUSLY_INCORRECT';
 assert.equal(L.check(q.id,wrong).correct,false,'Reject wrong answer chapter '+q.id);
 assert.equal(L.check(q.id,'').correct,false,'Empty response must not grade');
 assert.equal(L.check(q.id,q.kind==='numeric'?'not-a-number':'nonmatching').correct,false);
 if(q.kind==='numeric')assert.equal(L.check(q.id,Number(q.expected).toFixed(4)).correct,true);
 assert.equal(L.get(q.id).id,q.id);
 topics.add(q.kind);
}
assert.equal(topics.size,2,'Both numeric calculations and state traces required');
assert.throws(()=>L.check(29,'1'),/invalid/);
assert.equal(L.get(-1),null);
console.log('PASS OS L2 objective: 29 canonical cases, 29 near-miss alternatives, invalid and empty rejection, numeric equivalence');
