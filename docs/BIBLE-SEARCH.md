# Busca de versículos — Bíblia Smart

Pacote implementado em 30/09/2026, sobre a Bíblia Almeida 1911 já disponível offline.

## Recursos

- Entrada **Bíblia → Buscar versículos** e atalho **Buscar neste livro** em cada livro.
- Busca por todas as palavras, em qualquer ordem, ou por frase exata.
- Palavras inteiras: `fé` encontra `fé`, sem incluir `festa` apenas por conter essas letras.
- A busca textual ignora acentos, maiúsculas e separadores de pontuação. Preserva o texto original nos resultados; não moderniza nem aproxima palavras da grafia histórica.
- Referências completas ou abreviadas: `João 3:16`, `Sl 23:1`, `Gn. 1.1`, `1Co 13:4`, capítulos como `Romanos 8` e intervalos como `João 3:16-18`.
- `Jó 3:16` aponta para Jó; a abreviação `Jo 3:16` aponta para João. Referências numéricas inexistentes mostram uma mensagem de correção.
- Filtros por livro e testamento aplicados também às referências diretas.
- Resultados na ordem dos livros, capítulos e versículos, em páginas de 20. Todos os resultados ficam acessíveis pela paginação.
- Ao abrir um resultado, a leitura destaca o versículo e rola diretamente até ele, inclusive em capítulos longos.
- O botão **Voltar** da leitura retorna à pesquisa; os resultados, o modo e os filtros são preservados enquanto essa tela permanece montada. Ao sair da busca, retorna ao livro de origem ou à Bíblia.
- Cancelamento da busca; mudanças no campo/filtros invalidam resultados anteriores. A varredura libera a execução periodicamente para manter a interface responsiva.
- Temas claro e escuro, área segura e quatro abas principais preservados. A rota auxiliar permanece oculta na barra.

Não há nova dependência, API, chave ou armazenamento de buscas. Favoritos, anotações e planos mantêm suas próprias regras de persistência. Abrir um resultado registra a visita ao capítulo e não conclui uma etapa do plano.

## Arquivos deste pacote

| Arquivo | Alteração |
| --- | --- |
| `src/services/bible-search.ts` | Busca local, referências, validação, filtros, cancelamento e paginação. |
| `src/hooks/use-bible-search.ts` | Estado da busca e descarte de consultas antigas ou interrompidas ao sair da tela. |
| `src/app/reading-search.tsx` | Tela de busca e acesso aos resultados. |
| `src/app/bible.tsx` | Entrada para a busca em toda a Bíblia. |
| `src/app/book.tsx` | Atalho para buscar no livro aberto. |
| `src/app/chapter.tsx` | Validação, destaque e posicionamento do versículo; retorno à busca. |
| `src/app/_layout.tsx` | Registro da rota auxiliar oculta. |
| `src/components/ui-controls.tsx` | Envio da busca pelo teclado. |
| `src/components/ministerial-screen.tsx` | Referência de rolagem e destino explícito opcional para o botão de voltar. |
| `scripts/bible-search.test.cjs` | 11 testes com o conteúdo offline real. |
| `docs/BIBLE-SEARCH.md` | Recursos, arquivos e roteiro de validação. |

## Verificações

- `node --test scripts/*.test.cjs`: 62 testes aprovados, incluindo 11 novos testes da busca e os testes anteriores de Bíblia, histórico, planos, favoritos, anotações, estudos e agenda.
- `npm run lint`: aprovado, sem erros ou avisos de lint.
- `npx tsc --noEmit`: aprovado.
- Interface web testada em 390 × 844 e 320 × 740, nos dois temas, sem avisos/erros no console do navegador.
- Navegação, filtros, frase exata, paginação, resultado vazio e referência inválida verificados pela interface. João 3:16 e Salmos 119:176 abriram no versículo selecionado; o retorno preservou a pesquisa, inclusive quando iniciada dentro de João.
- A exportação local Android/iOS usa `.expo/search-validation`. São bundles JavaScript/Hermes para conferir a compatibilidade de compilação; a validação física no Expo Go fica para o usuário.

## Validar no Expo Go

1. Inicie o projeto normalmente e abra **Bíblia → Buscar versículos**.
2. Busque `fé`, avance uma página e confirme que os resultados mudam.
3. Selecione **Frase exata**, filtre por João e busque `Deus amou o mundo`. Abra João 3:16; confirme o destaque e o posicionamento. Volte e confira que o resultado permanece.
4. Remova os filtros e busque `Sl 119:176`. Abra o resultado e confira que a leitura chega ao versículo 176.
5. Busque `João 3:999` para ver a orientação de correção e depois uma referência válida para confirmar a recuperação.
6. Abra um livro pela Bíblia e use **Buscar neste livro**. Confira o filtro inicial e o retorno ao livro.
7. Repita nos temas claro e escuro; confira favoritos/anotações e o plano ativo.

As abas auxiliares continuam sendo telas ocultas de um navegador de abas. O retorno à busca usa seu destino explícito porque o histórico das abas não funciona como uma pilha de telas. O comportamento dos botões de voltar das demais telas foi preservado.
