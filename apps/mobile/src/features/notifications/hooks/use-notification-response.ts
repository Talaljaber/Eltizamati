import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { getNotificationRoute } from '@/services/local-notification-service'

/** Bridges OS notification responses into the app's allow-listed navigation surface. */
export function useNotificationResponse(): void {
  const router = useRouter()

  useEffect(() => {
    const openResponse = (response: Notifications.NotificationResponse | null) => {
      if (response === null) return
      const route = getNotificationRoute(response.notification.request.content.data)
      if (route !== undefined) router.push(route)
    }
    void Notifications.getLastNotificationResponseAsync().then(openResponse)
    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse)
    return () => subscription.remove()
  }, [router])
}
