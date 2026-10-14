const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path'); const vm=require('node:vm'); const ts=require('typescript');
const filename=path.resolve(__dirname,'../src/services/studies.ts'); const moduleValue={exports:{}};
const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{module:moduleValue,exports:moduleValue.exports,require:id=>require(path.resolve(path.dirname(filename),id))});
const s=moduleValue.exports;
test('all 66 Bible catalog entries have a complete study and valid outline',()=>{
  const catalog=require('../src/data/bible-catalog.json'); assert.equal(catalog.length,66);
  assert.equal(s.bookStudies.length,66); assert.equal(new Set(s.bookStudies.map(b=>b.id)).size,66); assert.equal(s.searchBooks('','Antigo').length,39); assert.equal(s.searchBooks('','Novo').length,27);
  for(const b of catalog){const study=s.getBookStudy(b.name); assert.ok(study); assert.equal(study.chapters,b.chapters); assert.ok(study.author.trim().length > 0); for(const field of ['date','message','reflection']) assert.ok(study[field].length>15); assert.ok(study.sources.length); for(const section of study.outline){const ends=section.range.split('–').map(Number); assert.ok(ends[0]>=1 && ends.at(-1)<=b.chapters);}}
});
test('search handles Portuguese accents, original scripts, transliterations and filters',()=>{
  assert.equal(s.getBookStudy('genesis').name,'Gênesis'); assert.equal(s.searchBooks('genesis')[0].id,'genesis'); assert.equal(s.searchBooks('genesis','Novo').length,0);
  assert.equal(s.searchWords('agape')[0].id,'agape'); assert.equal(s.searchWords('λογος')[0].id,'logos'); assert.equal(s.searchWords('שלום')[0].id,'shalom'); assert.equal(s.searchWords('H7965')[0].id,'shalom'); assert.equal(s.searchWords('shalom','Grego').length,0);
  assert.equal(s.getBookStudy('not-a-book'),undefined); assert.equal(s.getWordStudy('missing'),undefined); assert.equal(s.searchWords('zzzz').length,0);
});
test('word examples resolve to actual catalog books and language matches Strong convention',()=>{
  assert.equal(s.wordStudies.length,13); assert.equal(new Set(s.wordStudies.map(w=>w.id)).size,13);
  for(const w of s.wordStudies){const b=s.getBookStudy(w.example.book); assert.ok(b); assert.ok(w.example.chapter>=1 && w.example.chapter<=b.chapters); assert.ok(w.example.verse>0); assert.match(w.strong,/^[HG]\d+$/); assert.equal(w.strong[0],w.language==='Grego'?'G':'H'); assert.ok(w.original && w.transliteration && w.meaning && w.note && w.example.context); assert.ok(w.source.label.includes('CC BY'));}
  assert.equal(s.getWordStudy('elah').language,'Aramaico'); assert.equal(s.wordsForBook('João').length,2); assert.equal(s.wordsForBook('Salmos').length,2);
});
