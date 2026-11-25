# Preparação para publicação — 22/10/2026

Responsável informado: Tayson Alves de Araujo. Contato: taysonrv_569@hotmail.com.

## Entregue nesta etapa

- Perfil e Conta têm acesso a Privacidade e conta, com política legível no próprio app.
- Pedido de exclusão prepara mensagem no aplicativo de e-mail, com endereço e assunto selecionáveis como alternativa. Não envia automaticamente, não lê dados privados para preencher a mensagem e não exclui nada.
- `src/data/legal.json` é a fonte compartilhada da política e das páginas web.
- `node scripts/build-legal-pages.cjs` gera `public-legal/privacy.html` e `public-legal/delete-account.html`. Publicadas em 22/10/2026 em https://biblia-mulher-legal.web.app/privacy.html e https://biblia-mulher-legal.web.app/delete-account.html. Ambas retornaram HTTP 200 sem autenticação e com o contato correto. Não foram cadastradas no Google Play ainda.
- `node scripts/check-release-env.cjs` confere somente o ambiente recebido pelo processo. Não carrega `.env.local`, não imprime valores e não prova que o EAS tenha as variáveis. Falha se faltarem campos, houver pacote diferente, Premium de teste ativo/não explicitamente desativado ou IA habilitada nesta preparação.

## Exclusão manual: operação que o responsável precisa manter

Este fluxo depende de monitorar o e-mail de suporte. Testar com conta descartável antes de publicar; nunca usar a conta real do responsável para testes destrutivos.

1. Receber pedido, confirmar o endereço da conta e a titularidade por canal verificado. Não pedir senha, token, código de autenticação ou documentos desnecessários. Não excluir por simples indicação de UID em e-mail.
2. Informar o prazo de atendimento e eventuais retenções legais concretas. Nenhum prazo fixo foi inventado na política; definir um prazo operacional antes de lançar e mantê-lo coerente no atendimento e na página pública.
3. Identificar o UID no Firebase Authentication e verificar se a conta possui assinatura. Exclusão não substitui cancelamento na Google Play.
4. Fazer a operação administrativa em ambiente confiável. Bloquear novas sessões e sincronizações da conta antes da limpeza. Desativar uma conta no Authentication por si só não deve ser tratado como garantia de bloqueio imediato das requisições Firestore de sessões já emitidas. Para garantia de exclusão, preparar bloqueio por UID nas regras/backend e verificar sua efetividade antes da limpeza. **Esse bloqueio e seus testes ainda são pendência técnica.**
5. Remover documentos e subcoleções associados ao UID, incluindo `users/{uid}/sync/journey`. Excluir apenas o documento pai não remove subcoleções. Conferir inventário de outros serviços antes de declarar exclusão total. A IA não foi ativada; se futuramente houver registros de uso ou compras, incluir seus ciclos e obrigações de retenção.
6. Confirmar a remoção dos dados remotos; só depois remover o usuário do Authentication. Tratar falhas parciais como pendentes e repetir a limpeza com verificação. Registrar conclusão mínima para responder ao pedido, sem copiar textos pessoais para logs.
7. Confirmar ao solicitante o escopo removido e quaisquer retenções. Explicar que cópias locais em aparelhos, arquivos exportados e a própria conta Google não são removidos pelo pedido ao Bíblia Smart.

O app não oferece exclusão automática implementada. O caminho de solicitação não equivale a um processo operacional validado. Não declarar essa pendência concluída até testar o atendimento e o bloqueio contra recriação dos dados.

## Próximos bloqueios

- Páginas legais publicadas em HTTPS no site separado biblia-mulher-legal. Cadastrar os dois links no Play Console após criar a conta. O app tem botões para abrir esses endereços. Repetir publicação com node scripts/build-legal-pages.cjs e npx firebase-tools@latest deploy --only hosting --config firebase.legal.json --project biblia-mulher --non-interactive. Essa configuração não inclui funções nem regras.
- Validar fluxo operacional de exclusão e proteção contra escrita de sessões antigas.
- Usuário confirmou em 22/10/2026 que ainda não criou a conta no Play Console. Cadastro, pagamento de inscrição, termos e verificação precisam ser concluídos pelo titular.
- Em 23/10/2026 foi preparada integração Android com RevenueCat: consulta de planos, compra Premium, restauração e validação de acesso por UID. Ativação permanece desligada (EXPO_PUBLIC_BILLING_ENABLED ausente/false e chave não cadastrada). SDK exige nova build. Contas/produtos, preços, termos, política e testes reais de loja continuam pendentes. Ver docs/PLAY-BILLING.md. Não anunciar compras ou IA funcionando.
- Configuração pública Firebase/Google e pacote foram cadastrados no ambiente production do EAS, com APP_PREMIUM_TEST_ACCESS=false. Uma nova consulta confirmou as sete variáveis. O verificador passou com os valores enviados. Ainda falta gerar AAB, confirmar que a build recebe esse ambiente e testar sem Metro; cadastro de variáveis não comprova login real.
- Conferir certificado Play App Signing no OAuth/Firebase após primeira distribuição pela loja.
- Validar dois aparelhos, backup/restauração, leitura offline/online, voz, notificações e apresentação no Android; revisar dependências e regras.
- Preparar ficha, Segurança dos dados (incluindo conteúdo religioso sensível enviado pelo usuário), classificação, direitos, capturas e teste fechado aplicável.

Fontes: https://support.google.com/googleplay/android-developer/answer/13327111 · https://docs.expo.dev/eas/environment-variables/ · https://firebase.google.com/docs/auth/web/manage-users

As duas páginas legais foram publicadas no Firebase Hosting. Nenhuma versão do app foi enviada à Play Store, nenhum faturamento foi ativado e nenhum dado de usuário foi removido.
