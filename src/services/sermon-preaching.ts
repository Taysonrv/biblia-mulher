import { validateOutline, SERMON_LIMITS } from './sermon-repository';
import { buildLocalOutline, type SermonOutline } from './sermon';
import { preachingPassages } from './preaching-passages';

// Local composition, not a remote AI service: preserve supplied content and add speaking transitions.
function paragraph(before: string, supplied: string, after = '') {
  const result = [before, supplied, after].filter(Boolean).join('\n\n');
  // Never cut the preacher's own material to fit a generated transition.
  return result.length <= SERMON_LIMITS.body ? result : supplied;
}
export function buildPreachingDraft(source: SermonOutline): SermonOutline {
  const outline = validateOutline(source);
  if (outline.manuscript !== undefined) throw Error('Esta mensagem já é um texto completo. Edite o conteúdo ou abra a apresentação.');
  const scaffold = buildLocalOutline(outline.theme);
  const passage = outline.baseText === scaffold.baseText ? preachingPassages.find(item => scaffold.baseText.startsWith(item.base)) : undefined;
  // Develop only untouched built-in scaffold fields. The preacher's edited text always wins.
  const developed = {
    introduction: passage && outline.introduction === scaffold.introduction ? passage.introduction : outline.introduction,
    points: outline.points.map((point, index) => ({ ...point, body: passage && point.body === scaffold.points[index].body && point.title === scaffold.points[index].title ? passage.points[index] : point.body })),
    application: passage && outline.application === scaffold.application ? passage.application : outline.application,
    conclusion: passage && outline.conclusion === scaffold.conclusion ? passage.conclusion : outline.conclusion,
  };
  const transitions = [
    'Vamos começar pelo primeiro movimento desta mensagem. Acompanhemos com atenção o que o texto nos apresenta.',
    'Guardando esse primeiro ponto, avancemos. A reflexão continua e nos convida a olhar com atenção para o próximo aspecto.',
    'Chegamos ao terceiro ponto. Vamos reunir o que ouvimos até aqui e considerar como responder a essa mensagem.',
  ];
  const applications = [
    'Pensemos em uma situação hipotética: alguém percebe que sua maneira de responder em casa não combina com aquilo que afirma crer. Em vez de esperar uma grande oportunidade, essa pessoa decide começar pela próxima conversa: ouvir antes de responder, reconhecer sua responsabilidade e agir com mais cuidado. A aplicação da Palavra pode começar assim, em uma atitude pequena e concreta. Ao considerar este primeiro ponto, qual passo está ao nosso alcance hoje? Não precisamos controlar a resposta de todos; podemos assumir com responsabilidade a nossa própria resposta.',
    'Também precisamos observar o que nos impede de praticar o que compreendemos. Pode ser a pressa, o orgulho ou o receio de mudar um hábito. Reconhecer uma dificuldade não é desistir da caminhada; é perceber onde precisamos de atenção, oração e ajuda. Pense em uma decisão real da sua semana e examine se este ensino modifica a forma de enfrentá-la. Nem toda dificuldade terá solução imediata. Ainda assim, podemos buscar uma atitude coerente com a fé, sem esconder os problemas e sem exigir de outra pessoa aquilo que não estamos dispostos a examinar em nós.',
    'Uma reflexão amadurece quando se transforma em prática acompanhada. Podemos escolher um compromisso possível, lembrar dele durante a semana e depois avaliar o que aconteceu. Se falharmos, a resposta não precisa ser fingir que nada houve: podemos reconhecer o erro, procurar orientação e recomeçar com responsabilidade. Este terceiro ponto nos convida a reunir o que aprendemos e perguntar como isso alcança nossos relacionamentos e escolhas. Guardemos uma atitude concreta para praticar, sem confundir uma emoção deste momento com toda a transformação que ainda precisa ser vivida.',
  ];
  return validateOutline({
    ...outline,
    introduction: paragraph(`Irmãos e irmãs, que este seja um momento de atenção à Palavra e de reflexão sobre a nossa caminhada. Hoje vamos conversar sobre “${outline.theme}”.`, developed.introduction),
    points: developed.points.map((point, index) => ({ ...point, body: paragraph(transitions[index], paragraph('', point.body, applications[index]),
      'Antes de prosseguir, façamos uma pausa e pensemos: ' + outline.questions[Math.min(index, outline.questions.length - 1)]) })),
    application: paragraph('Depois de percorrer esses pontos, voltemos a atenção para a nossa própria vida. Que resposta podemos dar ao que acabamos de considerar?', developed.application),
    conclusion: paragraph(`Ao encerrar nossa reflexão sobre “${outline.theme}”, retomemos o caminho desta mensagem: ${outline.points.map(point => point.title).join('; ')}.`, developed.conclusion,
      'Que esta reflexão continue durante a semana, acompanhada de oração, estudo da passagem e disposição para colocar em prática o que aprendemos.'),
  });
}
export function preachingWordCount(outline: SermonOutline) {
  const text = outline.manuscript ?? [outline.introduction, ...outline.points.map(point => point.body), outline.application, outline.conclusion].join(' ');
  return text.trim().split(/\s+/).filter(Boolean).length;
}
