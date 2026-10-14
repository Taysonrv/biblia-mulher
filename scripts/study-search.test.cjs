const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const cache = new Map();
function load(filename) {
  if (filename.endsWith('.json')) return require(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => load(path.resolve(path.dirname(filename), id.endsWith('.json') ? id : id + '.ts')), Set });
  return module.exports;
}
const { searchStudies, studySearchTerms, studyResultPage, STUDY_SEARCH_PAGE_SIZE } = load(path.resolve(__dirname, '../src/services/study-search.ts'));
const { bookStudies, wordStudies } = load(path.resolve(__dirname, '../src/services/studies.ts'));
test('empty and punctuation-only queries do not show an unrelated catalog', () => {
  for (const query of ['', '  ', '?!', '::']) assert.equal(searchStudies(query).length, 0);
  assert.equal(studySearchTerms('paz PAZ').length, 1); assert.equal(searchStudies('zzzzzz').length, 0);
});
test('exact book names, transliteration, Strong and original scripts resolve and rank the intended study first', () => {
  for (const [query, id, kind] of [['GÊNESIS', 'genesis', 'Livros'], ['genesis', 'genesis', 'Livros'], ['agape', 'agape', 'Palavras'], ['λόγος', 'logos', 'Palavras'], ['λογοσ', 'logos', 'Palavras'], ['שָׁלוֹם', 'shalom', 'Palavras'], ['שלום', 'shalom', 'Palavras'], ['h7965', 'shalom', 'Palavras']]) {
    const first = searchStudies(query)[0]; assert.ok(first, query); assert.equal(first.id, id, query); assert.equal(first.kind, kind);
  }
});
test('full study content includes reflections, composition, outlines and word context beyond catalog metadata', () => {
  const shalom = searchStudies('ausência de guerra').find(row => row.id === 'shalom'); assert.ok(shalom); assert.equal(shalom.matchedField, 'Observe o contexto'); assert.match(shalom.excerpt, /ausência de guerra/);
  const genesis = searchStudies('José preservação').find(row => row.id === 'genesis'); assert.ok(genesis); assert.equal(genesis.matchedField, 'Esboço do livro'); assert.match(genesis.excerpt, /José/);
  const reflection = searchStudies(bookStudies[0].reflection); assert.ok(reflection.some(row => row.id === 'genesis' && row.matchedField === 'Para refletir'));
  assert.ok(searchStudies('forma final').some(row => row.id === 'genesis' && row.matchedField === 'Data e composição'));
});
test('all terms must match and word order, repeated whitespace and Portuguese accents do not matter', () => {
  const a = searchStudies('bondade fiel').map(row => row.kind + ':' + row.id); const b = searchStudies('  FIEL   bondade ').map(row => row.kind + ':' + row.id);
  assert.equal([...a].sort().join(','), [...b].sort().join(',')); assert.equal(searchStudies('bondade zzzzz').length, 0);
  assert.equal(searchStudies('alianca').map(row => row.id).join(','), searchStudies('aliança').map(row => row.id).join(','));
});
test('reference queries search the actual example reference, including spaces around the colon', () => {
  for (const query of ['João 1:1', 'JOAO 1 : 1']) { const rows = searchStudies(query); assert.equal(rows.map(row => row.id).join(','), 'logos'); assert.ok(rows.every(row => row.kind === 'Palavras')); assert.ok(rows.some(row => row.matchedField === 'Na passagem' && row.excerpt.includes('João 1:1'))); }
  assert.equal(searchStudies('João 1:16').map(row => row.id).join(','), 'charis');
  assert.equal(searchStudies('João 999:1').length, 0);
});
test('category, testament and language filters restrict results and do not create duplicate targets', () => {
  const books = searchStudies('a', { kind: 'Livros', testament: 'Novo' }); assert.ok(books.length); assert.ok(books.every(row => bookStudies.find(book => book.id === row.id)?.testament === 'Novo'));
  const words = searchStudies('a', { kind: 'Palavras', language: 'Grego' }); assert.ok(words.length); assert.ok(words.every(row => wordStudies.find(word => word.id === row.id)?.language === 'Grego'));
  assert.equal(searchStudies('shalom', { kind: 'Livros' }).length, 0); assert.equal(searchStudies('H7965', { kind: 'Palavras', language: 'Grego' }).length, 0);
  const all = searchStudies('a'); assert.equal(new Set(all.map(row => row.kind + ':' + row.id)).size, all.length);
});
test('pagination visits every result once and safely clamps obsolete or invalid pages', () => {
  const rows = searchStudies('a'); const visited = [];
  for (let page = 0; page < Math.ceil(rows.length / STUDY_SEARCH_PAGE_SIZE); page++) { const next = studyResultPage(rows, page); assert.ok(next.rows.length <= STUDY_SEARCH_PAGE_SIZE); visited.push(...next.rows.map(row => row.kind + ':' + row.id)); }
  assert.equal(visited.join(','), rows.map(row => row.kind + ':' + row.id).join(','));
  assert.equal(studyResultPage(rows, -1).page, 0); assert.equal(studyResultPage(rows, NaN).page, 0); assert.equal(studyResultPage(rows, Infinity).page, 0);
  assert.equal(studyResultPage(searchStudies('h7965'), 99).page, 0); assert.equal(studyResultPage([], 99).pages, 0); assert.equal(studyResultPage([], 99).rows.length, 0);
});
test('repeated searches are deterministic, do not mutate source content and return independent result objects', () => {
  const before = JSON.stringify([bookStudies, wordStudies]); const first = searchStudies('paz'); const original = JSON.stringify(first);
  first[0].title = 'Alteração da tela'; first.reverse(); assert.equal(JSON.stringify(searchStudies('paz')), original); assert.equal(JSON.stringify([bookStudies, wordStudies]), before);
  for (const row of searchStudies('a')) { assert.ok(row.title && row.subtitle && row.excerpt && row.matchedField); assert.ok((row.kind === 'Livros' ? bookStudies : wordStudies).some(item => item.id === row.id)); }
});
