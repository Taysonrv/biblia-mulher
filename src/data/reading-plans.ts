import { bibleBooks, type ChapterReference } from './bible-catalog';

export interface PlanDay { day: number; title: string; readings: readonly ChapterReference[] }
export interface ReadingPlan { id: string; title: string; description: string; rhythm: string; days: readonly PlanDay[] }
const hope: PlanDay[] = [
  { day: 1, title: 'Cuidado e confiança', readings: [{ book: 'Salmos', chapter: 23 }] },
  { day: 2, title: 'Socorro na caminhada', readings: [{ book: 'Salmos', chapter: 121 }] },
  { day: 3, title: 'Esperança renovada', readings: [{ book: 'Isaías', chapter: 40 }] },
  { day: 4, title: 'Descanso em Jesus', readings: [{ book: 'Mateus', chapter: 11 }] },
  { day: 5, title: 'Paz em meio à preocupação', readings: [{ book: 'Filipenses', chapter: 4 }] },
  { day: 6, title: 'Amor que permanece', readings: [{ book: 'Romanos', chapter: 8 }] },
  { day: 7, title: 'A esperança da restauração', readings: [{ book: 'Apocalipse', chapter: 21 }] },
];
const canonical = bibleBooks.flatMap(book => Array.from({ length: book.chapters }, (_, index) => ({ book: book.name, chapter: index + 1 })));
export const readingPlans: readonly ReadingPlan[] = [
  { id: 'hope-7-v1', title: '7 dias de esperança', description: 'Passagens sobre cuidado, descanso e esperança. Leia cada capítulo com seu contexto.', rhythm: '1 capítulo por etapa', days: hope },
  { id: 'john-21-v1', title: 'João em 21 dias', description: 'Conheça os sinais, os encontros e a mensagem de Jesus no Evangelho de João.', rhythm: '1 capítulo por etapa', days: Array.from({ length: 21 }, (_, index) => ({ day: index + 1, title: 'João ' + (index + 1), readings: [{ book: 'João', chapter: index + 1 }] })) },
  { id: 'bible-365-v1', title: 'Bíblia em 365 dias', description: 'Uma jornada pelos 66 livros, na ordem do catálogo, de Gênesis a Apocalipse.', rhythm: '3 a 4 capítulos por etapa', days: Array.from({ length: 365 }, (_, index) => ({ day: index + 1, title: 'Leitura da etapa ' + (index + 1), readings: canonical.slice(Math.floor(index * canonical.length / 365), Math.floor((index + 1) * canonical.length / 365)) })) },
];
export function getReadingPlan(id: string) { return readingPlans.find(plan => plan.id === id); }
export function getPlanDay(id: string, day: number) { return Number.isInteger(day) && day > 0 ? getReadingPlan(id)?.days[day - 1] : undefined; }
export function planChapterKey(day: number, book: string, chapter: number) { return day + ':' + book + ':' + chapter; }
export function planContains(id: string, day: number, book: string, chapter: number) {
  return !!getPlanDay(id, day)?.readings.some(item => item.book === book && item.chapter === chapter);
}
export function adjacentPlanReading(id: string, day: number, book: string, chapter: number, direction: -1 | 1) {
  if (!planContains(id, day, book, chapter)) return null;
  const readings = getReadingPlan(id)!.days.flatMap(step => step.readings.map(item => ({ day: step.day, ...item })));
  const index = readings.findIndex(item => item.day === day && item.book === book && item.chapter === chapter);
  return readings[index + direction] ?? null;
}
export function planSummary(plan: ReadingPlan, completed: readonly string[]) {
  const done = new Set(completed);
  let chaptersDone = 0; let daysDone = 0; let next: { day: number; book: string; chapter: number } | null = null;
  for (const day of plan.days) {
    let complete = true;
    for (const reading of day.readings) {
      if (done.has(planChapterKey(day.day, reading.book, reading.chapter))) chaptersDone++;
      else { complete = false; next ??= { day: day.day, ...reading }; }
    }
    if (complete) daysDone++;
  }
  const total = plan.days.reduce((sum, day) => sum + day.readings.length, 0);
  return { chaptersDone, daysDone, total, percent: Math.floor(chaptersDone * 100 / total), next };
}
