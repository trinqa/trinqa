import { PermissionStatus } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/services/api';

/** What the app is allowed to do with notifications right now, in the terms the UI needs. */
export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/** Routes a notification may open. A payload naming anything else lands on the home screen. */
const NOTIFICATION_ROUTES = [
  '/',
  '/activity',
  '/earn',
  '/pay',
  '/account-details',
  '/settings',
] as const;

export type NotificationRoute = (typeof NOTIFICATION_ROUTES)[number];

interface PushRegistration {
  accountId: string;
  expoPushToken: string;
}

/**
 * The token last handed to the backend and the account it was tied to. Same storage as the
 * wallet key: it survives restarts, so a relaunch does not re-POST an unchanged pair.
 */
function registrationFile() {
  return new File(Paths.document, 'trinqa-push-registration.json');
}

function loadRegistration(): PushRegistration | null {
  try {
    const file = registrationFile();
    if (!file.exists) return null;
    const parsed = JSON.parse(file.textSync()) as Partial<PushRegistration>;
    return typeof parsed.accountId === 'string' && typeof parsed.expoPushToken === 'string'
      ? { accountId: parsed.accountId, expoPushToken: parsed.expoPushToken }
      : null;
  } catch {
    return null;
  }
}

function saveRegistration(registration: PushRegistration) {
  try {
    const file = registrationFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(registration));
  } catch {
    // Losing the note only costs one redundant POST on the next launch.
  }
}

/** Expo issues a push token per EAS project; without the id there is no token to fetch. */
function easProjectId(): string | undefined {
  const value = Constants.expoConfig?.extra?.eas?.projectId as unknown;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toPermission(status: Notifications.NotificationPermissionsStatus): PushPermission {
  // Provisional authorisation on iOS delivers quietly, but it is still a yes.
  if (status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  return status.status === PermissionStatus.UNDETERMINED ? 'undetermined' : 'denied';
}

export async function getPushPermission(): Promise<PushPermission> {
  try {
    return toPermission(await Notifications.getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

let pendingRequest: Promise<PushPermission> | null = null;

/**
 * Asks at most once per launch, and only when the user has never answered: someone who
 * said no keeps that answer until they change it themselves in the OS settings.
 */
export function requestPushPermission(): Promise<PushPermission> {
  pendingRequest ??= (async () => {
    const current = await getPushPermission();
    if (current !== 'undetermined') return current;
    try {
      return toPermission(await Notifications.requestPermissionsAsync());
    } catch {
      return 'unavailable';
    }
  })();
  return pendingRequest;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  // Android 8+ shows nothing without a channel; 'default' is the one app.json names.
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Ties this device's Expo push token to the account. Safe to call whenever an account
 * resolves: every step returns quietly, because notifications are never worth a failure.
 */
export async function registerPushToken(accountId: string): Promise<void> {
  try {
    // Simulators and emulators have no push service to register with.
    if (!Device.isDevice) return;
    if ((await requestPushPermission()) !== 'granted') return;
    const projectId = easProjectId();
    if (!projectId) return;
    await ensureAndroidChannel();

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    const last = loadRegistration();
    if (last?.accountId === accountId && last.expoPushToken === expoPushToken) return;

    await api.registerPushDevice({ expoPushToken, platform: Platform.OS });
    saveRegistration({ accountId, expoPushToken });
  } catch {
    // No permission, no token, unreachable backend: all leave the app exactly as it was.
  }
}

/** Without a handler the OS hides notifications that arrive while the app is open. */
export function showNotificationsInForeground() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * The tap that launched the app, if there was one — it happened before any listener could
 * exist. Reading it clears it, so a later launch does not reopen the same screen again.
 * Both calls throw where notifications have no native module (web), hence the catch.
 */
export function consumeLaunchNotificationTap(): Notifications.NotificationResponse | null {
  try {
    const response = Notifications.getLastNotificationResponse();
    if (response) Notifications.clearLastNotificationResponse();
    return response;
  } catch {
    return null;
  }
}

/** Payload routes come from outside the app, so only screens that exist are honoured. */
export function resolveNotificationRoute(data: unknown): NotificationRoute {
  const route = (data as { route?: unknown } | null | undefined)?.route;
  if (typeof route !== 'string') return '/';
  return NOTIFICATION_ROUTES.find((known) => known === route) ?? '/';
}
