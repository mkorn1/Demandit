// LLM Service for making API calls to language models
// This service handles prompt engineering and API communication

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.openai.com/v1'
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

/**
 * Makes a call to the LLM API
 * @param {string} prompt - The full prompt to send to the LLM
 * @param {Object} options - Additional options for the API call
 * @returns {Promise<string>} The generated response text
 */
export async function callLLM(prompt, options = {}) {
  if (!API_KEY) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.')
  }

  const {
    model = 'gpt-4',
    temperature = 0.7,
    maxTokens = 2000,
    systemPrompt = null
  } = options

  try {
    const messages = []
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      })
    }
    
    messages.push({
      role: 'user',
      content: prompt
    })

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('LLM API call failed:', error)
    throw error
  }
}

/**
 * Generates a legal demand letter using chat messages and documents
 * @param {Array} chatMessages - Array of chat message objects
 * @param {Array} documents - Array of uploaded document objects
 * @returns {Promise<string>} The generated demand letter
 */
export async function generateLegalDemandLetter(chatMessages, documents = []) {
  const systemPrompt = `You are an expert legal assistant specializing in drafting professional demand letters. 
Your task is to create a clear, professional, and legally sound demand letter based on the information provided 
in the conversation and any uploaded documents.

Guidelines for the demand letter:
1. Use formal, professional language
2. Clearly state the facts and legal basis for the demand
3. Specify the exact amount or action being demanded
4. Include a reasonable deadline for response (typically 10-30 days)
5. Mention potential legal consequences if the demand is not met
6. Maintain a professional but firm tone
7. Include all relevant details from the conversation and documents
8. Structure the letter with proper formatting (date, recipient, subject, body, closing)

Format the response as a complete, ready-to-use demand letter.`

  // Extract conversation history
  const conversationText = chatMessages
    .filter(msg => msg.sender === 'user')
    .map(msg => msg.text)
    .join('\n\n')

  // Extract document content
  const documentTexts = documents
    .filter(doc => doc.content && typeof doc.content === 'string')
    .map(doc => {
      // For text-based documents, include the content
      // For images/PDFs, we'll note their presence
      if (doc.type.startsWith('text/') || doc.type === 'application/json') {
        return `Document: ${doc.name}\n${doc.content}`
      } else {
        return `Document: ${doc.name} (${doc.type}) - Content available but not extracted in text format`
      }
    })
    .join('\n\n---\n\n')

  const prompt = `Please generate a legal demand letter based on the following information:

CONVERSATION HISTORY:
${conversationText || 'No conversation history provided.'}

${documents.length > 0 ? `\nUPLOADED DOCUMENTS:\n${documentTexts}` : '\nNo documents were uploaded.'}

Please create a comprehensive demand letter that incorporates all relevant information from the conversation and documents. 
Make sure the letter is professional, clear, and actionable.`

  return await callLLM(prompt, {
    systemPrompt,
    model: 'gpt-4',
    temperature: 0.5, // Lower temperature for more consistent legal writing
    maxTokens: 3000
  })
}

