import { bibleBooks, getBibleBook } from '../data/bible-catalog';
import { bibleTextProvider, verseReference } from '../data/bible-text';
import { normalizeBibleSearch, parseBibleReference, SearchInputError, type SearchTestament } from './bible-search';
import type { ReadingEntry } from './reading-repository';
export interface SavedLibraryRequest {
  notes: boolean; query: string; testament: SearchTestament; book: string; order: 'Ordem da Bíblia' | 'Ordem salva';
}
export interface SavedItem { entry: ReadingEntry; text: string }
export function savedBooks(entries: readonly ReadingEntry[], notes: boolean, testament: SearchTestament = 'Todos') {
  const names = new Set(entries.filter(entry => notes ? !!entry.note : entry.favorite).map(entry => entry.book));
  return bibleBooks.filter(book => names.has(book.name) && (testament === 'Todos' || book.testament === testament)).map(book => book.name);
}
export function searchSavedLibrary(entries: readonly ReadingEntry[], request: SavedLibraryRequest): SavedItem[] {
  if (typeof request.query !== 'string' || request.query.trim().length > 120) throw new SearchInputError('Use uma busca de até 120 caracteres.');
  if (!['Todos', 'Antigo', 'Novo'].includes(request.testament) || !['Ordem da Bíblia', 'Ordem salva'].includes(request.order) || (request.book && !getBibleBook(request.book))) throw new SearchInputError('Confira os filtros da sua coleção.');
  const query = request.query.trim(); const normalized = normalizeBibleSearch(query);
  if (query && !normalized) throw new SearchInputError('Digite uma palavra ou referência, como João 3:16.');
  const reference = query ? parseBibleReference(query, { unknownBookAsText: true }) : null;
  const tokens = normalized ? [...new Set(normalized.split(' '))] : [];
  const items = entries.filter(entry => (request.notes ? !!entry.note : entry.favorite)
    && (!request.book || request.book === entry.book)
    && (request.testament === 'Todos' || getBibleBook(entry.book)?.testament === request.testament));
  const result: SavedItem[] = [];
  for (const entry of items) {
    const text = bibleTextProvider.getChapter(entry.book, entry.chapter)?.[entry.verse - 1] ?? '';
    if (reference) {
      if (entry.book !== reference.book.name || entry.chapter !== reference.chapter || entry.verse < reference.first || entry.verse > reference.last) continue;
    } else if (tokens.length) {
      const searchable = ' ' + normalizeBibleSearch(verseReference(entry.verse, entry.book, entry.chapter) + ' ' + text + ' ' + entry.note) + ' ';
      if (!tokens.every(token => searchable.includes(' ' + token + ' '))) continue;
    }
    result.push({ entry, text });
  }
  if (request.order === 'Ordem da Bíblia') {
    const rank = new Map(bibleBooks.map((book, index) => [book.name, index]));
    result.sort((left, right) => (rank.get(left.entry.book)! - rank.get(right.entry.book)!) || left.entry.chapter - right.entry.chapter || left.entry.verse - right.entry.verse);
  }
  return result;
}
export function savedLibraryPage(items: readonly SavedItem[], page: number, size = 20) {
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) return [];
  return items.slice(page * size, (page + 1) * size);
}
