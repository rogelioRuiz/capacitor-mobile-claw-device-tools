import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import type { DeviceTool } from '../types'

export const hapticsTools: DeviceTool[] = [
  {
    name: 'haptics_impact',
    description: 'Trigger a haptic impact feedback on the device. Use to provide physical feedback for user actions.',
    inputSchema: {
      type: 'object',
      properties: {
        style: {
          description: 'Impact intensity (default: medium)',
          type: 'string',
          enum: ['heavy', 'medium', 'light'],
        },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const styleMap: Record<string, ImpactStyle> = {
        heavy: ImpactStyle.Heavy,
        medium: ImpactStyle.Medium,
        light: ImpactStyle.Light,
      }
      await Haptics.impact({ style: styleMap[args.style || 'medium'] })
      return { success: true }
    },
  },
  {
    name: 'haptics_notification',
    description: 'Trigger a haptic notification feedback (success, warning, or error vibration pattern).',
    inputSchema: {
      type: 'object',
      properties: { type: { type: 'string', enum: ['success', 'warning', 'error'], description: 'Notification type' } },
      required: ['type'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const typeMap: Record<string, NotificationType> = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      }
      await Haptics.notification({ type: typeMap[args.type] })
      return { success: true }
    },
  },
  {
    name: 'haptics_vibrate',
    description: 'Vibrate the device for a specified duration in milliseconds.',
    inputSchema: {
      type: 'object',
      properties: { duration: { description: 'Vibration duration in milliseconds (default: 300)', type: 'number' } },
      additionalProperties: false,
    },
    execute: async (args) => {
      await Haptics.vibrate({ duration: args.duration || 300 })
      return { success: true }
    },
  },
]
