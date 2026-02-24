import type { DeviceTool } from '../types'

export const motionSensorsTools: DeviceTool[] = [
  {
    name: 'motion_get_acceleration',
    description: 'Get a single accelerometer reading from the device. Returns x, y, z acceleration values in m/s².',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { Motion } = await import('@capacitor/motion')
      return new Promise((resolve, reject) => {
        let handle: any
        const timeout = setTimeout(() => {
          handle?.remove()
          reject(new Error('Accelerometer read timed out'))
        }, 5000)
        Motion.addListener('accel', (event) => {
          clearTimeout(timeout)
          handle?.remove()
          resolve({
            acceleration: {
              x: event.acceleration.x,
              y: event.acceleration.y,
              z: event.acceleration.z,
            },
            accelerationIncludingGravity: {
              x: event.accelerationIncludingGravity.x,
              y: event.accelerationIncludingGravity.y,
              z: event.accelerationIncludingGravity.z,
            },
            timestamp: Date.now(),
          })
        }).then((h) => {
          handle = h
        })
      })
    },
  },
  {
    name: 'motion_get_orientation',
    description:
      'Get a single device orientation reading. Returns alpha (compass), beta (tilt front-back), gamma (tilt left-right) in degrees.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { Motion } = await import('@capacitor/motion')
      return new Promise((resolve, reject) => {
        let handle: any
        const timeout = setTimeout(() => {
          handle?.remove()
          reject(new Error('Orientation read timed out'))
        }, 5000)
        Motion.addListener('orientation', (event) => {
          clearTimeout(timeout)
          handle?.remove()
          resolve({
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma,
            timestamp: Date.now(),
          })
        }).then((h) => {
          handle = h
        })
      })
    },
  },
]
