import { READING_KEY } from './reading-repository';
import { PLAN_KEY } from './reading-plan-repository';
import { AGENDA_STORAGE_KEY } from './agenda-repository';
import { SERMON_KEY } from './sermon-repository';
import { PERSONAL_STUDIES_KEY } from './personal-studies-repository';

export interface LocalStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }
const LEGACY_DATA_KEYS = [READING_KEY, PLAN_KEY, AGENDA_STORAGE_KEY] as const;
const SERMON_DATA_KEYS = [...LEGACY_DATA_KEYS, SERMON_KEY] as const;
export const DATA_KEYS = [...SERMON_DATA_KEYS, PERSONAL_STUDIES_KEY] as const;
export const RESTORE_JOURNAL_KEY = '@biblia-smart/restore-journal/v1';
export type DataSnapshot = Record<typeof DATA_KEYS[number], string | null>;

// App repositories and backups share this queue, including recovery after an interrupted restore.
export function createDataCoordinator(storage: LocalStorage) {
  let queue: Promise<unknown> = Promise.resolve();
  async function snapshot(): Promise<DataSnapshot> {
    const values = await Promise.all(DATA_KEYS.map(key => storage.getItem(key)));
    return Object.fromEntries(DATA_KEYS.map((key, index) => [key, values[index]])) as DataSnapshot;
  }
  async function writeSnapshot(values: Partial<DataSnapshot>) {
    for (const key of DATA_KEYS) {
      // Older interrupted restores must not touch rows introduced in later versions.
      if (!Object.prototype.hasOwnProperty.call(values, key)) continue;
      if (values[key] === null) await storage.removeItem(key);
      else await storage.setItem(key, values[key]!);
    }
  }
  async function recover() {
    const raw = await storage.getItem(RESTORE_JOURNAL_KEY);
    if (raw === null) return;
    try {
      const journal = JSON.parse(raw);
      const keys = journal?.before && Object.keys(journal.before);
      const expected = keys?.length === LEGACY_DATA_KEYS.length ? LEGACY_DATA_KEYS : keys?.length === SERMON_DATA_KEYS.length ? SERMON_DATA_KEYS : DATA_KEYS;
      if (journal?.version !== 1 || !journal.before || typeof journal.before !== 'object'
        || keys.length !== expected.length || keys.some((key: string) => !DATA_KEYS.includes(key as typeof DATA_KEYS[number]))
        || expected.some(key => !Object.prototype.hasOwnProperty.call(journal.before, key) || (journal.before[key] !== null && typeof journal.before[key] !== 'string'))) throw Error();
      await writeSnapshot(journal.before);
      await storage.removeItem(RESTORE_JOURNAL_KEY);
    } catch { throw Error('Uma restauração interrompida precisa ser recuperada. Seus dados foram preservados; tente novamente.'); }
  }
  function run<T>(action: () => Promise<T>): Promise<T> {
    const task = queue.then(async () => { await recover(); return action(); });
    queue = task.catch(() => undefined); return task;
  }
  // Only call inside run(), so other repository operations cannot interleave with the transaction.
  async function commit(after: DataSnapshot) {
    const before = await snapshot();
    const journal = JSON.stringify({ version: 1, before });
    await storage.setItem(RESTORE_JOURNAL_KEY, journal);
    try {
      // Confirm recovery data and restored rows can be read before declaring success.
      // This also catches per-row storage limits on Android.
      if (await storage.getItem(RESTORE_JOURNAL_KEY) !== journal) throw Error('Recovery record could not be verified');
      await writeSnapshot(after);
      const stored = await snapshot();
      if (DATA_KEYS.some(key => stored[key] !== after[key])) throw Error('Restored rows could not be verified');
      await storage.removeItem(RESTORE_JOURNAL_KEY);
    } catch {
      try { await writeSnapshot(before); await storage.removeItem(RESTORE_JOURNAL_KEY); }
      catch { throw Error('A restauração não terminou. A recuperação será retomada antes de acessar seus dados. Tente novamente.'); }
      throw Error('Não foi possível restaurar. Os dados anteriores foram recuperados. Tente novamente.');
    }
  }
  function wrap<T extends object>(repository: T): T {
    return new Proxy(repository, { get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return typeof value === 'function' ? (...args: unknown[]) => run(() => value.apply(target, args)) : value;
    } });
  }
  return { run, snapshot, commit, wrap };
}
