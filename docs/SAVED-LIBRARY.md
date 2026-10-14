# Bíblia Smart — organização de favoritos e anotações

Pacote implementado em 01/10/2026. Funciona offline, usando a coleção local existente.

## O que mudou

- Busca por palavras do versículo, referência bíblica e conteúdo da anotação, nas duas coleções. Ignora maiúsculas e acentos e procura palavras completas. A grafia histórica da Almeida 1911 é preservada: não há modernização automática da busca.
- Referências completas, abreviadas, capítulos e intervalos, como `João 3:16`, `Jo 3` e `1 Jo 4:7-8`. Referências inválidas exibem uma orientação; palavras acompanhadas de números nas reflexões continuam pesquisáveis.
- Painel recolhível de filtros por testamento e livro, contendo apenas livros com itens salvos na coleção correspondente.
- Ordenação pela sequência bíblica ou pela ordem dos registros armazenados. “Ordem salva” não representa uma data de criação: os registros atuais não possuem esse campo.
- Limpeza de busca e filtros, contagem de resultados, mensagens distintas para coleção vazia e busca sem resultados e nova tentativa quando o carregamento falha.
- Paginação de 20 itens, com retorno à primeira página ao mudar a busca ou os filtros. Não altera a coleção armazenada.
- Anotações em destaque, indicação de anotação nos favoritos, abertura direta do versículo e acesso ao editor existente.
- Telas continuam usando os componentes de tema, safe areas e navegação existentes. As quatro tabs e as rotas auxiliares foram preservadas.

Não há novas dependências, chaves, chamadas de IA, alteração do formato de armazenamento ou migração de dados. A autenticação continua opcional e aguarda configuração; este pacote não depende de conta ou servidor.

## Arquivos deste pacote

1. `src/components/reading-library.tsx` — interface das duas coleções.
2. `src/services/saved-library.ts` — busca, filtros, ordenação e paginação sem mutação dos registros.
3. `src/services/bible-search.ts` — parser de referências compartilhado, preservando o comportamento da busca geral da Bíblia.
4. `src/components/ui-controls.tsx` — limite opcional de caracteres no campo de busca reutilizável.
5. `src/hooks/use-reading.ts` — nova tentativa de carregamento e proteção contra respostas de carregamento antigas.
6. `scripts/saved-library.test.cjs` — 13 novos testes.
7. `docs/SAVED-LIBRARY.md` — documentação e roteiro de validação.

## Verificações concluídas

- `node --test scripts/*.test.cjs`: 126 testes aprovados, incluindo os 13 novos. Cobrem buscas, filtros combinados, ordenação numérica, referências, ausência de mutação, paginação e recuperação de carregamento.
- `npx tsc --noEmit`: aprovado.
- `npm run lint`: aprovado, sem erros ou avisos.
- `npx expo export --platform android --platform ios --output-dir .expo/library-validation`: ambos os bundles gerados.
- `git diff --check`: sem erros de whitespace. O Git emitiu apenas avisos de conversão LF/CRLF em arquivos já presentes no working tree.
- Conferência no navegador local: favoritos e anotações, filtros por testamento e livro, ordem salva, busca abreviada, busca sem acentos no conteúdo da reflexão, referência inválida, abertura de versículo e editor, manutenção da busca ao retornar do editor e persistência da coleção após recarregar.
- Temas claro e escuro, larguras de 320 e 390 pixels; controles sem transbordamento horizontal. Console sem erros ou avisos na conferência final.

A paginação foi validada por testes com 50 registros; a conferência visual usou os itens já existentes, sem criar uma coleção artificial. Os bundles confirmam compilação, não execução em aparelho físico. Android e iOS físicos continuam pendentes de validação.

## Validar no Expo Go

1. Na pasta do app, execute `npm start` e abra pelo Expo Go.
2. Em **Perfil → Meus favoritos**, use um versículo salvo ou favorite um durante sua leitura.
3. Busque sua referência abreviada ou uma palavra do texto/anotação. Abra **Filtros e organização** para combinar testamento, livro e ordem.
4. Use uma palavra sem resultado e depois **Limpar busca e filtros**. A coleção deve reaparecer intacta.
5. Abra o versículo e confira o destaque; retorne à coleção.
6. Em **Perfil → Minhas anotações**, busque uma palavra da reflexão e abra **Editar reflexão**. Volte sem editar para conferir a manutenção da busca.
7. Repita nos temas claro e escuro e, quando tiver mais de 20 resultados, confira a troca de páginas.

Referências técnicas consultadas: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [índice oficial Expo](https://docs.expo.dev/llms.txt) e [TextInput do React Native 0.86](https://reactnative.dev/docs/0.86/textinput).
