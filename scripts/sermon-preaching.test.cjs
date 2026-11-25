const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => load(path.resolve(path.dirname(filename), id + '.ts')), Date, Set, Map, JSON, Promise, Error });
  return module.exports;
}
const service = name => load(path.resolve(__dirname, '../src/services/' + name + '.ts'));
const { buildPreachingDraft, preachingWordCount } = service('sermon-preaching');
const { buildLocalOutline } = service('sermon');
const { validateOutline, createSermonRepository } = service('sermon-repository');
test('composition preserves supplied content, passages and references without mutating the outline', () => {
  const source = buildLocalOutline('Perdão'); source.introduction = 'Minha introdução escrita'; source.application = 'Minha aplicação escrita'; source.points.forEach((point, index) => { point.body = 'Meu desenvolvimento ' + index; }); const before = JSON.stringify(source); const draft = buildPreachingDraft(source);
  assert.equal(JSON.stringify(source), before); assert.ok(draft.introduction.includes(source.introduction)); assert.ok(draft.application.includes(source.application));
  for (let index = 0; index < 3; index++) { assert.equal(draft.points[index].title, source.points[index].title); assert.ok(draft.points[index].body.includes(source.points[index].body)); }
  assert.equal(JSON.stringify(draft.references), JSON.stringify(source.references)); assert.equal(draft.baseText, source.baseText); validateOutline(draft);
});
test('all six supported passages develop untouched scaffold into oral paragraphs without invented quotations', () => {
  for (const topic of ['Salmos 23', 'João 3:16', 'Perdão', 'Oração', 'Fé', 'Serviço']) {
    const source = buildLocalOutline(topic); const draft = buildPreachingDraft(source);
    assert.ok(!draft.introduction.includes(source.introduction));
    draft.points.forEach((point, index) => assert.ok(!point.body.includes(source.points[index].body)));
    assert.equal(draft.references.join('|'), source.references.join('|')); validateOutline(draft);
  }
});
test('a full-length authored section is never cut to fit a transition', () => {
  const source = buildLocalOutline('Tema próprio'); source.introduction = 'a'.repeat(12000); source.points[0].body = 'b'.repeat(12000);
  const draft = buildPreachingDraft(source); assert.equal(draft.introduction, source.introduction); assert.equal(draft.points[0].body, source.points[0].body);
});
test('unknown subjects remain grounded in supplied content and do not introduce new references', () => {
  const source = buildLocalOutline('Minha reflexão pessoal'); const draft = buildPreachingDraft(source);
  assert.equal(draft.references.join('|'), source.references.join('|')); assert.ok(draft.points[0].body.includes(source.points[0].body)); assert.ok(preachingWordCount(draft) > preachingWordCount(source));
});
test('a preaching draft is a separate saved message and survives the existing repository without changing the source', async () => {
  const values = new Map(); let id = 0;
  const repository = createSermonRepository({ async getItem(key) { return values.get(key) ?? null; }, async setItem(key, value) { values.set(key, value); } }, () => 1000, () => 'message-' + ++id);
  const original = await repository.create('Perdão', buildLocalOutline('Perdão'));
  const composed = await repository.create(original.topic, buildPreachingDraft(original.outline)); const rows = await repository.read();
  assert.notEqual(composed.id, original.id); assert.equal(rows.length, 2); assert.equal(rows.find(row => row.id === original.id).outline.introduction, original.outline.introduction); assert.equal(composed.notes, '');
});
