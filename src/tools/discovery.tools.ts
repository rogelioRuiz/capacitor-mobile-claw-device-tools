import { NetworkTools } from 'capacitor-network-tools'
import type { DeviceTool } from '../types'

export const discoveryTools: DeviceTool[] = [
  {
    name: 'ping',
    description: 'Ping a host to check if it is reachable on the network. Returns reachability and latency.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Hostname or IP address to ping (e.g. "192.168.1.50", "printer.local")' },
        timeout: { description: 'Ping timeout in milliseconds (default: 5000)', type: 'number' },
      },
      required: ['host'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.ping({
        host: args.host,
        timeout: args.timeout,
      })
      return { reachable: result.reachable, latencyMs: result.latencyMs }
    },
  },
  {
    name: 'network_scan',
    description:
      'Scan a subnet to discover all live hosts and their open ports. Useful for finding printers, IoT devices, routers, and other equipment on the local network. Returns a list of discovered hosts with their IP addresses and open ports.',
    inputSchema: {
      type: 'object',
      properties: {
        subnet: { type: 'string', description: 'Subnet in CIDR notation (e.g. "192.168.1.0/24", "10.0.0.0/24")' },
        ports: {
          description:
            'Ports to scan on each host (default: [22, 80, 443, 631, 8080, 9100]). Common: 22=SSH, 80=HTTP, 443=HTTPS, 631=IPP/CUPS, 9100=raw printing',
          type: 'array',
          items: { type: 'number' },
        },
        timeout: { description: 'Per-host timeout in milliseconds (default: 2000)', type: 'number' },
      },
      required: ['subnet'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.networkScan({
        subnet: args.subnet,
        ports: args.ports,
        timeout: args.timeout,
      })
      return { hosts: result.hosts, totalFound: result.hosts.length }
    },
  },
  {
    name: 'mdns_discover',
    description:
      'Discover devices advertising services via mDNS/Bonjour/ZeroConf on the local network. Common service types: "_http._tcp" (web servers), "_ipp._tcp" (printers), "_ssh._tcp" (SSH servers), "_printer._tcp" (printers), "_airplay._tcp" (AirPlay).',
    inputSchema: {
      type: 'object',
      properties: {
        serviceType: {
          type: 'string',
          description: 'mDNS service type to discover (e.g. "_http._tcp", "_ipp._tcp", "_ssh._tcp")',
        },
        timeout: { description: 'Discovery timeout in milliseconds (default: 5000)', type: 'number' },
      },
      required: ['serviceType'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.mdnsDiscover({
        serviceType: args.serviceType,
        timeout: args.timeout,
      })
      return { services: result.services, totalFound: result.services.length }
    },
  },
]
