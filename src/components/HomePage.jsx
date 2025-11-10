import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCases, createCase, deleteCase } from '../services/caseService'
import CaseCreationModal from './CaseCreationModal'

function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = async () => {
    try {
      setLoading(true)
      const data = await getCases()
      setCases(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCase = async (formData) => {
    try {
      const newCase = await createCase({
        title: `Case: ${formData.recipientCompany}`,
        contact_info: {
          your: {
            name: formData.yourName,
            address: formData.yourAddress,
            phone: formData.yourPhone,
            email: formData.yourEmail
          },
          recipient: {
            name: formData.recipientName,
            title: formData.recipientTitle,
            company: formData.recipientCompany,
            address: formData.recipientAddress
          }
        },
        metadata: {}
      })
      setIsModalOpen(false)
      navigate(`/case/${newCase.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteCase = async (caseId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this case?')) return

    try {
      await deleteCase(caseId)
      await loadCases()
    } catch (err) {
      setError(err.message)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 via-black to-blue-900 p-4 shadow-lg border-b border-red-900">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">DemandIt!</h1>
          <div className="flex items-center gap-4">
            <span className="text-white text-sm">{user?.email}</span>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Your Cases</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-gradient-to-r from-red-900 to-blue-900 text-white font-medium rounded-lg hover:from-red-800 hover:to-blue-800 transition-colors"
          >
            + Create New Case
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No cases yet. Create your first case to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                onClick={() => navigate(`/case/${caseItem.id}`)}
                className="bg-gray-900 border border-blue-900 rounded-lg p-4 cursor-pointer hover:border-red-900 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white">{caseItem.title}</h3>
                  <button
                    onClick={(e) => handleDeleteCase(caseItem.id, e)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete case"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {caseItem.contact_info?.recipient?.company && (
                  <p className="text-gray-400 text-sm mb-2">
                    {caseItem.contact_info.recipient.company}
                  </p>
                )}
                <p className="text-gray-500 text-xs">
                  Created {formatDate(caseItem.created_at)}
                </p>
                {caseItem.updated_at !== caseItem.created_at && (
                  <p className="text-gray-500 text-xs">
                    Updated {formatDate(caseItem.updated_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CaseCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateCase={handleCreateCase}
      />
    </div>
  )
}

export default HomePage

