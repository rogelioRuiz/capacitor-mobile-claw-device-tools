import { registerPlugin } from '@capacitor/core'
import type { NetworkToolsPlugin } from './definitions'

const NetworkTools = registerPlugin<NetworkToolsPlugin>('NetworkTools', {
  web: () => import('./web').then((m) => new m.NetworkToolsWeb()),
})

export * from './definitions'
export { NetworkTools }
