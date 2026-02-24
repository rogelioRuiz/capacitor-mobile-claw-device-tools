import { App } from '@capacitor/app'
import type { DeviceTool } from '../types'

export const appStateTools: DeviceTool[] = [
  {
    name: 'app_get_info',
    description: 'Get the application name, version, and build number.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const info = await App.getInfo()
      return { name: info.name, id: info.id, version: info.version, build: info.build }
    },
  },
  {
    name: 'app_get_state',
    description: 'Check whether the app is currently active (foreground) or in the background.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const state = await App.getState()
      return { isActive: state.isActive }
    },
  },
]
