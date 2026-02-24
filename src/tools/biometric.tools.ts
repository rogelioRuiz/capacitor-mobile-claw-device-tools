import type { DeviceTool } from '../types'

export const biometricTools: DeviceTool[] = [
  {
    name: 'biometric_authenticate',
    description:
      'Prompt the user for biometric authentication (fingerprint, face ID, etc.). Returns success or throws on failure/cancel.',
    inputSchema: {
      type: 'object',
      properties: {
        reason: { description: 'Reason shown to the user (e.g. "Confirm your identity")', type: 'string' },
        allowDeviceCredential: { description: 'Allow PIN/password fallback (default true)', type: 'boolean' },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
      await BiometricAuth.authenticate({
        reason: args.reason ?? 'Please authenticate',
        allowDeviceCredential: args.allowDeviceCredential ?? true,
      })
      return { authenticated: true }
    },
  },
  {
    name: 'biometric_is_available',
    description:
      'Check if biometric authentication is available on this device and what type (fingerprint, face ID, etc.).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
      const result = await BiometricAuth.checkBiometry()
      return {
        isAvailable: result.isAvailable,
        biometryType: result.biometryType,
        biometryTypes: result.biometryTypes,
        deviceIsSecure: result.deviceIsSecure,
        reason: result.reason,
        strongBiometryIsAvailable: result.strongBiometryIsAvailable,
      }
    },
  },
]
