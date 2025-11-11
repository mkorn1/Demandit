// Chat type configurations
export const CHAT_TYPES = {
  BASE_CASE_BOT: {
    id: 'base-case-bot',
    name: 'Base Case Bot',
    description: 'Generate a legal demand letter from chat and uploaded documents'
  },
  DRAFT_EDITOR_AGENT: {
    id: 'draft-editor-agent',
    name: 'Draft Editor Agent',
    description: 'Edit and refine existing draft letters with AI assistance'
  }
}

export const getChatTypeById = (id) => {
  return Object.values(CHAT_TYPES).find(type => type.id === id) || null
}

