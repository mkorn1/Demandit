import { useState } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

function ChatBot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your chatbot assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ])

  // Placeholder for chat functionality - to be implemented later
  const handleSendMessage = (messageText) => {
    // TODO: Implement chat functionality
    console.log('Message to send:', messageText)
    
    // For now, just add a placeholder user message
    const userMessage = {
      id: messages.length + 1,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-black shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 via-black to-blue-900 p-4 shadow-lg border-b border-red-900">
        <h1 className="text-2xl font-bold text-white">DemandIt! ChatBot</h1>
        <p className="text-sm text-white opacity-80">Chat functionality coming soon</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-blue-900 p-4 bg-black">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  )
}

export default ChatBot

