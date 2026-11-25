# Ativar Gemini no Bíblia Smart

Integração preparada em 22/10/2026. O backend ativo em código usa Gemini generateContent; não exige chave OpenAI. A função ainda precisa ser implantada, e nenhuma chamada real foi feita nesta etapa.

## 1. Cadastrar a chave pelo terminal

No PowerShell, na pasta do app:

```powershell
cd "D:\Tayson\VSCODE\biblia-mulher"
npm run setup:gemini
```

O assistente pergunta:

- O ID exato do modelo Gemini disponível para sua chave no AI Studio, compatível com saída estruturada e texto longo. Não use o nome de exibição. Confira se o modelo tem cota gratuita na sua conta; o código não garante gratuidade nem faz fallback para outro modelo.
- Seu UID, em Firebase > Authentication > Usuários > sua conta. O piloto permite somente essa conta. A configuração fica em functions/.env.biblia-mulher, ignorada pelo Git.
- A chave será solicitada pelo comando oficial Firebase `functions:secrets:set GEMINI_API_KEY --project biblia-mulher`. Ela será enviada ao Secret Manager desse projeto; o assistente não grava a chave em arquivo nem a coloca nos argumentos ou no APK. Não use `EXPO_PUBLIC_GEMINI_API_KEY`.

É necessário estar autenticado no Firebase CLI. Se o comando informar falta de autenticação, execute `npx firebase-tools@latest login` e repita. O Secret Manager e a implantação de Functions podem exigir plano Blaze e APIs habilitadas; não aceite mudança de faturamento sem conferir os custos. O assistente não implanta funções, não habilita faturamento automaticamente e não testa a chave.

## 2. Implantar a função

Depois de concluir a configuração do projeto e conferir o plano:

```powershell
npx firebase-tools@latest deploy --only functions:preaching:generatePreaching --project biblia-mulher
```

Usar o alvo restrito evita publicar alterações das regras de sincronização. Após trocar a chave, implantar novamente para a função carregar a nova versão do segredo.

## 3. Conectar o aplicativo

Copie a URL HTTPS exibida pela implantação para o `.env.local` do app:

```dotenv
EXPO_PUBLIC_PREACHING_AI_URL=URL_HTTPS_DA_FUNCAO
```

Reinicie o Metro. Para build independente, configurar essa URL no ambiente EAS correspondente. A chave continua somente no servidor.

Entre no app com a conta cujo UID foi autorizado. Abra um esboço salvo, escolha a duração, leia e marque a autorização de envio ao Google Gemini e gere a prévia. Comece com um esboço de teste sem dados pessoais. O envio vai para o Google, conforme os termos e a cota do serviço utilizado; atualizar a política de privacidade antes do lançamento.

## Limites e validação

- Piloto: 2 tentativas por UID/dia UTC e 10 globais/dia UTC. A cota gratuita do Google pode ser menor e é compartilhada pelo projeto. Falhas depois da reserva também contam; não há repetição automática.
- Uma requisição Gemini por tentativa, com limite de 20.000 tokens de saída e timeout. Resposta truncada, bloqueada, inválida ou fora da extensão aceita não é salva como mensagem completa.
- Integração usa cabeçalho `x-goog-api-key`, saída JSON estruturada, ignora partes de raciocínio e preserva títulos/referências do esboço original. Revisão editorial continua necessária.
- Validação local usa respostas simuladas: não prova disponibilidade, cota, qualidade ou tempo de geração do modelo real.
- Assinatura Premium+ comercial e franquia mensal ainda não estão integradas ao servidor. A lista do piloto não deve ser usada como autorização definitiva para todos os assinantes.
- CORS continua desligado: geração real destinada ao Android. A prévia web mostra os controles, mas não gera pelo backend.

Referências:
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/structured-output
- https://firebase.google.com/docs/functions/config-env#secret_parameters
