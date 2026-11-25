# Assinaturas Android — preparação em 23/10/2026

## Implementado, ainda não ativado

SDK `react-native-purchases` 10.15.1 instalado com Expo. RevenueCat foi escolhido para preparar a gestão de assinaturas da Google Play; nenhuma conta RevenueCat foi criada por este código e nenhuma contratação/cobrança foi ativada. O pacote exige nova build nativa para uso real. As builds antigas continuam usáveis enquanto a integração estiver desativada, pois o módulo é carregado sob demanda.

- Android nativo: `billing.native.ts` vincula o SDK ao UID Firebase antes de cada operação. Uma fila impede operações simultâneas com identidades diferentes. Mudanças de conta invalidam resultados pendentes. A leitura é novamente validada pelo controlador de acesso existente.
- Web e Expo Go não oferecem compras reais.
- Assinatura apenas Premium nesta primeira preparação. A IA e o Premium+ não são vendidos pelo módulo.
- Ofertas vêm do offering `premium`, com packages personalizados `premium_monthly` e `premium_yearly`. Só são aceitas recorrências P1M/P1Y sem períodos promocionais/experimentais; preços e moeda são exibidos exatamente como retornados pelo SDK. O cliente não fixa preços nem concede acesso pela conclusão visual de um pagamento.
- Acesso exige entitlement `premium` ativo e não vencido, com resposta verificada do RevenueCat. Resultados FAILED/NOT_REQUESTED são rejeitados pelo app, embora o SDK seja configurado em modo INFORMATIONAL. Entitlements sem vencimento são recusados: não há oferta vitalícia.
- Cancelar renovação não remove o período já pago. Pagamento pendente não concede acesso. Restaurar compras é ação explícita. Nova compra é recusada se já houver Premium ativo; troca de plano ainda não foi implementada.
- Produção não concede acesso a transações marcadas como sandbox; para testes de licença, usar build de desenvolvimento com Premium de teste desativado para exercitar a validação.
- Este controle protege a experiência local. Conteúdo privado/IA futuro precisa validar acesso também no servidor. Nunca confiar em flags recebidas do app para liberar recursos pagos remotos.

## Ativação futura — manter desativado até concluir tudo

1. Titular cria/verifica Play Console, cadastra o pacote existente e configura pagamentos. Definir preços, periodicidades e benefícios antes de ativar produtos.
2. Criar projeto/app Android no RevenueCat e conectar o Google Play conforme a documentação. Nunca colocar credencial de serviço Google, segredo RevenueCat ou chave Gemini em variável EXPO_PUBLIC.
3. Criar entitlement `premium`, offering `premium` e os packages acima, vinculados aos produtos/base plans correspondentes. Não criar produtos Premium+ nesta etapa.
4. Configurar no RevenueCat a restauração para **manter as compras na identidade original**; não permitir transferência silenciosa de compra entre UIDs Firebase. Verificar o comportamento real com duas contas antes do lançamento. O SDK local não substitui essa configuração do servidor.
5. Atualizar política pública, página de exclusão e Segurança dos dados para informar o RevenueCat, UID e dados de transação, retenção e contato. Preparar termos de assinatura e links na tela. A política publicada ainda descreve compras não ativas: **não ativar sem atualizá-la**.
6. Adicionar apenas a chave pública Android `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...`. A ativação separada exige `EXPO_PUBLIC_BILLING_ENABLED=true`. Ambas continuam ausentes/não ativadas no EAS de produção. Não usar chaves test_ de Test Store para a versão de produção.
7. Gerar nova build com o SDK. Para teste efetivo de compra, configurar perfil sem liberação automática de Premium e usar Google Play com testadores de licença. Não usar conta real para cobranças experimentais.
8. Validar: preço/recorrência, cancelar janela, pagamento pendente, compra aprovada, renovação, cancelamento preservando prazo, vencimento, revogação/reembolso, reinstalação sem perder dados, restauração, troca de UID e duas contas Google Play. Conferir retorno ao primeiro plano e expiração com app aberto.
9. Validar recebimento de mudanças de assinatura pelo servidor antes de proteger conteúdo remoto e revisar o fluxo de exclusão para incluir registros do novo prestador e retenções obrigatórias.

Pendências conhecidas: contas/produtos reais; termos e política atualizada; testes nativos; compra em sandbox de loja; transferência/alias configurados no RevenueCat; proteção remota de mídias; atualização reativa durante mudanças de assinatura com o app em primeiro plano depende da consulta manual/retorno ao app (não há listener de eventos do SDK nesta etapa).

## Verificações

`node --test scripts/billing-model.test.cjs scripts/billing-native.test.cjs scripts/subscription.test.cjs`

Os testes simulam o SDK e não comprovam recibo real, disponibilidade da loja ou configuração do painel. Testes reais ainda pendentes.

Fontes: https://www.revenuecat.com/docs/getting-started/installation/expo · https://www.revenuecat.com/docs/customers/identifying-customers · https://www.revenuecat.com/docs/getting-started/making-purchases · https://www.revenuecat.com/docs/getting-started/restoring-purchases
