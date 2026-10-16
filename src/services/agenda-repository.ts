import {
  agendaNotificationId, EVENT_CATEGORIES, REMINDER_OPTIONS, validateDraft,
  type AgendaEvent, type EventDraft, type ReminderState,
} from './agenda-model';

export const AGENDA_STORAGE_KEY = '@biblia-mulher/agenda/v1';
export interface AgendaStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface AgendaReminders {
  schedule(event: AgendaEvent): Promise<ReminderState>;
  cancel(eventId: string): Promise<void>;
}
function isEvent(value: unknown): value is AgendaEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return typeof event.id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(event.id)
    && typeof event.title === 'string' && event.title.trim().length > 0 && event.title.length <= 100
    && typeof event.startsAt === 'string' && Number.isFinite(Date.parse(event.startsAt))
    && typeof event.location === 'string' && event.location.length <= 150
    && typeof event.notes === 'string' && event.notes.length <= 1000
    && EVENT_CATEGORIES.some(category => category === event.category)
    && (event.sermonId == null || (typeof event.sermonId === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(event.sermonId)))
    && REMINDER_OPTIONS.some(option => option.minutes === event.reminderMinutes)
    && ['off', 'scheduled', 'denied', 'past', 'unavailable', 'failed'].includes(String(event.reminderState));
}
export function decodeAgenda(raw: string | null): AgendaEvent[] {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1
      || !('events' in data) || !Array.isArray(data.events) || !data.events.every(isEvent)
      || new Set(data.events.map(event => event.id)).size !== data.events.length) throw new Error();
    return data.events;
  } catch {
    // Do not silently discard a damaged store or overwrite it on the next save.
    throw new Error('Não foi possível ler a agenda salva. Seus dados foram preservados. Tente abrir a agenda novamente.');
  }
}
export function createAgendaRepository(storage: AgendaStorage, reminders: AgendaReminders, now = () => Date.now()) {
  let queue: Promise<unknown> = Promise.resolve();
  function serialize<T>(action: () => Promise<T>): Promise<T> {
    const next = queue.then(action);
    queue = next.catch(() => undefined);
    return next;
  }
  async function read() {
    return decodeAgenda(await storage.getItem(AGENDA_STORAGE_KEY))
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }
  async function write(events: AgendaEvent[]) {
    await storage.setItem(AGENDA_STORAGE_KEY, JSON.stringify({ version: 1, events }));
  }
  return {
    list: () => serialize(read),
    save: (draft: EventDraft, id?: string) => serialize(async () => {
      const fields = validateDraft(draft, now());
      const events = await read();
      const previous = id ? events.find(event => event.id === id) : undefined;
      if (id && !previous) throw new Error('Este compromisso não existe mais. Volte à agenda.');
      const event: AgendaEvent = { ...fields,
        id: previous?.id ?? now().toString(36) + '-' + Math.random().toString(36).slice(2, 12),
        reminderState: 'off' };
      // The same native identifier is used for edits and rollback, preventing duplicates.
      if (previous) {
        try { await reminders.cancel(previous.id); }
        catch { throw new Error('Não foi possível atualizar o lembrete anterior. O compromisso foi preservado. Tente novamente.'); }
      }
      try {
        event.reminderState = await reminders.schedule(event);
        await write([...events.filter(item => item.id !== event.id), event]);
      } catch {
        try {
          await reminders.cancel(event.id);
          if (previous) {
            const restored = await reminders.schedule(previous);
            if (previous.reminderState === 'scheduled' && restored !== 'scheduled' && restored !== 'past') throw new Error('Reminder rollback failed');
          }
        } catch {
          throw new Error('Não foi possível salvar. O compromisso anterior foi preservado, mas seu lembrete precisa ser revisado.');
        }
        throw new Error('Não foi possível salvar o compromisso. Tente novamente.');
      }
      return event;
    }),
    remove: (id: string) => serialize(async () => {
      const events = await read();
      const event = events.find(item => item.id === id);
      if (!event) return;
      try { await reminders.cancel(id); }
      catch { throw new Error('Não foi possível cancelar o lembrete. O compromisso foi preservado. Tente novamente.'); }
      try { await write(events.filter(item => item.id !== id)); }
      catch {
        try {
          const restored = await reminders.schedule(event);
          if (event.reminderState === 'scheduled' && restored !== 'scheduled' && restored !== 'past') throw new Error('Reminder rollback failed');
        }
        catch { throw new Error('O compromisso foi preservado, mas seu lembrete precisa ser revisado.'); }
        throw new Error('Não foi possível excluir o compromisso. Tente novamente.');
      }
    }),
  };
}
// Notification IDs are derived from stable event IDs; no secret or external account is needed.
export { agendaNotificationId };
