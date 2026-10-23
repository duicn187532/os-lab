// Offline OS LAB curriculum/model/Judge data regression.
// node tests/os-textbook-review.cjs
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{}};
vm.runInNewContext(read('os/assets/content.js'),ctx,{filename:'content.js'});
const base=JSON.parse(JSON.stringify(ctx.window.OS_DATA));
assert.equal(base.lessons.length,21,'Original curriculum baseline');
vm.runInNewContext(read('os/assets/depth.js'),ctx,{filename:'depth.js'});
vm.runInNewContext(read('os/assets/advanced-content.js'),ctx,{filename:'advanced-content.js'});
vm.runInNewContext(read('os/assets/code-examples.js'),ctx,{filename:'code-examples.js'});
const codeForTextbook=[];
ctx.CSLab={code:{add:p=>codeForTextbook.push(p),list:()=>codeForTextbook,cases:p=>p.cases}};
vm.runInNewContext(read('os/assets/advanced-code.js'),ctx,{filename:'advanced-code.js'});
for(const file of ['textbook-traces-1.js','textbook-traces-2.js','textbook-rigor.js','formula-mathml.js','assessment-rigor.js'])
 vm.runInNewContext(read('os/assets/'+file),ctx,{filename:file});
const D=JSON.parse(JSON.stringify(ctx.window.OS_DATA));
assert.equal(D.lessons.length,29,'29 textbook chapters');
assert.equal(new Set(D.lessons.map(l=>l.id)).size,29,'Stable and distinct chapter IDs');
assert.deepEqual(D.units,base.units,'Original subject units preserved');
for(const old of base.lessons){
 const now=D.lessons.find(l=>l.id===old.id);
 assert(now,'Original lesson id '+old.id+' must remain');
 for(const k of ['title','short','unit','minutes','icon','ask','analogy','why','steps','summary','terms','lab','goals','caveat'])
  assert.deepEqual(now[k],old[k],'Original lesson '+old.id+' field '+k+' preserved');
 if(!ctx.window.OS_RUNNABLE_EXAMPLES.includes(old.id))assert.deepEqual(now.code,old.code,'Original code preserved '+old.id);
 assert.deepEqual(now.details.slice(0,old.details.length),old.details,'Original details preserved '+old.id);
 assert.deepEqual(now.quiz.slice(0,old.quiz.length),old.quiz,'Original four quiz items preserved '+old.id);
 assert(now.details.length>=old.details.length+2,'Two L2/L3 expansions '+old.id);
}
const terms=new Set(D.glossary.map(x=>x.id));
assert.equal(terms.size,D.glossary.length,'Unique glossary ids');
assert(D.glossary.length>=120,'Vocabulary > 120');
assert(D.formulas.reduce((n,g)=>n+g.items.length,0)===27,'27 formulas');
assert(D.formulas.every(g=>g.items.every(f=>f.mathml?.startsWith('<math ')&&f.note?.length>=10)),'Every formula uses MathML and symbol definitions');
assert.equal(D.lessons.reduce((n,l)=>n+l.quiz.length,0),174,'174 knowledge questions including 58 new scenarios');
for(const l of D.lessons){
 assert(D.units.includes(l.unit),'Unknown unit '+l.id);
 for(const field of ['title','short','why','analogy','ask','caveat'])
  assert(l[field]?.length > (field==='title'||field==='short'?2:10),'Chapter '+l.id+' lacks '+field);
 assert(l.goals.length>=3,'Missing learning outcomes '+l.id);
 assert(l.steps.length>=4,'Missing step-by-step '+l.id);
 assert(l.summary.length>=3,'Missing summary '+l.id);
 assert(l.details.length>=5,'Missing L2/L3 conceptual depth '+l.id);
 assert(l.details.every(d=>Array.isArray(d)&&d.length===2&&d[0].length>=2&&d[1].length>15),'Empty teaching topic '+l.id);
 assert(l.quiz.length===6,'Four original plus two higher-order assessment questions '+l.id);
 assert(l.quiz.every(q=>q.length===5&&q[1].length>=2&&q[2]>=0&&q[2]<q[1].length&&q[3]&&q[4]),'Invalid quiz '+l.id);
 assert(l.terms.every(t=>terms.has(t)),'Unknown glossary terms '+l.id);
 assert(l.textbook?.algorithm.length>=2,'L2 steps '+l.id);
 assert(l.textbook?.stateRows.length>=3,'L2 state table '+l.id);
 assert(l.textbook.stateRows.every(row=>row.length===l.textbook.stateHeaders.length),'L2 state table width '+l.id);
 assert(l.textbook?.worked?.length>=55&&l.textbook?.symbols?.length>=30,'L2 derivation and symbols '+l.id);
 assert(l.textbook?.invariant?.length>=20&&l.textbook?.counterexample?.length>=20,'L2 invariant and counterexample '+l.id);
 assert(l.textbook?.formula?.includes('<math ')&&l.textbook.formula.includes('</math>'),'Native MathML equation '+l.id);
 assert(l.textbook?.l3?.input&&l.textbook.l3.expected&&l.textbook.l3.counterInput&&l.textbook.l3.counterExpected,'L3 runnable inputs and expected output '+l.id);
 assert(l.textbook?.l3?.checks?.length>=3&&l.textbook.l3.steps.length>=3,'L3 criteria and reproduction '+l.id);
 assert(l.quiz.slice(4).every(q=>q[1].length===3&&q[0].length>=25&&q[4].length>=20),'Higher-order assessment '+l.id);
 assert(l.code.length===2&&l.code[1].length>=30,'Insufficient code example '+l.id);
}
const labs=new Map(),problems=[];
const frameCtx={CSLab:{
 ui:{h:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;')},
 frameLab:(id,spec)=>labs.set(id,spec),sim:{},
 code:{add:p=>problems.push(p)}
}};
vm.runInNewContext(read('os/assets/advanced-labs.js'),frameCtx,{filename:'advanced-labs.js'});
vm.runInNewContext(read('os/assets/advanced-code.js'),frameCtx,{filename:'advanced-code.js'});
assert.equal(labs.size,8,'Eight new interactive simulators');
const capstones=[];
const capstoneCtx={CSLab:{code:{add:p=>capstones.push(p)}}};
vm.runInNewContext(read('os/assets/algorithm-capstones.js'),capstoneCtx,{filename:'algorithm-capstones.js'});
assert.equal(capstones.length,8,'Eight advanced algorithmic programming challenges');
assert.equal(new Set(capstones.map(p=>p.id)).size,8,'Unique capstone IDs');
for(const p of capstones){
 assert(p.statement.length>=80&&p.hints.length>=2,'Capstone algorithm description '+p.id);
 assert(['cpp','python','javascript','c'].every(lang=>p.starter[lang]?.length>=60),'Capstone languages '+p.id);
 assert(p.cases.length>=3&&p.cases.some(c=>!c.visible),'Capstone hidden tests '+p.id);
 for(const c of p.cases){const rows=c.input.trim().split('\n');assert.equal(Number(rows[0]),rows.length-1,p.id+' input length');assert.equal(rows.length-1,c.output.trim().split('\n').length,p.id+' output length');}
}
assert.equal(problems.length,29,'Every chapter has one introductory coding problem');
const problemIds=new Set(problems.map(p=>p.lesson));
assert.equal(problemIds.size,29,'One code quest per chapter');
let variants=0;
for(const [name,spec] of labs){
 const defaults=Object.fromEntries(spec.inputs.map(i=>[i[0],i[3]]));
 const tries=[defaults];
 for(const i of spec.inputs){
  if(i[2]==='select')for(const opt of i[4])tries.push({...defaults,[i[0]]:opt[0]});
  if(i[2]==='number')for(const n of [i[4][0],i[4][1]])tries.push({...defaults,[i[0]]:n});
 }
 for(const t of tries){
  const frames=spec.frames(t);variants+=frames.length;
  assert(frames.length>=2,'Missing steps for '+name);
  assert(frames.every(f=>f.label?.length>1&&f.desc?.length>15),'Missing frame explanation '+name);
  assert(frames.every(f=>!/NaN|undefined|Infinity/.test(f.visual||'')),'Bad simulator numeric output '+name);
 }
}
for(const p of problems){
 assert(D.lessons.some(l=>l.id===p.lesson),'Programming quest lesson '+p.id);
 assert(typeof p.title==='string'&&p.statement?.length>40&&p.input&&p.output&&p.explain?.length>40,'Programming metadata '+p.id);
 assert(['c','cpp','python','javascript'].every(lang=>p.starter[lang]?.length>60),'Programming starter four languages '+p.id);
 assert(p.cases.length>=3,'At least three assessment sets '+p.id);
 assert(p.cases.some(c=>c.visible===false),'Hidden Judge tests '+p.id);
 assert(p.cases.filter(c=>c.visible===true).length>=2,'Public samples '+p.id);
 const knownPublic=new Set(p.cases.filter(c=>c.visible).flatMap(c=>c.input.trim().split('\n').slice(1)));
 const unseen=p.cases.filter(c=>!c.visible).flatMap(c=>c.input.trim().split('\n').slice(1));
 assert(unseen.length>=1 && unseen.every(row=>!knownPublic.has(row)),'Hidden tests must have unseen inputs '+p.id);
 for(const t of p.cases){
  const lines=t.input.trim().split('\n'),n=Number(lines[0]);
  assert.equal(lines.length-1,n,'Case input count '+p.id);
  assert.equal(t.output.trim().split('\n').length,n,'Case answer count '+p.id);
 }
}
const html=read('os/index.html');
for(const f of ['depth.js','advanced-content.js','advanced-labs.js','advanced-code.js'])
 assert(html.includes('assets/'+f),'HTML lacks '+f);
assert(html.indexOf('assets/content.js')<html.indexOf('assets/depth.js'),'Load core before depth');
assert(html.indexOf('assets/advanced-content.js')<html.indexOf('assets/course.js'),'Load course config after expansion');
assert(html.indexOf('assets/labs-more.js')<html.indexOf('assets/advanced-labs.js'),'Load existing labs before advanced');
assert(html.indexOf('../shared/cslab-code.js')<html.indexOf('assets/advanced-code.js'),'Register Judge after shared core');
assert(html.indexOf('assets/advanced-code.js')<html.indexOf('../shared/cslab-app.js'),'Register Judge before app');
console.log('PASS: 29 chapters, 174 quizzes, 37 coding challenges including 8 algorithm capstones, 8 interactive labs ('+variants+' validated frames), '+D.glossary.length+' glossary, preserved original IDs/content and module order.');
