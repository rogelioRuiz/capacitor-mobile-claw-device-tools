import type { DeviceTool } from '../types'

export const healthTools: DeviceTool[] = [
  {
    name: 'health_is_available',
    description: 'Check if health data (Apple Health / Google Health Connect) is available on this device.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { Health } = await import('@capgo/capacitor-health')
      const result = await Health.isAvailable()
      return { available: result.available }
    },
  },
  {
    name: 'health_request_auth',
    description: 'Request authorization to read specific health data types.',
    inputSchema: {
      type: 'object',
      properties: {
        read: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Health data types to request read access for (e.g. ["steps", "heartRate", "calories", "distance", "sleep"])',
        },
      },
      required: ['read'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { Health } = await import('@capgo/capacitor-health')
      const result = await Health.requestAuthorization({ read: args.read, write: [] })
      return result
    },
  },
  {
    name: 'health_query',
    description: 'Query health data samples for a specific type and date range.',
    inputSchema: {
      type: 'object',
      properties: {
        dataType: {
          type: 'string',
          description: 'Health data type (e.g. "steps", "heartRate", "calories", "distance", "sleep", "weight")',
        },
        startDate: { type: 'string', description: 'Start date in ISO 8601 format (e.g. "2025-01-01T00:00:00.000Z")' },
        endDate: { type: 'string', description: 'End date in ISO 8601 format' },
        limit: { description: 'Maximum number of samples to return (default 100)', type: 'number' },
      },
      required: ['dataType', 'startDate', 'endDate'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { Health } = await import('@capgo/capacitor-health')
      const result = await Health.readSamples({
        dataType: args.dataType,
        startDate: args.startDate,
        endDate: args.endDate,
        limit: args.limit ?? 100,
      } as any)
      return result
    },
  },
]
