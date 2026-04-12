import { useEffect, useState } from 'react'
import { getJobs, createJob, getCustomers, getTechnicians } from '../api/client'
import StatusBadge from '../components/StatusBadge'

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ customer_id: '', technician_id: '', title: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = () => {
    const params = statusFilter ? { status: statusFilter } : {}
    Promise.all([getJobs(params), getCustomers(), getTechnicians()])
      .then(([j, c, t]) => { setJobs(j); setCustomers(c); setTechnicians(t) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = { ...form }
      if (!payload.technician_id) delete payload.technician_id
      await createJob(payload)
      setSuccess('Job created!')
      setForm({ customer_id: '', technician_id: '', title: '', description: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Jobs</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Job list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">All Jobs</h2>
            <select
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {loading ? (
            <p className="p-6 text-gray-400 text-sm">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {jobs.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No jobs found</td></tr>
                )}
                {jobs.map(j => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">{j.title}</td>
                    <td className="px-6 py-3 text-gray-600">{j.customer?.name}</td>
                    <td className="px-6 py-3 text-gray-500">{j.technician?.name || <span className="text-gray-300">Unassigned</span>}</td>
                    <td className="px-6 py-3"><StatusBadge status={j.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">New Job</h2>
          {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
          {success && <p className="mb-3 text-sm text-green-600 bg-green-50 p-2 rounded">{success}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
              <select
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.customer_id}
                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              >
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Technician</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.technician_id}
                onChange={e => setForm(f => ({ ...f, technician_id: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Job Title *</label>
              <input
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="AC Unit Repair"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the work needed..."
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Create Job'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
