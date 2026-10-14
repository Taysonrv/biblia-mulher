const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const moduleValue = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/subscription-access.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { module: moduleValue, exports: moduleValue.exports, Date, Set, Number });
const { subscriptionActive, routePremiumFeature, canUsePremium, createSubscriptionController } = moduleValue.exports;
const NOW = Date.parse('2026-10-03T12:00:00Z');
const active = (accountId = 'alice', expiresAt = NOW + 1000) => ({ accountId, status: 'active', expiresAt });
const pending = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('the complete Bible and all personal records remain free, including saved outlines', () => {
  for (const route of ['/','/bible','/book','/chapter','/favorites','/notes','/verse-note','/reading-search','/reading-history','/reading-plans','/reading-plan','/reading-plan-day','/agenda','/agenda-event','/reading-settings','/my-data','/my-studies','/study-note','/sermons','/sermon-editor','/account','/studies','/support','/subscription']) assert.equal(routePremiumFeature(route), null, route);
  assert.equal(routePremiumFeature('/sermon-outline', { id: 'existing-outline' }), null);
});
test('premium routes require access even when opened directly or with forged search params', () => {
  for (const route of ['/book-studies','/book-study','/word-studies','/word-study','/study-search']) assert.equal(routePremiumFeature(route, { premium: '1', fromMyStudies: '1' }), 'studies');
  for (const route of ['/sermon-builder','/sermon-presenter','/sermon-outline']) assert.equal(routePremiumFeature(route, { premium: '1' }), 'ministerial');
  for (const route of ['/premium-library','/mentorships','/preachings','/premium-content','/content-watch','/content-studio']) assert.equal(routePremiumFeature(route, { premium: '1', uri: 'https://example.com/bypass.mp4' }), 'media');
  for (const id of ['', ' ', null, ['fake-id'], 123]) assert.equal(routePremiumFeature('/sermon-outline', { id }), 'ministerial');
  assert.equal(canUsePremium('free'), false); assert.equal(canUsePremium('premium'), true); assert.equal(canUsePremium('preview'), true);
});
test('subscription must be active, unexpired and belong to the current account', () => {
  assert.equal(subscriptionActive(active(), 'alice', NOW), true);
  for (const value of [null, active('bob'), active('alice', NOW), active('alice', NOW - 1), active('alice', NaN), active('alice', Infinity), { ...active(), status: 'expired' }, { ...active(), status: 'revoked' }]) assert.equal(subscriptionActive(value, 'alice', NOW), false);
  assert.equal(subscriptionActive(active(), null, NOW), false);
});
test('unconfigured billing never grants subscription access just for logging in', async () => {
  let calls = 0; const controller = createSubscriptionController({ configured: false, async read() { calls++; return active(); } }, false, () => NOW);
  await controller.setAccount('alice'); assert.equal(controller.current().mode, 'free'); assert.equal(calls, 0);
});
test('development simulation is temporary and inaccessible in release', async () => {
  const adapter = { configured: false, async read() { return null; } };
  const release = createSubscriptionController(adapter, false, () => NOW);
  assert.equal(release.setPreview(true), false); assert.equal(release.current().mode, 'free');
  const preview = createSubscriptionController(adapter, true, () => NOW);
  assert.equal(preview.setPreview(true), true); assert.equal(preview.current().mode, 'preview');
  assert.equal(createSubscriptionController(adapter, true, () => NOW).current().mode, 'free');
  await preview.setAccount('alice'); assert.equal(preview.current().mode, 'free');
  preview.setPreview(true); await preview.setAccount(null); assert.equal(preview.current().mode, 'free');
});

test('test builds enable Premium immediately without a login, purchase or development runtime', async () => {
  let calls = 0;
  const adapter = { configured: true, async read() { calls++; throw Error('No billing during test'); } };
  const controller = createSubscriptionController(adapter, false, () => NOW, true);
  assert.equal(controller.current().mode, 'preview'); assert.equal(controller.current().testAccess, true);
  assert.equal(controller.current().ready, true); assert.equal(controller.current().expiresAt, null);
  assert.equal(canUsePremium(controller.current().mode), true);
  await controller.refresh(); await controller.setAccount('alice');
  assert.equal(controller.current().mode, 'preview'); assert.equal(controller.current().error, ''); assert.equal(calls, 0);
});

