const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const records = new Map();
const storage = {
  async getItem(key) { return records.get(key) ?? null; },
  async setItem(key, value) { records.set(key, value); },
};
const filename = path.resolve(__dirname, '../src/services/ministerial-preparation.ts');
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleLike = { exports: {} };
vm.runInNewContext(code, {
  module: moduleLike, exports: moduleLike.exports, JSON, Object, Array, Set, Error,
  require(id) {
    if (id === '@react-native-async-storage/async-storage') return { default: storage, ...storage };
    throw new Error('Unexpected dependency: ' + id);
  },
}, { filename });
const { createPreparationRepository, decodePreparation, togglePreparation, PREPARATION_KEY } = moduleLike.exports;

test('task completion is saved for each event and survives repository restart', async () => {
  records.clear();
  const repo = createPreparationRepository(storage);
  const next = await repo.toggle('event-1', 'text');
  assert.equal(next['event-1'].includes('text'), true);
  await repo.toggle('event-2', 'prayer');
  const restarted = createPreparationRepository(storage);
  const rows = await restarted.read();
  assert.equal(rows['event-1'][0], 'text');
  assert.equal(rows['event-2'][0], 'prayer');
  const reversed = await restarted.toggle('event-1', 'text');
  assert.equal(reversed['event-1'].length, 0);
});
test('legacy empty store loads without modifying agenda', () => {
  assert.equal(Object.keys(decodePreparation(null)).length, 0);
  assert.equal(PREPARATION_KEY, '@biblia-mulher/preparation/v1');
});
test('invalid data is preserved instead of being silently overwritten', async () => {
  for (const invalid of ['{invalid', '{"version":2,"progress":{}}', '{"version":1,"progress":{"event-1":["unknown"]}}']) {
    records.set(PREPARATION_KEY, invalid);
    const repo = createPreparationRepository(storage);
    await assert.rejects(repo.toggle('event-1', 'text'));
    assert.equal(records.get(PREPARATION_KEY), invalid);
  }
});
test('invalid event ids and tasks are rejected', () => {
  assert.throws(() => togglePreparation({}, '../invalid', 'text'));
  assert.throws(() => togglePreparation({}, 'event-1', 'invalid'));
});
