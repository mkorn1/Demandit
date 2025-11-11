// LLM Service for making API calls to language models
// This service handles prompt engineering and API communication

import { htmlToPlainText, plainTextToHtml } from '../utils/templateConverter'

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
 * Conversational assistant to gather and confirm details before generating a demand letter
 * @param {Array} chatMessages - Array of chat message objects (conversation history)
 * @param {Array} documents - Array of uploaded document objects
 * @param {Object} caseData - Case data object containing contact_info
 * @returns {Promise<string>} The assistant's response
 */
export async function chatAssistant(chatMessages, documents = [], caseData = null) {
  const systemPrompt = `You are a professional legal assistant helping to gather information needed to draft a demand letter. 
Your role is to:
1. Analyze the information already provided (from conversation, case details, and documents)
2. Identify what information is still missing or needs clarification
3. Ask specific, targeted questions to gather missing details
4. Confirm when all necessary information has been collected
5. Assemble and summarize the details and evidence when ready

Key information needed for a demand letter:
- Facts of the case (what happened, when, where, who was involved)
- Legal basis for the demand (contract, agreement, law, etc.)
- Specific amount being demanded OR specific action being demanded
- Timeline of events
- Evidence supporting the claim (documents, communications, etc.)
- Contact information (sender and recipient) - This is ALREADY PROVIDED in case details, do NOT ask for it
- Deadline for response (if not specified, suggest 10-30 days)

When you have gathered sufficient information, you should:
1. Summarize all the details and evidence collected
2. Confirm with the user that everything is correct
3. Indicate that you're ready to generate the demand letter

Be conversational, professional, and thorough. Ask one or two questions at a time to avoid overwhelming the user.`

  // Extract conversation history
  const conversationHistory = chatMessages
    .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n\n')

  // Extract document information
  const documentInfo = documents.length > 0
    ? documents.map(doc => `- ${doc.name} (${doc.type})`).join('\n')
    : 'No documents uploaded yet.'

  // Extract case contact information - provide FULL details
  let contactInfoSummary = ''
  if (caseData && caseData.contact_info) {
    const contact = caseData.contact_info
    const your = contact.your || {}
    const recipient = contact.recipient || {}
    contactInfoSummary = `FULL CONTACT INFORMATION (Already collected at case creation - DO NOT ask for this):

YOUR CONTACT INFORMATION:
- Name: ${your.name || 'Not provided'}
- Address: ${your.address || 'Not provided'}
- Phone: ${your.phone || 'Not provided'}
- Email: ${your.email || 'Not provided'}

RECIPIENT CONTACT INFORMATION:
- Name: ${recipient.name || 'Not provided'}
- Title: ${recipient.title || 'Not provided'}
- Company: ${recipient.company || 'Not provided'}
- Address: ${recipient.address || 'Not provided'}

IMPORTANT: All contact information has been provided during case creation. You should NOT ask the user for contact details. Use this information when generating the demand letter.`
  } else {
    contactInfoSummary = 'Contact information: Not yet provided in case details. You may need to ask for contact information if it\'s required for the demand letter.'
  }

  const prompt = `You are helping to gather information for a demand letter. Here's what we have so far:

${contactInfoSummary}

UPLOADED DOCUMENTS:
${documentInfo}

CONVERSATION HISTORY:
${conversationHistory || 'No conversation history yet.'}

Based on the information above, please:
1. Assess what information is already available (note that contact information is already complete)
2. Identify what's missing or needs clarification (DO NOT ask about contact information - it's already provided)
3. Provide a helpful response that either:
   - Asks specific questions about missing information (facts, legal basis, amount/action, timeline, evidence), OR
   - Confirms that all details are present and offers to summarize everything, OR
   - Provides a summary of all collected details and evidence if the user is ready

Be concise but thorough. Focus on gathering case facts, legal basis, demands, timeline, and evidence. Contact information is already complete and should not be requested. If everything seems complete, offer to summarize and confirm before generating the letter.`

  return await callLLM(prompt, {
    systemPrompt,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  })
}

