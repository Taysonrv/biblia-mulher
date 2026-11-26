# Melhorias de uso e revisão inicial para publicação

Atualização: 18/10/2026.

## Melhorias entregues

- Início: cartão de leitura com capítulo em destaque, data da última visita e ações Continuar leitura / Ver histórico. Quem ainda não tem histórico pode começar em Gênesis ou escolher outro livro.
- O cartão explica que a retomada é a do aparelho atual; o histórico não passou a fazer parte da sincronização.
- Falha de histórico mantém uma ação para abrir a Bíblia e escolher capítulo, além da tentativa de recuperação.
- Meus dados: sincronização identificada como manual, data do último sucesso, totais de envio/recebimento em cartões e aviso destacado quando a confirmação inclui remoções/desmarcações.
- Uma conferência sem diferenças informa que não há alterações a transferir. A data do último sucesso não é apresentada como garantia de que modificações posteriores estão salvas.
- Os detalhes do que é sincronizado podem ser expandidos. O consentimento de vínculo à conta continua visível antes do primeiro vínculo.
- Nenhuma nova dependência, alteração de assinatura Android, migração de armazenamento ou publicação de regras nesta etapa.

## Validação desta etapa

- TypeScript e lint passaram.
- Prévia web verificada em 390×844 e 320×740, no tema escuro: estado sem histórico, abertura de Gênesis 1, retorno ao Início com retomada correta e expansão dos detalhes de sincronização sem sessão.
- Console da prévia sem erros/avisos durante a conferência.
- O navegador de teste não foi autenticado; o resumo com conta, conflitos e remoções ainda precisa de conferência visual no aparelho. As regras/merge não foram modificados por este pacote visual.
- A ativação de Firestore e a primeira sincronização foram confirmadas pelo usuário. A captura mostra `users/{uid}/sync`, mas não constitui evidência independente de recuperação em outro aparelho ou de testes negativos das regras.

## Revisão inicial para Play Store

O projeto ainda não está pronto para uma publicação comercial. Os itens abaixo foram identificados por inspeção do código/documentação; não representam testes concluídos no Play Console.

| Prioridade | Situação | Próxima ação |
| --- | --- | --- |
| Alta | Conta criada no app, sem fluxo de exclusão implementado. Regras atuais negam excluir a cópia da nuvem pelo cliente. | Implementar solicitação/exclusão de conta e dados com reautenticação, confirmação e limpeza remota por caminho autorizado. Não remover a conta Auth antes de garantir a limpeza da jornada. Disponibilizar o caminho web exigido pela loja. |
| Alta | Não foi localizada uma política de privacidade pública vinculada no app. | Definir responsável e contato, publicar política coerente com Auth/Firestore e preencher Segurança dos dados no Play Console. Explicar textos pessoais enviados, retenção, exclusão e processamento pelo Firebase. |
| Alta | `src/services/subscription.ts` ainda contém `configured: false`, sem compras reais. | Decidir se a primeira versão será gratuita ou terá assinatura. Para cobrar, implementar a integração com a loja e validação confiável antes de anunciar Premium contratado. |
| Alta | As variáveis `.env.local` são ignoradas pelo upload EAS. O ambiente de produção não foi conferido. | Configurar e validar as variáveis públicas de produção no EAS. O AAB precisa iniciar corretamente sem Metro, com Premium de teste desativado e as mesmas configurações Google/Firebase validadas. |
| Alta | AAB de produção e certificado do Google Play App Signing ainda não foram conferidos. | Gerar a versão candidata, registrar SHA-1 do certificado efetivo da Play e testar o login instalado pela loja; não confundir chave de upload com assinatura da instalação. |
| Média | A instalação anterior reportou 35 vulnerabilidades npm; não houve triagem nesta revisão visual. | Analisar dependências de produção e caminhos exploráveis. Aplicar correções compatíveis e repetir validação; evitar atualização forçada indiscriminada. |
| Média | Regras Firestore foram publicadas manualmente pelo usuário; testes de isolamento em emulador não foram executados aqui. | Testar acesso sem sessão, acesso de outra conta e esquema/revisão inválidos; verificar os índices do payload e avaliar proteção contra abuso antes de escalar. |
| Média | Sincronização manual com limite de 700 KB, sem histórico de navegação ou progresso de mentorias. | Validar dois aparelhos, offline, conflitos, remoções e lembretes. Manter a descrição do produto coerente com esse escopo. |
| Média | Texto bíblico tem referência/créditos documentados; áudio/vídeo e demais materiais precisam de conferência editorial. | Conferir direitos nos países de distribuição, atribuições e autorização dos conteúdos publicados antes de promovê-los na loja. |
| Média | Não foi informado o tipo/data da conta Play Console. | Conferir verificação da conta e exigências de teste fechado aplicáveis. Não prometer acesso imediato à produção. |

## Ordem proposta a partir daqui

1. Conferir estas telas no APK atual pelo Metro e validar recuperação da sincronização em outro aparelho.
2. Priorizar exclusão de conta/dados e política de privacidade, porque são pendências de publicação de um app com cadastro.
3. Definir oferta gratuita/Premium e preparar configuração real de produção.
4. Teste interno/fechado com AAB e conferência de login, sincronização, leitura offline, lembretes, acessibilidade, texto ampliado e temas.
5. Preparar ficha, imagens, declarações e envio à revisão da Play Store.

## Referências oficiais consultadas

- Exclusão de conta: https://support.google.com/googleplay/android-developer/answer/13327111
- Testes exigidos para novas contas pessoais: https://support.google.com/googleplay/android-developer/answer/14151465
- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/

Nenhuma conta ou dado real foi excluído. Nenhum AAB foi enviado à loja nesta revisão.
