const STATUS_STYLES = {
  // Job statuses
  requested:   'bg-gray-100 text-gray-600',
  pending:     'bg-gray-100 text-gray-700',
  scheduled:   'bg-blue-100 text-blue-700',
  assigned:    'bg-blue-100 text-blue-800',
  en_route:    'bg-orange-100 text-orange-700',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed:   'bg-green-100 text-green-800',
  invoiced:    'bg-purple-100 text-purple-700',
  paid:        'bg-green-100 text-green-900',
  cancelled:   'bg-red-100 text-red-700',
  // Invoice
  draft:       'bg-gray-100 text-gray-700',
  // Misc
  sent:        'bg-blue-100 text-blue-700',
  failed:      'bg-red-100 text-red-700',
  active:      'bg-green-100 text-green-800',
  inactive:    'bg-gray-100 text-gray-600',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'
  const label = status?.replace(/_/g, ' ') ?? ''
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${style}`}>
      {label}
    </span>
  )
}
