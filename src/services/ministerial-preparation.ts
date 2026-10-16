import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREPARATION_KEY = '@biblia-mulher/preparation/v1';
export const PREPARATION_TASKS = [
  { id: 'text', title: 'Estudar a passagem bíblica' },
  { id: 'outline', title: 'Revisar o esboço ou as anotações' },
  { id: 'prayer', title: 'Reservar um momento de oração' },
  { id: 'materials', title: 'Separar materiais e confirmar o local' },
] as const;
export type PreparationTaskId = typeof PREPARATION_TASKS[number]['id'];
export type PreparationProgress = Record<string, PreparationTaskId[]>;

const validEventId = (id: string) => /^[a-zA-Z0-9-]{1,100}$/.test(id);
const validTask = (id: unknown): id is PreparationTaskId =>
  PREPARATION_TASKS.some(task => task.id === id);

export function decodePreparation(raw: string | null): PreparationProgress {
  if (raw === null) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1
      || !('progress' in data) || !data.progress || typeof data.progress !== 'object'
      || Array.isArray(data.progress)) throw new Error();
    const rows = data.progress as Record<string, unknown>;
    if (Object.keys(rows).length > 500) throw new Error();
    const result: PreparationProgress = {};
    for (const [eventId, tasks] of Object.entries(rows)) {
      if (!validEventId(eventId) || !Array.isArray(tasks)
        || tasks.length > PREPARATION_TASKS.length
        || !tasks.every(validTask) || new Set(tasks).size !== tasks.length) throw new Error();
      result[eventId] = tasks;
    }
    return result;
  } catch {
    throw new Error('Não foi possível ler sua preparação salva. Os dados foram preservados.');
  }
}

export function togglePreparation(progress: PreparationProgress, eventId: string, taskId: PreparationTaskId): PreparationProgress {
  if (!validEventId(eventId) || !validTask(taskId)) throw new Error('Tarefa inválida.');
  const previous = progress[eventId] ?? [];
  const next = previous.includes(taskId) ? previous.filter(id => id !== taskId) : [...previous, taskId];
  return { ...progress, [eventId]: next };
}

export function createPreparationRepository(storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem'>) {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    read: async () => {
      await queue;
      return decodePreparation(await storage.getItem(PREPARATION_KEY));
    },
    toggle: (eventId: string, taskId: PreparationTaskId) => {
      const action = queue.then(async () => {
        const previous = decodePreparation(await storage.getItem(PREPARATION_KEY));
        const next = togglePreparation(previous, eventId, taskId);
        await storage.setItem(PREPARATION_KEY, JSON.stringify({ version: 1, progress: next }));
        return next;
      });
      queue = action.catch(() => undefined);
      return action;
    },
  };
}
export const preparationRepository = createPreparationRepository(AsyncStorage);
