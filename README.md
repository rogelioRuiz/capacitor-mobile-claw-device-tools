# capacitor-mobile-claw-device-tools

[![npm version](https://img.shields.io/npm/v/capacitor-mobile-claw-device-tools)](https://www.npmjs.com/package/capacitor-mobile-claw-device-tools)
[![CI](https://github.com/rogelioRuiz/capacitor-mobile-claw-device-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/rogelioRuiz/capacitor-mobile-claw-device-tools/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Device MCP tools for [capacitor-mobile-claw](https://www.npmjs.com/package/capacitor-mobile-claw) — **64+ hardware and network tools** that give an on-device AI agent access to clipboard, camera, SSH, sensors, Bluetooth, NFC, and more via the Model Context Protocol.

## Install

```bash
npm install capacitor-mobile-claw-device-tools
```

## Quick Start

```typescript
import { allDeviceTools } from 'capacitor-mobile-claw-device-tools'
import { MobileClawEngine } from 'capacitor-mobile-claw'

const engine = new MobileClawEngine()
await engine.init({ tools: allDeviceTools })
```

## Available Tools

Tools are organized into **5 sections** and **24 categories**:

### Network & Remote Access

| Category | Tools |
|----------|-------|
| SSH | `ssh_connect`, `ssh_exec`, `ssh_disconnect` |
| SFTP | `sftp_list`, `sftp_download`, `sftp_upload` |
| HTTP | `http_request` |
| TCP | `tcp_connect`, `tcp_send`, `tcp_read`, `tcp_disconnect` |
| UDP | `udp_send`, `udp_broadcast` |
| Discovery | `ping`, `network_scan`, `mdns_discover` |
| Wake-on-LAN | `wol_send` |

### Sensors & Camera

| Category | Tools |
|----------|-------|
| Camera | `camera_take_photo`, `camera_pick_image` |
| Barcode | `barcode_scan`, `barcode_is_supported` |
| Motion Sensors | `motion_get_acceleration`, `motion_get_orientation` |
| Geolocation | `geolocation_get_current` |

### Communication

| Category | Tools |
|----------|-------|
| Speech Recognition | `speech_listen`, `speech_is_available`, `speech_get_languages` |
| Text-to-Speech | `tts_speak`, `tts_get_languages` |
| Bluetooth LE | `ble_scan`, `ble_connect`, `ble_read`, `ble_write`, `ble_disconnect` |
| NFC | `nfc_read`, `nfc_write`, `nfc_is_supported` |

### Personal Data

| Category | Tools |
|----------|-------|
| Contacts | `contacts_list`, `contacts_search` |
| Health | `health_is_available`, `health_request_auth`, `health_query` |
| Biometric | `biometric_authenticate`, `biometric_is_available` |

### Device Controls

| Category | Tools |
|----------|-------|
| Device Info | `device_get_info`, `device_get_battery` |
| Clipboard | `clipboard_read`, `clipboard_write` |
| Haptics | `haptics_impact`, `haptics_notification`, `haptics_vibrate` |
| Notifications | `notification_schedule`, `notification_cancel` |
| Push Notifications | `push_get_token`, `push_get_delivered` |
| Network Status | `network_status` |
| Share | `share_content` |
| Secure Storage | `secure_storage_get`, `secure_storage_set`, `secure_storage_remove` |
| Keep Awake | `screen_keep_awake`, `screen_allow_sleep` |
| App State | `app_get_info`, `app_get_state` |

## Category Metadata

The package also exports category and section metadata for building settings UIs:

```typescript
import { mcpToolCategories, mcpCategorySections } from 'capacitor-mobile-claw-device-tools'
```

## Peer Dependencies

Most Capacitor plugins are **optional** peer dependencies — install only the ones you need:

| Plugin | Required | Provides |
|--------|----------|----------|
| `@capacitor/core` | Yes | Core Capacitor APIs |
| `capacitor-network-tools` | Bundled | SSH, SFTP, TCP, UDP, Discovery, WoL |
| `@capacitor/camera` | Optional | Camera tools |
| `@capacitor/clipboard` | Optional | Clipboard tools |
| `@capacitor/geolocation` | Optional | Geolocation tools |
| `@capacitor/haptics` | Optional | Haptics tools |
| `@capacitor/local-notifications` | Optional | Notification tools |
| `@capacitor/network` | Optional | Network status |
| `@capacitor/share` | Optional | Share tools |
| `@capacitor/app` | Optional | App state tools |
| `@capacitor/preferences` | Optional | Secure storage tools |
| `@capacitor/push-notifications` | Optional | Push notification tools |
| `@capacitor/device` | Optional | Device info tools |
| `@capacitor/motion` | Optional | Motion sensor tools |
| `@capacitor-community/bluetooth-le` | Optional | Bluetooth LE tools |
| `@capacitor-community/contacts` | Optional | Contact tools |
| `@capacitor-community/keep-awake` | Optional | Keep awake tools |
| `@capacitor-community/speech-recognition` | Optional | Speech recognition tools |
| `@capacitor-community/text-to-speech` | Optional | TTS tools |
| `@aparajita/capacitor-biometric-auth` | Optional | Biometric tools |
| `@aparajita/capacitor-secure-storage` | Optional | Encrypted storage tools |
| `@capacitor-mlkit/barcode-scanning` | Optional | Barcode scanning tools |
| `@capgo/capacitor-health` | Optional | Health data tools |
| `@capgo/capacitor-nfc` | Optional | NFC tools |

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run lint         # Check with Biome
npm run lint:fix     # Auto-fix formatting
npm run typecheck    # Type-check without emitting
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development guide.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

To report vulnerabilities, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) &copy; 2025-present Techxagon
