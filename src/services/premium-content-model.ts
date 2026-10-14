import { canUsePremium, type AccessMode } from './subscription-access';
export type ContentKind = 'mentoria' | 'pregacao';
export type MediaKind = 'video' | 'audio';
export interface ContentLesson { id: string; title: string; media: MediaKind; durationSeconds?: number }
export interface PremiumContent {
  id: string; kind: ContentKind; title: string; presenter: string; description: string;
  topics: string[]; status: 'published' | 'coming-soon'; lessons: ContentLesson[];
}
export interface PlaybackGrant { uri: string; media: MediaKind; contentType: 'progressive' | 'hls'; expiresAt: number | null }
export interface ContentAccess { mode: AccessMode; accountId: string | null }
export interface ContentAdapter {
  configured: boolean;
  catalog(accountId: string): Promise<unknown>;
  authorizePlayback(accountId: string, contentId: string, lessonId: string): Promise<PlaybackGrant>;
}
export class ContentError extends Error {}
function text(value: unknown, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new ContentError('O catálogo recebido não está disponível. Tente atualizar.');
  return value.trim();
}
function identifier(value: unknown) {
  const id = text(value, 100); if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new ContentError('Identificação do conteúdo inválida.'); return id;
}
export function parseContentCatalog(raw: unknown): PremiumContent[] {
  if (!raw || typeof raw !== 'object' || !('version' in raw) || raw.version !== 1 || !('items' in raw) || !Array.isArray(raw.items) || raw.items.length > 500) throw new ContentError('O catálogo recebido não está disponível. Tente atualizar.');
  const ids = new Set<string>();
  return raw.items.map(value => {
    if (!value || typeof value !== 'object' || !['mentoria', 'pregacao'].includes(value.kind) || !['published', 'coming-soon'].includes(value.status) || !Array.isArray(value.lessons) || value.lessons.length > 100 || (value.status === 'published' && !value.lessons.length) || !Array.isArray(value.topics) || value.topics.length > 12) throw new ContentError('O catálogo recebido não está disponível. Tente atualizar.');
    const id = identifier(value.id); if (ids.has(id)) throw new ContentError('O catálogo tem conteúdos repetidos. Tente atualizar.'); ids.add(id);
    const lessonIds = new Set<string>();
    const lessons = value.lessons.map((lesson: unknown): ContentLesson => {
      if (!lesson || typeof lesson !== 'object' || !('id' in lesson) || !('title' in lesson) || !('media' in lesson) || (lesson.media !== 'video' && lesson.media !== 'audio')) throw new ContentError('Esta aula não está disponível.');
      const lessonId = identifier(lesson.id); if (lessonIds.has(lessonId)) throw new ContentError('O catálogo tem aulas repetidas.'); lessonIds.add(lessonId);
      const duration = 'durationSeconds' in lesson ? lesson.durationSeconds : undefined;
      if (duration !== undefined && (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || duration > 86400)) throw new ContentError('Duração do conteúdo inválida.');
      return { id: lessonId, title: text(lesson.title, 140), media: lesson.media, ...(duration !== undefined ? { durationSeconds: duration as number } : {}) };
    });
    // Catalogs deliberately contain metadata only, never playback URLs/tokens.
    return { id, kind: value.kind, title: text(value.title, 140), presenter: text(value.presenter, 100), description: text(value.description, 2000), status: value.status, topics: value.topics.map((topic: unknown) => text(topic, 40)), lessons };
  });
}
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
export function searchContent(items: readonly PremiumContent[], kind: ContentKind, query = '', media = 'Todos') {
  const terms = normalize(query.slice(0, 120)).split(/\s+/).filter(Boolean);
  return items.filter(item => item.kind === kind && (media === 'Todos' || item.lessons.some(lesson => lesson.media === (media === 'Vídeos' ? 'video' : 'audio'))) && terms.every(term => normalize([item.title, item.presenter, item.description, ...item.topics, ...item.lessons.map(lesson => lesson.title)].join(' ')).includes(term)));
}
export function formatMediaTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); const remainder = String(value % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
}
export function validatePlaybackGrant(grant: PlaybackGrant, media: MediaKind, now: number, local = false): PlaybackGrant {
  if (!grant || grant.media !== media || !['progressive', 'hls'].includes(grant.contentType) || (media === 'audio' && grant.contentType !== 'progressive') || typeof grant.uri !== 'string') throw new ContentError('Não foi possível abrir esta mídia. Tente novamente.');
  if (local) {
    if (!/^(file:\/\/|content:\/\/|blob:)/.test(grant.uri)) throw new ContentError('Arquivo de teste inválido.');
  } else {
    try { const url = new URL(grant.uri); if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw Error(); }
    catch { throw new ContentError('O acesso ao conteúdo não está disponível. Tente novamente.'); }
    if (!Number.isFinite(grant.expiresAt) || (grant.expiresAt ?? 0) <= now || (grant.expiresAt ?? 0) > now + 86400000) throw new ContentError('O acesso à mídia expirou ou precisa ser atualizado. Abra o conteúdo novamente.');
  }
  return { uri: grant.uri, media, contentType: grant.contentType, expiresAt: local ? null : grant.expiresAt };
}

