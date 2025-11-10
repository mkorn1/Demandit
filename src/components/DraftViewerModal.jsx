import { useState, useEffect } from 'react'
import { generateDraft, getCurrentDraft, getDraftVersions, saveDraft, regenerateDraft, deleteDraftVersion, getDraft } from '../services/draftService'
import { generateLegalDemandLetter } from '../services/llmService'
import { getCaseMessages } from '../services/caseService'
import { exportToDOCX, exportToPDF } from '../services/exportService'

function DraftViewerModal({ 
  isOpen, 
  onClose, 
  caseId, 
  caseData, 
  chatMessages, 
  documents, 
  template,
  templateId 
}) {
  const [currentDraft, setCurrentDraft] = useState(null)
  const [versions, setVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [error, setError] = useState(null)

  // Load current draft and versions when modal opens
  useEffect(() => {
    if (isOpen && caseId) {
      loadDraftData()
    }
  }, [isOpen, caseId])

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
      // Generate the letter
      const renderedContent = await generateLegalDemandLetter(
        chatMessages,
        documents,
        caseData,
        template
      )

      // Create new draft version
      const newDraft = await generateDraft(caseId, renderedContent, templateId)
      
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

      // Create new draft version
      const newDraft = await regenerateDraft(caseId, renderedContent, templateId)
      
      setCurrentDraft(newDraft)
      setSelectedVersionId(newDraft.id)
      
      // Reload versions
      await loadDraftData()
    } catch (err) {
      console.error('Error regenerating draft:', err)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-red-900 shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-900 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Draft Letter</h2>
            {currentDraft && (
              <p className="text-sm text-gray-400 mt-1">
                Version {currentDraft.version_number} • {currentDraft.status === 'saved' ? 'Saved' : 'Draft'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVersionPanel(!showVersionPanel)}
              className="px-3 py-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-sm border border-blue-800"
            >
              {showVersionPanel ? 'Hide' : 'Show'} Versions
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-900/20 border-b border-red-900">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Letter Content */}
          <div className={`flex-1 overflow-y-auto p-6 ${showVersionPanel ? 'border-r border-red-900' : ''}`}>
            {currentDraft ? (
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-white leading-relaxed">
                  {currentDraft.rendered_content}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <p className="mb-4">No draft generated yet.</p>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Draft'}
                </button>
              </div>
            )}
          </div>

          {/* Version Panel */}
          {showVersionPanel && (
            <div className="w-80 bg-black border-l border-red-900 overflow-y-auto">
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
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-red-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || !currentDraft}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-800"
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !currentDraft || currentDraft?.status === 'saved'}
              className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed border border-green-800"
            >
              {isSaving ? 'Saving...' : currentDraft?.status === 'saved' ? 'Saved' : 'Save as Version'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => handleExport('docx')}
                disabled={isExporting || !currentDraft}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
              >
                {isExporting ? 'Exporting...' : 'Export DOCX'}
              </button>
            </div>
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
        </div>
      </div>
    </div>
  )
}

export default DraftViewerModal

