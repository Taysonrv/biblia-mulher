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
const root = path.resolve(__dirname, '../src/services');
const { mergeSync, emptySyncData, syncPayload, parseSyncPayload } = load(path.join(root, 'cloud-sync-model.ts'));
const { createCloudSyncService } = load(path.join(root, 'cloud-sync-service.ts'));
const { createDataCoordinator, SYNC_STATE_KEY, RESTORE_JOURNAL_KEY } = load(path.join(root, 'data-coordinator.ts'));
const { encodeData, decodeData } = load(path.join(root, 'backup-repository.ts'));
const { readingPlans, planChapterKey } = load(path.resolve(__dirname, '../src/data/reading-plans.ts'));
const { bookStudies } = load(path.join(root, 'studies.ts'));
const { createPersonalStudyRepository } = load(path.join(root, 'personal-studies-repository.ts'));
const clone = value => JSON.parse(JSON.stringify(value));
const note = (text = 'Minha reflexão', verse = 1) => ({ book: 'Salmos', chapter: 23, verse, favorite: true, note: text });
const data = (reading = []) => ({ ...emptySyncData(), reading });
const event = (overrides = {}) => ({ id: 'event-a', title: 'Encontro', category: 'Estudo bíblico', startsAt: '2027-01-10T18:00:00.000Z', location: 'Igreja', notes: '', reminderMinutes: 30, reminderState: 'failed', sermonId: 'sermon-a', ...overrides });
function memory(initial = {}) {
  const values = new Map(Object.entries(initial)); let failure = () => false;
  return { values, fail(fn) { failure = fn; }, async getItem(key) { return values.get(key) ?? null; }, async setItem(key, value) { if (failure(key, value)) throw Error('Disk failure'); values.set(key, value); }, async removeItem(key) { if (failure(key, null)) throw Error('Disk failure'); values.delete(key); } };
}
function server() {
  let copy = null; let writes = 0; let onRead = () => {}; let onWrite = () => {};
  return { get copy() { return copy; }, get writes() { return writes; }, set(value) { copy = value; }, onRead(fn) { onRead = fn; }, onWrite(fn) { onWrite = fn; },
    async read(session) { onRead(); session.assert(); return copy && clone(copy); },
    async write(session, revision, payload) { onWrite(); session.assert(); if ((copy?.revision ?? 0) !== revision) throw Error('Outro aparelho sincronizou'); if (copy?.payload === payload) return revision; copy = { revision: revision + 1, payload }; writes++; return copy.revision; },
  };
}
function device(cloud, initial = emptySyncData(), storage = memory(encodeData(initial))) {
  let uid = 'alice'; let epoch = 0; let busyCancels = 0;
  const coordinator = createDataCoordinator(storage); const calls = [];
  const reminders = { async cancel(id) { calls.push(['cancel', id]); busyCancels++; }, async schedule(row) { calls.push(['schedule', row.id]); return 'scheduled'; } };
  const remote = { session() { if (!uid) throw Error('Entre na conta'); const original = uid; const stamp = epoch; return { uid, assert() { if (uid !== original || epoch !== stamp) throw Error('Sua conta mudou'); } }; }, read: cloud.read, write: cloud.write };
  const service = createCloudSyncService(storage, coordinator, remote, reminders, () => Date.parse('2026-10-18T12:00:00Z'));
  return { service, coordinator, storage, calls, switch(next) { uid = next; epoch++; }, async set(next) { await coordinator.run(() => coordinator.commit(encodeData(next))); }, async read() { return coordinator.run(async () => decodeData(await coordinator.snapshot())); }, async sync(choices = {}) { const preview = await service.prepare(); return service.confirm(preview.token, choices); } };
}
test('first preview performs no write or account claim; cancel preserves both sides', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); const before = JSON.stringify([...a.storage.values]);
  const preview = await a.service.prepare(); assert.equal(preview.first, true); assert.equal(cloud.writes, 0); assert.equal(JSON.stringify([...a.storage.values]), before);
  a.service.cancel(); await assert.rejects(a.service.confirm(preview.token, {}), /prévia/); assert.equal(cloud.writes, 0);
});
test('two devices transfer data and repeated synchronization is idempotent', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); await a.sync();
  const b = device(cloud); await b.sync(); assert.equal((await b.read()).reading[0].note, 'Minha reflexão');
  const writes = cloud.writes; await a.sync(); await b.sync(); assert.equal(cloud.writes, writes);
});
test('independent note and favorite edits merge without a conflict', () => {
  const base = data([note('Antiga')]); const local = data([{ ...note('Antiga'), favorite: false }]); const remote = data([note('Nova')]);
  const result = mergeSync(base, local, remote); assert.equal(result.conflicts.length, 0); assert.equal(result.data.reading[0].note, 'Nova'); assert.equal(result.data.reading[0].favorite, false);
});
test('deletions propagate using the baseline and cannot be mistaken for a first import', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); await a.sync(); const b = device(cloud); await b.sync();
  await a.set(data()); await a.sync(); const preview = await b.service.prepare(); const review = b.service.review(preview.token, {});
  assert.equal(review.removeLocal, 2); await b.service.confirm(preview.token, {}); assert.equal((await b.read()).reading.length, 0);
});
test('simultaneous text edits and deletion versus edit require explicit choice', () => {
  const base = data([note('Base')]); const local = data([note('Local')]); const cloud = data([note('Nuvem')]);
  const preview = mergeSync(base, local, cloud); assert.equal(preview.unresolved, 1);
  const key = preview.conflicts[0].key; assert.equal(mergeSync(base, local, cloud, { [key]: 'cloud' }).data.reading[0].note, 'Nuvem');
  const deleted = mergeSync(base, data(), cloud); assert.equal(deleted.unresolved, 1);
});
test('unresolved conflict performs no write; user choice converges both devices', async () => {
  const cloud = server(); const a = device(cloud, data([note('Base')])); await a.sync(); const b = device(cloud); await b.sync();
  await a.set(data([note('A')])); await b.set(data([note('B')])); await a.sync();
  const preview = await b.service.prepare(); const writes = cloud.writes;
  await assert.rejects(b.service.confirm(preview.token, {}), /Escolha/); assert.equal(cloud.writes, writes);
  await b.service.confirm(preview.token, { [preview.conflicts[0].key]: 'local' }); await a.sync(); assert.equal((await a.read()).reading[0].note, 'B');
});
test('stale local preview cannot overwrite a later edit', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); const preview = await a.service.prepare(); await a.set(data([note('Depois')]));
  await assert.rejects(a.service.confirm(preview.token, {}), /mudaram/); assert.equal(cloud.writes, 0); assert.equal((await a.read()).reading[0].note, 'Depois');
});
test('remote revision race preserves the other device write', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); const b = device(cloud, data([note('B', 2)]));
  const preview = await a.service.prepare(); await b.sync(); await assert.rejects(a.service.confirm(preview.token, {}), /Outro aparelho/);
  assert.equal((await parseSyncPayload(cloud.copy.payload)).reading[0].verse, 2); assert.equal((await a.read()).reading[0].verse, 1);
});
test('another account cannot synchronize the existing device collection', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); await a.sync(); a.switch('bob'); const writes = cloud.writes;
  await assert.rejects(a.service.prepare(), /outra conta/); assert.equal(cloud.writes, writes); assert.equal((await a.read()).reading.length, 1);
});
test('logout during a read or between preview and confirmation prevents synchronization', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); cloud.onRead(() => a.switch(null)); await assert.rejects(a.service.prepare(), /conta mudou/); assert.equal(cloud.writes, 0);
  cloud.onRead(() => {}); a.switch('alice'); const preview = await a.service.prepare(); a.switch('alice'); await assert.rejects(a.service.confirm(preview.token, {}), /conta mudou/);
});
test('offline or denied access preserves local data and never claims an account during preview', async () => {
  const cloud = server(); cloud.onRead(() => { throw Error('offline'); }); const a = device(cloud, data([note()]));
  const before = JSON.stringify([...a.storage.values]); await assert.rejects(a.service.prepare(), /offline/); assert.equal(JSON.stringify([...a.storage.values]), before);
});
test('malformed or oversized remote copy is rejected without local mutations', async () => {
  for (const payload of ['broken', 'x'.repeat(700001)]) {
    const cloud = server(); cloud.set({ revision: 1, payload }); const a = device(cloud, data([note()])); const before = JSON.stringify([...a.storage.values]);
    await assert.rejects(a.service.prepare()); assert.equal(JSON.stringify([...a.storage.values]), before);
  }
  assert.throws(() => syncPayload(data([note('á'.repeat(400000))])), /700 KB/);
});
test('a failed local write after cloud commit rolls back baseline and data; retry recovers', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); await a.sync(); const b = device(cloud);
  let failed = false; b.storage.fail((key) => { if (key.includes('reading/v1') && !failed) { failed = true; return true; } return false; });
  await assert.rejects(b.sync(), /restaurar/); assert.equal((await b.read()).reading.length, 0);
  const checkpoint = JSON.parse(b.storage.values.get(SYNC_STATE_KEY)); assert.equal(checkpoint.base, null);
  b.storage.fail(() => false); await b.sync(); assert.equal((await b.read()).reading.length, 1);
});
test('failure writing sync metadata atomically rolls back imported rows', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); await a.sync(); const b = device(cloud); let failed = false;
  b.storage.fail((key, value) => { if (key === SYNC_STATE_KEY && value && JSON.parse(value).base && !failed) { failed = true; return true; } return false; });
  await assert.rejects(b.sync()); assert.equal((await b.read()).reading.length, 0); assert.equal(JSON.parse(b.storage.values.get(SYNC_STATE_KEY)).base, null);
});
test('interrupted journal restores both the prior data and its synchronization baseline', async () => {
  const original = encodeData(data([note('Antes')])); const checkpoint = JSON.stringify({ version: 1, owner: 'alice', revision: 1, base: syncPayload(data([note('Antes')])), lastSync: null });
  const storage = memory({ ...encodeData(data([note('Depois')])), [SYNC_STATE_KEY]: 'broken', [RESTORE_JOURNAL_KEY]: JSON.stringify({ version: 1, before: { ...original, [SYNC_STATE_KEY]: checkpoint } }) });
  const a = device(server(), emptySyncData(), storage); assert.equal((await a.read()).reading[0].note, 'Antes'); assert.equal(storage.values.get(SYNC_STATE_KEY), checkpoint); assert.equal(storage.values.has(RESTORE_JOURNAL_KEY), false);
});
test('scheduled reminders stay local; a cloud edit cancels the obsolete notification and retains sermon link', async () => {
  const cloud = server(); const initial = { ...data(), events: [event({ reminderState: 'scheduled' })] }; const a = device(cloud, initial); await a.sync();
  assert.equal((await a.read()).events[0].reminderState, 'scheduled'); assert.equal(cloud.copy.payload.includes('scheduled'), false);
  const b = device(cloud); await b.sync(); assert.equal((await b.read()).events[0].sermonId, 'sermon-a');
  const changed = await b.read(); changed.events[0].title = 'Novo encontro'; await b.set(changed); await b.sync(); await a.sync();
  assert.equal(a.calls[0][0], 'cancel'); assert.equal((await a.read()).events[0].reminderState, 'failed'); assert.equal((await a.read()).events[0].title, 'Novo encontro');
});
test('plan completed chapters merge and unmarking propagates', () => {
  const plan = readingPlans[0]; const chapter = plan.days[0].readings[0]; const key = planChapterKey(1, chapter.book, chapter.chapter);
  const base = { ...data(), plans: { version: 1, activePlanId: plan.id, plans: [{ planId: plan.id, startedAt: 1000, completed: [key] }] } };
  const local = clone(base); local.plans.plans[0].completed = [];
  const result = mergeSync(base, local, base); assert.equal(result.data.plans.plans[0].completed.length, 0); assert.equal(result.unresolved, 0);
});
test('remote deletion after an established baseline is not treated as an empty new account', async () => {
  const cloud = server(); const a = device(cloud, data([note()])); await a.sync(); cloud.set(null); await assert.rejects(a.service.prepare(), /removida/); assert.equal((await a.read()).reading.length, 1);
});
test('a cloud study edit invalidates an old editor even when device clocks differ', async () => {
  const cloud = server(); const initial = { ...data(), studies: [{ kind: 'book', studyId: bookStudies[0].id, saved: true, note: 'Antes', updatedAt: 2000000000000 }] };
  const a = device(cloud, initial); await a.sync(); const oldStamp = (await a.read()).studies[0].updatedAt;
  const copy = await parseSyncPayload(cloud.copy.payload); copy.studies[0].note = 'Recebida'; copy.studies[0].updatedAt = 1000;
  cloud.set({ revision: cloud.copy.revision + 1, payload: syncPayload(copy) }); await a.sync();
  assert.ok((await a.read()).studies[0].updatedAt > oldStamp);
  const repository = a.coordinator.wrap(createPersonalStudyRepository(a.storage));
  await assert.rejects(repository.saveNote('book', bookStudies[0].id, 'Editor antigo', oldStamp), /mudou/);
});
test('failure cancelling an old reminder leaves local records and baseline unchanged', async () => {
  const cloud = server(); const initial = { ...data(), events: [event({ reminderState: 'scheduled' })] }; const a = device(cloud, initial); await a.sync();
  const changed = await parseSyncPayload(cloud.copy.payload); changed.events[0].title = 'Alterado'; cloud.set({ revision: cloud.copy.revision + 1, payload: syncPayload(changed) });
  const originalState = a.storage.values.get(SYNC_STATE_KEY);
  const failing = createCloudSyncService(a.storage, a.coordinator, { session() { return { uid: 'alice', assert() {} }; }, read: cloud.read, write: cloud.write }, { async cancel() { throw Error('Cancel failed'); }, async schedule() { return 'scheduled'; } });
  const preview = await failing.prepare(); await assert.rejects(failing.confirm(preview.token, {}), /Cancel failed/);
  assert.equal((await a.read()).events[0].title, 'Encontro'); assert.equal(a.storage.values.get(SYNC_STATE_KEY), originalState);
});
