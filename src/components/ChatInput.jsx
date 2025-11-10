import { useState } from 'react'

function ChatInput({ onSendMessage, disabled = false }) {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? "Generating..." : "Type your message..."}
        disabled={disabled}
        className="flex-1 px-4 py-3 bg-black text-white border border-blue-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900 placeholder-white placeholder-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!inputValue.trim() || disabled}
        className="px-6 py-3 bg-red-900 text-white rounded-lg font-medium hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-900 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-800"
      >
        {disabled ? 'Generating...' : 'Send'}
      </button>
    </form>
  )
}

export default ChatInput

