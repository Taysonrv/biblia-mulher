# Bíblia Smart — mensagens salvas

Pacote implementado em 01/10/2026. Acesse **Início → Apoio ministerial → Meus esboços**, ou entre pelo Apoio ministerial no Perfil.

Evoluções posteriores: [modo de apresentação](SERMON-PRESENTATION.md) e [duplicação/exclusão de mensagens](SERMON-MANAGEMENT.md).

## Recursos

- Criação local do esboço existente, seguida de **Salvar esboço**. Depois de salvar, a tela abre a mensagem pelo identificador persistido e oferece edição; o botão de criar um registro não permanece disponível para aquela mensagem salva.
- Coleção offline com busca em tema, passagem, conteúdo e notas pessoais, ignorando acentos e maiúsculas. Ordenação pela última edição e páginas de 10 itens.
- Editor com seções recolhíveis: tema, texto-base, introdução, três pontos, aplicação, conclusão, referências, perguntas e notas pessoais. As alterações só são gravadas pelos botões de salvar; navegar para fora do editor não salva um rascunho automaticamente.
- Conteúdo salvo reaparece após reiniciar o app. Falhas de gravação preservam os registros anteriores; uma edição com versão antiga não pode sobrescrever outra mais recente.
- Compartilhamento de texto pelo menu nativo no Android/iOS. **Ver texto para copiar** também oferece conteúdo selecionável. No navegador, compartilhar apresenta o texto selecionável, sem abrir um serviço externo.
- Notas pessoais ficam fora do texto compartilhável por padrão. O usuário pode escolher **Incluir notas no compartilhamento**. O backup inclui essas notas, como informado na tela Meus dados.
- Mesmos temas claro/escuro e componentes de safe area existentes; as duas rotas novas permanecem ocultas na barra das quatro tabs.

Não há novas dependências ou configuração de servidor. O gerador continua determinístico, com a interface `SermonProvider` preparada para uma integração futura; não há credenciais de IA no app. Mensagens desconhecidas continuam recebendo um roteiro de estudo, sem inventar uma interpretação da passagem.

## Persistência e limites

Chave independente `@biblia-smart/sermons/v1`, com até 100 esboços e 1.500.000 bytes UTF-8 para a coleção. A validação verifica os limites antes de gravar, incluindo conteúdo em caracteres multibyte, para manter a linha de armazenamento local limitada. Duplicação e exclusão foram acrescentadas no [pacote de organização](SERMON-MANAGEMENT.md).

Tema até 300 caracteres; texto-base até 600; textos de cada seção até 4.000; título de ponto até 200; notas pessoais até 2.000; de 1 a 12 referências e perguntas. Não há truncamento silencioso de uma gravação inválida. Identificadores, datas, duplicidades e versão do armazenamento também são verificados. Campos desconhecidos não entram no registro exportado.

## Backup e compatibilidade

- Novos arquivos usam versão **2**, com a coleção completa de esboços e notas. Versão 1 continua importável; um arquivo antigo não remove mensagens atuais.
- Backups novos exigem uma versão do app que suporte o formato 2. O formato evita que uma versão antiga do app importe o arquivo descartando os esboços silenciosamente.
- Mesmo identificador com conteúdo diferente mantém a mensagem local e informa o conflito na prévia. Mensagens com conteúdo idêntico não são duplicadas, inclusive quando os identificadores diferem.
- Prévia desatualizada após uma edição é rejeitada; combinações que ultrapassam o limite da coleção também são rejeitadas antes de restaurar.
- A fila de dados e o registro de recuperação incluem a coleção. Um registro de recuperação antigo, com apenas leitura, planos e agenda, ainda é recuperável sem apagar esboços.

## Arquivos deste pacote

