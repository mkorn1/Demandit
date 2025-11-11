import { useState, useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { CHAT_TYPES } from '../config/chatTypes'
import { useDocuments } from '../context/DocumentContext'
import { useTemplates } from '../context/TemplateContext'
import { generateLegalDemandLetter, chatAssistant, assembleDetailsSummary, editDraftContent } from '../services/llmService'
import { getCaseMessages, addCaseMessage, updateCaseMetadata } from '../services/caseService'
import { generateDraft, updateDraft } from '../services/draftService'
import { getOrCreateCaseTemplate } from '../services/templateService'

function ChatBot({ 
  caseId, 
  caseData, 
  selectedChatType: externalChatType, 
  onChatTypeChange, 
  onDraftGenerated,
  // Draft editor context
  currentDraft = null,
  onDraftUpdate = null
}) {
  const { documents } = useDocuments()
  const { selectedTemplate, getTemplate } = useTemplates()
  const [messages, setMessages] = useState([])
  const [internalChatType, setInternalChatType] = useState('')
  const selectedChatType = externalChatType !== undefined ? externalChatType : internalChatType
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false)
  const [detailsSummary, setDetailsSummary] = useState(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Load messages and metadata on mount
  useEffect(() => {
    if (caseId) {
      loadCaseData()
    } else {
      // Fallback for when no caseId (shouldn't happen in normal flow)
      setMessages([{
        id: 1,
        text: "Hello! I'm your legal assistant. I'll help you gather all the details and evidence needed for your demand letter.\n\nI already have your contact information and the recipient's contact information from when you created this case, so I won't need to ask for that.\n\nI'll ask you questions about:\n- The facts of your case\n- The legal basis for your demand\n- The specific amount or action you're seeking\n- Timeline of events\n- Supporting evidence\n\nOnce we have all the information, I'll assemble everything and generate your demand letter. Let's get started!",
        sender: 'bot',
        timestamp: new Date()
      }])
      setLoading(false)
    }
  }, [caseId, caseData, selectedChatType])

  const loadCaseData = async () => {
    try {
      setLoading(true)
      const savedMessages = await getCaseMessages(caseId)
      
      if (savedMessages.length > 0) {
        // Convert database messages to chat format
        const formattedMessages = savedMessages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: new Date(msg.created_at),
          ...(msg.metadata || {})
        }))
        setMessages(formattedMessages)
      } else {
        // No messages yet, show welcome message based on chat type
        const welcomeMessage = selectedChatType === CHAT_TYPES.DRAFT_EDITOR_AGENT.id
          ? {
              id: 1,
              text: "Hello! I'm your Draft Editor Agent. I can help you edit and refine your demand letter draft.\n\nYou can ask me to:\n- Make the tone more formal or assertive\n- Add or remove specific content\n- Fix grammar and spelling\n- Improve clarity and structure\n- Adjust formatting\n- Add details from your case\n\nJust tell me what you'd like to change, and I'll update the draft for you. The changes will be saved automatically.",
              sender: 'bot',
              timestamp: new Date(),
              metadata: { chatType: CHAT_TYPES.DRAFT_EDITOR_AGENT.id }
            }
          : {
              id: 1,
              text: "Hello! I'm your legal assistant. I'll help you gather all the details and evidence needed for your demand letter.\n\nI already have your contact information and the recipient's contact information from when you created this case, so I won't need to ask for that.\n\nI'll ask you questions about:\n- The facts of your case\n- The legal basis for your demand\n- The specific amount or action you're seeking\n- Timeline of events\n- Supporting evidence\n\nOnce we have all the information, I'll assemble everything and generate your demand letter. Let's get started!",
              sender: 'bot',
              timestamp: new Date()
            }
        setMessages([welcomeMessage])
      }

      // Load selected chat type from metadata (if not provided externally)
      if (externalChatType === undefined && caseData?.metadata?.selectedChatType) {
        setInternalChatType(caseData.metadata.selectedChatType)
      }

      // Reset ready state when loading messages
      setIsReadyToGenerate(false)
      setDetailsSummary(null)
    } catch (error) {
      console.error('Error loading case data:', error)
      setMessages([{
        id: 1,
        text: "Error loading case. Please try refreshing the page.",
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }])
    } finally {
      setLoading(false)
    }
  }

  const saveMessage = async (message) => {
    if (!caseId) return
    
    try {
      await addCaseMessage(caseId, {
        text: message.text,
        sender: message.sender,
        metadata: {
          isLoading: message.isLoading,
          isError: message.isError,
          chatType: message.metadata?.chatType || selectedChatType || null
        }
      })
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  const handleChatTypeChange = async (newChatType) => {
    if (onChatTypeChange) {
      onChatTypeChange(newChatType)
    } else {
      setInternalChatType(newChatType)
    }
    // Reset ready state when chat type changes
    setIsReadyToGenerate(false)
    setDetailsSummary(null)
    if (caseId) {
      try {
        await updateCaseMetadata(caseId, {
          ...(caseData?.metadata || {}),
          selectedChatType: newChatType
        })
      } catch (error) {
        console.error('Error saving chat type:', error)
      }
    }
  }

  const handleSendMessage = async (messageText) => {
    // Check if user is requesting to generate the letter
    const isGenerateRequest = messageText.toLowerCase().includes('generate') && 
                              (messageText.toLowerCase().includes('letter') || 
                               messageText.toLowerCase().includes('draft') ||
                               messageText.toLowerCase().includes('ready'))

    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      metadata: { chatType: selectedChatType || null }
    }
    
    setMessages(prev => [...prev, userMessage])
    await saveMessage(userMessage)

    // If Base Case Bot chat type is selected
    if (selectedChatType === CHAT_TYPES.BASE_CASE_BOT.id) {
      setIsGenerating(true)
      
      // Add a loading message
      const loadingMessage = {
        id: Date.now() + 1,
        text: isGenerateRequest ? 'Assembling details and generating your demand letter...' : 'Processing your message...',
        sender: 'bot',
        timestamp: new Date(),
        isLoading: true
      }
      setMessages(prev => [...prev, loadingMessage])

      try {
        // Get all messages including the new one
        const allMessages = [...messages, userMessage]

        // If user explicitly requests generation, generate the letter
        if (isGenerateRequest) {
          // Assemble details summary internally (for LLM use, not displayed in chat)
          if (!detailsSummary) {
            const summary = await assembleDetailsSummary(allMessages, documents, caseData)
            setDetailsSummary(summary)
          }

          // Get selected template if one is selected
          const selectedTemplateData = selectedTemplate ? getTemplate(selectedTemplate) : null
          
          // Generate the demand letter with template if selected
          const demandLetter = await generateLegalDemandLetter(allMessages, documents, caseData, selectedTemplateData)
          
          // Convert company template ID to case template ID (or null)
          const caseTemplateId = await getOrCreateCaseTemplate(caseId, selectedTemplate || null)
          
          // Save as draft
          const newDraft = await generateDraft(caseId, demandLetter, caseTemplateId)
          
          // Remove loading message and add the generated letter
          const botMessage = {
            id: Date.now() + 3,
            text: `Your demand letter has been generated and saved as Draft Version ${newDraft.version_number}.\n\nClick "View Draft" in the sidebar to see it, or it will open automatically.`,
            sender: 'bot',
            timestamp: new Date()
          }
          
          setMessages(prev => {
            const withoutLoading = prev.filter(msg => !msg.isLoading)
            return [...withoutLoading, botMessage]
          })
          
          await saveMessage(botMessage)
          setIsReadyToGenerate(false) // Reset after generation
          
          // Notify parent to open draft modal and refresh sidebar
          if (onDraftGenerated) {
            onDraftGenerated(newDraft)
          }
        } else {
          // Use conversational assistant to gather details
          const assistantResponse = await chatAssistant(allMessages, documents, caseData)
          
          // Check if assistant indicates readiness (look for keywords)
          const responseLower = assistantResponse.toLowerCase()
          const seemsReady = responseLower.includes('ready to generate') || 
                            responseLower.includes('all details') ||
                            responseLower.includes('ready to draft') ||
                            responseLower.includes('summary') ||
                            (responseLower.includes('complete') && responseLower.includes('information'))
          
          if (seemsReady && !isReadyToGenerate) {
            setIsReadyToGenerate(true)
          }
          
          // Remove loading message and add assistant response
          const botMessage = {
            id: Date.now() + 2,
            text: assistantResponse,
            sender: 'bot',
            timestamp: new Date()
          }
          
          setMessages(prev => {
            const withoutLoading = prev.filter(msg => !msg.isLoading)
            return [...withoutLoading, botMessage]
          })
          
          await saveMessage(botMessage)
        }
      } catch (error) {
        console.error('Error in chat:', error)
        
        // Remove loading message and add error message
        const errorMessage = {
          id: Date.now() + 2,
          text: `Error: ${error.message}. Please check your API configuration and try again.`,
          sender: 'bot',
          timestamp: new Date(),
          isError: true
        }
        
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          return [...withoutLoading, errorMessage]
        })
        
        await saveMessage(errorMessage)
      } finally {
        setIsGenerating(false)
      }
    } else if (selectedChatType === CHAT_TYPES.DRAFT_EDITOR_AGENT.id) {
      // Draft Editor Agent chat type
      if (!currentDraft) {
        // No draft available
        const botResponse = {
          id: Date.now() + 1,
          text: 'No draft is currently open for editing. Please open a draft first to use the Draft Editor Agent.',
          sender: 'bot',
          timestamp: new Date(),
          isError: true
        }
        setMessages(prev => [...prev, botResponse])
        await saveMessage(botResponse)
        return
      }

      setIsGenerating(true)
      
      // Add a loading message
      const loadingMessage = {
        id: Date.now() + 1,
        text: 'Editing your draft...',
        sender: 'bot',
        timestamp: new Date(),
        isLoading: true
      }
      setMessages(prev => [...prev, loadingMessage])

      try {
        // Edit the draft with minimal context
        // Only documents are passed - they'll only be included if referenced in the instruction
        const editedContent = await editDraftContent(
          currentDraft.rendered_content,
          messageText,
          documents
        )

        // Update the draft
        const updatedDraft = await updateDraft(currentDraft.id, editedContent)

        // Remove loading message and add success response
        const botMessage = {
          id: Date.now() + 2,
          text: `I've updated the draft according to your instructions. The changes have been saved automatically. You can continue editing or ask for more changes.`,
          sender: 'bot',
          timestamp: new Date(),
          metadata: { chatType: CHAT_TYPES.DRAFT_EDITOR_AGENT.id }
        }

        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          return [...withoutLoading, botMessage]
        })

        await saveMessage({
          ...botMessage,
          metadata: {
            ...botMessage.metadata,
            isLoading: false,
            isError: false
          }
        })

        // Notify parent to refresh draft
        if (onDraftUpdate) {
          onDraftUpdate(updatedDraft)
        }
      } catch (error) {
        console.error('Error editing draft:', error)
        
        // Remove loading message and add error message
        const errorMessage = {
          id: Date.now() + 2,
          text: `Error editing draft: ${error.message}. Please try again.`,
          sender: 'bot',
          timestamp: new Date(),
          isError: true,
          metadata: { chatType: CHAT_TYPES.DRAFT_EDITOR_AGENT.id }
        }
        
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          return [...withoutLoading, errorMessage]
        })
        
        await saveMessage({
          ...errorMessage,
          metadata: {
            ...errorMessage.metadata,
            isLoading: false
          }
        })
      } finally {
        setIsGenerating(false)
      }
    } else {
      // For other chat types or no selection, just add a placeholder response
      const botResponse = {
        id: Date.now() + 1,
        text: selectedChatType 
          ? 'Please select a chat type to enable full functionality.'
          : 'Please select a chat type from the dropdown above to get started.',
        sender: 'bot',
        timestamp: new Date()
      }
      
      setTimeout(() => {
        setMessages(prev => [...prev, botResponse])
        saveMessage(botResponse)
      }, 500)
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-black overflow-hidden min-h-0">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black min-h-0">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading messages...</div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-blue-900 p-4 bg-black">
        {isReadyToGenerate && selectedChatType === CHAT_TYPES.BASE_CASE_BOT.id && (
          <div className="mb-3 p-3 bg-blue-950 border border-blue-800 rounded-lg">
            <p className="text-sm text-blue-200 mb-2">
              ✓ All details have been collected. Ready to generate your demand letter.
            </p>
            <p className="text-xs text-blue-300 opacity-75">
              Type "generate letter" or "ready" to create your demand letter, or continue the conversation to add more details.
            </p>
          </div>
        )}
        <ChatInput 
          onSendMessage={handleSendMessage} 
          disabled={isGenerating}
          isReadyToGenerate={isReadyToGenerate}
        />
      </div>
    </div>
  )
}

export default ChatBot

