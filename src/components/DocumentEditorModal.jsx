import { useState, useEffect } from 'react'
import DocumentEditor from './DocumentEditor'

/**
 * DocumentEditorModal - Reusable modal wrapper for document editing
 * Handles common modal structure, error display, and DocumentEditor integration
 */
function DocumentEditorModal({
  isOpen,
  onClose,
  content,
  onContentChange,
  onSave,
  title,
  subtitle,
  placeholder = 'Start editing...',
  autoSave = true,
  autoSaveDelay = 3000,
  headerActions = null,
  footerActions = null,
  emptyState = null,
  sidePanel = null,
  className = '',
  externalError = null
}) {
  const [editorContent, setEditorContent] = useState(content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  
  // Use external error if provided, otherwise use internal error
  const displayError = externalError || error

  // Update editor content when prop changes
  useEffect(() => {
    if (content !== undefined) {
      setEditorContent(content || '')
    }
  }, [content])

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleContentChange = (newContent) => {
    setEditorContent(newContent)
    setError(null) // Clear error when user starts typing
    if (onContentChange) {
      onContentChange(newContent)
    }
  }

  const handleEditorSave = async (editorContent) => {
    setIsSaving(true)
    setError(null)

    try {
      await onSave(editorContent)
    } catch (err) {
      console.error('Error saving document:', err)
      setError(err.message || 'Failed to save document')
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 rounded-lg border border-red-900 shadow-xl w-full max-w-6xl h-[90vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-900 flex items-center justify-between">
          <div className="flex-1">
            {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
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
        {displayError && (
          <div className="px-6 py-3 bg-red-900/20 border-b border-red-900">
            <p className="text-red-400 text-sm">{displayError}</p>
          </div>
        )}

        {/* Editor Content */}
        <div className={`flex-1 overflow-hidden min-h-0 ${sidePanel ? 'flex' : ''}`}>
          <div className={`${sidePanel ? 'flex-1 flex flex-col overflow-hidden min-h-0' : 'flex flex-col overflow-hidden min-h-0'} ${sidePanel ? 'border-r border-red-900' : ''}`}>
            {emptyState || (
              <DocumentEditor
                content={editorContent}
                onContentChange={handleContentChange}
                onSave={handleEditorSave}
                placeholder={placeholder}
                autoSave={autoSave}
                autoSaveDelay={autoSaveDelay}
                className="flex-1 min-h-0"
              />
            )}
          </div>
          {sidePanel && (
            <div className="w-80 bg-black border-l border-red-900 overflow-y-auto">
              {sidePanel}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {footerActions && (
          <div className="px-6 py-4 border-t border-red-900 flex items-center justify-between">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentEditorModal

