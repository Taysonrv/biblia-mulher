const test=require('node:test');
const assert=require('node:assert/strict');
const source=require('../src/data/biblia-livre-2018.json');
const catalog=require('../src/data/bible-catalog.json');
test('Brazilian offline translation has a complete, ordered canon and contiguous verse arrays',()=>{
assert.equal(source.books.length,66);let chapters=0,verses=0;
source.books.forEach((book,i)=>{assert.equal(book.order,i+1);assert.equal(book.name,catalog[i].name);assert.equal(book.chapters,catalog[i].chapters);const text=source.text[book.id];assert.equal(Object.keys(text).length,book.chapters);for(let n=1;n<=book.chapters;n++){assert.ok(text[n].length>0);assert.ok(text[n].every(v=>typeof v==='string'&&v.trim()));chapters++;verses+=text[n].length;}});
assert.equal(chapters,1189);assert.equal(verses,31102);
});
test('Leviticus uses current Brazilian spelling from the licensed edition',()=>{
assert.match(source.text.LEV[1][0],/Moisés, e falou com ele/);
assert.match(source.text.LEV[1][1],/filhos de Israel/);
assert.match(source.text.LEV[1][1],/oferecer oferta/);
assert.doesNotMatch(source.text.LEV[1].join(' '),/offerta|d’Israel|d'Israel|fallou/);
});
