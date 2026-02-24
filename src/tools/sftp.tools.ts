import { NetworkTools } from 'capacitor-network-tools'
import type { DeviceTool } from '../types'

export const sftpTools: DeviceTool[] = [
  {
    name: 'sftp_list',
    description:
      'List files and directories at a remote path over SFTP. Requires an active SSH session (use ssh_connect first).',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'SSH session ID from ssh_connect' },
        path: { type: 'string', description: 'Remote directory path to list (e.g. "/var/log", "/home/admin")' },
      },
      required: ['sessionId', 'path'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.sftpList({
        sessionId: args.sessionId,
        path: args.path,
      })
      return { files: result.files }
    },
  },
  {
    name: 'sftp_download',
    description:
      'Download a file from a remote device over SFTP. Returns base64-encoded file content. For large files, consider using ssh_exec with cat/head instead.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'SSH session ID from ssh_connect' },
        remotePath: { type: 'string', description: 'Full remote file path (e.g. "/etc/cups/cupsd.conf")' },
      },
      required: ['sessionId', 'remotePath'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await NetworkTools.sftpDownload({
        sessionId: args.sessionId,
        remotePath: args.remotePath,
      })
      return { data: result.data, encoding: 'base64' }
    },
  },
  {
    name: 'sftp_upload',
    description: 'Upload a file to a remote device over SFTP. Provide file content as base64-encoded string.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'SSH session ID from ssh_connect' },
        remotePath: { type: 'string', description: 'Full remote destination path' },
        data: { type: 'string', description: 'Base64-encoded file content' },
      },
      required: ['sessionId', 'remotePath', 'data'],
      additionalProperties: false,
    },
    execute: async (args) => {
      await NetworkTools.sftpUpload({
        sessionId: args.sessionId,
        remotePath: args.remotePath,
        data: args.data,
      })
      return { success: true }
    },
  },
]
