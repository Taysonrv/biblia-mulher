const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => load(path.resolve(path.dirname(file), id + '.ts')), Date, Set, Map, URL, Number, Error });
  return module.exports;
}
const { parseContentCatalog, searchContent, createContentLibrary, validatePlaybackGrant, formatMediaTime } = load(path.resolve(__dirname, '../src/services/premium-content-model.ts'));
const { contentFileKind } = load(path.resolve(__dirname, '../src/services/content-file-model.ts'));
const { createSubscriptionController } = load(path.resolve(__dirname, '../src/services/subscription-access.ts'));
const NOW = Date.parse('2026-10-04T12:00:00Z');
const mentorship = { id: 'm1', kind: 'mentoria', title: 'Oração e constância', presenter: 'Responsável de teste', description: 'Uma série de teste sobre vida diária.', topics: ['Oração'], status: 'published', lessons: [{ id: 'l1', title: 'Vida de oração', media: 'video', durationSeconds: 300 }, { id: 'l2', title: 'Prática diária', media: 'audio', durationSeconds: 120 }] };
const preaching = { ...mentorship, id: 'p1', kind: 'pregacao', title: 'Confiança em Deus', topics: ['Confiança'], lessons: [{ id: 'l1', title: 'Uma mensagem de teste', media: 'audio' }] };
const envelope = items => ({ version: 1, items });
const grant = (media = 'video') => ({ uri: 'https://media.example.com/authorized.mp4?opaque=signed', media, contentType: 'progressive', expiresAt: NOW + 60000 });
const pending = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
function setup({ development = false, mode = 'premium', accountId = 'alice', configured = true } = {}) {
  const state = { mode, accountId }; const calls = { catalog: 0, playback: 0 };
  const adapter = { configured, async catalog() { calls.catalog++; return envelope([mentorship, preaching]); }, async authorizePlayback(owner, contentId, lessonId) { calls.playback++; calls.args = [owner, contentId, lessonId]; return grant(contentId === 'p1' || lessonId === 'l2' ? 'audio' : 'video'); } };
  return { state, calls, adapter, library: createContentLibrary(adapter, development, () => state, () => NOW) };
}

