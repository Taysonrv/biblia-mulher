const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const moduleUnderTest = { exports: {} };
const source = fs.readFileSync(path.resolve(__dirname, '../src/services/content-journey-model.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports, Date, Set, Map, Error, JSON, Number, encodeURIComponent });
const { createContentJourneyRepository, decodeContentJourney, journeyStorageKey, summarizeContentJourney, filterContentJourney, recentContentJourney, resumePlaybackSeconds } = moduleUnderTest.exports;
const content = { id: 'm1', status: 'published', lessons: [{ id: 'l1' }, { id: 'l2' }] };
function setup(allowed = () => true) {
  const data = new Map(); let fail = false;
  const storage = { getItem: async key => data.get(key) ?? null, setItem: async (key, raw) => { if (fail) throw Error('disk'); data.set(key, raw); } };
  const repository = createContentJourneyRepository(storage, 'test', allowed, () => 100);
  return { data, storage, repository, fail: value => { fail = value; } };
}
test('favorites and completion persist across repository reload without media URLs', async () => {
  const { repository, storage, data } = setup();
  await repository.update(content, 'favorite'); await repository.update(content, 'complete', 'l1');
  const restored = await createContentJourneyRepository(storage, 'test').read();
  assert.equal(restored[0].favorite, true); assert.equal(restored[0].completed[0], 'l1');
  assert.equal(summarizeContentJourney(content, restored[0]).next.id, 'l2');
  assert.equal(data.get('test').includes('uri'), false);
});
test('queued updates do not lose a favorite, visit or completed lesson', async () => {
  const { repository } = setup();
  await Promise.all([repository.update(content, 'favorite'), repository.update(content, 'visit', 'l2'), repository.update(content, 'complete', 'l1')]);
  const [row] = await repository.read();
  assert.equal(row.favorite, true); assert.equal(row.completed.length, 1); assert.equal(row.updatedAt, 102);
});
test('completion can be undone; all completed parts finish the course', async () => {
  const { repository } = setup();
  await repository.update(content, 'complete', 'l1'); let rows = await repository.update(content, 'complete', 'l2');
  assert.equal(summarizeContentJourney(content, rows[0]).finished, true);
  assert.equal(summarizeContentJourney(content, rows[0]).next, undefined);
  rows = await repository.update(content, 'complete', 'l1');
  assert.equal(summarizeContentJourney(content, rows[0]).next.id, 'l1');
});
test('resume selects last unfinished part; removed lessons do not inflate progress', () => {
  const record = { contentId: 'm1', favorite: true, completed: ['removed', 'l1'], lastLessonId: 'l2', updatedAt: 1 };
  const progress = summarizeContentJourney(content, record);
  assert.equal(progress.completed, 1); assert.equal(progress.next.id, 'l2');
  assert.equal(summarizeContentJourney({ ...content, lessons: [...content.lessons, { id: 'l3' }] }, { ...record, completed: ['l1', 'l2'] }).finished, false);
});
test('collection filters and recent list respect published catalog and completion', () => {
  const upcoming = { ...content, id: 'soon', status: 'coming-soon' }; const done = { ...content, id: 'done' };
  const rows = [{ contentId: 'm1', favorite: true, completed: ['l1'], lastLessonId: 'l1', updatedAt: 20 }, { contentId: 'soon', favorite: true, completed: [], lastLessonId: null, updatedAt: 30 }, { contentId: 'done', favorite: false, completed: ['l1', 'l2'], lastLessonId: 'l2', updatedAt: 40 }, { contentId: 'deleted', favorite: true, completed: [], lastLessonId: 'l1', updatedAt: 50 }];
  const catalog = [content, upcoming, done];
  assert.equal(filterContentJourney(catalog, rows, 'Favoritos').length, 2);
  assert.equal(filterContentJourney(catalog, rows, 'Em andamento').length, 1);
  assert.equal(filterContentJourney(catalog, rows, 'Concluídos')[0].id, 'done');
  assert.equal(recentContentJourney(catalog, rows).length, 1);
  assert.equal(recentContentJourney(catalog, rows)[0].next.id, 'l2');
});
test('corrupt, repeated and oversized records are preserved instead of overwritten', async () => {
  const { data, repository } = setup(); data.set('test', '{broken');
  await assert.rejects(repository.update(content, 'favorite')); assert.equal(data.get('test'), '{broken');
  const row = { contentId: 'm1', favorite: true, completed: [], lastLessonId: null, updatedAt: 1 };
  for (const raw of ['x'.repeat(1048577), JSON.stringify({ version: 2, entries: [] }), JSON.stringify({ version: 1, entries: [row, row] }), JSON.stringify({ version: 1, entries: [{ ...row, completed: ['l1', 'l1'] }] }), JSON.stringify({ version: 1, entries: [{ ...row, updatedAt: -1 }] })]) assert.throws(() => decodeContentJourney(raw));
  assert.equal(Object.keys(decodeContentJourney(JSON.stringify({ version: 1, entries: [{ ...row, uri: 'https://secret', admin: true }] }))[0]).includes('uri'), false);
});
test('access revoked during storage read denies writes and account keys are isolated', async () => {
  let authorized = true; let release; let writes = 0;
  const storage = { getItem: () => new Promise(resolve => { release = resolve; }), setItem: async () => { writes++; } };
  const repository = createContentJourneyRepository(storage, 'alice', () => authorized);
  const pending = repository.update(content, 'favorite'); await Promise.resolve(); authorized = false; release(null);
  await assert.rejects(pending); assert.equal(writes, 0);
  assert.notEqual(journeyStorageKey('alice'), journeyStorageKey('bob'));
  assert.notEqual(journeyStorageKey(null), journeyStorageKey('guest'));
  await assert.rejects(repository.update(content, 'visit', 'l1'));
});
test('failed saves retain old records and a later retry works', async () => {
  const state = setup(); await state.repository.update(content, 'favorite'); const before = state.data.get('test');
  state.fail(true); await assert.rejects(state.repository.update(content, 'complete', 'l1')); assert.equal(state.data.get('test'), before);
  state.fail(false); const rows = await state.repository.update(content, 'complete', 'l1'); assert.equal(rows[0].completed.length, 1);
  await assert.rejects(state.repository.update(content, 'complete', 'unknown'));
  await assert.rejects(state.repository.update({ ...content, status: 'coming-soon' }, 'visit', 'l1'));
});
test('legacy journey records load without position data or lost favorites', () => {
  const record = { contentId: 'm1', favorite: true, completed: ['l1'], lastLessonId: 'l1', updatedAt: 1 };
  const [row] = decodeContentJourney(JSON.stringify({ version: 1, entries: [record] }));
  assert.equal(row.favorite, true); assert.equal(row.completed[0], 'l1'); assert.equal(row.positions.length, 0);
});
test('positions are independent per lesson and survive manual changes and reload', async () => {
  const { repository, storage } = setup();
  await Promise.all([repository.update(content, 'position', 'l1', { seconds: 15.9, duration: 120 }), repository.update(content, 'favorite'), repository.update(content, 'position', 'l2', { seconds: 7, duration: 60 }), repository.update(content, 'complete', 'l1')]);
  const [row] = await createContentJourneyRepository(storage, 'test').read();
  assert.equal(row.favorite, true); assert.equal(row.completed[0], 'l1'); assert.equal(row.positions.length, 2);
  assert.equal(row.positions.find(value => value.lessonId === 'l1').seconds, 15);
  assert.equal(row.positions.find(value => value.lessonId === 'l2').seconds, 7);
});
test('unchanged checkpoints skip writes; explicit restart stores zero', async () => {
  const state = setup(); let writes = 0; const original = state.storage.setItem;
  state.storage.setItem = async (...args) => { writes++; return original(...args); };
  await state.repository.update(content, 'position', 'l1', { seconds: 15.1, duration: 40 });
  const first = (await state.repository.read())[0].updatedAt;
  await state.repository.update(content, 'position', 'l1', { seconds: 15.8, duration: 40 });
  assert.equal(writes, 1); assert.equal((await state.repository.read())[0].updatedAt, first);
  await state.repository.update(content, 'position', 'l1', { seconds: 0, duration: 40 });
  assert.equal((await state.repository.read())[0].positions[0].seconds, 0); assert.equal(writes, 2);
});
test('invalid checkpoints cannot replace saved data and removed lesson positions are pruned', async () => {
  const state = setup(); await state.repository.update(content, 'position', 'l1', { seconds: 5, duration: 40 }); const before = state.data.get('test');
  for (const value of [{ seconds: NaN, duration: 40 }, { seconds: -1, duration: 40 }, { seconds: 41, duration: 40 }, { seconds: 1, duration: Infinity }, { seconds: 1, duration: 0 }, { seconds: 1, duration: 86401 }]) await assert.rejects(state.repository.update(content, 'position', 'l1', value));
  assert.equal(state.data.get('test'), before);
  const [row] = await state.repository.update({ ...content, lessons: [{ id: 'l2' }] }, 'favorite'); assert.equal(row.positions.length, 0);
});
test('resume guards unknown duration, shortened media and the end of a part', () => {
  assert.equal(resumePlaybackSeconds(15, 40), 15); assert.equal(resumePlaybackSeconds(15, 0), 0);
  assert.equal(resumePlaybackSeconds(-1, 40), 0); assert.equal(resumePlaybackSeconds(Infinity, 40), 0);
  assert.equal(resumePlaybackSeconds(39, 40), 0); assert.equal(resumePlaybackSeconds(100, 40), 0);
});
