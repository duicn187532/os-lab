// NET LAB textbook extension structural test, no browser or dependencies required.
// node tests/net-textbook-review.cjs
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ROOT=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const context={window:{}};
vm.runInNewContext(read('net/assets/content.js'),context,{filename:'content.js'});
assert.equal(context.window.NET_DATA.lessons.length,22,'Original chapter IDs stay 0..21');
const oldIds=Array.from(context.window.NET_DATA.lessons,x=>x.id),originalUnits=Array.from(context.window.NET_DATA.units);
vm.runInNewContext(read('net/assets/advanced-content.js'),context,{filename:'advanced-content.js'});
const D=JSON.parse(JSON.stringify(context.window.NET_DATA));
assert.deepEqual(D.lessons.slice(0,22).map(x=>x.id),oldIds,'Stable original lesson IDs');
assert.deepEqual(D.units.slice(0,originalUnits.length),originalUnits,'Original units preserved');
assert.equal(D.lessons.length,28,'28 chapter curriculum');
assert.equal(new Set(D.lessons.map(l=>l.id)).size,28,'Unique chapter IDs');
assert.equal(D.lessons.reduce((n,l)=>n+l.quiz.length,0),112,'112 quiz questions');
assert(D.glossary.length>=160,'Extended glossary');
assert(D.formulas.reduce((n,g)=>n+g.items.length,0)>=24,'Extended formula sheet');
const terms=new Set(D.glossary.map(x=>x.id));
for(const l of D.lessons){
  for(const p of ['unit','title','short','goals','ask','analogy','why','details','steps','worked','caveat','summary','quiz','code','lab','terms'])
    assert(l[p]!==undefined&&l[p]!==null,'Chapter '+l.id+' missing '+p);
  assert(D.units.includes(l.unit),'Unit absent for '+l.id);
  assert(l.details.length>=6,'Chapter '+l.id+' lacks in-depth teaching sections');
  assert(l.details.every(d=>d.length===2&&typeof d[0]==='string'&&d[0].length>=2&&typeof d[1]==='string'&&d[1].length>=15),'Empty depth section '+l.id);
  assert(l.quiz.length>=4&&l.quiz.every(q=>q.length===5&&q[1].length>=3&&q[2]>=0&&q[2]<q[1].length&&q[3]&&q[4]),'Quiz '+l.id);
  assert(l.terms.every(t=>terms.has(t)),'Unknown glossary term chapter '+l.id);
  assert(l.code[0]==='Python'&&l.code[1].length>40&&!l.code[1].includes('Please complete'),'Runnable Python example required '+l.id);
}
const labs=new Map(),problems=[];
const CSLab={
 ui:{h:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;')},
 frameLab:(key,spec)=>labs.set(key,spec),
 sim:{net:{LABS:{}}},
 code:{add:p=>problems.push(p)}
};
const ext={CSLab};
vm.runInNewContext(read('net/assets/advanced-labs.js'),ext,{filename:'advanced-labs.js'});
vm.runInNewContext(read('net/assets/advanced-code.js'),ext,{filename:'advanced-code.js'});
assert.equal(labs.size,6,'Six advanced frame labs');
assert.equal(problems.length,6,'Six judged coding exercises');
let variants=0;
for(const [name,spec] of labs){
  const defaults=Object.fromEntries(spec.inputs.map(i=>[i[0],i[3]]));
  const variantsToCheck=[defaults];
  for(const inp of spec.inputs){
    if(inp[2]==='select')for(const [v] of inp[4])variantsToCheck.push({...defaults,[inp[0]]:v});
    if(inp[2]==='number')for(const v of [inp[4][0],inp[4][1]])variantsToCheck.push({...defaults,[inp[0]]:v});
  }
  for(const v of variantsToCheck){
    const frames=spec.frames(v);variants+=frames.length;
    assert(frames.length>=2,'No steps in '+name);
    for(const f of frames){
      assert(typeof f.label==='string'&&f.label.length>1,'Step label '+name);
      assert(typeof f.desc==='string'&&f.desc.length>10,'Step explanation '+name);
      assert(!/NaN|undefined|Infinity/.test((f.visual||'')+f.desc),'Nonfinite simulator output '+name);
    }
  }
}
for(const p of problems){
 assert(D.lessons.some(l=>l.id===p.lesson&&l.lab&&l.id>=22),'Problem chapter '+p.id);
 assert(p.title&&p.statement&&p.input&&p.output&&p.hints.length>=2&&p.explain&&p.tags.length>0,'Problem metadata '+p.id);
 assert(['python','cpp','c','javascript'].every(l=>p.starter[l]?.length>60),'Starter in four languages '+p.id);
 assert(p.cases.length>=3&&p.cases.filter(c=>c.visible).length>=2,'Sample and hidden cases '+p.id);
 for(const c of p.cases){
   assert(c.input.endsWith('\n')&&c.output.endsWith('\n'),'Trailing newline '+p.id);
   const lines=c.input.trim().split('\n'),q=+lines[0];
   assert.equal(q,lines.length-1,'Input q count '+p.id+':'+c.name);
   assert.equal(q,c.output.trim().split('\n').length,'Output count '+p.id+':'+c.name);
 }
}
const html=read('net/index.html');
for(const name of ['advanced-content','advanced-labs','advanced-code'])assert(html.includes('assets/'+name+'.js'),'HTML missing '+name);
assert(html.indexOf('assets/content.js')<html.indexOf('assets/advanced-content.js'),'Advanced content must follow base content');
assert(html.indexOf('assets/advanced-content.js')<html.indexOf('assets/course.js'),'Course config sees advanced lessons');
assert(html.indexOf('assets/labs.js')<html.indexOf('assets/advanced-labs.js'),'Advanced labs must follow base labs');
assert(html.indexOf('assets/code.js')<html.indexOf('assets/advanced-code.js'),'Advanced code must follow base coding problems');
console.log('PASS: 28 lessons, 112 quizzes, '+D.glossary.length+' glossary terms, six advanced labs ('+variants+' validated frames), six four-language judged problems with test cases, stable old IDs and valid HTML module order.');
