const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(filename) {
  if (filename.endsWith('.json')) return require(filename);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => load(path.resolve(path.dirname(filename), id.endsWith('.json') ? id : id + '.ts')) });
  return module.exports;
}
const { createJourneyRepository, JOURNEY_KEY, HISTORY_LIMIT } = load(path.resolve(__dirname, '../src/services/reading-journey-repository.ts'));
const { bibleBooks, adjacentChapter, validChapter } = load(path.resolve(__dirname, '../src/data/bible-catalog.ts'));
function setup(raw = null, now = () => 1000) {
  const state = { raw, fail: false, writes: 0, other: 'favorite and note unchanged' };
  const storage = {
    async getItem(key) { assert.equal(key, JOURNEY_KEY); return state.raw; },
    async setItem(key, value) { assert.equal(key, JOURNEY_KEY); if (state.fail) throw Error('disk'); state.raw = value; state.writes++; },
  };
  return { state, storage, repo: createJourneyRepository(storage, now) };
}
test('visits are serialized, persist across restart, and revisits move to the front without duplicates', async () => {
  const { repo, storage, state } = setup();
  await Promise.all([repo.record('Gênesis', 50), repo.record('Êxodo', 1), repo.record('Gênesis', 50)]);
  const entries = await createJourneyRepository(storage).read();
  assert.equal(entries.length, 2); assert.equal(entries[0].book, 'Gênesis'); assert.equal(entries[1].book, 'Êxodo');
  assert.equal(entries[0].visitedAt, 1002); assert.equal(state.other, 'favorite and note unchanged');
});
test('history keeps the 100 most recent unique chapters and includes the last canonical book', async () => {
  const { repo } = setup();
  for (let chapter = 1; chapter <= 101; chapter++) await repo.record('Salmos', chapter);
  await repo.record('Apocalipse', 22);
  const entries = await repo.read(); assert.equal(entries.length, HISTORY_LIMIT);
  assert.equal(entries[0].book, 'Apocalipse'); assert.equal(entries.at(-1).chapter, 3);
});
test('invalid references cannot write and do not poison the next operation', async () => {
  const { repo, state } = setup();
  for (const [book, chapter] of [['Inválido', 1], ['João', 22], ['Gênesis', 0], ['Salmos', 1.5], ['Salmos', NaN]]) await assert.rejects(repo.record(book, chapter));
  assert.equal(state.raw, null); assert.equal(state.writes, 0);
  await repo.record('João', 4); assert.equal((await repo.read())[0].chapter, 4);
});
test('corrupt, incompatible and duplicate histories are preserved without overwriting', async () => {
  const entry = { book: 'Gênesis', chapter: 1, visitedAt: 1000 };
  const rawValues = ['broken', '{"version":2,"entries":[]}', JSON.stringify({ version: 1, translation: 'other', entries: [] }),
    ...[[entry, entry], [{ ...entry, visitedAt: 0 }], [{ ...entry, chapter: 51 }], [entry, { ...entry, chapter: 2, visitedAt: 1001 }]].map(entries => JSON.stringify({ version: 1, translation: 'almeida-1911', entries }))];
  for (const raw of rawValues) { const { repo, state } = setup(raw); await assert.rejects(repo.read()); await assert.rejects(repo.record('João', 1)); assert.equal(state.raw, raw); assert.equal(state.writes, 0); }
});
test('a failed write preserves the last chapter and retry works', async () => {
  const { repo, state } = setup(); await repo.record('Gênesis', 1); const saved = state.raw;
  state.fail = true; await assert.rejects(repo.record('Gênesis', 2)); assert.equal(state.raw, saved);
  state.fail = false; await repo.record('Gênesis', 2); assert.equal((await repo.read())[0].chapter, 2);
});
test('clock rollback cannot reorder visits and invalid timestamps cannot write', async () => {
  let clock = 2000; const { repo } = setup(null, () => clock);
  await repo.record('Gênesis', 1); clock = 1000; await repo.record('Gênesis', 2);
  assert.equal((await repo.read())[0].visitedAt, 2001);
  const invalid = setup(null, () => NaN); await assert.rejects(invalid.repo.record('Gênesis', 1)); assert.equal(invalid.state.raw, null);
});
test('read waits for pending persistence before returning the last chapter', async () => {
  let finish; let raw = null;
  const storage = { async getItem() { return raw; }, async setItem(key, value) { await new Promise(resolve => { finish = resolve; }); raw = value; } };
  const repo = createJourneyRepository(storage, () => 1000);
  const write = repo.record('João', 4); const read = repo.read();
  await new Promise(resolve => setImmediate(resolve)); finish(); await write;
  assert.equal((await read)[0].book, 'João'); assert.equal((await read)[0].chapter, 4);
});
test('every chapter navigates forward and backward consecutively across all 66 books', () => {
  let current = { book: 'Gênesis', chapter: 1 }; let total = 0;
  assert.equal(adjacentChapter(current.book, current.chapter, -1), null);
  while (current) {
    total++; assert.ok(total <= 1189); assert.ok(validChapter(current.book, current.chapter));
    const next = adjacentChapter(current.book, current.chapter, 1);
    if (next) { const previous = adjacentChapter(next.book, next.chapter, -1); assert.equal(previous.book, current.book); assert.equal(previous.chapter, current.chapter); }
    else { assert.equal(current.book, 'Apocalipse'); assert.equal(current.chapter, 22); }
    current = next;
  }
  assert.equal(total, 1189); assert.equal(bibleBooks.length, 66); assert.equal(adjacentChapter('João', 22, 1), null);
});
