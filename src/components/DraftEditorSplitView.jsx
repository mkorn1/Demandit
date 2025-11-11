import { useState, useEffect } from 'react'
import DocumentEditor from './DocumentEditor'
import ChatBot from './ChatBot'
import { CHAT_TYPES } from '../config/chatTypes'
import { getDraft, updateDraft } from '../services/draftService'
import { getCaseMessages } from '../services/caseService'

/**
 * DraftEditorSplitView - Split screen view with draft editor (70%) and chat (30%)
 * Allows real-time editing of drafts with AI assistance
 */
function DraftEditorSplitView({
  draftId,
  caseId,
  caseData,
  onClose,
  onDraftUpdate
}) {
  const [currentDraft, setCurrentDraft] = useState(null)
  const [draftContent, setDraftContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chatMessages, setChatMessages] = useState([])

  // Load draft and messages
  useEffect(() => {
    if (draftId && caseId) {
      loadData()
    }
  }, [draftId, caseId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load draft
      const draft = await getDraft(draftId)
      setCurrentDraft(draft)
      setDraftContent(draft.rendered_content)

      // Load chat messages for context
      const messages = await getCaseMessages(caseId)
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: new Date(msg.created_at),
        ...(msg.metadata || {})
      }))
      setChatMessages(formattedMessages)
    } catch (err) {
      console.error('Error loading draft data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDraftContentChange = (content) => {
    setDraftContent(content)
  }

  const handleDraftSave = async (content) => {
    if (!currentDraft) return

    try {
      const updated = await updateDraft(currentDraft.id, content)
      setCurrentDraft(updated)
      setDraftContent(content)
      
      // Notify parent of update
      if (onDraftUpdate) {
        onDraftUpdate(updated)
      }
    } catch (err) {
      console.error('Error saving draft:', err)
      throw err
    }
  }

  const handleDraftUpdateFromChat = (updatedDraft) => {
    setCurrentDraft(updatedDraft)
    setDraftContent(updatedDraft.rendered_content)
    
    // Notify parent
    if (onDraftUpdate) {
      onDraftUpdate(updatedDraft)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-white">Loading draft...</div>
      </div>
    )
  }

  if (error || !currentDraft) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg border border-red-900 p-6 max-w-md">
          <h2 className="text-xl font-bold text-white mb-4">Error</h2>
          <p className="text-red-400 mb-4">{error || 'Draft not found'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 via-black to-blue-900 px-6 py-3 border-b border-red-900 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">
            Editing Draft - Version {currentDraft.version_number}
          </h2>
          <span className={`text-xs px-2 py-0.5 rounded ${
            currentDraft.status === 'saved' 
              ? 'bg-green-900/50 text-green-300 border border-green-800'
              : 'bg-yellow-900/50 text-yellow-300 border border-yellow-800'
          }`}>
            {currentDraft.status}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
          title="Close split view"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Split View Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side - Draft Editor (70%) */}
        <div className="flex-[0.7] flex flex-col overflow-hidden border-r border-red-900">
          <DocumentEditor
            content={draftContent}
            onContentChange={handleDraftContentChange}
            onSave={handleDraftSave}
            placeholder="Edit your draft here..."
            autoSave={true}
            autoSaveDelay={3000}
            className="flex-1 min-h-0"
          />
        </div>

        {/* Right Side - Chat (30%) */}
        <div className="flex-[0.3] flex flex-col overflow-hidden bg-black">
          <div className="px-4 py-2 border-b border-red-900 bg-gray-900 flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-sm font-semibold text-white">Draft Editor Agent</h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Ask me to edit your draft. Changes will appear in real-time.
            </p>
          </div>
          <ChatBot
            caseId={caseId}
            caseData={caseData}
            selectedChatType={CHAT_TYPES.DRAFT_EDITOR_AGENT.id}
            onChatTypeChange={() => {}} // Locked to Draft Editor Agent
            currentDraft={currentDraft}
            onDraftUpdate={handleDraftUpdateFromChat}
          />
        </div>
      </div>
    </div>
  )
}

export default DraftEditorSplitView

