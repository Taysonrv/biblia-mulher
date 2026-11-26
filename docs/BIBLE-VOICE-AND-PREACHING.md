# Bíblia falada e texto da pregação

Implementação em 18/10/2026.

## Bíblia falada

Na tela de um capítulo, use **Ouvir capítulo**. Ao selecionar um versículo, aparece **Ouvir a partir do versículo N**. A leitura percorre somente o capítulo atual. O versículo em reprodução recebe a indicação **Ouvindo**. Em **Voz e velocidade**, escolha entre as vozes em português disponíveis no aparelho e as velocidades 0,75, 1 ou 1,25.

- O texto lido é o mesmo da tela (Almeida 1911, com a atualização ortográfica já existente de Salmos 23). Não é uma tradução moderna nem uma gravação profissional.
- O recurso usa `expo-speech` compatível com Expo 57. Não acessa serviço de geração de voz contratado pelo app, não solicita microfone e não lê anotações pessoais.
- A disponibilidade offline depende de uma voz offline instalada no sistema. Uma voz do motor do aparelho pode depender de conexão; o app não consegue garantir o modo offline apenas pelo nome da voz.
- Pausar interrompe a fala. Ao continuar, repete o versículo interrompido, inclusive quando ele foi dividido em partes para respeitar o limite do motor. Não usa `Speech.pause/resume`, indisponíveis no Android.
- Parar volta ao início do capítulo. Sair da tela, mudar capítulo ou colocar o app em segundo plano interrompe a fala. Não há reprodução em segundo plano, reprodução com tela bloqueada, avanço automático de capítulo ou notificação de mídia nesta versão.
- Voz e velocidade ficam na sessão atual. O ponto da fala não é sincronizado nem salvo ao reiniciar o app.
- Importação do módulo é tardia: um APK antigo deve manter o leitor disponível e explicar que precisa do novo APK para a voz.
- O iOS físico pode ficar sem som com o modo silencioso ativado, conforme a documentação Expo.

É necessário atualizar o development APK porque foi adicionada uma dependência nativa. Manter pacote e certificado para atualizar sobre o app existente, sem desinstalar nem limpar dados.

## Montar pregação

Abra um **esboço salvo** e toque em **Montar texto da pregação**, na seção **Do esboço ao texto para pregar**. Revise e edite título, abertura, três pontos, aplicação e encerramento. **Salvar pregação como nova mensagem** cria um registro separado. Na mensagem salva, use **Apresentar mensagem** para ler por seções, aumentar/diminuir texto e navegar entre os pontos.

O recurso integra a área ministerial Premium existente, liberada na versão de teste. Não foi criada cobrança nova.

A montagem é local e editorial, sem API de IA. Nos seis textos-base já reconhecidos pelo gerador local (Salmos 23, João 3:16–21, Efésios 4:25–32, Filipenses 4:4–9, Hebreus 11:1–6 e Marcos 10:35–45), campos de instrução que permanecem exatamente como o modelo original ganham parágrafos desenvolvidos para fala. Campos personalizados pelo pregador são preservados. Para outros temas, organiza o conteúdo fornecido e acrescenta transições: não produz exegese nova para qualquer passagem. A interface pede revisão de eventuais instruções de preparação restantes.

Não acrescenta versículos entre aspas, referências novas ou relatos pessoais. Notas pessoais não entram na nova cópia. As referências e o texto-base são mantidos; a revisão editorial/teológica e a adaptação à comunidade continuam com o pregador.

Os textos usam os mesmos campos e limites dos esboços atuais; conteúdos longos não são cortados para caber uma transição. Não foi criada migração de dados. As mensagens salvas continuam compatíveis com editor, apresentação, compartilhamento, backup e sincronização existentes. Criar/editar texto não envia à nuvem automaticamente.

## Validação e limites

- 280 testes passaram, incluindo 12 de voz e 5 de montagem de pregação; TypeScript e lint passaram.
- Expo Doctor: 21/21 verificações aprovadas.
- Bundle Android com `expo-speech` empacotado com sucesso.
- Prévia web em 390×844: seleção de versículo, listagem de vozes em português, início/parada, montagem editável, edição do título, salvamento separado e apresentação por seções conferidos.
- Um aviso de chave React duplicada encontrado na prévia foi corrigido; a conferência posterior foi feita após recarregar o app.
- Os testes de voz usam motor simulado; interação web não comprova áudio no Android. Validar voz instalada, volume, offline, chamadas/interrupções, troca de capítulo e retorno ao app no novo APK.
- A contagem de palavras não promete duração de uma pregação. Não foi habilitada rolagem automática ou teleprompter; o modo de apresentação usa rolagem manual e navegação por seção.

Referência técnica: https://docs.expo.dev/versions/v57.0.0/sdk/speech/
