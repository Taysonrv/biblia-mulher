import { createReadingRepository, READING_KEY, type ReadingEntry } from './reading-repository';
import { createPlanRepository, PLAN_KEY, type PlanState } from './reading-plan-repository';
import { decodeAgenda, AGENDA_STORAGE_KEY } from './agenda-repository';
import type { AgendaEvent } from './agenda-model';
import { createDataCoordinator, DATA_KEYS, type DataSnapshot, type LocalStorage } from './data-coordinator';
import { decodeSermons, encodeSermons, sermonContent, SERMON_KEY, type SavedSermon } from './sermon-repository';
import { decodePersonalStudies, encodePersonalStudies, mergePersonalStudies, PERSONAL_STUDIES_KEY, type PersonalStudy } from './personal-studies-repository';

export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
export interface BackupData { reading: ReadingEntry[]; plans: PlanState; events: AgendaEvent[]; sermons: SavedSermon[]; studies: PersonalStudy[] }
export interface BackupFile { app: 'biblia-smart'; version: 1 | 2 | 3; createdAt: string; data: BackupData }
export interface BackupConflict { reference: string; current: string; incoming: string }
export interface BackupPreview {
  backup: BackupFile; baseline: DataSnapshot; merged: BackupData;
  notes: BackupConflict[]; studyNotes: BackupConflict[]; eventConflicts: number; sermonConflicts: number;
  addedFavorites: number; addedNotes: number; addedEvents: number; addedPlans: number; addedReadings: number; addedSermons: number; addedStudies: number; addedStudyNotes: number;
}
export function checkBackupSize(text: string) {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_BYTES) throw Error('Escolha um backup de até 8 MB.');
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!; bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes > MAX_BACKUP_BYTES) throw Error('Escolha um backup de até 8 MB.');
  }
}
async function decodeData(values: DataSnapshot): Promise<BackupData> {
  if (DATA_KEYS.some(key => values[key] !== null && !values[key]?.length)) throw Error('Dados locais inválidos. Seus registros foram preservados.');
  const raw = new Map<string, string | null>(Object.entries(values));
  const storage = { async getItem(key: string) { return raw.get(key) ?? null; }, async setItem() { throw Error('Somente leitura.'); } };
  const reading = (await createReadingRepository(storage).read()).map(({ book, chapter, verse, favorite, note }) => ({ book, chapter, verse, favorite, note }));
  const state = await createPlanRepository(storage).read();
  const plans: PlanState = { version: 1, activePlanId: state.activePlanId, plans: state.plans.map(({ planId, startedAt, completed }) => ({ planId, startedAt, completed: [...completed] })) };
  const events = decodeAgenda(values[AGENDA_STORAGE_KEY]).map(({ id, title, category, startsAt, location, notes, reminderMinutes, reminderState }) => ({ id, title, category, startsAt, location, notes, reminderMinutes, reminderState }));
  const sermons = decodeSermons(values[SERMON_KEY]);
  const studies = decodePersonalStudies(values[PERSONAL_STUDIES_KEY]);
  return { reading, plans, events, sermons, studies };
}
function encodeData(data: BackupData): DataSnapshot {
  return {
    [READING_KEY]: JSON.stringify({ version: 2, translation: 'almeida-1911', entries: data.reading }),
    [PLAN_KEY]: JSON.stringify(data.plans),
    [AGENDA_STORAGE_KEY]: JSON.stringify({ version: 1, events: data.events }),
    [SERMON_KEY]: encodeSermons(data.sermons),
    [PERSONAL_STUDIES_KEY]: encodePersonalStudies(data.studies),
  };
}
export async function parseBackup(raw: string): Promise<BackupFile> {
  checkBackupSize(raw);
  try {
    const file = JSON.parse(raw.replace(/^\uFEFF/, ''));
    if (file?.app !== 'biblia-smart' || ![1, 2, 3].includes(file.version) || typeof file.createdAt !== 'string'
      || !Number.isFinite(Date.parse(file.createdAt)) || !file.data || !Array.isArray(file.data.reading)
      || !Array.isArray(file.data.events) || !file.data.plans || (file.version >= 2 && !Array.isArray(file.data.sermons))
      || (file.version === 3 && !Array.isArray(file.data.studies))) throw Error();
    const data = await decodeData(encodeData({ ...file.data, sermons: file.version === 1 && file.data.sermons === undefined ? [] : file.data.sermons,
      studies: file.version < 3 && file.data.studies === undefined ? [] : file.data.studies }));
    return { app: 'biblia-smart', version: file.version, createdAt: new Date(file.createdAt).toISOString(), data };
  } catch { throw Error('Este arquivo não é um backup válido da Bíblia Smart ou usa uma versão incompatível. Nada foi alterado.'); }
}
const verseId = (entry: ReadingEntry) => entry.book + ':' + entry.chapter + ':' + entry.verse;
const eventContent = (event: AgendaEvent) => JSON.stringify([event.title.trim(), event.category, new Date(event.startsAt).toISOString(), event.location.trim(), event.notes.trim(), event.reminderMinutes]);
export function mergeBackup(current: BackupData, backup: BackupFile, baseline: DataSnapshot): BackupPreview {
  const preview: BackupPreview = { backup, baseline, merged: JSON.parse(JSON.stringify(current)), notes: [], studyNotes: [], eventConflicts: 0, sermonConflicts: 0, addedFavorites: 0, addedNotes: 0, addedEvents: 0, addedPlans: 0, addedReadings: 0, addedSermons: 0, addedStudies: 0, addedStudyNotes: 0 };
  const reading = new Map(preview.merged.reading.map(entry => [verseId(entry), entry]));
  for (const incoming of backup.data.reading) {
    let entry = reading.get(verseId(incoming));
    if (!entry) { entry = { ...incoming, favorite: false, note: '' }; reading.set(verseId(entry), entry); }
    if (incoming.favorite && !entry.favorite) { entry.favorite = true; preview.addedFavorites++; }
    if (incoming.note && !entry.note) { entry.note = incoming.note; preview.addedNotes++; }
    else if (incoming.note && entry.note !== incoming.note) preview.notes.push({ reference: incoming.book + ' ' + incoming.chapter + ':' + incoming.verse, current: entry.note, incoming: incoming.note });
  }
  preview.merged.reading = [...reading.values()].filter(entry => entry.favorite || entry.note);
  for (const incoming of backup.data.plans.plans) {
    let plan = preview.merged.plans.plans.find(item => item.planId === incoming.planId);
    if (!plan) { plan = { ...incoming, completed: [] }; preview.merged.plans.plans.push(plan); preview.addedPlans++; }
    const completed = new Set(plan.completed);
    for (const key of incoming.completed) if (!completed.has(key)) { completed.add(key); preview.addedReadings++; }
    plan.completed = [...completed]; plan.startedAt = Math.min(plan.startedAt, incoming.startedAt);
  }
  if (!current.plans.plans.length) preview.merged.plans.activePlanId = backup.data.plans.activePlanId;
  const events = new Map(preview.merged.events.map(event => [event.id, event]));
  const contents = new Set(preview.merged.events.map(eventContent));
  for (const incoming of backup.data.events) {
    const previous = events.get(incoming.id); const content = eventContent(incoming);
    if (previous) { if (eventContent(previous) !== content) preview.eventConflicts++; continue; }
    if (contents.has(content)) continue;
    // Device-specific scheduled notification state is never transported to a new device.
    events.set(incoming.id, { ...incoming, reminderState: incoming.reminderMinutes === null ? 'off' : 'failed' });
    contents.add(content); preview.addedEvents++;
  }
  preview.merged.events = [...events.values()].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const sermons = new Map(preview.merged.sermons.map(sermon => [sermon.id, sermon]));
  const sermonContents = new Set(preview.merged.sermons.map(sermonContent));
  for (const incoming of backup.data.sermons) {
    const previous = sermons.get(incoming.id); const content = sermonContent(incoming);
    if (previous) { if (sermonContent(previous) !== content) preview.sermonConflicts++; continue; }
    if (sermonContents.has(content)) continue;
    sermons.set(incoming.id, JSON.parse(JSON.stringify(incoming))); sermonContents.add(content); preview.addedSermons++;
  }
  preview.merged.sermons = [...sermons.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  // Check collection and Android row limits before presenting a restorable merge.
  encodeSermons(preview.merged.sermons);
  const studies = mergePersonalStudies(current.studies, backup.data.studies);
  preview.merged.studies = studies.entries; preview.addedStudies = studies.addedSaved; preview.addedStudyNotes = studies.addedNotes; preview.studyNotes = studies.conflicts;
  return preview;
}
export function backupCounts(data: BackupData) {
  return { favorites: data.reading.filter(entry => entry.favorite).length, notes: data.reading.filter(entry => entry.note).length, plans: data.plans.plans.length, readings: data.plans.plans.reduce((count, plan) => count + plan.completed.length, 0), events: data.events.length, sermons: data.sermons.length, studies: data.studies.filter(entry => entry.saved).length, studyNotes: data.studies.filter(entry => entry.note).length };
}
export function createBackupRepository(storage: LocalStorage, coordinator = createDataCoordinator(storage), now = () => Date.now()) {
  return {
    current: () => coordinator.run(async () => backupCounts(await decodeData(await coordinator.snapshot()))),
    export: () => coordinator.run(async () => {
      const data = await decodeData(await coordinator.snapshot());
      const date = new Date(now()); if (!Number.isFinite(date.getTime())) throw Error('Não foi possível conferir a data do backup.');
      const portable = { ...data, events: data.events.map(event => ({ ...event, reminderState: event.reminderMinutes === null ? 'off' as const : 'failed' as const })) };
      const file: BackupFile = { app: 'biblia-smart', version: 3, createdAt: date.toISOString(), data: portable };
      const text = JSON.stringify(file, null, 2); checkBackupSize(text); return { text, file };
    }),
    preview: (raw: string) => coordinator.run(async () => {
      const backup = await parseBackup(raw); const baseline = await coordinator.snapshot();
      return mergeBackup(await decodeData(baseline), backup, baseline);
    }),
    restore: (preview: BackupPreview) => coordinator.run(async () => {
      const baseline = await coordinator.snapshot();
      if (DATA_KEYS.some(key => baseline[key] !== preview.baseline[key])) throw Error('Seus dados mudaram desde a prévia. Selecione o arquivo novamente para conferir a combinação atualizada.');
      // Revalidate the input and recalculate the merge; never trust caller-supplied output fields.
      const backup = await parseBackup(JSON.stringify(preview.backup));
      const next = mergeBackup(await decodeData(baseline), backup, baseline);
      await coordinator.commit(encodeData(next.merged)); return next;
    }),
  };
}
