// Run with the actual production environment. Deliberately does not load .env.local.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = process.env;
let failures = 0;
function check(label, ok) { console.log(`${ok ? 'OK' : 'PENDENTE'}: ${label}`); if (!ok) failures++; }
console.log('Bíblia VP — configuração recebida pelo processo (sem carregar .env.local).');
console.log('Nenhum valor de variável ou credencial será exibido.');
for (const key of ['EXPO_PUBLIC_FIREBASE_API_KEY','EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN','EXPO_PUBLIC_FIREBASE_PROJECT_ID','EXPO_PUBLIC_FIREBASE_APP_ID']) {
  check(key, typeof env[key] === 'string' && !!env[key].trim() && !/(preencher|your[_-]|api-key|project-id|app-id)/i.test(env[key]));
}
check('Projeto Firebase esperado', env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() === 'biblia-mulher');
check('Cliente OAuth Web com formato válido', /^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? ''));
const app = JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
const legal = JSON.parse(fs.readFileSync(path.join(root,'src/data/legal.json'),'utf8'));
check('Nome do produto e política consistentes', app.name === 'Bíblia VP' && legal.app === app.name);
check('URLs legais em HTTPS', [legal.privacyUrl, legal.deletionUrl].every(url => typeof url === 'string' && /^https:\/\/[^\s]+$/.test(url)));
check('Pacote Android preservado', (env.APP_ANDROID_PACKAGE?.trim() || app.android.package) === 'com.taysonaraujo.bibliasmart');
check('Premium de teste explicitamente desativado', env.APP_PREMIUM_TEST_ACCESS === 'false');
check('IA integrada desativada nesta preparação', !env.EXPO_PUBLIC_PREACHING_AI_URL?.trim());
check('Cobrança desativada até validar loja e termos', env.EXPO_PUBLIC_BILLING_ENABLED !== 'true');
console.log('Esta verificação NÃO comprova configuração no EAS, login real, direitos, regras, compras ou aprovação da loja.');
console.log('Antes da loja: publicar URLs legais, validar atendimento de exclusão, integrar assinaturas e testar o AAB pela Play.');
process.exitCode = failures ? 1 : 0;
