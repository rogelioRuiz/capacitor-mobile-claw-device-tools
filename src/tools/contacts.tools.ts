import type { DeviceTool } from '../types'

export const contactsTools: DeviceTool[] = [
  {
    name: 'contacts_list',
    description: 'List contacts from the device address book. Returns names, phone numbers, and emails.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      const { Contacts } = await import('@capacitor-community/contacts')
      await Contacts.requestPermissions()
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
          organization: true,
        },
      })
      return {
        contacts: result.contacts.map((c) => ({
          contactId: c.contactId,
          name: c.name?.display,
          phones: c.phones?.map((p) => ({ number: p.number, type: p.type })),
          emails: c.emails?.map((e) => ({ address: e.address, type: e.type })),
          organization: c.organization?.company,
        })),
      }
    },
  },
  {
    name: 'contacts_search',
    description: 'Search contacts by name. Returns matching contacts with phone numbers and emails.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Name to search for' } },
      required: ['query'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { Contacts } = await import('@capacitor-community/contacts')
      await Contacts.requestPermissions()
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
          organization: true,
        },
      })
      const query = args.query.toLowerCase()
      const filtered = result.contacts.filter(
        (c) => c.name?.display?.toLowerCase().includes(query) || c.organization?.company?.toLowerCase().includes(query),
      )
      return {
        contacts: filtered.map((c) => ({
          contactId: c.contactId,
          name: c.name?.display,
          phones: c.phones?.map((p) => ({ number: p.number, type: p.type })),
          emails: c.emails?.map((e) => ({ address: e.address, type: e.type })),
          organization: c.organization?.company,
        })),
      }
    },
  },
]
