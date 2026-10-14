const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleValue = { exports: {} };
function load(filename) {
  if (filename.endsWith('.json')) return require(filename);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Set, Error, require: id => load(require('node:path').resolve(require('node:path').dirname(filename), id.endsWith('.json') ? id : id + '.ts')) });
  return module.exports;
}
const code = ts.transpileModule(fs.readFileSync(require('node:path').resolve(__dirname, '../src/services/reading-repository.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
vm.runInNewContext(code, { module: moduleValue, exports: moduleValue.exports, Set, Error, require: id => load(require('node:path').resolve(__dirname, '../src/services', id + '.ts')) });
const { createReadingRepository } = moduleValue.exports;
function setup(raw = null) {
  const state = { raw, fail: false };
  const storage = { async getItem() { return state.raw; }, async setItem(key, value) { if (state.fail) throw Error('disk'); state.raw = value; } };
  return { state, storage, repo: createReadingRepository(storage) };
}
test('favorites and notes survive restart without overwriting each other', async () => {
  const { repo, storage } = setup();
  await repo.toggleFavorite(1); await repo.saveNote(1, '  Confiança  ');
  const restarted = createReadingRepository(storage);
  assert.equal((await restarted.read())[0].note, 'Confiança');
  await restarted.toggleFavorite(1);
  assert.equal((await restarted.read())[0].note, 'Confiança');
  await restarted.saveNote(1, ''); assert.equal((await restarted.read()).length, 0);
});
test('concurrent changes keep both verses and repeated toggles', async () => {
  const { repo } = setup();
  await Promise.all([repo.toggleFavorite(1), repo.saveNote(2, 'Paz'), repo.toggleFavorite(1)]);
  const entries = await repo.read(); assert.equal(entries.length, 1); assert.equal(entries[0].verse, 2);
});
test('corrupt stores are preserved', async () => {
  for (const raw of ['broken', '{"version":3,"entries":[]}', '{"version":1,"entries":[{"verse":7,"note":"","favorite":true}]}']) {
    const { repo, state } = setup(raw); await assert.rejects(repo.toggleFavorite(1)); assert.equal(state.raw, raw);
  }
});
test('write failures preserve previous data and allow retry', async () => {
  const { repo, state } = setup(); await repo.saveNote(1, 'Anterior'); const saved = state.raw;
  state.fail = true; await assert.rejects(repo.saveNote(1, 'Novo')); assert.equal(state.raw, saved);
  state.fail = false; await repo.toggleFavorite(1); assert.equal((await repo.read())[0].note, 'Anterior');
});
test('invalid verse and oversized notes cannot write', async () => {
  const { repo, state } = setup(); await assert.rejects(repo.saveNote(0, 'x')); await assert.rejects(repo.saveNote(1, 'x'.repeat(2001))); assert.equal(state.raw, null);
});

test('version 1 favorites and notes migrate without losing Psalm 23', async () => {
  const raw = JSON.stringify({ version: 1, entries: [{ verse: 1, favorite: true, note: 'Minha reflexão' }] });
  const { repo, state } = setup(raw);
  assert.equal((await repo.read())[0].book, 'Salmos'); assert.equal(state.raw, raw);
  await repo.toggleFavorite(1, 'João', 1);
  const entries = await repo.read(); assert.equal(entries.length, 2);
  assert.equal(entries[0].note, 'Minha reflexão'); assert.equal(JSON.parse(state.raw).version, 2);
});
test('same verse number in different books remains independent', async () => {
  const { repo } = setup();
  await repo.saveNote(1, 'Criação', 'Gênesis', 1); await repo.saveNote(1, 'Verbo', 'João', 1);
  await repo.toggleFavorite(1, 'Gênesis', 1);
  const entries = await repo.read(); assert.equal(entries.length, 2);
  assert.equal(entries.find(e => e.book === 'João').note, 'Verbo');
  await assert.rejects(repo.toggleFavorite(1, 'João', 22));
});

test('favorites and notes persist on chapters beyond the original sample', async () => {
  const { repo, storage } = setup();
  await repo.toggleFavorite(54, 'João', 4);
  await repo.saveNote(21, 'Esperança', 'Apocalipse', 22);
  const entries = await createReadingRepository(storage).read();
  assert.equal(entries.find(e => e.book === 'João' && e.chapter === 4 && e.verse === 54).favorite, true);
  assert.equal(entries.find(e => e.book === 'Apocalipse' && e.chapter === 22 && e.verse === 21).note, 'Esperança');
  await assert.rejects(repo.toggleFavorite(22, 'Apocalipse', 22));
});

test('removing and undoing a favorite preserves the latest reflection, including concurrent edits', async () => {
  const { repo, storage } = setup();
  await repo.saveNote(16, 'Original', 'João', 3); await repo.setFavorite(16, true, 'João', 3);
  await repo.setFavorite(16, false, 'João', 3);
  assert.equal((await repo.read())[0].note, 'Original');
  await Promise.all([repo.saveNote(16, 'Reflexão atualizada', 'João', 3), repo.setFavorite(16, true, 'João', 3), repo.setFavorite(16, true, 'João', 3)]);
  const rows = await createReadingRepository(storage).read();
  assert.equal(rows.length, 1); assert.equal(rows[0].favorite, true); assert.equal(rows[0].note, 'Reflexão atualizada');
});

test('undoing removal of the last favorite restores only that reference without adding a note', async () => {
  const { repo } = setup();
  await repo.setFavorite(1, true, 'Gênesis', 1); await repo.setFavorite(1, false, 'Gênesis', 1);
  assert.equal((await repo.read()).length, 0);
  await repo.setFavorite(1, true, 'Gênesis', 1);
  const rows = await repo.read(); assert.equal(rows.length, 1); assert.equal(rows[0].note, ''); assert.equal(rows[0].book, 'Gênesis');
});

test('favorite setter rejects invalid input, preserves corrupted or failed stores and recovers on retry', async () => {
  const { repo, state } = setup();
  await repo.setFavorite(1, true); const previous = state.raw;
  await assert.rejects(repo.setFavorite(1, 'true')); await assert.rejects(repo.setFavorite(99, false)); assert.equal(state.raw, previous);
  state.fail = true; await assert.rejects(repo.setFavorite(1, false)); assert.equal(state.raw, previous);
  state.fail = false; await repo.setFavorite(1, false); assert.equal((await repo.read()).length, 0);
  state.raw = 'corrupted'; await assert.rejects(repo.setFavorite(1, true)); assert.equal(state.raw, 'corrupted');
});