test('published mentoring supports mixed lessons and the catalog strips URLs, tokens and uploader fields', () => {
  const catalog = parseContentCatalog(envelope([{ ...mentorship, mediaUrl: 'secret', uploaderRole: 'admin', lessons: mentorship.lessons.map(item => ({ ...item, uri: 'secret', token: 'secret' })) }]));
  assert.equal(catalog[0].lessons.length, 2); assert.equal(catalog[0].lessons[1].media, 'audio');
  assert.equal(JSON.stringify(catalog).includes('secret'), false); assert.equal('uploaderRole' in catalog[0], false);
});
test('empty and coming-soon catalogs are valid without inventing playable content', () => {
  assert.equal(parseContentCatalog(envelope([])).length, 0);
  const upcoming = { ...mentorship, status: 'coming-soon', lessons: [] };
  assert.equal(parseContentCatalog(envelope([upcoming]))[0].lessons.length, 0);
});
test('invalid, duplicate, oversized and malformed catalogs are rejected', () => {
  for (const raw of [null, {}, { version: 2, items: [] }, envelope([mentorship, mentorship]), envelope([{ ...mentorship, id: '../secret' }]), envelope([{ ...mentorship, lessons: [] }]), envelope([{ ...mentorship, kind: 'unknown' }]), envelope([{ ...mentorship, title: ' ' }]), envelope([{ ...mentorship, lessons: [mentorship.lessons[0], mentorship.lessons[0]] }]), envelope([{ ...mentorship, lessons: [{ ...mentorship.lessons[0], durationSeconds: Infinity }] }]), envelope(Array(501).fill(mentorship))]) assert.throws(() => parseContentCatalog(raw));
});
test('search handles Portuguese accents, all terms, topics, lesson titles, categories and media filters', () => {
  const items = parseContentCatalog(envelope([mentorship, preaching]));
  assert.equal(searchContent(items, 'mentoria', 'ORACAO diaria').length, 1);
  assert.equal(searchContent(items, 'mentoria', 'pratica', 'Áudios').length, 1);
  assert.equal(searchContent(items, 'pregacao', '', 'Vídeos').length, 0);
  assert.equal(searchContent(items, 'pregacao', 'confianca', 'Áudios').length, 1);
  assert.equal(searchContent(items, 'mentoria', 'oração inexistente').length, 0);
});
test('free users cannot request a catalog or media grant, even if they know valid IDs', async () => {
  const { library, calls } = setup({ mode: 'free' });
  await assert.rejects(library.list()); await assert.rejects(library.get('m1')); await assert.rejects(library.playback('m1', 'l1'));
  assert.equal(calls.catalog, 0); assert.equal(calls.playback, 0);
});
test('real playback resolves only a known published lesson and the authenticated owner', async () => {
  const { library, calls } = setup(); const source = await library.playback('m1', 'l2');
  assert.equal(source.media, 'audio'); assert.deepEqual(calls.args, ['alice', 'm1', 'l2']);
  await assert.rejects(library.playback('m1', 'unknown')); await assert.rejects(library.playback('unknown', 'l1'));
  assert.equal(calls.playback, 1);
});
test('unconfigured hosting and a missing account cannot fabricate published items or playback', async () => {
  for (const options of [{ configured: false }, { accountId: null }]) {
    const { library, calls } = setup(options); assert.equal((await library.list()).length, 0); await assert.rejects(library.playback('m1', 'l1')); assert.equal(calls.playback, 0);
  }
});
test('unpublished content never requests a playback grant', async () => {
  const { library, adapter, calls } = setup(); adapter.catalog = async () => envelope([{ ...mentorship, status: 'coming-soon' }]);
  await assert.rejects(library.playback('m1', 'l1')); assert.equal(calls.playback, 0);
});
test('only secure short-lived grants matching the media type are accepted', () => {
  assert.equal(validatePlaybackGrant(grant(), 'video', NOW).expiresAt, NOW + 60000);
  for (const value of [{ ...grant(), uri: 'http://media.example.com/a.mp4' }, { ...grant(), uri: 'file:///local.mp4' }, { ...grant(), uri: 'https://user:password@media.example.com/a.mp4' }, { ...grant(), expiresAt: NOW }, { ...grant(), expiresAt: null }, { ...grant(), expiresAt: Infinity }, { ...grant(), expiresAt: NOW + 86400001 }, { ...grant(), media: 'audio' }]) assert.throws(() => validatePlaybackGrant(value, 'video', NOW));
});
test('account changes, expiration and reset invalidate an in-flight playback response', async () => {
  for (const change of ['logout', 'switch', 'reset']) {
    const { state, adapter, library } = setup(); const response = pending(); let entered;
    const reached = new Promise(resolve => { entered = resolve; });
    adapter.authorizePlayback = () => { entered(); return response.promise; };
    const opening = library.playback('m1', 'l1'); await reached;
    if (change === 'logout') state.mode = 'free'; else if (change === 'switch') state.accountId = 'bob'; else library.reset();
    response.resolve(grant()); await assert.rejects(opening);
  }
});
test('late catalog responses cannot remain accessible after the subscription ends', async () => {
  const { adapter, state, library } = setup(); const response = pending(); adapter.catalog = () => response.promise;
  const loading = library.list(); state.mode = 'free'; response.resolve(envelope([mentorship])); await assert.rejects(loading);
});
test('local previews require explicit testing permission, are never published, and disappear on reset', async () => {
  const draft = { kind: 'mentoria', title: 'Teste local', presenter: 'Pessoa de teste', description: 'Prévia de validação.', lessons: [{ title: 'Aula em vídeo', media: 'video', uri: 'file:///cache/test.mp4' }, { title: 'Aula em áudio', media: 'audio', uri: 'blob:test-audio' }] };
  for (const options of [{ development: false, mode: 'preview' }, { development: true, mode: 'premium' }, { development: true, mode: 'free' }]) assert.throws(() => setup(options).library.addPreview(draft));
  const { library, calls } = setup({ development: true, mode: 'preview', configured: false, accountId: null });
  const item = library.addPreview(draft); assert.equal((await library.list()).length, 1); assert.equal((await library.playback(item.id, 'lesson-2')).media, 'audio'); assert.equal(calls.playback, 0);
  const uris = library.reset(); assert.equal(uris.length, 2); assert.equal((await library.list()).length, 0); await assert.rejects(library.playback(item.id, 'lesson-1'));
});

