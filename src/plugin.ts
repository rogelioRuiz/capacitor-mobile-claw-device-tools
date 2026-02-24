/**
 * NetworkTools — Capacitor plugin for native SSH, HTTP, TCP/UDP, mDNS, ping, and Wake-on-LAN.
 *
 * On native platforms the call bridges to Swift/Kotlin.
 * On web, a limited fallback is used (only HTTP via fetch; all others throw).
 */

import { registerPlugin, WebPlugin } from '@capacitor/core'

// ── Types ──────────────────────────────────────────────────────────────

export interface SftpFile {
  name: string
  path: string
  size: number
  isDirectory: boolean
  modifiedAt: string
  permissions: string
}

export interface DiscoveredHost {
  ip: string
  hostname?: string
  openPorts: number[]
  latencyMs: number
}

export interface MdnsService {
  name: string
  type: string
  host: string
  port: number
  addresses: string[]
  txtRecords: Record<string, string>
}

export interface NetworkToolsPlugin {
  // SSH
  sshConnect(options: { host: string; port?: number; username: string; password?: string; privateKey?: string }): Promise<{ sessionId: string }>
  sshExec(options: { sessionId: string; command: string; timeout?: number }): Promise<{ stdout: string; stderr: string; exitCode: number }>
  sshDisconnect(options: { sessionId: string }): Promise<void>

  // SFTP
  sftpList(options: { sessionId: string; path: string }): Promise<{ files: SftpFile[] }>
  sftpDownload(options: { sessionId: string; remotePath: string }): Promise<{ data: string }>
  sftpUpload(options: { sessionId: string; remotePath: string; data: string }): Promise<void>

  // HTTP
  httpRequest(options: { url: string; method?: string; headers?: Record<string, string>; body?: string; timeout?: number; insecure?: boolean }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }>

  // TCP
  tcpConnect(options: { host: string; port: number; timeout?: number }): Promise<{ socketId: string }>
  tcpSend(options: { socketId: string; data: string }): Promise<void>
  tcpRead(options: { socketId: string; timeout?: number }): Promise<{ data: string }>
  tcpDisconnect(options: { socketId: string }): Promise<void>

  // UDP
  udpSend(options: { host: string; port: number; data: string }): Promise<void>
  udpBroadcast(options: { port: number; data: string }): Promise<void>

  // Discovery
  ping(options: { host: string; timeout?: number }): Promise<{ reachable: boolean; latencyMs: number }>
  networkScan(options: { subnet: string; ports?: number[]; timeout?: number }): Promise<{ hosts: DiscoveredHost[] }>
  mdnsDiscover(options: { serviceType: string; timeout?: number }): Promise<{ services: MdnsService[] }>

  // Wake-on-LAN
  wolSend(options: { macAddress: string; broadcastAddress?: string }): Promise<void>
}

// ── Web fallback ───────────────────────────────────────────────────────

class NetworkToolsWeb extends WebPlugin implements NetworkToolsPlugin {
  async sshConnect(): Promise<{ sessionId: string }> { throw this.unavailable('SSH is not available on web — requires native platform.') }
  async sshExec(): Promise<{ stdout: string; stderr: string; exitCode: number }> { throw this.unavailable('SSH is not available on web.') }
  async sshDisconnect(): Promise<void> { throw this.unavailable('SSH is not available on web.') }
  async sftpList(): Promise<{ files: SftpFile[] }> { throw this.unavailable('SFTP is not available on web.') }
  async sftpDownload(): Promise<{ data: string }> { throw this.unavailable('SFTP is not available on web.') }
  async sftpUpload(): Promise<void> { throw this.unavailable('SFTP is not available on web.') }
  async httpRequest(options: { url: string; method?: string; headers?: Record<string, string>; body?: string; timeout?: number }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000)
    try {
      const response = await fetch(options.url, { method: options.method || 'GET', headers: options.headers, body: options.body, signal: controller.signal })
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => { responseHeaders[key] = value })
      const body = await response.text()
      return { statusCode: response.status, headers: responseHeaders, body }
    } finally { clearTimeout(timeoutId) }
  }
  async tcpConnect(): Promise<{ socketId: string }> { throw this.unavailable('TCP sockets are not available on web.') }
  async tcpSend(): Promise<void> { throw this.unavailable('TCP sockets are not available on web.') }
  async tcpRead(): Promise<{ data: string }> { throw this.unavailable('TCP sockets are not available on web.') }
  async tcpDisconnect(): Promise<void> { throw this.unavailable('TCP sockets are not available on web.') }
  async udpSend(): Promise<void> { throw this.unavailable('UDP is not available on web.') }
  async udpBroadcast(): Promise<void> { throw this.unavailable('UDP broadcast is not available on web.') }
  async ping(): Promise<{ reachable: boolean; latencyMs: number }> { throw this.unavailable('Ping is not available on web.') }
  async networkScan(): Promise<{ hosts: DiscoveredHost[] }> { throw this.unavailable('Network scanning is not available on web.') }
  async mdnsDiscover(): Promise<{ services: MdnsService[] }> { throw this.unavailable('mDNS discovery is not available on web.') }
  async wolSend(): Promise<void> { throw this.unavailable('Wake-on-LAN is not available on web.') }
}

// ── Plugin registration ────────────────────────────────────────────────

export const NetworkTools = registerPlugin<NetworkToolsPlugin>('NetworkTools', {
  web: () => Promise.resolve(new NetworkToolsWeb()),
})
