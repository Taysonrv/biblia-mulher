const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const cache=new Map();
function load(filename){if(filename.endsWith('.json'))return require(filename);if(cache.has(filename))return cache.get(filename);const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,setTimeout,require:id=>load(path.resolve(path.dirname(filename),id.endsWith('.json')?id:id+'.ts'))});cache.set(filename,module.exports);return module.exports;}
const {searchBible,resultPage,SearchCancelled,SearchInputError}=load(path.resolve(__dirname,'../src/services/bible-search.ts'));
const catalog=require('../src/data/bible-catalog.json');const text=require('../src/data/almeida-1911.json');
const request=(query,extra={})=>({query,mode:'Todas as palavras',testament:'Todos',...extra});
const fast={yieldWork:async()=>{}};
const contains=(result,book,chapter,verse)=>result.matches.some(item=>item.book===book&&item.chapter===chapter&&item.verse===verse);
test('full names, accents, case, abbreviations and numbered books resolve to actual offline verses',async()=>{
  for(const [query,book,chapter,verse] of [['JOAO 3:16','João',3,16],['sl23:1','Salmos',23,1],['Gn. 1.1','Gênesis',1,1],['1 Co 13:4','1 Coríntios',13,4],['2jo1:13','2 João',1,13],['Jo 3:16','João',3,16],['Jó 3:16','Jó',3,16]]){
    const result=await searchBible(request(query),fast);assert.equal(result.reference,true);assert.equal(result.matches.length,1);assert.ok(contains(result,book,chapter,verse));assert.equal(result.matches[0].text,text[book][chapter][verse-1]);
  }
});
test('every canonical book name resolves, including accented and numbered names',async()=>{
  for(const book of catalog){const result=await searchBible(request(book.name+' 1:1'),fast);assert.equal(result.matches[0].book,book.name);assert.equal(result.matches[0].text,text[book.name][1][0]);}
});
test('chapter and verse ranges keep exact order and historical numbering',async()=>{
  const chapter=await searchBible(request('Salmos 23'),fast);assert.equal(chapter.matches.length,6);assert.equal(chapter.matches.at(-1).verse,6);
  const range=await searchBible(request('João 3:16–18'),fast);assert.equal(range.matches.length,3);assert.equal(range.matches[0].verse,16);assert.equal(range.matches[2].verse,18);
  const historic=await searchBible(request('Juízes 5:32'),fast);assert.equal(historic.matches.length,1);assert.equal(historic.matches[0].verse,32);
});
test('all words ignores order while exact phrase preserves word order',async()=>{
  const all=await searchBible(request('mundo Deus amou',{book:'João'}),fast);assert.ok(contains(all,'João',3,16));
  const phrase=await searchBible(request('DEUS AMOU O MUNDO',{book:'João',mode:'Frase exata'}),fast);assert.ok(contains(phrase,'João',3,16));
  const reversed=await searchBible(request('mundo Deus amou',{book:'João',mode:'Frase exata'}),fast);assert.ok(!contains(reversed,'João',3,16));
});
test('word boundaries exclude festa from a search for fé and accents do not change text results',async()=>{
  const faith=await searchBible(request('FÉ',{testament:'Novo'}),fast);const plain=await searchBible(request('fe',{testament:'Novo'}),fast);
  assert.ok(contains(faith,'Marcos',11,22));assert.ok(!contains(faith,'João',7,2));assert.equal(JSON.stringify(faith.matches),JSON.stringify(plain.matches));
});
test('book and testament filters apply to text and direct references',async()=>{
  const scoped=await searchBible(request('Deus',{book:'Gênesis',testament:'Antigo'}),fast);assert.ok(scoped.matches.length>20);assert.ok(scoped.matches.every(item=>item.book==='Gênesis'));
  for(const extra of [{testament:'Antigo'},{book:'Salmos'}])assert.equal((await searchBible(request('João 3:16',extra),fast)).matches.length,0);
  assert.equal((await searchBible(request('Deus',{book:'João',testament:'Antigo'}),fast)).matches.length,0);
});
test('results stay canonical and pagination does not duplicate or skip any match',async()=>{
  const result=await searchBible(request('Deus',{book:'João'}),fast);assert.ok(result.matches.length>40);
  const joined=[];for(let page=0;page<Math.ceil(result.matches.length/20);page++)joined.push(...resultPage(result,page));
  assert.equal(JSON.stringify(joined),JSON.stringify(result.matches));assert.equal(new Set(joined.map(item=>item.book+':'+item.chapter+':'+item.verse)).size,joined.length);
  for(let index=1;index<joined.length;index++){const previous=joined[index-1],current=joined[index];assert.ok(current.chapter>previous.chapter||(current.chapter===previous.chapter&&current.verse>previous.verse));}
  assert.equal(resultPage(result,-1).length,0);assert.equal(resultPage(result,0,0).length,0);assert.equal(resultPage(result,99999).length,0);
});
test('invalid queries, references, ranges and filter values report a recoverable input error',async()=>{
  for(const query of ['', 'a', '!!!', 'a'.repeat(121), 'João 22:1', 'João 3:999', 'Sl23:3-1', 'Sl23:0', 'João3:-1', 'João3:16-18-20', 'Desconhecido3:16'])await assert.rejects(searchBible(request(query),fast),SearchInputError);
  for(const extra of [{book:'Desconhecido'},{mode:'unknown'},{testament:'unknown'}])await assert.rejects(searchBible(request('Deus',extra),fast),SearchInputError);
  assert.equal((await searchBible(request('João3:16'),fast)).matches.length,1);
});
test('a text with no matches returns an empty result without touching stored data',async()=>{
  const result=await searchBible(request('palavrainesistente',{book:'Salmos'}),fast);assert.equal(result.reference,false);assert.equal(result.matches.length,0);
});
test('chunked search yields the JS thread and can be cancelled before returning partial results',async()=>{
  let cancelled=false,yields=0;
  await assert.rejects(searchBible(request('Deus'),{cancelled:()=>cancelled,yieldWork:async()=>{yields++;cancelled=true;}}),SearchCancelled);
  assert.equal(yields,1);await assert.rejects(searchBible(request('João3:16'),{cancelled:()=>true}),SearchCancelled);
});
test('a newer reference query completes while an older cancelled full search is pending',async()=>{
  let cancelled=false,resume;const previous=searchBible(request('Deus'),{cancelled:()=>cancelled,yieldWork:()=>new Promise(resolve=>resume=resolve)});
  await new Promise(resolve=>setImmediate(resolve));const newest=await searchBible(request('Sl119:176'),fast);assert.equal(newest.matches[0].verse,176);
  cancelled=true;resume();await assert.rejects(previous,SearchCancelled);
});
