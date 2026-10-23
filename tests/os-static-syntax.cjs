/* Fast load-order and parser gate for every classic script in OS index.html.
 * Detects JavaScript syntax regressions before expensive browser runners start.
 * This does NOT replace semantic browser tests.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
  path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'os/index.html'),'utf8');
const matches=[...html.matchAll(/<script\s+src="([^"]+)"[^>]*><\/script>/g)];
const files=matches.map(m=>({src:m[1],file:path.resolve(root,'os',m[1])}));
assert(files.length>=20,'Expected OS classic script bundle');
assert.equal(new Set(files.map(x=>x.src)).size,files.length,'Duplicate classic script tag');
for(const entry of files){
 assert(entry.file.startsWith(root+path.sep),'Script cannot escape project root');
 assert(fs.existsSync(entry.file),'Missing referenced script '+entry.src);
 const script=fs.readFileSync(entry.file,'utf8');
 assert(script.length>10,'Empty script '+entry.src);
 new vm.Script(script,{filename:entry.src,displayErrors:true});
}
const idx=s=>files.findIndex(f=>f.src===s);
assert(idx('assets/textbook-rigor.js')>=0);
assert(idx('assets/replacement-masterclass.js')>=0);
assert(idx('assets/working-set-masterclass.js')>idx('assets/replacement-masterclass.js'));
assert(idx('assets/working-set-masterclass.js')<idx('../shared/cslab-app.js'));
assert(idx('assets/mastery-evidence.js')>idx('../shared/cslab-app.js'));
console.log('PASS OS static syntax: '+files.length+
 ' classic scripts parse and resolve; textbook, models, app and mastery load in the required order');
