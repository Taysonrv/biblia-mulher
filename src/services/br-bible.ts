import source from '../data/biblia-livre-2018.json';
import type { OnlineBook, OnlineChapter } from './online-bible';
const text: Record<string, Record<string, readonly string[]>> = source.text;
export const brBible = {
  async books(): Promise<OnlineBook[]> { return source.books; },
  async chapter(book: OnlineBook, number: number): Promise<OnlineChapter> {
    const verses = Number.isInteger(number) ? text[book.id]?.[String(number)] : null;
    if (!verses) throw Error('Escolha um capítulo válido.');
    return { book, number, verses: verses.map((value, index) => ({ number: index + 1, text: value })) };
  },
};
