/**
 * Static registry of MCP tool categories for the Settings UI.
 *
 * Maps tool names to human-readable categories with descriptions
 * and privacy implications for each capability group.
 */

export interface McpToolCategory {
  id: string
  labelKey: string
  descriptionKey: string
  privacyKey: string
  toolNames: string[]
}

export interface McpCategorySection {
  id: string
  labelKey: string
  iconColor: string // Tailwind color classes for the section icon tint
  categoryIds: string[]
}

export const mcpToolCategories: McpToolCategory[] = [
  // --- Network & Remote Access ---
  {
    id: 'ssh',
    labelKey: 'settings.mcp.categories.ssh.label',
    descriptionKey: 'settings.mcp.categories.ssh.description',
    privacyKey: 'settings.mcp.categories.ssh.privacy',
    toolNames: ['ssh_connect', 'ssh_exec', 'ssh_disconnect'],
  },
  {
    id: 'sftp',
    labelKey: 'settings.mcp.categories.sftp.label',
    descriptionKey: 'settings.mcp.categories.sftp.description',
    privacyKey: 'settings.mcp.categories.sftp.privacy',
    toolNames: ['sftp_list', 'sftp_download', 'sftp_upload'],
  },
  {
    id: 'http',
    labelKey: 'settings.mcp.categories.http.label',
    descriptionKey: 'settings.mcp.categories.http.description',
    privacyKey: 'settings.mcp.categories.http.privacy',
    toolNames: ['http_request'],
  },
  {
    id: 'tcp',
    labelKey: 'settings.mcp.categories.tcp.label',
    descriptionKey: 'settings.mcp.categories.tcp.description',
    privacyKey: 'settings.mcp.categories.tcp.privacy',
    toolNames: ['tcp_connect', 'tcp_send', 'tcp_read', 'tcp_disconnect'],
  },
  {
    id: 'udp',
    labelKey: 'settings.mcp.categories.udp.label',
    descriptionKey: 'settings.mcp.categories.udp.description',
    privacyKey: 'settings.mcp.categories.udp.privacy',
    toolNames: ['udp_send', 'udp_broadcast'],
  },
  {
    id: 'discovery',
    labelKey: 'settings.mcp.categories.discovery.label',
    descriptionKey: 'settings.mcp.categories.discovery.description',
    privacyKey: 'settings.mcp.categories.discovery.privacy',
    toolNames: ['ping', 'network_scan', 'mdns_discover'],
  },
  {
    id: 'wol',
    labelKey: 'settings.mcp.categories.wol.label',
    descriptionKey: 'settings.mcp.categories.wol.description',
    privacyKey: 'settings.mcp.categories.wol.privacy',
    toolNames: ['wol_send'],
  },
  // --- Sensors & Camera ---
  {
    id: 'camera',
    labelKey: 'settings.mcp.categories.camera.label',
    descriptionKey: 'settings.mcp.categories.camera.description',
    privacyKey: 'settings.mcp.categories.camera.privacy',
    toolNames: ['camera_take_photo', 'camera_pick_image'],
  },
  {
    id: 'barcode',
    labelKey: 'settings.mcp.categories.barcode.label',
    descriptionKey: 'settings.mcp.categories.barcode.description',
    privacyKey: 'settings.mcp.categories.barcode.privacy',
    toolNames: ['barcode_scan', 'barcode_is_supported'],
  },
  {
    id: 'motion-sensors',
    labelKey: 'settings.mcp.categories.motionSensors.label',
    descriptionKey: 'settings.mcp.categories.motionSensors.description',
    privacyKey: 'settings.mcp.categories.motionSensors.privacy',
    toolNames: ['motion_get_acceleration', 'motion_get_orientation'],
  },
  {
    id: 'geolocation',
    labelKey: 'settings.mcp.categories.geolocation.label',
    descriptionKey: 'settings.mcp.categories.geolocation.description',
    privacyKey: 'settings.mcp.categories.geolocation.privacy',
    toolNames: ['geolocation_get_current'],
  },
  // --- Communication ---
  {
    id: 'speech',
    labelKey: 'settings.mcp.categories.speech.label',
    descriptionKey: 'settings.mcp.categories.speech.description',
    privacyKey: 'settings.mcp.categories.speech.privacy',
    toolNames: ['speech_listen', 'speech_is_available', 'speech_get_languages'],
  },
  {
    id: 'tts',
    labelKey: 'settings.mcp.categories.tts.label',
    descriptionKey: 'settings.mcp.categories.tts.description',
    privacyKey: 'settings.mcp.categories.tts.privacy',
    toolNames: ['tts_speak', 'tts_get_languages'],
  },
  {
    id: 'bluetooth',
    labelKey: 'settings.mcp.categories.bluetooth.label',
    descriptionKey: 'settings.mcp.categories.bluetooth.description',
    privacyKey: 'settings.mcp.categories.bluetooth.privacy',
    toolNames: ['ble_scan', 'ble_connect', 'ble_read', 'ble_write', 'ble_disconnect'],
  },
  {
    id: 'nfc',
    labelKey: 'settings.mcp.categories.nfc.label',
    descriptionKey: 'settings.mcp.categories.nfc.description',
    privacyKey: 'settings.mcp.categories.nfc.privacy',
    toolNames: ['nfc_read', 'nfc_write', 'nfc_is_supported'],
  },
  // --- Personal Data ---
  {
    id: 'contacts',
    labelKey: 'settings.mcp.categories.contacts.label',
    descriptionKey: 'settings.mcp.categories.contacts.description',
    privacyKey: 'settings.mcp.categories.contacts.privacy',
    toolNames: ['contacts_list', 'contacts_search'],
  },
  {
    id: 'health',
    labelKey: 'settings.mcp.categories.health.label',
    descriptionKey: 'settings.mcp.categories.health.description',
    privacyKey: 'settings.mcp.categories.health.privacy',
    toolNames: ['health_is_available', 'health_request_auth', 'health_query'],
  },
  {
    id: 'biometric',
    labelKey: 'settings.mcp.categories.biometric.label',
    descriptionKey: 'settings.mcp.categories.biometric.description',
    privacyKey: 'settings.mcp.categories.biometric.privacy',
    toolNames: ['biometric_authenticate', 'biometric_is_available'],
  },
  // --- Device Controls ---
  {
    id: 'device-info',
    labelKey: 'settings.mcp.categories.deviceInfo.label',
    descriptionKey: 'settings.mcp.categories.deviceInfo.description',
    privacyKey: 'settings.mcp.categories.deviceInfo.privacy',
    toolNames: ['device_get_info', 'device_get_battery'],
  },
  {
    id: 'clipboard',
    labelKey: 'settings.mcp.categories.clipboard.label',
    descriptionKey: 'settings.mcp.categories.clipboard.description',
    privacyKey: 'settings.mcp.categories.clipboard.privacy',
    toolNames: ['clipboard_read', 'clipboard_write'],
  },
  {
    id: 'haptics',
    labelKey: 'settings.mcp.categories.haptics.label',
    descriptionKey: 'settings.mcp.categories.haptics.description',
    privacyKey: 'settings.mcp.categories.haptics.privacy',
    toolNames: ['haptics_impact', 'haptics_notification', 'haptics_vibrate'],
  },
  {
    id: 'notifications',
    labelKey: 'settings.mcp.categories.notifications.label',
    descriptionKey: 'settings.mcp.categories.notifications.description',
    privacyKey: 'settings.mcp.categories.notifications.privacy',
    toolNames: ['notification_schedule', 'notification_cancel'],
  },
  {
    id: 'push-notifications',
    labelKey: 'settings.mcp.categories.pushNotifications.label',
    descriptionKey: 'settings.mcp.categories.pushNotifications.description',
    privacyKey: 'settings.mcp.categories.pushNotifications.privacy',
    toolNames: ['push_get_token', 'push_get_delivered'],
  },
  {
    id: 'network-status',
    labelKey: 'settings.mcp.categories.networkStatus.label',
    descriptionKey: 'settings.mcp.categories.networkStatus.description',
    privacyKey: 'settings.mcp.categories.networkStatus.privacy',
    toolNames: ['network_status'],
  },
  {
    id: 'share',
    labelKey: 'settings.mcp.categories.share.label',
    descriptionKey: 'settings.mcp.categories.share.description',
    privacyKey: 'settings.mcp.categories.share.privacy',
    toolNames: ['share_content'],
  },
  {
    id: 'secure-storage',
    labelKey: 'settings.mcp.categories.secureStorage.label',
    descriptionKey: 'settings.mcp.categories.secureStorage.description',
    privacyKey: 'settings.mcp.categories.secureStorage.privacy',
    toolNames: ['secure_storage_get', 'secure_storage_set', 'secure_storage_remove'],
  },
  {
    id: 'keep-awake',
    labelKey: 'settings.mcp.categories.keepAwake.label',
    descriptionKey: 'settings.mcp.categories.keepAwake.description',
    privacyKey: 'settings.mcp.categories.keepAwake.privacy',
    toolNames: ['screen_keep_awake', 'screen_allow_sleep'],
  },
  {
    id: 'app-state',
    labelKey: 'settings.mcp.categories.appState.label',
    descriptionKey: 'settings.mcp.categories.appState.description',
    privacyKey: 'settings.mcp.categories.appState.privacy',
    toolNames: ['app_get_info', 'app_get_state'],
  },
]

