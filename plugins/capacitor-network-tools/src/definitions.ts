/**
 * NetworkTools Capacitor Plugin API
 *
 * Exposes native SSH, HTTP, TCP/UDP, mDNS, ping, and Wake-on-LAN capabilities
 * from the device to be used as MCP tools by AI agents.
 */

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
  // === SSH ===

  /** Open an SSH connection. Returns a session ID for subsequent calls. */
  sshConnect(options: {
    host: string
    port?: number
    username: string
    password?: string
    privateKey?: string
  }): Promise<{ sessionId: string }>

  /** Execute a command on an SSH session. Returns stdout, stderr, and exit code. */
  sshExec(options: {
    sessionId: string
    command: string
    timeout?: number
  }): Promise<{ stdout: string; stderr: string; exitCode: number }>

  /** Close an SSH session. */
  sshDisconnect(options: { sessionId: string }): Promise<void>

  // === SFTP ===

  /** List files at a remote path over SFTP. */
  sftpList(options: {
    sessionId: string
    path: string
  }): Promise<{ files: SftpFile[] }>

  /** Download a file over SFTP. Returns base64-encoded content. */
  sftpDownload(options: {
    sessionId: string
    remotePath: string
  }): Promise<{ data: string }>

  /** Upload a file over SFTP. Accepts base64-encoded content. */
  sftpUpload(options: {
    sessionId: string
    remotePath: string
    data: string
  }): Promise<void>

  // === HTTP ===

  /** Make an HTTP request (curl equivalent). Supports local network IPs. */
  httpRequest(options: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: string
    timeout?: number
    insecure?: boolean
  }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }>

  // === TCP ===

  /** Open a raw TCP socket connection. */
  tcpConnect(options: {
    host: string
    port: number
    timeout?: number
  }): Promise<{ socketId: string }>

  /** Send data over a TCP socket (base64-encoded). */
  tcpSend(options: { socketId: string; data: string }): Promise<void>

  /** Read data from a TCP socket. Returns base64-encoded data. */
  tcpRead(options: {
    socketId: string
    timeout?: number
  }): Promise<{ data: string }>

  /** Close a TCP socket. */
  tcpDisconnect(options: { socketId: string }): Promise<void>

  // === UDP ===

  /** Send a UDP datagram to a specific host:port. Data is base64-encoded. */
  udpSend(options: { host: string; port: number; data: string }): Promise<void>

  /** Send a UDP broadcast packet. Data is base64-encoded. */
  udpBroadcast(options: { port: number; data: string }): Promise<void>

  // === Discovery ===

  /** Ping a host to check reachability. */
  ping(options: {
    host: string
    timeout?: number
  }): Promise<{ reachable: boolean; latencyMs: number }>

  /** Scan a subnet for live hosts and open ports. */
  networkScan(options: {
    subnet: string
    ports?: number[]
    timeout?: number
  }): Promise<{ hosts: DiscoveredHost[] }>

  /** Discover mDNS/Bonjour services on the local network. */
  mdnsDiscover(options: {
    serviceType: string
    timeout?: number
  }): Promise<{ services: MdnsService[] }>

  // === Wake-on-LAN ===

  /** Send a Wake-on-LAN magic packet. */
  wolSend(options: {
    macAddress: string
    broadcastAddress?: string
  }): Promise<void>
}
