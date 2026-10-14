# Gratuito e Premium — Bíblia Smart

Divisão aprovada em 03/10/2026.

**Atualização de 05/10/2026:** durante os testes, Expo Go e APK preview agora iniciam com Premium liberado automaticamente e aviso permanente, sem cobrança. Reiniciar ou trocar de conta mantém o acesso desta versão. O perfil production mantém as regras comerciais. Consulte [PREMIUM-TESTING.md](./PREMIUM-TESTING.md) para configuração e validação; os trechos abaixo descrevem a divisão comercial e a simulação manual anterior.

## Gratuito

Bíblia completa offline, busca de versículos, favoritos, anotações, histórico, planos de leitura, agenda e lembretes, aparência e preferências de leitura, backup e restauração. Cadastro/login continuam opcionais e independentes da assinatura.

Os registros pessoais permanecem acessíveis: a coleção Meus estudos abre a reflexão para leitura/edição no gratuito; os esboços existentes podem ser lidos, editados, compartilhados e excluídos. Não há apagamento ou migração de dados por mudança de plano. Marcadores de estudos continuam no backup e na coleção.

## Premium

Panoramas dos 66 livros, palavras em hebraico/grego/aramaico, busca no catálogo de estudos, criação de novos esboços ministeriais, duplicação de mensagens e modo de apresentação. A agenda e o acesso aos esboços existentes permanecem gratuitos. O hub Apoio ministerial é aberto para alcançar esses recursos gratuitos e conhecer o Premium.

As rotas do catálogo, criação e apresentação têm barreiras de acesso antes de montar o conteúdo. `/sermon-outline` sem ID exige Premium; com ID lê exclusivamente o repositório local e não gera um esboço. IDs inexistentes exibem erro, sem conceder acesso à geração. Navegação, links diretos, parâmetros de retorno e backup não ativam assinatura.

## Estado desta entrega

A tela Gratuito e Premium compara os benefícios e informa que a contratação está em preparação. Não há cobrança, checkout, preço anunciado, botão falso de compra/restauração nem SDK novo. O gerador continua local/determinístico; nenhuma IA paga foi ativada.

Em desenvolvimento (`__DEV__`, incluindo Expo Go), a tela permite simular Premium. A faixa global identifica a simulação sem cobrança. A simulação é apenas em memória, inicia desativada, termina ao reiniciar/trocar conta e não está disponível em builds de produção. Ela não é exportada em backups e não representa uma assinatura.

## Arquitetura e integração futura

- `subscription-access.ts`: matriz de rotas, benefícios, contrato de assinatura verificada e controlador testável.
- `subscription.ts`: adaptador atualmente desativado; nunca concede acesso real.
- `SubscriptionProvider`: aplica o estado, invalida acesso ao trocar de conta, verifica expiração e atualiza ao retornar ao app.
- `PremiumBoundary`/`withPremiumAccess`: impedem montar telas pagas antes do acesso; `FeatureLink` marca automaticamente links do catálogo e das ferramentas Premium.

Para ativar contratação real, implementar produtos e restauração das lojas e validar compras/recibos em um serviço confiável. O adaptador deverá consultar esse serviço usando a identidade autenticada, nunca aceitar uma assinatura enviada pelo cliente. APIs Premium também deverão validar o acesso no servidor. Login, e-mail verificado, parâmetros, dados locais e backup não são prova de compra. `VerifiedSubscription` é um contrato para esse adaptador confiável; a validação comercial ainda não foi implementada.

O controlador verifica conta, estado ativo e validade finita/futura; ignora respostas antigas; falhas/expiração/revogação negam Premium e mantêm o gratuito. A integração futura precisa tratar renovação, cancelamento, reembolso, eventos das lojas, gestão/restauração de compras, política de verificação offline e atendimento antes da publicação comercial.

## Validação manual

1. Iniciar o app: modo gratuito; quatro tabs sem rota de planos na barra.
2. Abrir Bíblia, planos, agenda, favoritos, anotações, Meus dados e registros existentes: disponíveis.
3. Abrir catálogo de estudos, busca ou preparação: mostrar a apresentação Premium, inclusive por link direto.
4. Em Meus estudos, abrir uma reflexão no gratuito e salvar: voltar à coleção.
5. Abrir esboço salvo: ler/editar/compartilhar liberados; apresentar/duplicar requerem Premium.
6. Abrir Gratuito e Premium e simular: faixa visível, catálogos/geração/apresentação liberados.
7. Encerrar simulação: barreiras reaparecem, registros preservados. Reiniciar: gratuito.
8. Exportar uma versão de produção: simulação ausente, nenhuma assinatura real concedida.

Referências Expo usadas: [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [índice de documentação](https://docs.expo.dev/llms.txt), [proteção de rotas](https://docs.expo.dev/router/advanced/protected/). As barreiras locais deste pacote são de experiência de uso; serviços remotos deverão autorizar acesso independentemente do cliente.

## Arquivos deste pacote

Novos: `src/services/subscription-access.ts`, `src/services/subscription.ts`, `src/components/subscription-provider.tsx`, `src/components/premium-access.tsx`, `src/components/subscription-card.tsx`, `src/app/subscription.tsx`, `scripts/subscription.test.cjs` e esta documentação.

Atualizados: `src/components/modern-ui.tsx`, `src/components/sermon-management.tsx`, `src/app/_layout.tsx`, `src/app/index.tsx`, `src/app/profile.tsx`, `src/app/studies.tsx`, `src/app/support.tsx`, `src/app/sermon-outline.tsx`, `src/app/my-studies.tsx`, `src/app/study-note.tsx`, `src/app/book-studies.tsx`, `src/app/book-study.tsx`, `src/app/word-studies.tsx`, `src/app/word-study.tsx`, `src/app/study-search.tsx`, `src/app/sermon-builder.tsx` e `src/app/sermon-presenter.tsx`.

## Resultado das verificações

- 194 testes automatizados passaram, incluindo 11 cenários novos de acesso, expiração, revogação, troca de conta, concorrência e simulação indisponível em produção.
- TypeScript e lint concluíram sem erros ou avisos.
- Exportação dos pacotes JavaScript/assets Android e iOS concluída. Isso não substitui teste em aparelho nem gera APK/AAB assinado.
- Prévia web em largura de celular: planos, bloqueio por link direto, abertura de reflexões e esboços existentes no gratuito, simulação identificada, estudo de Gênesis liberado, geração local de Salmos 23 e retorno ao gratuito conferidos. Não foi contratado serviço, criado pagamento ou publicado o app.

Para testar no terminal PowerShell do VS Code:

```powershell
cd "D:\Tayson\App Biblia\biblia-mulher"
npx expo start --clear
```

Abra o QR Code no Expo Go com celular/computador na mesma rede. Em Perfil → Gratuito e Premium, use Simular Premium para testar; use Encerrar simulação Premium para voltar ao gratuito. A prévia no navegador também pode ser aberta com `w` no terminal do Expo.
