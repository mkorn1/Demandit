import { createContext, useContext, useState } from 'react'

const DocumentContext = createContext()

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [annotations, setAnnotations] = useState({})

  const addDocument = (document) => {
    setDocuments(prev => [...prev, document])
    setSelectedDoc(document.id)
  }

  const removeDocument = (docId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId))
    if (selectedDoc === docId) {
      setSelectedDoc(null)
    }
    setAnnotations(prev => {
      const newAnnotations = { ...prev }
      delete newAnnotations[docId]
      return newAnnotations
    })
  }

  const addAnnotation = (docId, annotation) => {
    setAnnotations(prev => ({
      ...prev,
      [docId]: [...(prev[docId] || []), {
        id: Date.now(),
        ...annotation,
        createdAt: new Date()
      }]
    }))
  }

  const removeAnnotation = (docId, annotationId) => {
    setAnnotations(prev => ({
      ...prev,
      [docId]: (prev[docId] || []).filter(ann => ann.id !== annotationId)
    }))
  }

  return (
    <DocumentContext.Provider
      value={{
        documents,
        selectedDoc,
        annotations,
        addDocument,
        removeDocument,
        addAnnotation,
        removeAnnotation,
        setSelectedDoc
      }}
    >
      {children}
    </DocumentContext.Provider>
  )
}

export function useDocuments() {
  const context = useContext(DocumentContext)
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider')
  }
  return context
}

