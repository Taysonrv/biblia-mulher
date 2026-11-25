# Sincronização manual — Bíblia Smart

Implementada em 18/10/2026. Acesse **Perfil → Meus dados → Sua jornada na nuvem**.

## Comportamento

A pessoa entra na conta, toca em **Conferir sincronização**, confere quantidades e remoções, resolve diferenças e toca em **Confirmar sincronização**. Abrir a tela ou entrar na conta não envia os dados. **Cancelar** não grava nem vincula a coleção. No primeiro envio confirmado, a coleção local fica vinculada ao UID da conta. Trocar de conta mantém o armazenamento local acessível, como antes, mas bloqueia sincronização com outro UID. Não há migração automática entre contas e não há botão de desvincular/apagar neste pacote.

Inclui favoritos e anotações bíblicas, planos e capítulos concluídos, agenda (inclusive vínculo com esboço), esboços e notas pessoais, estudos salvos e reflexões. Não inclui preferências visuais, histórico/posição de navegação bíblica, arquivos de mídia, assinatura ou progresso/favoritos de mentorias. A simulação Premium não é enviada. Senhas, tokens, OAuth secrets e configuração Firebase não fazem parte da carga.

É sincronização manual, pela internet. Modificações offline continuam no armazenamento local e precisam ser sincronizadas depois; não existe sincronização em segundo plano nem fila Firestore persistente. Em um segundo aparelho, entre com a **mesma conta** e repita a conferência/confirmação.

## Combinação e preservação

- Sem histórico de sincronização neste aparelho, combina os registros existentes com a nuvem. Texto diferente precisa de escolha; não é substituído silenciosamente. Os primeiros vínculos merecem atenção porque podem incluir registros locais anteriores ao login.
- Depois do primeiro sucesso, compara três versões: última sincronização, aparelho e nuvem. Alterações em campos diferentes são combinadas; desmarcar favoritos, limpar notas, desmarcar leituras e remover itens também se propagam. Alteração de texto versus remoção precisa de escolha.
- Favorito e anotação do mesmo versículo são campos independentes. Leituras concluídas são combinadas por capítulo. Um compromisso ou esboço editado em ambos os aparelhos exige escolher o registro completo. Não há decisão por relógio do aparelho.
- A prévia lista conflitos com as duas versões e permite cancelar. Exportar um backup em arquivo antes da primeira sincronização oferece uma cópia independente.
- A confirmação revalida os dados locais e usa uma transação Firestore com revisão esperada. Se outro aparelho sincronizou depois da prévia, pede nova conferência. Não sobrescreve a versão remota mais recente.
- Dados locais e checkpoint da sincronização são gravados juntos no diário de recuperação existente. Falhas voltam ao estado local anterior. Se a nuvem confirmou antes de uma falha local, uma nova prévia permite recuperar; nunca declarar sucesso antes de confirmar a gravação local.
- Uma sessão trocada ou encerrada invalida a operação. Falha de rede preserva os dados locais; uma gravação cuja resposta excedeu o prazo pode ter chegado à conta original. Confira novamente para descobrir o resultado.
- Dados inválidos, uma cópia remota removida/regredida ou armazenamento danificado bloqueiam a operação. Não há limpeza automática nem truncamento de dados.

## Lembretes

O estado de notificações agendadas é exclusivo do aparelho e não é enviado como agendado. Compromissos locais sem alterações mantêm o lembrete atual. Receber alteração/remoção cancela um lembrete antigo antes de aplicar o registro. Compromissos recebidos ou alterados precisam ser abertos e salvos na agenda para ativar o lembrete local. Se a gravação falha após cancelar, o serviço tenta restaurar os lembretes anteriores e avisa quando precisam ser revisados.

## Ativar no Firebase

