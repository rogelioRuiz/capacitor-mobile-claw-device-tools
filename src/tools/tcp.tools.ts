import { NetworkTools } from 'capacitor-network-tools'
import type { DeviceTool } from '../types'

export const tcpTools: DeviceTool[] = [
  {
    name: 'tcp_connect',
    description:
      'Open a raw TCP socket connection to a host and port. Use for custom protocols (modbus, proprietary IoT protocols, etc). Returns a socket ID for subsequent send/read/disconnect calls.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Hostname or IP address' },
        port: { type: 'number', description: 'TCP port number' },
        timeout: { description: 'Connection timeout in milliseconds (default: 10000)', type: 'number' },
      },
      required: ['host', 'port'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.tcpConnect({
        host: args.host,
        port: args.port,
        timeout: args.timeout,
      })
      return { socketId: result.socketId }
    },
  },
  {
    name: 'tcp_send',
    description: 'Send data over an established TCP socket connection. Data should be base64-encoded.',
    inputSchema: {
      type: 'object',
      properties: {
        socketId: { type: 'string', description: 'Socket ID from tcp_connect' },
        data: { type: 'string', description: 'Base64-encoded data to send' },
      },
      required: ['socketId', 'data'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await NetworkTools.tcpSend({ socketId: args.socketId, data: args.data })
      return { success: true }
    },
  },
  {
    name: 'tcp_read',
    description: 'Read data from an established TCP socket. Returns base64-encoded response data.',
    inputSchema: {
      type: 'object',
      properties: {
        socketId: { type: 'string', description: 'Socket ID from tcp_connect' },
        timeout: { description: 'Read timeout in milliseconds (default: 10000)', type: 'number' },
      },
      required: ['socketId'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.tcpRead({
        socketId: args.socketId,
        timeout: args.timeout,
      })
      return { data: result.data, encoding: 'base64' }
    },
  },
  {
    name: 'tcp_disconnect',
    description: 'Close a TCP socket connection and free resources.',
    inputSchema: {
      type: 'object',
      properties: { socketId: { type: 'string', description: 'Socket ID to disconnect' } },
      required: ['socketId'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await NetworkTools.tcpDisconnect({ socketId: args.socketId })
      return { success: true }
    },
  },
]
