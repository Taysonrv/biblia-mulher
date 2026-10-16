export const EVENT_CATEGORIES = ['Culto', 'Pregação', 'Estudo bíblico', 'Reunião', 'Mentoria', 'Evento', 'Outro'] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];
export const REMINDER_OPTIONS = [
  { minutes: null, label: 'Sem lembrete' },
  { minutes: 0, label: 'No horário' },
  { minutes: 10, label: '10 min antes' },
  { minutes: 30, label: '30 min antes' },
  { minutes: 60, label: '1 hora antes' },
  { minutes: 1440, label: '1 dia antes' },
] as const;
export type ReminderState = 'off' | 'scheduled' | 'denied' | 'past' | 'unavailable' | 'failed';
export type AgendaEvent = {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string;
  location: string;
  notes: string;
  reminderMinutes: number | null;
  reminderState: ReminderState;
  sermonId?: string | null;
};
export type EventDraft = {
  title: string;
  category: EventCategory;
  date: string;
  time: string;
  location: string;
  notes: string;
  reminderMinutes: number | null;
  sermonId?: string | null;
};
export function localDateKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function dateInput(date: Date): string {
  return [String(date.getDate()).padStart(2, '0'), String(date.getMonth() + 1).padStart(2, '0'), date.getFullYear()].join('/');
}
export function timeInput(date: Date): string {
  return [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0')].join(':');
}
export function parseLocalDateTime(date: string, time: string): Date {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const hours = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!parts) throw new Error('Informe a data no formato DD/MM/AAAA.');
  if (!hours) throw new Error('Informe o horário no formato HH:MM, como 19:30.');
  const [, day, month, year] = parts.map(Number);
  const [, hour, minute] = hours.map(Number);
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (year < 2000 || year > 2100 || result.getFullYear() !== year || result.getMonth() !== month - 1
    || result.getDate() !== day || result.getHours() !== hour || result.getMinutes() !== minute) {
    throw new Error('Confira a data e o horário: esse momento não existe no calendário local.');
  }
  return result;
}
export function validateDraft(draft: EventDraft, now: number): Omit<AgendaEvent, 'id' | 'reminderState'> {
  const title = draft.title.trim();
  if (!title || title.length > 100) throw new Error('Informe um título com até 100 caracteres.');
  if (!EVENT_CATEGORIES.includes(draft.category)) throw new Error('Escolha um tipo de compromisso.');
  if (!REMINDER_OPTIONS.some(option => option.minutes === draft.reminderMinutes)) throw new Error('Escolha uma opção de lembrete válida.');
  if (draft.sermonId != null && !/^[a-zA-Z0-9-]{1,80}$/.test(draft.sermonId)) throw new Error('Esboço vinculado inválido.');
  if (draft.location.length > 150 || draft.notes.length > 1000) throw new Error('Use até 150 caracteres no local e 1.000 nas anotações.');
  const startsAt = parseLocalDateTime(draft.date, draft.time);
  if (startsAt.getTime() <= now) throw new Error('Escolha uma data e um horário futuros para o compromisso.');
  return { title, category: draft.category, startsAt: startsAt.toISOString(),
    location: draft.location.trim(), notes: draft.notes.trim(), reminderMinutes: draft.reminderMinutes, ...(draft.sermonId ? { sermonId: draft.sermonId } : {}) };
}
export function eventToDraft(event: AgendaEvent): EventDraft {
  const date = new Date(event.startsAt);
  return { title: event.title, category: event.category, date: dateInput(date), time: timeInput(date),
    location: event.location, notes: event.notes, reminderMinutes: event.reminderMinutes, sermonId: event.sermonId ?? null };
}
export function reminderAt(event: Pick<AgendaEvent, 'startsAt' | 'reminderMinutes'>): number | null {
  return event.reminderMinutes === null ? null : new Date(event.startsAt).getTime() - event.reminderMinutes * 60_000;
}
export function reminderLabel(event: AgendaEvent, now = Date.now()): string {
  if (event.reminderState === 'off') return 'Sem lembrete';
  if (event.reminderState === 'denied') return 'Lembrete desativado: permissão negada';
  if (event.reminderState === 'unavailable') return 'Notificações indisponíveis neste ambiente. Teste uma versão de desenvolvimento do app.';
  if (event.reminderState === 'failed') return 'Lembrete não agendado. Edite para tentar novamente.';
  if (event.reminderState === 'past' || (reminderAt(event) ?? 0) <= now) return 'Horário do lembrete já passou';
  return 'Lembrete: ' + REMINDER_OPTIONS.find(option => option.minutes === event.reminderMinutes)?.label.toLowerCase();
}
export function monthDays(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const days: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); day++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day, 12));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}
export function agendaNotificationId(eventId: string): string {
  return 'biblia-mulher-agenda-' + eventId;
}
