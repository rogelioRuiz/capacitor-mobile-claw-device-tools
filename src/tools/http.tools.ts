import { NetworkTools } from '../plugin'
import type { DeviceTool } from '../types'

export const httpTools: DeviceTool[] = [
  {
    name: 'http_request',
    description:
      'Make an HTTP/HTTPS request from the device to any local network or internet endpoint. Full curl equivalent — supports GET, POST, PUT, DELETE, PATCH with custom headers and body. Can access local IPs (192.168.x.x, 10.x.x.x) that are unreachable from the cloud. Set insecure=true for self-signed certificates on IoT devices.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL (e.g. "http://192.168.1.1/api/status", "https://printer.local:443/info")',
        },
        method: {
          description: 'HTTP method: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS (default: GET)',
          type: 'string',
        },
        headers: {
          description:
            'HTTP headers as key-value pairs (e.g. {"Authorization": "Bearer ...", "Content-Type": "application/json"})',
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        body: { description: 'Request body (for POST/PUT/PATCH). Send JSON as a string.', type: 'string' },
        timeout: { description: 'Request timeout in milliseconds (default: 30000)', type: 'number' },
        insecure: {
          description: 'Skip TLS certificate verification for self-signed certs (default: false)',
          type: 'boolean',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.httpRequest({
        url: args.url,
        method: args.method || 'GET',
        headers: args.headers,
        body: args.body,
        timeout: args.timeout,
        insecure: args.insecure,
      })
      return {
        statusCode: result.statusCode,
        headers: result.headers,
        body: result.body,
      }
    },
  },
]
