import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL ?? '/api'

async function saCall(path, method = 'GET', key, body = null) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-superadmin-key': key },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

export default function SuperAdmin() {
  const [key, setKey]             = useState('')
  const [authed, setAuthed]       = useState(false)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [creating, setCreating]   = useState(false)

  const [form, setForm] = useState({ company_name: '', admin_email: '', admin_password: '' })
  const [formErr, setFormErr] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formSuccess, setFormSuccess] = useState('')

  const unlock = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = await saCall('/superadmin/companies', 'GET', key)
      setCompanies(data)
      setAuthed(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const reload = async () => {
    try {
      const data = await saCall('/superadmin/companies', 'GET', key)
      setCompanies(data)
    } catch {}
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormErr(''); setFormSaving(true); setFormSuccess('')
    try {
      const data = await saCall('/superadmin/create-company', 'POST', key, form)
      setFormSuccess(`✓ ${data.company_name} created — login: ${data.admin_email}`)
      setForm({ company_name: '', admin_email: '', admin_password: '' })
      setCreating(false)
      reload()
    } catch (err) {
      setFormErr(err.message)
    } finally {
      setFormSaving(false)
    }
  }

  const handleToggle = async (id, currentActive) => {
    try {
      await saCall(`/superadmin/companies/${id}/toggle`, 'PATCH', key)
      reload()
    } catch {}
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Work<span className="text-blue-500">Ordr</span> SuperAdmin
            </h1>
            <p className="text-gray-400 text-sm mt-1">Master control panel</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
            <form onSubmit={unlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Superadmin Key</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2.5 text-sm">
                {loading ? 'Verifying…' : 'Enter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SuperAdmin Panel</h1>
            <p className="text-gray-500 text-sm mt-0.5">{companies.length} companies</p>
          </div>
          <button
            onClick={() => { setCreating(true); setFormSuccess('') }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            + New Company
          </button>
        </div>

        {formSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-6">
            {formSuccess}
          </div>
        )}

        {creating && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Create Company Account</h2>
            {formErr && <p className="text-red-500 text-sm bg-red-50 rounded px-3 py-2 mb-3">{formErr}</p>}
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              {[
                ['Company Name', 'company_name', 'text', 'e.g. ABC Plumbing'],
                ['Admin Email', 'admin_email', 'email', 'admin@abc.com'],
                ['Admin Password', 'admin_password', 'text', 'min 8 chars'],
              ].map(([label, key2, type, ph]) => (
                <div key={key2}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={type}
                    required
                    placeholder={ph}
                    value={form[key2]}
                    onChange={e => setForm(f => ({ ...f, [key2]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="col-span-3 flex gap-2">
                <button type="submit" disabled={formSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-5 py-2 text-sm font-medium">
                  {formSaving ? 'Creating…' : 'Create Company'}
                </button>
                <button type="button" onClick={() => { setCreating(false); setFormErr('') }}
                  className="border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-5 py-2 text-sm font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {companies.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${c.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <div>
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.admin_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span><span className="font-medium text-gray-800">{c.jobs}</span> jobs</span>
                  <span><span className="font-medium text-gray-800">{c.customers}</span> customers</span>
                  <span><span className="font-medium text-gray-800">{c.technicians}</span> techs</span>
                  <button
                    onClick={() => handleToggle(c.id, c.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                      c.is_active
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {c.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
