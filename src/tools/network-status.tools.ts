import { Network } from '@capacitor/network'
import type { DeviceTool } from '../types'

export const networkStatusTools: DeviceTool[] = [
  {
    name: 'network_status',
    description:
      'Get the current network connection status of the device (wifi, cellular, none) and whether it is connected.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const status = await Network.getStatus()
      return {
        connected: status.connected,
        connectionType: status.connectionType,
      }
    },
  },
]
