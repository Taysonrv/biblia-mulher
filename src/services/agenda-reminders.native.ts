import { Platform } from 'react-native';
import * as Notifications from './local-notifications.native';
import { agendaNotificationId, reminderAt, type AgendaEvent, type ReminderState } from './agenda-model';
import type { AgendaReminders } from './agenda-repository';

const CHANNEL_ID = 'ministerial-agenda-v2';
Notifications.setNotificationHandler({
  handleNotification: async notification => ({
    shouldShowBanner: notification.request.content.data?.source === 'ministerial-agenda',
    shouldShowList: notification.request.content.data?.source === 'ministerial-agenda',
    shouldPlaySound: notification.request.content.data?.source === 'ministerial-agenda',
    shouldSetBadge: false,
  }),
});
function allowed(permissions: Notifications.NotificationPermissionsStatus) {
  if (Platform.OS === 'ios') return permissions.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    || permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
  return permissions.granted;
}
export const agendaReminders: AgendaReminders = {
  async schedule(event: AgendaEvent): Promise<ReminderState> {
    const when = reminderAt(event);
    if (when === null) return 'off';
    if (when <= Date.now()) return 'past';
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Agenda ministerial', importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250], lightColor: '#687B65',
        });
      }
      let permissions = await Notifications.getPermissionsAsync();
      if (!allowed(permissions) && permissions.canAskAgain) {
        permissions = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        });
      }
      if (!allowed(permissions)) return 'denied';
      // Permission dialogs can take time; never schedule an already elapsed reminder.
      if (when <= Date.now()) return 'past';
      await Notifications.scheduleNotificationAsync({
        identifier: agendaNotificationId(event.id),
        content: {
          title: event.title,
          body: [new Date(event.startsAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), event.location].filter(Boolean).join(' • '),
          ...(Platform.OS === 'ios' ? { sound: 'default' as const } : {}),
          data: { source: 'ministerial-agenda', eventId: event.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when), channelId: CHANNEL_ID },
      });
      return 'scheduled';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Some Expo Go Android runtimes lack the native notification channels provider.
      // Do not suggest retrying an edit when the underlying native service is absent.
      if (Platform.OS === 'android' && message.includes('NotificationsChannelsProvider')) {
        console.warn('[Agenda Ministerial] Canal nativo indisponível neste ambiente:', message);
        return 'unavailable';
      }
      console.error('[Agenda Ministerial] Falha ao agendar lembrete:', error);
      return 'failed';
    }
  },
  async cancel(eventId) {
    await Notifications.cancelScheduledNotificationAsync(agendaNotificationId(eventId));
  },
};
