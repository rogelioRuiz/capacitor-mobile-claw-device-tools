import type { DeviceTool } from '../types'

export const ttsTools: DeviceTool[] = [
  {
    name: 'tts_speak',
    description: 'Speak text aloud using the device text-to-speech engine.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to speak aloud' },
        lang: { description: 'BCP-47 language code (e.g. "en-US")', type: 'string' },
        rate: { description: 'Speech rate 0.1-4.0 (default 1.0)', type: 'number', minimum: 0.1, maximum: 4 },
        pitch: { description: 'Voice pitch 0.1-2.0 (default 1.0)', type: 'number', minimum: 0.1, maximum: 2 },
        volume: { description: 'Volume 0-1 (default 1.0)', type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['text'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
      await TextToSpeech.speak({
        text: args.text,
        lang: args.lang,
        rate: args.rate ?? 1.0,
        pitch: args.pitch ?? 1.0,
        volume: args.volume ?? 1.0,
      })
      return { success: true }
    },
  },
  {
    name: 'tts_get_languages',
    description: 'Get the list of supported languages for text-to-speech.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
      const result = await TextToSpeech.getSupportedLanguages()
      return { languages: result.languages }
    },
  },
]
