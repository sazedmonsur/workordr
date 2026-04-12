import { useLocation, Link } from 'react-router-dom'

export default function BookingConfirmation() {
  const { state } = useLocation()

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No booking data found.</p>
          <Link to="/book" className="text-blue-600 hover:underline">Book a service</Link>
        </div>
      </div>
    )
  }

  const scheduled = state.scheduled_at
    ? new Date(state.scheduled_at).toLocaleString([], {
        weekday: 'long', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <span className="text-xl font-bold text-gray-900">
          Work<span className="text-blue-600">Ordr</span>
        </span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Received!</h1>
          <p className="text-gray-500 mb-6">{state.message}</p>

          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service</span>
              <span className="font-medium text-gray-800">{state.service_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-800">{state.customer_name}</span>
            </div>
            {scheduled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Requested Time</span>
                <span className="font-medium text-gray-800">{scheduled}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                {state.status}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-6">
            We'll send a confirmation once your appointment is scheduled.
            A technician will be in touch.
          </p>

          <Link
            to="/book"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-sm font-semibold"
          >
            Book Another Service
          </Link>
        </div>
      </div>
    </div>
  )
}
