const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { loadProjectEnv } = require('@expo/env');

// Read the same dotenv precedence as Expo. This command never writes files or contacts a server.
const root = path.resolve(__dirname, '..');
loadProjectEnv(root, { mode: process.env.NODE_ENV || 'development', silent: true });

// Reuse the app's actual configuration validation instead of maintaining a second Firebase validator.
const settingsFile = path.join(root, 'src/services/auth-settings.ts');
const compiled = ts.transpileModule(fs.readFileSync(settingsFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject }, { filename: settingsFile });
const { readFirebaseSettings, validGoogleClientId } = exportsObject;

const fields = {
  apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
};
const values = Object.fromEntries(Object.entries(fields).map(([field, key]) => [field, process.env[key]]));
const firebaseReady = !!readFirebaseSettings(values);
const webClientReady = validGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
const iosClientReady = validGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
const androidReady = typeof process.env.APP_ANDROID_PACKAGE === 'string' && /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(process.env.APP_ANDROID_PACKAGE.trim());
const iosReady = typeof process.env.APP_IOS_BUNDLE_IDENTIFIER === 'string' && /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(process.env.APP_IOS_BUNDLE_IDENTIFIER.trim());

console.log('Bíblia Smart — configuração local da conta');
console.log('Somente o estado dos campos é mostrado; os valores não são exibidos.');
for (const key of Object.values(fields)) {
  console.log(`${key}: ${process.env[key]?.trim() ? 'preenchido' : 'falta preencher'}`);
}
console.log(`Firebase: ${firebaseReady ? 'configuração local completa' : 'configuração ausente ou inválida'}`);
console.log(`Google cliente Web: ${webClientReady ? 'formato válido' : 'ausente ou inválido'}`);
console.log(`Google cliente iOS: ${iosClientReady ? 'formato válido' : 'ausente ou inválido'}`);
console.log(`Identificador Android: ${androidReady ? 'formato válido' : 'ausente ou inválido'}`);
console.log(`Identificador iOS: ${iosReady ? 'formato válido' : 'ausente ou inválido'}`);
console.log('Esta verificação não confirma se o projeto existe, se os provedores estão ativados ou se o OAuth foi registrado corretamente.');
console.log(firebaseReady
  ? 'Próximo passo: ativar Email/Password no Firebase e validar uma conta de teste no Expo Go.'
  : 'Próximo passo: preencher .env.local com a configuração pública do app Web no Firebase.');
console.log('Para Google no celular, configure os clientes/pacote/certificados e prepare uma development build.');
console.log('Roteiro: docs/ACCOUNT-AUTH.md');
process.exitCode = firebaseReady ? 0 : 1;
