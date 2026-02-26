import { NetworkTools } from '../plugin'
import type { DeviceTool } from '../types'

export const sshTools: DeviceTool[] = [
  {
    name: 'ssh_connect',
    description:
      'Open an SSH connection to a device on the local network. Returns a session ID for subsequent ssh_exec and ssh_disconnect calls. Supports password and private key authentication. The session auto-reconnects if the connection is interrupted and persists for 15 minutes of inactivity. Call ssh_connect again only when connecting to a different host or with different credentials.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Hostname or IP address (e.g. "192.168.1.50" or "printer.local")' },
        port: { description: 'SSH port (default: 22)', type: 'number' },
        username: { type: 'string', description: 'SSH username' },
        password: { description: 'SSH password (use this OR privateKey)', type: 'string' },
        privateKey: { description: 'PEM-encoded private key string (use this OR password)', type: 'string' },
      },
      required: ['host', 'username'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.sshConnect({
        host: args.host,
        port: args.port,
        username: args.username,
        password: args.password,
        privateKey: args.privateKey,
      })
      return { sessionId: result.sessionId }
    },
  },
  {
    name: 'ssh_exec',
    description:
      'Execute a command on a connected SSH session. Returns stdout, stderr, and exit code. The connection is restored automatically if it was interrupted. Use ssh_connect first to get a session ID.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'SSH session ID from ssh_connect' },
        command: {
          type: 'string',
          description: 'Shell command to execute (e.g. "systemctl restart cups", "uname -a")',
        },
        timeout: { description: 'Command timeout in milliseconds (default: 30000)', type: 'number' },
      },
      required: ['sessionId', 'command'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.sshExec({
        sessionId: args.sessionId,
        command: args.command,
        timeout: args.timeout,
      })
      return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }
    },
  },
  {
    name: 'ssh_disconnect',
    description: 'Close an SSH session and free resources.',
    inputSchema: {
      type: 'object',
      properties: { sessionId: { type: 'string', description: 'SSH session ID to disconnect' } },
      required: ['sessionId'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await NetworkTools.sshDisconnect({ sessionId: args.sessionId })
      return { success: true }
    },
  },
]
