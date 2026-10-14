# Mentorias e Pregações — Bíblia Smart

## O que está disponível

- Entrada na Home, Estudos, Perfil e Apoio ministerial.
- Biblioteca Premium com catálogos separados de mentorias e pregações.
- Busca por título, tema, responsável e aulas; filtros Todos, Vídeos e Áudios.
- Detalhes do conteúdo, responsável, descrição e lista de aulas/partes.
- Vídeo com controles e tela cheia; áudio com reprodução, pausa e avanço/retorno de 15 segundos.
- Pausa ao sair da tela ou colocar o app em segundo plano; sem reprodução automática.
- Rotas auxiliares escondidas da barra inferior; temas e safe areas existentes preservados.

O catálogo publicado começa vazio. Ainda não há hospedagem, envio de arquivos para assinantes, painel administrativo ou assinatura comercial ativada.

## Testar no Expo Go

No terminal do VS Code:

```powershell
cd "D:\Tayson\App Biblia\biblia-mulher"
npx expo start --clear
```

Abra no Expo Go, vá a **Perfil → Gratuito e Premium → Simular Premium para testar** e depois **Início → Mentorias e Pregações**.

Em **Estúdio de testes**, escolha Mentoria ou Pregação, preencha título, responsável e descrição, selecione vídeos/áudios do aparelho e abra a prévia. Uma mentoria pode reunir vários formatos. O estúdio permite até 8 partes por conteúdo e 12 conteúdos por sessão. Limites locais: vídeo 250 MB, áudio 50 MB. Prefira MP4 com H.264/AAC e áudio MP3/M4A; a compatibilidade final depende do codec e do aparelho.

O estúdio só funciona em desenvolvimento, durante a simulação Premium. Não envia nem publica arquivos. As prévias ficam na memória e desaparecem ao encerrar a simulação, reiniciar ou trocar de conta; não entram no backup. O seletor nativo pode criar cópias no cache do app. URLs temporárias de arquivos no navegador são liberadas ao terminar a sessão.

## Preparação para publicação real

`src/services/premium-content.ts` contém um adaptador sem configuração. Sua integração futura deve oferecer:

1. `catalog(accountId)`: metadados de conteúdos publicados ou anunciados.
2. `authorizePlayback(accountId, contentId, lessonId)`: acesso temporário à mídia, autorizado no servidor.

O servidor precisa validar a sessão autenticada e a assinatura; o identificador passado pelo cliente não comprova identidade nem assinatura. A proteção atual do app organiza a experiência, mas a distribuição segura depende dessa autorização e de armazenamento privado. A simulação de desenvolvimento não pode conceder acesso ao servidor.

A próxima implantação inclui um painel para administradores autorizados enviarem os arquivos, hospedagem privada, publicação de metadados e URLs HTTPS assinadas de curta duração. Não colocar arquivos Premium nem URLs permanentes públicas no pacote do app. HLS em vídeo requer proteger também playlists e segmentos. Nenhuma chave, papel administrativo ou segredo foi adicionado.

Exemplo de catálogo (metadados, sem endereço da mídia):

```json
{
  "version": 1,
  "items": [{
    "id": "mentoria-001",
    "kind": "mentoria",
    "title": "Título definido pela equipe",
    "presenter": "Responsável",
    "description": "Descrição do conteúdo",
    "topics": ["Tema"],
    "status": "published",
    "lessons": [{ "id": "aula-1", "title": "Introdução", "media": "video" }]
  }]
}
```

`kind`: `mentoria` ou `pregacao`; `status`: `published` ou `coming-soon`; `media`: `video` ou `audio`. `durationSeconds` é opcional. Conteúdo publicado precisa de ao menos uma parte. O modelo valida os metadados e descarta campos adicionais, incluindo endereços e credenciais.

O acesso à reprodução retorna `uri`, `media`, `contentType` (`progressive` ou `hls` para vídeo, `progressive` para áudio) e `expiresAt` em milissegundos. O cliente valida HTTPS e expiração futura de até 24 horas, interrompe ao expirar e pede nova abertura. O servidor deve usar a menor duração adequada. Mudanças de conta ou modo invalidam respostas pendentes e prévias.

## Arquivos deste pacote

- Rotas: `premium-library.tsx`, `mentorships.tsx`, `preachings.tsx`, `premium-content.tsx`, `content-watch.tsx`, `content-studio.tsx`.
- Componentes: `content-provider.tsx`, `content-catalog.tsx`, `content-player.tsx`; ajuste em `subscription-provider.tsx`.
- Hook: `use-content-library.ts`.
- Serviços: `premium-content-model.ts`, `premium-content.ts`, `content-file-model.ts`, `content-file.ts`; ajuste em `subscription-access.ts`.
- Integração: `_layout.tsx`, `index.tsx`, `profile.tsx`, `studies.tsx`, `support.tsx`.
- Configuração/dependências: `app.config.ts`, `package.json`, `package-lock.json`; `expo-video` e `expo-audio` instalados com versões compatíveis com SDK 57. Microfone, gravação, PiP e reprodução em segundo plano desativados.
- Testes: `scripts/premium-content.test.cjs` e `scripts/subscription.test.cjs`.

Os módulos estão incluídos no Expo Go conforme a documentação do SDK 57: [vídeo](https://docs.expo.dev/versions/v57.0.0/sdk/video/) e [áudio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/). As opções dos plugins nativos serão aplicadas em um futuro novo build.

## Validação realizada

- TypeScript: `npx tsc --noEmit`, sem erros.
- Lint: `npm run lint`, sem erros ou avisos.
- Suíte: `node --test scripts/*.test.cjs`, **209 testes passaram**. Inclui bloqueio gratuito, todas as rotas novas, metadados, busca/filtros, URLs/expiração, mudanças de conta durante respostas pendentes, prévias somente em desenvolvimento e formatos/limites locais.
- Exportação dos pacotes Android e iOS: `npx expo export --platform android --platform ios --output-dir .expo/media-native-check`, concluída.
- Prévia web em viewport móvel: entrada pela Home, simulação, catálogo, busca/filtro, inclusão de duas partes, áudio WAV sintético de teste, reprodução/pausa/avanço de 15 segundos, erro de vídeo inválido e bloqueio ao encerrar a simulação.

A exportação não equivale a um APK ou a teste em aparelho. Reprodução de vídeos válidos, tela cheia, seletor de arquivos e pausa em segundo plano devem ser validados no Android pelo usuário; a validação física no iOS também permanece pendente. Não houve push, publicação ou upload externo.
