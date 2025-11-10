import { useState, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { CHAT_TYPES } from '../config/chatTypes'
import { useDocuments } from '../context/DocumentContext'
import { generateLegalDemandLetter } from '../services/llmService'
import { getCaseMessages, addCaseMessage, updateCaseMetadata } from '../services/caseService'

function ChatBot({ caseId, caseData }) {
  const { documents } = useDocuments()
  const [messages, setMessages] = useState([])
  const [selectedChatType, setSelectedChatType] = useState('')
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

      // Load selected chat type from metadata
      if (caseData?.metadata?.selectedChatType) {
        setSelectedChatType(caseData.metadata.selectedChatType)
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
    setSelectedChatType(newChatType)
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
        
        // Generate the demand letter
        const demandLetter = await generateLegalDemandLetter(allMessages, documents)
        
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
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 via-black to-blue-900 p-4 shadow-lg border-b border-red-900">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-2xl font-bold text-white">DemandIt! ChatBot</h1>
          <div className="relative">
            <select
              value={selectedChatType}
              onChange={(e) => handleChatTypeChange(e.target.value)}
              className="px-4 py-2 pr-8 bg-black text-white border border-blue-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900 appearance-none cursor-pointer"
            >
              <option value="">Select ChatType</option>
              <option value={CHAT_TYPES.BASE_CASE_BOT.id}>
                {CHAT_TYPES.BASE_CASE_BOT.name}
              </option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <p className="text-sm text-white opacity-80">
          {selectedChatType 
            ? `Active: ${Object.values(CHAT_TYPES).find(type => type.id === selectedChatType)?.name || selectedChatType}`
            : 'Select a chat type to begin'}
        </p>
      </div>

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

