import { useState, useEffect } from 'react'

function CaseCreationModal({ isOpen, onClose, onCreateCase }) {
  const [formData, setFormData] = useState({
    // Your contact information
    yourName: 'John Doe',
    yourAddress: '123 Main Street, Anytown, ST 12345',
    yourPhone: '(555) 123-4567',
    yourEmail: 'john.doe@email.com',
    
    // Recipient's contact information
    recipientName: 'Jane Smith',
    recipientTitle: 'Accounts Payable Manager',
    recipientCompany: 'ABC Corporation',
    recipientAddress: '456 Business Blvd, City, ST 67890'
  })

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreateCase(formData)
  }

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-red-900 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Create New Case</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Your Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-blue-900 pb-2">
                Your Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="yourName" className="block text-sm font-medium text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    id="yourName"
                    name="yourName"
                    type="text"
                    value={formData.yourName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
                  />
                </div>

                <div>
                  <label htmlFor="yourAddress" className="block text-sm font-medium text-gray-300 mb-1">
                    Address *
                  </label>
                  <textarea
                    id="yourAddress"
                    name="yourAddress"
                    value={formData.yourAddress}
                    onChange={handleChange}
                    required
                    rows={2}
                    className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="yourPhone" className="block text-sm font-medium text-gray-300 mb-1">
                      Phone *
                    </label>
                    <input
                      id="yourPhone"
                      name="yourPhone"
                      type="tel"
                      value={formData.yourPhone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="yourEmail" className="block text-sm font-medium text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      id="yourEmail"
                      name="yourEmail"
                      type="email"
                      value={formData.yourEmail}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient's Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-blue-900 pb-2">
                Recipient's Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="recipientName" className="block text-sm font-medium text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    id="recipientName"
                    name="recipientName"
                    type="text"
                    value={formData.recipientName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="recipientTitle" className="block text-sm font-medium text-gray-300 mb-1">
                      Title
                    </label>
                    <input
                      id="recipientTitle"
                      name="recipientTitle"
                      type="text"
                      value={formData.recipientTitle}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="recipientCompany" className="block text-sm font-medium text-gray-300 mb-1">
                      Company *
                    </label>
                    <input
                      id="recipientCompany"
                      name="recipientCompany"
                      type="text"
                      value={formData.recipientCompany}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="recipientAddress" className="block text-sm font-medium text-gray-300 mb-1">
                    Address *
                  </label>
                  <textarea
                    id="recipientAddress"
                    name="recipientAddress"
                    value={formData.recipientAddress}
                    onChange={handleChange}
                    required
                    rows={2}
                    className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-gradient-to-r from-red-900 to-blue-900 text-white font-medium rounded-lg hover:from-red-800 hover:to-blue-800 transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CaseCreationModal

