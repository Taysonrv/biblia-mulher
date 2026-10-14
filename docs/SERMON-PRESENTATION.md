# Bíblia Smart — apresentação de mensagens

Pacote implementado em 01/10/2026. Caminho: **Apoio ministerial → Meus esboços → Retomar esboço → Apresentar mensagem**. Um esboço recém-criado deve ser salvo antes de apresentar.

## Experiência

- Uma seção de cada vez: texto-base, introdução, três pontos, aplicação, conclusão, referências e perguntas. O conteúdo corresponde à versão salva, inclusive suas edições.
- Controles de texto em 20, 24, 28 e 32, com espaçamento de leitura e suporte à escala de texto do sistema. Tamanho inicial 24; os botões ficam desabilitados nos limites.
- **Anterior / Próxima** permanecem acessíveis enquanto o corpo rola. Trocar de seção reposiciona a leitura no início. **Seções** permite saltar diretamente para qualquer ponto.
- Notas pessoais ficam ocultas inicialmente. Em **Seções**, ative **Mostrar minhas notas pessoais** para acrescentá-las ao final. Ao ocultar notas enquanto estiver nessa seção, a apresentação retorna às perguntas.
- **Concluir**, na última seção, ou o botão de fechar retornam à mensagem salva. Uma mensagem ausente tem aviso e saída para a coleção; erros de armazenamento permitem tentar novamente.
- Temas claro e escuro existentes. A barra das quatro abas é ocultada somente na apresentação e reaparece ao sair. A tela usa as quatro bordas seguras para Android/iOS.

Os ajustes de tamanho, seção atual e visibilidade das notas valem para a apresentação atual; reabrir começa pelo texto-base, no tamanho padrão e com notas ocultas. Apresentar não edita o esboço, notas, datas, backup ou preferências de leitura da Bíblia. Não há novas dependências, credenciais ou servidor. O desligamento automático da tela continua seguindo a configuração do aparelho.

## Arquivos alterados neste pacote

| Arquivo | Alteração |
| --- | --- |
| `src/app/sermon-presenter.tsx` | Nova apresentação, controles, seleção de seções e estados de carregamento/erro. |
| `src/services/sermon-presentation.ts` | Organização do conteúdo salvo, identificadores de seções e navegação limitada ao esboço. |
| `src/app/sermon-outline.tsx` | Entrada **Apresentar mensagem** para esboços salvos. |
| `src/app/_layout.tsx` | Rota auxiliar oculta e barra inferior removida somente nessa tela. |
| `scripts/sermon-presentation.test.cjs` | Seis testes de conteúdo, privacidade, navegação e preservação dos dados. |
| `docs/SERMON-PRESENTATION.md` | Este relatório e roteiro. |

## Verificações

- `node --test scripts/*.test.cjs`: **151 testes aprovados**, incluindo seis novos. Cobertura de texto editado, referências/perguntas, títulos repetidos com destinos distintos, inclusão explícita e retirada das notas, limites de navegação, registros imutáveis e reabertura sem gravações ou mudança de revisão.
- `npm run lint` e `npx tsc --noEmit`: aprovados.
- `npx expo export --platform android --platform ios --output-dir .expo/presenter-validation`: bundles Android e iOS gerados. Esse resultado verifica a compilação, não a execução física.
- Prévia web: entrada a partir da mensagem salva, introdução editada, limites dos quatro tamanhos, salto para um ponto, inclusão e retirada das notas, conclusão/saída com recuperação das quatro abas e mensagem ausente com retorno à coleção.
- Telas 390 × 844 e 320 × 740, nos temas escuro e claro, sem transbordamento horizontal. Corpo longo rolável no tamanho 32 e início da seção seguinte verificado após rolar. Console final sem erros ou avisos.
- A preferência de tema da prévia foi restaurada para escuro; nenhuma mensagem foi criada, alterada ou excluída nesta validação. O servidor temporário de validação foi encerrado. Não houve commit ou push.

## Validar no Expo Go

1. Inicie o app com `npm start` na pasta `D:\Tayson\App Biblia\biblia-mulher` e abra pelo Expo Go.
2. Em **Apoio ministerial → Meus esboços**, retome uma mensagem e toque em **Apresentar mensagem**. Se a coleção estiver vazia, prepare e salve um esboço primeiro.
3. Confira texto-base, introdução e os três pontos. Aumente/diminua o texto e role até o fim de uma seção longa; avance e confira que a próxima abre no início.
4. Em **Seções**, escolha a conclusão. Se sua mensagem tiver notas, ative sua exibição, visite a última seção e depois desative novamente.
5. Use **Concluir** ou feche a apresentação. Confira a mensagem original e as quatro abas. Reabra para verificar os ajustes iniciais.
6. Repita nos temas claro/escuro e confira as bordas seguras, rolagem e botão Voltar no Android; valide também no iOS quando houver aparelho disponível. Essa execução física continua pendente.

Documentação consultada: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Tabs do Expo Router](https://docs.expo.dev/router/advanced/tabs/), [ScrollView React Native 0.86](https://reactnative.dev/docs/0.86/scrollview) e [Text React Native 0.86](https://reactnative.dev/docs/0.86/text).
