# Backup e restauração — Bíblia Smart

Pacote implementado em 30/09/2026. Acesse **Perfil → Meus dados**.

Atualização de 01/10/2026: o backup agora inclui mensagens e notas pessoais do Apoio Ministerial. Novos arquivos usam formato 2; o formato 1 continua importável. Consulte [Esboços salvos](SAVED-SERMONS.md) para as verificações e regras do novo pacote.

## Recursos

- Contagem de favoritos, anotações, planos iniciados, leituras concluídas, compromissos e esboços locais.
- Exportação de um arquivo JSON identificado e versionado da Bíblia Smart. Android/iOS abrem o menu do sistema para escolher onde guardar ou compartilhar o arquivo; a web solicita o download.
- Seleção de arquivo com o seletor do sistema, limite de 8 MB e validação completa antes de mostrar a prévia.
- A prévia mostra a data, as quantidades do backup, os itens que serão acrescentados e os conflitos. Somente **Restaurar e combinar dados** inicia a gravação. Cancelar não altera os registros.
- Importação repetida sem duplicar registros.
- Recuperação dos valores anteriores se a gravação falhar. Um registro de recuperação permite retomar o rollback após reiniciar o app; leitura/gravação nos repositórios de leitura, planos, agenda e esboços aguarda a recuperação. Registros de recuperação antigos continuam compatíveis.
- A rota auxiliar não aparece na barra de abas. Os temas claro e escuro foram mantidos.

## Regras de combinação

| Dados | Regra |
| --- | --- |
| Favoritos | Combinados por livro, capítulo e versículo; marcar no backup acrescenta o favorito. |
| Anotações | Importadas quando não há texto local. Textos iguais não são duplicados. Se houver dois textos diferentes, o texto atual permanece e a prévia permite consultar/copiar o texto do backup. |
| Planos | Leituras concluídas são combinadas por etapa e capítulo. A data de início mais antiga é mantida. O plano ativo ou pausado do aparelho é preservado; o plano ativo do backup é adotado apenas quando não há planos locais. |
| Agenda | Identificadores existentes são preservados. Mesmo identificador com conteúdo diferente gera um conflito informado na prévia. Conteúdo idêntico com outro identificador não cria duplicação. Novos compromissos entram em ordem cronológica. |
| Esboços | Mensagens e notas pessoais são transportadas juntas. Conteúdo idêntico não duplica mensagens. Mesmo identificador com conteúdo diferente mantém o esboço local e informa o conflito na prévia. Backups antigos sem esboços preservam a coleção atual. |
| Lembretes | Compromissos existentes e seus estados de notificação permanecem intactos. Compromissos importados não herdam notificações agendadas do outro aparelho. Edite e salve os compromissos futuros na agenda para ativar seus lembretes. |

O backup cobre leitura (favoritos/anotações), planos, agenda e esboços. Aparência, preferências de leitura, histórico de visitas a capítulos e textos bíblicos não são transportados. Não há envio automático para um servidor ou chave de API; a conta é opcional e não é necessária para o backup. O arquivo contém anotações pessoais e notas dos esboços e fica no destino escolhido pelo usuário.

## Arquivos deste pacote

| Arquivo | Alteração |
| --- | --- |
| `src/app/my-data.tsx` | Tela de exportação, seleção, prévia, conflitos, confirmação e resultado. |
| `src/app/profile.tsx` | Entrada Meus dados. |
| `src/app/_layout.tsx` | Registro da rota auxiliar oculta. |
| `src/services/backup-repository.ts` | Formato versionado, validação, contagens, combinação e restauração. |
| `src/services/backup.ts` | Instância do serviço com armazenamento local real. |
| `src/services/backup-files.native.ts` | Seletor, leitura de arquivo e compartilhamento no Android/iOS. |
| `src/services/backup-files.ts` | Seleção e download na web. |
| `src/services/data-coordinator.ts` | Fila compartilhada, snapshots, registro de recuperação e verificação das gravações. |
| `src/services/local-data.ts` | Coordenador compartilhado do app. |
| `src/services/reading.ts` | Integração do repositório de leitura à fila de dados. |
| `src/services/reading-plans.ts` | Integração dos planos à mesma fila. |
| `src/services/agenda.ts` | Integração da agenda à mesma fila. |
| `scripts/backup.test.cjs` | 24 testes novos, incluindo falhas, reinício, concorrência e adaptadores nativos simulados. |
| `package.json` e `package-lock.json` | Módulos oficiais compatíveis com Expo 57: expo-file-system, expo-document-picker e expo-sharing. |
| `app.json` | Plugin expo-sharing incluído pelo instalador do Expo; extensões de recebimento de arquivos não foram ativadas. |
| `docs/BACKUP-RESTORE.md` | Este relatório e roteiro. |

## Verificações

- `node --test scripts/*.test.cjs`: 86 testes aprovados; 24 novos do backup e 62 anteriores.
- `npm run lint`: aprovado, sem erros ou avisos de lint.
- `npx tsc --noEmit`: aprovado.
- Interface web conferida em 390 × 844 e 320 × 740, nos dois temas, sem erros/avisos no console.
- Pela interface, um arquivo de teste restaurou favorito, anotação e compromisso; a anotação apareceu na biblioteca. A segunda seleção mostrou zero acréscimos. Cancelamento, arquivo incompatível e comparação de anotações em conflito foram verificados.
- A exportação web exibiu a solicitação de download. A captura automática do evento de download não foi confirmada nesta prévia embutida; o arquivo baixado não foi inspecionado por ela.
- Exportação local Android/iOS em `.expo/backup-validation` confere a compilação dos bundles JavaScript/Hermes. Não equivale a um teste no aparelho. A seleção e o compartilhamento nativos foram testados automaticamente com módulos simulados; a conferência física no Expo Go permanece pendente.

## Validar no Expo Go

1. Reinicie o servidor do projeto após a instalação dos novos módulos. Abra **Perfil → Meus dados**.
2. Confira as quantidades e toque em **Exportar backup**. Escolha um destino no menu do sistema e confirme que o arquivo `.json` foi guardado.
3. Toque em **Selecionar arquivo de backup** e escolha o arquivo exportado. Confira a prévia. No mesmo aparelho, sem alterações posteriores, as adições devem ser zero.
4. Cancele essa restauração e confira que seus dados permanecem intactos. Se desejar, selecione o mesmo arquivo novamente e combine; não deve haver duplicação.
5. Em outro aparelho com o app, selecione o arquivo e restaure. Confira favoritos, anotações e progresso dos planos.
6. Abra a agenda e confira os compromissos. Edite e salve os futuros para ativar os lembretes nesse aparelho.
7. Confira os temas claro/escuro e as quatro abas principais.

Evite apagar dados para testar o backup. A combinação permite validar no mesmo aparelho sem remover sua jornada atual.
