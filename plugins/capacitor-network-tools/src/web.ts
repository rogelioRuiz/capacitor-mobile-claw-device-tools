import { WebPlugin } from '@capacitor/core'
import type { NetworkToolsPlugin, SftpFile, DiscoveredHost, MdnsService } from './definitions'

/**
 * Web fallback implementation.
 *
 * SSH, TCP/UDP, ping, mDNS, and WoL are not available in the browser.
 * HTTP requests use fetch() as a limited fallback (no self-signed cert support, CORS restrictions).
 */
export class NetworkToolsWeb extends WebPlugin implements NetworkToolsPlugin {
  async sshConnect(): Promise<{ sessionId: string }> {
    throw this.unavailable('SSH is not available on web — requires native platform.')
  }

  async sshExec(): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    throw this.unavailable('SSH is not available on web.')
  }

  async sshDisconnect(): Promise<void> {
    throw this.unavailable('SSH is not available on web.')
  }

  async sftpList(): Promise<{ files: SftpFile[] }> {
    throw this.unavailable('SFTP is not available on web.')
  }

  async sftpDownload(): Promise<{ data: string }> {
    throw this.unavailable('SFTP is not available on web.')
  }

  async sftpUpload(): Promise<void> {
    throw this.unavailable('SFTP is not available on web.')
  }

  async httpRequest(options: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: string
    timeout?: number
  }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
    // Limited web fallback using fetch — CORS and local network restrictions apply
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000)

    try {
      const response = await fetch(options.url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      })

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      const body = await response.text()
      return { statusCode: response.status, headers: responseHeaders, body }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async tcpConnect(): Promise<{ socketId: string }> {
    throw this.unavailable('TCP sockets are not available on web.')
  }

  async tcpSend(): Promise<void> {
    throw this.unavailable('TCP sockets are not available on web.')
  }

  async tcpRead(): Promise<{ data: string }> {
    throw this.unavailable('TCP sockets are not available on web.')
  }

  async tcpDisconnect(): Promise<void> {
    throw this.unavailable('TCP sockets are not available on web.')
  }

  async udpSend(): Promise<void> {
    throw this.unavailable('UDP is not available on web.')
  }

  async udpBroadcast(): Promise<void> {
    throw this.unavailable('UDP broadcast is not available on web.')
  }

  async ping(): Promise<{ reachable: boolean; latencyMs: number }> {
    throw this.unavailable('Ping is not available on web.')
  }

  async networkScan(): Promise<{ hosts: DiscoveredHost[] }> {
    throw this.unavailable('Network scanning is not available on web.')
  }

  async mdnsDiscover(): Promise<{ services: MdnsService[] }> {
    throw this.unavailable('mDNS discovery is not available on web.')
  }

  async wolSend(): Promise<void> {
    throw this.unavailable('Wake-on-LAN is not available on web.')
  }
}
