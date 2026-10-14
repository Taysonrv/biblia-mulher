import type { SermonOutline } from './sermon';

export const SERMON_KEY = '@biblia-smart/sermons/v1';
export const MAX_SERMONS = 100;
export const MAX_SERMON_STORE_BYTES = 1_500_000;
export const SERMON_LIMITS = { theme: 300, baseText: 600, body: 4000, pointTitle: 200, reference: 300, question: 500, notes: 2000, list: 12 } as const;
export interface SavedSermon { id: string; topic: string; outline: SermonOutline; notes: string; createdAt: number; updatedAt: number }
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
function text(value: unknown, limit: number, label: string, optional = false): string {
  if (typeof value !== 'string' || value.length > limit || (!optional && !value.trim())) throw Error(`Confira ${label}: use ${optional ? 'até' : 'de 1 a'} ${limit} caracteres.`);
  return value.trim();
}
function list(value: unknown, limit: number, label: string): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > SERMON_LIMITS.list) throw Error(`Informe de 1 a ${SERMON_LIMITS.list} ${label}, uma por linha.`);
  return value.map(item => text(item, limit, label));
}
export function validateOutline(value: unknown): SermonOutline {
  if (!value || typeof value !== 'object') throw Error('Esboço inválido.');
  const outline = value as SermonOutline;
  if (!Array.isArray(outline.points) || outline.points.length !== 3) throw Error('O esboço precisa de três pontos de desenvolvimento.');
  return {
    theme: text(outline.theme, SERMON_LIMITS.theme, 'o tema'), baseText: text(outline.baseText, SERMON_LIMITS.baseText, 'o texto-base'),
    introduction: text(outline.introduction, SERMON_LIMITS.body, 'a introdução'),
    points: outline.points.map(point => ({ title: text(point?.title, SERMON_LIMITS.pointTitle, 'o título do ponto'), body: text(point?.body, SERMON_LIMITS.body, 'o desenvolvimento') })),
    application: text(outline.application, SERMON_LIMITS.body, 'a aplicação'), conclusion: text(outline.conclusion, SERMON_LIMITS.body, 'a conclusão'),
    references: list(outline.references, SERMON_LIMITS.reference, 'referências'), questions: list(outline.questions, SERMON_LIMITS.question, 'perguntas'),
  };
}
function date(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || !Number.isFinite(new Date(value as number).getTime())) throw Error('Data do esboço inválida.');
  return value as number;
}
function byteLength(value: string) {
  let bytes = 0;
  for (const character of value) { const code = character.codePointAt(0)!; bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4; }
  return bytes;
}
export function decodeSermons(raw: string | null): SavedSermon[] {
  if (raw === null) return [];
  if (raw.length > MAX_SERMON_STORE_BYTES || byteLength(raw) > MAX_SERMON_STORE_BYTES) throw Error('Sua coleção de esboços ultrapassou o limite local. Os dados foram preservados.');
  let store;
  try { store = JSON.parse(raw); } catch { throw Error('Coleção de esboços inválida. Seus dados foram preservados.'); }
  if (store?.version !== 1 || !Array.isArray(store.sermons) || store.sermons.length > MAX_SERMONS) throw Error('Coleção de esboços inválida.');
  const seen = new Set<string>();
  return store.sermons.map((value: SavedSermon) => {
    if (!value || typeof value.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id) || seen.has(value.id)) throw Error('Identificador de esboço inválido ou repetido.');
    seen.add(value.id);
    const createdAt = date(value.createdAt); const updatedAt = date(value.updatedAt);
    if (updatedAt < createdAt) throw Error('Datas do esboço inválidas.');
    return { id: value.id, topic: text(value.topic, SERMON_LIMITS.theme, 'o tema original'), outline: validateOutline(value.outline), notes: text(value.notes, SERMON_LIMITS.notes, 'as notas pessoais', true), createdAt, updatedAt };
  });
}
export function encodeSermons(sermons: SavedSermon[]): string {
  const raw = JSON.stringify({ version: 1, sermons });
  return JSON.stringify({ version: 1, sermons: decodeSermons(raw) });
}
export function sermonContent(sermon: SavedSermon) { return JSON.stringify([sermon.topic, sermon.outline, sermon.notes]); }
const titleIdentity = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
export function suggestSermonCopyTitle(theme: string, rows: readonly SavedSermon[]): string {
  const titles = new Set(rows.map(row => titleIdentity(row.outline.theme)));
  for (let number = 1; number <= rows.length + 1; number++) {
    const suffix = number === 1 ? '' : ` (${number})`;
    const prefix = 'Cópia de ';
    const available = SERMON_LIMITS.theme - prefix.length - suffix.length;
    const shortened = theme.length > available;
    const body = theme.slice(0, available - (shortened ? 1 : 0)).replace(/[\uD800-\uDBFF]$/, '').trimEnd();
    const candidate = prefix + body + (shortened ? '…' : '') + suffix;
    if (!titles.has(titleIdentity(candidate))) return candidate;
  }
  throw Error('Não foi possível sugerir um título para a cópia.');
}
export function findSermons(sermons: readonly SavedSermon[], query: string): SavedSermon[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(query.trim().slice(0, 120)).split(/\s+/).filter(Boolean);
  return sermons.filter(sermon => terms.every(term => normalize(sermonContent(sermon)).includes(term)))
    .sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id));
}
export function formatSermon(outline: SermonOutline, notes = '', includeNotes = false): string {
  const value = validateOutline(outline);
  return [value.theme, `Texto-base: ${value.baseText}`, 'INTRODUÇÃO\n' + value.introduction,
    'DESENVOLVIMENTO\n' + value.points.map(point => point.title + '\n' + point.body).join('\n\n'),
    'APLICAÇÃO\n' + value.application, 'CONCLUSÃO\n' + value.conclusion,
    'REFERÊNCIAS RELACIONADAS\n' + value.references.map(ref => '• ' + ref).join('\n'),
    'PERGUNTAS PARA REFLEXÃO\n' + value.questions.map((question, index) => `${index + 1}. ${question}`).join('\n'),
    ...(includeNotes && notes.trim() ? ['NOTAS PESSOAIS\n' + text(notes, SERMON_LIMITS.notes, 'as notas pessoais', true)] : []),
    'Preparado com Bíblia Smart • Roteiro de apoio; confira as passagens em seu contexto.',
  ].join('\n\n');
}
export function createSermonRepository(storage: Storage, now = () => Date.now(), makeId = () => `sermon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`) {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async () => {
    let raw: string | null;
    try { raw = await storage.getItem(SERMON_KEY); } catch { throw Error('Não foi possível carregar os esboços. Seus dados foram preservados. Tente novamente.'); }
    return decodeSermons(raw);
  };
  function update(operation: (rows: SavedSermon[]) => { rows: SavedSermon[]; saved: SavedSermon }) {
    const task = queue.then(async () => {
      const next = operation(await read()); const raw = encodeSermons(next.rows);
      try { await storage.setItem(SERMON_KEY, raw); } catch { throw Error('Não foi possível atualizar seus esboços. Seus dados anteriores foram preservados. Tente novamente.'); }
      return next.saved;
    });
    queue = task.catch(() => undefined); return task;
  }
  function insert(rows: SavedSermon[], topic: string, outline: SermonOutline, notes = '') {
    if (rows.length >= MAX_SERMONS) throw Error(`Sua coleção chegou a ${MAX_SERMONS} esboços. Guarde um backup e exclua uma mensagem para liberar espaço.`);
    const createdAt = date(now()); const id = makeId();
    if (rows.some(row => row.id === id)) throw Error('Não foi possível identificar o novo esboço. Tente novamente.');
    const saved: SavedSermon = { id, topic: text(topic, SERMON_LIMITS.theme, 'o tema original'), outline: validateOutline(outline), notes: text(notes, SERMON_LIMITS.notes, 'as notas pessoais', true), createdAt, updatedAt: createdAt };
    return { rows: [...rows, saved], saved };
  }
  function currentVersion(rows: SavedSermon[], id: string, expectedUpdatedAt: number) {
    const current = rows.find(row => row.id === id);
    if (!current) throw Error('Este esboço não foi encontrado. Volte à sua coleção.');
    if (current.updatedAt !== expectedUpdatedAt) throw Error('Este esboço mudou desde que você abriu a mensagem. Volte e abra novamente para conferir a versão atual.');
    return current;
  }
  return {
    read: async () => { await queue; return findSermons(await read(), ''); },
    create: (topic: string, outline: SermonOutline) => update(rows => insert(rows, topic, outline)),
    duplicate: (id: string, theme: string, expectedUpdatedAt: number) => update(rows => {
      const source = currentVersion(rows, id, expectedUpdatedAt);
      const title = text(theme, SERMON_LIMITS.theme, 'o título da cópia');
      if (rows.some(row => titleIdentity(row.outline.theme) === titleIdentity(title))) throw Error('Escolha um título diferente dos esboços já salvos para identificar sua cópia.');
      return insert(rows, source.topic, { ...source.outline, theme: title }, source.notes);
    }),
    remove: (id: string, expectedUpdatedAt: number) => update(rows => {
      const current = currentVersion(rows, id, expectedUpdatedAt);
      return { rows: rows.filter(row => row.id !== id), saved: current };
    }),
    save: (id: string, outline: SermonOutline, notes: string, expectedUpdatedAt: number) => update(rows => {
      const current = rows.find(row => row.id === id);
      if (!current) throw Error('Este esboço não foi encontrado. Volte à sua coleção.');
      if (current.updatedAt !== expectedUpdatedAt) throw Error('Este esboço mudou desde que você abriu o editor. Volte e abra novamente para conferir a versão atual. Seu texto continua no editor.');
      const saved = { ...current, outline: validateOutline(outline), notes: text(notes, SERMON_LIMITS.notes, 'as notas pessoais', true), updatedAt: date(Math.max(date(now()), current.updatedAt + 1)) };
      return { rows: rows.map(row => row.id === id ? saved : row), saved };
    }),
  };
}
