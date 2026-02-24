import type { DeviceTool } from '../types'

export const cameraTools: DeviceTool[] = [
  {
    name: 'camera_take_photo',
    description: 'Take a photo using the device camera. Returns base64-encoded image data.',
    inputSchema: {
      type: 'object',
      properties: {
        quality: { description: 'Image quality 1-100 (default 90)', type: 'number', minimum: 1, maximum: 100 },
        direction: { description: 'Camera direction (default rear)', type: 'string', enum: ['front', 'rear'] },
        width: { description: 'Maximum width in pixels', type: 'number' },
        height: { description: 'Maximum height in pixels', type: 'number' },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const { Camera, CameraResultType, CameraSource, CameraDirection } = await import('@capacitor/camera')
      const result = await Camera.getPhoto({
        quality: args.quality ?? 90,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction: args.direction === 'front' ? CameraDirection.Front : CameraDirection.Rear,
        width: args.width,
        height: args.height,
      })
      return { format: result.format, base64: result.base64String }
    },
  },
  {
    name: 'camera_pick_image',
    description: 'Pick an image from the device photo gallery. Returns base64-encoded image data.',
    inputSchema: {
      type: 'object',
      properties: {
        quality: { description: 'Image quality 1-100 (default 90)', type: 'number', minimum: 1, maximum: 100 },
        width: { description: 'Maximum width in pixels', type: 'number' },
        height: { description: 'Maximum height in pixels', type: 'number' },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const result = await Camera.getPhoto({
        quality: args.quality ?? 90,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: args.width,
        height: args.height,
      })
      return { format: result.format, base64: result.base64String }
    },
  },
]
