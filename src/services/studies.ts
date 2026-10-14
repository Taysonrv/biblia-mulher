import bookSource from '../data/book-studies.json';
import wordSource from '../data/word-studies.json';
export interface StudySource { label: string; url: string }
export interface BookStudy {
  id: string; name: string; chapters: number; testament: 'Antigo' | 'Novo'; genre: string;
  author: string; date: string; message: string; outline: { title: string; range: string }[];
  reflection: string; sources: StudySource[];
}
export type WordLanguage = 'Hebraico' | 'Grego' | 'Aramaico';
export interface WordStudy {
  id: string; language: WordLanguage; original: string; transliteration: string; strong: string;
  title: string; meaning: string; note: string; reflection: string; source: StudySource; lexiconUrl: string;
  example: { book: string; chapter: number; verse: number; context: string };
}
export const bookStudies = bookSource as BookStudy[];
export const wordStudies = wordSource as WordStudy[];
export function normalizeStudyQuery(value: string) { return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim(); }
export function getBookStudy(value: string) { const query = normalizeStudyQuery(value); return bookStudies.find(book => normalizeStudyQuery(book.id) === query || normalizeStudyQuery(book.name) === query); }
export function getWordStudy(value: string) { return wordStudies.find(word => word.id === value); }
export function searchBooks(query: string, testament = 'Todos') {
  const search = normalizeStudyQuery(query);
  return bookStudies.filter(book => (testament === 'Todos' || book.testament === testament) && normalizeStudyQuery([book.name, book.genre, book.author, book.message].join(' ')).includes(search));
}
export function searchWords(query: string, language = 'Todos') {
  const search = normalizeStudyQuery(query);
  return wordStudies.filter(word => (language === 'Todos' || word.language === language) && normalizeStudyQuery([word.id, word.original, word.transliteration, word.strong, word.title, word.meaning].join(' ')).includes(search));
}
export function wordsForBook(name: string) { return wordStudies.filter(word => word.example.book === name); }
