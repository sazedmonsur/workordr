import { useEffect, useState } from 'react'
import { getNotifications } from '../api/client'

const STATUS_COLORS = {
  sent:    'bg-green-100 text-green-700',
  failed:  'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
}

const CHANNEL_ICONS = { email: '✉', sms: '📱' }

export default function NotificationsLog() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')

  const load = () => {
    setLoading(true)
    getNotifications({ status: statusFilter || undefined, event_type: typeFilter || undefined })
      .then(setLogs)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter, typeFilter])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">All email and SMS notification attempts</p>
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All events</option>
            {['booking_created','booking_confirmed','technician_assigned','job_completed','invoice_generated','payment_received','reminder_sent'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button onClick={load}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">◻</p>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Event</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Channel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Recipient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{log.event_type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {CHANNEL_ICONS[log.channel]} {log.channel}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {log.recipient_email || log.recipient_phone || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[log.status] || ''}`}>
                      {log.status}
                    </span>
                    {log.error_message && (
                      <p className="text-xs text-red-500 mt-0.5 truncate max-w-32" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
