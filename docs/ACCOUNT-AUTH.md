# Conta — Bíblia Smart

O pacote implementa acesso opcional com Firebase Authentication. A leitura e os dados locais continuam disponíveis sem conta. Não há projeto Firebase conectado nesta entrega, nem cadastro real criado durante os testes.

## O que foi implementado

- Perfil → Entrar ou criar conta, com os temas claro e escuro existentes.
- Cadastro por nome, e-mail e senha; confirmação de senha e envio de verificação de e-mail.
- Login por e-mail, recuperação de senha, conferência/reenvio de confirmação e saída.
- Google: popup do Firebase na web; ID token do SDK Google no Android/iOS, trocado por uma sessão Firebase.
- Sessão persistida pelo Firebase, com AsyncStorage no Android/iOS e persistência padrão do SDK na web.
- Validação de entrada, bloqueio de operações simultâneas e mensagens de erro em português. Recuperação informa a mesma mensagem para endereços cadastrados ou desconhecidos.
- Sem configuração, nenhuma operação cria sessão fictícia ou tenta cadastrar alguém. O app explica que o acesso aguarda ativação.

## Ativar e-mail no Firebase / Expo Go

1. No [Firebase Console](https://console.firebase.google.com/), crie ou escolha seu projeto. Registre um app **Web** nas configurações do projeto para obter a configuração pública usada pelo SDK JavaScript.
2. Copie `.env.example` para `.env.local`, na raiz deste projeto. Preencha `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID` e `EXPO_PUBLIC_FIREBASE_APP_ID` com os valores desse app Web. Não use exemplos ou valores de outro projeto.
3. Em Authentication → Sign-in method, ative **Email/Password**. Configure os modelos de e-mail em português e as políticas de senha que desejar. O formulário exige pelo menos oito caracteres; requisitos adicionais do Firebase serão respeitados pelo servidor.
4. Reinicie o Expo para carregar as variáveis. Teste cadastro, recebimento da confirmação, saída, reentrada, reinício do app e recuperação com uma conta de teste sua.

O [SDK JavaScript do Firebase funciona no Expo Go](https://docs.expo.dev/guides/using-firebase/). Esta integração usa Firebase 12 e inicializa a autenticação nativa com persistência explícita, conforme a [orientação de persistência do Expo](https://expo.fyi/firebase-js-auth-setup).

As variáveis `EXPO_PUBLIC_*` são configuração pública e entram no aplicativo distribuído. **Nunca coloque service account, chave privada, client secret OAuth ou credencial de administrador nesse arquivo.** `.env.local` está ignorado pelo Git. A configuração de cliente não substitui regras de acesso em futuros bancos de dados.

## Ativar Google

1. No mesmo projeto Firebase, ative **Google** em Authentication e configure o e-mail de suporte. Ajuste a tela de consentimento OAuth e usuários de teste no Google Cloud quando aplicável.
2. Para web, inclua o domínio usado pelo app em Authentication → Settings → Authorized domains. Para testes locais, confira explicitamente `localhost`. O fluxo usa o popup do Firebase e seu domínio de autenticação.
3. Para Android/iOS, preencha `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` com o cliente OAuth **Web** do mesmo projeto. O SDK nativo pede um ID token para esse cliente; um ID de cliente Android não deve ser usado nesse campo.
4. Defina `APP_ANDROID_PACKAGE` e registre esse mesmo identificador no Firebase/Google. Cadastre as impressões SHA-1 e SHA-256 dos certificados usados na versão de desenvolvimento e na versão distribuída. O cliente OAuth Android precisa corresponder ao pacote e ao certificado efetivos.
5. Para iOS, defina `APP_IOS_BUNDLE_IDENTIFIER`, registre esse identificador e preencha `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` com o cliente OAuth iOS correspondente. `app.config.ts` deriva o esquema de retorno do cliente iOS e aplica o plugin Google quando esse ID está preenchido.
6. Prepare uma **development build** com esses valores e teste em aparelho. O Google nativo **não funciona no Expo Go**; nessa prévia, a opção explica a limitação e mantém o e-mail disponível. Nenhum build externo, projeto EAS, arquivo de assinatura ou aplicativo nativo foi criado por este pacote.

O SDK Google é carregado somente depois de verificar a execução fora do Expo Go e a presença dos IDs necessários. Android usa a configuração explícita do cliente Web e iOS também usa seu cliente iOS; este fluxo de Firebase JS não lê arquivos `google-services.json`/`GoogleService-Info.plist` para obter essas opções. Leia o [guia Google do Expo](https://docs.expo.dev/guides/google-authentication/) e a [configuração Expo do SDK Google](https://react-native-google-signin.github.io/docs/setting-up/expo) antes de preparar a primeira development build.

## Dados e arquitetura

`AuthAdapter` separa as operações da interface e do provedor Firebase. A interface recebe somente UID, nome, e-mail, estado de verificação e provedores; não recebe tokens do SDK. Senhas ficam apenas nos campos durante a operação e são apagadas ao alternar o formulário ou sair da tela.

**Este pacote não sincroniza dados.** Favoritos, notas, histórico, planos e agenda continuam pertencendo ao armazenamento local do aparelho e ficam disponíveis ao sair ou trocar de conta. A interface informa esse comportamento. O backup existente exporta apenas seus dados permitidos; não exporta sessão Firebase, senha ou configurações de autenticação. Para sincronização futura, será necessário definir associação dos dados à conta, migração, conflitos e regras de acesso no servidor.

## Arquivos deste pacote

- `src/app/account.tsx`: entrada, cadastro, recuperação e gerenciamento da sessão.
- `src/app/profile.tsx` e `src/app/_layout.tsx`: entrada no Perfil, provedor global e rota auxiliar fora da tab bar.
- `src/components/account-card.tsx`, `account-field.tsx`, `account-provider.tsx`: apresentação, campos acessíveis e estado da conta.
- `src/services/auth-model.ts`, `auth-settings.ts`, `auth-config.ts`, `account.ts`: contrato, validação e configuração.
- `src/services/firebase-account.ts`, `firebase-session.ts`, `firebase-session.native.ts`: operações Firebase e persistência por plataforma.
- `src/services/google-login.ts`, `google-login.native.ts`: acesso Google web/nativo e proteção do Expo Go.
- `app.config.ts`, `app.json`, `.env.example`, `.gitignore`: configuração pública, plugin e proteção dos arquivos locais de ambiente.
- `package.json`, `package-lock.json`: dependências Firebase e Google instaladas pelo Expo.
- `scripts/account.test.cjs`: 19 testes adicionais do serviço e dos adaptadores.
- `docs/ACCOUNT-AUTH.md`: este roteiro de ativação.

## Validação desta entrega

- 105 testes passaram: 19 novos de autenticação e 86 existentes.
- `npm run lint` e `npx tsc --noEmit`: sem erros.
- `npx expo config --type public`: configuração resolve sem IDs Google preenchidos.
- Exportação Hermes para Android e iOS concluída em `.expo/auth-validation`.
- Prévia web conferida em 390×844 e 320×740, com os dois temas: troca de formulário, campos, mostrar/ocultar senha, recuperação, bloqueio sem configuração, retorno sem conta e manutenção das quatro tabs. Nenhum erro ou aviso no console da prévia.
- Os testes usam adaptadores simulados. A exportação verifica empacotamento, mas não substitui teste em aparelho. Cadastro real, entrega de e-mail, restauração de sessão após reinício e OAuth real dependem da ativação e ainda precisam ser validados.

Para repetir os testes da conta: `node --test scripts/account.test.cjs`. Para todos os módulos: `node --test scripts/*.test.cjs`.

## Verificação antes de ativar

Execute `npm run check:auth`. O comando lê os arquivos de ambiente com a mesma prioridade do Expo, reutiliza a validação Firebase do aplicativo e mostra somente o estado dos campos. Não imprime valores, não altera arquivos e não acessa a rede. Retorna código 1 enquanto a configuração Firebase estiver ausente ou inválida, e código 0 quando estiver localmente completa. Esse resultado não comprova a ativação dos provedores no servidor: o acesso real ainda precisa ser validado. O verificador está em `scripts/check-auth-config.cjs`.
