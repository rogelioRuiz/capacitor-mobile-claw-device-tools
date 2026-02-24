import { LocalNotifications } from '@capacitor/local-notifications'
import type { DeviceTool } from '../types'

export const notificationsTools: DeviceTool[] = [
  {
    name: 'notification_schedule',
    description:
      'Schedule a local notification on the device. Appears in the notification tray after the specified delay.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Notification title' },
        body: { type: 'string', description: 'Notification body text' },
        delay_seconds: { description: 'Delay in seconds before showing (default: 1)', type: 'number' },
        id: { description: 'Unique notification ID (default: random)', type: 'number' },
      },
      required: ['title', 'body'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const id = args.id || Math.floor(Math.random() * 100000)
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: args.title,
            body: args.body,
            schedule: { at: new Date(Date.now() + (args.delay_seconds || 1) * 1000) },
          },
        ],
      })
      return { success: true, id }
    },
  },
  {
    name: 'notification_cancel',
    description: 'Cancel a previously scheduled local notification by its ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Notification ID to cancel' } },
      required: ['id'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await LocalNotifications.cancel({ notifications: [{ id: args.id }] })
      return { success: true }
    },
  },
]
