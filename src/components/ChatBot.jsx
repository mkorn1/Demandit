import { useState, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { CHAT_TYPES } from '../config/chatTypes'
import { useDocuments } from '../context/DocumentContext'
import { useTemplates } from '../context/TemplateContext'
import { generateLegalDemandLetter } from '../services/llmService'
import { getCaseMessages, addCaseMessage, updateCaseMetadata } from '../services/caseService'

function ChatBot({ caseId, caseData, selectedChatType: externalChatType, onChatTypeChange }) {
  const { documents } = useDocuments()
  const { selectedTemplate, getTemplate } = useTemplates()
  const [messages, setMessages] = useState([])
  const [internalChatType, setInternalChatType] = useState('')
  const selectedChatType = externalChatType !== undefined ? externalChatType : internalChatType
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load messages and metadata on mount
  useEffect(() => {
    if (caseId) {
      loadCaseData()
    } else {
      // Fallback for when no caseId (shouldn't happen in normal flow)
      setMessages([{
        id: 1,
        text: "Hello! I'm your chatbot assistant. Select a chat type and start a conversation to generate a legal demand letter.",
        sender: 'bot',
        timestamp: new Date()
      }])
      setLoading(false)
    }
  }, [caseId, caseData])

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
        // No messages yet, show welcome message
        setMessages([{
          id: 1,
          text: "Hello! I'm your chatbot assistant. Select a chat type and start a conversation to generate a legal demand letter.",
          sender: 'bot',
          timestamp: new Date()
        }])
      }

      // Load selected chat type from metadata (if not provided externally)
      if (externalChatType === undefined && caseData?.metadata?.selectedChatType) {
        setInternalChatType(caseData.metadata.selectedChatType)
      }
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
          isError: message.isError
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
    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    await saveMessage(userMessage)

    // If Base Case Bot chat type is selected, generate the letter
    if (selectedChatType === CHAT_TYPES.BASE_CASE_BOT.id) {
      setIsGenerating(true)
      
      // Add a loading message
      const loadingMessage = {
        id: Date.now() + 1,
        text: 'Generating your legal demand letter...',
        sender: 'bot',
        timestamp: new Date(),
        isLoading: true
      }
      setMessages(prev => [...prev, loadingMessage])

      try {
        // Get all messages including the new one
        const allMessages = [...messages, userMessage]
        
        // Get selected template if one is selected
        const selectedTemplateData = selectedTemplate ? getTemplate(selectedTemplate) : null
        
        // Generate the demand letter with template if selected
        const demandLetter = await generateLegalDemandLetter(allMessages, documents, selectedTemplateData)
        
        // Remove loading message and add the generated letter
        const botMessage = {
          id: Date.now() + 2,
          text: demandLetter,
          sender: 'bot',
          timestamp: new Date()
        }
        
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          return [...withoutLoading, botMessage]
        })
        
        await saveMessage(botMessage)
      } catch (error) {
        console.error('Error generating demand letter:', error)
        
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
    <div className="flex flex-col flex-1 bg-black overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading messages...</div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-blue-900 p-4 bg-black">
        <ChatInput onSendMessage={handleSendMessage} disabled={isGenerating} />
      </div>
    </div>
  )
}

export default ChatBot

