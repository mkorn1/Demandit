// Chat type configurations
export const CHAT_TYPES = {
  BASE_CASE_BOT: {
    id: 'base-case-bot',
    name: 'Base Case Bot',
    description: 'Generate a legal demand letter from chat and uploaded documents'
  }
}

export const getChatTypeById = (id) => {
  return Object.values(CHAT_TYPES).find(type => type.id === id) || null
}

