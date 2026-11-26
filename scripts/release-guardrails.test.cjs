const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('app identity and privacy policy use the same public name', () => {
  const app = JSON.parse(read('app.json')).expo;
  const legal = JSON.parse(read('src/data/legal.json'));
  assert.equal(app.name, 'Bíblia VP');
  assert.equal(legal.app, app.name);
  assert.equal(app.android.package, 'com.taysonaraujo.bibliasmart');
  assert.match(legal.privacyUrl, /^https:\/\//);
  assert.match(legal.deletionUrl, /^https:\/\//);
  for (const section of legal.sections) assert.doesNotMatch(section.body, /Bíblia Smart/i);
});

test('checked-in legal pages match the product brand and account-deletion address', () => {
  const legal = JSON.parse(read('src/data/legal.json'));
  const privacy = read('public-legal/privacy.html');
  const deletion = read('public-legal/delete-account.html');
  for (const html of [privacy, deletion]) {
    assert.ok(html.includes(legal.app));
    assert.ok(html.includes(legal.email));
    assert.ok(html.includes('Atualizada em ' + legal.updated));
    assert.doesNotMatch(html, /Bíblia Smart/i);
  }
  assert.ok(deletion.includes('Exclusão de conta'));
  assert.ok(deletion.includes('Preparar pedido por e-mail'));
});

test('production build has preview access disabled while development builds remain explicit', () => {
  const eas = JSON.parse(read('eas.json'));
  assert.equal(eas.build.production.env.APP_PREMIUM_TEST_ACCESS, 'false');
  assert.equal(eas.build.production.environment, 'production');
  assert.equal(eas.build.production.distribution, 'store');
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.preview.env.APP_PREMIUM_TEST_ACCESS, 'true');
  assert.equal(eas.build.development.env.APP_PREMIUM_TEST_ACCESS, 'true');
  assert.match(read('app.config.ts'), /return value === 'true';/);
});

test('deployment cache and local secrets are not tracked accidentally', () => {
  const ignore = read('.gitignore');
  assert.match(ignore, /^\/\.firebase\/$/m);
  assert.match(ignore, /^\.env\*\.local$/m);
  assert.match(ignore, /^\/functions\/\.env\*/m);
});
