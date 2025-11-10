import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ChatBot from './ChatBot'
import DocumentSidebar from './DocumentSidebar'
import TemplateSidebar from './TemplateSidebar'
import DraftSidebar from './DraftSidebar'
import { DocumentProvider, useDocuments } from '../context/DocumentContext'
import { TemplateProvider, useTemplates } from '../context/TemplateContext'
import { getCase, updateCaseMetadata, getCaseMessages } from '../services/caseService'
import { CHAT_TYPES } from '../config/chatTypes'

function CaseView() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChatType, setSelectedChatType] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  useEffect(() => {
    loadCase()
  }, [caseId])

  const loadCase = async () => {
    try {
      setLoading(true)
      const data = await getCase(caseId)
      setCaseData(data)
      // Load chat type and template from metadata
      if (data?.metadata?.selectedChatType) {
        setSelectedChatType(data.metadata.selectedChatType)
      }
      if (data?.metadata?.selectedTemplate) {
        setSelectedTemplate(data.metadata.selectedTemplate)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChatTypeChange = async (newChatType) => {
    setSelectedChatType(newChatType)
    if (caseId && caseData) {
      try {
        await updateCaseMetadata(caseId, {
          ...(caseData?.metadata || {}),
          selectedChatType: newChatType
        })
        // Update local caseData
        setCaseData(prev => ({
          ...prev,
          metadata: {
            ...(prev?.metadata || {}),
            selectedChatType: newChatType
          }
        }))
      } catch (error) {
        console.error('Error saving chat type:', error)
      }
    }
  }

  const handleTemplateChange = async (templateId) => {
    setSelectedTemplate(templateId)
    if (caseId && caseData) {
      try {
        await updateCaseMetadata(caseId, {
          ...(caseData?.metadata || {}),
          selectedTemplate: templateId
        })
        // Update local caseData
        setCaseData(prev => ({
          ...prev,
          metadata: {
            ...(prev?.metadata || {}),
            selectedTemplate: templateId
          }
        }))
      } catch (error) {
        console.error('Error saving template selection:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading case...</div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Case not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <DocumentProvider>
      <TemplateProvider 
        initialSelectedTemplate={selectedTemplate}
        onTemplateChange={handleTemplateChange}
      >
        <div className="h-screen w-screen bg-black flex">
          {/* Left Sidebars */}
          <DocumentSidebar />
          <TemplateSidebar />
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Header 
              caseData={caseData} 
              navigate={navigate} 
              selectedChatType={selectedChatType}
              onChatTypeChange={handleChatTypeChange}
            />
            <ChatBot 
              caseId={caseId} 
              caseData={caseData}
              selectedChatType={selectedChatType}
              onChatTypeChange={handleChatTypeChange}
            />
          </div>

          {/* Right Sidebar - Drafts */}
          <DraftSidebarWrapper 
            caseId={caseId}
            caseData={caseData}
          />
        </div>
      </TemplateProvider>
    </DocumentProvider>
  )
}

// Wrapper component to provide context data to DraftSidebar
function DraftSidebarWrapper({ caseId, caseData }) {
  const { documents } = useDocuments()
  const { selectedTemplate, getTemplate } = useTemplates()
  const [chatMessages, setChatMessages] = useState([])

  useEffect(() => {
    if (caseId) {
      loadMessages()
    }
  }, [caseId])

  const loadMessages = async () => {
    try {
      const messages = await getCaseMessages(caseId)
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: new Date(msg.created_at)
      }))
      setChatMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const selectedTemplateData = selectedTemplate ? getTemplate(selectedTemplate) : null

  return (
    <DraftSidebar
      caseId={caseId}
      caseData={caseData}
      chatMessages={chatMessages}
      documents={documents}
      template={selectedTemplateData}
      templateId={selectedTemplate}
    />
  )
}

// Compact header component
function Header({ caseData, navigate, selectedChatType, onChatTypeChange }) {
  const { selectedTemplate, getTemplate } = useTemplates()

  return (
    <div className="bg-gradient-to-r from-red-900 via-black to-blue-900 px-4 py-3 border-b border-red-900">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="text-white hover:text-gray-300 flex items-center gap-1 shrink-0"
            title="Back to Cases"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white truncate">{caseData.title}</h1>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <select
              value={selectedChatType || ''}
              onChange={(e) => onChatTypeChange(e.target.value)}
              className="px-3 py-1.5 pr-8 bg-black text-white text-sm border border-blue-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900 appearance-none cursor-pointer"
            >
              <option value="">Select ChatType</option>
              <option value={CHAT_TYPES.BASE_CASE_BOT.id}>
                {CHAT_TYPES.BASE_CASE_BOT.name}
              </option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-3 h-3 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {selectedTemplate && (
            <span className="px-2 py-1 bg-blue-900/50 rounded text-xs border border-blue-800 text-white whitespace-nowrap">
              {getTemplate(selectedTemplate)?.name || 'Template'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default CaseView

