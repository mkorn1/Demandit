function ChatMessage({ message }) {
  const isUser = message.sender === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
          isUser
            ? 'bg-blue-950 text-white rounded-br-none border border-blue-900'
            : 'bg-red-950 text-white border border-red-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.text}
        </p>
        <p
          className={`text-xs mt-1 ${
            isUser ? 'text-blue-200 opacity-70' : 'text-red-200 opacity-70'
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

