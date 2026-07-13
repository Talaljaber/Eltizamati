import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import {
  cancelLocalReminder,
  getNotificationRoute,
  scheduleLocalReminder,
} from '../local-notification-service'

const mockStorage = new Map<string, string>()

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value)
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key)
    }),
    clear: jest.fn(async () => {
      mockStorage.clear()
    }),
  },
}))

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { MONTHLY: 'monthly' },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}))

describe('local notification scheduling', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
  })

  it('does not schedule when permission is denied', async () => {
    ;(Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    ;(Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    await expect(scheduleLocalReminder(12, { title: 'Title', body: 'Body' })).resolves.toBe(
      'permissionDenied',
    )
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('schedules localized minimized content monthly and can cancel it', async () => {
    ;(Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-1')
    await expect(scheduleLocalReminder(12, { title: 'تذكير', body: 'راجع التزامك' })).resolves.toBe(
      'scheduled',
    )
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'تذكير',
          body: 'راجع التزامك',
          data: { route: '/insights' },
        }),
        trigger: { type: 'monthly', day: 12, hour: 9, minute: 0 },
      }),
    )
    await cancelLocalReminder()
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-1')
  })

  it('allows only the known notification deep link', () => {
    expect(getNotificationRoute({ route: '/insights' })).toBe('/insights')
    expect(getNotificationRoute({ route: '/settings' })).toBeUndefined()
    expect(getNotificationRoute(null)).toBeUndefined()
  })
})
