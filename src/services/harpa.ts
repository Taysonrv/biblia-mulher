import catalog from '../data/harpa.json';

export interface Hymn {
  category?: 'worship' | 'civic'; number: number; title: string; author: string; portugueseCredit: string; verses: string[]; chorus?: string; alternateTitles?: string[];
  rights: { status: 'public-domain' | 'authorized'; territory: string; reviewedAt: string; basis: string; textNote: string; sources: { label: string; url: string }[] };
}
export const hymns = catalog as Hymn[];
export function searchHymns(query: string, items: readonly Hymn[] = hymns): Hymn[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  const term = normalize(query);
  if (/^\d+$/.test(term)) return items.filter(item => item.number === Number(term));
  return items.filter(item => normalize([item.title, ...(item.alternateTitles ?? [])].join(' ')).includes(term)).sort((a, b) => a.number - b.number);
}
