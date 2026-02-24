import type { DeviceTool } from '../types'

export const barcodeTools: DeviceTool[] = [
  {
    name: 'barcode_scan',
    description: 'Scan a barcode or QR code using the device camera. Returns the decoded barcode value and format.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning')
      const result = await BarcodeScanner.scan()
      return {
        barcodes: result.barcodes.map((b) => ({
          rawValue: b.rawValue,
          format: b.format,
          displayValue: b.displayValue,
        })),
      }
    },
  },
  {
    name: 'barcode_is_supported',
    description: 'Check if barcode scanning is supported on this device.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning')
      const result = await BarcodeScanner.isSupported()
      return { supported: result.supported }
    },
  },
]
