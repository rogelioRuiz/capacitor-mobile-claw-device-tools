import type { DeviceTool } from '../types'

export const nfcTools: DeviceTool[] = [
  {
    name: 'nfc_read',
    description:
      'Read an NFC tag. Starts scanning and returns when a tag is detected. Returns NDEF records from the tag.',
    inputSchema: {
      type: 'object',
      properties: { timeout: { description: 'Timeout in milliseconds (default 30000)', type: 'number' } },
      additionalProperties: false,
    },
    execute: async (args) => {
      const { CapacitorNfc } = await import('@capgo/capacitor-nfc')
      const timeoutMs = args.timeout ?? 30000

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(async () => {
          await CapacitorNfc.stopScanning()
          listener?.remove()
          reject(new Error('NFC read timed out'))
        }, timeoutMs)

        let listener: any
        CapacitorNfc.addListener('nfcEvent', (event) => {
          clearTimeout(timeout)
          CapacitorNfc.stopScanning()
          listener?.remove()
          resolve({
            tag: event,
          })
        }).then((h) => {
          listener = h
        })

        CapacitorNfc.startScanning()
      })
    },
  },
  {
    name: 'nfc_write',
    description: 'Write an NDEF text record to an NFC tag. Place the tag near the device after calling.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Text to write to the NFC tag' } },
      required: ['text'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { CapacitorNfc } = await import('@capgo/capacitor-nfc')
      await CapacitorNfc.write({
        records: [{ type: 'text', value: args.text }],
      } as any)
      return { success: true }
    },
  },
  {
    name: 'nfc_is_supported',
    description: 'Check if NFC is supported and enabled on this device.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { CapacitorNfc } = await import('@capgo/capacitor-nfc')
      const supported = await CapacitorNfc.isSupported()
      const status = await CapacitorNfc.getStatus()
      return { supported: supported.supported, status: status.status }
    },
  },
]
