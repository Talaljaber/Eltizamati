import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

const REMINDER_ID_KEY = '@Eltizamati:localReminderNotificationId'

export type ReminderScheduleResult = 'scheduled' | 'permissionDenied'

export interface LocalReminderContent {
  title: string
  body: string
}

/** Only allow known internal routes from untrusted notification payload data. */
export function getNotificationRoute(data: unknown): '/insights' | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  return (data as { route?: unknown }).route === '/insights' ? '/insights' : undefined
}

/** Schedules a recurring, content-minimized OS reminder outside quiet hours (09:00 local). */
export async function scheduleLocalReminder(
  dayOfMonth: number,
  content: LocalReminderContent,
): Promise<ReminderScheduleResult> {
  const permissions = await Notifications.getPermissionsAsync()
  const finalPermissions = permissions.granted
    ? permissions
    : await Notifications.requestPermissionsAsync()
  if (!finalPermissions.granted) return 'permissionDenied'

  const previousId = await AsyncStorage.getItem(REMINDER_ID_KEY)
  if (previousId !== null) await Notifications.cancelScheduledNotificationAsync(previousId)

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      data: { route: '/insights' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: dayOfMonth,
      hour: 9,
      minute: 0,
    },
  })
  await AsyncStorage.setItem(REMINDER_ID_KEY, id)
  return 'scheduled'
}

export async function cancelLocalReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY)
  if (id !== null) await Notifications.cancelScheduledNotificationAsync(id)
  await AsyncStorage.removeItem(REMINDER_ID_KEY)
}

let notificationNavigationEnabled = true

export function enableNotificationNavigation(): void {
  notificationNavigationEnabled = true
}

export function disableNotificationNavigation(): void {
  notificationNavigationEnabled = false
}

export function canNavigateNotificationResponse(): boolean {
  return notificationNavigationEnabled
}

/** Removes a prior user's retained notification response before another account can navigate it. */
export async function clearLastNotificationResponse(): Promise<void> {
  disableNotificationNavigation()
  await Notifications.clearLastNotificationResponseAsync()
}
