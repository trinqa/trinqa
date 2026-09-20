import { useEffect, useState } from 'react';

import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { AppState } from 'react-native';

import {
  consumeLaunchNotificationTap,
  getPushPermission,
  resolveNotificationRoute,
  showNotificationsInForeground,
  type PushPermission,
} from '@/services/pushNotifications';

/**
 * Mounted once from the root layout: shows notifications while the app is open and opens
 * the screen a tapped notification asks for.
 */
export function useNotificationTaps() {
  const router = useRouter();

  useEffect(() => {
    showNotificationsInForeground();

    // navigate() reuses a screen that is already open, so taps cannot stack copies of it.
    const open = (data: unknown) => router.navigate(resolveNotificationRoute(data));

    const launchTap = consumeLaunchNotificationTap();
    if (launchTap) open(launchTap.notification.request.content.data);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      open(response.notification.request.content.data),
    );
    return () => subscription.remove();
  }, [router]);
}

/** The OS notification setting, re-read when the app comes back to the front. */
export function usePushPermission(): PushPermission | null {
  const [permission, setPermission] = useState<PushPermission | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      void getPushPermission().then((next) => {
        if (!cancelled) setPermission(next);
      });
    };
    check();
    // The user can flip the setting in the OS settings app and come straight back.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return permission;
}
