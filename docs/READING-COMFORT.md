# Sua leitura — preferências offline

Este pacote melhora o conforto de leitura sem exigir conta, servidor ou conexão. A ativação Firebase continua adiada; a integração de conta existente não foi removida nem ativada.

## Recursos

- Perfil → **Sua leitura** e, dentro de um capítulo, **Personalizar leitura**.
- Tamanho do texto: Padrão (19), Maior (22) e Grande (25). A escala de fonte do sistema continua habilitada.
- Espaçamento entre linhas: Regular, com o espaçamento anterior, ou Amplo.
- Organização: Em cards, como antes, ou Contínua, com versículos sem os cards individuais. Cada versículo continua selecionável para favoritar, anotar e compartilhar.
- Prévia com o próprio texto de Salmos 23:1 disponível no app.
- Preferências salvas automaticamente neste aparelho e aplicadas aos próximos capítulos, inclusive após reabrir o app.
- Botão para restaurar as três preferências ao padrão anterior.
- Compatibilidade com os temas claro e escuro, alvos de toque de pelo menos 44 e opções que se reorganizam em telas pequenas.

Os ajustes dentro do capítulo ficam recolhidos quando a tela abre. O carregamento das preferências acontece antes do posicionamento automático de um versículo, preservando a abertura por busca ou favorito com a fonte escolhida.

## Persistência e limites

As preferências usam a chave própria `@biblia-smart/reader-preferences/v1` no AsyncStorage. As operações são serializadas; cada alteração considera as escolhas já salvas. Uma falha não aplica uma preferência que não pôde ser gravada. Dados inválidos ou incompatíveis são preservados, e a Bíblia continua disponível com a aparência padrão e uma opção de tentar recuperar as preferências.

Favoritos, notas, planos, agenda, tema e sessão de conta não são alterados por restaurar o padrão da leitura. Estas preferências são específicas do aparelho, assim como o tema; o backup existente continua exportando somente os módulos de dados que já suportava.

## Arquivos alterados/criados

- `src/app/chapter.tsx`: aplica preferências, recolhe ajustes e mantém seleção/ações de versículos.
- `src/app/profile.tsx`: entrada Sua leitura.
- `src/app/_layout.tsx`: provedor compartilhado e rota auxiliar escondida da tab bar.
- `src/app/reading-settings.tsx`: nova tela de preferências.
- `src/components/reader-options.tsx`: opções acessíveis, prévia e restauração do padrão.
- `src/components/reader-preferences-provider.tsx`: recuperação, gravação e mensagens de erro.
- `src/services/reader-preferences.ts`: integração com AsyncStorage existente.
- `src/services/reader-preferences-repository.ts`: validação, persistência e tipografia.
- `scripts/reader-preferences.test.cjs`: oito testes de persistência e recuperação.
- `docs/READING-COMFORT.md`: este roteiro.

Nenhuma nova dependência foi instalada neste pacote.

## Validação

- 113 testes passaram, incluindo os oito novos e todos os testes anteriores.
- Lint e TypeScript sem erros.
- Exportação Hermes Android/iOS em `.expo/reader-validation` concluída.
- Prévia web conferida em 390×844 e 320×740, nos dois temas.
- Verificados: as três opções, restauração do padrão, persistência ao recarregar, preferências no próximo capítulo, ajustes dentro do capítulo e abertura direta de João 3:16 com fonte grande e espaçamento amplo. As ações e os dados já existentes do versículo permaneceram disponíveis.
- Nenhum erro ou aviso no console da prévia. O servidor temporário de validação foi encerrado.
- Testes em aparelho físico não foram realizados nesta entrega; a exportação confirma o empacotamento, sem substituir a validação no Expo Go.

## Como validar no Expo Go

1. Inicie o projeto pelo comando habitual `npm start` e abra no Expo Go.
2. Vá a Perfil → Sua leitura. Escolha Grande, Amplo e Contínua.
3. Use Experimentar na Bíblia e passe de Salmos 23 para 24. As opções devem acompanhar o capítulo.
4. Toque em um versículo: as ações existentes continuam disponíveis.
5. Feche e reabra o app para conferir a persistência.
6. Abra um resultado de busca ou um favorito e confira o posicionamento no versículo.
7. Use Restaurar leitura padrão para recuperar a aparência anterior; repita no tema claro.

Para repetir os testes: `node --test scripts/reader-preferences.test.cjs` ou, para todos os módulos, `node --test scripts/*.test.cjs`.
