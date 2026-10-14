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
const { createBackupRepository, parseBackup, backupCounts, MAX_BACKUP_BYTES } = load(path.resolve(__dirname, '../src/services/backup-repository.ts'));
const { createDataCoordinator, RESTORE_JOURNAL_KEY } = load(path.resolve(__dirname, '../src/services/data-coordinator.ts'));
const { createReadingRepository, READING_KEY } = load(path.resolve(__dirname, '../src/services/reading-repository.ts'));
const { PLAN_KEY } = load(path.resolve(__dirname, '../src/services/reading-plan-repository.ts'));
const { AGENDA_STORAGE_KEY } = load(path.resolve(__dirname, '../src/services/agenda-repository.ts'));
const { readingPlans, planChapterKey } = load(path.resolve(__dirname, '../src/data/reading-plans.ts'));
const NOW = Date.parse('2026-09-30T12:00:00Z');
const reading = (note = 'Confiança', favorite = true) => ({ book: 'Salmos', chapter: 23, verse: 1, favorite, note });
const event = (id = 'agenda-a') => ({ id, title: 'Estudo', category: 'Estudo bíblico', startsAt: '2027-01-10T18:00:00.000Z', location: 'Igreja', notes: 'Levar Bíblia', reminderMinutes: 30, reminderState: 'scheduled' });
const progress = () => ({ planId: readingPlans[0].id, startedAt: NOW - 1000, completed: [planChapterKey(1, readingPlans[0].days[0].readings[0].book, readingPlans[0].days[0].readings[0].chapter)] });
const planState = () => ({ version: 1, activePlanId: readingPlans[0].id, plans: [progress()] });
function file(data = {}) { return JSON.stringify({ app: 'biblia-smart', version: 1, createdAt: new Date(NOW).toISOString(), data: { reading: [reading()], plans: planState(), events: [event()], ...data } }); }
function setup(initial = {}) {
  const values = new Map(Object.entries(initial)); const state = { writes: 0, fail: null, readFail: null };
  const storage = { async getItem(key) { if (state.readFail?.(key, values.get(key))) throw Error('Read limit'); return values.get(key) ?? null; }, async setItem(key, text) { state.writes++; if (state.fail?.(key)) throw Error('Disk'); values.set(key, text); }, async removeItem(key) { if (state.fail?.(key)) throw Error('Disk'); values.delete(key); } };
  const coordinator = createDataCoordinator(storage);
  return { values, state, storage, coordinator, repo: createBackupRepository(storage, coordinator, () => NOW) };
}
test('export contains only portable user data and no notification state or unrelated storage', async () => {
  const { repo, values } = setup({ [READING_KEY]: JSON.stringify({ version: 2, entries: [{ ...reading(), secret: 'not-exported' }] }), [PLAN_KEY]: JSON.stringify(planState()), [AGENDA_STORAGE_KEY]: JSON.stringify({ version: 1, events: [event()] }), account: 'private', theme: 'dark' });
  const before = JSON.stringify([...values]); const result = await repo.export();
  assert.equal(JSON.stringify([...values]), before); assert.equal(result.text.includes('not-exported'), false); assert.equal(result.text.includes('private'), false);
  assert.equal(result.file.data.events[0].reminderState, 'failed'); assert.equal(result.file.data.reading[0].note, 'Confiança');
  assert.equal((await parseBackup(result.text)).data.plans.plans.length, 1);
});
test('legacy Psalm 23 notes export without modifying the original store', async () => {
  const raw = JSON.stringify({ version: 1, entries: [{ verse: 1, note: 'Antiga', favorite: true }] });
  const { repo, values } = setup({ [READING_KEY]: raw }); const result = await repo.export();
  assert.equal(result.file.data.reading[0].book, 'Salmos'); assert.equal(values.get(READING_KEY), raw);
});
test('preview validates and reports additions without performing writes', async () => {
  const { repo, state, values } = setup(); const preview = await repo.preview(file());
  assert.equal(preview.addedFavorites, 1); assert.equal(preview.addedNotes, 1); assert.equal(preview.addedPlans, 1); assert.equal(preview.addedReadings, 1); assert.equal(preview.addedEvents, 1);
  assert.equal(state.writes, 0); assert.equal(values.size, 0);
});
test('restore persists all modules and reopening/exporting gives the combined data', async () => {
  const { repo, storage, values } = setup({ theme: 'dark' }); await repo.restore(await repo.preview(file()));
  const restarted = createBackupRepository(storage, undefined, () => NOW);
  const counts = await restarted.current(); assert.equal(counts.favorites, 1); assert.equal(counts.notes, 1); assert.equal(counts.events, 1); assert.equal(counts.readings, 1);
  assert.equal(values.get('theme'), 'dark'); assert.equal(values.has(RESTORE_JOURNAL_KEY), false);
  assert.equal(JSON.parse(values.get(AGENDA_STORAGE_KEY)).events[0].reminderState, 'failed');
});
test('repeated import is idempotent and existing scheduled reminders are preserved', async () => {
  const { repo, values } = setup({ [AGENDA_STORAGE_KEY]: JSON.stringify({ version: 1, events: [event()] }) });
  await repo.restore(await repo.preview(file())); const preview = await repo.preview(file());
  assert.equal(preview.addedFavorites + preview.addedNotes + preview.addedPlans + preview.addedReadings + preview.addedEvents, 0);
  await repo.restore(preview); assert.equal(JSON.parse(values.get(AGENDA_STORAGE_KEY)).events[0].reminderState, 'scheduled');
});
test('different notes keep current text, add favorites and expose both texts in the preview', async () => {
  const { repo, values } = setup({ [READING_KEY]: JSON.stringify({ version: 2, entries: [reading('Minha reflexão', false)] }) });
  const preview = await repo.preview(file()); assert.equal(preview.notes.length, 1); assert.equal(preview.notes[0].current, 'Minha reflexão'); assert.equal(preview.notes[0].incoming, 'Confiança');
  await repo.restore(preview); const entry = JSON.parse(values.get(READING_KEY)).entries[0]; assert.equal(entry.note, 'Minha reflexão'); assert.equal(entry.favorite, true);
});
test('agenda detects same-id conflicts and identical events with different ids without duplicating', async () => {
  const existing = event(); const { repo } = setup({ [AGENDA_STORAGE_KEY]: JSON.stringify({ version: 1, events: [existing] }) });
  const preview = await repo.preview(file({ events: [{ ...event(), title: 'Outro estudo' }, event('other-id')] }));
  assert.equal(preview.eventConflicts, 1); assert.equal(preview.addedEvents, 0); assert.equal(preview.merged.events[0].title, 'Estudo');
});
test('progress unions completed readings and preserves an existing paused plan', async () => {
  const local = planState(); local.activePlanId = null; local.plans[0].completed = [];
  const { repo } = setup({ [PLAN_KEY]: JSON.stringify(local) }); const preview = await repo.preview(file());
  assert.equal(preview.addedReadings, 1); assert.equal(preview.merged.plans.activePlanId, null); assert.equal(preview.addedPlans, 0);
});
test('invalid backup envelopes, references, duplicates, plans and agenda never write', async () => {
  const invalid = ['broken', JSON.stringify({ app: 'other', version: 1 }), file({ reading: [reading(), reading()] }), file({ reading: [{ ...reading(), verse: 999 }] }), file({ reading: [{ ...reading(), note: 'x'.repeat(2001) }] }), file({ plans: { ...planState(), version: 2 } }), file({ plans: { ...planState(), plans: [{ ...progress(), completed: ['invalid'] }] } }), file({ events: [event(), event()] }), file({ events: [{ ...event(), startsAt: 'invalid' }] }), file({ events: [{ ...event(), reminderMinutes: 7 }] })];
  const { repo, state } = setup(); for (const raw of invalid) await assert.rejects(repo.preview(raw)); assert.equal(state.writes, 0);
});
test('oversized and incompatible files are rejected before storage mutation', async () => {
  const { repo, state } = setup(); await assert.rejects(repo.preview('x'.repeat(MAX_BACKUP_BYTES + 1)));
  const parsed = JSON.parse(file()); parsed.version = 4; await assert.rejects(repo.preview(JSON.stringify(parsed))); assert.equal(state.writes, 0);
});
test('corrupt existing data cannot be overwritten by importing a valid backup', async () => {
  for (const key of [READING_KEY, PLAN_KEY, AGENDA_STORAGE_KEY]) for (const raw of ['corrupt', '']) { const { repo, values, state } = setup({ [key]: raw }); await assert.rejects(repo.export()); await assert.rejects(repo.preview(file())); assert.equal(values.get(key), raw); assert.equal(state.writes, 0); }
});
test('a stale preview cannot overwrite a change made after the preview', async () => {
  const { repo, coordinator, storage, values } = setup(); const preview = await repo.preview(file());
  const readingRepo = coordinator.wrap(createReadingRepository(storage)); await readingRepo.saveNote(1, 'Nova');
  await assert.rejects(repo.restore(preview), /mudaram/); assert.equal(JSON.parse(values.get(READING_KEY)).entries[0].note, 'Nova'); assert.equal(values.has(AGENDA_STORAGE_KEY), false);
});
test('failed writes roll back every module including stores that were originally absent', async () => {
  const original = JSON.stringify({ version: 2, entries: [reading('Anterior')] }); const { repo, values, state } = setup({ [READING_KEY]: original });
  const preview = await repo.preview(file()); let failed = false; state.fail = key => key === AGENDA_STORAGE_KEY && !failed && (failed = true);
  await assert.rejects(repo.restore(preview), /recuperados/); assert.equal(values.get(READING_KEY), original); assert.equal(values.has(PLAN_KEY), false); assert.equal(values.has(AGENDA_STORAGE_KEY), false); assert.equal(values.has(RESTORE_JOURNAL_KEY), false);
  state.fail = null; await repo.restore(await repo.preview(file())); assert.equal((await repo.current()).events, 1);
});
test('recovery after restart restores originals before repository access', async () => {
  const before = { [READING_KEY]: null, [PLAN_KEY]: null, [AGENDA_STORAGE_KEY]: null };
  const { storage, values } = setup({ [RESTORE_JOURNAL_KEY]: JSON.stringify({ version: 1, before }), [READING_KEY]: JSON.stringify({ version: 2, entries: [reading()] }) });
  const coordinator = createDataCoordinator(storage); const repo = coordinator.wrap(createReadingRepository(storage)); assert.equal((await repo.read()).length, 0); assert.equal(values.has(RESTORE_JOURNAL_KEY), false);
});
test('failed rollback retains recovery journal and prevents further access until storage recovers', async () => {
  const { repo, storage, coordinator, state, values } = setup(); const preview = await repo.preview(file()); state.fail = key => key === PLAN_KEY;
  await assert.rejects(repo.restore(preview)); assert.equal(values.has(RESTORE_JOURNAL_KEY), true);
  const readingRepo = coordinator.wrap(createReadingRepository(storage)); await assert.rejects(readingRepo.saveNote(1, 'Should not write'));
  state.fail = null; assert.equal((await readingRepo.read()).length, 0); assert.equal(values.has(RESTORE_JOURNAL_KEY), false);
});
test('unknown journal schema blocks writes rather than discarding the recovery record', async () => {
  const raw = JSON.stringify({ version: 2, before: {} }); const { repo, values, state } = setup({ [RESTORE_JOURNAL_KEY]: raw });
  await assert.rejects(repo.current()); assert.equal(values.get(RESTORE_JOURNAL_KEY), raw); assert.equal(state.writes, 0);
});
test('repository operations arriving during restore wait and keep their new data', async () => {
  const { repo, coordinator, storage } = setup(); const preview = await repo.preview(file()); const readingRepo = coordinator.wrap(createReadingRepository(storage));
  await Promise.all([repo.restore(preview), readingRepo.saveNote(2, 'Depois')]);
  const entries = await readingRepo.read(); assert.equal(entries.length, 2); assert.equal(entries.find(entry => entry.verse === 2).note, 'Depois'); assert.equal((await repo.current()).events, 1);
});
test('tampered preview output is ignored and untrusted input is revalidated', async () => {
  const { repo } = setup(); const preview = await repo.preview(file()); preview.merged.reading = []; await repo.restore(preview); assert.equal((await repo.current()).favorites, 1);
  const next = await repo.preview(file()); next.backup.data.reading[0].verse = 999; await assert.rejects(repo.restore(next));
});
test('an unreadable recovery row is rejected before changes and removed using the in-memory originals', async () => {
  const { repo, state, values } = setup(); const preview = await repo.preview(file());
  state.readFail = key => key === RESTORE_JOURNAL_KEY && values.has(key);
  await assert.rejects(repo.restore(preview), /recuperados/); assert.equal(values.size, 0);
});
test('a restored row that exceeds read limits rolls back rather than claiming success', async () => {
  const { repo, state, values } = setup(); const preview = await repo.preview(file());
  state.readFail = (key, value) => key === READING_KEY && !!value;
  await assert.rejects(repo.restore(preview), /recuperados/); assert.equal(values.size, 0);
});

