const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const root = path.resolve(__dirname, '../src'); const cache = new Map();
function load(file) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} }; cache.set(file, module.exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Error, setTimeout, require: id => load(path.resolve(path.dirname(file), id.endsWith('.json') ? id : id + '.ts')) });
  return module.exports;
}
const library = load(path.join(root, 'services/saved-library.ts'));
const { searchSavedLibrary, savedBooks, savedLibraryPage } = library;
const fixture = [
  { book: 'João', chapter: 3, verse: 16, favorite: true, note: 'Reflexão: fé, amor e esperança.' },
  { book: 'Salmos', chapter: 23, verse: 1, favorite: true, note: '' },
  { book: 'Gênesis', chapter: 1, verse: 1, favorite: true, note: 'Começo da jornada; festa.' },
  { book: 'Salmos', chapter: 23, verse: 4, favorite: false, note: 'Confiança durante o medo.' },
  { book: 'João', chapter: 3, verse: 17, favorite: false, note: 'Praticar o amor todos os dias.' },
  { book: '1 João', chapter: 4, verse: 8, favorite: true, note: 'Amor a Deus e ao próximo.' },
].map(entry => Object.freeze(entry));
Object.freeze(fixture);
const defaults = { notes: false, query: '', testament: 'Todos', book: '', order: 'Ordem da Bíblia' };
const find = changes => searchSavedLibrary(fixture, { ...defaults, ...changes });
const keys = items => Array.from(items, ({ entry }) => `${entry.book}:${entry.chapter}:${entry.verse}`);

test('favorites and notes use their own membership while keeping every associated field', () => {
  assert.equal(find({}).length, 4); assert.equal(find({ notes: true }).length, 5);
  assert.ok(!keys(find({})).includes('Salmos:23:4'));
  assert.ok(!keys(find({ notes: true })).includes('Salmos:23:1'));
  assert.equal(find({ query: 'João 3:16' })[0].entry.note, fixture[0].note);
});
test('search ignores case and accents, uses whole words and searches both scripture and reflections', () => {
  assert.deepEqual(keys(find({ query: '  FE  ' })), ['João:3:16']);
  assert.deepEqual(keys(find({ query: 'fé' })), ['João:3:16']);
  assert.deepEqual(keys(find({ query: 'PASTOR' })), ['Salmos:23:1']);
  assert.deepEqual(keys(find({ notes: true, query: 'confianca medo' })), ['Salmos:23:4']);
  assert.deepEqual(keys(find({ query: 'genesis' })), ['Gênesis:1:1']);
});
test('full references, abbreviations, chapters and verse ranges use the existing Bible parser', () => {
  assert.deepEqual(keys(find({ query: 'Jo 3:16' })), ['João:3:16']);
  assert.deepEqual(keys(find({ notes: true, query: 'João 3:16-17' })), ['João:3:16', 'João:3:17']);
  assert.deepEqual(keys(find({ query: 'Sl 23' })), ['Salmos:23:1']);
  assert.deepEqual(keys(find({ query: '1Jo 4:8' })), ['1 João:4:8']);
  assert.deepEqual(keys(find({ query: 'João 3:1' })), []);
});
test('personal reflections containing a word followed by a number remain searchable as text', () => {
  const entries = [{ ...fixture[0], note: 'Plano 7: praticar o amor.' }];
  assert.equal(searchSavedLibrary(entries, { ...defaults, notes: true, query: 'Plano 7' }).length, 1);
  assert.throws(() => searchSavedLibrary(entries, { ...defaults, notes: true, query: 'Inventado 1:1' }));
});
test('testament and book filters intersect the query rather than returning another collection', () => {
  assert.deepEqual(keys(find({ testament: 'Antigo' })), ['Gênesis:1:1', 'Salmos:23:1']);
  assert.deepEqual(keys(find({ testament: 'Novo', book: 'João' })), ['João:3:16']);
  assert.deepEqual(keys(find({ testament: 'Antigo', query: 'João 3:16' })), []);
  assert.deepEqual(keys(find({ notes: true, book: 'Salmos', query: 'medo' })), ['Salmos:23:4']);
});
test('canonical order compares chapters and verses numerically, and saved order keeps the input sequence', () => {
  assert.deepEqual(keys(find({})), ['Gênesis:1:1', 'Salmos:23:1', 'João:3:16', '1 João:4:8']);
  assert.deepEqual(keys(find({ order: 'Ordem salva' })), ['João:3:16', 'Salmos:23:1', 'Gênesis:1:1', '1 João:4:8']);
  const entries = [10, 2, 1].map(verse => ({ book: 'João', chapter: 3, verse, favorite: true, note: '' }));
  assert.deepEqual(keys(searchSavedLibrary(entries, defaults)), ['João:3:1', 'João:3:2', 'João:3:10']);
});
test('empty matches are recoverable and invalid references or controls cannot be treated as valid searches', () => {
  assert.equal(find({ query: 'palavrainexistente' }).length, 0);
  for (const changes of [{ query: '!' }, { query: 'a'.repeat(121) }, { query: 'João 99:1' }, { query: 'João 3:160' }, { query: 'Inventado 1:1' }, { testament: 'Inválido' }, { book: 'Inválido' }, { order: 'Inválida' }]) assert.throws(() => find(changes));
});
test('book choices contain only books with saved items in the selected collection and testament', () => {
  assert.deepEqual(Array.from(savedBooks(fixture, false)), ['Gênesis', 'Salmos', 'João', '1 João']);
  assert.deepEqual(Array.from(savedBooks(fixture, true, 'Novo')), ['João', '1 João']);
  assert.deepEqual(Array.from(savedBooks([], false)), []);
});
test('pages remain bounded and consecutive without skipping or duplicating entries', () => {
  const entries = Array.from({ length: 50 }, (_, index) => ({ book: 'Salmos', chapter: 119, verse: index + 1, favorite: true, note: '' }));
  const items = searchSavedLibrary(entries, defaults);
  assert.equal(savedLibraryPage(items, 0).length, 20); assert.equal(savedLibraryPage(items, 2).length, 10);
  assert.deepEqual(keys([...savedLibraryPage(items, 0), ...savedLibraryPage(items, 1), ...savedLibraryPage(items, 2)]), keys(items));
  for (const [page, size] of [[-1, 20], [0.5, 20], [0, 0], [0, 101]]) assert.equal(savedLibraryPage(items, page, size).length, 0);
});
test('search, filtering and pagination never mutate the original saved records or their order', () => {
  const before = JSON.stringify(fixture); const result = find({});
  savedLibraryPage(result, 0); find({ query: 'amor', notes: true }); savedBooks(fixture, true);
  assert.equal(JSON.stringify(fixture), before); assert.equal(result[0].text.includes('principio'), true);
});

