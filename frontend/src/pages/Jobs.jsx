import { useEffect, useState } from 'react'
import { getJobs, createJob, updateJobStatus, deleteJob, getCustomers, getTechnicians, getServices } from '../api/client'
import StatusBadge from '../components/StatusBadge'

const ALL_STATUSES = ['requested', 'pending', 'scheduled', 'assigned', 'en_route', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled']

function fmt(dt) {
  if (!dt) return null
  return new Date(dt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Jobs() {
  const [jobs, setJobs]       = useState([])
  const [customers, setCustomers] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [services, setServices] = useState([])
  const [filter, setFilter]   = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const [form, setForm] = useState({
    customer_id: '', technician_id: '', service_id: '',
    title: '', description: '', address: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      getJobs(filter ? { status: filter } : {}),
      getCustomers(),
      getTechnicians(),
      getServices(),
    ]).then(([j, c, t, s]) => {
      setJobs(j); setCustomers(c); setTechnicians(t); setServices(s)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = { ...form }
      if (!payload.technician_id) delete payload.technician_id
      if (!payload.service_id) delete payload.service_id
      await createJob(payload)
      setForm({ customer_id: '', technician_id: '', service_id: '', title: '', description: '', address: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await updateJobStatus(jobId, { status: newStatus, changed_by: 'admin' })
      load()
      if (selected?.id === jobId) setSelected(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      alert(err.response?.data?.detail || 'Status update failed')
    }
  }

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job? This action cannot be undone.')) return
    try {
      await deleteJob(jobId)
      setSelected(null)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed')
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Job list */}
        <div className="xl:col-span-2 space-y-2">
          {loading && <p className="text-gray-400 text-sm">Loading...</p>}
          {!loading && jobs.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-12">No jobs found</p>
          )}
          {jobs.map(j => (
            <div
              key={j.id}
              onClick={() => setSelected(j)}
              className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:border-blue-200 transition-colors
                ${selected?.id === j.id ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-100'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-gray-800">{j.title}</p>
                <StatusBadge status={j.status} />
              </div>
              <div className="flex flex-wrap gap-x-4 text-xs text-gray-500 mb-1">
                <span>Customer: <span className="text-gray-700">{j.customer?.name ?? '—'}</span></span>
                <span>Tech: <span className="text-gray-700">{j.technician?.name ?? 'Unassigned'}</span></span>
                {j.service && <span>Service: <span className="text-blue-600">{j.service.name}</span></span>}
              </div>
              {j.scheduled_at && (
                <p className="text-xs text-gray-400">{fmt(j.scheduled_at)} — {fmt(j.scheduled_end_at)}</p>
              )}
              {j.address && <p className="text-xs text-gray-400 truncate mt-0.5">{j.address}</p>}
            </div>
          ))}
        </div>

        {/* Right column: create form + selected job detail */}
        <div className="space-y-4">
          {/* Create form */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Create Job</h2>
            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                <select required value={form.customer_id}
                  onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
                <select value={form.service_id}
                  onChange={e => {
                    const svc = services.find(s => s.id === e.target.value)
                    setForm(f => ({ ...f, service_id: e.target.value, title: svc ? svc.name : f.title }))
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No service (manual)</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.base_price}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input required value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Job title" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Technician</label>
                <select value={form.technician_id}
                  onChange={e => setForm(f => ({ ...f, technician_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Unassigned</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Job site address" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium">
                {saving ? 'Creating...' : 'Create Job'}
              </button>
            </form>
          </div>

          {/* Selected job detail */}
          {selected && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <h2 className="font-semibold text-gray-800">Job Detail</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>
              <p className="font-medium text-gray-700 mb-1">{selected.title}</p>
              <div className="space-y-1 text-sm text-gray-500 mb-4">
                <p>Status: <StatusBadge status={selected.status} /></p>
                <p>Customer: {selected.customer?.name}</p>
                <p>Technician: {selected.technician?.name ?? 'Unassigned'}</p>
                {selected.service && <p>Service: {selected.service.name}</p>}
                {selected.address && <p>Address: {selected.address}</p>}
                {selected.notes && <p>Notes: {selected.notes}</p>}
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Update Status</label>
                <select
                  value={selected.status}
                  onChange={e => handleStatusChange(selected.id, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button
                onClick={() => handleDelete(selected.id)}
                className="w-full border border-red-200 text-red-600 hover:bg-red-50 rounded-lg px-4 py-2 text-sm font-medium"
              >
                Delete Job
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
