const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const catalog=require('../src/data/harpa.json');const moduleValue={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/services/harpa.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleValue,exports:moduleValue.exports,require:id=>{assert.equal(id,'../data/harpa.json');return catalog;}});
const {searchHymns}=moduleValue.exports;
test('search preserves hymn numbering, accepts accents and leading zeros, and never substitutes missing numbers',()=>{
 assert.equal(searchHymns('126')[0].number,126);assert.equal(searchHymns('00126')[0].number,126);assert.equal(searchHymns('   BEM-AVENTURANCA   ')[0].number,126);
 assert.equal(searchHymns('crente')[0].number,126);assert.equal(searchHymns('26').length,0);assert.equal(searchHymns('não existe').length,0);assert.equal(searchHymns('126')[0].verses.length,5);
});
test('every shipped hymn has unique identity, Portuguese credit, review basis and traceable HTTPS sources',()=>{
 const numbers=new Set();for(const hymn of catalog){assert.ok(Number.isInteger(hymn.number)&&hymn.number>0&&hymn.number<=640);assert.ok(!numbers.has(hymn.number));numbers.add(hymn.number);
 assert.ok(hymn.title.trim()&&hymn.author.trim()&&hymn.portugueseCredit.trim());assert.ok(hymn.verses.length>0&&hymn.verses.every(text=>typeof text==='string'&&text.trim()));
 assert.ok(['public-domain','authorized'].includes(hymn.rights.status));assert.equal(hymn.rights.territory,'BR');assert.match(hymn.rights.reviewedAt,/^\d{4}-\d{2}-\d{2}$/);assert.ok(hymn.rights.basis.length>40);assert.ok(hymn.rights.sources.length>=2);for(const source of hymn.rights.sources){assert.ok(source.label);assert.match(source.url,/^https:\/\//);}}
});

test('Conversão is searchable by its traditional refrain title and keeps chorus separate from four verses',()=>{ const hymn=searchHymns('foi na cruz')[0];assert.equal(hymn.number,15);assert.equal(hymn.verses.length,4);assert.ok(hymn.chorus.startsWith('Foi na cruz'));assert.ok(hymn.verses.every(verse=>!verse.includes('Autor:')));assert.ok(searchHymns('').some(item=>item.number===15)&&searchHymns('').some(item=>item.number===126)); });

test('reviewed batch preserves both existing hymns and includes all nine documented additions',()=>{for(const number of [15,47,59,126,187,198,578,637,638,639,640])assert.equal(searchHymns(String(number))[0]?.number,number);assert.equal(catalog.length,11);assert.equal(catalog.filter(row=>row.category==='civic').length,4);for(const hymn of catalog){assert.ok(hymn.verses.every(text=>!/<[^>]+>|Autor:/.test(text)));if(hymn.chorus)assert.ok(!/<[^>]+>/.test(hymn.chorus));}for(const number of [4,328,390,533,581])assert.equal(searchHymns(String(number)).length,0);});
