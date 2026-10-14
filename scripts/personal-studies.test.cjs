const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const cache = new Map();
function load(filename) {
  if (filename.endsWith('.json')) return require(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => load(path.resolve(path.dirname(filename), id.endsWith('.json') ? id : id + '.ts')), Date, Map, Set, Proxy, Reflect, JSON, Object, Promise, Error });
  return module.exports;
}
const { createPersonalStudyRepository, decodePersonalStudies, encodePersonalStudies, findPersonalStudies, personalStudyKey, PERSONAL_STUDIES_KEY, MAX_PERSONAL_STUDIES_BYTES } = load(path.resolve(__dirname, '../src/services/personal-studies-repository.ts'));
const { createBackupRepository, parseBackup } = load(path.resolve(__dirname, '../src/services/backup-repository.ts'));
const { createDataCoordinator, DATA_KEYS, RESTORE_JOURNAL_KEY } = load(path.resolve(__dirname, '../src/services/data-coordinator.ts'));
const { SERMON_KEY } = load(path.resolve(__dirname, '../src/services/sermon-repository.ts'));
const NOW = Date.parse('2026-10-03T12:00:00Z');
const entry = (kind = 'book', studyId = 'genesis', saved = true, note = '') => ({ kind, studyId, saved, note, updatedAt: NOW });
const backup = (studies, version = 3) => JSON.stringify({ app: 'biblia-smart', version, createdAt: new Date(NOW).toISOString(), data: { reading: [], plans: { version: 1, activePlanId: null, plans: [] }, events: [], sermons: [], ...(version === 3 ? { studies } : {}) } });
function setup(initial = {}) {
  const values = new Map(Object.entries(initial)); const state = { writes: 0, fail: null };
  const storage = { async getItem(key) { return values.get(key) ?? null; }, async setItem(key, raw) { if (state.fail?.(key)) throw Error('Disk'); state.writes++; values.set(key, raw); }, async removeItem(key) { if (state.fail?.(key)) throw Error('Disk'); values.delete(key); } };
  const coordinator = createDataCoordinator(storage);
  return { values, state, storage, coordinator, repo: coordinator.wrap(createPersonalStudyRepository(storage, () => NOW)), backups: createBackupRepository(storage, coordinator, () => NOW) };
}

test('bookmarks and reflections persist independently across restart and unsaving keeps the note', async () => {
  const { repo, storage } = setup(); const first = await repo.setSaved('book', 'genesis', true);
  const noted = await repo.saveNote('book', 'genesis', '  Uma promessa para as nações.  ', first.updatedAt);
  assert.ok(noted.updatedAt > first.updatedAt); await repo.setSaved('book', 'genesis', false);
  const restarted = createPersonalStudyRepository(storage); const rows = await restarted.read();
  assert.equal(rows.length, 1); assert.equal(rows[0].saved, false); assert.equal(rows[0].note, 'Uma promessa para as nações.');
  await restarted.saveNote('book', 'genesis', '', rows[0].updatedAt); assert.equal((await restarted.read()).length, 0);
});

test('note-only studies appear in the collection while clearing a note keeps a saved marker', async () => {
  const { repo } = setup(); const first = await repo.saveNote('word', 'shalom', 'Cuidar dos relacionamentos.', null);
  assert.equal(first.saved, false); await repo.setSaved('word', 'shalom', true); const current = (await repo.read())[0];
  await repo.saveNote('word', 'shalom', '', current.updatedAt); const saved = (await repo.read())[0]; assert.equal(saved.saved, true); assert.equal(saved.note, '');
});

test('stale and absent editors cannot overwrite notes and concurrent different targets are retained', async () => {
  const { repo } = setup(); const first = await repo.saveNote('book', 'genesis', 'Primeira', null);
  await repo.saveNote('book', 'genesis', 'Segunda', first.updatedAt);
  await assert.rejects(repo.saveNote('book', 'genesis', 'Rascunho antigo', first.updatedAt), /mudou/);
  await assert.rejects(repo.saveNote('book', 'genesis', 'Sem versão', null), /mudou/);
  await Promise.all([repo.setSaved('word', 'logos', true), repo.setSaved('word', 'shalom', true)]);
  const rows = await repo.read(); assert.equal(rows.length, 3); assert.equal(rows.find(row => row.studyId === 'genesis').note, 'Segunda');
});

