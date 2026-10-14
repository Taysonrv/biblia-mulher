// Web fallback. Metro uses agenda-reminders.native.ts on Android and iOS.
import type { AgendaReminders } from './agenda-repository';
export const agendaReminders: AgendaReminders = {
  async schedule(event) { return event.reminderMinutes === null ? 'off' : 'unavailable'; },
  async cancel() {},
};
