import source from './bible-catalog.json';
export interface BibleBook { name: string; chapters: number; testament: 'Antigo' | 'Novo' }
export interface ChapterReference { book: string; chapter: number }
export const bibleBooks: readonly BibleBook[] = source as BibleBook[];
export function getBibleBook(name: string) { return bibleBooks.find(book => book.name === name); }
export function validChapter(book: string, chapter: number) {
  const meta = getBibleBook(book);
  return !!meta && Number.isInteger(chapter) && chapter >= 1 && chapter <= meta.chapters;
}
export function adjacentChapter(book: string, chapter: number, direction: -1 | 1): ChapterReference | null {
  if (!validChapter(book, chapter)) return null;
  const index = bibleBooks.findIndex(item => item.name === book);
  const next = chapter + direction;
  if (next >= 1 && next <= bibleBooks[index].chapters) return { book, chapter: next };
  const neighbor = bibleBooks[index + direction];
  return neighbor ? { book: neighbor.name, chapter: direction === 1 ? 1 : neighbor.chapters } : null;
}
