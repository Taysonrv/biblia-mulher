const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/reader-preferences-repository.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { exports: exportsObject });
const { createReaderPreferencesRepository, readerPreferencesKey } = exportsObject;
const plain = value => JSON.parse(JSON.stringify(value));
function setup(raw = null) {
  const state = { rows: new Map([['other-data', 'preserved'], [readerPreferencesKey, raw]]), writes: 0, failRead: false, failWrite: false };
  const storage = {
    async getItem(key) { if (state.failRead) throw Error('read failure'); return state.rows.get(key) ?? null; },
    async setItem(key, value) { if (state.failWrite) throw Error('write failure'); state.writes++; state.rows.set(key, value); },
  };
  return { state, storage, repo: createReaderPreferencesRepository(storage) };
}
test('first read uses the existing reading appearance and does not write or expose shared mutable defaults', async () => {
  const { repo, state } = setup(); const initial = await repo.read();
  assert.deepEqual(plain(initial), { size: 'standard', spacing: 'standard', layout: 'cards' });
  initial.size = 'large'; assert.equal((await repo.read()).size, 'standard'); assert.equal(state.writes, 0);
});
test('preferences survive a restart and patches retain other choices and unrelated data', async () => {
  const { repo, storage, state } = setup();
  await repo.update({ size: 'large' }); await repo.update({ spacing: 'wide' }); await repo.update({ layout: 'continuous' });
  assert.deepEqual(plain(await createReaderPreferencesRepository(storage).read()), { size: 'large', spacing: 'wide', layout: 'continuous' });
  assert.equal(state.rows.get('other-data'), 'preserved');
});
test('concurrent preference changes serialize rather than losing another selected option', async () => {
  const { repo } = setup();
  await Promise.all([repo.update({ size: 'medium' }), repo.update({ spacing: 'wide' }), repo.update({ layout: 'continuous' })]);
  assert.deepEqual(plain(await repo.read()), { size: 'medium', spacing: 'wide', layout: 'continuous' });
});
test('invalid changes never write and the queue recovers for the next valid choice', async () => {
  const { repo, state } = setup();
  for (const invalid of [null, [], {}, { size: 'huge' }, { spacing: 3 }, { layout: 'unknown' }, { theme: 'dark' }, { size: 'large', extra: true }]) await assert.rejects(repo.update(invalid));
  assert.equal(state.writes, 0); assert.equal((await repo.update({ size: 'large' })).size, 'large');
});
test('corrupt or incompatible preferences are preserved and cannot be overwritten even by restoring defaults', async () => {
  for (const raw of ['invalid', 'null', '{"version":2,"preferences":{}}', '{"version":1,"preferences":{"size":"large"}}', '{"version":1,"preferences":{"size":"standard","spacing":"standard","layout":"cards","extra":true}}']) {
    const { repo, state } = setup(raw); await assert.rejects(repo.read());
    await assert.rejects(repo.update({ size: 'standard', spacing: 'standard', layout: 'cards' }));
    assert.equal(state.rows.get(readerPreferencesKey), raw); assert.equal(state.writes, 0);
  }
});
test('failed writes keep the old appearance and a later retry persists the requested change', async () => {
  const { repo, state } = setup(); await repo.update({ size: 'medium' }); const before = state.rows.get(readerPreferencesKey);
  state.failWrite = true; await assert.rejects(repo.update({ size: 'large' })); assert.equal(state.rows.get(readerPreferencesKey), before);
  state.failWrite = false; assert.equal((await repo.read()).size, 'medium'); assert.equal((await repo.update({ size: 'large' })).size, 'large');
});
test('reads wait for pending writes and a failed read does not block later operations', async () => {
  const { repo, state } = setup();
  const saving = repo.update({ layout: 'continuous' }); const reading = repo.read();
  await saving; assert.equal((await reading).layout, 'continuous');
  state.failRead = true; await assert.rejects(repo.read()); state.failRead = false;
  assert.equal((await repo.update({ spacing: 'wide' })).layout, 'continuous');
});
test('restoring defaults resets every preference while keeping other local data', async () => {
  const { repo, state } = setup(); await repo.update({ size: 'large', spacing: 'wide', layout: 'continuous' });
  await repo.update({ size: 'standard', spacing: 'standard', layout: 'cards' });
  assert.deepEqual(plain(await repo.read()), { size: 'standard', spacing: 'standard', layout: 'cards' });
  assert.equal(state.rows.get('other-data'), 'preserved');
});
