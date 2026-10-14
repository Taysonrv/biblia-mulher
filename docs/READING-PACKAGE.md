# Bíblia Smart — Bíblia completa e continuidade da leitura

## Entrega

- 66 livros, 1.189 capítulos e 31.105 versículos incluídos no app, sem consulta a uma API durante a leitura.
- Fonte: edição Almeida 1911, com grafia histórica. Salmos 23 conserva o texto atualizado que já estava disponível. Procedência e transformações em src/data/BIBLE-SOURCE.md.
- Home com “Começar leitura” antes da primeira visita e “Continuar leitura” depois dela.
- Histórico local dos 100 capítulos mais recentes, sem repetição. Uma visita não indica conclusão do capítulo.
- Troca rápida de livro/capítulo, busca sem acentos e filtros de testamento.
- Navegação consecutiva, incluindo a passagem entre livros. Primeiro/último capítulo respeitam os limites da Bíblia.
- Referências inválidas recebem uma mensagem de orientação e não são salvas no histórico.
- As quatro abas continuam Início, Bíblia, Estudos e Perfil. Histórico e seletor são telas auxiliares.
- Favoritos e anotações mantêm os dados existentes, em armazenamento separado do histórico.
- Nenhuma nova dependência, chave de API, assinatura, conta ou sincronização.

## Verificações realizadas

- 38 testes aprovados: integridade do texto completo, navegação de todos os capítulos, persistência e ordem do histórico, limite de 100 itens, repetição de visitas, falhas de armazenamento, preservação de dados corrompidos, favoritos/anotações em capítulos novos e regressões da agenda e estudos.
- TypeScript: npx tsc --noEmit, aprovado. O cache de tipos de rotas foi regenerado pelo gerador do SDK instalado após encerrar a prévia.
- Lint: npm run lint, aprovado sem avisos.
- Exportação dos pacotes JavaScript/Hermes Android e iOS: npx expo export --platform android --platform ios --output-dir .expo/continuity-validation, aprovada. Isso não substitui um teste no aparelho nem constitui um instalador nativo.
- Prévia web em 390 × 844 e 320 × 740: temas claro/escuro, seleção de Gênesis 50, passagem para Êxodo 1, busca por “joao”, leitura de João 4, retomada pela Home e histórico persistente após recarregar. Sem erros no console da prévia.
- Importação reproduzida com o script incluído: resultado idêntico ao JSON entregue, byte a byte.

## Validação no Expo Go

1. Abra ou recarregue o projeto no Expo Go pelo fluxo habitual.
2. Entre em Bíblia, escolha Gênesis 50 e avance para Êxodo 1.
3. Use “Trocar livro ou capítulo” para abrir João 4.
4. Volte para Início e use “Continuar leitura”. Confira também “Ver histórico de leitura”.
5. Favorite um versículo e salve uma anotação. Reabra o app para confirmar a persistência.
6. Depois que o app estiver carregado, teste a leitura sem internet e confira os temas claro/escuro no aparelho.

A validação nativa no Android/iOS e o teste em modo avião no aparelho ficam para o usuário. A Bíblia está incluída localmente nos pacotes exportados. Não foi realizado push.

## Arquivos alterados ou criados neste pacote

- docs/READING-PACKAGE.md
- scripts/bible-text.test.cjs
- scripts/full-bible.test.cjs
- scripts/import-almeida.cjs
- scripts/journey.test.cjs
- scripts/reading.test.cjs
- scripts/studies.test.cjs
- src/app/_layout.tsx
- src/app/bible.tsx
- src/app/book-study.tsx
- src/app/book.tsx
- src/app/chapter.tsx
- src/app/index.tsx
- src/app/profile.tsx
- src/app/reading-history.tsx
- src/app/reading-picker.tsx
- src/components/chapter-navigation.tsx
- src/components/reading-resume.tsx
- src/data/BIBLE-SOURCE.md
- src/data/STUDY-SOURCES.md
- src/data/almeida-1911.json
- src/data/bible-catalog.json
- src/data/bible-catalog.ts
- src/data/bible-text.ts
- src/hooks/use-reading-journey.ts
- src/services/reading-journey-repository.ts
- src/services/reading-journey.ts