/**
 * Assembles and summarizes all collected details and evidence for review
 * @param {Array} chatMessages - Array of chat message objects
 * @param {Array} documents - Array of uploaded document objects
 * @param {Object} caseData - Case data object containing contact_info
 * @returns {Promise<string>} A comprehensive summary of all details and evidence
 */
export async function assembleDetailsSummary(chatMessages, documents = [], caseData = null) {
  const systemPrompt = `You are a legal assistant assembling a comprehensive summary of all details and evidence collected for a demand letter.
Create a clear, organized summary that includes:
1. All facts of the case
2. Legal basis for the demand
3. Specific amount or action being demanded
4. Timeline of events
5. Evidence collected (documents, communications, etc.)
6. Contact information
7. Any other relevant details

Format this as a clear, professional summary that can be reviewed before generating the final demand letter.`

  // Extract conversation history
  const conversationText = chatMessages
    .filter(msg => msg.sender === 'user')
    .map(msg => msg.text)
    .join('\n\n')

  // Extract document content
  const documentTexts = documents
    .filter(doc => doc.content && typeof doc.content === 'string')
    .map(doc => {
      if (doc.type.startsWith('text/') || doc.type === 'application/json') {
        return `Document: ${doc.name}\n${doc.content}`
      } else {
        return `Document: ${doc.name} (${doc.type}) - Content available but not extracted in text format`
      }
    })
    .join('\n\n---\n\n')

  // Extract case contact information
  let contactInfoText = ''
  if (caseData && caseData.contact_info) {
    const contact = caseData.contact_info
    const your = contact.your || {}
    const recipient = contact.recipient || {}
    contactInfoText = `CASE CONTACT INFORMATION:

Your Information:
- Name: ${your.name || 'Not provided'}
- Address: ${your.address || 'Not provided'}
- Phone: ${your.phone || 'Not provided'}
- Email: ${your.email || 'Not provided'}

Recipient Information:
- Name: ${recipient.name || 'Not provided'}
- Title: ${recipient.title || 'Not provided'}
- Company: ${recipient.company || 'Not provided'}
- Address: ${recipient.address || 'Not provided'}`
  }

  const prompt = `Please assemble a comprehensive summary of all details and evidence collected for this demand letter:

${contactInfoText ? `${contactInfoText}\n\n` : ''}CONVERSATION DETAILS:
${conversationText || 'No conversation details provided.'}

${documents.length > 0 ? `\nEVIDENCE/DOCUMENTS:\n${documentTexts}` : '\nNo documents were uploaded.'}

Please create a clear, organized summary that includes all facts, legal basis, demands, timeline, evidence, and contact information. 
This summary will be reviewed before generating the final demand letter.`

  return await callLLM(prompt, {
    systemPrompt,
    model: 'gpt-4',
    temperature: 0.5,
    maxTokens: 2000
  })
}

/**
 * Generates a legal demand letter using chat messages, documents, and case contact info
 * @param {Array} chatMessages - Array of chat message objects
 * @param {Array} documents - Array of uploaded document objects
 * @param {Object} caseData - Case data object containing contact_info
 * @param {Object} template - Optional template object with content to use as format guide
 * @returns {Promise<string>} The generated demand letter
 */
