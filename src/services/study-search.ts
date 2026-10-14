import { bookStudies, normalizeStudyQuery, wordStudies, type WordLanguage } from './studies';

export type StudySearchKind = 'Todos' | 'Livros' | 'Palavras';
export type StudySearchTestament = 'Todos' | 'Antigo' | 'Novo';
export type StudySearchLanguage = 'Todos' | WordLanguage;
export interface StudySearchFilters { kind?: StudySearchKind; testament?: StudySearchTestament; language?: StudySearchLanguage }
export interface StudySearchResult {
  id: string; kind: 'Livros' | 'Palavras'; title: string; subtitle: string; matchedField: string; excerpt: string;
}
export const MAX_STUDY_QUERY = 120;
export const STUDY_SEARCH_PAGE_SIZE = 12;
function normalize(value: string) {
  return normalizeStudyQuery(value).replace(/ς/g, 'σ').replace(/\s*:\s*/g, ':').replace(/[^\p{L}\p{N}:]+/gu, ' ').trim();
}
export function studySearchTerms(query: string): string[] {
  return [...new Set(normalize(query.slice(0, MAX_STUDY_QUERY)).split(/\s+/).filter(term => /[\p{L}\p{N}]/u.test(term)))];
}
function matches(text: string, term: string) {
  // A chapter:verse reference must match fully: 1:1 must not also find 1:16.
  return /^\d+:\d+$/.test(term) ? text.split(' ').includes(term) : text.includes(term);
}
type Field = { label: string; text: string; normalized: string };
const field = (label: string, text: string): Field => ({ label, text, normalized: normalize(text) });
// Immutable search index of the offline catalog; URLs and external source pages are not searched.
const index = [
  ...bookStudies.map(book => ({
    id: book.id, kind: 'Livros' as const, title: book.name, subtitle: `${book.genre} • ${book.testament} Testamento`, testament: book.testament,
    language: undefined, identities: [book.id, book.name].map(normalize),
    metadata: normalize([book.id, book.name, book.genre, book.testament].join(' ')),
    fields: [field('Mensagem principal', book.message), field('Autor', book.author), field('Data e composição', book.date),
      field('Para refletir', book.reflection), ...book.outline.map(part => field('Esboço do livro', `${part.title} • Capítulos ${part.range}`))],
  })),
  ...wordStudies.map(word => ({
    id: word.id, kind: 'Palavras' as const, title: `${word.transliteration} • ${word.title}`, subtitle: `${word.language} • ${word.strong}`,
    testament: undefined, language: word.language, identities: [word.id, word.original, word.transliteration, word.title, word.strong].map(normalize),
    metadata: normalize([word.id, word.original, word.transliteration, word.title, word.language, word.strong].join(' ')),
    fields: [field('Sentidos possíveis', word.meaning), field('Na passagem', `${word.example.book} ${word.example.chapter}:${word.example.verse} — ${word.example.context}`),
      field('Observe o contexto', word.note), field('Para refletir', word.reflection)],
  })),
];

export function searchStudies(query: string, filters: StudySearchFilters = {}): StudySearchResult[] {
  const terms = studySearchTerms(query); if (!terms.length) return [];
  const phrase = terms.join(' ');
  return index.flatMap((entry, order) => {
    if (filters.kind && filters.kind !== 'Todos' && filters.kind !== entry.kind) return [];
    if (entry.kind === 'Livros' && filters.testament && filters.testament !== 'Todos' && filters.testament !== entry.testament) return [];
    if (entry.kind === 'Palavras' && filters.language && filters.language !== 'Todos' && filters.language !== entry.language) return [];
    const document = [entry.metadata, ...entry.fields.map(item => item.normalized)].join(' ');
    if (!terms.every(term => matches(document, term))) return [];
    const matched = entry.fields.map((item, position) => ({ item, position, coverage: terms.filter(term => matches(item.normalized, term)).length }))
      .sort((left, right) => right.coverage - left.coverage || left.position - right.position)[0];
    const score = (entry.identities.includes(phrase) ? 500 : 0) + terms.filter(term => matches(entry.metadata, term)).length * 20 + matched.coverage;
    return [{ result: { id: entry.id, kind: entry.kind, title: entry.title, subtitle: entry.subtitle,
      matchedField: matched.item.label, excerpt: matched.item.text }, score, order }];
  }).sort((left, right) => right.score - left.score || left.order - right.order).map(item => item.result);
}

export function studyResultPage(results: readonly StudySearchResult[], requestedPage: number) {
  const pages = Math.ceil(results.length / STUDY_SEARCH_PAGE_SIZE);
  const page = Math.max(0, Math.min(pages - 1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0));
  return { page, pages, rows: results.slice(page * STUDY_SEARCH_PAGE_SIZE, (page + 1) * STUDY_SEARCH_PAGE_SIZE) };
}
