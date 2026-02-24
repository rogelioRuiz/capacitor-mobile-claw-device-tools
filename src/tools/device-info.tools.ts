import type { DeviceTool } from '../types'

export const deviceInfoTools: DeviceTool[] = [
  {
    name: 'device_get_info',
    description: 'Get detailed information about the device: model, platform, OS version, manufacturer, etc.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { Device } = await import('@capacitor/device')
      const info = await Device.getInfo()
      const id = await Device.getId()
      const lang = await Device.getLanguageCode()
      return {
        identifier: id.identifier,
        name: info.name,
        model: info.model,
        platform: info.platform,
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        isVirtual: info.isVirtual,
        webViewVersion: info.webViewVersion,
        languageCode: lang.value,
      }
    },
  },
  {
    name: 'device_get_battery',
    description: 'Get the device battery level and charging status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { Device } = await import('@capacitor/device')
      const battery = await Device.getBatteryInfo()
      return {
        batteryLevel: battery.batteryLevel,
        isCharging: battery.isCharging,
      }
    },
  },
]
