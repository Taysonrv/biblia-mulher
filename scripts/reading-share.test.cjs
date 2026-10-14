const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const root = path.resolve(__dirname, '../src'); const cache = new Map();
function load(file, overrides = {}) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (cache.has(file) && !Object.keys(overrides).length) return cache.get(file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Error, require: id => overrides[id] ?? load(path.resolve(path.dirname(file), id.endsWith('.json') ? id : id + '.ts')) });
  if (!Object.keys(overrides).length) cache.set(file, module.exports);
  return module.exports;
}
const { formatReadingShare } = load(path.join(root, 'services/reading-share-model.ts'));
const fixture = Object.freeze({ book: 'João', chapter: 3, verse: 16, favorite: true, note: 'Minha reflexão pessoal e privada.' });

test('share preview includes the actual verse, reference and translation while excluding notes by default', () => {
  const { message, title } = formatReadingShare(fixture);
  assert.equal(title, 'João 3:16'); assert.match(message, /Deus amou/); assert.match(message, /Almeida 1911/);
  assert.ok(!message.includes(fixture.note)); assert.ok(!message.includes('Minha reflexão'));
});
test('notes require explicit inclusion and never alter the saved record', () => {
  const before = JSON.stringify(fixture);
  assert.ok(formatReadingShare(fixture, true).message.includes('Minha reflexão\n' + fixture.note));
  assert.ok(!formatReadingShare(fixture, false).message.includes(fixture.note)); assert.equal(JSON.stringify(fixture), before);
  assert.ok(!formatReadingShare({ ...fixture, note: '  ' }, true).message.includes('Minha reflexão'));
});
test('share uses the correct translation description and does not fall back for an invalid reference', () => {
  const { message } = formatReadingShare({ ...fixture, book: 'Salmos', chapter: 23, verse: 1 });
  assert.match(message, /O Senhor/); assert.match(message, /ortografia atualizada/);
  for (const changes of [{ book: 'Desconhecido' }, { chapter: 99 }, { verse: 0 }, { verse: 160 }, { note: null }, { note: 'a'.repeat(2001) }]) assert.throws(() => formatReadingShare({ ...fixture, ...changes }));
  assert.throws(() => formatReadingShare(fixture, 'true')); assert.throws(() => formatReadingShare(null));
});
test('web share offers selectable text without calling any external service', async () => {
  const { shareReading } = load(path.join(root, 'services/reading-sharing.ts'));
  assert.equal(await shareReading('Texto', 'João 3:16'), 'text'); await assert.rejects(shareReading('', 'Título'));
});
test('native share opens the exact preview, distinguishes cancellation and surfaces failures for retry', async () => {
  let request; let outcome = 'sharedAction';
  const Share = { dismissedAction: 'dismissedAction', async share(content, options) { request = { content, options }; if (outcome === 'error') throw Error('unavailable'); return { action: outcome }; } };
  const { shareReading } = load(path.join(root, 'services/reading-sharing.native.ts'), { 'react-native': { Share } });
  const preview = formatReadingShare(fixture);
  assert.equal(await shareReading(preview.message, preview.title), 'opened');
  assert.equal(request.content.message, preview.message); assert.equal(request.options.subject, preview.title);
  outcome = 'dismissedAction'; assert.equal(await shareReading(preview.message, preview.title), 'cancelled');
  outcome = 'error'; await assert.rejects(shareReading(preview.message, preview.title));
  outcome = 'sharedAction'; assert.equal(await shareReading(preview.message, preview.title), 'opened');
  await assert.rejects(shareReading(' ', preview.title));
});
