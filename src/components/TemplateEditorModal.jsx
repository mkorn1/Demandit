import { useState, useEffect } from 'react'
import DocumentEditorModal from './DocumentEditorModal'

/**
 * TemplateEditorModal - Modal for editing templates
 * Uses DocumentEditorModal for common structure
 */
function TemplateEditorModal({
  isOpen,
  onClose,
  template,
  templateName,
  onSave,
  isNewTemplate = false,
  newTemplateName = '',
  onNewTemplateNameChange = null
}) {
  const [content, setContent] = useState(template?.content || '')
  const [localTemplateName, setLocalTemplateName] = useState(newTemplateName || '')
  const [isSaving, setIsSaving] = useState(false)

  // Update content when template changes
  useEffect(() => {
    if (template) {
      setContent(template.content || '')
    } else if (isNewTemplate) {
      setContent('')
    }
  }, [template, isNewTemplate])

  // Update local template name when prop changes
  useEffect(() => {
    if (isNewTemplate && newTemplateName) {
      setLocalTemplateName(newTemplateName)
    }
  }, [newTemplateName, isNewTemplate])

  const handleSave = async (editorContent) => {
    if (isNewTemplate && !localTemplateName.trim()) {
      throw new Error('Template name cannot be empty')
    }
    if (!editorContent.trim()) {
      throw new Error('Template content cannot be empty')
    }

    setIsSaving(true)
    try {
      await onSave(editorContent)
    } finally {
      setIsSaving(false)
    }
  }

  // Header with name input for new templates
  const headerTitle = isNewTemplate ? (
    <input
      type="text"
      value={localTemplateName}
      onChange={(e) => {
        setLocalTemplateName(e.target.value)
        if (onNewTemplateNameChange) {
          onNewTemplateNameChange(e.target.value)
        }
      }}
      placeholder="Template name"
      className="w-full px-3 py-2 bg-black border border-blue-900 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
      autoFocus
    />
  ) : (
    templateName || 'Edit Template'
  )

  const headerSubtitle = !isNewTemplate && template
    ? template.type?.replace('-', ' ') || 'Demand Letter'
    : null

  // Footer actions
  const footerActions = (
    <>
      <div className="flex items-center gap-2">
        {isNewTemplate && (
          <button
            onClick={() => handleSave(content)}
            disabled={isSaving || !content.trim() || !localTemplateName.trim()}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-800 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Template
              </>
            )}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 border border-gray-700"
      >
        Close
      </button>
    </>
  )

  return (
    <DocumentEditorModal
      isOpen={isOpen}
      onClose={onClose}
      content={content}
      onContentChange={setContent}
      onSave={handleSave}
      title={headerTitle}
      subtitle={headerSubtitle}
      placeholder={isNewTemplate ? "Enter your template content here..." : "Start editing your template..."}
      autoSave={!isNewTemplate}
      autoSaveDelay={3000}
      footerActions={footerActions}
    />
  )
}

export default TemplateEditorModal

