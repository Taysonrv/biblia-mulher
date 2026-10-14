const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const cache = new Map();
function load(filename) {
  if (filename.endsWith('.json')) return require(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => load(path.resolve(path.dirname(filename), id.endsWith('.json') ? id : id + '.ts')), Date, Set, Map, Proxy, Reflect, Object, JSON, Promise, Error });
  return module.exports;
}
const service = name => load(path.resolve(__dirname, '../src/services/' + name + '.ts'));
const { buildLocalOutline } = service('sermon');
const { createSermonRepository, encodeSermons, SERMON_KEY, MAX_SERMONS, suggestSermonCopyTitle } = service('sermon-repository');
const { createDataCoordinator } = service('data-coordinator');
const { createBackupRepository } = service('backup-repository');
const NOW = Date.parse('2026-10-01T18:00:00Z');
const sameData = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
const record = (id = 'sample') => ({ id, topic: 'Perdão', outline: buildLocalOutline('Perdão'), notes: 'Exemplo pessoal', createdAt: NOW - 20, updatedAt: NOW - 10 });
function setup(initial = {}) {
  const values = new Map(Object.entries(initial)); const state = { writes: 0, fail: false, readFail: false }; let serial = 0;
  const storage = { async getItem(key) { if (state.readFail) throw Error('Read failure'); return values.get(key) ?? null; }, async setItem(key, value) { state.writes++; if (state.fail) throw Error('Write failure'); values.set(key, value); }, async removeItem(key) { values.delete(key); } };
  const coordinator = createDataCoordinator(storage); const repo = coordinator.wrap(createSermonRepository(storage, () => NOW, () => 'new-' + ++serial));
  return { repo, values, state, storage, coordinator, backups: createBackupRepository(storage, coordinator, () => NOW) };
}

test('copy preserves the complete source and notes with a new identity and independent edits', async () => {
  const source = record(); const { repo } = setup({ [SERMON_KEY]: encodeSermons([source]) });
  const copy = await repo.duplicate(source.id, '  Nova mensagem  ', source.updatedAt);
  assert.notEqual(copy.id, source.id); assert.equal(copy.outline.theme, 'Nova mensagem'); assert.equal(copy.notes, source.notes); assert.equal(copy.topic, source.topic);
  assert.equal(copy.createdAt, NOW); assert.equal(copy.updatedAt, NOW);
  for (const field of ['baseText', 'introduction', 'points', 'application', 'conclusion', 'references', 'questions']) sameData(copy.outline[field], source.outline[field]);
  await repo.save(copy.id, { ...copy.outline, introduction: 'Introdução para outra comunidade' }, 'Outra nota', copy.updatedAt);
  sameData((await repo.read()).find(row => row.id === source.id), source);
  const reloaded = await createSermonRepository(setup({ [SERMON_KEY]: encodeSermons(await repo.read()) }).storage).read();
  assert.equal(reloaded.length, 2); assert.equal(reloaded.find(row => row.id === copy.id).notes, 'Outra nota');
});

test('copy title suggestions are bounded, distinguish successive copies and keep Unicode characters intact', () => {
  const source = record(); const first = suggestSermonCopyTitle(source.outline.theme, [source]); assert.equal(first, 'Cópia de Perdão');
  const copy = { ...source, id: 'copy', outline: { ...source.outline, theme: first } };
  assert.equal(suggestSermonCopyTitle(source.outline.theme, [source, copy]), 'Cópia de Perdão (2)');
  const theme = 'a'.repeat(289) + '😀abc'; const title = suggestSermonCopyTitle(theme, []);
  assert.ok(title.length <= 300); assert.ok(title.endsWith('…')); assert.equal(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(title), false);
  assert.equal(source.outline.theme, 'Perdão');
});

test('blank, overlong and existing titles cannot create ambiguous copies or write to storage', async () => {
  const source = record(); const other = { ...record('other'), outline: { ...source.outline, theme: 'Outra mensagem' } };
  const { repo, state } = setup({ [SERMON_KEY]: encodeSermons([source, other]) });
  for (const title of ['', '   ', 'x'.repeat(301), ' perdão ', ' OUTRA MENSAGEM ']) await assert.rejects(repo.duplicate(source.id, title, source.updatedAt));
  assert.equal(state.writes, 0); assert.equal((await repo.read()).length, 2);
});

test('stale or missing sources cannot be duplicated or deleted after a newer edit', async () => {
  const source = record(); const { repo, state } = setup({ [SERMON_KEY]: encodeSermons([source]) });
  const updated = await repo.save(source.id, source.outline, 'Nota atualizada', source.updatedAt); const writes = state.writes;
  await assert.rejects(repo.duplicate(source.id, 'Nova mensagem', source.updatedAt), /mudou/);
  await assert.rejects(repo.remove(source.id, source.updatedAt), /mudou/);
  await assert.rejects(repo.remove('missing', source.updatedAt), /não foi encontrado/);
  await assert.rejects(repo.duplicate('missing', 'Nova mensagem', source.updatedAt), /não foi encontrado/);
  assert.equal(state.writes, writes); sameData((await repo.read())[0], updated);
});

