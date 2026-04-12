import { useEffect, useState } from 'react'
import { getDashboardStats } from '../api/client'
import StatusBadge from '../components/StatusBadge'

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-8 text-gray-400">Loading dashboard...</div>
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Jobs"
          value={stats.total_jobs}
          sub={`${stats.in_progress_jobs} in progress`}
        />
        <StatCard
          label="Completed"
          value={stats.completed_jobs}
          color="text-green-600"
          sub={`${stats.pending_jobs} pending`}
        />
        <StatCard
          label="Total Revenue"
          value={`$${stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          color="text-blue-600"
          sub="From paid invoices"
        />
        <StatCard
          label="Unpaid Invoices"
          value={stats.unpaid_invoices}
          color={stats.unpaid_invoices > 0 ? 'text-red-500' : 'text-gray-900'}
          sub={`${stats.paid_invoices} paid`}
        />
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent Jobs</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.recent_jobs.length === 0 && (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">No jobs yet. Create your first job.</p>
          )}
          {stats.recent_jobs.map(job => (
            <div key={job.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{job.title}</p>
                <p className="text-sm text-gray-500">{job.customer?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
                <StatusBadge status={job.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
