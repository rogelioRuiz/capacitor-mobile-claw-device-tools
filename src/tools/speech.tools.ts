import type { DeviceTool } from '../types'

export const speechTools: DeviceTool[] = [
  {
    name: 'speech_listen',
    description: 'Listen for speech using the device microphone and convert to text. Returns matched text strings.',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          description: 'BCP-47 language code (e.g. "en-US", "es-ES"). Default is device language.',
          type: 'string',
        },
        maxResults: { description: 'Maximum number of result alternatives (default 5)', type: 'number' },
        popup: { description: 'Show a native listening popup (default true, Android only)', type: 'boolean' },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
      await SpeechRecognition.requestPermissions()
      const result = await SpeechRecognition.start({
        language: args.language,
        maxResults: args.maxResults ?? 5,
        popup: args.popup ?? true,
      })
      return { matches: result.matches ?? [] }
    },
  },
  {
    name: 'speech_is_available',
    description: 'Check if speech recognition is available on this device.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
      const result = await SpeechRecognition.available()
      return { available: result.available }
    },
  },
  {
    name: 'speech_get_languages',
    description: 'Get the list of supported languages for speech recognition.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
      const result = await SpeechRecognition.getSupportedLanguages()
      return { languages: result.languages }
    },
  },
]
