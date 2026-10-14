# Busca integrada dos estudos

Pacote de evolução da Bíblia Smart — 03/10/2026.

## O que foi entregue

A aba **Estudos** oferece o atalho **Buscar nos estudos**. A nova tela reúne a pesquisa nos 66 panoramas de livros e nos 13 estudos de palavras já disponíveis no app.

- Pesquisa por tema, autor, composição, mensagem principal, esboço, reflexão, sentidos e contexto das palavras.
- Aceita escrita original, transliteração, número Strong e a referência do exemplo de cada palavra.
- Ignora diferenças de acentos, maiúsculas e sinais vocálicos; aceita variantes do sigma grego e espaços em `João 1 : 1`.
- Todos os termos precisam aparecer no estudo, independentemente da ordem. Identidades exatas têm prioridade.
- Referências de capítulo e versículo são completas: `João 1:1` não encontra `João 1:16`.
- Filtros por livros/palavras, Antigo/Novo Testamento e hebraico/grego/aramaico.
- Cada resultado exibe um trecho do estudo e identifica a seção correspondente.
- Paginação de 12 resultados, limite de 120 caracteres por busca, estados iniciais e sem resultados, limpeza de busca/filtros.
- Ao abrir um resultado, o botão Voltar retorna à busca com o texto e os filtros mantidos durante a sessão de navegação.

A rota auxiliar não aparece na barra de abas. As entradas dos catálogos existentes continuam disponíveis. A tela usa os componentes, temas claro/escuro e tratamento de teclado/safe areas do app.

## Funcionamento local

O índice deriva do catálogo existente em memória. Não consulta uma API, não cria conta, não adiciona dependências nem altera armazenamento, backup ou conteúdo editorial. URLs e páginas externas das fontes não fazem parte do índice. Esta busca cobre **os estudos**; a busca da Bíblia continua responsável por todos os versículos. O texto da pesquisa não é persistido após reiniciar o aplicativo.

## Arquivos deste pacote

| Arquivo | Mudança |
| --- | --- |
| `src/services/study-search.ts` | Índice, normalização, filtros, relevância e paginação. |
| `src/app/study-search.tsx` | Nova tela de busca integrada. |
| `src/app/studies.tsx` | Atalho de entrada na aba Estudos. |
| `src/app/_layout.tsx` | Oculta a rota auxiliar da barra de abas. |
| `src/app/book-study.tsx` | Retorno à busca quando o panorama foi aberto por ela. |
| `src/app/word-study.tsx` | Retorno à busca quando a palavra foi aberta por ela. |
| `scripts/study-search.test.cjs` | Oito testes de busca, filtros, referências, paginação e integridade. |
| `docs/STUDY-SEARCH.md` | Descrição e roteiro de validação. |

## Verificações realizadas

- `node --test scripts/*.test.cjs`: **169 testes aprovados**, sem falhas, incluindo os 8 novos testes.
- `npm run lint`: aprovado.
- `npx tsc --noEmit`: aprovado após a geração automática das rotas pelo Expo.
- `npx expo export --platform android --platform ios --output-dir .expo/study-search-validation`: bundles Android e iOS gerados com sucesso na versão final.
- Expo iniciado localmente e fluxo conferido no navegador em 390 × 844 e 320 × 740: tema claro/escuro, busca, filtros, estado vazio, paginação, abertura de livro/palavra e retorno. Sem avisos ou erros no console da sessão de validação.
- Exemplos conferidos na interface: `paz`, `H7965`, `JOAO 1 : 1`, `Gênesis`, `ausência de guerra`, `λογοσ` e `שָׁלוֹם`.

Os bundles exportados validam a compilação; não são APK/AAB de distribuição e não substituem o teste no aparelho. Teclado nativo, botão Voltar do Android, leitor de tela e safe areas físicas aguardam validação no Expo Go. O servidor temporário utilizado na conferência foi encerrado.

## Roteiro no Expo Go

1. Iniciar o projeto normalmente e abrir **Estudos → Buscar nos estudos**.
2. Tocar no exemplo `paz`: conferir shalom e Zacarias, os trechos e a quantidade de resultados.
3. Escolher **Palavras → Hebraico**, pesquisar `H7965`, abrir shalom e voltar: o texto e os filtros devem permanecer.
4. Limpar busca/filtros e pesquisar `João 1:1`: conferir lógos e o contexto da referência exata.
5. Pesquisar `Gênesis`, abrir o panorama, conferir autoria/data/esboço e voltar à busca.
6. Pesquisar `ausência de guerra`: conferir o resultado de shalom na seção Observe o contexto.
7. Pesquisar `a`, avançar/voltar páginas e escolher **Livros → Novo**: conferir 27 resultados e reinício na primeira página.
8. Usar um termo inexistente e conferir a orientação para ampliar a busca. Limpar para retornar aos exemplos.
9. Conferir os temas claro/escuro, teclado, rolagem e botão Voltar em aparelho Android; testar a busca sem conexão depois de carregar o aplicativo.

Não houve commit, push, publicação ou mudança de configuração dos serviços de conta neste pacote.
