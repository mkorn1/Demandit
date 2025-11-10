import { useState, useRef } from 'react'
import { useDocuments } from '../context/DocumentContext'

function DocumentSidebar() {
  const {
    documents,
    selectedDoc,
    annotations,
    addDocument,
    removeDocument,
    addAnnotation,
    removeAnnotation,
    setSelectedDoc
  } = useDocuments()
  
  const [isCollapsed, setIsCollapsed] = useState(true)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    files.forEach((file) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        const newDoc = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: event.target.result,
          uploadedAt: new Date()
        }
        
        addDocument(newDoc)
      }
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file)
      } else if (file.type === 'application/pdf') {
        reader.readAsDataURL(file)
      } else if (file.type.startsWith('text/') || file.type === 'application/json') {
        reader.readAsText(file)
      } else {
        reader.readAsDataURL(file)
      }
    })
    
    // Reset input
    e.target.value = ''
  }

  const handleDeleteDocument = (docId) => {
    removeDocument(docId)
  }

  const selectedDocument = documents.find(doc => doc.id === selectedDoc)
  const docAnnotations = selectedDoc ? (annotations[selectedDoc] || []) : []

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
          Documents
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-black border-r border-red-900 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-red-900 bg-gradient-to-r from-red-900 via-black to-blue-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">Documents</h2>
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
        
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-2 bg-red-900 text-white rounded-lg font-medium hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-900 transition-colors border border-red-800"
        >
          Upload Document
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="p-4 text-center text-white opacity-60">
            <p>No documents uploaded</p>
            <p className="text-sm mt-2">Click "Upload Document" to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedDoc === doc.id
                    ? 'bg-red-950 border-red-800'
                    : 'bg-gray-900 border-gray-800 hover:bg-gray-800'
                }`}
                onClick={() => setSelectedDoc(doc.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {(doc.size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {doc.uploadedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteDocument(doc.id)
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                    title="Delete document"
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

      {/* Document Viewer */}
      {selectedDocument && (
        <div className="border-t border-red-900 flex flex-col" style={{ height: '50%' }}>
          <div className="p-3 bg-gray-900 border-b border-red-900 flex items-center justify-between">
            <h3 className="text-white font-medium text-sm truncate flex-1">{selectedDocument.name}</h3>
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-2"
              title="Close viewer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
            {selectedDocument.type.startsWith('image/') ? (
              <div className="flex items-center justify-center">
                <img
                  src={selectedDocument.content}
                  alt={selectedDocument.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : selectedDocument.type === 'application/pdf' ? (
              <div className="flex items-center justify-center h-full">
                <iframe
                  src={selectedDocument.content}
                  className="w-full h-full min-h-[400px]"
                  title={selectedDocument.name}
                />
              </div>
            ) : (
              <div className="text-white text-sm whitespace-pre-wrap break-words">
                {selectedDocument.content}
              </div>
            )}
          </div>

          {/* Annotations Section */}
          <div className="border-t border-red-900 bg-gray-900">
            <div className="p-3 border-b border-red-900 flex items-center justify-between">
              <h4 className="text-white font-medium text-sm">Annotations</h4>
              <button
                onClick={() => {
                  const note = prompt('Enter your annotation note:')
                  if (note) {
                    addAnnotation(selectedDoc, {
                      type: 'note',
                      content: note,
                      position: { x: 0, y: 0 }
                    })
                  }
                }}
                className="text-xs px-2 py-1 bg-red-900 text-white rounded hover:bg-red-800 transition-colors"
                title="Add annotation"
              >
                + Add Note
              </button>
            </div>
            
            <div className="p-3 max-h-32 overflow-y-auto space-y-2">
              {docAnnotations.length === 0 ? (
                <p className="text-gray-400 text-xs text-center">No annotations yet</p>
              ) : (
                docAnnotations.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-2 bg-gray-800 rounded border border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white text-xs">{ann.content}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {ann.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAnnotation(selectedDoc, ann.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                        title="Remove annotation"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentSidebar

