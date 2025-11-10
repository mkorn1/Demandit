import { useState, useEffect } from 'react'
import { getCurrentDraft, getDraftVersions, saveDraft, regenerateDraft, deleteDraftVersion, getDraft } from '../services/draftService'
import { generateLegalDemandLetter } from '../services/llmService'
import { getCaseMessages } from '../services/caseService'
import { exportToDOCX, exportToPDF } from '../services/exportService'

function DraftSidebar({ caseId, caseData, chatMessages, documents, template, templateId }) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [currentDraft, setCurrentDraft] = useState(null)
  const [versions, setVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState(null)
  const [showDraftModal, setShowDraftModal] = useState(false)

  // Load draft data when sidebar is expanded
  useEffect(() => {
    if (!isCollapsed && caseId) {
      loadDraftData()
    }
  }, [isCollapsed, caseId])

  const loadDraftData = async () => {
    try {
      // Load current draft
      const current = await getCurrentDraft(caseId)
      if (current) {
        setCurrentDraft(current)
        setSelectedVersionId(current.id)
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

      // Create new draft version
      const newDraft = await regenerateDraft(caseId, renderedContent, templateId)
      
      setCurrentDraft(newDraft)
      setSelectedVersionId(newDraft.id)
      
      // Reload versions
      await loadDraftData()
    } catch (err) {
      console.error('Error generating draft:', err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
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
      setShowDraftModal(true)
    } catch (err) {
      console.error('Error loading version:', err)
      setError(err.message)
    }
  }

  const handleDeleteVersion = async (versionId, e) => {
    e.stopPropagation()
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

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="w-12 bg-black border-l border-red-900 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-white hover:text-red-500 transition-colors mb-4"
          title="Expand Drafts sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <div className="text-white text-xs transform -rotate-90 whitespace-nowrap mt-8">
          Drafts
        </div>
        {currentDraft && (
          <div className="mt-4 w-2 h-2 bg-blue-500 rounded-full" title="Draft available" />
        )}
      </div>
    )
  }

  // Expanded view
  return (
    <>
      <div className="w-80 bg-black border-l border-red-900 flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-red-900 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Drafts</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-white hover:text-red-500 transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-red-900/20 border-b border-red-900">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 border-b border-red-900 space-y-2">
          {!template && (
            <div className="px-3 py-2 bg-yellow-900/20 border border-yellow-800 rounded-lg text-yellow-300 text-xs">
              Please select a template to generate drafts
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !template}
            title={!template ? 'Please select a template first' : 'Generate a new draft'}
            className="w-full px-3 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-blue-800"
          >
            {isGenerating ? 'Generating...' : 'Generate Draft'}
          </button>
          {currentDraft && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving || currentDraft.status === 'saved'}
                className="w-full px-3 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-green-800"
              >
                {isSaving ? 'Saving...' : currentDraft.status === 'saved' ? 'Saved' : 'Save as Version'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('docx')}
                  disabled={isExporting}
                  className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-xs border border-gray-700"
                >
                  DOCX
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-xs border border-gray-700"
                >
                  PDF
                </button>
              </div>
            </>
          )}
        </div>

        {/* Current Draft Info */}
        {currentDraft && (
          <div className="px-4 py-3 border-b border-red-900 bg-blue-900/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium text-sm">Current Draft</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                currentDraft.status === 'saved' 
                  ? 'bg-green-900/50 text-green-300 border border-green-800'
                  : 'bg-yellow-900/50 text-yellow-300 border border-yellow-800'
              }`}>
                {currentDraft.status}
            </span>
            </div>
            <p className="text-gray-400 text-xs">
              Version {currentDraft.version_number} • {new Date(currentDraft.created_at).toLocaleDateString()}
            </p>
            <button
              onClick={() => setShowDraftModal(true)}
              className="mt-2 w-full px-3 py-1.5 bg-blue-900 text-white rounded text-xs hover:bg-blue-800 border border-blue-800"
            >
              View Full Draft
            </button>
          </div>
        )}

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 border-b border-red-900">
            <h3 className="text-sm font-semibold text-white">Version History</h3>
          </div>
          <div className="p-2">
            {versions.length === 0 ? (
              <p className="text-gray-400 text-xs p-4 text-center">No versions yet</p>
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
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">Version {version.version_number}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        version.status === 'saved' 
                          ? 'bg-green-900/50 text-green-300 border border-green-800'
                          : 'bg-yellow-900/50 text-yellow-300 border border-yellow-800'
                      }`}>
                        {version.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-2">
                      {new Date(version.created_at).toLocaleDateString()} {new Date(version.created_at).toLocaleTimeString()}
                    </p>
                    {version.saved_at && (
                      <p className="text-gray-500 text-xs mb-2">
                        Saved: {new Date(version.saved_at).toLocaleDateString()}
                      </p>
                    )}
                    <button
                      onClick={(e) => handleDeleteVersion(version.id, e)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Draft Viewer Modal (for viewing full content) */}
      {showDraftModal && currentDraft && (
        <DraftViewerModal
          isOpen={showDraftModal}
          onClose={() => setShowDraftModal(false)}
          draft={currentDraft}
          caseData={caseData}
        />
      )}
    </>
  )
}

// Simple modal for viewing draft content
function DraftViewerModal({ isOpen, onClose, draft, caseData }) {
  if (!isOpen || !draft) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-red-900 shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-900 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Draft Letter</h2>
            <p className="text-sm text-gray-400 mt-1">
              {caseData?.title || 'Draft'} • Version {draft.version_number} • {draft.status === 'saved' ? 'Saved' : 'Draft'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-white leading-relaxed">
              {draft.rendered_content}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DraftSidebar

