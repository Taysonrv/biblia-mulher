const test = require('node:test');
const assert = require('node:assert/strict');
const source = require('../src/data/almeida-1911.json');
test('the existing 11 chapters retain their 250 clean verses', () => {
  const counts = { Gênesis: { 1:31, 2:25, 3:24 }, João: { 1:51, 2:25, 3:36 }, Salmos: { 1:6, 23:6, 91:16, 121:8 }, Eclesiastes: { 3:22 } };
  let total=0;
  for(const [book,chapters] of Object.entries(counts)) for(const [chapter,count] of Object.entries(chapters)) {
    assert.equal(source[book][chapter].length,count, book+' '+chapter);
    for(const verse of source[book][chapter]) { assert.ok(verse.trim().length > 0); assert.doesNotMatch(verse, /[\[\]_]|\n/); }
    total+=count;
  }
  assert.equal(total,250);
});
test('known chapter boundaries and references are in the correct positions', () => {
  assert.match(source.Gênesis['1'][0], /creou.*Deus.*terra/);
  assert.match(source.João['3'][15], /Deus amou o mundo/);
  assert.match(source.Salmos['121'][0], /Levantarei os meus olhos/);
  assert.match(source.Eclesiastes['3'][0], /tempo determinado/);
  assert.match(source.Eclesiastes['3'][21], /suas obras/);
});
