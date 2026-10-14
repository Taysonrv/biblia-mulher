# Meus estudos e reflexões pessoais

Pacote da Bíblia Smart — 03/10/2026.

## Entrega

**Estudos → Meus estudos** reúne os livros e palavras que a pessoa salvou, além das reflexões que escreveu. Cada estudo de livro ou palavra oferece as ações **Salvar em Meus estudos** e **Escrever/Editar minha reflexão**.

Salvar o marcador e escrever a reflexão são ações independentes. Uma reflexão aparece na coleção mesmo sem marcador. Remover o marcador mantém a reflexão. Apagar a reflexão mantém o marcador, quando houver; se ambos ficarem vazios, o registro deixa a coleção. O editor exige confirmação antes de apagar uma reflexão ao salvar o campo vazio.

- Reflexões de até 2.000 caracteres, com contador e salvamento explícito.
- Busca na coleção por título, metadados, escrita original, número Strong e texto pessoal; ignora acentos e maiúsculas.
- Filtros **Todos/Livros/Palavras** e **Todos/Salvos/Com reflexões**.
- Ordenação pela atualização mais recente e paginação de 12 registros.
- Estados de carregamento, erro com tentativa novamente, coleção vazia e nenhum resultado.
- Retorno à coleção ou à busca integrada de origem após abrir o estudo e editar a reflexão.
- Temas claro/escuro, componentes e safe areas existentes; rotas auxiliares ocultas das quatro abas principais.

## Persistência e proteção dos dados

Os dados ficam no aparelho em uma chave própria (`@biblia-smart/personal-studies/v1`). O repositório valida os destinos do catálogo, rejeita registros inválidos/repetidos e limita o armazenamento a 512 KiB por linha. Gravações usam a mesma fila da restauração de backups. Um editor desatualizado não substitui uma reflexão alterada após sua abertura; o rascunho permanece no editor e a recarga explícita pede confirmação antes de substituí-lo.

Os registros armazenam apenas tipo, identificador, marcador, reflexão e revisão/data de atualização. O conteúdo editorial dos estudos continua no catálogo. Não há API, sincronização entre aparelhos, dependência nova ou ativação de conta neste pacote.

## Backup versão 3

**Perfil → Meus dados** agora informa estudos salvos e reflexões de estudos, incluindo-os na exportação e prévia de restauração.

- Exportações novas usam a versão 3 e incluem a coleção em `data.studies`.
- Backups das versões 1 e 2 continuam aceitos e preservam os estudos já existentes no aparelho.
- Marcadores são combinados; uma reflexão importada preenche apenas um campo ainda vazio.
- Quando os textos diferem, a reflexão atual é mantida e a prévia mostra os dois textos para consulta/cópia.
- Importações repetidas não duplicam estudos. Uma mudança local após a prévia exige selecionar o arquivo novamente.
- Restaurações com falha recuperam os dados anteriores. Registros de recuperação das versões antigas, com três ou quatro linhas, não apagam a nova coleção.

O arquivo de backup contém as reflexões pessoais. A pessoa escolhe onde guardá-lo. Para importar a versão 3 em outro aparelho, use a versão atualizada do app nesse aparelho; versões anteriores do app podem não reconhecer esse formato. O limite total de arquivo continua em 8 MB.

## Arquivos deste pacote

| Arquivo | Papel |
| --- | --- |
| `src/services/personal-studies-repository.ts` | Validação, armazenamento, revisões, busca e combinação de estudos pessoais. |
| `src/services/personal-studies.ts` | Instância de armazenamento integrada à fila local. |
| `src/services/data-coordinator.ts` | Inclui a coleção na restauração e aceita registros de recuperação antigos. |
| `src/services/backup-repository.ts` | Backup v3, contadores e conflitos de reflexões. |
| `src/hooks/use-personal-studies.ts` | Carregamento ao abrir a tela e atualização dos marcadores. |
| `src/components/study-personal-actions.tsx` | Ações e prévia da reflexão no estudo. |
| `src/app/my-studies.tsx` | Coleção, busca, filtros e paginação. |
| `src/app/study-note.tsx` | Editor e confirmações. |
| `src/app/studies.tsx` | Entrada da coleção. |
| `src/app/book-study.tsx` | Integra as ações e o retorno à coleção. |
| `src/app/word-study.tsx` | Integra as ações e o retorno à coleção. |
| `src/app/_layout.tsx` | Oculta as duas rotas auxiliares. |
| `src/app/my-data.tsx` | Contadores, textos e prévia dos conflitos de reflexão. |
| `scripts/personal-studies.test.cjs` | 14 testes novos de persistência, integridade e backup. |
| `scripts/backup.test.cjs` | Atualiza o cenário de versão incompatível para v4. |
| `scripts/sermons.test.cjs` | Atualiza a expectativa do formato exportado para v3. |
| `docs/PERSONAL-STUDIES.md` | Descrição e roteiro de teste. |

## Validação realizada

- `node --test scripts/*.test.cjs`: **183 testes aprovados**, sem falhas, incluindo os 14 novos.
- `npm run lint`: aprovado na versão final.
- `npx tsc --noEmit`: aprovado na versão final.
- `npx expo export --platform android --platform ios --output-dir .expo/personal-studies-validation`: bundles Android e iOS gerados com sucesso na versão final.
- Prévia web do Expo: coleção vazia; marcador e reflexão em Gênesis; persistência ao reabrir a prévia; reflexão de shalom sem marcador; busca pelo texto pessoal sem acentos; filtros e estado sem resultado; edição de reflexão existente; confirmação de campo vazio cancelada; retorno à coleção/busca; contadores em Meus dados.
- Aparência conferida em 390 × 844 no tema escuro e 320 × 740 no tema claro. Sem avisos/erros no console da última sessão de validação. Preferência de tema restaurada ao escuro.

Os bundles são uma verificação de compilação, não APK/AAB de distribuição. Teclado nativo, botão Voltar do Android, leitor de tela, safe areas físicas e seleção/compartilhamento de backup no aparelho ainda precisam de teste no Expo Go. O servidor temporário de validação foi encerrado. Não houve commit, push ou publicação.

## Roteiro no Expo Go

1. Abrir **Estudos → Meus estudos** e conferir o estado inicial.
2. Abrir Gênesis, tocar em **Salvar em Meus estudos**, escrever uma reflexão e salvar.
3. Retomar Gênesis pela coleção. Remover o marcador: a reflexão deve continuar na coleção. Salvar o marcador novamente.
4. Buscar `H7965`, abrir shalom e escrever uma reflexão sem salvar o marcador. Conferir a palavra na coleção e no filtro **Com reflexões**, mas não em **Salvos**.
5. Buscar uma palavra que só exista em sua reflexão. Conferir os filtros de livros/palavras e limpar os filtros.
6. Reabrir o app e confirmar a persistência de marcadores e reflexões.
7. Editar uma reflexão. Esvaziar o campo e tocar em Salvar: conferir a confirmação, cancelar e continuar escrevendo.
8. Em **Meus dados**, conferir contadores e exportar um backup. Importar em uma instalação atualizada de teste e conferir a prévia antes de restaurar. Conferir também um backup antigo, sem substituir as reflexões atuais.
9. Conferir claro/escuro, teclado e rolagem no Android; depois de carregar o app, testar as ações sem conexão.
