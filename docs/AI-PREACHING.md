# Pregações por IA — integração preparada, ainda não ativada

Escolha aprovada: geração por IA, com envio do esboço. Implementação usa OpenAI Responses API por backend Firebase Functions. Nenhuma chamada paga, chave cadastrada, mudança de plano ou publicação do backend ocorreu nesta etapa.

## Aplicativo

- Em um esboço salvo, escolher 15, 25 ou 40 minutos. Meta editorial de 120 palavras/minuto: 1.800, 3.000 ou 4.800 palavras. O tempo não é garantido: depende do pregador, pausas e leituras adicionais.
- Consentimento explícito antes do envio do tema, passagem, introdução, pontos, aplicação, conclusão, referências e perguntas. O campo separado de notas pessoais não é enviado; informações pessoais colocadas no corpo do esboço serão enviadas.
- Geração requer login e endpoint HTTPS em EXPO_PUBLIC_PREACHING_AI_URL. Essa variável é apenas a URL pública, nunca a chave OpenAI.
- Rascunho local curto continua disponível e não é anunciado como mensagem longa.
- Prévia editável informa palavras e estimativa a 100–140 palavras/minuto. Texto abaixo de 80% da meta é sinalizado; resposta de IA fora de 80–130% é rejeitada. A geração não é repetida automaticamente.
- Salvar cria outra mensagem. Original e notas ficam preservados. Os campos de corpo agora aceitam até 12.000 caracteres; os limites globais de armazenamento e sincronização continuam ativos. Mensagens maiores consomem mais espaço e podem atingir os limites mais cedo.

## Backend piloto

Arquivos em functions/. Node 22, Firebase Admin e Firebase Functions; OpenAI chamada por REST sem SDK no celular.

- Verifica Firebase ID token e revogação.
- Acesso somente aos UIDs em PREACHING_AI_ALLOWED_UIDS, definidos no servidor. Premium liberado para testes no cliente não autoriza uso de IA.
- Quotas transacionais: 2 tentativas por conta/dia UTC, 10 tentativas globais/dia UTC. Tentativas que falham após reservar a cota também contam, pois o provedor pode cobrar mesmo que não retorne um texto utilizável.
- Uma chamada ao provedor por tentativa, sem ferramentas, máximo de 20.000 tokens de saída e timeout. A API pode cobrar entrada e saída; isto não equivale a um teto financeiro exato.
- Resposta estruturada, verificação de tamanho/extensão, referências e títulos mantidos pelo servidor. Instruções editoriais pedem explicação contextual e exemplos hipotéticos, sem fabricar testemunhos, citações ou estatísticas. Isso não elimina erros: revisão humana é obrigatória.
- store:false no pedido OpenAI; isso não significa retenção zero de todos os registros do provedor. Ajustar a política de privacidade antes do uso público.
- CORS desligado: piloto destinado ao Android, não ao navegador. Testes web desta etapa verificam controles e modo indisponível, sem chamada real.
- Conteúdo do esboço, token e chave não são registrados nos logs pela função. Quotas guardam somente UID, data e contagem. Definir retenção e limpeza dessas contagens antes de produção.

## Ativação pendente

1. Responsável criar/configurar projeto de API na OpenAI e faturamento; escolher modelo que suporte Responses, JSON Schema e a saída longa, testando qualidade, latência e custo. Nenhum modelo é presumido: PREACHING_AI_MODEL é obrigatório.
2. Conferir custos e habilitar Firebase Blaze para implantação de Functions. O responsável deve aceitar termos e pagamentos. Não executar esta mudança implicitamente.
3. Instalar dependências em functions/ e configurar OPENAI_API_KEY com Firebase Secret Manager. Nunca colar a chave no chat, no .env do app ou em EXPO_PUBLIC_*.
4. Configurar PREACHING_AI_MODEL e PREACHING_AI_ALLOWED_UIDS no ambiente do backend. Implantar somente a função generatePreaching do codebase preaching; manter regras de sincronização existentes. Os caminhos aiGenerationQuotas continuam negados ao cliente pelas regras atuais.
5. Definir a URL retornada em EXPO_PUBLIC_PREACHING_AI_URL no app/ambiente EAS; recarregar ou gerar a build correspondente.
6. Testar com um esboço de teste autorizado: 15, 25 e 40 minutos; rejeição de usuário sem sessão/fora da lista, limite de cota, timeout, resposta incompleta, preservação do original, salvamento, backup e sincronização do texto longo. Conferir consumo na OpenAI.
7. Antes de liberar a todos: integrar assinatura verificada no backend, App Check, orçamento/monitoramento operacional, política de retenção/exclusão e revisão editorial de uma amostra. A allowlist piloto não é a integração Premium definitiva.

## Referências oficiais

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/reference/resources/responses/methods/create
- https://firebase.google.com/docs/functions/http-events
- https://firebase.google.com/docs/auth/admin/verify-id-tokens

## Planos definidos nesta etapa

- Gratuito: criação do esboço básico e acesso, edição, exportação e apresentação em tela cheia dos textos salvos.
- Premium: roteiro desenvolvido localmente, estudos e biblioteca existentes; não concede geração longa por IA.
- Premium+: inclui Premium e geração longa de 15/25/40 minutos, sujeita a franquia ainda não definida.
- O modelo de assinatura aceita tier premium-plus somente em um snapshot verificado. Snapshot legado sem tier continua Premium, nunca Premium+.
- Testes/simulação liberam a prévia de interface; o backend continua restrito à lista de UIDs do piloto. Essa lista não equivale a assinatura comercial. Integrar verificação Premium+ e franquia mensal no servidor antes de lançar.
- Preços e número de gerações mensais não foram configurados. Não foi ativada cobrança nem chamada paga de IA.
- Validação: 285 testes, TypeScript e lint passaram; página de planos conferida na prévia web. Compras reais e geração real não foram testadas.