function nativeFiles(picked) {
  const state = { picks: [], shared: [], files: [], available: true };
  class NativeFile { constructor(uri, name) { this.uri = name ? 'file://cache/' + name : uri; this.size = picked?.size ?? 0; state.files.push(this); } create(options) { this.options = options; } write(text) { this.textWritten = text; } async text() { return picked?.text; } }
  class Directory { create(options) { state.directory = options; } }
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/backup-files.native.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Error, require: id => {
    if (id === './backup-repository') return { checkBackupSize: load(path.resolve(__dirname, '../src/services/backup-repository.ts')).checkBackupSize, MAX_BACKUP_BYTES };
    if (id === 'expo-document-picker') return { async getDocumentAsync(options) { state.picks.push(options); return picked === null ? { canceled: true } : { canceled: false, assets: [{ uri: 'file://selected', name: 'backup.json', size: picked.size }] }; } };
    if (id === 'expo-file-system') return { File: NativeFile, Directory, Paths: { cache: 'file://cache' } };
    if (id === 'expo-sharing') return { async isAvailableAsync() { return state.available; }, async shareAsync(uri, options) { state.shared.push({ uri, options }); } };
    throw Error(id);
  } });
  return { state, files: module.exports };
}
test('native picker copies to cache, reads selected contents and respects cancellation', async () => {
  const raw = file(); const { files, state } = nativeFiles({ size: raw.length, text: raw });
  assert.equal((await files.selectBackupFile()).text, raw); assert.equal(state.picks[0].copyToCacheDirectory, true); assert.equal(state.picks[0].multiple, false);
  assert.equal(await nativeFiles(null).files.selectBackupFile(), null);
});
test('native picker rejects oversized files before reading contents', async () => {
  const { files, state } = nativeFiles({ size: MAX_BACKUP_BYTES + 1, text: '' }); await assert.rejects(files.selectBackupFile(), /8 MB/); assert.equal(state.files.length, 0);
});
test('native export writes an actual JSON file and opens sharing with its file URI', async () => {
  const raw = file(); const { files, state } = nativeFiles(null); assert.equal(await files.saveBackupFile(raw, 'backup.json'), 'shared');
  assert.equal(state.files[0].textWritten, raw); assert.equal(state.shared[0].uri, 'file://cache/backup.json'); assert.equal(state.shared[0].options.mimeType, 'application/json'); assert.equal(state.shared[0].options.UTI, 'public.json');
});
test('native export reports unavailable sharing without writing a file', async () => {
  const { files, state } = nativeFiles(null); state.available = false;
  await assert.rejects(files.saveBackupFile(file(), 'backup.json'), /disponível/); assert.equal(state.files.length, 0);
});
