# Estado atual do hinário — 28/10/2026

Seleção ampliada para **11 letras offline: 7 de louvor e 4 cívicas**. Louvor: 15, 47, 59, 126, 187, 198 e 578. Apêndice cívico: 637–640. Filtros Todos/Louvor/Cívicos separam as categorias. Esta contagem descreve o conteúdo incluído, não o total de hinos elegíveis na Harpa.

Fonte das novas transcrições fixada na revisão e8ff5ca2f9c9e7d9892c0c68f2ad45eea3273127. Metadados e fontes individuais em docs/HARPA-BATCH-2026-10-28.json. Inventário técnico das 640 entradas, marcações de pendência e seis correções editoriais em docs/HARPA-REVIEW.json. As demais entradas não foram classificadas automaticamente como protegidas ou livres.

Não entraram nesta rodada 4, 328, 390, 533 e 581, por tradução, atribuição ou redação ainda pendente. O relatório não equivale à revisão autoral completa dos 640 registros. A conclusão de domínio público de cada entrada incluída se limita ao texto tradicional e ao Brasil; conferir países adicionais antes da distribuição internacional.

Validação: quatro testes do hinário, TypeScript e Expo lint passaram. Prévia em 390×844 confirmou 7 entradas no filtro Louvor e 4 em Cívicos. Não houve compra, publicação de APK ou alteração de dados pessoais. Conferência Android físico pendente.

## Histórico das entregas iniciais

# Hinário — seleção inicial em 27/10/2026

Incluído leitor gratuito e offline em Perfil → Harpa Cristã e Apoio ministerial → Harpa Cristã. Busca por número exato (inclusive zeros à esquerda) ou parte do título, ignorando acentos; leitura por estrofes e ajuste de fonte de 16 a 32. Nenhum áudio, cifra, arranjo, ilustração ou comentário de terceiros foi incorporado. Sem nova dependência ou alteração dos dados pessoais.

## Conteúdo incluído

**Somente hino 126 — Bem-aventurança do Crente**, cinco estrofes. Não é a coleção completa. A numeração original foi preservada. A seleção é independente e não se apresenta como aplicativo oficial da CPAD.

- Letra original: Emil Gustafson (1862–1900). Versão em português: Frida Vingren (1891–1940).
- Agência Câmara, 16/10/2024: confirma as datas de Frida e a associação ao hino 126: https://www.camara.leg.br/noticias/1103353-entra-em-vigor-lei-que-cria-o-dia-nacional-da-musica-gospel/
- Pesquisa de Moab César Carvalho Costa, UNISINOS, identifica o original de Emil Gustafson (1862–1900) e a versão portuguesa por Frida: https://repositorio.jesuita.org.br/bitstream/handle/UNISINOS/6867/Moab%2BC%C3%A9sar%2BCarvalho%2BCosta_.pdf?sequence=1
- Texto tradicional conferido em https://aharpacristaonline.com.br/letras/126-bem-aventuranca-do-crente.html; apenas os versos, sem comentários, marca, organização de catálogo ou material gráfico do site.
- As duas primeiras estrofes também foram conferidas na p. 15 de Musicalidade Cristã (Leonardo Pereira, 2019): https://api.pageplace.de/preview/DT0400.3410002976703_A50743196/preview-3410002976703_A50743196.pdf . Não foi copiada prosa editorial desse livro.
- Fundamento da seleção: prazo geral brasileiro da Lei 9.610/1998, arts. 14 e 41. Com último falecimento em 1940, o prazo geral se encerrou ao final de 2010. Essa é uma conclusão derivada das fontes, não uma licença concedida pelo site consultado nem uma afirmação sobre todas as letras da Harpa. Revisão restrita ao Brasil; conferir os demais territórios antes de distribuir internacionalmente.

`src/data/harpa.json` registra as fontes e a análise por hino. O app apresenta créditos e links em Ver fontes e informações do texto. As letras ficam embarcadas; somente abrir uma fonte precisa de internet.

## Para ampliar

Conferir para cada texto: autor original e tradutor/adaptador, datas, versão efetivamente transcrita, eventuais revisões recentes e fundamento de domínio público ou autorização. Registrar documentação específica em rights e repetir a validação do catálogo. Não importar um arquivo completo só porque seu repositório de software anuncia MIT: isso não comprova os direitos sobre as letras.

## Verificação

`node --test scripts/harpa.test.cjs` valida busca, numeração e documentação de todas as entradas. Esses testes verificam integridade do catálogo e não substituem análise de direitos.

Não foram implementados favoritos do hinário, sincronização de hinos nem compra/licenciamento adicional. Nenhum dado do usuário foi enviado ou apagado.

Validação da entrega: os dois testes do hinário, TypeScript e Expo lint passaram. Prévia web conferida em 390×844: busca 00126, abertura das cinco estrofes, aumento da fonte e expansão das fontes. Captura disponível no workspace hymnal/harpa-leitura.jpg. Teste no Android físico ainda pendente. Nenhuma build foi publicada nesta etapa.

## Ampliação em 28/10/2026

Seleção atual: **2 hinos completos**, 15 (Conversão / Foi na cruz) e 126 (Bem-aventurança do Crente). O trecho anterior documenta a primeira entrega, quando havia apenas 126.

Para o hino 15, foram identificados Isaac Watts (1748), Ralph Erskine Hudson (1901) e o tradutor Henry Maxwell Wright (1931). A conclusão de domínio público no Brasil decorre do prazo geral aplicado ao último falecimento, encerrado ao final de 2001. Créditos conferidos em https://hymnary.org/hymn/CC1971/396 e https://www.luterano.org.br/lci-585-foi-na-cruz/ ; contexto em https://www.hinologia.org/hcc-293-foi-na-cruz/ .

A transcrição tradicional da entrada 15 do JSON DanielLiberato foi conferida. Somente essa entrada foi incorporada, após revisão individual; o uso não presume licença do repositório para todas as outras letras. O crédito Autor: que aparecia no final da última estrofe foi removido do corpo cantado e registrado nos metadados. A redação difere de variantes usadas em outros hinários, por isso o app não a apresenta como cópia da edição atual do Livro de Canto luterano.

O refrão é armazenado separado e mostrado após cada estrofe. A busca também aceita o título alternativo Foi na cruz. Três testes do hinário passaram, incluindo isolamento do crédito, numeração ordenada e busca pelo título alternativo. Não houve mudança de armazenamento pessoal nem publicação de build.
Verificação da ampliação: TypeScript e Expo lint passaram. Prévia web em 390×844 confirmou busca por Foi na cruz, quatro estrofes e quatro repetições do refrão, com créditos separados. Captura: hymnal/harpa-hino15.jpg no workspace. Conferência no Android físico ainda pendente.
