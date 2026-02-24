import { Clipboard } from '@capacitor/clipboard'
import type { DeviceTool } from '../types'

export const clipboardTools: DeviceTool[] = [
  {
    name: 'clipboard_read',
    description: 'Read the current text content from the device clipboard.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const result = await Clipboard.read()
      return { type: result.type, value: result.value }
    },
  },
  {
    name: 'clipboard_write',
    description: 'Write text to the device clipboard.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Text to write to the clipboard' } },
      required: ['text'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await Clipboard.write({ string: args.text })
      return { success: true }
    },
  },
]