test('no-op updates retain revisions and mutation of returned records cannot change stored content', async () => {
  const { repo, values, state } = setup(); const first = await repo.setSaved('book', 'john', true); const raw = values.get(PERSONAL_STUDIES_KEY); const writes = state.writes;
  const same = await repo.setSaved('book', 'john', true); assert.equal(same.updatedAt, first.updatedAt); assert.equal(state.writes, writes);
  same.note = 'Alteração fora do repositório'; assert.equal(values.get(PERSONAL_STUDIES_KEY), raw); assert.equal((await repo.read())[0].note, '');
});

test('failed writes retain old data and a later retry succeeds without losing another study', async () => {
  const { repo, values, state } = setup(); const first = await repo.setSaved('book', 'genesis', true); const before = values.get(PERSONAL_STUDIES_KEY);
  state.fail = key => key === PERSONAL_STUDIES_KEY; await assert.rejects(repo.saveNote('book', 'genesis', 'Rascunho', first.updatedAt), /preservados/); assert.equal(values.get(PERSONAL_STUDIES_KEY), before);
  state.fail = null; await repo.saveNote('book', 'genesis', 'Rascunho', first.updatedAt); await repo.setSaved('word', 'logos', true); assert.equal((await repo.read()).length, 2);
});

test('invalid targets, note limits, booleans and corrupt stores cannot be replaced by writes', async () => {
  const { repo, state } = setup(); await assert.rejects(repo.setSaved('book', 'unknown', true)); await assert.rejects(repo.setSaved('book', 'genesis', 'yes'));
  await assert.rejects(repo.saveNote('word', 'logos', 'x'.repeat(2001), null)); assert.equal(state.writes, 0);
  const invalid = ['', 'broken', JSON.stringify({ version: 2, entries: [] }), JSON.stringify({ version: 1, entries: [entry(), entry()] }), JSON.stringify({ version: 1, entries: [{ ...entry(), updatedAt: -1 }] }), JSON.stringify({ version: 1, entries: [entry('word', 'unknown')] }), JSON.stringify({ version: 1, entries: [entry('book', 'genesis', false)] })];
  for (const raw of invalid) { const next = setup({ [PERSONAL_STUDIES_KEY]: raw }); await assert.rejects(next.repo.read()); await assert.rejects(next.repo.setSaved('book', 'john', true)); assert.equal(next.state.writes, 0); assert.equal(next.values.get(PERSONAL_STUDIES_KEY), raw); }
});

test('Unicode byte limits are enforced and validated serialization omits unknown fields', () => {
  const raw = JSON.stringify({ version: 1, entries: [entry()], extra: '漢'.repeat(Math.ceil(MAX_PERSONAL_STUDIES_BYTES / 3)) });
  assert.ok(raw.length < MAX_PERSONAL_STUDIES_BYTES); assert.throws(() => decodePersonalStudies(raw));
  assert.equal(encodePersonalStudies([{ ...entry(), secret: 'do-not-export' }]).includes('secret'), false);
});

test('collection search covers personal notes, accents, original scripts and Strong with independent filters', () => {
  const rows = [entry(), entry('word', 'shalom', false, 'Comunhão e reconciliação.'), entry('word', 'logos', true, 'A Palavra e a vida.')]; const before = JSON.stringify(rows);
  assert.equal(findPersonalStudies(rows, 'reconciliacao').map(row => row.studyId).join(','), 'shalom');
  for (const query of ['שָׁלוֹם', 'H7965', 'comunhão reconciliação']) assert.equal(findPersonalStudies(rows, query).map(row => row.studyId).join(','), 'shalom');
  assert.equal(findPersonalStudies(rows, '', 'Livros').length, 1); assert.equal(findPersonalStudies(rows, '', 'Palavras', 'Salvos').length, 1); assert.equal(findPersonalStudies(rows, '', 'Todos', 'Com reflexões').length, 2);
  assert.equal(findPersonalStudies(rows, 'inexistente').length, 0); assert.equal(new Set(findPersonalStudies(rows, '').map(personalStudyKey)).size, 3); assert.equal(JSON.stringify(rows), before);
});

test('version 3 backups round-trip bookmarks and notes while legacy versions preserve the current collection', async () => {
  const { repo, backups } = setup(); const first = await repo.setSaved('book', 'john', true); await repo.saveNote('book', 'john', 'Crer e receber vida.', first.updatedAt);
  const exported = await backups.export(); assert.equal(exported.file.version, 3); assert.equal((await parseBackup(exported.text)).data.studies[0].note, 'Crer e receber vida.');
  const other = setup(); await other.backups.restore(await other.backups.preview(exported.text)); assert.equal((await other.repo.read())[0].saved, true);
  for (const version of [1, 2]) { await backups.restore(await backups.preview(backup([], version))); assert.equal((await repo.read())[0].note, 'Crer e receber vida.'); }
  assert.equal((await backups.current()).studies, 1); assert.equal((await backups.current()).studyNotes, 1);
});

