import { bibleBooks, getBibleBook, type BibleBook } from '../data/bible-catalog';
import { bibleTextProvider } from '../data/bible-text';

export type SearchMode = 'Todas as palavras' | 'Frase exata';
export type SearchTestament = 'Todos' | 'Antigo' | 'Novo';
export interface BibleSearchRequest { query: string; mode: SearchMode; testament: SearchTestament; book?: string }
export interface VerseMatch { book: string; chapter: number; verse: number; text: string }
export interface BibleSearchResult { query: string; reference: boolean; matches: VerseMatch[] }
export class SearchCancelled extends Error { constructor() { super('Busca cancelada.'); } }
export class SearchInputError extends Error {}
export function normalizeBibleSearch(value: string) { return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' '); }

const abbreviations: readonly string[] = [
  'gn gen', 'ex exo', 'lv lev', 'nm num', 'dt deut', 'js jos', 'jz', 'rt', '1sm', '2sm', '1rs', '2rs', '1cr', '2cr', 'ed esd', 'ne nee', 'et est', 'job',
  'sl sal salmo', 'pv pro', 'ec ecl', 'ct cant cantares cantico', 'is isa', 'jr jer', 'lm lam', 'ez eze', 'dn dan', 'os ose', 'jl', 'am', 'ob', 'jn jon', 'mq', 'na', 'hc hab', 'sf sof', 'ag', 'zc zac', 'ml mal',
  'mt mat', 'mc mar', 'lc luc', 'jo joao', 'at atos', 'rm rom', '1co', '2co', 'gl gal', 'ef efe', 'fp fil', 'cl col', '1ts', '2ts', '1tm', '2tm', 'tt tit', 'fm flm', 'hb heb', 'tg', '1pe', '2pe', '1jo', '2jo', '3jo', 'jd jud', 'ap apo',
];
const aliases = new Map<string, BibleBook>();
bibleBooks.forEach((book, index) => {
  for (const alias of abbreviations[index].split(' ')) aliases.set(alias, book);
});
aliases.set('canticosdoscanticos', getBibleBook('Cânticos')!);
aliases.set('canticodoscanticos', getBibleBook('Cânticos')!);
aliases.set('canticodesalomao', getBibleBook('Cânticos')!);
function resolveBook(value: string) {
  const raw = value.trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase();
  const exact = bibleBooks.find(book => book.name.normalize('NFC').toLowerCase() === raw);
  if (exact) return exact;
  const key = normalizeBibleSearch(value).replace(/\s/g, '');
  return aliases.get(key) ?? bibleBooks.find(book => normalizeBibleSearch(book.name).replace(/\s/g, '') === key);
}
interface Passage { book: BibleBook; chapter: number; first: number; last: number }
export function parseBibleReference(query: string, options: { unknownBookAsText?: boolean } = {}): Passage | null {
  const match = query.match(/^((?:[123]\s*)?[\p{L} .]+?)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?\s*$/u);
  if (!match) {
    if (/\d\s*[:.]|\d\s*[-–]\s*\d/u.test(query)) throw new SearchInputError('Referência inválida. Use, por exemplo, João 3:16 ou Salmos 23:1-3.');
    return null;
  }
  const book = resolveBook(match[1]);
  if (!book) {
    // Personal reflections can contain phrases such as "Plano 7" without being Bible references.
    if (options.unknownBookAsText && !/\d\s*[:.]|\d\s*[-–]\s*\d/u.test(query)) return null;
    throw new SearchInputError('Livro não reconhecido. Escreva o nome completo ou uma abreviação, como Sl ou Gn.');
  }
  const chapter = Number(match[2]);
  const text = bibleTextProvider.getChapter(book.name, chapter);
  if (!text) throw new SearchInputError('Esse capítulo não existe em ' + book.name + '.');
  const first = match[3] ? Number(match[3]) : 1; const last = match[4] ? Number(match[4]) : match[3] ? first : text.length;
  if (first < 1 || last < first || last > text.length) throw new SearchInputError('Confira os versículos: ' + book.name + ' ' + chapter + ' possui ' + text.length + '.');
  return { book, chapter, first, last };
}
export async function searchBible(request: BibleSearchRequest, options: { cancelled?: () => boolean; yieldWork?: () => Promise<void> } = {}): Promise<BibleSearchResult> {
  const check = () => { if (options.cancelled?.()) throw new SearchCancelled(); };
  check();
  if (typeof request.query !== 'string' || request.query.trim().length > 120) throw new SearchInputError('Use uma busca de até 120 caracteres.');
  if (!['Todas as palavras', 'Frase exata'].includes(request.mode) || !['Todos', 'Antigo', 'Novo'].includes(request.testament)) throw new SearchInputError('Confira os filtros da busca.');
  if (request.book && !getBibleBook(request.book)) throw new SearchInputError('Selecione um livro válido.');
  const query = request.query.trim(); const normalized = normalizeBibleSearch(query);
  if (normalized.replace(/\s/g, '').length < 2) throw new SearchInputError('Digite pelo menos duas letras ou uma referência, como João 3:16.');
  const reference = parseBibleReference(query); const matches: VerseMatch[] = [];
  const includesBook = (book: BibleBook) => (!request.book || book.name === request.book) && (request.testament === 'Todos' || book.testament === request.testament);
  if (reference) {
    if (includesBook(reference.book)) for (let verse = reference.first; verse <= reference.last; verse++) matches.push({ book: reference.book.name, chapter: reference.chapter, verse, text: bibleTextProvider.getChapter(reference.book.name, reference.chapter)![verse - 1] });
    return { query, reference: true, matches };
  }
  const tokens = [...new Set(normalized.split(' '))];
  const yieldWork = options.yieldWork ?? (() => new Promise<void>(resolve => setTimeout(resolve, 0)));
  let visited = 0;
  for (const book of bibleBooks) {
    if (!includesBook(book)) continue;
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      const verses = bibleTextProvider.getChapter(book.name, chapter)!;
      for (let index = 0; index < verses.length; index++) {
        check();
        const text = verses[index]; const searchable = ' ' + normalizeBibleSearch(text) + ' ';
        const found = request.mode === 'Frase exata' ? searchable.includes(' ' + normalized + ' ') : tokens.every(token => searchable.includes(' ' + token + ' '));
        if (found) matches.push({ book: book.name, chapter, verse: index + 1, text });
        if (++visited % 512 === 0) { await yieldWork(); check(); }
      }
    }
  }
  return { query, reference: false, matches };
}
export function resultPage(result: BibleSearchResult, page: number, size = 20) {
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) return [];
  return result.matches.slice(page * size, (page + 1) * size);
}
