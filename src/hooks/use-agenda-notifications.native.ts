import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import * as Notifications from '@/services/local-notifications.native';
import '@/services/agenda-reminders';
export function useAgendaNotifications() {
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (!navigation?.key) return;
    function open(response: Notifications.NotificationResponse | null) {
      const data = response?.notification.request.content.data;
      if (data?.source !== 'ministerial-agenda' || typeof data.eventId !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(data.eventId)) return;
      Notifications.clearLastNotificationResponse();
      router.push({ pathname: '/agenda', params: { eventId: data.eventId } });
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    open(Notifications.getLastNotificationResponse());
    return () => subscription.remove();
  }, [navigation?.key]);
}
