# Pacote de evolução — favoritos e jornada de conteúdos

Mentorias e Pregações agora têm:

- Favoritos nos detalhes do conteúdo.
- Conclusão manual de cada parte e opção de desfazer.
- Barra de progresso e indicação de aulas concluídas.
- Botão Começar/Continuar conteúdo que abre a última aula pendente visitada ou a próxima pendente na ordem do catálogo.
- Até três atalhos de continuidade na biblioteca.
- Filtros Catálogo, Favoritos, Em andamento e Concluídos, combináveis com busca e formato.
- Mensagens de carregamento, estados vazios e falha ao salvar, sem sobrescrever registros corrompidos.

## Limites desta versão

A retomada abre a **aula** e agora oferece reprodução a partir do ponto salvo, conforme [PLAYBACK-RESUME.md](./PLAYBACK-RESUME.md). A conclusão não é automática: a pessoa confirma que acompanhou a parte. Abrir uma parte registra início, mesmo sem pressionar reproduzir.

Registros de conteúdos publicados usam o armazenamento local já instalado, separados por conta (e convidado). A interface e as alterações exigem Premium, mas o fim da assinatura não apaga os registros persistentes. Ainda não existe sincronização com servidor. A simulação usa memória e suas prévias/favoritos/progresso terminam ao sair da simulação, trocar de conta ou reiniciar.

Esses novos registros **ainda não entram no backup existente**. Não contêm arquivos, endereços de mídia, credenciais nem cópias do conteúdo. Só conteúdos presentes no catálogo atual aparecem nos filtros/atalhos; aulas removidas não entram na contagem, e aulas novas voltam a exigir conclusão.

Não houve nova dependência, cobrança, publicação ou upload. A hospedagem e a autorização Premium no servidor continuam pendentes, conforme [PREMIUM-CONTENT.md](./PREMIUM-CONTENT.md).

## Como validar no Expo Go

```powershell
cd "D:\Tayson\App Biblia\biblia-mulher"
npx expo start --clear
```

1. Perfil → Gratuito e Premium → Simular Premium para testar.
2. Início → Mentorias e Pregações → Estúdio de testes.
3. Monte uma mentoria com duas partes de vídeo/áudio locais e abra a prévia.
4. Salve nos favoritos, abra a primeira parte e marque como concluída.
5. Volte aos detalhes: confira 1 de 2 partes e Continuar conteúdo para a segunda.
6. Na biblioteca, confira o atalho de continuidade; no catálogo, os filtros pessoais.
7. Conclua a segunda parte: confira 2 de 2 e o filtro Concluídos; desfaça uma conclusão para testar a volta ao progresso parcial.
8. Encerre a simulação: confirme o bloqueio Premium e ausência das prévias na próxima sessão.

## Arquivos deste pacote

Novos:

- `src/services/content-journey-model.ts`: validação, armazenamento, operações em fila, resumos e seleção de continuidade.
- `src/components/content-journey-provider.tsx`: estado compartilhado, isolamento por conta e armazenamento temporário de simulação.
- `src/components/content-journey.tsx`: favoritos, progresso, continuidade e conclusão da parte.
- `scripts/content-journey.test.cjs`: oito novos testes.
- `docs/CONTENT-JOURNEY.md`: este guia.

Alterados:

- `src/app/_layout.tsx`: inclusão do provider, sem novas abas.
- `src/app/premium-library.tsx`: atalhos de continuidade.
- `src/app/premium-content.tsx`: progresso, favoritos e partes concluídas.
- `src/app/content-watch.tsx`: registrar abertura e conclusão da parte.
- `src/components/content-catalog.tsx`: filtros pessoais e contadores.

## Validação

- TypeScript e lint, sem erros ou avisos.
- Suíte completa: 217 testes passaram. Os oito novos cobrem persistência, atualizações concorrentes, desfazer conclusão, aulas alteradas, filtros/continuidade, registros inválidos, falhas ao salvar e revogação de acesso durante leitura assíncrona.
- Exportação de pacotes Android e iOS concluída. Isso não equivale a gerar APK/IPA nem testar em aparelho.
- Prévia web em viewport móvel: favorito, duas partes em áudio, conclusão parcial, retomada da segunda parte pelos detalhes e pela biblioteca, filtro Favoritos e passagem para Concluídos.
- A validação física no Expo Go ainda deve ser feita pelo usuário.
