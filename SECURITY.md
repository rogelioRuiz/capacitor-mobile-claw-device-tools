# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, **please do NOT open a public issue**.

Instead, use [GitHub's private vulnerability reporting](https://github.com/rogelioRuiz/capacitor-mobile-claw-device-tools/security/advisories/new) to report it. Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge your report within 48 hours and aim to provide a fix within 90 days.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Security Model

This package provides MCP tool definitions that execute on-device via Capacitor plugins. Key security properties:

- **On-device execution** — All tool code runs directly on the mobile device through Capacitor's native bridge. No intermediate servers.
- **Plugin sandboxing** — Each tool delegates to a Capacitor plugin which is subject to the platform's permission model (Android permissions, iOS entitlements).
- **No network relay** — Tools like SSH, SFTP, and HTTP connect directly from the device. No data is routed through third-party servers.
- **Optional capabilities** — Most Capacitor plugin peer dependencies are optional. Only install the plugins for the hardware capabilities you need.