test('backup merge unions saved markers, fills empty notes and exposes conflicting texts without overwrite', async () => {
  const { backups, repo } = setup({ [PERSONAL_STUDIES_KEY]: encodePersonalStudies([entry('book', 'genesis', false, 'Minha reflexão'), entry('word', 'logos')]) });
  const raw = backup([entry('book', 'genesis', true, 'Outra reflexão'), entry('word', 'logos', false, 'Vida e Palavra.'), entry('word', 'shalom', false, 'Paz na comunidade.')]);
  const preview = await backups.preview(raw); assert.equal(preview.addedStudies, 1); assert.equal(preview.addedStudyNotes, 2); assert.equal(preview.studyNotes.length, 1); assert.equal(preview.studyNotes[0].current, 'Minha reflexão'); assert.equal(preview.studyNotes[0].incoming, 'Outra reflexão');
  await backups.restore(preview); const rows = await repo.read(); const genesis = rows.find(row => row.studyId === 'genesis'); assert.equal(genesis.saved, true); assert.equal(genesis.note, 'Minha reflexão');
  const repeated = await backups.preview(raw); assert.equal(repeated.addedStudies + repeated.addedStudyNotes, 0); await backups.restore(repeated); assert.equal((await repo.read()).length, 3);
});

test('study edits invalidate an obsolete backup preview and tampered study imports never write', async () => {
  const { backups, repo, state } = setup(); const preview = await backups.preview(backup([entry()])); await repo.saveNote('book', 'john', 'Depois da prévia', null);
  await assert.rejects(backups.restore(preview), /mudaram/);
  const invalid = [backup([entry('book', 'unknown')]), backup([entry(), entry()]), backup([{ ...entry(), note: 'x'.repeat(2001) }]), backup([{ ...entry(), saved: 'yes' }]), backup(undefined)];
  const before = state.writes; for (const raw of invalid) await assert.rejects(backups.preview(raw)); assert.equal(state.writes, before);
  const tampered = await backups.preview(backup([entry()])); tampered.backup.data.studies[0].studyId = 'unknown'; await assert.rejects(backups.restore(tampered)); assert.equal(state.writes, before);
});

test('a failure writing the study row rolls back all modules and an original note survives', async () => {
  const original = encodePersonalStudies([entry('word', 'logos', false, 'Anterior')]); const { backups, values, state } = setup({ [PERSONAL_STUDIES_KEY]: original, theme: 'dark' }); const before = JSON.stringify([...values]);
  const preview = await backups.preview(backup([entry()])); let failed = false; state.fail = key => key === PERSONAL_STUDIES_KEY && !failed && (failed = true);
  await assert.rejects(backups.restore(preview), /recuperados/); assert.equal(JSON.stringify([...values]), before); assert.equal(values.has(RESTORE_JOURNAL_KEY), false);
});

test('three-row and four-row legacy restore journals recover without clearing newer study notes', async () => {
  for (const keys of [DATA_KEYS.slice(0, 3), DATA_KEYS.slice(0, 4)]) {
    const original = encodePersonalStudies([entry('word', 'logos', false, 'Mais recente')]);
    const before = Object.fromEntries(keys.map(key => [key, null])); const { repo, values } = setup({ [RESTORE_JOURNAL_KEY]: JSON.stringify({ version: 1, before }), [PERSONAL_STUDIES_KEY]: original, [SERMON_KEY]: JSON.stringify({ version: 1, sermons: [] }) });
    assert.equal((await repo.read())[0].note, 'Mais recente'); assert.equal(values.get(PERSONAL_STUDIES_KEY), original); assert.equal(values.has(RESTORE_JOURNAL_KEY), false);
  }
});

test('repository writes queued during restore keep their notes after restoration', async () => {
  const { repo, backups } = setup(); const preview = await backups.preview(backup([entry()]));
  await Promise.all([backups.restore(preview), repo.saveNote('word', 'logos', 'Depois da restauração.', null)]);
  const rows = await repo.read(); assert.equal(rows.length, 2); assert.equal(rows.find(row => row.studyId === 'logos').note, 'Depois da restauração.');
});
