const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-800',
  scheduled:   'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed:   'bg-green-100 text-green-800',
  cancelled:   'bg-red-100 text-red-800',
  draft:       'bg-gray-100 text-gray-700',
  sent:        'bg-blue-100 text-blue-700',
  paid:        'bg-green-100 text-green-800',
  active:      'bg-green-100 text-green-800',
  inactive:    'bg-gray-100 text-gray-600',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}