function hookFixture() {
  const slots = []; const requests = []; let cursor = 0; let focus;
  const react = {
    useState(value) { const index = cursor++; slots[index] = value; return [value, next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(value) { const index = cursor++; slots[index] = { current: value }; return slots[index]; },
    useCallback(fn) { return fn; },
  };
  const readingRepository = { read: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'hooks/use-reading.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => id === 'react' ? react : id === 'expo-router' ? { useFocusEffect: fn => { focus = fn; } } : { readingRepository } });
  const hook = module.exports.useReading();
  return { slots, requests, hook, focus: () => focus() };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('collection retry recovers after a failed load without requiring navigation away', async () => {
  const f = hookFixture(); const blur = f.focus(); f.requests[0].reject(Error('read')); await flush();
  assert.equal(f.slots[2], false); assert.match(f.slots[1], /carregar/);
  f.hook.retry(); f.requests[1].resolve(fixture); await flush(); assert.equal(f.slots[2], true); assert.equal(f.slots[1], ''); assert.equal(f.slots[0], fixture); blur();
});
test('a load completing after leaving the collection cannot update that screen', async () => {
  const f = hookFixture(); const blur = f.focus(); blur(); f.requests[0].resolve(fixture); await flush();
  assert.equal(f.slots[0].length, 0); assert.equal(f.slots[2], false);
  f.hook.retry(); assert.equal(f.requests.length, 1);
});
test('the most recent collection load wins over an older pending request', async () => {
  const f = hookFixture(); const blur = f.focus(); f.hook.retry();
  f.requests[1].resolve(fixture); await flush(); f.requests[0].resolve([]); await flush();
  assert.equal(f.slots[0], fixture); assert.equal(f.slots[2], true); blur();
});
