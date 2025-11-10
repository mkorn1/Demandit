import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCompanies, createCompany } from '../services/companyService'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  // Load companies when switching to signup
  useEffect(() => {
    if (!isLogin) {
      loadCompanies()
    }
  }, [isLogin])

  const loadCompanies = async () => {
    setLoadingCompanies(true)
    try {
      const data = await getCompanies()
      setCompanies(data)
    } catch (err) {
      setError('Failed to load companies')
    } finally {
      setLoadingCompanies(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        // For signup, we need a company
        let finalCompanyId = companyId

        // If creating a new company
        if (showNewCompany && newCompanyName.trim()) {
          const newCompany = await createCompany(newCompanyName.trim())
          finalCompanyId = newCompany.id
        }

        if (!finalCompanyId) {
          throw new Error('Please select or create a company')
        }

        await signUp(email, password, finalCompanyId)
        setError('Check your email to verify your account!')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full p-8 bg-gray-900 rounded-lg border border-red-900 shadow-lg">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">DemandIt!</h1>
        <p className="text-gray-400 text-center mb-6">Legal Demand Letter Generator</p>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isLogin
                ? 'bg-red-900 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              !isLogin
                ? 'bg-red-900 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCompany(false)
                    setCompanyId('')
                    setNewCompanyName('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    !showNewCompany
                      ? 'bg-red-900 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Select Company
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCompany(true)
                    setCompanyId('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    showNewCompany
                      ? 'bg-red-900 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Create Company
                </button>
              </div>

              {showNewCompany ? (
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-1">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    required={showNewCompany}
                    className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
                    placeholder="Enter company name"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">
                    Company
                  </label>
                  {loadingCompanies ? (
                    <div className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-gray-400 text-center">
                      Loading companies...
                    </div>
                  ) : (
                    <select
                      id="company"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      required={!showNewCompany}
                      className="w-full px-4 py-2 bg-black border border-blue-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-red-900"
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-900 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gradient-to-r from-red-900 to-blue-900 text-white font-medium rounded-lg hover:from-red-800 hover:to-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Auth

