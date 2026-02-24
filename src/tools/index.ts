/**
 * All device MCP tools — aggregated from hardware and network tool files.
 *
 * Network tools require the capacitor-network-tools native plugin.
 * Hardware tools use official @capacitor/* and community plugins.
 */

import type { DeviceTool } from '../types'
import { appStateTools } from './app-state.tools'
import { barcodeTools } from './barcode.tools'
import { biometricTools } from './biometric.tools'
import { bluetoothTools } from './bluetooth.tools'
// --- Hardware tools (newly-installed Capacitor plugins) ---
import { cameraTools } from './camera.tools'
// --- Hardware tools (already-installed Capacitor plugins) ---
import { clipboardTools } from './clipboard.tools'
import { contactsTools } from './contacts.tools'
import { deviceInfoTools } from './device-info.tools'
import { discoveryTools } from './discovery.tools'
import { geolocationTools } from './geolocation.tools'
import { hapticsTools } from './haptics.tools'
import { healthTools } from './health.tools'
import { httpTools } from './http.tools'
import { keepAwakeTools } from './keep-awake.tools'
import { motionSensorsTools } from './motion-sensors.tools'
import { networkStatusTools } from './network-status.tools'
import { nfcTools } from './nfc.tools'
import { notificationsTools } from './notifications.tools'
import { pushNotificationsTools } from './push-notifications.tools'
import { secureStorageTools } from './secure-storage.tools'
import { sftpTools } from './sftp.tools'
import { shareTools } from './share.tools'
import { speechTools } from './speech.tools'
// --- Network tools (capacitor-network-tools native plugin) ---
import { sshTools } from './ssh.tools'
import { tcpTools } from './tcp.tools'
import { ttsTools } from './tts.tools'
import { udpTools } from './udp.tools'
import { wolTools } from './wol.tools'

export const allDeviceTools: DeviceTool[] = [
  // Network tools (primary use case — SSH, curl, TCP, UDP, discovery)
  ...sshTools,
  ...sftpTools,
  ...httpTools,
  ...tcpTools,
  ...udpTools,
  ...discoveryTools,
  ...wolTools,
  // Hardware tools — device capabilities
  ...clipboardTools,
  ...hapticsTools,
  ...notificationsTools,
  ...networkStatusTools,
  ...shareTools,
  ...appStateTools,
  ...secureStorageTools,
  ...cameraTools,
  ...barcodeTools,
  ...motionSensorsTools,
  ...geolocationTools,
  ...speechTools,
  ...ttsTools,
  ...bluetoothTools,
  ...nfcTools,
  ...deviceInfoTools,
  ...biometricTools,
  ...contactsTools,
  ...keepAwakeTools,
  ...pushNotificationsTools,
  ...healthTools,
]
