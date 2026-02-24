/**
 * capacitor-mobile-claw-device-tools — Device MCP tools for MobileClaw.
 *
 * Provides 64+ hardware and network tools (clipboard, camera, SSH, sensors, etc.)
 * as drop-in DeviceTool[] arrays. Pass them to MobileClawEngine.init({ tools })
 * to make them available to the AI agent via MCP.
 *
 * Usage:
 *   import { allDeviceTools } from 'capacitor-mobile-claw-device-tools'
 *   import { MobileClawEngine } from 'capacitor-mobile-claw'
 *
 *   const engine = new MobileClawEngine()
 *   await engine.init({ tools: allDeviceTools })
 */

export type { McpCategorySection, McpToolCategory } from './categories'
// Categories and sections for Settings UI
export { mcpCategorySections, mcpToolCategories } from './categories'
// All device tools aggregated
export { allDeviceTools } from './tools/index'
// Re-export DeviceTool type for convenience
export type { DeviceTool } from './types'