export async function generateLegalDemandLetter(chatMessages, documents = [], caseData = null, template = null) {
  let systemPrompt = `You are an expert legal assistant specializing in drafting professional demand letters. 
Your task is to create a clear, professional, and legally sound demand letter based on the information provided 
in the conversation, case contact information, and any uploaded documents.

Guidelines for the demand letter:
1. Use formal, professional language
2. Clearly state the facts and legal basis for the demand
3. Specify the exact amount or action being demanded
4. Include a reasonable deadline for response (typically 10-30 days)
5. Mention potential legal consequences if the demand is not met
6. Maintain a professional but firm tone
7. Include all relevant details from the conversation and documents
8. Structure the letter with proper formatting (date, recipient, subject, body, closing)
9. Use the exact contact information provided in the case details`

  if (template && template.content) {
    systemPrompt += `\n\nCRITICAL: You must maintain the EXACT structure and layout of the provided template.

TEMPLATE STRUCTURE TO PRESERVE:
${template.content}

STRUCTURE PRESERVATION RULES:
1. Maintain the exact same section order as the template
2. Preserve all formatting, spacing, and line breaks
3. Keep the same paragraph structure and organization
4. Replace placeholders (like [Your Name], [Date]) with actual information
5. Do NOT reorganize, combine, or restructure sections
6. Do NOT change the template's tone, style, or format
7. Fill in placeholders while keeping everything else identical

Your output should be structurally identical to the template, with only placeholders replaced by real information.`
  } else {
    systemPrompt += `\n\nFormat the response as a complete, ready-to-use demand letter.`
  }

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

  // Extract case contact information
  let contactInfoText = ''
  if (caseData && caseData.contact_info) {
    const contact = caseData.contact_info
    const your = contact.your || {}
    const recipient = contact.recipient || {}
    contactInfoText = `CASE CONTACT INFORMATION:

Your Information:
- Name: ${your.name || 'Not provided'}
- Address: ${your.address || 'Not provided'}
- Phone: ${your.phone || 'Not provided'}
- Email: ${your.email || 'Not provided'}

Recipient Information:
- Name: ${recipient.name || 'Not provided'}
- Title: ${recipient.title || 'Not provided'}
- Company: ${recipient.company || 'Not provided'}
- Address: ${recipient.address || 'Not provided'}`
  }

  let prompt = `Please generate a legal demand letter based on the following information:

${contactInfoText ? `${contactInfoText}\n\n` : ''}CONVERSATION HISTORY:
${conversationText || 'No conversation history provided.'}

${documents.length > 0 ? `\nUPLOADED DOCUMENTS:\n${documentTexts}` : '\nNo documents were uploaded.'}`

  if (template && template.content) {
    prompt += `\n\nIMPORTANT: The template structure has been provided in the system instructions. 
Generate a complete letter that maintains the EXACT structure of the template, replacing all placeholders 
with the actual information provided above. Do not include placeholder text - use the real information 
from the case details, conversation, and documents.`
  } else {
    prompt += `\n\nPlease create a comprehensive demand letter that incorporates all relevant information from the case details, 
conversation, and documents. Make sure the letter is professional, clear, and actionable. Use the exact contact information 
provided in the case details.`
  }

  return await callLLM(prompt, {
    systemPrompt,
    model: 'gpt-4',
    temperature: 0.5, // Lower temperature for more consistent legal writing
    maxTokens: 3000
  })
}

/**
 * Parses user instruction to find referenced documents
 * Looks for document names, file extensions, or phrases like "from document", "using the contract", etc.
 * @param {string} instruction - User's editing instruction
 * @param {Array} documents - Array of available document objects
 * @returns {Array} Array of document objects that are referenced
 */
