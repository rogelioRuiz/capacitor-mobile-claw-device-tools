import { NetworkTools } from 'capacitor-network-tools'
import type { DeviceTool } from '../types'

export const udpTools: DeviceTool[] = [
  {
    name: 'udp_send',
    description:
      'Send a UDP datagram to a specific host and port. Use for stateless protocols, SNMP, syslog, custom IoT messaging.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Destination hostname or IP address' },
        port: { type: 'number', description: 'Destination UDP port' },
        data: { type: 'string', description: 'Base64-encoded data to send' },
      },
      required: ['host', 'port', 'data'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await NetworkTools.udpSend({ host: args.host, port: args.port, data: args.data })
      return { success: true }
    },
  },
  {
    name: 'udp_broadcast',
    description:
      'Send a UDP broadcast packet to all devices on the local network segment. Useful for device discovery and Wake-on-LAN.',
    inputSchema: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'Destination UDP port' },
        data: { type: 'string', description: 'Base64-encoded data to broadcast' },
      },
      required: ['port', 'data'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await NetworkTools.udpBroadcast({ port: args.port, data: args.data })
      return { success: true }
    },
  },
]
