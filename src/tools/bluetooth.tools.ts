import type { DeviceTool } from '../types'

let bleInitialized = false

async function ensureBleInit() {
  if (!bleInitialized) {
    const { BleClient } = await import('@capacitor-community/bluetooth-le')
    await BleClient.initialize()
    bleInitialized = true
  }
}

export const bluetoothTools: DeviceTool[] = [
  {
    name: 'ble_scan',
    description:
      'Scan for nearby Bluetooth Low Energy (BLE) devices. Returns a list of discovered devices with names and signal strength.',
    inputSchema: {
      type: 'object',
      properties: {
        services: {
          description: 'Filter by service UUIDs (e.g. ["180d"] for heart rate)',
          type: 'array',
          items: { type: 'string' },
        },
        timeout: { description: 'Scan duration in milliseconds (default 5000)', type: 'number' },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const { BleClient } = await import('@capacitor-community/bluetooth-le')
      await ensureBleInit()
      const devices: any[] = []
      const scanDuration = args.timeout ?? 5000

      await BleClient.requestLEScan({ services: args.services }, (result) => {
        devices.push({
          deviceId: result.device.deviceId,
          name: result.device.name,
          rssi: result.rssi,
          localName: result.localName,
        })
      })

      await new Promise((resolve) => setTimeout(resolve, scanDuration))
      await BleClient.stopLEScan()

      // Deduplicate by deviceId, keeping strongest signal
      const seen = new Map<string, any>()
      for (const d of devices) {
        const existing = seen.get(d.deviceId)
        if (!existing || (d.rssi && d.rssi > existing.rssi)) {
          seen.set(d.deviceId, d)
        }
      }
      return { devices: [...seen.values()] }
    },
  },
  {
    name: 'ble_connect',
    description: 'Connect to a BLE device by its device ID.',
    inputSchema: {
      type: 'object',
      properties: { deviceId: { type: 'string', description: 'Device ID from ble_scan results' } },
      required: ['deviceId'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { BleClient } = await import('@capacitor-community/bluetooth-le')
      await ensureBleInit()
      await BleClient.connect(args.deviceId)
      const services = await BleClient.getServices(args.deviceId)
      return {
        connected: true,
        services: services.map((s) => ({
          uuid: s.uuid,
          characteristics: s.characteristics?.map((c) => ({
            uuid: c.uuid,
            properties: c.properties,
          })),
        })),
      }
    },
  },
  {
    name: 'ble_read',
    description: 'Read a value from a BLE characteristic.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Device ID' },
        service: { type: 'string', description: 'Service UUID' },
        characteristic: { type: 'string', description: 'Characteristic UUID' },
      },
      required: ['deviceId', 'service', 'characteristic'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { BleClient } = await import('@capacitor-community/bluetooth-le')
      const result = await BleClient.read(args.deviceId, args.service, args.characteristic)
      // Convert DataView to hex string
      const bytes = new Uint8Array(result.buffer)
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      return { hex, bytes: Array.from(bytes) }
    },
  },
  {
    name: 'ble_write',
    description: 'Write a value to a BLE characteristic.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Device ID' },
        service: { type: 'string', description: 'Service UUID' },
        characteristic: { type: 'string', description: 'Characteristic UUID' },
        value: { type: 'string', description: 'Hex string to write (e.g. "01ff")' },
      },
      required: ['deviceId', 'service', 'characteristic', 'value'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { BleClient, hexStringToDataView } = await import('@capacitor-community/bluetooth-le')
      await BleClient.write(args.deviceId, args.service, args.characteristic, hexStringToDataView(args.value))
      return { success: true }
    },
  },
  {
    name: 'ble_disconnect',
    description: 'Disconnect from a BLE device.',
    inputSchema: {
      type: 'object',
      properties: { deviceId: { type: 'string', description: 'Device ID' } },
      required: ['deviceId'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { BleClient } = await import('@capacitor-community/bluetooth-le')
      await BleClient.disconnect(args.deviceId)
      return { disconnected: true }
    },
  },
]
