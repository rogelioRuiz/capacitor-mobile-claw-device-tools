import { NetworkTools } from 'capacitor-network-tools'
import type { DeviceTool } from '../types'

export const wolTools: DeviceTool[] = [
  {
    name: 'wol_send',
    description:
      'Send a Wake-on-LAN magic packet to wake up a sleeping device on the local network. Requires the target device MAC address and that WoL is enabled in the device BIOS/firmware.',
    inputSchema: {
      type: 'object',
      properties: {
        macAddress: {
          type: 'string',
          description: 'Target device MAC address (e.g. "AA:BB:CC:DD:EE:FF" or "AA-BB-CC-DD-EE-FF")',
        },
        broadcastAddress: {
          description: 'Broadcast address for the subnet (default: "255.255.255.255")',
          type: 'string',
        },
      },
      required: ['macAddress'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await NetworkTools.wolSend({
        macAddress: args.macAddress,
        broadcastAddress: args.broadcastAddress,
      })
      return { success: true, macAddress: args.macAddress }
    },
  },
]
