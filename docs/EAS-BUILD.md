# Build da Bíblia Smart

O erro `android.package is not defined` foi corrigido em `app.json`. O identificador padrão para Android e iOS é `com.taysonaraujo.bibliasmart`. O `app.config.ts` mantém a opção de substituir pelos campos `APP_ANDROID_PACKAGE` e `APP_IOS_BUNDLE_IDENTIFIER`; vazios, eles usam o padrão estático.

O projeto EAS existente foi preservado: `a1115f2c-bec7-44b4-852d-9d69c60bb24e`, com slug `biblia-mulher`. O nome mostrado no aparelho continua Bíblia Smart.

## APK para testar no Android

```powershell
cd "D:\Tayson\App Biblia\biblia-mulher"
npx eas-cli@latest build --platform android --profile preview
```

O perfil `preview` usa distribuição interna e `android.buildType: apk`. Ao terminar a compilação na nuvem, abra no celular o link fornecido pelo EAS e baixe/instale o APK. O build não publica na Play Store.

## Versão Android para a loja

```powershell
npx eas-cli@latest build --platform android --profile production
```

O perfil `production` mantém `autoIncrement: true` e o formato padrão AAB. AAB é destinado à Play Store e não é instalado diretamente como APK. Enviar à loja é uma etapa posterior.

O identificador iOS também está resolvido. A assinatura e a distribuição iOS exigem configuração própria de credenciais; comece pelo Android para validar o app no aparelho atual.

O aviso sobre uso do Expo Go não era a causa da falha apresentada. A causa era o identificador ausente na configuração dinâmica. A ausência de variáveis EAS também não causa esse erro: autenticação Firebase/Google e assinaturas permanecem aguardando configuração, como nas versões anteriores. Não adicionar credenciais privadas ao app.

O APK `preview` agora ativa automaticamente o Premium para testes e mostra uma faixa permanente de acesso temporário sem cobrança. O Estúdio de testes também fica disponível para vídeos/áudios locais. O acesso volta ativo ao reiniciar; as prévias de mídia são temporárias. É necessário gerar outro APK para receber esta alteração. O perfil `production` desativa essa liberação. Veja [PREMIUM-TESTING.md](./PREMIUM-TESTING.md). Login real, catálogo remoto e assinatura real ainda dependem da ativação dos serviços.

## Arquivos alterados e checagens

- `app.json`: pacote Android e bundle identifier iOS.
- `eas.json`: APK explícito no perfil preview, demais perfis preservados.
- `.env.example`: orientações sobre os identificadores padrão.
- `EAS-BUILD.md`: este guia.

`npx expo config --type public --json` confirmou os dois identificadores e o projeto EAS correto. TypeScript e lint foram executados. Nenhum build na nuvem foi iniciado por esta correção; o resultado da próxima compilação depende da execução do comando e das etapas de assinatura do EAS.

Referências: [APK no EAS](https://docs.expo.dev/build-reference/apk/), [perfis de build](https://docs.expo.dev/build/eas-json/) e [configuração Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/config/app/).
