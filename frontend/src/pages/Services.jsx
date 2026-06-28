import { useEffect, useState } from 'react'
import { getServices, createService, updateService } from '../api/client'

const CATEGORIES = ['HVAC', 'Appliance', 'Cleaning', 'Plumbing', 'Electrical', 'General Contractor', 'Other']

export default function Services() {
  const [services, setServices] = useState([])
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const emptyForm = { name: '', category: '', description: '', base_price: '', estimated_duration: '60' }
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    getServices(false).then(setServices).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await createService({
        ...form,
        base_price: parseFloat(form.base_price),
        estimated_duration: parseInt(form.estimated_duration),
      })
      setForm(emptyForm)
      setShowCreate(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create service')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (svc) => {
    try {
      await updateService(svc.id, { is_active: !svc.is_active })
      load()
      if (selected?.id === svc.id) setSelected(null)
    } catch {}
  }

  const byCategory = services.reduce((acc, s) => {
    const cat = s.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Service Catalog</h1>
        <button
          onClick={() => { setShowCreate(true); setSelected(null) }}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          + Add Service
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Catalog grouped by category */}
        <div className="xl:col-span-2 space-y-6">
          {loading && <p className="text-gray-400 text-sm">Loading...</p>}
          {Object.entries(byCategory).map(([cat, svcs]) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {svcs.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setSelected(s); setShowCreate(false) }}
                    className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:border-blue-200 transition-colors
                      ${!s.is_active ? 'opacity-50' : ''}
                      ${selected?.id === s.id ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-100'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-gray-800">{s.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {s.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{s.description}</p>}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-semibold text-green-700 text-sm">${s.base_price}</span>
                      <span>{s.estimated_duration} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!loading && services.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-12">No services yet. Add your first service.</p>
          )}
        </div>

        {/* Right panel */}
        <div>
          {showCreate && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">New Service</h2>
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. AC Repair" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea rows={2} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Base Price ($) *</label>
                    <input required type="number" step="0.01" min="0" value={form.base_price}
                      onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="150.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
                    <input type="number" min="15" step="15" value={form.estimated_duration}
                      onChange={e => setForm(f => ({ ...f, estimated_duration: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium">
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => { setShowCreate(false); setError('') }}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {selected && !showCreate && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between mb-3">
                <h2 className="font-semibold text-gray-800">{selected.name}</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>Category: <span className="font-medium">{selected.category || '—'}</span></p>
                <p>Base Price: <span className="font-semibold text-green-700">${selected.base_price}</span></p>
                <p>Duration: <span className="font-medium">{selected.estimated_duration} min</span></p>
                <p>Status: <span className={`font-medium ${selected.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                  {selected.is_active ? 'Active' : 'Inactive'}
                </span></p>
                {selected.description && <p className="text-gray-500 text-xs mt-2">{selected.description}</p>}
              </div>
              <button
                onClick={() => handleToggleActive(selected)}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium border
                  ${selected.is_active
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-600 hover:bg-green-50'}`}
              >
                {selected.is_active ? 'Deactivate Service' : 'Reactivate Service'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
