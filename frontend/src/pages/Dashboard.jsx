import { useEffect, useState } from 'react'
import { getAnalyticsOverview, getDashboardStats } from '../api/client'
import StatusBadge from '../components/StatusBadge'

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50  border-blue-100  text-blue-700',
    green:  'bg-green-50 border-green-100 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    gray:   'bg-gray-50  border-gray-100  text-gray-700',
    red:    'bg-red-50   border-red-100   text-red-700',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  )
}

const STATUS_LABELS = {
  requested: 'Requested', pending: 'Pending', scheduled: 'Scheduled',
  assigned: 'Assigned', en_route: 'En Route', in_progress: 'In Progress',
  completed: 'Completed', invoiced: 'Invoiced', paid: 'Paid', cancelled: 'Cancelled',
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAnalyticsOverview(), getDashboardStats()])
      .then(([ov, st]) => { setOverview(ov); setStats(st) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>

  const byStatus = overview?.jobs_by_status || {}

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Today + Week KPIs */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Today / This Week</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Jobs Today"        value={overview?.jobs_today ?? 0}                              color="blue"   />
          <StatCard label="Revenue Today"     value={`$${(overview?.revenue_today ?? 0).toFixed(2)}`}        color="green"  />
          <StatCard label="Jobs This Week"    value={overview?.jobs_this_week ?? 0}                          color="purple" />
          <StatCard label="Revenue This Week" value={`$${(overview?.revenue_this_week ?? 0).toFixed(2)}`}    color="green"  />
        </div>
      </section>

      {/* Invoices */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Invoices</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Paid Invoices"   value={overview?.paid_invoices ?? 0}   color="green"  />
          <StatCard label="Unpaid Invoices" value={overview?.unpaid_invoices ?? 0} color="yellow" sub="Awaiting payment" />
        </div>
      </section>

      {/* Jobs by Status */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Jobs by Status</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-gray-50">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="p-4 flex flex-col items-start gap-1">
                <StatusBadge status={status} />
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-xs text-gray-400">{STATUS_LABELS[status] || status}</p>
              </div>
            ))}
            {Object.keys(byStatus).length === 0 && (
              <div className="col-span-5 p-6 text-center text-gray-400 text-sm">No jobs yet</div>
            )}
          </div>
        </div>
      </section>

      {/* Technician Workload */}
      {(overview?.technician_workload?.length ?? 0) > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Technician Workload
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Technician</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Active Jobs</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Completed This Week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {overview.technician_workload.map(tw => (
                  <tr key={tw.technician_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{tw.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                        ${tw.active_jobs > 3 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tw.active_jobs}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{tw.completed_this_week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Jobs */}
      {(stats?.recent_jobs?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Jobs</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Job</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Technician</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recent_jobs.map(j => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{j.title}</td>
                    <td className="px-4 py-3 text-gray-600">{j.customer?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{j.technician?.name ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