| Arquivo | Alteração |
| --- | --- |
| `src/app/support.tsx` | Entrada para a coleção de mensagens. |
| `src/app/sermons.tsx` | Coleção, busca, ordenação e paginação. |
| `src/app/sermon-outline.tsx` | Salvar, retomar, editar e compartilhar o conteúdo persistido. |
| `src/app/sermon-editor.tsx` | Edição por seções com notas pessoais. |
| `src/app/_layout.tsx` | Registro das duas novas rotas auxiliares ocultas. |
| `src/app/my-data.tsx` | Contagens, prévia de acréscimos e conflitos de esboços. |
| `src/hooks/use-saved-sermons.ts` | Carregamento ao focar, nova tentativa e descarte de respostas antigas. |
| `src/services/sermon-repository.ts` | Modelo, validação, gravação serializada, busca e texto de compartilhamento. |
| `src/services/saved-sermons.ts` | Armazenamento real integrado à fila global de dados. |
| `src/services/sermon-sharing.native.ts` | Menu nativo de compartilhamento. |
| `src/services/sermon-sharing.ts` | Texto selecionável para a prévia web. |
| `src/services/data-coordinator.ts` | Inclusão no snapshot/recuperação e compatibilidade com registros antigos. |
| `src/services/backup-repository.ts` | Formato 2, importação do formato 1, combinação e validação dos esboços. |
| `scripts/sermons.test.cjs` | 19 novos testes de geração, persistência, falhas, limites, backup e compartilhamento. |
| `scripts/backup.test.cjs` | Atualização da versão incompatível testada para 3; formatos 1/2 são suportados agora. |
| `docs/BACKUP-RESTORE.md` | Atualização das regras e cobertura do backup. |
| `docs/SAVED-SERMONS.md` | Este relatório e roteiro. |

## Verificações

- `node --test scripts/*.test.cjs`: **145 testes aprovados**, incluindo 19 novos.
- `npx tsc --noEmit` e `npm run lint`: aprovados, sem erros ou avisos de lint.
- `npx expo export --platform android --platform ios --output-dir .expo/sermon-validation`: ambos os bundles gerados. Não equivale a execução em aparelho físico.
- Fluxo visual no navegador: coleção vazia, tema obrigatório, criar/salvar, editar tema e introdução, notas, segunda edição da conclusão, reinício, buscas sem acentos e por nota pessoal, busca sem resultados e limpeza, retomada e preparação de outra mensagem sem alterar a mensagem salva.
- Texto compartilhável verificado com notas excluídas e incluídas explicitamente. Os adaptadores nativos foram verificados com módulos simulados; o menu do aparelho precisa ser conferido no Expo Go.
- Tela Meus dados inclui a contagem de esboços e informa as notas pessoais. A exportação exibiu a solicitação de download na prévia embutida; a captura automática desse download não foi confirmada. A serialização, o conteúdo e a restauração dos backups foram verificados nos testes.
- Temas escuro e claro, telas de 390 × 844 e 320 × 740, sem transbordamento horizontal. Console final sem erros/avisos. Uma mensagem de exemplo ficou salva apenas no armazenamento da prévia web, sem modificar os dados do aparelho físico.

## Validar no Expo Go

1. Execute `npm start` na pasta do app. Abra **Apoio ministerial → Preparar pregação**.
2. Informe um tema, crie o esboço e toque em **Salvar esboço**.
3. Abra **Editar minha mensagem**, adapte uma seção e acrescente uma nota pessoal. Salve.
4. Em **Meus esboços**, procure uma palavra da nota e retome a mensagem. Reinicie o app e confira a persistência.
5. Toque em **Ver texto para copiar**: a nota deve ficar ausente. Ative sua inclusão e confira o texto novamente.
6. Use **Compartilhar esboço** para conferir o menu do sistema. Cancelar não altera a mensagem.
7. Em **Perfil → Meus dados**, exporte um backup e guarde o arquivo. Selecione-o novamente; sem alterações posteriores, a prévia deve mostrar zero novos esboços. Restaurações repetidas não devem criar duplicatas.
8. Repita nos temas claro e escuro. A execução física no Android/iOS permanece pendente desta validação.

Documentação consultada: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [navegação do Expo Router](https://docs.expo.dev/router/basics/navigation/), [TextInput React Native 0.86](https://reactnative.dev/docs/0.86/textinput) e [Share React Native 0.86](https://reactnative.dev/docs/0.86/share).
