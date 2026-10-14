export const MAX_SERMON_INPUT = 300;
export type SermonOutline = {
  theme: string;
  baseText: string;
  introduction: string;
  points: { title: string; body: string }[];
  application: string;
  conclusion: string;
  references: string[];
  questions: string[];
};
export interface SermonProvider {
  generate(input: string): Promise<SermonOutline>;
}

type Topic = {
  keywords: string[];
  base: string;
  focus: string;
  points: [string, string, string];
  references: string[];
};
const topics: Topic[] = [
  { keywords: ['salmo 23', 'salmos 23', 'cuidado', 'pastor'],
    base: 'Salmos 23:1–6', focus: 'o cuidado de Deus em cada etapa da caminhada',
    points: ['O Pastor conduz e restaura (vv. 1–3)', 'Sua presença sustenta no vale (v. 4)', 'Sua bondade acompanha a caminhada (vv. 5–6)'],
    references: ['João 10:11–15', 'Isaías 40:11'] },
  { keywords: ['amor', 'joao 3:16', 'joao 3.16'],
    base: 'João 3:16–21', focus: 'o amor de Deus revelado em Jesus',
    points: ['Deus toma a iniciativa de amar (v. 16)', 'Jesus vem para salvar (v. 17)', 'A resposta da fé se expressa na luz (vv. 18–21)'],
    references: ['1 João 4:7–12', 'Romanos 5:8'] },
  { keywords: ['perdao', 'reconciliacao', 'reconciliar'],
    base: 'Efésios 4:25–32', focus: 'o perdão que transforma nossos relacionamentos',
    points: ['Abandonar atitudes que ferem (vv. 25–29)', 'Reconhecer a amargura e seus frutos (vv. 30–31)', 'Perdoar à luz da graça recebida (v. 32)'],
    references: ['Colossenses 3:12–15', 'Mateus 18:21–35'] },
  { keywords: ['oracao', 'ansiedade', 'paz', 'filipenses 4'],
    base: 'Filipenses 4:4–9', focus: 'a oração e a paz de Deus em meio às preocupações',
    points: ['Cultivar alegria e gentileza (vv. 4–5)', 'Apresentar preocupações com gratidão (vv. 6–7)', 'Orientar pensamentos e práticas pelo bem (vv. 8–9)'],
    references: ['Mateus 6:25–34', '1 Pedro 5:6–7'] },
  { keywords: ['fe', 'confianca', 'esperanca', 'coragem'],
    base: 'Hebreus 11:1–6', focus: 'a confiança em Deus mesmo quando não vemos todo o caminho',
    points: ['A fé olha além do que é visível (vv. 1–3)', 'A fé se expressa na vida cotidiana (vv. 4–5)', 'A fé busca a Deus e confia em seu caráter (v. 6)'],
    references: ['Provérbios 3:5–6', 'Romanos 15:13'] },
  { keywords: ['servir', 'servico', 'ministerio', 'chamado'],
    base: 'Marcos 10:35–45', focus: 'o serviço inspirado no exemplo de Jesus',
    points: ['Reconhecer a busca por posição (vv. 35–40)', 'Rever a ideia de grandeza (vv. 41–44)', 'Servir seguindo o exemplo de Jesus (v. 45)'],
    references: ['1 Pedro 4:10–11', 'Filipenses 2:3–8'] },
];
export function normalizeSermonInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ').slice(0, MAX_SERMON_INPUT);
}
export function buildLocalOutline(input: string): SermonOutline {
  const theme = normalizeSermonInput(input);
  if (!theme) throw new Error('Informe um tema ou uma passagem para continuar.');
  const normalized = theme.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const matches = (keyword: string) => new RegExp('(^|[^a-z0-9])' + keyword + '($|[^a-z0-9])').test(normalized);
  // Known passages take precedence over broad theme keywords.
  const topic = topics.find(t => t.keywords.some(k => /\d/.test(k) && matches(k)))
    ?? topics.find(t => t.keywords.some(k => matches(k)));
  const passage = /^(?:[1-3]\s*)?[\p{L}\s]+\s+\d+(?::\d+(?:\s*[-–]\s*\d+)?)?$/u.test(theme);
  // Unknown passages use a study scaffold: do not invent their meaning or verse text.
  if (!topic || (passage && !topic.keywords.some(k => /\d/.test(k) && matches(k)))) {
    return {
      theme,
      baseText: passage ? theme : 'Texto-base a escolher após estudar o tema no contexto bíblico.',
      introduction: `Apresente “${theme}” a partir de uma situação cotidiana e da pergunta que a comunidade precisa enfrentar. Leia a passagem escolhida e situe autor, destinatários e contexto antes de desenvolver a mensagem.`,
      points: [
        { title: '1. Observar o texto', body: 'Identifique personagens, repetições e a ideia central. Explique o que o texto diz com apoio dos versículos, sem retirar frases do contexto.' },
        { title: '2. Compreender a mensagem', body: `Relacione o ensino da passagem com “${theme}”. Distinga o contexto original da aplicação atual e confirme suas conclusões no restante das Escrituras.` },
        { title: '3. Responder com uma prática', body: 'Escolha uma atitude concreta coerente com a passagem. Use um exemplo da vida diária e mostre como a comunidade pode colocar esse ensino em prática.' },
      ],
      application: 'Convide cada pessoa a registrar uma atitude para a semana e a conversar com alguém de confiança sobre esse compromisso.',
      conclusion: 'Retome a ideia central da passagem, resuma os três pontos e encerre com uma oração alinhada ao texto estudado.',
      references: ['2 Timóteo 3:16–17 — estudo das Escrituras', 'Tiago 1:22–25 — ouvir e praticar'],
      questions: ['Qual é a ideia central da passagem em seu contexto?', `Como o texto ilumina o tema “${theme}”?`, 'Qual resposta prática ele pede de nós?'],
    };
  }
  return {
    theme, baseText: `${topic.base} (sugestão para estudo)`,
    introduction: `Comece com uma situação cotidiana relacionada a “${theme}”. Leia ${topic.base} e apresente seu contexto. A mensagem pode explorar ${topic.focus}.`,
    points: topic.points.map((title, index) => ({
      title: `${index + 1}. ${title}`,
      body: [
        'Leia os versículos indicados e explique a ideia em seu contexto. Pergunte o que eles revelam sobre Deus e como isso orienta nossa compreensão do tema.',
        'Desenvolva o contraste ou o desafio apresentado no texto. Use uma situação cotidiana e mostre como esse ensino orienta nossa resposta.',
        'Conecte o ensino a uma atitude concreta para a semana. Convide a comunidade a responder com fé e responsabilidade, sem prometer resultados que a passagem não afirma.',
      ][index],
    })),
    application: `À luz de ${topic.base}, convide cada pessoa a escolher uma atitude que expresse ${topic.focus}. Reserve um momento para reflexão e oração.`,
    conclusion: `Retome “${theme}”, relembre os três movimentos do texto e encoraje a comunidade a praticar o que aprendeu. Termine com uma oração inspirada na passagem.`,
    references: topic.references,
    questions: ['O que esta passagem revela sobre o caráter de Deus?', 'Que atitude ou pensamento preciso rever à luz do texto?', 'Como posso viver esse ensino em um relacionamento nesta semana?'],
  };
}
// Replace this provider with a server-backed implementation when AI is introduced.
// Credentials belong on that server, never in the mobile app.
export const sermonProvider: SermonProvider = {
  async generate(input) { return buildLocalOutline(input); },
};
