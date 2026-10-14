import type { PremiumContent } from './premium-content-model';

export interface ContentJourney {
  contentId: string;
  favorite: boolean;
  completed: string[];
  lastLessonId: string | null;
  updatedAt: number;
  positions?: LessonPosition[];
}
export interface LessonPosition { lessonId: string; seconds: number; duration: number }
export function resumePlaybackSeconds(seconds: number, duration: number) {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(duration) || duration <= 0) return 0;
  return seconds >= duration - 1 ? 0 : Math.min(seconds, duration);
}
function position(lessonId: string, seconds: number, duration: number): LessonPosition {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(duration) || duration <= 0 || duration > 86400 || seconds > duration) throw Error('Posição de reprodução inválida.');
  return { lessonId: id(lessonId), seconds: Math.floor(seconds), duration };
}
export interface JourneyStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
const MAX_BYTES = 1024 * 1024;
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw Error('Registro de conteúdo inválido.');
  return value;
}
export function journeyStorageKey(accountId: string | null) {
  return '@biblia-smart/content-journey/v1/' + (accountId === null ? 'guest' : 'account-' + encodeURIComponent(accountId));
}
export function decodeContentJourney(raw: string | null): ContentJourney[] {
  if (raw === null) return [];
  if (raw.length > MAX_BYTES) throw Error('Sua coleção não pôde ser aberta. Os dados foram preservados.');
  let data;
  try { data = JSON.parse(raw); } catch { throw Error('Sua coleção não pôde ser aberta. Os dados foram preservados.'); }
  if (data?.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 500) throw Error('Registro de conteúdo inválido.');
  const seen = new Set<string>();
  return data.entries.map((row: ContentJourney) => {
    if (!row || typeof row.favorite !== 'boolean' || !Array.isArray(row.completed) || row.completed.length > 100 || !Number.isSafeInteger(row.updatedAt) || row.updatedAt < 0 || !Number.isFinite(new Date(row.updatedAt).getTime())) throw Error('Registro de conteúdo inválido.');
    const contentId = id(row.contentId); if (seen.has(contentId)) throw Error('Registro de conteúdo repetido.'); seen.add(contentId);
    const completed = row.completed.map(id); if (new Set(completed).size !== completed.length) throw Error('Aulas concluídas repetidas.');
    if (row.positions !== undefined && (!Array.isArray(row.positions) || row.positions.length > 100)) throw Error('Posições de reprodução inválidas.');
    const positions = (row.positions ?? []).map(value => position(value.lessonId, value.seconds, value.duration));
    if (new Set(positions.map(value => value.lessonId)).size !== positions.length) throw Error('Posições de reprodução repetidas.');
    return { contentId, favorite: row.favorite, completed, lastLessonId: row.lastLessonId === null ? null : id(row.lastLessonId), updatedAt: row.updatedAt, positions };
  });
}
export function summarizeContentJourney(content: PremiumContent, entry?: ContentJourney) {
  const completed = content.lessons.filter(lesson => entry?.completed.includes(lesson.id)).length;
  const finished = content.status === 'published' && content.lessons.length > 0 && completed === content.lessons.length;
  const last = content.lessons.find(lesson => lesson.id === entry?.lastLessonId && !entry?.completed.includes(lesson.id));
  const next = last ?? content.lessons.find(lesson => !entry?.completed.includes(lesson.id));
  const started = !!entry && (!!entry.lastLessonId || completed > 0);
  return { completed, total: content.lessons.length, finished, started, favorite: entry?.favorite ?? false, next: content.status === 'published' ? next : undefined };
}
export function filterContentJourney(contents: PremiumContent[], entries: ContentJourney[], filter: string) {
  return contents.filter(content => {
    const summary = summarizeContentJourney(content, entries.find(entry => entry.contentId === content.id));
    return filter === 'Favoritos' ? summary.favorite : filter === 'Em andamento' ? summary.started && !summary.finished && content.status === 'published' : filter === 'Concluídos' ? summary.finished : true;
  });
}
export function recentContentJourney(contents: PremiumContent[], entries: ContentJourney[]) {
  return entries.slice().sort((a, b) => b.updatedAt - a.updatedAt).flatMap(entry => {
    const content = contents.find(item => item.id === entry.contentId);
    if (!content) return [];
    const summary = summarizeContentJourney(content, entry);
    return summary.started && !summary.finished && summary.next ? [{ content, next: summary.next, completed: summary.completed }] : [];
  }).slice(0, 3);
}
export function createContentJourneyRepository(storage: JourneyStorage, key: string, allowed: () => boolean = () => true, now = Date.now) {
  let queue: Promise<unknown> = Promise.resolve();
  async function read() { return decodeContentJourney(await storage.getItem(key)); }
  function update(content: PremiumContent, action: 'favorite' | 'visit' | 'complete' | 'position', lessonId?: string, playback?: { seconds: number; duration: number }) {
    const task = queue.then(async () => {
      if (!allowed()) throw Error('Seu acesso mudou. Abra o conteúdo novamente.');
      id(content.id);
      if (action !== 'favorite' && (content.status !== 'published' || !content.lessons.some(lesson => lesson.id === lessonId))) throw Error('Esta aula não está disponível.');
      const checkpoint = action === 'position' ? position(lessonId!, playback?.seconds ?? NaN, playback?.duration ?? NaN) : undefined;
      const rows = await read();
      if (!allowed()) throw Error('Seu acesso mudou. Abra o conteúdo novamente.');
      const previous = rows.find(row => row.contentId === content.id);
      const valid = new Set(content.lessons.map(lesson => lesson.id));
      const completed = (previous?.completed ?? []).filter(lesson => valid.has(lesson));
      const positions = (previous?.positions ?? []).filter(value => valid.has(value.lessonId));
      const oldCheckpoint = positions.find(value => value.lessonId === lessonId);
      if (checkpoint && oldCheckpoint?.seconds === checkpoint.seconds && oldCheckpoint.duration === checkpoint.duration && previous?.lastLessonId === lessonId) return rows;
      const next: ContentJourney = { contentId: content.id, favorite: previous?.favorite ?? false, completed, lastLessonId: previous?.lastLessonId && valid.has(previous.lastLessonId) ? previous.lastLessonId : null, updatedAt: Math.max(now(), (previous?.updatedAt ?? -1) + 1), positions };
      if (action === 'favorite') next.favorite = !next.favorite;
      if (action === 'visit') next.lastLessonId = lessonId!;
      if (action === 'complete') { next.completed = completed.includes(lessonId!) ? completed.filter(lesson => lesson !== lessonId) : [...completed, lessonId!]; next.lastLessonId = lessonId!; }
      if (checkpoint) { next.positions = [...positions.filter(value => value.lessonId !== lessonId), checkpoint]; next.lastLessonId = lessonId!; }
      const entries = rows.filter(row => row.contentId !== content.id);
      if (next.favorite || next.completed.length || next.lastLessonId) entries.push(next);
      const raw = JSON.stringify({ version: 1, entries });
      // Validate before writing, including collection limits; never overwrite damaged storage.
      decodeContentJourney(raw);
      try { await storage.setItem(key, raw); } catch { throw Error('Não foi possível salvar seu progresso. Tente novamente.'); }
      return entries;
    });
    queue = task.catch(() => undefined); return task;
  }
  return { read: async () => { await queue; return read(); }, update };
}
