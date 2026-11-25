const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const readline = require('node:readline/promises');
const root = path.resolve(__dirname, '..');
async function main() {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  let model, uid;
  try {
    console.log('Configuração do Gemini para o projeto Firebase biblia-mulher.');
    console.log('Não digite a chave nestas perguntas. Ela será solicitada pelo Firebase Secret Manager.');
    model = (await prompt.question('ID do modelo Gemini disponível na sua conta AI Studio: ')).trim();
    uid = (await prompt.question('UID Firebase da sua conta de teste (Authentication > Usuários): ')).trim();
  } finally { prompt.close(); }
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw Error('ID de modelo inválido. Exemplo de formato: gemini-3.8-flash.');
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) throw Error('UID inválido. Copie o UID da sua conta em Firebase Authentication.');
  console.log('O Firebase pedirá agora a chave. Ela será enviada ao Secret Manager do projeto biblia-mulher.');
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['firebase-tools@latest', 'functions:secrets:set', 'GEMINI_API_KEY', '--project', 'biblia-mulher'], { stdio: 'inherit', shell: process.platform === 'win32', cwd: root });
  if (result.error || result.status !== 0) throw Error('Não foi possível cadastrar o segredo. Confira o login Firebase e o plano do projeto.');
  const filename = path.join(root, 'functions', '.env.biblia-mulher');
  let content = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
  for (const [key, value] of Object.entries({ PREACHING_AI_MODEL: model, PREACHING_AI_ALLOWED_UIDS: uid })) {
    const entry = `${key}=${value}`;
    content = new RegExp(`^${key}=.*$`, 'm').test(content) ? content.replace(new RegExp(`^${key}=.*$`, 'm'), entry) : content.trimEnd() + '\n' + entry + '\n';
  }
  fs.writeFileSync(filename, content.trimStart(), 'utf8');
  console.log('Segredo cadastrado e configuração local salva. Nenhuma função foi publicada.');
  console.log('Próxima etapa: implantar somente functions:preaching:generatePreaching e configurar sua URL no app.');
}
main().catch(() => { console.error('Configuração não concluída. Confira as mensagens do Firebase acima; nenhum segredo foi impresso por este assistente.'); process.exitCode = 1; });
