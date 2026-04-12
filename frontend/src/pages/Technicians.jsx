import { useEffect, useState } from 'react'
import { getTechnicians, createTechnician, updateTechnician, getServices, assignServiceToTech, removeServiceFromTech } from '../api/client'

const SKILL_LEVELS = ['junior', 'senior', 'specialist']

function TechCard({ tech, selected, onClick }) {
  return (
    <div
      onClick={() => onClick(tech)}
      className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:border-blue-200 transition-colors
        ${selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-100'}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
          {tech.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800">{tech.name}</p>
          <p className="text-xs text-gray-500">{tech.email} · {tech.phone}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
            ${tech.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {tech.status}
          </span>
          <p className="text-xs text-gray-400 mt-1">{tech.skill_level}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(tech.services || []).map(s => (
          <span key={s.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s.name}</span>
        ))}
      </div>
    </div>
  )
}

export default function Technicians() {
  const [technicians, setTechnicians] = useState([])
  const [services, setServices]       = useState([])
  const [selected, setSelected]       = useState(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    skill_level: 'junior', base_rate: '', working_hours_start: '08:00', working_hours_end: '17:00',
  })

  const load = () => {
    setLoading(true)
    Promise.all([getTechnicians(true), getServices(false)])
      .then(([t, s]) => { setTechnicians(t); setServices(s) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = { ...form, base_rate: form.base_rate ? parseFloat(form.base_rate) : null }
      await createTechnician(payload)
      setForm({ name: '', email: '', phone: '', skill_level: 'junior', base_rate: '', working_hours_start: '08:00', working_hours_end: '17:00' })
      setShowCreate(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (tech) => {
    try {
      await updateTechnician(tech.id, { status: tech.status === 'active' ? 'inactive' : 'active' })
      load()
      if (selected?.id === tech.id) setSelected(null)
    } catch {}
  }

  const handleServiceToggle = async (techId, serviceId, assigned) => {
    try {
      if (assigned) await removeServiceFromTech(techId, serviceId)
      else await assignServiceToTech(techId, serviceId)
      load()
      // refresh selected
      const updated = technicians.find(t => t.id === techId)
      if (updated) setSelected(updated)
    } catch {}
  }

  const assignedIds = new Set((selected?.services || []).map(s => s.id))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Technicians</h1>
        <button
          onClick={() => { setShowCreate(true); setSelected(null) }}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          + Add Technician
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* List */}
        <div className="xl:col-span-2 space-y-3">
          {loading && <p className="text-gray-400 text-sm">Loading...</p>}
          {technicians.map(t => (
            <TechCard
              key={t.id}
              tech={t}
              selected={selected?.id === t.id}
              onClick={(tech) => { setSelected(tech); setShowCreate(false) }}
            />
          ))}
          {!loading && technicians.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-12">No technicians yet</p>
          )}
        </div>

        {/* Right panel: create or detail */}
        <div>
          {showCreate && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">New Technician</h2>
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
              <form onSubmit={handleCreate} className="space-y-3">
                {[['Name *', 'name', 'text', true], ['Email *', 'email', 'email', true],
                  ['Phone', 'phone', 'tel', false]].map(([label, key, type, req]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input required={req} type={type} value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Skill Level</label>
                  <select value={form.skill_level}
                    onChange={e => setForm(f => ({ ...f, skill_level: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {SKILL_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hourly Rate ($)</label>
                  <input type="number" step="0.01" value={form.base_rate}
                    onChange={e => setForm(f => ({ ...f, base_rate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 65.00" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[['Start', 'working_hours_start'], ['End', 'working_hours_end']].map(([label, key]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Work Hours {label}</label>
                      <input type="time" value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium">
                    {saving ? 'Saving...' : 'Create'}
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold text-gray-800">{selected.name}</h2>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="text-sm space-y-1 text-gray-600">
                <p>Skill: <span className="font-medium">{selected.skill_level}</span></p>
                <p>Rate: <span className="font-medium">${selected.base_rate ?? '—'}/hr</span></p>
                <p>Hours: {selected.working_hours_start} – {selected.working_hours_end}</p>
                <p>Status: <span className={`font-medium ${selected.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                  {selected.status}
                </span></p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services</p>
                <div className="space-y-1">
                  {services.map(svc => {
                    const isAssigned = assignedIds.has(svc.id)
                    return (
                      <label key={svc.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => handleServiceToggle(selected.id, svc.id, isAssigned)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-gray-700">{svc.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{svc.category}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={() => handleToggleStatus(selected)}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium border transition-colors
                  ${selected.status === 'active'
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-600 hover:bg-green-50'}`}
              >
                {selected.status === 'active' ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
