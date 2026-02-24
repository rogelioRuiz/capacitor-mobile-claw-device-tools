import type { DeviceTool } from '../types'

export const geolocationTools: DeviceTool[] = [
  {
    name: 'geolocation_get_current',
    description:
      'Get the current GPS position of the device. Returns latitude, longitude, altitude, accuracy, and speed.',
    inputSchema: {
      type: 'object',
      properties: {
        enableHighAccuracy: {
          description: 'Use GPS for high accuracy (default false, uses network location)',
          type: 'boolean',
        },
        timeout: { description: 'Timeout in milliseconds (default 10000)', type: 'number' },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const { Geolocation } = await import('@capacitor/geolocation')
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: args.enableHighAccuracy ?? false,
        timeout: args.timeout ?? 10000,
      })
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude,
        accuracy: pos.coords.accuracy,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      }
    },
  },
]
