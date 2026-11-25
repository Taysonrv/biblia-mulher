const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const exportsObject = {};
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/bible-speech-model.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(source, { exports: exportsObject, Date, Set, Map, Object, Number, Math, Promise, Error });
const { createBibleSpeech, speechChunks } = exportsObject;
const voices = [{ identifier: 'en', name: 'English', language: 'en-US' }, { identifier: 'pt', name: 'Portugal', language: 'pt-PT' }, { identifier: 'br', name: 'Brasil', language: 'pt-BR' }];
function setup(overrides = {}) {
  const calls = []; let stops = 0;
  const engine = { maxSpeechInputLength: 100, async getAvailableVoicesAsync() { return voices; }, speak(text, options) { calls.push({ text, options }); options.onStart(); }, async stop() { stops++; }, ...overrides };
  const controller = createBibleSpeech(async () => engine);
  return { controller, calls, engine, get stops() { return stops; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('starts from requested verse with Portuguese voice and advances one utterance at a time', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Primeiro', 'Segundo', 'Terceiro']); await c.play(2);
  assert.equal(calls[0].text, 'Segundo'); assert.equal(calls[0].options.voice, 'br'); assert.equal(c.current().verse, 2);
  calls[0].options.onDone(); await tick(); assert.equal(calls[1].text, 'Terceiro'); calls[1].options.onDone(); assert.equal(c.current().status, 'finished');
});
test('pause ignores stale callbacks and resume repeats the interrupted verse on Android', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Um', 'Dois']); await c.play(); await c.pause();
  calls[0].options.onDone(); await tick(); assert.equal(calls.length, 1); assert.equal(c.current().status, 'paused'); await c.play(); assert.equal(calls[1].text, 'Um');
});
test('stop resets position and does not continue from a late completion', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Um', 'Dois']); await c.play(2); await c.stop(); calls[0].options.onDone();
  assert.equal(c.current().verse, 1); assert.equal(c.current().status, 'idle'); assert.equal(calls.length, 1);
});
test('changing chapter invalidates the old playback and never starts the new chapter automatically', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Antes']); await c.play(); await c.setChapter('João', 1, ['Novo']); calls[0].options.onDone(); await tick();
  assert.equal(calls.length, 1); assert.equal(c.current().book, 'João'); assert.equal(c.current().status, 'idle'); await c.play(); assert.equal(calls[1].text, 'Novo');
});
test('changing speed or voice pauses and next play uses the selected setting', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Um']); await c.play(); c.setRate(0.75); assert.equal(c.current().status, 'paused'); await c.play(); assert.equal(calls[1].options.rate, 0.75);
  c.setVoice('pt'); await c.play(); assert.equal(calls[2].options.voice, 'pt'); c.setRate(100); c.setVoice('unknown'); assert.equal(c.current().rate, 0.75); assert.equal(c.current().voice, 'pt');
});
test('invalid verse numbers cannot invoke speech or change playback state', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Um']); for (const index of [-1, 0, 2, NaN, 0.5]) await c.play(index); assert.equal(calls.length, 0); assert.equal(c.current().status, 'idle');
});
test('long verses respect input limit and resume starts again at their first chunk', async () => {
  const { controller: c, calls } = setup({ maxSpeechInputLength: 12 }); await c.setChapter('Salmos', 23, ['Uma frase longa para ouvir sem perder palavras.']); await c.play();
  assert.ok(calls[0].text.length <= 12); calls[0].options.onDone(); await tick(); assert.equal(c.current().verse, 1); await c.pause(); await c.play(); assert.equal(calls.at(-1).text, calls[0].text);
  assert.equal(Array.from(speechChunks('Um texto com acentos e palavras.', 10)).join(' '), 'Um texto com acentos e palavras.');
});
test('duplicate completion callbacks cannot skip a verse', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Um', 'Dois', 'Três']); await c.play(); calls[0].options.onDone(); calls[0].options.onDone(); await tick(); assert.equal(calls.length, 2); assert.equal(calls[1].text, 'Dois');
});
test('missing module and missing Portuguese voices expose actionable errors without speaking', async () => {
  const missing = createBibleSpeech(async () => { throw Error('Missing native module'); }); await missing.setChapter('Salmos', 23, ['Um']); await missing.play(); assert.match(missing.current().error, /APK/);
  const { controller: c, calls } = setup({ async getAvailableVoicesAsync() { return voices.filter(voice => voice.language === 'en-US'); } }); await c.setChapter('Salmos', 23, ['Um']); await c.play(); assert.match(c.current().error, /português/); assert.equal(calls.length, 0);
});
test('stopping during asynchronous voice discovery prevents delayed autoplay', async () => {
  let finish; const { controller: c, calls } = setup({ getAvailableVoicesAsync() { return new Promise(resolve => { finish = resolve; }); } }); await c.setChapter('Salmos', 23, ['Um']); const pending = c.play(); await tick(); const stopped = c.stop(); finish(voices); await pending; await stopped; assert.equal(calls.length, 0); assert.equal(c.current().status, 'idle');
});
test('speech errors stop automatic advance and allow retry at the same verse', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Um', 'Dois']); await c.play(2); calls[0].options.onError(); calls[0].options.onDone(); await tick(); assert.equal(c.current().status, 'error'); await c.play(); assert.equal(calls[1].text, 'Dois');
});
test('background-style pause prevents pending playback and never auto-resumes', async () => {
  const { controller: c, calls } = setup(); await c.setChapter('Salmos', 23, ['Um', 'Dois']); await c.play(); await c.pause(); calls[0].options.onStopped(); assert.equal(c.current().status, 'paused'); assert.equal(calls.length, 1);
});
