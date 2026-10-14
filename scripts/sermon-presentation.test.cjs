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
const { buildLocalOutline } = service('sermon');
const { createSermonRepository, SERMON_KEY } = service('sermon-repository');
const { presentationSections, presentationPosition, movePresentation } = service('sermon-presentation');
const message = () => ({ id: 'sample', topic: 'Perdão', outline: buildLocalOutline('Perdão'), notes: 'Exemplo pessoal', createdAt: 1, updatedAt: 2 });

test('presentation covers the saved outline in order and uses the edited content', () => {
  const saved = message(); saved.outline.theme = 'Minha mensagem'; saved.outline.introduction = 'Introdução editada'; saved.outline.points[1].body = 'Segundo ponto editado';
  const sections = presentationSections(saved);
  assert.equal(sections.map(section => section.id).join(','), 'base,introduction,point-1,point-2,point-3,application,conclusion,references,questions');
  assert.equal(sections[0].body, saved.outline.theme + '\n\n' + saved.outline.baseText);
  assert.equal(sections[1].body, 'Introdução editada'); assert.equal(sections[3].body, 'Segundo ponto editado');
  assert.equal(sections[5].body, saved.outline.application); assert.equal(sections[6].body, saved.outline.conclusion);
  for (const ref of saved.outline.references) assert.ok(sections[7].body.includes(ref));
  for (const question of saved.outline.questions) assert.ok(sections[8].body.includes(question));
});

test('duplicate titles keep separate targets for every development point', () => {
  const saved = message(); saved.outline.points.forEach(point => { point.title = 'Um mesmo título'; });
  const sections = presentationSections(saved);
  assert.equal(new Set(sections.map(section => section.id)).size, sections.length);
  assert.equal(movePresentation(sections, 'point-1', 1), 'point-2'); assert.equal(presentationPosition(sections, 'point-3'), 4);
});

test('personal notes only enter the presentation by explicit choice and blank notes never add a section', () => {
  const saved = message(); assert.ok(presentationSections(saved).every(section => !section.body.includes(saved.notes)));
  const withNotes = presentationSections(saved, true); assert.equal(withNotes.length, 10); assert.equal(withNotes[9].id, 'notes'); assert.equal(withNotes[9].body, saved.notes);
  assert.equal(presentationSections({ ...saved, notes: '  \n ' }, true).length, 9);
  const withoutNotes = presentationSections(saved, false); assert.equal(presentationPosition(withoutNotes, 'notes'), 0);
  assert.ok(withoutNotes.every(section => section.id !== 'notes'));
});

test('navigation visits every section, supports returning and stays inside the message boundaries', () => {
  const sections = presentationSections(message(), true); let id = 'base';
  assert.equal(movePresentation(sections, id, -1), id);
  for (let position = 1; position < sections.length; position++) { id = movePresentation(sections, id, 1); assert.equal(id, sections[position].id); }
  assert.equal(movePresentation(sections, id, 1), 'notes');
  for (let position = sections.length - 2; position >= 0; position--) { id = movePresentation(sections, id, -1); assert.equal(id, sections[position].id); }
  assert.equal(presentationPosition(sections, 'stale-id'), 0); assert.equal(movePresentation([], 'unknown', 1), 'base');
});

test('presenting a frozen message does not mutate its sections, references, notes or revision', () => {
  const saved = message(); saved.outline.points.forEach(Object.freeze); Object.freeze(saved.outline.points); Object.freeze(saved.outline.references); Object.freeze(saved.outline.questions); Object.freeze(saved.outline); Object.freeze(saved);
  const before = JSON.stringify(saved); const sections = presentationSections(saved, true); sections[1].body = 'Alteração na visualização'; sections.reverse();
  assert.equal(JSON.stringify(saved), before); assert.equal(presentationSections(saved)[1].body, saved.outline.introduction);
});

test('reopening the saved message after a presentation preserves storage and shows later edits', async () => {
  const values = new Map(); let writes = 0;
  const storage = { async getItem(key) { return values.get(key) ?? null; }, async setItem(key, value) { writes++; values.set(key, value); } };
  const repo = createSermonRepository(storage, () => 10, () => 'sample'); const saved = await repo.create('Perdão', buildLocalOutline('Perdão'));
  const before = values.get(SERMON_KEY); const initialWrites = writes; const sections = presentationSections(saved, true);
  movePresentation(sections, 'base', 1); presentationSections(saved, false); await repo.read();
  assert.equal(writes, initialWrites); assert.equal(values.get(SERMON_KEY), before);
  const edited = await repo.save(saved.id, { ...saved.outline, conclusion: 'Conclusão atualizada' }, 'Nova nota', saved.updatedAt);
  const reloaded = (await repo.read())[0]; const next = presentationSections(reloaded, true);
  assert.equal(next.find(section => section.id === 'conclusion').body, 'Conclusão atualizada');
  assert.equal(next.find(section => section.id === 'notes').body, 'Nova nota'); assert.equal(reloaded.updatedAt, edited.updatedAt);
});
