> Para os bloqueios de publicação atualizados, consulte [Auditoria pré-publicação — 25/11/2026](RELEASE-AUDIT-2026-11-25.md). Este documento preserva o histórico de outubro.

# Bíblia VP — próxima etapa

Decisão do responsável: preparar assinatura desde o lançamento. Ainda não há conta no Play Console.

## Estado confirmado

- Build 7224b2e6-6360-4a7c-9bda-2b7e82af9180 em processamento na consulta desta etapa.
- Cobrança continua desativada (`subscriptionAdapter.configured: false`). Premium de teste não é assinatura real.
- A nova paleta foi alterada depois do envio dessa build; conferir pelo Metro. Não assumir que o APK contém essas cores em seu pacote JavaScript.
- Auditoria npm de produção: 35 alertas (23 altos, 12 moderados). A contagem inclui propagação entre dependências e ferramentas transitivas. Não equivale a 35 falhas exploráveis no APK.
- A auditoria sugeriu downgrades incompatíveis (inclusive Expo 44). Nenhuma correção automática ou atualização de dependência foi aplicada.
- Priorizar análise de decode-uri-component no caminho de navegação; distinguir gRPC do Firestore para Node do bundle React Native e bibliotecas de build do runtime. A exploração efetiva ainda não foi verificada.

## Validação manual do APK

Atualizar sobre a instalação existente, mantendo pacote e assinatura. Não desinstalar nem limpar dados.

1. Confirmar favoritos, anotações, agenda e esboços existentes após a atualização.
2. Entrar com Google e e-mail; sair e entrar novamente, verificando a preservação dos registros locais.
3. Ouvir capítulo, pausar, continuar e parar; ouvir a partir de um versículo. Confirmar interrupção ao sair da tela e ao colocar o app em segundo plano. Testar offline somente com voz offline instalada.
4. Montar pregação de esboço salvo, editar, salvar como nova mensagem e abrir apresentação. Conferir que o esboço original continua preservado.
5. Conferir claro/escuro e texto ampliado no Android. A prévia web não substitui este teste.
6. Usar dois aparelhos com a mesma conta para confirmar envio/recuperação de um registro de teste. Conferir a prévia antes de confirmar qualquer remoção e preservar backup.

## Assinatura no lançamento

Proposta técnica para avaliação: Google Play Billing com RevenueCat para gestão e verificação da assinatura. Não houve criação de conta, contratação, integração ou transmissão de dados ao RevenueCat nesta etapa.

1. Criar e verificar a conta de desenvolvedor no Play Console; cadastrar o app com pacote com.taysonaraujo.bibliasmart. O responsável deve concluir pagamentos e termos.
2. Escolher backend próprio ou RevenueCat antes de instalar o SDK de compras. Se RevenueCat for escolhido, vincular o acesso ao UID Firebase e definir política de troca de conta/restauração.
3. Definir produtos, períodos e preços; cadastrar produtos/base plans na Play e mapear acesso Premium. Não fixar preços localmente: apresentar os valores retornados pela loja.
4. Implementar compra, restauração, gerenciamento e estados pendente, cancelado, ativo, expirado e revogado. Compra pendente não concede Premium; cancelamento pode preservar acesso até o fim do período pago.
5. Validar permissões em backend confiável e conferir vínculo à conta. Não conceder acesso por simples login, backup ou flag local.
6. Testar em faixa interna da Play com usuários de teste e build própria para compras. A build atual não inclui SDK de cobrança e não testa pagamentos reais.
7. Concluir exclusão de conta/dados, política de privacidade, configuração de produção e declarações da loja antes do lançamento comercial.

Referências técnicas:
- https://developer.android.com/google/play/billing/integrate
- https://www.revenuecat.com/docs/getting-started/installation/expo
- https://www.revenuecat.com/docs/integrations/third-party-integrations/firebase-integration

Nenhuma conta ou dado real foi removido e nenhuma cobrança foi habilitada.