test('APK testing access opens local audio/video previews without requiring development or remote services', async () => {
  const billing = { configured: false, async read() { return null; } };
  const adapter = { configured: false, async catalog() { throw Error('No remote catalog'); }, async authorizePlayback() { throw Error('No remote grant'); } };
  const draft = { kind: 'mentoria', title: 'Teste no APK', presenter: 'Pessoa de teste', description: 'Prévia local.', lessons: [{ title: 'Vídeo', media: 'video', uri: 'file:///cache/test.mp4' }, { title: 'Áudio', media: 'audio', uri: 'file:///cache/test.mp3' }] };
  const development = false;
  const controller = createSubscriptionController(billing, development, () => NOW, true);
  const library = createContentLibrary(adapter, development || controller.current().testAccess, controller.current, () => NOW);
  const item = library.addPreview(draft); assert.equal((await library.list()).length, 1);
  assert.equal((await library.playback(item.id, 'lesson-1')).media, 'video');
  assert.equal((await library.playback(item.id, 'lesson-2')).media, 'audio');
  library.reset(); assert.equal((await library.list()).length, 0);
  const production = createSubscriptionController(billing, development, () => NOW, false);
  const blocked = createContentLibrary(adapter, development || production.current().testAccess, production.current, () => NOW);
  assert.throws(() => blocked.addPreview(draft)); await assert.rejects(blocked.list());
});
test('preview registration validates all local sources before changing the catalog', async () => {
  const { library } = setup({ development: true, mode: 'preview', configured: false });
  assert.throws(() => library.addPreview({ kind: 'pregacao', title: 'Teste', presenter: 'Teste', description: 'Teste.', lessons: [{ title: 'Vídeo', media: 'video', uri: 'https://external.example.com/private.mp4' }] }));
  assert.equal((await library.list()).length, 0);
});
test('selected files enforce format, MIME, bounded known size and local URI without reading contents', () => {
  const file = { name: 'aula.MP4', mimeType: 'video/mp4', size: 1024, uri: 'file:///cache/aula.mp4' };
  assert.equal(contentFileKind(file), 'video'); assert.equal(contentFileKind({ ...file, name: 'mensagem.mp3', mimeType: 'audio/mpeg' }), 'audio');
  for (const bad of [{ ...file, name: 'malicious.exe' }, { ...file, mimeType: 'audio/wav' }, { ...file, size: undefined }, { ...file, size: 0 }, { ...file, size: 251 * 1024 * 1024 }, { ...file, uri: 'https://external.example.com/a.mp4' }, { ...file, name: 'audio.wav', mimeType: 'audio/wav', size: 51 * 1024 * 1024 }]) assert.throws(() => contentFileKind(bad));
});
test('duration labels handle unloaded and long media without invalid time values', () => {
  assert.equal(formatMediaTime(NaN), '0:00'); assert.equal(formatMediaTime(-1), '0:00'); assert.equal(formatMediaTime(125), '2:05'); assert.equal(formatMediaTime(3601), '1:00:01');
});
