import { Share } from '@capacitor/share'
import type { DeviceTool } from '../types'

export const shareTools: DeviceTool[] = [
  {
    name: 'share_content',
    description: 'Open the native share sheet to share text and/or a URL with other apps on the device.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { description: 'Share dialog title', type: 'string' },
        text: { description: 'Text content to share', type: 'string' },
        url: { description: 'URL to share', type: 'string' },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const result = await Share.share({
        title: args.title,
        text: args.text,
        url: args.url,
        dialogTitle: args.title,
      })
      return { activityType: result.activityType || null }
    },
  },
]
