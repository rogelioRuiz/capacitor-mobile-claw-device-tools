import type { DeviceTool } from '../types'

export const pushNotificationsTools: DeviceTool[] = [
  {
    name: 'push_get_token',
    description: 'Register for push notifications and get the device push token (FCM on Android, APNs on iOS).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      await PushNotifications.requestPermissions()
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Push registration timed out'))
        }, 10000)
        PushNotifications.addListener('registration', (token) => {
          clearTimeout(timeout)
          resolve({ token: token.value })
        })
        PushNotifications.addListener('registrationError', (error) => {
          clearTimeout(timeout)
          reject(new Error(error.error))
        })
        PushNotifications.register()
      })
    },
  },
  {
    name: 'push_get_delivered',
    description: 'Get the list of push notifications delivered to the device notification tray.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      const result = await PushNotifications.getDeliveredNotifications()
      return {
        notifications: result.notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          data: n.data,
        })),
      }
    },
  },
]
