import { useState } from 'react'
import { useTemplates } from '../context/TemplateContext'

function TemplateSidebar() {
  const {
    templates,
    loading,
    selectedTemplate,
    addTemplate,
    deleteTemplate,
    setSelectedTemplate
  } = useTemplates()
  
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')

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
      } catch (error) {
        console.error('Error creating template:', error)
        alert('Failed to create template. Please try again.')
      }
    }
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)

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
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 transition-colors border border-blue-800"
          >
            + Create Template
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name"
              className="w-full px-3 py-2 bg-black border border-blue-900 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateTemplate}
                className="flex-1 px-3 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewTemplateName('')
                  setNewTemplateContent('')
                }}
                className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
                onClick={() => setSelectedTemplate(template.id)}
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

      {/* Template Viewer */}
      {selectedTemplateData && (
        <div className="border-t border-red-900 flex flex-col" style={{ height: '50%' }}>
          <div className="p-3 bg-gray-900 border-b border-red-900 flex items-center justify-between">
            <h3 className="text-white font-medium text-sm truncate flex-1">{selectedTemplateData.name}</h3>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-2"
              title="Close viewer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
            <div className="text-white text-sm whitespace-pre-wrap break-words font-mono">
              {selectedTemplateData.content}
            </div>
          </div>

          {/* Use Template Button */}
          <div className="border-t border-red-900 bg-gray-900 p-3">
            <button
              onClick={() => {
                // This could copy to clipboard or insert into chat
                navigator.clipboard.writeText(selectedTemplateData.content)
                alert('Template copied to clipboard!')
              }}
              className="w-full px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
            >
              Copy Template
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplateSidebar

