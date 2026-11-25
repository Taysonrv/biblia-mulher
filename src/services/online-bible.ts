export const ONLINE_BIBLE = {
  id: 'por_blj', name: 'Bíblia Livre',
  credit: 'Bíblia Livre, fevereiro de 2018. © Diego Santos, Mario Sérgio e Marco Teles. Licença Creative Commons Atribuição 4.0. Texto fornecido pela Free Use Bible API — AO Lab.',
  license: 'https://ebible.org/Scriptures/details.php?id=porbr2018',
} as const;
export const ENGLISH_BIBLE = {
  id: 'ENGWEBP', name: 'World English Bible',
  credit: 'World English Bible (Protestant Edition). Domínio público. Texto fornecido pela Free Use Bible API — AO Lab.',
  license: 'https://ebible.org/engwebp/copyright.htm',
} as const;
type OnlineTranslation = typeof ONLINE_BIBLE | typeof ENGLISH_BIBLE;
export interface OnlineBook { id: string; name: string; chapters: number; order: number }
export interface OnlineChapter { book: OnlineBook; number: number; verses: { number: number; text: string }[] }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Resposta inválida da Bíblia online.');
  return value as Record<string, unknown>;
}
function label(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw Error('Texto inválido da Bíblia online.');
  return value;
}
function integer(value: unknown, max: number): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > max) throw Error('Referência inválida da Bíblia online.');
  return value as number;
}
function translation(data: Record<string, unknown>, selected: OnlineTranslation) {
  const value = record(data.translation); const license = record(value.license);
  if (value.id !== selected.id || value.language !== (selected.id === ENGLISH_BIBLE.id ? 'eng' : 'por') || license.commercialUse !== 'allowed' || license.copyleft !== false) throw Error('A tradução ou sua licença mudou. A Bíblia offline continua disponível.');
}
export function parseOnlineBooks(raw: unknown, selected: OnlineTranslation = ONLINE_BIBLE): OnlineBook[] {
  const data = record(raw); translation(data, selected);
  if (!Array.isArray(data.books) || data.books.length !== 66) throw Error('Catálogo online incompleto.');
  const ids = new Set<string>();
  return data.books.map(value => {
    const book = record(value); const id = label(book.id, 3);
    if (!/^[A-Z0-9]{3}$/.test(id) || ids.has(id) || book.translationId !== selected.id) throw Error('Livro online inválido.');
    ids.add(id);
    return { id, name: label(book.name, 100), chapters: integer(book.numberOfChapters, 150), order: integer(book.order, 66) };
  }).sort((a, b) => a.order - b.order);
}
export function parseOnlineChapter(raw: unknown, book: OnlineBook, number: number, selected: OnlineTranslation = ONLINE_BIBLE): OnlineChapter {
  const data = record(raw); translation(data, selected); const chapter = record(data.chapter);
  if (record(data.book).id !== book.id || chapter.number !== number || !Array.isArray(chapter.content) || chapter.content.length > 1000) throw Error('O capítulo recebido não corresponde à sua escolha.');
  const verses: OnlineChapter['verses'] = []; let previous = 0;
  for (const value of chapter.content) {
    const item = record(value); if (item.type !== 'verse') continue;
    const verse = integer(item.number, 200);
    if (verse <= previous) throw Error('Versículos online fora de ordem.');
    previous = verse; verses.push({ number: verse, text: label(item.text, 12000) });
  }
  if (!verses.length) throw Error('O capítulo online está vazio.');
  return { book, number, verses };
}
export function createOnlineBible(fetcher: typeof fetch = fetch, selected: OnlineTranslation = ONLINE_BIBLE) {
  let books: OnlineBook[] | null = null;
  const chapters = new Map<string, OnlineChapter>();
  async function get(path: string) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetcher('https://bible.helloao.org/api/' + selected.id + '/' + path, { signal: controller.signal });
      if (!response.ok) throw Error('Não foi possível consultar a Bíblia online. Tente novamente ou use a versão offline.');
      const text = await response.text(); if (text.length > 600000) throw Error('Resposta online maior que o esperado.');
      return JSON.parse(text) as unknown;
    } catch (reason) {
      if (controller.signal.aborted) throw Error('A consulta demorou demais. Confira a conexão ou use a Bíblia offline.');
      if (reason instanceof TypeError) throw Error('Não foi possível conectar à Bíblia online. A leitura offline continua disponível.');
      throw reason;
    } finally { clearTimeout(timer); }
  }
  return {
    async books() { if (!books) books = parseOnlineBooks(await get('books.json'), selected); return books; },
    async chapter(book: OnlineBook, number: number) {
      if (!/^[A-Z0-9]{3}$/.test(book.id) || !Number.isInteger(number) || number < 1 || number > book.chapters) throw Error('Escolha um capítulo válido.');
      const key = `${book.id}/${number}`;
      if (chapters.has(key)) return chapters.get(key)!;
      const result = parseOnlineChapter(await get(`${key}.simple.json`), book, number, selected);
      if (chapters.size >= 8) chapters.delete(chapters.keys().next().value!);
      chapters.set(key, result); return result;
    },
  };
}
export const onlineBible = createOnlineBible();

export const englishBible = createOnlineBible(fetch, ENGLISH_BIBLE);
