const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const ts = require('typescript');
function load(filename, mocks = {}) {
  const module = { exports: {} }; const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Error, Object, Promise, require: id => id in mocks ? mocks[id] : load(path.resolve(path.dirname(filename), id + '.ts'), mocks) }); return module.exports;
}
const source = name => path.resolve(__dirname, '../src/services/' + name + '.ts');
const model = load(source('auth-model')); const { validEmail, validPassword, validRegistration, authErrorMessage, createAccountService } = model;
const settings = load(source('auth-settings'));
function adapter() {
  const state = { current: null, calls: [], deferred: null };
  const api = { configured: true, current: () => state.current, subscribe(listener) { listener(state.current); return () => undefined; },
    async login(email, password) { state.calls.push(['login', email, password]); if (state.deferred) await state.deferred; state.current = { uid: 'test-user', email, name: null, verified: false, providers: ['password'] }; },
    async register(name, email, password) { state.calls.push(['register', name, email, password]); return 'Conta criada'; }, async reset(email) { state.calls.push(['reset', email]); }, async google() { state.calls.push(['google']); return 'success'; }, async logout() { state.current = null; state.calls.push(['logout']); }, async verify() { state.calls.push(['verify']); }, async reload() { state.calls.push(['reload']); }, };
  return { api, state, service: createAccountService(api) };
}
test('email and name normalize while password contents remain exact', () => {
  assert.equal(validEmail('  Pessoa@Exemplo.com  '), 'pessoa@exemplo.com');
  const value = validRegistration('  Ana   Souza ', 'Pessoa@Exemplo.com', ' senha longa ', ' senha longa '); assert.equal(value.name, 'Ana Souza'); assert.equal(value.password, ' senha longa ');
});
test('registration rejects invalid names, emails, password sizes and mismatching confirmation', () => {
  for (const values of [['A', 'a@b.com', 'abcdefgh', 'abcdefgh'], ['Ana', 'invalid', 'abcdefgh', 'abcdefgh'], ['Ana', 'a@b.com', 'short', 'short'], ['Ana', 'a@b.com', ' '.repeat(8), ' '.repeat(8)], ['Ana', 'a@b.com', 'x'.repeat(129), 'x'.repeat(129)], ['Ana', 'a@b.com', 'abcdefgh', 'abcdefgi']]) assert.throws(() => validRegistration(...values));
});
test('login accepts older nonempty passwords and does not impose signup length on an existing account', () => { assert.equal(validPassword('sixsix'), 'sixsix'); assert.throws(() => validPassword('')); assert.throws(() => validPassword(' '.repeat(8))); });
test('missing and placeholder Firebase settings are unavailable, while client identifiers are accepted', () => {
  assert.equal(settings.readFirebaseSettings({ apiKey: '', authDomain: '', projectId: '', appId: '' }), null);
  assert.equal(settings.readFirebaseSettings({ apiKey: 'api-key', authDomain: 'project-id.firebaseapp.com', projectId: 'project-id', appId: 'app-id' }), null);
  assert.equal(settings.readFirebaseSettings({ apiKey: 'client-key', authDomain: 'test.firebaseapp.com', projectId: 'test', appId: 'client-app' }).projectId, 'test');
  assert.equal(settings.validGoogleClientId('123-demo.apps.googleusercontent.com'), true); assert.equal(settings.validGoogleClientId('client-secret'), false);
});
test('unconfigured auth never invokes an adapter or fabricates a user', async () => {
  const { api, state } = adapter(); api.configured = false; const service = createAccountService(api);
  for (const operation of [() => service.login('a@b.com', 'password'), () => service.register('Ana', 'a@b.com', 'password', 'password'), () => service.google(), () => service.reset('a@b.com')]) await assert.rejects(operation());
  assert.equal(state.calls.length, 0); assert.equal(service.current(), null);
});
test('invalid inputs cannot reach the login/signup adapter', async () => {
  const { service, state } = adapter(); await assert.rejects(service.login('bad', 'x')); await assert.rejects(service.register('Ana', 'a@b.com', 'abcdefgh', 'other')); assert.equal(state.calls.length, 0);
});
test('login and registration pass normalized values to the real adapter boundary', async () => {
  const { service, state } = adapter(); await service.login(' A@B.com ', ' pass word '); await service.register(' Ana ', ' C@D.com ', 'abcdefgh', 'abcdefgh');
  assert.equal(state.calls[0][1], 'a@b.com'); assert.equal(state.calls[0][2], ' pass word '); assert.equal(state.calls[1][1], 'Ana'); assert.equal(state.calls[1][2], 'c@d.com');
});
test('a second auth operation is rejected while the first is pending; failures release the lock', async () => {
  const { service, state } = adapter(); let complete; state.deferred = new Promise(resolve => { complete = resolve; }); const first = service.login('a@b.com', 'password');
  await assert.rejects(service.google()); assert.equal(state.calls.length, 1); complete(); await first;
  await assert.rejects(service.login('invalid', 'password')); assert.match(await service.google(), /Google/);
});
test('password reset always reports the same message for known and unknown addresses', async () => {
  const { api, service } = adapter(); const known = await service.reset('a@b.com'); api.reset = async () => { throw { code: 'auth/user-not-found' }; }; assert.equal(await service.reset('c@d.com'), known);
  api.reset = async () => { throw { code: 'auth/network-request-failed' }; }; await assert.rejects(service.reset('a@b.com'));
});
test('cancelled Google login does not create a user or invoke password APIs', async () => { const { api, service, state } = adapter(); api.google = async () => 'cancelled'; assert.match(await service.google(), /cancelado/); assert.equal(state.current, null); assert.equal(state.calls.length, 0); });
test('authentication errors use safe messages and never show provider tokens or raw error details', () => {
  assert.equal(authErrorMessage({ code: 'auth/user-not-found' }), authErrorMessage({ code: 'auth/wrong-password' }));
  assert.equal(authErrorMessage({ code: 'unexpected', message: 'PRIVATE TOKEN' }).includes('PRIVATE'), false); assert.match(authErrorMessage({ code: 'auth/network-request-failed' }), /conexão/);
});
function firebaseAdapter({ profileFails = false, verificationFails = false } = {}) {
  const state = { calls: [], user: null, listener: null }; const auth = { get currentUser() { return state.user; } };
  const sdk = {
    async createUserWithEmailAndPassword(_auth, email, password) { state.calls.push(['create', email, password]); state.user = { uid: 'uid', email, displayName: null, emailVerified: false, providerData: [{ providerId: 'password' }], refreshToken: 'never-expose' }; return { user: state.user }; },
    async updateProfile(user, data) { if (profileFails) throw Error('profile'); user.displayName = data.displayName; }, async sendEmailVerification() { if (verificationFails) throw Error('mail'); state.calls.push(['verify']); },
    onAuthStateChanged(_auth, listener) { state.listener = listener; listener(state.user); return () => { state.listener = null; }; },
    async signInWithEmailAndPassword(_auth, email) { state.calls.push(['login', email]); }, async sendPasswordResetEmail(_auth, email) { state.calls.push(['reset', email]); }, async signOut() { state.user = null; state.calls.push(['logout']); }, async reload(user) { user.emailVerified = true; },
  };
  const { firebaseAccount } = load(source('firebase-account'), { 'firebase/auth': sdk, './auth-config': { firebaseSettings: {} }, './firebase-session': { getFirebaseSession: () => auth }, './google-login': { async googleLogin() { return 'cancelled'; }, async clearGoogleLogin() { state.calls.push(['clear-google']); } } });
  return { api: firebaseAccount, state };
}
test('Firebase adapter creates an account, updates its name and sends verification', async () => {
  const { api, state } = firebaseAdapter(); const message = await api.register('Ana', 'a@b.com', 'abcdefgh'); assert.equal(state.user.displayName, 'Ana'); assert.match(message, /criada/); assert.equal(state.calls.filter(call => call[0] === 'create').length, 1); assert.equal(state.calls.filter(call => call[0] === 'verify').length, 1);
  assert.equal('refreshToken' in api.current(), false);
});
test('profile or verification failure after signup is reported as a created account rather than retrying creation', async () => {
  const { api, state } = firebaseAdapter({ profileFails: true, verificationFails: true }); const message = await api.register('Ana', 'a@b.com', 'abcdefgh'); assert.match(message, /criada/); assert.match(message, /não foi enviada/); assert.equal(api.current().uid, 'uid'); assert.equal(state.calls.filter(call => call[0] === 'create').length, 1);
});
test('observer and reload expose only safe user fields; logout clears the Firebase session', async () => {
  const { api, state } = firebaseAdapter(); await api.register('Ana', 'a@b.com', 'abcdefgh'); let user; const unsubscribe = api.subscribe(value => { user = value; }, () => assert.fail()); assert.equal(user.email, 'a@b.com'); assert.equal('refreshToken' in user, false); unsubscribe(); assert.equal(state.listener, null);
  await api.reload(); assert.equal(api.current().verified, true); await api.logout(); assert.equal(api.current(), null); assert.equal(state.calls.at(-1)[0], 'clear-google');
});
function googleNative({ go = false, client = '123-demo.apps.googleusercontent.com', response = { type: 'success', data: { idToken: 'test-id-token' } } } = {}) {
  const state = { loads: 0, credentials: [], scopes: null }; const sdk = { GoogleSignin: { configure(options) { state.scopes = options; }, async hasPlayServices() {}, async signIn() { return response; }, async signOut() {} }, isErrorWithCode: reason => !!reason.code, statusCodes: { SIGN_IN_CANCELLED: 'cancel', PLAY_SERVICES_NOT_AVAILABLE: 'services' } };
  const { googleLogin } = load(source('google-login.native'), { 'expo-constants': { __esModule: true, default: { executionEnvironment: go ? 'storeClient' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }, 'react-native': { Platform: { OS: 'android' } }, 'firebase/auth': { GoogleAuthProvider: { credential: token => ({ token }) }, async signInWithCredential(_auth, credential) { state.credentials.push(credential); } }, './auth-config': { googleWebClientId: client, googleIosClientId: undefined }, '@react-native-google-signin/google-signin': new Proxy(sdk, { get(target, key) { if (key === '__esModule') state.loads++; return Reflect.get(target, key); } }) });
  return { googleLogin, state };
}
test('Expo Go rejects Google before evaluating the unavailable native module', async () => { const { googleLogin, state } = googleNative({ go: true }); await assert.rejects(googleLogin({})); assert.equal(state.loads, 0); assert.equal(state.credentials.length, 0); });
test('missing Google client configuration cannot open native sign in', async () => { const { googleLogin, state } = googleNative({ client: '' }); await assert.rejects(googleLogin({})); assert.equal(state.loads, 0); });
test('native Google uses an ID token to authenticate with Firebase without requesting extra scopes', async () => {
  const { googleLogin, state } = googleNative(); assert.equal(await googleLogin({}), 'success'); assert.equal(state.credentials[0].token, 'test-id-token'); assert.equal(state.scopes.offlineAccess, false); assert.equal(state.scopes.scopes, undefined);
});
test('native Google cancellation does not authenticate Firebase', async () => { const { googleLogin, state } = googleNative({ response: { type: 'cancelled' } }); assert.equal(await googleLogin({}), 'cancelled'); assert.equal(state.credentials.length, 0); });
test('native Google responses without an ID token cannot authenticate Firebase', async () => { const { googleLogin, state } = googleNative({ response: { type: 'success', data: { idToken: null } } }); await assert.rejects(googleLogin({})); assert.equal(state.credentials.length, 0); });
