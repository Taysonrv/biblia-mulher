const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path'); const vm=require('node:vm'); const ts=require('typescript');
const moduleValue={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/services/online-bible.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleValue,exports:moduleValue.exports,fetch:()=>{throw Error('Unexpected real request');},AbortController,setTimeout,clearTimeout,Map,Set,Error,TypeError});
const {parseOnlineBooks,parseOnlineChapter,createOnlineBible}=moduleValue.exports;
const catalog=require('./fixtures/online-bible-books.json'); const psalm=require('./fixtures/online-bible-psalm23.json'); const copy=value=>JSON.parse(JSON.stringify(value));
const books=parseOnlineBooks(catalog); const book=books.find(b=>b.id==='PSA');
test('real Portuguese catalog and Psalm 23 preserve six verses and translation identity',()=>{
  assert.equal(books.length,66);const chapter=parseOnlineChapter(psalm,book,23);assert.equal(chapter.verses.length,6);assert.equal(chapter.verses[0].text,psalm.chapter.content.find(i=>i.type==='verse').text);
});
test('unreviewed translation, licence changes, malformed verses and wrong chapter are rejected',()=>{
  for(const mutate of [d=>d.translation.id='other',d=>d.translation.license.commercialUse='forbidden',d=>d.translation.license.copyleft=true,d=>d.books.pop()]){const data=copy(catalog);mutate(data);assert.throws(()=>parseOnlineBooks(data));}
  for(const mutate of [d=>d.book.id='GEN',d=>d.chapter.number=24,d=>d.chapter.content=[],d=>d.chapter.content.find(i=>i.type==='verse').text='',d=>d.chapter.content.push(d.chapter.content.find(i=>i.type==='verse'))]){const data=copy(psalm);mutate(data);assert.throws(()=>parseOnlineChapter(data,book,23));}
});
test('request uses only fixed public source, caches bounded chapters and sends no credentials',async()=>{
  const calls=[]; const api=createOnlineBible(async(url,options)=>{calls.push({url,options});if(url.endsWith('books.json'))return {ok:true,text:async()=>JSON.stringify(catalog)};const raw=copy(psalm);raw.chapter.number=Number(url.match(/\/(\d+)\.simple/)[1]);return {ok:true,text:async()=>JSON.stringify(raw)};});
  await api.books();await api.books();await api.chapter(book,23);await api.chapter(book,23);assert.equal(calls.length,2);
  assert.ok(calls.every(call=>call.url.startsWith('https://bible.helloao.org/api/por_blj/')));assert.ok(calls.every(call=>!call.options.headers&&!call.options.body));
  for(let n=1;n<=9;n++)await api.chapter(book,n);const previous=calls.length;await api.chapter(book,23);assert.equal(calls.length,previous+1);
  const before=calls.length;for(const value of [0,151,NaN,1.5])await assert.rejects(api.chapter(book,value));await assert.rejects(api.chapter({...book,id:'../'},1));assert.equal(calls.length,before);
});
test('network and HTTP failures do not poison cache and allow retry',async()=>{
  let fail=true;const api=createOnlineBible(async()=>({ok:!fail,text:async()=>JSON.stringify(catalog)}));await assert.rejects(api.books());fail=false;assert.equal((await api.books()).length,66);
});
