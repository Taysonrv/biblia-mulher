# Bíblia Smart — Planos de leitura

## O que foi entregue

- 7 dias de esperança: sete capítulos sobre cuidado, descanso e esperança, com o contexto de cada passagem.
- João em 21 dias: todos os capítulos do Evangelho de João.
- Bíblia em 365 dias: os 1.189 capítulos, em ordem, distribuídos em etapas de 3 ou 4 capítulos, sem repetições ou omissões.
- Entrada na Home, em Estudos e no Perfil. As três telas auxiliares não aparecem na barra de abas.
- Começar, continuar, pausar e retomar planos. Ativar outro plano conserva o progresso de todos os planos iniciados.
- Conclusão explícita no final da leitura, com opção de marcar novamente como pendente. Abrir ou navegar por capítulos não conclui uma etapa.
- Etapas com vários capítulos só ficam concluídas quando todas as leituras estão marcadas.
- Navegação da leitura segue as passagens e os dias do plano. A navegação normal da Bíblia continua disponível quando a leitura não está vinculada a um plano.
- A Home mostra o próximo capítulo pendente, o total concluído e a barra de progresso. Não há cobrança de prazo: os dias são etapas para seguir no próprio ritmo.
- Progresso local em uma chave própria, separado de histórico, favoritos, anotações, tema e agenda. Sem API, conta, sincronização ou nova dependência.
- Erros de recuperação/gravação permitem tentar novamente e preservam os dados existentes. Não há ação de zerar ou apagar todo o progresso.

## Verificações

- 51 testes aprovados, incluindo 13 novos testes sobre planos: conteúdo disponível offline, cobertura dos 1.189 capítulos, navegação entre etapas, persistência, troca/pausa, conclusão parcial, reversão, concorrência, dados inválidos/corrompidos e falhas de gravação.
- TypeScript aprovado: npx tsc --noEmit.
- Lint aprovado sem avisos: npm run lint.
- Exportação Android/iOS aprovada: npx expo export --platform android --platform ios --output-dir .expo/plans-validation. São pacotes JavaScript/Hermes, não instaladores nativos.
- Prévia web validada em 390 × 844 no tema escuro e 320 × 740 no tema claro: ativar o plano de esperança, concluir/desmarcar um capítulo, navegar entre leituras, recarregar e retomar pela Home, pausar/retomar, paginar o plano anual e abrir uma etapa com quatro capítulos de dois livros. As quatro abas foram mantidas e não houve erros no console.

## Validação no Expo Go

1. Abra ou recarregue o app e toque em Planos de leitura na Home.
2. Escolha 7 dias de esperança, toque em Começar este plano e depois em Continuar plano.
3. Leia Salmos 23 e, no final, toque em Concluir capítulo no plano.
4. Volte à Home. Continuar meu plano deve abrir Salmos 121, no dia 2.
5. Reabra o app e confira o progresso. Teste também Pausar plano e Retomar este plano.
6. Para desfazer uma marcação, reabra o capítulo pelo plano e use Marcar capítulo como pendente.
7. Confira os temas claro/escuro e a leitura sem internet após o app estar carregado.

O teste nativo em Android/iOS e em modo avião no aparelho fica para o usuário. Nenhum push foi realizado.

## Arquivos alterados ou criados

- docs/READING-PLANS.md
- scripts/reading-plans.test.cjs
- src/app/_layout.tsx
- src/app/chapter.tsx
- src/app/index.tsx
- src/app/profile.tsx
- src/app/reading-plan-day.tsx
- src/app/reading-plan.tsx
- src/app/reading-plans.tsx
- src/app/studies.tsx
- src/components/chapter-navigation.tsx
- src/components/chapter-plan-progress.tsx
- src/components/plan-progress.tsx
- src/components/plan-resume.tsx
- src/data/reading-plans.ts
- src/hooks/use-reading-plans.ts
- src/services/reading-plan-repository.ts
- src/services/reading-plans.ts
