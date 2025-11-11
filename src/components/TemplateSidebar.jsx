import { useState } from 'react'
import { useTemplates } from '../context/TemplateContext'
import TemplateEditorModal from './TemplateEditorModal'

function TemplateSidebar() {
  const {
    templates,
    loading,
    selectedTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    setSelectedTemplate
  } = useTemplates()
  
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)

  const handleCreateTemplate = async () => {
    if (newTemplateName.trim() && newTemplateContent.trim()) {
      try {
        await addTemplate({
          name: newTemplateName,
          type: 'demand-letter',
          content: newTemplateContent
        })
        setNewTemplateName('')
        setNewTemplateContent('')
        setIsCreating(false)
        setShowTemplateModal(false)
      } catch (error) {
        console.error('Error creating template:', error)
        alert('Failed to create template. Please try again.')
      }
    }
  }

  const handleTemplateSave = async (content) => {
    if (!selectedTemplate) return
    try {
      await updateTemplate(selectedTemplate, { content })
    } catch (error) {
      console.error('Error saving template:', error)
      throw error
    }
  }

  const handleTemplateClick = (template) => {
    setEditingTemplate(template)
    setSelectedTemplate(template.id)
    setShowTemplateModal(true)
  }

  const handleNewTemplateClick = () => {
    setIsCreating(true)
    setNewTemplateName('')
    setNewTemplateContent('')
    setEditingTemplate(null)
    setShowTemplateModal(true)
  }

  const handleNewTemplateNameChange = (name) => {
    setNewTemplateName(name)
  }

  const handleModalClose = () => {
    setShowTemplateModal(false)
    setIsCreating(false)
    if (isCreating) {
      setNewTemplateName('')
      setNewTemplateContent('')
    }
  }

  const handleNewTemplateSave = async (content) => {
    setNewTemplateContent(content)
    // The template name is already set via handleNewTemplateNameChange
    // Just ensure we have both before creating
    if (newTemplateName.trim() && content.trim()) {
      await handleCreateTemplate()
    } else {
      throw new Error('Template name and content are required')
    }
  }

  if (isCollapsed) {
    return (
      <div className="w-12 bg-black border-r border-red-900 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-white hover:text-red-500 transition-colors mb-4"
          title="Expand sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="text-white text-xs transform -rotate-90 whitespace-nowrap mt-8">
          Templates
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-black border-r border-red-900 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-red-900 bg-gradient-to-r from-red-900 via-black to-blue-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">Templates</h2>
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
        
        {/* Create Template Button */}
        <button
          onClick={handleNewTemplateClick}
          className="w-full px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 transition-colors border border-blue-800"
        >
          + Create Template
        </button>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-white opacity-60">
            <p>Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-4 text-center text-white opacity-60">
            <p>No templates available</p>
            <p className="text-sm mt-2">Click "+ Create Template" to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedTemplate === template.id
                    ? 'bg-blue-950 border-blue-800'
                    : 'bg-gray-900 border-gray-800 hover:bg-gray-800'
                }`}
                onClick={() => handleTemplateClick(template)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{template.name}</p>
                    </div>
                    <p className="text-gray-400 text-xs mt-1 capitalize">
                      {template.type?.replace('-', ' ')}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {template.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                    <button
                    onClick={async (e) => {
                        e.stopPropagation()
                      if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
                        try {
                          await deleteTemplate(template.id)
                        } catch (error) {
                          console.error('Error deleting template:', error)
                          alert('Failed to delete template. Please try again.')
                        }
                      }
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                      title="Delete template"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      {showTemplateModal && (
        <TemplateEditorModal
          isOpen={showTemplateModal}
          onClose={handleModalClose}
          template={editingTemplate}
          templateName={isCreating ? newTemplateName : editingTemplate?.name}
          onSave={isCreating ? handleNewTemplateSave : handleTemplateSave}
          isNewTemplate={isCreating}
          newTemplateName={newTemplateName}
          onNewTemplateNameChange={handleNewTemplateNameChange}
        />
      )}
    </div>
  )
}

export default TemplateSidebar

