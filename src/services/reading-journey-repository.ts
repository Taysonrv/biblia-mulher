import { validChapter } from '../data/bible-catalog';

export interface ChapterVisit { book: string; chapter: number; visitedAt: number }
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export const JOURNEY_KEY = '@biblia-smart/reading-history/v1';
export const HISTORY_LIMIT = 100;

export function createJourneyRepository(storage: Storage, now: () => number = Date.now) {
  let queue: Promise<unknown> = Promise.resolve();
  async function readStored(): Promise<ChapterVisit[]> {
    const raw = await storage.getItem(JOURNEY_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || parsed.translation !== 'almeida-1911' || !Array.isArray(parsed.entries) || parsed.entries.length > HISTORY_LIMIT) throw Error('Histórico inválido.');
    const seen = new Set<string>();
    let previousTime = Infinity;
    for (const item of parsed.entries) {
      if (!item || !validChapter(item.book, item.chapter) || !Number.isSafeInteger(item.visitedAt) || item.visitedAt <= 0 || item.visitedAt > 8.64e15 || item.visitedAt > previousTime) throw Error('Histórico inválido.');
      const key = item.book + ':' + item.chapter;
      if (seen.has(key)) throw Error('Capítulo duplicado no histórico.');
      seen.add(key); previousTime = item.visitedAt;
    }
    return parsed.entries;
  }
  function record(book: string, chapter: number): Promise<ChapterVisit[]> {
    const task = queue.then(async () => {
      if (!validChapter(book, chapter)) throw Error('Capítulo inválido.');
      const entries = await readStored();
      const visitedAt = Math.max(now(), (entries[0]?.visitedAt ?? 0) + 1);
      if (!Number.isSafeInteger(visitedAt) || visitedAt <= 0 || visitedAt > 8.64e15) throw Error('Data inválida.');
      const result = [{ book, chapter, visitedAt }, ...entries.filter(item => item.book !== book || item.chapter !== chapter)].slice(0, HISTORY_LIMIT);
      await storage.setItem(JOURNEY_KEY, JSON.stringify({ version: 1, translation: 'almeida-1911', entries: result }));
      return result;
    });
    queue = task.catch(() => undefined);
    return task;
  }
  return { read: async () => { await queue; return readStored(); }, record };
}
