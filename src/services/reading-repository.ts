import { validReference, verseKey } from '../data/bible-text';
export interface ReadingEntry { book: string; chapter: number; verse: number; favorite: boolean; note: string }
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
// Preserve the existing key; version 1 is migrated only after a successful mutation.
export const READING_KEY = '@biblia-mulher/reading/v1';
export function createReadingRepository(storage: Storage) {
  let queue: Promise<unknown> = Promise.resolve();
  async function read(): Promise<ReadingEntry[]> {
    const raw = await storage.getItem(READING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (![1, 2].includes(parsed?.version) || !Array.isArray(parsed.entries)) throw new Error('Dados de leitura inválidos.');
    const entries: ReadingEntry[] = parsed.entries.map((entry: ReadingEntry) => parsed.version === 1 ? { ...entry, book: 'Salmos', chapter: 23 } : entry);
    const seen = new Set<string>();
    for (const entry of entries) {
      if (!entry || !validReference(entry.book, entry.chapter, entry.verse) || typeof entry.favorite !== 'boolean' || typeof entry.note !== 'string' || entry.note.length > 2000) throw new Error('Dados de leitura inválidos.');
      const key = verseKey(entry.verse, entry.book, entry.chapter);
      if (seen.has(key)) throw new Error('Referência duplicada.');
      seen.add(key);
    }
    return entries;
  }
  function update(verse: number, book: string, chapter: number, change: (entry: ReadingEntry) => ReadingEntry) {
    const task = queue.then(async () => {
      if (!validReference(book, chapter, verse)) throw new Error('Versículo inválido.');
      const entries = await read();
      const key = verseKey(verse, book, chapter);
      const next = change(entries.find(entry => verseKey(entry.verse, entry.book, entry.chapter) === key) ?? { book, chapter, verse, favorite: false, note: '' });
      if (next.note.length > 2000) throw new Error('A anotação deve ter até 2.000 caracteres.');
      const result = entries.filter(entry => verseKey(entry.verse, entry.book, entry.chapter) !== key);
      if (next.favorite || next.note) result.push(next);
      await storage.setItem(READING_KEY, JSON.stringify({ version: 2, translation: 'almeida-1911', entries: result }));
      return result;
    });
    queue = task.catch(() => undefined);
    return task;
  }
  return {
    read: async () => { await queue; return read(); },
    toggleFavorite: (verse: number, book = 'Salmos', chapter = 23) => update(verse, book, chapter, entry => ({ ...entry, favorite: !entry.favorite })),
    setFavorite: (verse: number, favorite: boolean, book = 'Salmos', chapter = 23) => update(verse, book, chapter, entry => {
      if (typeof favorite !== 'boolean') throw new Error('Favorito inválido.');
      return { ...entry, favorite };
    }),
    saveNote: (verse: number, note: string, book = 'Salmos', chapter = 23) => update(verse, book, chapter, entry => ({ ...entry, note: note.trim() })),
  };
}