function findReferencedDocuments(instruction, documents) {
  if (!documents || documents.length === 0) return []
  
  const instructionLower = instruction.toLowerCase()
  const referencedDocs = []
  
  // Check each document to see if it's mentioned
  documents.forEach(doc => {
    const docNameLower = doc.name.toLowerCase()
    const docNameWithoutExt = docNameLower.replace(/\.[^.]+$/, '') // Remove extension
    
    // Check for various patterns
    const patterns = [
      docNameLower, // Full filename
      docNameWithoutExt, // Filename without extension
      doc.name, // Original case filename
    ]
    
    // Also check for common phrases
    const phrasePatterns = [
      `from ${docNameLower}`,
      `from ${docNameWithoutExt}`,
      `using ${docNameLower}`,
      `using ${docNameWithoutExt}`,
      `the ${docNameLower}`,
      `the ${docNameWithoutExt}`,
      `document ${docNameLower}`,
      `${docNameLower} document`,
    ]
    
    // Check if any pattern matches
    const isReferenced = patterns.some(pattern => instructionLower.includes(pattern)) ||
                        phrasePatterns.some(pattern => instructionLower.includes(pattern)) ||
                        // Check for file extension mentions
                        (docNameLower.includes('.') && instructionLower.includes(docNameLower.split('.').pop()))
    
    if (isReferenced) {
      referencedDocs.push(doc)
    }
  })
  
  return referencedDocs
}

/**
 * Edits an existing draft letter based on user instructions
 * Uses minimal context by default - only includes documents if explicitly referenced
 * @param {string} currentDraftContent - The current draft content to edit
 * @param {string} userInstruction - User's instruction for what to change
 * @param {Array} documents - Array of uploaded document objects (only included if referenced)
 * @returns {Promise<string>} The edited draft content
 */
export async function editDraftContent(
  currentDraftContent,
  userInstruction,
  documents = []
) {
  const systemPrompt = `You are an expert legal document editor specializing in demand letters.
Your role is to edit and refine existing demand letters based on user instructions while maintaining:
1. Professional legal tone and language
2. Proper formatting and structure
3. Legal accuracy and completeness
4. All relevant case details and contact information (already present in the draft)

CRITICAL EDITING RULES:
- Preserve the overall structure and organization of the document
- Maintain all contact information exactly as provided in the draft
- Keep legal accuracy and professional tone
- Only make changes that align with the user's instructions
- Preserve formatting, spacing, and document structure
- Do not remove important legal content unless explicitly requested
- The draft already contains all necessary information from the case - you don't need additional context unless the user specifically references documents or other sources`

  // Convert HTML to plain text for LLM processing
  // This prevents the LLM from modifying HTML structure
  const plainTextDraft = htmlToPlainText(currentDraftContent)
  
  // Find documents referenced in the instruction
  const referencedDocuments = findReferencedDocuments(userInstruction, documents)
  
  // Build document context only if documents are referenced
  let documentContext = ''
  if (referencedDocuments.length > 0) {
    const documentTexts = referencedDocuments.map(doc => {
      if (doc.content && typeof doc.content === 'string') {
        // For text-based documents, include the content
        if (doc.type.startsWith('text/') || doc.type === 'application/json') {
          return `Document: ${doc.name}\n${doc.content}`
        } else {
          return `Document: ${doc.name} (${doc.type}) - Content available but not extracted in text format`
        }
      } else {
        return `Document: ${doc.name} (${doc.type}) - Content not available`
      }
    }).join('\n\n---\n\n')
    
    documentContext = `\n\nREFERENCED DOCUMENTS:\n${documentTexts}`
  }

  // Build the minimal prompt with plain text draft
  let prompt = `You are editing an existing demand letter. Here is the current draft in plain text:

=== CURRENT DRAFT ===
${plainTextDraft}

=== USER'S EDITING INSTRUCTION ===
${userInstruction}${documentContext}

CRITICAL: Return ONLY the complete edited draft content in plain text format. Maintain the exact same structure, line breaks, spacing, and organization as the original. Only make the specific changes requested by the user. Do not reformat, reorganize, or restructure the document. Do not include explanations or meta-commentary - just return the edited plain text draft.`

  // Get edited plain text from LLM
  const editedPlainText = await callLLM(prompt, {
    systemPrompt,
    model: 'gpt-4',
    temperature: 0.3, // Lower temperature for more precise editing
    maxTokens: 3000 // Reduced from 4000 since we're using less context
  })

  // Convert plain text back to HTML for the editor
  return plainTextToHtml(editedPlainText)
}

