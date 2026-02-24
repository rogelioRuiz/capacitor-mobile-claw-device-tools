/** A single device tool exposed to the AI agent via MCP. */
export interface DeviceTool {
  /** Unique tool name, e.g. 'ssh_exec', 'camera_take_photo' */
  name: string
  /** Human-readable description for AI agent tool discovery */
  description: string
  /** JSON Schema for tool parameters */
  inputSchema: Record<string, any>
  /** Execute the tool with validated arguments, return result object */
  execute: (args: Record<string, any>) => Promise<any>
}
