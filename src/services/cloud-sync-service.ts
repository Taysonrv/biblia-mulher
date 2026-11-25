import { decodeData, encodeData, backupCounts, type BackupData } from './backup-repository';
import { createDataCoordinator, DATA_KEYS, SYNC_STATE_KEY, type DataSnapshot, type LocalStorage } from './data-coordinator';
import { mergeSync, parseSyncPayload, syncPayload, stable, emptySyncData, type SyncChoices } from './cloud-sync-model';
import type { AgendaReminders } from './agenda-repository';

export interface CloudCopy { revision: number; payload: string }
export interface SyncSession { uid: string; assert(): void }
export interface SyncRemote {
  session(): SyncSession;
  read(session: SyncSession): Promise<CloudCopy | null>;
  write(session: SyncSession, expected: number, payload: string): Promise<number>;
}
interface Checkpoint { version: 1; owner: string; base: string | null; revision: number; lastSync: string | null }
interface Draft { token: number; session: SyncSession; snapshot: DataSnapshot; checkpointRaw: string | null; base: BackupData | null; local: BackupData; cloud: BackupData; revision: number }
export interface SyncPreview {
  token: number; uid: string; first: boolean; hasCloud: boolean; conflicts: ReturnType<typeof mergeSync>['conflicts'];
  localCounts: ReturnType<typeof backupCounts>; cloudCounts: ReturnType<typeof backupCounts>;
}
export function syncErrorMessage(reason: unknown): string {
  const code = reason && typeof reason === 'object' && 'code' in reason ? String(reason.code) : '';
  if (code.includes('permission-denied')) return 'A nuvem não permitiu o acesso. Confira se o Firestore foi ativado e se as regras da sincronização foram publicadas. Seus dados locais foram preservados.';
  if (/unavailable|deadline-exceeded|network-request-failed/.test(code)) return 'Não foi possível conectar. Seus dados continuam no aparelho. Conecte-se à internet e tente novamente.';
  if (code.includes('failed-precondition')) return 'O Firestore ainda precisa ser configurado para esta conta. Seus dados locais foram preservados.';
  return reason instanceof Error ? reason.message : 'Não foi possível sincronizar. Seus dados locais foram preservados. Tente novamente.';
}
export function createCloudSyncService(storage: LocalStorage, coordinator: ReturnType<typeof createDataCoordinator>, remote: SyncRemote, reminders: AgendaReminders, now = () => Date.now()) {
  let sequence = 0; let draft: Draft | null = null;
  async function checkpoint(session: SyncSession) {
    const raw = await storage.getItem(SYNC_STATE_KEY);
    if (raw === null) return { raw, state: null };
    let state: Checkpoint;
    try {
      state = JSON.parse(raw);
      if (state.version !== 1 || typeof state.owner !== 'string' || !state.owner || !Number.isSafeInteger(state.revision) || state.revision < 0
        || (state.base !== null && typeof state.base !== 'string') || (state.lastSync !== null && (typeof state.lastSync !== 'string' || !Number.isFinite(Date.parse(state.lastSync))))) throw Error();
      if (state.base !== null) await parseSyncPayload(state.base);
    } catch { throw Error('O vínculo da sincronização não pôde ser lido. Seus dados foram preservados. Use o backup em arquivo antes de continuar.'); }
    if (state.owner !== session.uid) throw Error('Os dados deste aparelho estão vinculados a outra conta. Entre com a conta original para sincronizar. O backup em arquivo continua disponível.');
    return { raw, state };
  }
  function current(token: number) {
    if (!draft || draft.token !== token) throw Error('Confira uma nova prévia antes de sincronizar.');
    draft.session.assert(); return draft;
  }
  return {
    cancel() { sequence++; draft = null; },
    status: () => coordinator.run(async () => {
      const session = remote.session(); const { state } = await checkpoint(session); session.assert();
      return { linked: !!state, lastSync: state?.lastSync ?? null };
    }),
    prepare: () => {
      const token = ++sequence; draft = null;
      return coordinator.run(async (): Promise<SyncPreview> => {
        const session = remote.session(); const { raw, state } = await checkpoint(session);
        const snapshot = await coordinator.snapshot(); const local = await decodeData(snapshot);
        // Normalize device-only notification state before comparing with the cloud baseline.
        const normalized = await parseSyncPayload(syncPayload({ ...local, events: local.events.map(event => ({ ...event, reminderState: event.reminderMinutes === null ? 'off' : 'failed' })) }));
        const copy = await remote.read(session); session.assert();
        if (token !== sequence) throw Error('A conferência foi cancelada. Nada foi alterado.');
        if (state?.base && (!copy || copy.revision < state.revision)) throw Error('A cópia da nuvem foi removida ou voltou a uma versão anterior. Nada foi sobrescrito. Confira o backup antes de continuar.');
        const cloud = copy ? await parseSyncPayload(copy.payload) : emptySyncData();
        const base = state?.base ? await parseSyncPayload(state.base) : null;
        session.assert();
        if (token !== sequence) throw Error('A conferência foi cancelada. Nada foi alterado.');
        draft = { token, session, snapshot, checkpointRaw: raw, base, local: normalized, cloud, revision: copy?.revision ?? 0 };
        const merged = mergeSync(base, normalized, cloud);
        return { token, uid: session.uid, first: !state?.base, hasCloud: !!copy, conflicts: merged.conflicts, localCounts: backupCounts(normalized), cloudCounts: backupCounts(cloud) };
      });
    },
    review(token: number, choices: SyncChoices) {
      const item = current(token); const result = mergeSync(item.base, item.local, item.cloud, choices);
      return { receive: result.receive, send: result.send, removeLocal: result.removeLocal, removeCloud: result.removeCloud, unresolved: result.unresolved, counts: backupCounts(result.data) };
    },
    confirm: (token: number, choices: SyncChoices) => coordinator.run(async () => {
      const item = current(token); const { session } = item;
      const snapshot = await coordinator.snapshot();
      if (DATA_KEYS.some(key => snapshot[key] !== item.snapshot[key]) || await storage.getItem(SYNC_STATE_KEY) !== item.checkpointRaw) {
        draft = null; throw Error('Seus dados mudaram desde a prévia. Confira novamente antes de sincronizar.');
      }
      const result = mergeSync(item.base, item.local, item.cloud, choices);
      if (result.unresolved) throw Error('Escolha a versão de cada registro diferente antes de continuar.');
      const validated = await parseSyncPayload(syncPayload(result.data));
      // Validate all local row limits before making any cloud mutation.
      const local = await decodeData(snapshot);
      const content = (event: BackupData['events'][number]) => { const { reminderState: _state, ...fields } = event; return stable(fields); };
      const localEvents = new Map(local.events.map(event => [event.id, event]));
      const afterEvents = validated.events.map(event => {
        const previous = localEvents.get(event.id);
        return previous && content(previous) === content(event) ? previous : event;
      });
      const studies = validated.studies.map(study => {
        const previous = local.studies.find(row => row.kind === study.kind && row.studyId === study.studyId);
        return previous && previous.saved === study.saved && previous.note === study.note ? study
          : { ...study, updatedAt: Math.max(now(), study.updatedAt, (previous?.updatedAt ?? -1) + 1) };
      });
      const sermons = validated.sermons.map(sermon => {
        const previous = local.sermons.find(row => row.id === sermon.id);
        const content = (row: typeof sermon) => { const { updatedAt: _updatedAt, ...fields } = row; return stable(fields); };
        return previous && content(previous) === content(sermon) ? sermon
          : { ...sermon, updatedAt: Math.max(now(), sermon.updatedAt, (previous?.updatedAt ?? -1) + 1) };
      });
      const afterData = { ...validated, events: afterEvents, studies, sermons }; const after = encodeData(afterData);
      const payload = syncPayload({ ...afterData, events: validated.events });
      await parseSyncPayload(payload);
      // Claim only after explicit confirmation. On failure this protects against uploading to another account.
      if (item.checkpointRaw === null) {
        session.assert();
        await storage.setItem(SYNC_STATE_KEY, JSON.stringify({ version: 1, owner: session.uid, base: null, revision: 0, lastSync: null } satisfies Checkpoint));
      }
      session.assert();
      const revision = await remote.write(session, item.revision, payload);
      session.assert();
      const cancelled: BackupData['events'] = [];
      try {
        for (const previous of local.events) {
          const next = afterEvents.find(event => event.id === previous.id);
          if ((!next || content(next) !== content(previous)) && previous.reminderState === 'scheduled') {
            session.assert(); await reminders.cancel(previous.id); cancelled.push(previous);
          }
        }
        session.assert();
        const lastSync = new Date(now()).toISOString();
        const state: Checkpoint = { version: 1, owner: session.uid, base: payload, revision, lastSync };
        await coordinator.commit(after, JSON.stringify(state), () => session.assert());
        draft = null;
        return { lastSync, counts: backupCounts(afterData), reviewReminders: afterEvents.some(event => event.reminderState === 'failed'), changed: !!(result.send || result.receive) };
      } catch (reason) {
        draft = null;
        // If the local atomic commit rolls back, restore notifications from its before image too.
        let failed = false;
        for (const previous of cancelled) {
          try { const state = await reminders.schedule(previous); if (state !== 'scheduled' && state !== 'past') failed = true; }
          catch { failed = true; }
        }
        if (failed) throw Error('A sincronização não terminou neste aparelho. Seus registros locais foram preservados, mas confira os lembretes na agenda antes de tentar novamente.');
        throw reason;
      }
    }),
  };
}
