# Bíblia VP — builds Android e homologação

**Nome público:** Bíblia VP — Verdade Prática. **Pacote Android fixo para a distribuição:** `com.taysonaraujo.bibliasmart`. **Projeto EAS:** `a1115f2c-bec7-44b4-852d-9d69c60bb24e`. **Código de trabalho:** branch `feat/painel-preparacao-ministerial`.

## Diferença entre os perfis

- **preview:** gera APK para instalação direta, com recursos Premium liberados **somente para testes**, sem cobrança. Utiliza ambiente EAS `production` no perfil histórico de preview; confira as configurações no `eas.json` antes de construir.
- **production:** usa **ambiente EAS production**, distribuição `store`, `android.buildType: app-bundle`, com Premium de testes **desabilitado**. Gera arquivo AAB; **não envia automaticamente** à Google Play.
- A geração de AAB por si só **não publica** o aplicativo. A distribuição de testes depende de upload e configuração posterior no Play Console.
- Não altere o pacote Android após criar o app na Play; a identidade é vinculada ao pacote e à chave de assinatura.

## 1. Conferir o repositório

No PowerShell:

```powershell
cd "D:\Tayson\VSCODE\biblia-mulher"
git status --short
git pull --ff-only origin feat/painel-preparacao-ministerial
npm ci
npx expo install --check
npx tsc --noEmit
npm run lint
node --test scripts/*.test.cjs
node --test functions/*.test.mjs
```

Não execute `npm audit fix --force` no SDK 57. Auditorias pendentes e compatibilidade devem ser analisadas separadamente.

## 2. Conferir conta e variáveis do EAS production

```powershell
npx eas-cli@latest whoami
npx eas-cli@latest env:list production
npx eas-cli@latest env:exec production "node scripts/check-release-env.cjs"
```

É necessário configurar, no painel Expo > Project settings > Environment variables, as variáveis de cliente usadas por Firebase e Google, **no ambiente production**, antes da build: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Também revise as configurações de OAuth do Android e os fingerprints SHA exigidos para autenticação com Google. O script de diagnóstico só imprime `OK` ou `PENDENTE` para valores sensíveis, nunca as credenciais. **Não compartilhe valores de variáveis, tokens ou arquivos de assinatura em chats ou commits.**

Se o comando de preflight mostrar `PENDENTE`, configurar somente as variáveis ausentes e executar novamente. Variáveis em `.env.local` usadas pelo Expo Go não comprovam configuração da compilação remota.

## 3. Gerar AAB de homologação

Apenas depois do preflight:

```powershell
npx eas-cli@latest build --platform android --profile production
```

Se solicitado, configure a assinatura Android via EAS e guarde os acessos. O pacote de produção é `.aab`, **não** um APK instalável diretamente. Confirme no registro do EAS o pacote, versão/código, perfil e ausência de acesso Premium de teste. **Não use `--auto-submit` e não execute `eas submit` nesta fase.**

## 4. Validar o AAB pelo Google Play Console

Crie o cadastro do app no Play Console com o pacote Android existente, envie o AAB à faixa de **teste interno** (ou à faixa de teste fechado aplicável) e instale pelo link oficial da Play. Testes de produção devem verificar: abertura limpa, navegação Bíblia, nomes e capítulos, busca, Salmos 23, compartilhamento, modo claro/escuro, tamanho de fonte, recursos offline, agenda/lembretes, conta Google/e-mail, sincronização e restauração em dois dispositivos, atualização sem perda de dados e privacidade/exclusão de conta. Teste também que **Premium não é liberado gratuitamente** e que compras reais só aparecem após homologação e ativação.

A publicação pública continua bloqueada até revisar dados pessoais, exclusão real, direitos de conteúdo, dependências vulneráveis, telas e condições de assinatura. Caso a conta Play seja pessoal e criada depois de 13/11/2023, pode ser exigido teste fechado com 12 testadores por 14 dias contínuos.

## Referências
- https://docs.expo.dev/eas/environment-variables/manage/
- https://docs.expo.dev/eas/environment-variables/usage/
- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/submit/android/
- https://support.google.com/googleplay/android-developer/answer/14151465
- [Auditoria pré-publicação](./RELEASE-AUDIT-2026-11-25.md)
