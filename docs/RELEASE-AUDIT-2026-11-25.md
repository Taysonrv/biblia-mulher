# Bíblia VP — Auditoria pré-publicação (25/11/2026)

## Escopo e limite desta revisão
Revisão estática do repositório na branch `feat/painel-preparacao-ministerial`: identidade, configuração Expo/EAS, rotas principais, privacidade e exclusão, Firebase/Firestore, assinaturas, IA, acessibilidade, testes e documentação. Não substitui ensaios instrumentados em dispositivos reais, avaliação de segurança independente, verificação de direitos de conteúdo ou homologação da Google Play.

## Correções aplicadas nesta revisão
- Unificação da marca **Bíblia VP** na fonte da política, tela de privacidade, e-mails de solicitação, páginas HTML versionadas e informação sobre RevenueCat. A política atualizada no repositório ainda deve ser publicada no Firebase Hosting; não se assume que a hospedagem foi atualizada.
- Liberação de Premium de teste **desativada por padrão**: só é habilitada com `APP_PREMIUM_TEST_ACCESS=true`, e o perfil EAS `production` sempre a bloqueia. O perfil `preview` permanece explicitamente liberado para testes.
- Clareza sobre o esboço básico e os textos salvos gratuitos, sem badges que sugiram cobrança obrigatória no acesso à preparação.
- Exclusão do cache `.firebase/` do Git.
- Verificador `scripts/check-release-env.cjs` reforçado: pacote, marca, URLs HTTPS, configuração Firebase, Premium de testes, cobrança e IA desativados.
- Testes de coerência de marca/páginas legais e workflow GitHub Actions para TypeScript, lint e testes.

## Pendências bloqueantes da publicação comercial

### 1. Conta de desenvolvedor e testes da Play
- Criar/verificar a conta do Play Console, aceitar termos, fornecer os dados exigidos e configurar o app no pacote já existente `com.taysonaraujo.bibliasmart`.
- Para contas pessoais abertas após 13/11/2023, confirmar o requisito de teste fechado com **ao menos 12 testadores inscritos continuamente por 14 dias**, salvo mudança de regra ou exceção aplicável.
- Gerar o AAB pelo perfil `production` (não `preview`) e testar o arquivo distribuído pela faixa interna/fechada. O APK de desenvolvimento ou Expo Go não comprova o comportamento de produção.

### 2. Identidade, política e direitos
- Verificar disponibilidade da marca/nome no INPI e lojas; a revisão do código não garante direito exclusivo à marca.
- Atualizar as páginas públicas com `node scripts/build-legal-pages.cjs` e implantar **somente o hosting legal** usando `firebase.legal.json`. Confirmar URLs HTTPS acessíveis por terceiros e correspondência de conteúdo.
- Testar o fluxo de solicitação e efetiva exclusão de conta com conta descartável, inclusive bloqueio de novas gravações/sessões antigas e remoção da subcoleção `users/{uid}/sync/journey`. Não afirmar exclusão concluída apenas com recebimento de e-mail.
- Revisar autorização/licença de todas as letras da Harpa e das traduções para distribuição no Brasil; manter créditos e links visíveis.
- Preparar política, Termos e formulário de Segurança dos dados com as categorias reais (e-mail, identificador, notas e reflexões, eventual conteúdo religioso sensível, metadados de compra se ativados).

### 3. Pagamentos e IA
- A integração RevenueCat está preparada, **mas a cobrança permanece desativada**. Sem configuração de Play Billing, produtos, entitlement, condições e ensaios com contas de licença, não disponibilizar plano pago.
- Se for obrigatório lançar com assinatura, validar preços/renovação/cancelamento/restauração, transações pendentes, expiração, troca de UID, reembolso e verificação no servidor.
- IA via backend está em piloto com allowlist, sem autorização comercial completa de Premium+ nem App Check. Não ativar a geração pública ou alegar IA paga ilimitada antes dessas integrações e atualizações da política.

### 4. Qualidade nativa e segurança
- `npm ci`, `npx tsc --noEmit`, `npm run lint`, `node --test scripts/*.test.cjs` e `node --test functions/*.test.mjs` devem passar, inclusive no GitHub Actions.
- Executar `npx expo install --check` e revisar atualizações compatíveis. Auditar dependências com `npm audit --omit=dev`, analisar vulnerabilidades por alcance real e aplicar correções sem downgrades automáticos de SDK.
- Validar SDK nativo, permissões, Play App Signing/SHA para Google OAuth, notificações, Firestore com dois aparelhos e regras de acesso negado para outros UIDs.
- Conferir o `targetSdkVersion` no AAB. Expo SDK 57 referencia Android API 36, requisito para novos apps Android em novembro de 2026; a configuração nativa final deve confirmar.
- Cobrir Android com tela pequena, alto dimensionamento de fonte, modo escuro/claro, navegação por gestos, botão voltar, rolagem da lista de capítulos e leitor sem rede. Confirmar atualização sobre a instalação existente sem perder favoritos, notas, agenda e backups.
- Verificar a faixa de teste Premium **ausente** no AAB de produção. Não usar a build `preview` na loja.

## Sequência sugerida
1. Sincronizar a branch e aguardar os checks verdes no GitHub Actions; corrigir falhas.
2. Verificar dependências e gerar `production` AAB de teste, mantendo o pacote e a assinatura existentes.
3. Validar conta, exclusão e dados em dois dispositivos, depois publicar as páginas legais.
4. Ativar e testar cobrança se o lançamento for comercial.
5. Preencher Play Console (política, exclusão de dados, conteúdos, privacidade, classificação, screenshots, direitos).
6. Teste fechado aplicável, ajustes por feedback, revisão final e só então solicitar produção.

## Links oficiais úteis
- Requisito Android target API: https://support.google.com/googleplay/android-developer/answer/11926878
- Política de dados e exclusão: https://support.google.com/googleplay/android-developer/answer/10144311
- Teste para novas contas pessoais: https://support.google.com/googleplay/android-developer/answer/14151465
- Pagamentos: https://support.google.com/googleplay/android-developer/answer/9858738
- Expo SDK: https://docs.expo.dev/versions/latest/

**Status:** código endurecido para preparação, porém **não homologado para publicação**. Este documento não é um certificado de aprovação técnica ou regulatória.
