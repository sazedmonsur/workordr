import { useState } from 'react'

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? ''
const STORAGE_KEY = 'workordr_auth'

export default function PasswordGate({ children }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [authed, setAuthed] = useState(
    !DEMO_PASSWORD || sessionStorage.getItem(STORAGE_KEY) === DEMO_PASSWORD
  )

  if (authed) return children

  function handleSubmit(e) {
    e.preventDefault()
    if (input === DEMO_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, input)
      setAuthed(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-700 tracking-tight">WorkOrdr</h1>
          <p className="text-sm text-gray-400 mt-1">Field Service Management</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Enter password"
            autoFocus
            className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400
              ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          />
          {error && <p className="text-xs text-red-500">Incorrect password.</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
