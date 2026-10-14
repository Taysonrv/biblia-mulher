const test = require('node:test');
const assert = require('node:assert/strict');
const source = require('../src/data/almeida-1911.json');
const catalog = require('../src/data/bible-catalog.json');
test('complete offline Bible has 66 books, 1189 consecutive chapters and 31105 clean verses', () => {
  assert.equal(catalog.length, 66); assert.equal(Object.keys(source).length, 66);
  let chapterTotal = 0; let verseTotal = 0;
  for (const book of catalog) {
    assert.equal(Object.keys(source[book.name]).length, book.chapters, book.name);
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      const verses = source[book.name][chapter]; assert.ok(Array.isArray(verses) && verses.length > 0, book.name + ' ' + chapter);
      chapterTotal++; verseTotal += verses.length;
      for (const verse of verses) { assert.ok(verse.trim().length > 0); assert.doesNotMatch(verse, /[\[\]_]|\n|Gutenberg|End of the Project|START OF THE PROJECT/i); }
    }
  }
  assert.equal(chapterTotal, 1189); assert.equal(verseTotal, 31105);
  assert.equal(source.Salmos[119].length, 176); assert.equal(source.Lamentações[3].length, 66);
});
test('source formatting exceptions retain their verse positions', () => {
  assert.equal(source.Oséias[11].length, 12);
  assert.doesNotMatch(source.Oséias[11][3], /5 Não/); assert.match(source.Oséias[11][4], /Não/);
  assert.equal(source.Marcos[4].length, 41); assert.match(source.Marcos[4][33], /sem parabolas/);
  assert.match(source.Apocalipse[22].at(-1), /graça.*Jesus/i);
});
