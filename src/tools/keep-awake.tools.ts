import type { DeviceTool } from '../types'

export const keepAwakeTools: DeviceTool[] = [
  {
    name: 'screen_keep_awake',
    description: 'Prevent the device screen from turning off. Useful during long-running operations.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { KeepAwake } = await import('@capacitor-community/keep-awake')
      await KeepAwake.keepAwake()
      return { keepingAwake: true }
    },
  },
  {
    name: 'screen_allow_sleep',
    description: 'Allow the device screen to turn off normally again.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { KeepAwake } = await import('@capacitor-community/keep-awake')
      await KeepAwake.allowSleep()
      return { keepingAwake: false }
    },
  },
]
