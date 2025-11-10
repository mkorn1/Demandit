import ChatBot from './components/ChatBot'
import DocumentSidebar from './components/DocumentSidebar'

function App() {
  return (
    <div className="h-screen w-screen bg-black flex">
      <DocumentSidebar />
      <div className="flex-1 overflow-hidden">
        <ChatBot />
      </div>
    </div>
  )
}

export default App

