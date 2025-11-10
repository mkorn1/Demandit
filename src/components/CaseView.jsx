import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ChatBot from './ChatBot'
import DocumentSidebar from './DocumentSidebar'
import { DocumentProvider } from '../context/DocumentContext'
import { getCase } from '../services/caseService'

function CaseView() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCase()
  }, [caseId])

  const loadCase = async () => {
    try {
      setLoading(true)
      const data = await getCase(caseId)
      setCaseData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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
      <div className="h-screen w-screen bg-black flex">
        <DocumentSidebar />
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-red-900 via-black to-blue-900 p-4 border-b border-red-900">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => navigate('/')}
                  className="text-white hover:text-gray-300 mb-2 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Cases
                </button>
                <h1 className="text-xl font-bold text-white">{caseData.title}</h1>
                {caseData.contact_info?.recipient?.company && (
                  <p className="text-sm text-gray-300">{caseData.contact_info.recipient.company}</p>
                )}
              </div>
            </div>
          </div>
          <ChatBot caseId={caseId} caseData={caseData} />
        </div>
      </div>
    </DocumentProvider>
  )
}

export default CaseView

