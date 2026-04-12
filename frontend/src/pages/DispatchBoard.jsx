import { useEffect, useState } from 'react'
import { getSchedules, getJobs, getTechnicians, createSchedule } from '../api/client'
import StatusBadge from '../components/StatusBadge'

function toLocalDateInput(date) {
  return date.toISOString().split('T')[0]
}

export default function DispatchBoard() {
  const today = toLocalDateInput(new Date())
  const [date, setDate] = useState(today)
  const [schedules, setSchedules] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [pendingJobs, setPendingJobs] = useState([])
  const [loading, setLoading] = useState(true)

  // Schedule form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ job_id: '', technician_id: '', scheduled_start: '', scheduled_end: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      getSchedules({ date }),
      getTechnicians(),
      getJobs({ status: 'pending' }),
    ]).then(([s, t, j]) => {
      setSchedules(s)
      setTechnicians(t)
      setPendingJobs(j)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [date])

  const handleSchedule = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createSchedule({
        ...form,
        scheduled_start: new Date(form.scheduled_start).toISOString(),
        scheduled_end: new Date(form.scheduled_end).toISOString(),
      })
      setShowForm(false)
      setForm({ job_id: '', technician_id: '', scheduled_start: '', scheduled_end: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to schedule')
    } finally {
      setSaving(false)
    }
  }

  // Group schedules by technician
  const byTech = technicians.map(tech => ({
    tech,
    schedules: schedules.filter(s => s.technician_id === tech.id),
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            + Schedule Job
          </button>
        </div>
      </div>

      {/* Schedule modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-gray-800 mb-4">Schedule a Job</h2>
            {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
            <form onSubmit={handleSchedule} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job (Pending) *</label>
                <select required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}>
                  <option value="">Select job...</option>
                  {pendingJobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title} — {j.customer?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Technician *</label>
                <select required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.technician_id} onChange={e => setForm(f => ({ ...f, technician_id: e.target.value }))}>
                  <option value="">Select technician...</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start *</label>
                  <input required type="datetime-local"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.scheduled_start}
                    onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End *</label>
                  <input required type="datetime-local"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.scheduled_end}
                    onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium">
                  {saving ? 'Scheduling...' : 'Schedule'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError('') }}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="space-y-4">
          {byTech.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-12">No technicians found. Add technicians first.</p>
          )}
          {byTech.map(({ tech, schedules: ts }) => (
            <div key={tech.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                  {tech.name.charAt(0)}
                </div>
                <span className="font-medium text-gray-800">{tech.name}</span>
                <span className="text-xs text-gray-400">{ts.length} job{ts.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-4">
                {ts.length === 0 ? (
                  <p className="text-sm text-gray-300 text-center py-4">No jobs scheduled for this day</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ts.map(s => (
                      <div key={s.id} className="border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-sm text-gray-800 leading-tight">{s.job?.title}</p>
                          <StatusBadge status={s.job?.status} />
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{s.job?.customer?.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {new Date(s.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
