#!/usr/bin/env node
/* Execute a student's LOCAL solution against OS LAB public and hidden chapter cases.
 * This is for trusted code on the student's Linux/WSL2 computer, NOT a sandbox.
 * Reference-only l3-verify.cjs remains separate: it does not grade student code.
 *
 * node os/linux-labs/student-verify.cjs --chapter 0 --language javascript --source solution.js
 * node os/linux-labs/student-verify.cjs --chapter 4 --language c --source solution.c
 */
'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const tasks=[];
vm.runInNewContext(fs.readFileSync(path.join(root,'os/assets/advanced-code.js'),'utf8'),
  {CSLab:{code:{add:p=>tasks.push(p)}}},{filename:'advanced-code.js',timeout:3000});
const args=process.argv.slice(2);
const opt={};
for(let i=0;i<args.length;i+=2){
  if(!['--chapter','--language','--source','--timeout-ms'].includes(args[i])||!args[i+1])
    throw Error('Usage: --chapter ID --language c|cpp|python|javascript --source FILE [--timeout-ms N]');
  opt[args[i].slice(2)]=args[i+1];
}
const id=Number(opt.chapter),lang=opt.language;
if(!Number.isInteger(id)||id<0||id>28||!['c','cpp','python','javascript'].includes(lang)||!opt.source)
  throw Error('Expected chapter 0..28, language c|cpp|python|javascript, and source path');
const task=tasks.find(p=>p.lesson===id);
assert(task,'Chapter task missing');
const src=path.resolve(opt.source);
assert(fs.statSync(src).isFile(),'Source path must be a file');
const timeout=opt['timeout-ms']===undefined?Math.max(1200,(task.timeLimitMs||1200)*3):Number(opt['timeout-ms']);
if(!Number.isInteger(timeout)||timeout<100||timeout>30000)throw Error('timeout-ms must be 100..30000');
const normalize=s=>String(s??'').replace(/\r\n?/g,'\n').split('\n').map(l=>l.replace(/[ \t]+$/,'')).join('\n').replace(/\n+$/,'');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'os-lab-student-'));
let command,runArgs;
function execute(cmd,argv,input,limit=timeout) {
  return spawnSync(cmd,argv,{input,encoding:'utf8',timeout:limit,maxBuffer:256*1024,windowsHide:true,cwd:tmp});
}
try{
  if(lang==='c'||lang==='cpp'){
    const target=path.join(tmp,'solution');
    const compiler=lang==='c'?'cc':'c++';
    const r=execute(compiler,[lang==='c'?'-std=c11':'-std=c++17','-Wall','-Wextra','-Werror',src,'-o',target],undefined,20000);
    if(r.error||r.status!==0){console.error('COMPILE ERROR\n'+(r.error?.message||r.stderr));process.exitCode=1;throw Error('Compilation rejected');}
    command=target;runArgs=[];
  }else if(lang==='python'){command='python3';runArgs=[src];}
  else {
    // Browser Judge exposes readInput(); provide the same helper when running with Node.
    const source=fs.readFileSync(src,'utf8');
    const wrapped=path.join(tmp,'solution.js');
    fs.writeFileSync(wrapped,"const readInput=()=>require('node:fs').readFileSync(0,'utf8');\n"+source);
    command='node';runArgs=[wrapped];
  }
  let passes=0,failures=0;
  for(const c of task.cases){
    const r=execute(command,runArgs,c.input);
    const outcome=r.error?.code==='ETIMEDOUT'?'TIMEOUT':
      r.error?'EXECUTION ERROR':r.status!==0?'RUNTIME ERROR':
      normalize(r.stdout)!==normalize(c.output)?'WRONG ANSWER':'PASS';
    if(outcome==='PASS')passes++;else failures++;
    console.log((c.visible?'PUBLIC':'HIDDEN')+' '+c.name+': '+outcome);
    if(outcome!=='PASS'){
      if(r.error)console.error(r.error.message);
      if(r.stderr)console.error(r.stderr.slice(0,1200));
      if(c.visible && outcome==='WRONG ANSWER')
        console.error('Expected:\n'+c.output.trimEnd()+'\nActual:\n'+String(r.stdout).trimEnd());
    }
  }
  console.log('RESULT '+passes+'/'+task.cases.length+' groups passed, '+failures+' failed');
  if(failures)process.exitCode=1;
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
