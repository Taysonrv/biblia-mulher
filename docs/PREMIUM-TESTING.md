# Premium liberado na fase de testes

Atualização de 05/10/2026, solicitada para facilitar os testes do aplicativo.

## Comportamento atual

- Expo Go e APK com perfil EAS `preview` abrem com os recursos Premium liberados automaticamente, inclusive sem conta.
- Uma faixa permanente informa **PREMIUM LIBERADO PARA TESTES • SEM COBRANÇA**. Os cards e a tela Gratuito e Premium também identificam esse acesso.
- A liberação continua após reiniciar, atualizar o acesso ou trocar de conta. Não é necessário usar o antigo botão de simulação.
- Estudos dos livros, palavras no original, busca nos estudos, geração de esboços, duplicação, apresentação e telas de Mentorias e Pregações ficam acessíveis.
- O Estúdio de testes também funciona no APK preview: selecione vídeos ou áudios locais para validar aulas e reprodução.
- O catálogo publicado ainda está vazio, pois não existe hospedagem/servidor configurado. O estúdio cria prévias apenas no aparelho, sem upload. Prévias e progresso de mídia de teste são temporários e terminam ao reiniciar ou trocar de conta.
- Favoritos bíblicos, reflexões e esboços pessoais continuam no armazenamento e no backup existentes. Nenhuma assinatura, pagamento ou conta foi criada por esta alteração.

## Testar no Expo Go

Encerre um servidor antigo com Ctrl+C e inicie novamente para recarregar a configuração:

```powershell
cd "D:\Tayson\App Biblia\biblia-mulher"
npx expo start --go --clear
```

Abra o app e confira a faixa. Acesse um estudo de Gênesis, uma palavra no original e a preparação de uma mensagem. Em Mentorias e Pregações → Estúdio de testes, monte uma prévia local de vídeo/áudio.

## Atualizar o APK

O APK anterior mantém o bloqueio antigo. É preciso gerar e instalar uma nova versão:

```powershell
cd "D:\Tayson\App Biblia\biblia-mulher"
npx eas-cli@latest build --platform android --profile preview
```

Este pacote não iniciou build na nuvem, publicação ou push.

## Configuração

`app.config.ts` resolve o campo público booleano `extra.premiumTestAccess`, lido pelo SubscriptionProvider com `Constants.expoConfig`. A liberação local vem ativada por padrão nesta fase. `APP_PREMIUM_TEST_ACCESS=false` permite desativá-la ao iniciar o Expo local, para testar os bloqueios.

`eas.json` ativa o campo nos perfis `development` e `preview`, e desativa no perfil `production`. A função de configuração sempre desativa a liberação quando `EAS_BUILD_PROFILE=production`, mesmo se a variável de liberação vier como true. O perfil `production` é destinado à versão comercial; os testes de APK devem usar `preview`.

Com o teste automático desativado, permanecem as regras existentes de assinatura verificada e a simulação manual exclusivamente em desenvolvimento. O modo automático reutiliza o estado `preview`, com `testAccess=true`, sem armazenar prova de compra ou alterar as regras futuras do servidor.

## Arquivos alterados

- `app.config.ts`, `eas.json`, `.env.example`: configuração do modo de testes.
- `src/services/subscription-access.ts`, `src/components/subscription-provider.tsx`: acesso automático sem depender de `__DEV__`.
- `src/app/_layout.tsx`, `src/app/subscription.tsx`, `src/components/subscription-card.tsx`, `src/components/modern-ui.tsx`: avisos e identificação coerentes.
- `src/components/content-provider.tsx`, `src/components/content-catalog.tsx`, `src/app/content-studio.tsx`, `src/app/premium-library.tsx`: prévias de vídeo/áudio também no APK de testes.
- `scripts/subscription.test.cjs`, `scripts/premium-content.test.cjs`, `scripts/premium-test-config.test.cjs`: seis novos testes.
- Este guia e os guias `SUBSCRIPTION.md` e `EAS-BUILD.md`.

## Verificações concluídas

- TypeScript e lint passaram sem erros/avisos.
- 236 testes passaram, incluindo os seis novos cenários de liberação automática, reinício/troca de conta, configuração de build e reprodução local em APK de testes.
- A configuração real do Expo confirmou `premiumTestAccess=true` localmente e `false` para production, mesmo com uma tentativa de variável true. O projeto EAS existente foi preservado.
- Pacotes Android e iOS exportados com sucesso. Isso confirma compilação, sem gerar outro APK ou testar o aparelho físico.

Referência técnica: [configuração Expo SDK 57 e campos extra](https://docs.expo.dev/versions/v57.0.0/config/app/).
