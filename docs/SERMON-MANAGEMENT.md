# Bíblia Smart — organização dos esboços

Pacote implementado em 01/10/2026. Caminho: **Apoio ministerial → Meus esboços → Retomar esboço → Organizar mensagem**. O acesso fica junto aos controles da mensagem, antes do conteúdo de leitura, e começa recolhido.

## Duplicar uma mensagem

- **Duplicar mensagem** abre um formulário com sugestão de título. **Criar cópia e editar** salva a cópia e abre seu editor; cancelar não cria registro.
- A cópia leva texto-base, introdução, três pontos, aplicação, conclusão, referências, perguntas e notas pessoais. Recebe identificador e datas próprios; editar a cópia preserva a mensagem original.
- O título deve ter de 1 a 300 caracteres e ser diferente dos títulos já salvos, considerando espaços nas extremidades, maiúsculas/minúsculas e equivalências Unicode. Isso identifica as cópias no backup, que já evita restaurar registros de conteúdo idêntico.
- A sugestão recebe um número quando já existe. Apenas a sugestão de título pode ser abreviada para caber no campo; o conteúdo original não é truncado. Gravações inválidas são rejeitadas.
- Com 100 mensagens, criar cópias fica indisponível. A mensagem existente continua acessível e pode ser excluída para liberar espaço, após confirmação.

## Excluir uma mensagem

- **Excluir mensagem** abre uma confirmação que mostra o tema, explica a remoção do esboço e das notas e oferece o atalho **Guardar um backup antes**.
- **Manter mensagem** cancela. Apenas **Confirmar exclusão da mensagem** inicia a remoção; ao concluir, a tela retorna à coleção atualizada.
- A exclusão é definitiva no armazenamento do aparelho. Arquivos de backup previamente exportados não são alterados. Selecionar e restaurar um backup que ainda contém a mensagem pode adicioná-la novamente, como informado na prévia existente.
- Cópia e exclusão conferem a revisão da mensagem: uma edição mais recente obriga a reabrir o esboço antes de prosseguir. Um editor antigo não recria uma mensagem excluída.
- Botões ficam indisponíveis durante a operação e cliques repetidos no mesmo formulário não iniciam outra gravação. Falhas de escrita preservam os dados anteriores e permitem tentar novamente. Conclusões de operações não redirecionam o usuário depois que ele sai da tela.

Não há novas dependências, rotas, credenciais ou configuração de servidor. Formato local e backup continuam nas versões existentes. A fila de dados já usada pelos esboços e backups também coordena as duas novas operações.

## Arquivos alterados

| Arquivo | Alteração |
| --- | --- |
| `src/services/sermon-repository.ts` | Cópia, exclusão por revisão, sugestão de título e inserção compartilhada com validação. |
| `src/components/sermon-management.tsx` | Formulário de cópia, confirmação de exclusão, cancelamento, bloqueio de ações e erros. |
| `src/app/sermon-outline.tsx` | Entrada de organização somente para mensagens salvas. |
| `scripts/sermon-management.test.cjs` | Dez testes de independência, validação, falhas, concorrência, limites e backup. |
| `docs/SAVED-SERMONS.md` | Links para os pacotes posteriores de apresentação e organização. |
| `docs/SERMON-MANAGEMENT.md` | Este relatório e roteiro. |

## Verificações

- `node --test scripts/*.test.cjs`: **161 testes aprovados**, incluindo dez novos. Cópias com notas e conteúdo completo; edição independente; Unicode e títulos repetidos; versão desatualizada e identificador ausente; exclusão apenas do alvo; prevenção de recriação por editor antigo; falhas de leitura/gravação; operações concorrentes; limite de 100; backup com original/cópia e restauração de mensagem antes exportada.
- `npm run lint` e `npx tsc --noEmit`: aprovados.
- `npx expo export --platform android --platform ios --output-dir .expo/sermon-management-validation`: bundles Android e iOS gerados. A execução física no Expo Go continua pendente.
- Prévia web: abertura do painel, título sugerido, título vazio desabilitado, título já usado rejeitado, cancelamento de cópia, abertura/cancelamento da confirmação de exclusão, criação de cópia, notas preservadas, edição da introdução, reabertura e conferência de original/cópia na coleção. Texto e data do original permaneceram intactos.
- Temas escuro/claro em 390 × 844 e 320 × 740. Formulário e ações legíveis sem transbordamento horizontal; quatro abas preservadas. Console final sem erros ou avisos. O teclado e as bordas seguras nativas precisam ser conferidos no aparelho.
- A remoção foi validada com armazenamento simulado nos testes; nenhuma mensagem da prévia ou do aparelho foi excluída. Uma cópia de exemplo, **Cópia para estudo: reconciliação**, ficou salva somente na prévia web. O tema foi restaurado para escuro e o servidor temporário encerrado. Sem commit ou push.

## Validar no Expo Go

1. Inicie o app com `npm start` em `D:\Tayson\App Biblia\biblia-mulher` e abra no Expo Go.
2. Retome um esboço salvo e abra **Organizar mensagem → Duplicar mensagem**. Confira a sugestão; cancelar deve manter a coleção sem mudanças.
3. Crie uma cópia com título próprio. No editor, confira as notas e adapte uma seção. Salve, reabra a coleção e compare com o original.
4. Reinicie o app para conferir a persistência das duas mensagens. Teste a busca pelo título da cópia.
5. Na cópia criada para validação, abra **Excluir mensagem** e toque em **Manter mensagem**; ela deve continuar salva. Se decidir removê-la, confirme a exclusão e confira que o original permanece na coleção.
6. Se quiser testar recuperação, exporte um backup antes de excluir a cópia; depois selecione o arquivo e confira a prévia antes de restaurar.
7. Repita nos temas claro e escuro. Confira teclado, rolagem e botão Voltar no Android; valide no iOS quando houver aparelho disponível.

Documentação consultada: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [navegação do Expo Router](https://docs.expo.dev/router/basics/navigation/) e [TextInput React Native 0.86](https://reactnative.dev/docs/0.86/textinput).
