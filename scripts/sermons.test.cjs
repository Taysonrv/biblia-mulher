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
const { createSermonRepository, decodeSermons, encodeSermons, formatSermon, findSermons, validateOutline, SERMON_KEY, MAX_SERMONS, MAX_SERMON_STORE_BYTES } = service('sermon-repository');
const { createBackupRepository, parseBackup } = service('backup-repository');
const { createDataCoordinator, RESTORE_JOURNAL_KEY } = service('data-coordinator');
const { READING_KEY } = service('reading-repository'); const { PLAN_KEY } = service('reading-plan-repository'); const { AGENDA_STORAGE_KEY } = service('agenda-repository');
const NOW = Date.parse('2026-10-01T12:00:00Z');
const outline = () => buildLocalOutline('Perdão');
const row = (id = 'sermon-test') => ({ id, topic: 'Perdão', outline: outline(), notes: 'Exemplo pessoal de reconciliação', createdAt: NOW, updatedAt: NOW });
const backup = sermons => JSON.stringify({ app: 'biblia-smart', version: 2, createdAt: new Date(NOW).toISOString(), data: { reading: [], events: [], plans: { version: 1, activePlanId: null, plans: [] }, sermons } });
function setup(initial = {}) {
  let serial = 0; const values = new Map(Object.entries(initial)); const state = { writes: 0, fail: null };
  const storage = { async getItem(key) { return values.get(key) ?? null; }, async setItem(key, text) { state.writes++; if (state.fail?.(key)) throw Error('Disk failure'); values.set(key, text); }, async removeItem(key) { if (state.fail?.(key)) throw Error('Disk failure'); values.delete(key); } };
  const coordinator = createDataCoordinator(storage); const repo = coordinator.wrap(createSermonRepository(storage, () => NOW, () => 'sermon-' + ++serial));
  return { values, state, storage, coordinator, repo, backups: createBackupRepository(storage, coordinator, () => NOW) };
}
test('generation stays deterministic, includes three points and does not infer unknown passages', () => {
  assert.deepEqual(buildLocalOutline('Perdão'), outline()); assert.equal(outline().points.length, 3);
  assert.equal(buildLocalOutline('Romanos 8:1').baseText, 'Romanos 8:1');
  assert.match(buildLocalOutline('Tema muito específico').baseText, /a escolher/);
  assert.throws(() => buildLocalOutline('   '));
});
test('saving and restarting retain the complete outline and personal notes', async () => {
  const { repo, storage } = setup(); const first = await repo.create('Perdão', outline());
  const changed = { ...first.outline, introduction: 'Introdução adaptada', theme: 'Uma nova chance' };
  const saved = await repo.save(first.id, changed, '  Minha experiência  ', first.updatedAt);
  const restarted = createSermonRepository(storage); const records = await restarted.read();
  assert.equal(records.length, 1); assert.equal(records[0].outline.theme, 'Uma nova chance'); assert.equal(records[0].notes, 'Minha experiência');
  assert.equal(records[0].topic, 'Perdão'); assert.equal(saved.createdAt, first.createdAt); assert.ok(saved.updatedAt > first.updatedAt);
});
test('concurrent creation keeps distinct messages and edits preserve other messages', async () => {
  const { repo } = setup(); const [a, b] = await Promise.all([repo.create('A', outline()), repo.create('B', outline())]);
  assert.notEqual(a.id, b.id); await repo.save(a.id, { ...a.outline, conclusion: 'Mudança local' }, '', a.updatedAt);
  const rows = await repo.read(); assert.equal(rows.length, 2); assert.equal(rows.find(value => value.id === b.id).outline.conclusion, b.outline.conclusion);
});
test('stale editors cannot overwrite a newer saved version and missing ids cannot create a new message', async () => {
  const { repo } = setup(); const first = await repo.create('A', outline()); await repo.save(first.id, first.outline, 'Mais recente', first.updatedAt);
  await assert.rejects(repo.save(first.id, first.outline, 'Antiga', first.updatedAt), /mudou/);
  await assert.rejects(repo.save('missing', outline(), '', NOW), /não foi encontrado/);
  assert.equal((await repo.read())[0].notes, 'Mais recente');
});
test('failed writes preserve the old message and the queue permits a later retry', async () => {
  const { repo, state, values } = setup(); const first = await repo.create('A', outline()); const before = values.get(SERMON_KEY);
  state.fail = () => true; await assert.rejects(repo.save(first.id, first.outline, 'Nova', first.updatedAt)); assert.equal(values.get(SERMON_KEY), before);
  state.fail = null; await repo.save(first.id, first.outline, 'Nova', first.updatedAt); assert.equal((await repo.read())[0].notes, 'Nova');
});
test('corrupt, empty, incompatible and duplicate stores are preserved and cannot be overwritten', async () => {
  for (const raw of ['', 'corrupt', JSON.stringify({ version: 2, sermons: [] }), JSON.stringify({ version: 1, sermons: [row(), row()] })]) {
    const { repo, values, state } = setup({ [SERMON_KEY]: raw }); await assert.rejects(repo.read()); await assert.rejects(repo.create('A', outline())); assert.equal(values.get(SERMON_KEY), raw); assert.equal(state.writes, 0);
  }
});
test('invalid fields, limits, dates and identifiers reject writes instead of silently truncating', async () => {
  const { repo, state } = setup();
  for (const value of [{ ...outline(), theme: '' }, { ...outline(), introduction: 'x'.repeat(4001) }, { ...outline(), points: [] }, { ...outline(), references: [] }, { ...outline(), questions: Array(13).fill('Pergunta') }]) await assert.rejects(repo.create('A', value));
  assert.equal(state.writes, 0); assert.throws(() => encodeSermons([{ ...row(), id: '../bad' }])); assert.throws(() => encodeSermons([{ ...row(), updatedAt: NOW - 1 }]));
  await assert.rejects(createSermonRepository(setup().storage, () => NaN).create('A', outline()));
  const first = await repo.create('A', outline()); const writes = state.writes; await assert.rejects(repo.save(first.id, first.outline, 'x'.repeat(2001), first.updatedAt)); assert.equal(state.writes, writes);
});
test('collection count and Unicode byte limits protect bounded Android storage rows', async () => {
  const rows = Array.from({ length: MAX_SERMONS }, (_, i) => row('record-' + i));
  const { repo, state } = setup({ [SERMON_KEY]: encodeSermons(rows) }); await assert.rejects(repo.create('A', outline()), /100/); assert.equal(state.writes, 0);
  const large = row(); large.outline.introduction = '漢'.repeat(4000); large.outline.application = '漢'.repeat(4000); large.outline.conclusion = '漢'.repeat(4000);
  large.outline.points = large.outline.points.map(point => ({ ...point, body: '漢'.repeat(4000) }));
  const raw = JSON.stringify({ version: 1, sermons: Array.from({ length: 23 }, (_, i) => ({ ...large, id: 'unicode-' + i })) });
  assert.ok(raw.length < MAX_SERMON_STORE_BYTES); assert.ok(Buffer.byteLength(raw, 'utf8') > MAX_SERMON_STORE_BYTES); assert.throws(() => decodeSermons(raw), /limite/);
});
test('search covers accents, scripture references and notes and sorts without mutating saved input', () => {
  const a = row('a'); const b = { ...row('b'), notes: 'Visita', updatedAt: NOW + 1 }; const before = JSON.stringify([a, b]);
  assert.equal(findSermons([a, b], 'RECONCILIACAO').length, 1); assert.equal(findSermons([a, b], 'Efésios 4').length, 2);
  assert.equal(findSermons([a, b], '')[0].id, 'b'); assert.equal(findSermons([a, b], 'desconhecido').length, 0); assert.equal(JSON.stringify([a, b]), before);
});
test('shared text includes every outline section and excludes private notes unless requested', () => {
  const secret = 'NOTA PRIVADA'; const normal = formatSermon(outline(), secret); assert.equal(normal.includes(secret), false);
  for (const label of ['INTRODUÇÃO', 'DESENVOLVIMENTO', 'APLICAÇÃO', 'CONCLUSÃO', 'REFERÊNCIAS RELACIONADAS', 'PERGUNTAS PARA REFLEXÃO']) assert.ok(normal.includes(label));
  assert.ok(formatSermon(outline(), secret, true).includes(secret));
});
test('validated records strip unknown properties before export or sharing', () => {
  const value = row(); value.secret = 'not-exported'; value.outline.secret = 'not-exported';
  assert.equal(encodeSermons([value]).includes('not-exported'), false); assert.equal(formatSermon(value.outline).includes('not-exported'), false);
  assert.notEqual(validateOutline(value.outline), value.outline);
});
test('new backups carry full sermons and old backups restore without replacing current messages', async () => {
  const { repo, backups } = setup(); await repo.create('A', outline()); const exported = await backups.export();
  assert.equal(exported.file.version, 3); assert.equal((await parseBackup(exported.text)).data.sermons.length, 1);
  const old = JSON.parse(backup([])); old.version = 1; delete old.data.sermons;
  await backups.restore(await backups.preview(JSON.stringify(old))); assert.equal((await repo.read()).length, 1);
});
test('sermon import is idempotent, deduplicates identical content and preserves same-id conflicts', async () => {
  const local = row(); const { repo, backups } = setup({ [SERMON_KEY]: encodeSermons([local]) });
  const conflict = { ...row(), notes: 'Outro texto' }; const identical = row('different-id'); const added = { ...row('new-id'), notes: 'Novo exemplo' };
  const preview = await backups.preview(backup([conflict, identical, added])); assert.equal(preview.sermonConflicts, 1); assert.equal(preview.addedSermons, 1);
  await backups.restore(preview); const next = await backups.preview(backup([conflict, identical, added])); assert.equal(next.addedSermons, 0); assert.equal((await repo.read()).find(item => item.id === local.id).notes, local.notes);
});
test('malformed sermon imports and corrupt local sermon data cannot overwrite any module', async () => {
  const { backups, state } = setup(); const invalid = [{ ...row(), notes: 'x'.repeat(2001) }, { ...row(), createdAt: 'bad' }, { ...row(), outline: { ...outline(), points: [] } }];
  for (const value of invalid) await assert.rejects(backups.preview(backup([value]))); await assert.rejects(backups.preview(backup([row(), row()])));
  const missing = JSON.parse(backup([])); delete missing.data.sermons; await assert.rejects(backups.preview(JSON.stringify(missing))); assert.equal(state.writes, 0);
  const corrupt = setup({ [SERMON_KEY]: 'broken' }); await assert.rejects(corrupt.backups.export()); await assert.rejects(corrupt.backups.preview(backup([]))); assert.equal(corrupt.state.writes, 0);
});
test('an edited sermon invalidates a prior backup preview', async () => {
  const { repo, backups } = setup(); const first = await repo.create('A', outline()); const preview = await backups.preview(backup([]));
  await repo.save(first.id, first.outline, 'Mudança posterior', first.updatedAt); await assert.rejects(backups.restore(preview), /mudaram/); assert.equal((await repo.read())[0].notes, 'Mudança posterior');
});
test('restore failure rolls back the new sermon row and keeps recovery working', async () => {
  const { backups, values, state } = setup(); const preview = await backups.preview(backup([row()]));
  let failed = false; state.fail = key => key === SERMON_KEY && !failed && (failed = true); await assert.rejects(backups.restore(preview), /recuperados/);
  assert.equal(values.size, 0); state.fail = null; await backups.restore(await backups.preview(backup([row()]))); assert.equal((await backups.current()).sermons, 1);
});
test('legacy interrupted restore journals recover old modules without discarding newer sermons', async () => {
  const before = { [READING_KEY]: null, [PLAN_KEY]: null, [AGENDA_STORAGE_KEY]: null }; const original = encodeSermons([row()]);
  const { backups, values } = setup({ [RESTORE_JOURNAL_KEY]: JSON.stringify({ version: 1, before }), [SERMON_KEY]: original });
  assert.equal((await backups.current()).sermons, 1); assert.equal(values.get(SERMON_KEY), original); assert.equal(values.has(RESTORE_JOURNAL_KEY), false);
});
test('native sharing opens the text dialog, reports cancellation and propagates failures', async () => {
  const module = { exports: {} }; const state = { calls: [], result: 'sharedAction', fail: false };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/sermon-sharing.native.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: () => ({ Share: { dismissedAction: 'dismissedAction', async share(content, options) { state.calls.push({ content, options }); if (state.fail) throw Error('Unavailable'); return { action: state.result }; } } }) });
  assert.equal(await module.exports.shareSermon('Texto', 'Tema'), 'opened'); assert.equal(state.calls[0].content.message, 'Texto'); assert.equal(state.calls[0].options.dialogTitle, 'Compartilhar esboço');
  state.result = 'dismissedAction'; assert.equal(await module.exports.shareSermon('Texto', 'Tema'), 'cancelled'); state.fail = true; await assert.rejects(module.exports.shareSermon('Texto', 'Tema'));
});
test('browser sharing provides selectable text without invoking an external share service', async () => {
  const { shareSermon } = service('sermon-sharing'); assert.equal(await shareSermon('Texto', 'Tema'), 'text'); await assert.rejects(shareSermon('', 'Tema'));
});