test('deletion removes only the selected message and prevents repeated deletion and stale editor saves', async () => {
  const source = record(); const other = record('other'); const { repo, state, values } = setup({ [SERMON_KEY]: encodeSermons([source, other]), untouched: 'unchanged' });
  await repo.remove(source.id, source.updatedAt); sameData(await repo.read(), [other]); const writes = state.writes;
  await assert.rejects(repo.remove(source.id, source.updatedAt)); await assert.rejects(repo.save(source.id, source.outline, 'Texto antigo', source.updatedAt));
  assert.equal(state.writes, writes); assert.equal(values.get('untouched'), 'unchanged');
  await repo.remove(other.id, other.updatedAt); assert.equal((await repo.read()).length, 0);
  assert.equal((await createSermonRepository(setup({ [SERMON_KEY]: values.get(SERMON_KEY) }).storage).read()).length, 0);
});

test('failed copy and deletion writes preserve the stored bytes and allow a later retry', async () => {
  const source = record(); const { repo, state, values } = setup({ [SERMON_KEY]: encodeSermons([source]) }); const before = values.get(SERMON_KEY);
  state.fail = true; await assert.rejects(repo.duplicate(source.id, 'Nova mensagem', source.updatedAt)); assert.equal(values.get(SERMON_KEY), before);
  await assert.rejects(repo.remove(source.id, source.updatedAt)); assert.equal(values.get(SERMON_KEY), before);
  state.fail = false; await repo.duplicate(source.id, 'Nova mensagem', source.updatedAt); await repo.remove(source.id, source.updatedAt);
  assert.equal((await repo.read()).length, 1); assert.equal((await repo.read())[0].outline.theme, 'Nova mensagem');
});

test('corrupt stores and read failures reject both operations without replacing local data', async () => {
  for (const raw of ['', 'broken', JSON.stringify({ version: 4, sermons: [] })]) {
    const { repo, state, values } = setup({ [SERMON_KEY]: raw });
    await assert.rejects(repo.duplicate('sample', 'Nova mensagem', NOW)); await assert.rejects(repo.remove('sample', NOW)); assert.equal(state.writes, 0); assert.equal(values.get(SERMON_KEY), raw);
  }
  const source = record(); const { repo, state, values } = setup({ [SERMON_KEY]: encodeSermons([source]) }); const before = values.get(SERMON_KEY); state.readFail = true;
  await assert.rejects(repo.duplicate(source.id, 'Nova mensagem', source.updatedAt)); await assert.rejects(repo.remove(source.id, source.updatedAt)); assert.equal(values.get(SERMON_KEY), before); assert.equal(state.writes, 0);
});

test('copy and removal share the repository queue and cannot recreate a removed source', async () => {
  const source = record(); const { repo } = setup({ [SERMON_KEY]: encodeSermons([source]) });
  const [copy] = await Promise.all([repo.duplicate(source.id, 'Nova mensagem', source.updatedAt), repo.remove(source.id, source.updatedAt)]);
  assert.equal((await repo.read()).length, 1); assert.equal((await repo.read())[0].id, copy.id);
  const [removed, rejected] = await Promise.allSettled([repo.remove(copy.id, copy.updatedAt), repo.duplicate(copy.id, 'Outra mensagem', copy.updatedAt)]);
  assert.equal(removed.status, 'fulfilled'); assert.equal(rejected.status, 'rejected'); assert.equal((await repo.read()).length, 0);
});

test('copy respects the collection limit and removing a record frees space without changing others', async () => {
  const rows = Array.from({ length: MAX_SERMONS }, (_, index) => record('row-' + index)); const { repo } = setup({ [SERMON_KEY]: encodeSermons(rows) });
  await assert.rejects(repo.duplicate(rows[0].id, 'Nova mensagem', rows[0].updatedAt), /100/);
  await repo.remove(rows[1].id, rows[1].updatedAt); const copy = await repo.duplicate(rows[0].id, 'Nova mensagem', rows[0].updatedAt);
  const next = await repo.read(); assert.equal(next.length, MAX_SERMONS); assert.ok(next.some(row => row.id === copy.id)); assert.ok(!next.some(row => row.id === rows[1].id));
  sameData(next.find(row => row.id === rows[0].id), rows[0]);
});

test('backups keep original and copies distinct, invalidate obsolete previews and can recover a previously exported message', async () => {
  const source = record(); const { repo, backups } = setup({ [SERMON_KEY]: encodeSermons([source]) }); const beforeCopy = (await backups.export()).text; const oldPreview = await backups.preview(beforeCopy);
  const copy = await repo.duplicate(source.id, 'Nova mensagem', source.updatedAt); await assert.rejects(backups.restore(oldPreview), /mudaram/);
  const complete = (await backups.export()).text; const target = setup(); await target.backups.restore(await target.backups.preview(complete)); assert.equal((await target.repo.read()).length, 2);
  assert.equal((await target.repo.read()).find(row => row.id === copy.id).notes, source.notes);
  const beforeDelete = await backups.preview(complete); await repo.remove(source.id, source.updatedAt); await assert.rejects(backups.restore(beforeDelete), /mudaram/);
  const missing = await backups.preview(complete); assert.equal(missing.addedSermons, 1); await backups.restore(missing); assert.equal((await repo.read()).length, 2);
  assert.equal((await backups.preview(complete)).addedSermons, 0);
});
