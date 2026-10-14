const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function transpile(file, context = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, ...context }); return module.exports;
}
const { resolvePremiumTestAccess } = transpile('app.config.ts');
test('Premium testing is on locally, honors explicit disabling and always stays off in production', () => {
  assert.equal(resolvePremiumTestAccess(undefined, undefined), true);
  for (const profile of ['development', 'preview']) assert.equal(resolvePremiumTestAccess('true', profile), true);
  for (const value of ['false', '', 'TRUE', '1', 'invalid']) assert.equal(resolvePremiumTestAccess(value, undefined), false);
  for (const value of [undefined, 'true', 'false']) assert.equal(resolvePremiumTestAccess(value, 'production'), false);
});
test('dynamic config embeds a boolean, preserves project identity and resolves the actual build profile', () => {
  function configFor(env) {
    const appConfig = transpile('app.config.ts', { process: { env } }).default;
    return appConfig({ config: { name: 'Bíblia Smart', slug: 'biblia-mulher', extra: { eas: { projectId: 'existing-project' } }, android: { package: 'com.taysonaraujo.bibliasmart' }, ios: { bundleIdentifier: 'com.taysonaraujo.bibliasmart' } } });
  }
  const local = configFor({}); assert.equal(local.extra.premiumTestAccess, true);
  assert.equal(local.extra.eas.projectId, 'existing-project'); assert.equal(local.android.package, 'com.taysonaraujo.bibliasmart');
  assert.equal(local.ios.bundleIdentifier, 'com.taysonaraujo.bibliasmart');
  assert.equal(configFor({ APP_PREMIUM_TEST_ACCESS: 'false' }).extra.premiumTestAccess, false);
  assert.equal(configFor({ EAS_BUILD_PROFILE: 'preview', APP_PREMIUM_TEST_ACCESS: 'true' }).extra.premiumTestAccess, true);
  assert.equal(configFor({ EAS_BUILD_PROFILE: 'production', APP_PREMIUM_TEST_ACCESS: 'true' }).extra.premiumTestAccess, false);
});
test('EAS testing profiles enable the access flag and the store profile disables it', () => {
  const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
  assert.equal(eas.build.preview.env.APP_PREMIUM_TEST_ACCESS, 'true');
  assert.equal(eas.build.development.env.APP_PREMIUM_TEST_ACCESS, 'true');
  assert.equal(eas.build.production.env.APP_PREMIUM_TEST_ACCESS, 'false');
  assert.equal(eas.build.preview.android.buildType, 'apk'); assert.equal(eas.build.production.autoIncrement, true);
});
