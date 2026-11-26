import { parseBackup, type BackupData, type BackupFile } from './backup-repository';
import { getReadingPlan } from '../data/reading-plans';
import { personalStudyInfo } from './personal-studies-repository';

// Below Firestore's 1 MiB document limit, including UTF-8 and metadata overhead.
export const MAX_SYNC_BYTES = 700_000;
export type SyncChoice = 'local' | 'cloud';
export type SyncChoices = Record<string, SyncChoice>;
export interface SyncConflict { key: string; label: string; local: string; cloud: string }
type Row = string | number | boolean | object;
type Rows = Map<string, Row>;
export const emptySyncData = (): BackupData => ({ reading: [], plans: { version: 1, activePlanId: null, plans: [] }, events: [], sermons: [], studies: [] });
export function stable(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return '{' + Object.keys(row).sort().map(key => JSON.stringify(key) + ':' + stable(row[key])).join(',') + '}';
  }
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return JSON.stringify(value);
}
export function syncPayload(data: BackupData): string {
  const file: BackupFile = { app: 'biblia-smart', version: 3, createdAt: '2026-01-01T00:00:00.000Z', data };
  const text = JSON.stringify(file);
  let bytes = 0;
  for (const char of text) { const code = char.codePointAt(0)!; bytes += code <= 127 ? 1 : code <= 2047 ? 2 : code <= 65535 ? 3 : 4; }
  if (bytes > MAX_SYNC_BYTES) throw Error('Sua jornada ultrapassou o limite desta versão da sincronização (700 KB). Use o backup em arquivo; nenhum dado foi cortado.');
  return text;
}
export async function parseSyncPayload(text: string): Promise<BackupData> {
  if (typeof text !== 'string' || text.length > MAX_SYNC_BYTES) throw Error('Cópia da nuvem inválida ou grande demais. Nada foi alterado.');
  const data = (await parseBackup(text)).data; syncPayload(data); return data;
}
function rows(data: BackupData): Rows {
  const result: Rows = new Map();
  const set = (parts: (string | number)[], value: Row) => result.set(JSON.stringify(parts), value);
  for (const item of data.reading) {
    if (item.favorite) set(['reading', item.book, item.chapter, item.verse, 'favorite'], true);
    if (item.note) set(['reading', item.book, item.chapter, item.verse, 'note'], item.note);
  }
  if (data.plans.activePlanId) set(['active'], data.plans.activePlanId);
  for (const plan of data.plans.plans) {
    set(['plan', plan.planId, 'started'], plan.startedAt);
    for (const key of plan.completed) set(['plan', plan.planId, 'complete', key], true);
  }
  for (const event of data.events) {
    const { reminderState: _state, ...content } = event;
    set(['event', event.id], content);
  }
  for (const sermon of data.sermons) {
    const { updatedAt: _updatedAt, ...content } = sermon;
    set(['sermon', sermon.id], content);
  }
  for (const study of data.studies) {
    if (study.saved) set(['study', study.kind, study.studyId, 'saved'], true);
    if (study.note) set(['study', study.kind, study.studyId, 'note'], study.note);
  }
  return result;
}
function describe(value: Row | undefined): string {
  if (value === undefined) return 'Removido ou desmarcado';
  if (value === true) return 'Marcado';
  if (typeof value === 'number') return new Date(value).toLocaleString('pt-BR');
  if (value && typeof value === 'object' && 'startsAt' in value) {
    const event = value as BackupData['events'][number];
    return [event.title, event.category, new Date(event.startsAt).toLocaleString('pt-BR'), event.location, event.notes,
      event.reminderMinutes === null ? 'Sem lembrete' : `Lembrete: ${event.reminderMinutes} min antes`].filter(Boolean).join('\n');
  }
  if (value && typeof value === 'object' && 'outline' in value) {
    const sermon = value as BackupData['sermons'][number]; const outline = sermon.outline;
    return [outline.theme, outline.baseText, outline.introduction, ...outline.points.map(point => point.title + '\n' + point.body), outline.application, outline.conclusion, ...outline.references, ...outline.questions, sermon.notes].filter(Boolean).join('\n\n');
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}
function label(key: string, value: Row | undefined): string {
  const parts = JSON.parse(key) as (string | number)[];
  if (parts[0] === 'reading') return `${parts[1]} ${parts[2]}:${parts[3]} · ${parts[4] === 'note' ? 'Anotação' : 'Favorito'}`;
  if (parts[0] === 'active') return 'Plano de leitura ativo';
  if (parts[0] === 'plan') return (getReadingPlan(String(parts[1]))?.title ?? 'Plano de leitura') + (parts[2] === 'started' ? ' · Início' : ' · Leitura concluída');
  if (parts[0] === 'study') return personalStudyInfo({ kind: parts[1] as 'book' | 'word', studyId: String(parts[2]) }).title + (parts[3] === 'note' ? ' · Reflexão' : ' · Estudo salvo');
  if (parts[0] === 'event' && value && typeof value === 'object' && 'title' in value) return 'Compromisso · ' + value.title;
  if (parts[0] === 'sermon' && value && typeof value === 'object' && 'outline' in value) return 'Esboço · ' + (value as BackupData['sermons'][number]).outline.theme;
  const names: Record<string, string> = { plan: 'Plano', event: 'Compromisso', sermon: 'Esboço', study: 'Estudo' };
  return (names[String(parts[0])] ?? 'Registro') + ' · ' + parts.slice(1).join(' · ');
}
function inflate(merged: Rows, sources: BackupData[]): BackupData {
  const result = emptySyncData();
  for (const [key, value] of merged) {
    const parts = JSON.parse(key) as (string | number)[];
    if (parts[0] === 'reading') {
      let entry = result.reading.find(row => row.book === parts[1] && row.chapter === parts[2] && row.verse === parts[3]);
      if (!entry) { entry = { book: String(parts[1]), chapter: Number(parts[2]), verse: Number(parts[3]), favorite: false, note: '' }; result.reading.push(entry); }
      if (parts[4] === 'note') entry.note = String(value); else entry.favorite = true;
    } else if (parts[0] === 'active') result.plans.activePlanId = String(value);
    else if (parts[0] === 'plan') {
      let plan = result.plans.plans.find(row => row.planId === parts[1]);
      if (!plan) { plan = { planId: String(parts[1]), startedAt: 0, completed: [] }; result.plans.plans.push(plan); }
      if (parts[2] === 'started') plan.startedAt = Number(value); else plan.completed.push(String(parts[3]));
    } else if (parts[0] === 'event') {
      const event = value as Omit<BackupData['events'][number], 'reminderState'>;
      result.events.push({ ...event, reminderState: event.reminderMinutes === null ? 'off' : 'failed' });
    } else if (parts[0] === 'sermon') {
      const sermon = value as Omit<BackupData['sermons'][number], 'updatedAt'>;
      const updatedAt = Math.max(sermon.createdAt, ...sources.flatMap(data => data.sermons.filter(row => row.id === parts[1]).map(row => row.updatedAt)));
      result.sermons.push({ ...sermon, updatedAt });
    }
    else if (parts[0] === 'study') {
      let study = result.studies.find(row => row.kind === parts[1] && row.studyId === parts[2]);
      if (!study) {
        const updatedAt = Math.max(0, ...sources.flatMap(data => data.studies.filter(row => row.kind === parts[1] && row.studyId === parts[2]).map(row => row.updatedAt)));
        study = { kind: parts[1] as 'book' | 'word', studyId: String(parts[2]), saved: false, note: '', updatedAt }; result.studies.push(study);
      }
      if (parts[3] === 'note') study.note = String(value); else study.saved = true;
    }
  }
  if (!result.plans.plans.some(plan => plan.planId === result.plans.activePlanId)) result.plans.activePlanId = null;
  result.events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  result.sermons.sort((a, b) => b.updatedAt - a.updatedAt);
  return result;
}
// A per-field three-way merge. No wall-clock wins; conflicting text/deletion needs a choice.
export function mergeSync(base: BackupData | null, local: BackupData, cloud: BackupData, choices: SyncChoices = {}) {
  const before = rows(base ?? emptySyncData()); const left = rows(local); const right = rows(cloud);
  const keys = [...new Set([...before.keys(), ...left.keys(), ...right.keys()])].sort();
  const merged: Rows = new Map(); const conflicts: SyncConflict[] = [];
  let receive = 0; let send = 0; let removeLocal = 0; let removeCloud = 0;
  for (const key of keys) {
    const b = before.get(key); const l = left.get(key); const r = right.get(key); let value: Row | undefined;
    if (stable(l) === stable(r)) value = l;
    else if (stable(l) === stable(b)) value = r;
    else if (stable(r) === stable(b)) value = l;
    else {
      // Starting the same plan independently should not create a conflict.
      const parts = JSON.parse(key);
      if (parts[0] === 'plan' && parts[2] === 'started' && typeof l === 'number' && typeof r === 'number') value = Math.min(l, r);
      else {
        conflicts.push({ key, label: label(key, l ?? r), local: parts[0] === 'active' && typeof l === 'string' ? getReadingPlan(l)?.title ?? l : describe(l), cloud: parts[0] === 'active' && typeof r === 'string' ? getReadingPlan(r)?.title ?? r : describe(r) });
        value = choices[key] === 'cloud' ? r : l;
      }
    }
    if (value !== undefined) merged.set(key, value);
    if (stable(value) !== stable(l)) { receive++; if (value === undefined) removeLocal++; }
    if (stable(value) !== stable(r)) { send++; if (value === undefined) removeCloud++; }
  }
  return { data: inflate(merged, [local, cloud]), conflicts, receive, send, removeLocal, removeCloud,
    unresolved: conflicts.filter(conflict => choices[conflict.key] !== 'local' && choices[conflict.key] !== 'cloud').length };
}
