# Bíblia Livre online — AO Lab

Aba Bíblia > Bíblia Livre online. Recurso gratuito de consulta de livros/capítulos em português, com navegação anterior/próximo e busca por nome do livro. Não requer chave, servidor próprio nem faturamento Firebase.

Tradução habilitada: por_blj (Bíblia Livre), 66 livros. Créditos: Bíblia Livre, fevereiro de 2018, © Diego Santos, Mario Sérgio e Marco Teles, licença Creative Commons Atribuição 4.0. Fonte e metadados: https://ebible.org/Scriptures/details.php?id=porbr2018 . Crédito e acesso à licença são exibidos na tela. Texto dos versículos preservado; notas de rodapé e títulos editoriais não são apresentados. As fixtures de teste scripts/fixtures/online-bible-*.json são provenientes da mesma fonte e licença, obtidas pela API AO Lab.

API: https://bible.helloao.org/api/por_blj/books.json e /{BOOK}/{CHAPTER}.simple.json . Documentação: https://bible.helloao.org/docs/guide/making-requests.html . O catálogo geral contém outras traduções, mas elas não são habilitadas automaticamente sem revisão da licença.

Rede: requisições GET diretas ao domínio bible.helloao.org, timeout de 12 segundos e validação de formato, tradução, licença, identidade do capítulo e ordem dos versículos. Não são enviados tokens Firebase, anotações ou favoritos. Como em qualquer consulta direta, o serviço recebe os dados técnicos da conexão e a referência solicitada; incluir a integração na política de privacidade antes de publicar.

O catálogo e até 8 capítulos consultados ficam em memória apenas durante a sessão, sem download integral nem cache persistente. Portanto, esta versão não é anunciada como Bíblia offline. A Almeida 1911 local continua como leitor principal, com favoritos, notas, histórico e voz existentes; a leitura online é uma consulta separada, sem gravar nesses módulos. Não há áudio gravado, referências cruzadas, compartilhamento formatado ou integração de favoritos para essa tradução nesta etapa.

As condições de disponibilidade do serviço público podem mudar; falhas permitem tentar novamente ou voltar ao leitor offline. Nenhuma mudança de regras Firestore, dados pessoais, chave Gemini ou assinatura foi necessária.

Validação concluída: 296 testes passaram; TypeScript e Expo lint passaram. Consulta real pela prévia web em 390x844: catálogo de 66 livros, Salmos 23, avanço para Salmos 24 e retorno. Falta validação no Android físico. Não houve autenticação, envio de dados pessoais ou chamada ao Firebase nesta integração.
