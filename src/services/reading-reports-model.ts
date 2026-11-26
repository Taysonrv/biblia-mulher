import { validChapter } from '../data/bible-catalog';
export interface ReadingDay { date: string; chapters: string[] }
export interface ReportData { version: 1; startedAt: number; days: ReadingDay[] }
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export const REPORT_KEY = '@biblia-smart/reading-reports/v1';
export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function decodeReport(raw: string | null): ReportData | null {
  if (raw === null) return null;
  if (raw.length > 12000000) throw Error('Relatório inválido.');
  const value = JSON.parse(raw) as ReportData;
  if (value.version !== 1 || !Number.isSafeInteger(value.startedAt) || value.startedAt <= 0 || !Array.isArray(value.days) || value.days.length > 400) throw Error('Relatório inválido.');
  const seen = new Set<string>();
  for (const day of value.days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || localDay(new Date(day.date + 'T12:00:00')) !== day.date || seen.has(day.date) || !Array.isArray(day.chapters) || day.chapters.length < 1 || day.chapters.length > 1189 || new Set(day.chapters).size !== day.chapters.length) throw Error('Relatório inválido.');
    seen.add(day.date);
    for (const key of day.chapters) { if (typeof key !== 'string') throw Error('Relatório inválido.'); const [book, chapter] = key.split(':'); if (!validChapter(book, Number(chapter))) throw Error('Relatório inválido.'); }
  }
  return value;
}
export function createReportsRepository(storage: Storage, now: () => number = Date.now) {
  let queue: Promise<unknown> = Promise.resolve();
  async function stored() { return decodeReport(await storage.getItem(REPORT_KEY)); }
  return {
    async read() { await queue; return stored(); },
    record(book: string, chapter: number) {
      const task = queue.then(async () => {
        if (!validChapter(book, chapter)) throw Error('Capítulo inválido.');
        const time = now(); const date = localDay(new Date(time));
        const data = await stored() ?? { version: 1 as const, startedAt: time, days: [] };
        const cutoff = new Date(time); cutoff.setDate(cutoff.getDate() - 399);
        data.days = data.days.filter(day => day.date >= localDay(cutoff));
        let day = data.days.find(item => item.date === date);
        if (!day) { day = { date, chapters: [] }; data.days.push(day); }
        const key = book + ':' + chapter;
        if (!day.chapters.includes(key)) day.chapters.push(key);
        data.days.sort((a, b) => a.date.localeCompare(b.date));
        await storage.setItem(REPORT_KEY, JSON.stringify(data));
      });
      queue = task.catch(() => undefined); return task;
    },
  };
}
export function summarizeReports(data: ReportData | null, now = new Date()) {
  const today = localDay(now); const month = today.slice(0, 7);
  const days = (data?.days ?? []).filter(day => day.date <= today);
  const current = days.filter(day => day.date.startsWith(month));
  const unique = new Set(current.flatMap(day => day.chapters));
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1, 12);
    const key = localDay(date).slice(0, 7);
    return { key, label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), total: days.filter(day => day.date.startsWith(key)).reduce((sum, day) => sum + day.chapters.length, 0) };
  });
  return { activeDays: current.filter(day => day.chapters.length > 0).length, elapsedDays: now.getDate(), uniqueChapters: unique.size, months, total: current.reduce((sum, day) => sum + day.chapters.length, 0) };
}
