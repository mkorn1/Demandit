import { useState, useEffect } from 'react'
import { generateDraft, getCurrentDraft, getDraftVersions, saveDraft, updateDraft, regenerateDraft, deleteDraftVersion, getDraft } from '../services/draftService'
import { generateLegalDemandLetter } from '../services/llmService'
import { getCaseMessages } from '../services/caseService'
import { exportToDOCX, exportToPDF } from '../services/exportService'
import { getOrCreateCaseTemplate } from '../services/templateService'
import { CHAT_TYPES } from '../config/chatTypes'
import DocumentEditorModal from './DocumentEditorModal'
import DraftEditorSplitView from './DraftEditorSplitView'

function DraftViewerModal({ 
  isOpen, 
  onClose, 
  caseId, 
  caseData, 
  chatMessages, 
  documents, 
  template,
  templateId,
  draftId,
  onDraftUpdate,
  onDraftLoad,
  onSwitchToDraftEditor
}) {
  const [currentDraft, setCurrentDraft] = useState(null)
  const [versions, setVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [error, setError] = useState(null)
  const [showSplitView, setShowSplitView] = useState(false)

  // Load current draft and versions when modal opens
  useEffect(() => {
    if (isOpen && caseId) {
      loadDraftData()
    }
  }, [isOpen, caseId, draftId])

  const loadDraftData = async () => {
    try {
      // If a specific draftId is provided, load that draft
      if (draftId) {
        const specificDraft = await getDraft(draftId)
        setCurrentDraft(specificDraft)
        setSelectedVersionId(specificDraft.id)
        // Notify parent of loaded draft
        if (onDraftLoad) {
          onDraftLoad(specificDraft)
        }
      } else {
        // Otherwise load current draft
        const current = await getCurrentDraft(caseId)
        if (current) {
          setCurrentDraft(current)
          setSelectedVersionId(current.id)
          // Notify parent of loaded draft
          if (onDraftLoad) {
            onDraftLoad(current)
          }
        }
      }

      // Load all versions
      const allVersions = await getDraftVersions(caseId)
      setVersions(allVersions)
    } catch (err) {
      console.error('Error loading draft data:', err)
      setError(err.message)
    }
  }

  const handleGenerate = async () => {
    if (!caseId || !caseData) return

    setIsGenerating(true)
    setError(null)

    try {
      // Generate the letter
      const renderedContent = await generateLegalDemandLetter(
        chatMessages,
        documents,
        caseData,
        template
      )

      // Convert company template ID to case template ID (or null)
      const caseTemplateId = await getOrCreateCaseTemplate(caseId, templateId || null)

      // Create new draft version
      const newDraft = await generateDraft(caseId, renderedContent, caseTemplateId)
      
      setCurrentDraft(newDraft)
      setSelectedVersionId(newDraft.id)
      
      // Reload versions
      await loadDraftData()
      
      // Notify parent of update
      if (onDraftUpdate) {
        onDraftUpdate()
      }
    } catch (err) {
      console.error('Error generating draft:', err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    if (!caseId || !caseData) return

    setIsGenerating(true)
    setError(null)

    try {
      // Get fresh chat messages
      const freshMessages = await getCaseMessages(caseId)
      const formattedMessages = freshMessages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: new Date(msg.created_at)
      }))

      // Generate the letter
      const renderedContent = await generateLegalDemandLetter(
        formattedMessages,
        documents,
        caseData,
        template
      )

      // Convert company template ID to case template ID (or null)
      const caseTemplateId = await getOrCreateCaseTemplate(caseId, templateId || null)

      // Create new draft version
      const newDraft = await regenerateDraft(caseId, renderedContent, caseTemplateId)
      
      setCurrentDraft(newDraft)
      setSelectedVersionId(newDraft.id)
      
      // Reload versions
      await loadDraftData()
      
      // Notify parent of update
      if (onDraftUpdate) {
        onDraftUpdate()
      }
    } catch (err) {
      console.error('Error regenerating draft:', err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDraftContentSave = async (content) => {
    if (!currentDraft) return

    try {
      const updated = await updateDraft(currentDraft.id, content)
      setCurrentDraft(updated)
      
      // Update in versions list
      setVersions(prev => prev.map(v => v.id === updated.id ? updated : v))
      
      // Notify parent of update
      if (onDraftUpdate) {
        onDraftUpdate(updated)
      }
    } catch (err) {
      console.error('Error updating draft content:', err)
      throw err
    }
  }

  const handleSave = async () => {
    if (!currentDraft || currentDraft.status === 'saved') return

    setIsSaving(true)
    setError(null)

    try {
      const saved = await saveDraft(currentDraft.id)
      setCurrentDraft(saved)
      
      // Update in versions list
      setVersions(prev => prev.map(v => v.id === saved.id ? saved : v))
      
      // Notify parent of update
      if (onDraftUpdate) {
        onDraftUpdate()
      }
    } catch (err) {
      console.error('Error saving draft:', err)
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleVersionSelect = async (versionId) => {
    if (versionId === selectedVersionId) return

    try {
      const version = await getDraft(versionId)
      setCurrentDraft(version)
      setSelectedVersionId(versionId)
      // Notify parent of loaded draft
      if (onDraftLoad) {
        onDraftLoad(version)
      }
    } catch (err) {
      console.error('Error loading version:', err)
      setError(err.message)
    }
  }

  const handleDeleteVersion = async (versionId) => {
    if (!confirm('Are you sure you want to delete this version?')) return

    try {
      await deleteDraftVersion(versionId)
      
      // If deleted version was current, load latest
      if (versionId === selectedVersionId) {
        const current = await getCurrentDraft(caseId)
        setCurrentDraft(current)
        setSelectedVersionId(current?.id || null)
      }
      
      // Reload versions
      await loadDraftData()
    } catch (err) {
      console.error('Error deleting version:', err)
      setError(err.message)
    }
  }

  const handleExport = async (format) => {
    if (!currentDraft) return

    setIsExporting(true)
    setError(null)

    try {
      const filename = `${caseData?.title || 'Draft'}_v${currentDraft.version_number}_${new Date().toISOString().split('T')[0]}`
      
      if (format === 'docx') {
        await exportToDOCX(currentDraft.rendered_content, filename)
      } else if (format === 'pdf') {
        await exportToPDF(currentDraft.rendered_content, filename)
      }
    } catch (err) {
      console.error('Error exporting:', err)
      setError(err.message)
    } finally {
      setIsExporting(false)
    }
  }

  // Version panel component
  const versionPanel = showVersionPanel ? (
    <>
      <div className="p-4 border-b border-red-900">
        <h3 className="text-lg font-semibold text-white">Versions</h3>
      </div>
      <div className="p-2">
        {versions.length === 0 ? (
          <p className="text-gray-400 text-sm p-4 text-center">No versions yet</p>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedVersionId === version.id
                    ? 'bg-blue-900/30 border-blue-800'
                    : 'bg-gray-900 border-red-900 hover:bg-gray-800'
                }`}
                onClick={() => handleVersionSelect(version.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Version {version.version_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    version.status === 'saved' 
                      ? 'bg-green-900/50 text-green-300 border border-green-800'
                      : 'bg-yellow-900/50 text-yellow-300 border border-yellow-800'
                  }`}>
                    {version.status}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">
                  {new Date(version.created_at).toLocaleDateString()} {new Date(version.created_at).toLocaleTimeString()}
                </p>
                {version.saved_at && (
                  <p className="text-gray-500 text-xs mt-1">
                    Saved: {new Date(version.saved_at).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteVersion(version.id)
                  }}
                  className="mt-2 text-red-400 hover:text-red-300 text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  ) : null

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-2">
      {currentDraft && (
        <button
          onClick={() => {
            setShowSplitView(true)
          }}
          className="px-3 py-1.5 bg-purple-900 text-purple-200 rounded-lg hover:bg-purple-800 text-xs border border-purple-800 flex items-center gap-2 transition-colors cursor-pointer"
          title="Open split-screen view with AI editor"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>AI Edit Available</span>
        </button>
      )}
      <button
        onClick={() => setShowVersionPanel(!showVersionPanel)}
        className="px-3 py-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-sm border border-blue-800"
      >
        {showVersionPanel ? 'Hide' : 'Show'} Versions
      </button>
    </div>
  )

  // Empty state
  const emptyState = !currentDraft ? (
    <div className="flex-1 flex items-center justify-center text-center text-gray-400 py-12">
      <div>
        <p className="mb-4">No draft generated yet.</p>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          title={isGenerating ? 'Generating draft...' : 'Generate a new draft'}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed relative group"
        >
          {isGenerating ? 'Generating...' : 'Generate Draft'}
          {isGenerating && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gray-700">
              Generating draft...
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </button>
      </div>
    </div>
  ) : null

  // Footer actions
  const footerActions = (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRegenerate}
          disabled={isGenerating || !currentDraft}
          title={!currentDraft ? 'Generate a draft first' : isGenerating ? 'Regenerating draft...' : 'Regenerate this draft'}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-800 relative group"
        >
          {isGenerating ? 'Regenerating...' : 'Regenerate'}
          {(!currentDraft || isGenerating) && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gray-700">
              {!currentDraft ? 'Generate a draft first' : 'Regenerating draft...'}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !currentDraft || currentDraft?.status === 'saved'}
          title={!currentDraft ? 'Generate a draft first' : currentDraft?.status === 'saved' ? 'This draft is already saved' : isSaving ? 'Saving draft...' : 'Save this draft as a version'}
          className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed border border-green-800 relative group"
        >
          {isSaving ? 'Saving...' : currentDraft?.status === 'saved' ? 'Saved' : 'Save as Version'}
          {(isSaving || !currentDraft || currentDraft?.status === 'saved') && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gray-700">
              {!currentDraft ? 'Generate a draft first' : currentDraft?.status === 'saved' ? 'This draft is already saved' : 'Saving draft...'}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleExport('docx')}
          disabled={isExporting || !currentDraft}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
        >
          {isExporting ? 'Exporting...' : 'Export DOCX'}
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={isExporting || !currentDraft}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
        >
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 border border-gray-700"
        >
          Close
        </button>
      </div>
    </>
  )

  // If split view is requested, show the split view instead
  if (showSplitView && currentDraft) {
    return (
      <DraftEditorSplitView
        draftId={currentDraft.id}
        caseId={caseId}
        caseData={caseData}
        onClose={() => {
          setShowSplitView(false)
          // Reload draft data to get latest changes
          loadDraftData()
        }}
        onDraftUpdate={(updatedDraft) => {
          setCurrentDraft(updatedDraft)
          if (onDraftUpdate) {
            onDraftUpdate(updatedDraft)
          }
        }}
      />
    )
  }

  return (
    <DocumentEditorModal
      isOpen={isOpen}
      onClose={onClose}
      content={currentDraft?.rendered_content || ''}
      onContentChange={() => {
        // Content change is handled by auto-save
      }}
      onSave={handleDraftContentSave}
      title="Draft Letter"
      subtitle={currentDraft ? `Version ${currentDraft.version_number} • ${currentDraft.status === 'saved' ? 'Saved' : 'Draft'}` : null}
      placeholder="Start editing your draft..."
      autoSave={true}
      autoSaveDelay={3000}
      headerActions={headerActions}
      footerActions={footerActions}
      emptyState={emptyState}
      sidePanel={versionPanel}
      externalError={error}
    />
  )
}

export default DraftViewerModal

