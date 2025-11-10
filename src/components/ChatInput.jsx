import { useState } from 'react'

function ChatInput({ onSendMessage, disabled = false, onGenerateDraft, hasTemplate = false, isGeneratingDraft = false, isReadyToGenerate = false }) {
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
    onSendMessage('generate letter')
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
      {isReadyToGenerate && (
        <button
          type="button"
          onClick={handleGenerateLetter}
          disabled={disabled}
          title="Generate demand letter with all collected details"
          className="px-4 py-3 bg-green-900 text-white rounded-lg font-medium hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-900 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-green-800 text-sm"
        >
          {disabled ? 'Generating...' : 'Generate Letter'}
        </button>
      )}
      <button
        type="button"
        onClick={onGenerateDraft}
        disabled={!hasTemplate || disabled || isGeneratingDraft}
        title={!hasTemplate ? "Please select a template first" : "Generate draft letter"}
        className="px-4 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-800 text-sm"
      >
        {isGeneratingDraft ? 'Generating...' : 'Generate'}
      </button>
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

