import { useState } from 'react'

function ChatInput({ onSendMessage, disabled = false, isReadyToGenerate = false }) {
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

  const handleGenerateLetter = () => {
    if (!disabled && isReadyToGenerate) {
      onSendMessage('generate letter')
    }
  }

  // Determine tooltip messages for disabled buttons
  const getGenerateLetterTooltip = () => {
    if (disabled) return 'Please wait while processing...'
    if (!isReadyToGenerate) return 'Continue the conversation to collect all required details before generating the letter'
    return 'Generate demand letter with all collected details'
  }

  const getSendTooltip = () => {
    if (disabled) return 'Please wait while processing...'
    if (!inputValue.trim()) return 'Enter a message to send'
    return 'Send message'
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? "Generating..." : isReadyToGenerate ? "Type a message or click 'Generate Letter'..." : "Type your message..."}
        disabled={disabled}
        className="flex-1 px-4 py-3 bg-black text-white border border-blue-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900 placeholder-white placeholder-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={handleGenerateLetter}
        disabled={disabled || !isReadyToGenerate}
        title={getGenerateLetterTooltip()}
        className="px-4 py-3 bg-green-900 text-white rounded-lg font-medium hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-900 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-green-800 text-sm relative group"
      >
        {disabled ? 'Generating...' : 'Generate Letter'}
        {/* Tooltip on hover when disabled */}
        {!isReadyToGenerate && !disabled && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gray-700">
            {getGenerateLetterTooltip()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </button>
      <button
        type="submit"
        disabled={!inputValue.trim() || disabled}
        title={getSendTooltip()}
        className="px-6 py-3 bg-red-900 text-white rounded-lg font-medium hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-900 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-800 relative group"
      >
        {disabled ? 'Generating...' : 'Send'}
        {/* Tooltip on hover when disabled */}
        {(!inputValue.trim() || disabled) && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gray-700">
            {getSendTooltip()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </button>
    </form>
  )
}

export default ChatInput

