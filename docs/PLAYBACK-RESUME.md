# Retomada de vídeos e áudios

O reprodutor Premium agora guarda o ponto por conteúdo e por parte. Ao reabrir, o botão mostra **Retomar áudio/vídeo de m:ss**. A reprodução começa após o toque; o app não inicia automaticamente.

## Comportamento

- Guarda posição durante reprodução a cada cinco segundos e ao pausar/sair/colocar em segundo plano, quando o player ainda está disponível.
- Guarda a posição ao avançar/voltar 15 segundos no áudio.
- Começar do início pausa, volta a zero e redefine o ponto salvo; não começa a tocar sozinho.
- Próxima parte e Parte anterior seguem a ordem do catálogo, sem marcar conclusão automaticamente.
- Cada parte conserva seu próprio ponto. Favoritos e conclusão continuam independentes.
- Pontos no último segundo ou além da duração atual voltam a zero para permitir rever a mídia.
- Apenas abrir e sair sem tocar ou avançar não substitui o ponto guardado por zero.
- Durante retomada de vídeo, os controles nativos ficam disponíveis depois de iniciar ou escolher começar do início, para não ignorar o ponto salvo.

Os registros anteriores continuam compatíveis. O modelo valida posições finitas, entre zero e a duração, com duração de até 24 horas. Valores repetidos no mesmo segundo não geram nova escrita. A posição tem precisão aproximada de segundos; a precisão da busca no vídeo também depende do codec/player. Transmissões sem duração finita não têm posição guardada. Encerrar o processo abruptamente pode perder os últimos segundos desde a gravação periódica.

O salvamento é local e separado por conta; na simulação é temporário. Não armazena endereço da mídia, credenciais ou arquivos. Sincronização, inclusão no backup, hospedagem e autorização de assinatura no servidor seguem pendentes. Nenhuma dependência ou permissão foi acrescentada.

## Validar no celular

```powershell
cd "D:\Tayson\App Biblia\biblia-mulher"
npx expo start --clear
```

1. Ative a simulação em Perfil → Gratuito e Premium.
2. Em Mentorias e Pregações → Estúdio de testes, monte uma mentoria com duas partes locais.
3. Abra a primeira parte, toque em reproduzir e acompanhe alguns segundos. No áudio, também teste avançar 15 segundos.
4. Pause, volte aos detalhes e reabra a mesma parte. Confira o botão Retomar e a posição após tocar.
5. Troque para a próxima parte e volte pela Parte anterior. Confira que os pontos são independentes.
6. Toque em Começar do início e reabra: confira zero e ausência do botão Retomar.
7. No celular, teste também colocar o app em segundo plano e voltar. A mídia deve pausar, sem recomeçar sozinha.

## Arquivos alterados

- `src/services/content-journey-model.ts`: posições por parte, validação, compatibilidade e operação de salvamento em fila.
- `src/components/content-journey-provider.tsx`: gravação de posições com o mesmo isolamento de conta e simulação.
- `src/components/content-player.tsx`: retomada, reinício, gravação periódica e nas transições.
- `src/app/content-watch.tsx`: ligação ao progresso e atalhos anterior/próxima.
- `scripts/content-journey.test.cjs`: cinco novos testes, 13 testes deste módulo no total.
- `docs/CONTENT-JOURNEY.md` e este guia.

## Validação realizada

- TypeScript e lint passaram sem erros/avisos.
- Suíte completa: **222 testes passaram**. Os cinco novos cobrem compatibilidade de registros antigos, posições independentes em operações concorrentes, redução de escritas e reinício em zero, posições inválidas/aulas removidas e limites de retomada.
- Exportação dos pacotes Android e iOS concluída; não equivale a gerar APK/IPA nem testar aparelho físico.
- Prévia web em tamanho de celular: áudio WAV sintético de 40 segundos, avanço, pausa, saída/reabertura com ponto salvo em 0:16, reprodução iniciada em 0:16, reinício em zero e navegação anterior/próxima.
- Retomada de vídeo, seletor, tela cheia e pausa em segundo plano em Android/iOS precisam da validação física no Expo Go. Não houve upload externo, publicação ou push.

APIs conferidas na documentação do SDK 57: [expo-video](https://docs.expo.dev/versions/v57.0.0/sdk/video/) e [expo-audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/).
