import { bookStudies, getBookStudy, getWordStudy, normalizeStudyQuery, wordStudies } from './studies';

export const PERSONAL_STUDIES_KEY = '@biblia-smart/personal-studies/v1';
export const STUDY_NOTE_LIMIT = 2000;
export const MAX_PERSONAL_STUDIES_BYTES = 512 * 1024;
export type StudyKind = 'book' | 'word';
export interface PersonalStudy { kind: StudyKind; studyId: string; saved: boolean; note: string; updatedAt: number }
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
const targets = new Set([...bookStudies.map(book => 'book:' + book.id), ...wordStudies.map(word => 'word:' + word.id)]);
export const personalStudyKey = (entry: Pick<PersonalStudy, 'kind' | 'studyId'>) => entry.kind + ':' + entry.studyId;
export function validStudyTarget(kind: unknown, studyId: unknown): kind is StudyKind {
  return typeof studyId === 'string' && (kind === 'book' || kind === 'word') && targets.has(kind + ':' + studyId);
}
function date(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || !Number.isFinite(new Date(value as number).getTime())) throw Error('Data do estudo inválida.');
  return value as number;
}
function note(value: unknown) {
  if (typeof value !== 'string' || value.length > STUDY_NOTE_LIMIT) throw Error('A reflexão deve ter até 2.000 caracteres.');
  return value.trim();
}
function checkSize(raw: string) {
  let bytes = 0;
  for (const character of raw) { const code = character.codePointAt(0)!; bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4; }
  if (bytes > MAX_PERSONAL_STUDIES_BYTES) throw Error('Sua coleção de estudos ultrapassou o limite local. Os dados foram preservados.');
}
export function decodePersonalStudies(raw: string | null): PersonalStudy[] {
  if (raw === null) return [];
  if (raw.length > MAX_PERSONAL_STUDIES_BYTES) throw Error('Coleção de estudos inválida. Seus dados foram preservados.');
  checkSize(raw);
  let store;
  try { store = JSON.parse(raw); } catch { throw Error('Coleção de estudos inválida. Seus dados foram preservados.'); }
  if (store?.version !== 1 || !Array.isArray(store.entries) || store.entries.length > targets.size) throw Error('Coleção de estudos inválida. Seus dados foram preservados.');
  const seen = new Set<string>();
  return store.entries.map((value: PersonalStudy) => {
    if (!value || !validStudyTarget(value.kind, value.studyId) || typeof value.saved !== 'boolean') throw Error('Estudo inválido. Seus dados foram preservados.');
    const key = personalStudyKey(value); if (seen.has(key)) throw Error('Estudo repetido. Seus dados foram preservados.'); seen.add(key);
    const entry = { kind: value.kind, studyId: value.studyId, saved: value.saved, note: note(value.note), updatedAt: date(value.updatedAt) };
    if (!entry.saved && !entry.note) throw Error('Registro de estudo vazio. Seus dados foram preservados.');
    return entry;
  });
}
export function encodePersonalStudies(entries: readonly PersonalStudy[]): string {
  return JSON.stringify({ version: 1, entries: decodePersonalStudies(JSON.stringify({ version: 1, entries })) });
}
export function personalStudyInfo(entry: Pick<PersonalStudy, 'kind' | 'studyId'>) {
  if (entry.kind === 'book') { const book = getBookStudy(entry.studyId)!; return { title: book.name, subtitle: book.genre + ' • ' + book.testament + ' Testamento', search: book.author + ' ' + book.message }; }
  const word = getWordStudy(entry.studyId)!;
  return { title: word.transliteration + ' • ' + word.title, subtitle: word.language + ' • ' + word.strong, search: word.original + ' ' + word.meaning + ' ' + word.example.book + ' ' + word.example.chapter + ':' + word.example.verse };
}
export function findPersonalStudies(entries: readonly PersonalStudy[], query: string, kind = 'Todos', status = 'Todos') {
  const normalize = (text: string) => normalizeStudyQuery(text).replace(/ς/g, 'σ');
  const terms = normalize(query.slice(0, 120)).split(/\s+/).filter(Boolean);
  return entries.filter(entry => {
    if (kind === 'Livros' && entry.kind !== 'book' || kind === 'Palavras' && entry.kind !== 'word') return false;
    if (status === 'Salvos' && !entry.saved || status === 'Com reflexões' && !entry.note) return false;
    const info = personalStudyInfo(entry); const text = normalize([info.title, info.subtitle, info.search, entry.note].join(' '));
    return terms.every(term => text.includes(term));
  }).sort((a, b) => b.updatedAt - a.updatedAt || personalStudyKey(a).localeCompare(personalStudyKey(b)));
}
export function mergePersonalStudies(current: readonly PersonalStudy[], incoming: readonly PersonalStudy[]) {
  const rows = new Map(current.map(entry => [personalStudyKey(entry), { ...entry }]));
  let addedSaved = 0; let addedNotes = 0; const conflicts: { reference: string; current: string; incoming: string }[] = [];
  for (const entry of incoming) {
    const key = personalStudyKey(entry); const previous = rows.get(key);
    if (!previous) { rows.set(key, { ...entry }); if (entry.saved) addedSaved++; if (entry.note) addedNotes++; continue; }
    let changed = false;
    if (entry.saved && !previous.saved) { previous.saved = true; addedSaved++; changed = true; }
    if (entry.note && !previous.note) { previous.note = entry.note; addedNotes++; changed = true; }
    else if (entry.note && entry.note !== previous.note) conflicts.push({ reference: personalStudyInfo(entry).title, current: previous.note, incoming: entry.note });
    if (changed) previous.updatedAt = date(Math.max(previous.updatedAt, entry.updatedAt) + 1);
  }
  const entries = [...rows.values()]; encodePersonalStudies(entries);
  return { entries, addedSaved, addedNotes, conflicts };
}
export function createPersonalStudyRepository(storage: Storage, now = () => Date.now()) {
  let queue: Promise<unknown> = Promise.resolve();
  async function read() {
    try { return decodePersonalStudies(await storage.getItem(PERSONAL_STUDIES_KEY)); }
    catch { throw Error('Não foi possível carregar seus estudos. Os dados foram preservados. Tente novamente.'); }
  }
  function update(kind: StudyKind, studyId: string, operation: (previous: PersonalStudy | undefined) => { saved: boolean; note: string }) {
    const task = queue.then(async () => {
      if (!validStudyTarget(kind, studyId)) throw Error('Estudo não encontrado. Volte ao catálogo.');
      const entries = await read(); const previous = entries.find(entry => entry.kind === kind && entry.studyId === studyId);
      const next = operation(previous);
      if (previous?.saved === next.saved && previous.note === next.note) return previous;
      const updatedAt = date(Math.max(date(now()), previous ? previous.updatedAt + 1 : 0));
      const entry: PersonalStudy = { kind, studyId, ...next, updatedAt };
      const rows = entries.filter(row => row.kind !== kind || row.studyId !== studyId);
      if (entry.saved || entry.note) rows.push(entry);
      const raw = encodePersonalStudies(rows);
      try { await storage.setItem(PERSONAL_STUDIES_KEY, raw); }
      catch { throw Error('Não foi possível salvar. Seus dados anteriores foram preservados. Sua reflexão continua no editor. Tente novamente.'); }
      return entry.saved || entry.note ? entry : null;
    });
    queue = task.catch(() => undefined); return task;
  }
  return {
    read: async () => { await queue; return findPersonalStudies(await read(), ''); },
    setSaved: (kind: StudyKind, studyId: string, saved: boolean) => update(kind, studyId, previous => {
      if (typeof saved !== 'boolean') throw Error('Estado de estudo inválido.');
      return { saved, note: previous?.note ?? '' };
    }),
    saveNote: (kind: StudyKind, studyId: string, value: string, expectedUpdatedAt: number | null) => update(kind, studyId, previous => {
      if ((previous?.updatedAt ?? null) !== expectedUpdatedAt) throw Error('Este estudo mudou desde que você abriu o editor. Volte e abra a reflexão novamente. Seu texto continua no editor.');
      return { saved: previous?.saved ?? false, note: note(value) };
    }),
  };
}