export const mcpCategorySections: McpCategorySection[] = [
  {
    id: 'network',
    labelKey: 'settings.mcp.sections.network',
    iconColor: 'bg-blue-500/15 text-blue-400',
    categoryIds: ['ssh', 'sftp', 'http', 'tcp', 'udp', 'discovery', 'wol'],
  },
  {
    id: 'sensors',
    labelKey: 'settings.mcp.sections.sensors',
    iconColor: 'bg-emerald-500/15 text-emerald-400',
    categoryIds: ['camera', 'barcode', 'motion-sensors', 'geolocation'],
  },
  {
    id: 'communication',
    labelKey: 'settings.mcp.sections.communication',
    iconColor: 'bg-amber-500/15 text-amber-400',
    categoryIds: ['speech', 'tts', 'bluetooth', 'nfc'],
  },
  {
    id: 'personal-data',
    labelKey: 'settings.mcp.sections.personalData',
    iconColor: 'bg-red-500/15 text-red-400',
    categoryIds: ['contacts', 'health', 'biometric'],
  },
  {
    id: 'device',
    labelKey: 'settings.mcp.sections.device',
    iconColor: 'bg-purple-500/15 text-purple-400',
    categoryIds: [
      'device-info',
      'clipboard',
      'haptics',
      'notifications',
      'push-notifications',
      'network-status',
      'share',
      'secure-storage',
      'keep-awake',
      'app-state',
    ],
  },
]
