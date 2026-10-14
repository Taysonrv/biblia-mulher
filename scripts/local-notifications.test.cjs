const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
test('local notification imports never reach push auto-registration', () => {
  const seen = new Set();
  const forbidden = /(?:DevicePushTokenAutoRegistration|TokenEmitter|PushTokenManager|warnOfExpoGoPushUsage|topicSubscription)/;
  function visit(filename) {
    if (seen.has(filename)) return;
    seen.add(filename);
    assert.equal(forbidden.test(filename), false, filename);
    const source = fs.readFileSync(filename, 'utf8');
    const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    for (const match of emitted.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const id = match[1];
      if (id.startsWith('expo-notifications/')) visit(require.resolve(id));
      else if (id.startsWith('.')) visit(require.resolve(path.resolve(path.dirname(filename), id)));
    }
  }
  visit(path.resolve(__dirname, '../src/services/local-notifications.native.ts'));
  assert.ok(seen.size > 10);
});