test('automatic testing access survives refresh, restart and account changes without persisting an entitlement', async () => {
  const adapter = { configured: false, async read() { return null; } };
  const controller = createSubscriptionController(adapter, false, () => NOW, true);
  await controller.setAccount('alice'); await controller.setAccount('bob'); await controller.setAccount(null);
  controller.tick(); assert.equal(controller.current().mode, 'preview');
  assert.equal(controller.setPreview(false), false); assert.equal(controller.current().mode, 'preview');
  assert.equal(createSubscriptionController(adapter, false, () => NOW, true).current().mode, 'preview');
  const production = createSubscriptionController(adapter, false, () => NOW, false);
  assert.equal(production.current().testAccess, false); assert.equal(production.current().mode, 'free');
  assert.equal(production.setPreview(true), false);
});
test('a verified adapter grants access until the exact expiration time', async () => {
  let now = NOW; const controller = createSubscriptionController({ configured: true, async read() { return active(); } }, false, () => now);
  let last; const unsubscribe = controller.subscribe(state => { last = state; });
  await controller.setAccount('alice'); assert.equal(last.mode, 'premium');
  now = NOW + 1000; controller.tick(); assert.equal(last.mode, 'free'); assert.equal(last.expiresAt, null); unsubscribe();
});
test('refresh revokes access immediately and handles a revoked subscription', async () => {
  let value = active(); const controller = createSubscriptionController({ configured: true, async read() { return value; } }, false, () => NOW);
  await controller.setAccount('alice'); assert.equal(controller.current().mode, 'premium');
  value = { ...active(), status: 'revoked' }; const operation = controller.refresh();
  assert.equal(controller.current().mode, 'free'); await operation; assert.equal(controller.current().mode, 'free');
});
test('late responses cannot grant a previous account access after logout or switching', async () => {
  const alice = pending(); const bob = pending();
  const controller = createSubscriptionController({ configured: true, read(id) { return id === 'alice' ? alice.promise : bob.promise; } }, false, () => NOW);
  const first = controller.setAccount('alice'); const second = controller.setAccount('bob');
  bob.resolve(null); await second; alice.resolve(active()); await first;
  assert.equal(controller.current().accountId, 'bob'); assert.equal(controller.current().mode, 'free');
  const logout = pending(); const next = createSubscriptionController({ configured: true, read() { return logout.promise; } }, false, () => NOW);
  const loading = next.setAccount('alice'); await next.setAccount(null); logout.resolve(active()); await loading;
  assert.equal(next.current().mode, 'free'); assert.equal(next.current().ready, true);
});
test('the latest refresh wins over an older successful response', async () => {
  const old = pending(); const latest = pending(); let calls = 0;
  const controller = createSubscriptionController({ configured: true, read() { return ++calls === 1 ? old.promise : latest.promise; } }, false, () => NOW);
  const first = controller.setAccount('alice'); const second = controller.refresh();
  latest.resolve(null); await second; old.resolve(active()); await first; assert.equal(controller.current().mode, 'free');
});
test('verification errors close premium access and support retry without affecting the free mode', async () => {
  let fail = true; const controller = createSubscriptionController({ configured: true, async read() { if (fail) throw Error('Offline'); return active(); } }, false, () => NOW);
  await controller.setAccount('alice'); assert.equal(controller.current().mode, 'free'); assert.equal(controller.current().ready, true); assert.ok(controller.current().error);
  fail = false; await controller.refresh(); assert.equal(controller.current().mode, 'premium'); assert.equal(controller.current().error, '');
});
test('all premium catalog and creation routes render a boundary before mounting their content', () => {
  const root = path.resolve(__dirname, '../src/app');
  for (const name of ['book-studies','book-study','word-studies','word-study','study-search','sermon-builder','sermon-presenter','premium-library','mentorships','preachings','premium-content','content-watch','content-studio']) {
    const source = fs.readFileSync(path.join(root, name + '.tsx'), 'utf8');
    assert.match(source, /export default withPremiumAccess\(/, name);
    assert.equal(routePremiumFeature('/' + name), source.match(/export default withPremiumAccess\(\w+, '(\w+)'/)[1]);
  }
  assert.match(fs.readFileSync(path.join(root, 'sermon-outline.tsx'), 'utf8'), /return id \? content : <PremiumBoundary/);
});
