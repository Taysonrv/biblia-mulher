import source from './almeida-1911.json';
import { getBibleBook, validChapter } from './bible-catalog';
const chapters: Record<string, Record<string, readonly string[]>> = source;
export const translation = 'Almeida 1911';
export function chapterTranslation(book: string, chapter: number) { return translation + (book === 'Salmos' && chapter === 23 ? ' • ortografia atualizada' : ' • grafia original'); }
export const psalm23 = source.Salmos['23'];
export interface BibleTextProvider { getChapter(book: string, chapter: number): readonly string[] | null }
export const bibleTextProvider: BibleTextProvider = {
  getChapter: (book, chapter) => validChapter(book, chapter) ? chapters[book]?.[String(chapter)] ?? null : null,
};
export function availableChapters(book: string) { const meta = getBibleBook(book); return meta ? Array.from({ length: meta.chapters }, (_, index) => index + 1) : []; }
export function validReference(book: string, chapter: number, verse: number) { const text = bibleTextProvider.getChapter(book, chapter); return !!text && Number.isInteger(verse) && verse >= 1 && verse <= text.length; }
export function verseKey(verse: number, book = 'Salmos', chapter = 23) { return book + ':' + chapter + ':' + verse; }
export function verseReference(verse: number, book = 'Salmos', chapter = 23) { return book + ' ' + chapter + ':' + verse; }