1. No projeto **biblia-mulher**, abra **Firestore Database** e confirme se já existe um banco **(default)**. Se não existe, crie um banco Standard/Native em **modo produção**, selecionando a localização desejada. Não use regras abertas de modo teste. A localização deve ser escolhida com cuidado antes de criar o banco.
2. Leia as regras já publicadas antes de alterá-las. O arquivo `firestore.rules` neste projeto contém apenas a nova sincronização e nega os demais acessos; se já houver outros recursos no banco, integre o bloco específico sem remover regras existentes e sem manter permissões amplas que o anulem.
3. Publique as regras revisadas. O caminho usado é `/users/{uid}/sync/journey`. Só o usuário autenticado daquele UID pode ler ou gravar. Listagem e exclusão estão bloqueadas; atualizações devem incrementar a revisão e usar timestamp do servidor.
4. O campo `payload` não precisa de índice. `firestore.indexes.json` prepara essa exclusão. Inspecione os índices existentes antes de usar o arquivo em um banco que já tem outras funcionalidades.
5. Para um projeto/banco novo e revisado, a publicação por CLI pode usar `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project biblia-mulher`. Requer login com acesso ao projeto. **Não foi executada nesta implementação.**
6. Reinicie o Metro. Não há nova dependência nativa: o módulo Firestore faz parte do Firebase JS já instalado. O development APK validado pode carregar esta versão via Metro; a distribuição posterior deverá conter o código/configuração atualizados.

Os clientes Android e Web externos autorizados no provedor Google devem permanecer como foram validados. Não trocar o projeto Firebase nem as credenciais de autenticação para ativar esta funcionalidade.

## Limites desta primeira versão

Um documento versionado por conta armazena a jornada validada em uma string JSON, com limite **700.000 bytes UTF-8**, abaixo do limite Firestore de 1 MiB. Jornadas maiores continuam disponíveis localmente e pelo backup de até 8 MB; não são enviadas parcialmente. O app mostra um erro de limite antes do upload. Evoluir para documentos por item é necessário antes de aumentar esse limite ou tornar a sincronização automática.

Cada conferência consulta o servidor; confirmação usa transação. Não há listener permanente. Cotas/custos dependem do projeto. Regras isolam contas, mas não oferecem criptografia ponta a ponta: os textos pessoais ficam no Firestore. A publicação futura deve incluir política de privacidade e exclusão de conta/dados, além de revisão de regras e proteção contra abuso.

## Validação

Testes automatizados em `scripts/cloud-sync.test.cjs` cobrem combinação por campo, duas instâncias de aparelho, conflitos, remoções, idempotência, prévia obsoleta, concorrência de revisão, troca de conta, falhas de rede/dados/gravação, checkpoint atômico, recuperação após interrupção, relógios diferentes e lembretes. A suíte usa armazenamento e servidor simulados; não substitui o emulador de regras nem teste com duas contas/aparelhos reais.

Antes de declarar a ativação validada:

1. Exporte um backup local em arquivo.
2. Aparelho A: crie um favorito e uma nota; confira a prévia e confirme com a conta de teste.
3. Aparelho B: entre na mesma conta, confira e confirme; verifique os registros recebidos.
4. Altere a nota em ambos sem sincronizar; sincronize A e confira B. Escolha uma versão e confirme; volte a sincronizar A para comprovar convergência.
5. Desmarque um favorito em A, sincronize os dois e confira a remoção em B.
6. Desconecte a internet, modifique um registro e tente conferir; confirme que os dados locais persistem. Reconecte e sincronize.
7. Troque de conta em um aparelho já vinculado e confirme o bloqueio do envio. Volte à conta original.
8. Com regras publicadas, teste uma conta B tentando acessar o caminho do UID A e acesso sem autenticação: ambos devem ser negados. Faça isso no emulador/teste autorizado, sem abrir regras de produção.
9. Confira compromissos recebidos e reative os lembretes desejados no aparelho de destino.

## Próximas etapas acordadas

1. Ativação e teste real da sincronização antes de ampliar o escopo.
2. Melhorias de uso: priorizar retomada da leitura e clareza de estados vazios/erros, seguidas de ajustes visuais após revisão em aparelho.
3. Revisão para Play Store: privacidade, exclusão da conta/dados, billing/assinaturas reais, conteúdo e direitos, permissões, regras, vulnerabilidades, configuração de produção e teste do AAB assinado.
