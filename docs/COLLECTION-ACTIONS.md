# Favoritos, reflexões e compartilhamento

Pacote de 05/10/2026, disponível no modo gratuito e sem novas dependências.

## Novas ações

- Favoritar ou remover um favorito diretamente nas coleções de favoritos e anotações.
- Depois de remover, a tela volta ao início para mostrar a confirmação e a ação **Desfazer remoção do favorito**, inclusive ao remover o último item da coleção.
- Remover o favorito conserva sua anotação. Desfazer altera apenas o favorito, usando a anotação atual no armazenamento; não restaura uma cópia antiga por cima de uma edição recente.
- Escrever ou editar a reflexão também pela coleção de favoritos.
- Compartilhar com prévia nas duas coleções e nas ações do versículo durante a leitura.
- O texto começa com **Somente versículo**, contendo referência, texto bíblico e identificação da tradução. **Versículo e reflexão** inclui a anotação apenas por escolha explícita. Ao fechar ou sair da tela, essa escolha é redefinida.
- Android/iOS abrem as opções de compartilhamento do sistema após o toque. A pessoa escolhe o destinatário/aplicativo. A interface não afirma que houve entrega; cancelamento no iOS não é tratado como erro. No navegador, a prévia oferece texto selecionável para copiar.
- Falhas de armazenamento e compartilhamento permitem tentar novamente. Busca, filtros, paginação, temas e as quatro abas continuam usando a estrutura existente.

O armazenamento e o backup dos versículos continuam no formato existente. A ação de desfazer se refere à última remoção efetuada nesta tela. Não há exclusão de anotações, envio automático, login obrigatório ou acesso Premium neste pacote.

## Como validar

```powershell
cd "D:\Tayson\App Biblia\biblia-mulher"
npx expo start --go --clear
```

1. Perfil → Meus favoritos → **Compartilhar versículo**. Confira referência, texto e tradução.
2. Em um favorito com anotação, confira que a prévia começa sem a reflexão. Escolha **Versículo e reflexão** e confira o texto. Feche e reabra: deve voltar a **Somente versículo**.
3. No celular, abra as opções de compartilhamento e cancele. Volte à prévia e tente novamente. No navegador, selecione/copie o texto da prévia.
4. Remova um favorito com anotação e toque em **Desfazer remoção do favorito**. Confira que a anotação continua igual.
5. Remova o último favorito e confira que Desfazer continua acessível mesmo na coleção vazia.
6. Perfil → Minhas anotações: favorite um versículo sem sair da tela; confira a presença em Meus favoritos.
7. Abra um capítulo, selecione um versículo e teste a mesma prévia. Confira também os temas claro e escuro.

Para testar no iPhone, entre no Expo CLI e no Expo Go com a mesma conta Expo. Se a conexão local falhar, use `npx expo start --go --tunnel`. Mantenha o terminal aberto durante o teste.

O APK já gerado permanece na versão anterior. Para levar este pacote ao APK, gere outro build com `npx eas-cli@latest build --platform android --profile preview`.

## Arquivos

- `src/components/reading-library.tsx`: ações nas coleções e desfazer.
- `src/components/reading-share.tsx`: prévia compartilhada entre coleções e capítulo.
- `src/app/chapter.tsx`: inclusão da prévia.
- `src/hooks/use-reading.ts` e `src/services/reading-repository.ts`: alteração explícita do favorito, preservando a anotação atual.
- `src/services/reading-share-model.ts`: formatação e validação do texto.
- `src/services/reading-sharing.ts` e `.native.ts`: texto selecionável no navegador e compartilhamento nativo.
- `scripts/reading.test.cjs` e `scripts/reading-share.test.cjs`: oito testes novos.

## Verificação

- TypeScript e lint aprovados sem erros ou avisos.
- Suíte completa: 230 testes aprovados. Os oito novos cobrem dados após reinício, desfazer idempotente com edições concorrentes, erros de armazenamento, inclusão explícita da reflexão, referência/tradução, cancelamento e falha do compartilhamento.
- Pacotes finais Android e iOS exportados com sucesso. Essa verificação confirma compilação, não execução em aparelho ou geração de novo APK/IPA.
- Expo iniciado no modo Expo Go com QR Code e encerrado depois da conferência. Não há servidor de teste deixado em execução por este pacote.
- A prévia visual automatizada ficou indisponível nesta sessão. Compartilhamento e aparência em aparelho físico precisam da validação pelo roteiro acima.

Referências técnicas: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Share no React Native 0.86](https://reactnative.dev/docs/0.86/share) e [teste pelo Expo Go](https://docs.expo.dev/get-started/start-developing/).
