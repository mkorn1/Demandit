function ChatMessage({ message }) {
  const isUser = message.sender === 'user'
  const isError = message.isError
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
          isError
            ? 'bg-yellow-950 text-yellow-100 border border-yellow-800 rounded-bl-none'
            : isUser
            ? 'bg-blue-950 text-white rounded-br-none border border-blue-900'
            : 'bg-red-950 text-white border border-red-900 rounded-bl-none'
        }`}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <p className="text-sm">{message.text}</p>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.text}
          </p>
        )}
        <p
          className={`text-xs mt-1 ${
            isError 
              ? 'text-yellow-200 opacity-70'
              : isUser 
              ? 'text-blue-200 opacity-70' 
              : 'text-red-200 opacity-70'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

export default ChatMessage