export function createContentLibrary(adapter: ContentAdapter, development: boolean, getAccess: () => ContentAccess, now = Date.now) {
  const previews = new Map<string, { item: PremiumContent; sources: Map<string, PlaybackGrant> }>(); let nextId = 0; let revision = 0;
  function allowed(): ContentAccess { const access = getAccess(); if (!canUsePremium(access.mode)) throw new ContentError('Este conteúdo é exclusivo do Premium.'); return { mode: access.mode, accountId: access.accountId }; }
  function stillAllowed(before: ContentAccess, request: number) { const after = allowed(); if (request !== revision || after.mode !== before.mode || after.accountId !== before.accountId) throw new ContentError('Seu acesso mudou. Abra o conteúdo novamente.'); }
  function localAllowed() { return development && getAccess().mode === 'preview'; }
  async function list() {
    const access = allowed(); const request = revision;
    const remote = adapter.configured && access.accountId ? parseContentCatalog(await adapter.catalog(access.accountId)) : [];
    stillAllowed(access, request);
    return [...(localAllowed() ? Array.from(previews.values(), entry => entry.item) : []), ...remote];
  }
  return {
    reset() { const uris = Array.from(previews.values()).flatMap(entry => Array.from(entry.sources.values(), grant => grant.uri)); revision++; previews.clear(); return uris; },
    list,
    async get(id: string) { return (await list()).find(item => item.id === id) ?? null; },
    async playback(contentId: string, lessonId: string) {
      const access = allowed(); const request = revision; const content = (await list()).find(item => item.id === contentId); const lesson = content?.lessons.find(item => item.id === lessonId);
      stillAllowed(access, request);
      if (!content || content.status !== 'published' || !lesson) throw new ContentError('Conteúdo não encontrado ou ainda não publicado.');
      const local = localAllowed() ? previews.get(contentId)?.sources.get(lessonId) : undefined;
      const grant = local ?? (access.accountId && adapter.configured ? await adapter.authorizePlayback(access.accountId, contentId, lessonId) : null);
      stillAllowed(access, request); if (!grant) throw new ContentError('A reprodução ainda não está disponível.');
      return validatePlaybackGrant(grant, lesson.media, now(), !!local);
    },
    addPreview(input: { kind: ContentKind; title: string; presenter: string; description: string; lessons: { title: string; media: MediaKind; uri: string }[] }) {
      allowed(); if (!localAllowed()) throw new ContentError('O estúdio é exclusivo da simulação de desenvolvimento.');
      if (previews.size >= 12) throw new ContentError('Você já criou 12 conteúdos de teste. Reinicie a simulação para começar uma nova sessão.');
      const id = `preview-${now()}-${++nextId}`;
      const item = parseContentCatalog({ version: 1, items: [{ ...input, id, topics: ['Teste local'], status: 'published', lessons: input.lessons.map((lesson, index) => ({ id: `lesson-${index + 1}`, title: lesson.title, media: lesson.media })) }] })[0];
      const sources = new Map(item.lessons.map((lesson, index) => [lesson.id, validatePlaybackGrant({ uri: input.lessons[index].uri, media: lesson.media, contentType: 'progressive', expiresAt: null }, lesson.media, now(), true)]));
      previews.set(id, { item, sources }); return item;
    },
  };
}
