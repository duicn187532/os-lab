// Compile and execute the teaching snippets actually displayed in OS LAB.
// The browser judge is tested separately: this checks whole standalone examples.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{}};
for(const pathName of ['os/assets/content.js','os/assets/depth.js','os/assets/advanced-content.js','os/assets/code-examples.js'])
 vm.runInNewContext(read(pathName),ctx,{filename:pathName});
const D=JSON.parse(JSON.stringify(ctx.window.OS_DATA)),ids=Array.from(ctx.window.OS_RUNNABLE_EXAMPLES);
assert(ids.length>=20,'At least 20 repaired executable examples');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'os-lab-examples-'));
let built=0,ran=0,syntaxChecked=0;
function call(cmd,args,{input,timeout=12000}={}){
 const r=spawnSync(cmd,args,{input,encoding:'utf8',timeout,cwd:root,maxBuffer:4*1024*1024});
 assert.ifError(r.error);assert.equal(r.status,0,[cmd,...args].join(' ')+'\n'+r.stderr);
 return r.stdout;
}
try{
 for(const id of ids){
  const l=D.lessons.find(l=>l.id===id);
  assert(l,'Missing lesson '+id);
  const [lang,code]=l.code;
  assert(code.length>80,'Executable example too short chapter '+id);
  assert(!/^\s*(pass|#\s*TODO)\s*$/m.test(code),'Placeholder '+id);
  const file=path.join(tmp,'os-example-'+id);
  if(lang==='C'){
    fs.writeFileSync(file+'.c',code);
    call('cc',['-std=c11','-Wall','-Wextra','-Werror','-pthread',file+'.c','-o',file]);
    built++;call(file,[]);ran++;
  }else if(lang==='Python'){
    call('python3',['-c',code]);built++;ran++;
  }else if(lang==='Bash'){
    fs.writeFileSync(file+'.sh',code);
    call('bash',['-n',file+'.sh']);syntaxChecked++;
    // Shell snippets are generally Linux-specific and may need optional
    // external tools; execute safe, bounded, self-contained ones only.
    if([10,11,12,14].includes(id)){call('bash',[file+'.sh'],{timeout:16000});ran++;}
  }else throw Error('Unexpected executable language '+lang+' for '+id);
 }
 console.log('PASS: '+ids.length+' stand-alone OS examples, '+built+' C/Python compilation or runs, '+syntaxChecked+' Bash syntax checks, '+ran+' real executions.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
