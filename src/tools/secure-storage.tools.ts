import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import type { DeviceTool } from '../types'

export const secureStorageTools: DeviceTool[] = [
  {
    name: 'secure_storage_get',
    description: 'Read an encrypted value from device secure storage by key. Returns null if key does not exist.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string', description: 'Storage key to read' } },
      required: ['key'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const value = await SecureStorage.get(args.key)
      return { key: args.key, value }
    },
  },
  {
    name: 'secure_storage_set',
    description: 'Store an encrypted key-value pair in device secure storage (iOS Keychain / Android Keystore).',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Storage key' },
        value: { type: 'string', description: 'Value to store (encrypted at rest)' },
      },
      required: ['key', 'value'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await SecureStorage.set(args.key, args.value)
      return { success: true }
    },
  },
  {
    name: 'secure_storage_remove',
    description: 'Delete an encrypted key-value pair from device secure storage.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string', description: 'Storage key to delete' } },
      required: ['key'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const removed = await SecureStorage.remove(args.key)
      return { success: removed }
    },
  },
]
