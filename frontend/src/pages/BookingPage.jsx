import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getServices, searchAvailability, createBooking } from '../api/client'

function fmt(dt) {
  return new Date(dt).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function BookingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=service, 2=slot, 3=details, 4=review

  const [services, setServices]     = useState([])
  const [slots, setSlots]           = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [selectedService, setSelectedService] = useState(null)
  const [selectedSlot, setSelectedSlot]       = useState(null)
  const [slotDate, setSlotDate]               = useState('')

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => { getServices().then(setServices) }, [])

  const handleServiceSelect = (svc) => {
    setSelectedService(svc)
    setSelectedSlot(null)
    setSlots([])
    setStep(2)
  }

  const handleDateChange = (d) => {
    setSlotDate(d)
    if (!d) return
    setLoadingSlots(true)
    searchAvailability(d, selectedService?.estimated_duration || 60)
      .then(setSlots)
      .finally(() => setLoadingSlots(false))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const result = await createBooking({
        service_id: selectedService.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone || undefined,
        address: form.address,
        notes: form.notes || undefined,
        preferred_start: selectedSlot.start,
        preferred_end: selectedSlot.end,
      })
      navigate('/book/confirmed', { state: result })
    } catch (err) {
      setError(err.response?.data?.detail || 'Booking failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <span className="text-xl font-bold text-gray-900">
          Work<span className="text-blue-600">Ordr</span>
        </span>
        <span className="ml-3 text-gray-400 text-sm">Book a Service</span>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {['Service', 'Time Slot', 'Your Details'].map((label, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1 ${step > i + 1 ? 'bg-blue-600' : step === i + 1 ? 'bg-blue-400' : 'bg-gray-200'}`} />
              <p className={`text-xs ${step === i + 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Step 1: Choose service */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-4">What service do you need?</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => handleServiceSelect(svc)}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-left hover:border-blue-300 hover:shadow transition-all"
                >
                  <p className="font-semibold text-gray-800">{svc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{svc.category} · {svc.estimated_duration} min</p>
                  {svc.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{svc.description}</p>}
                  <p className="text-sm font-bold text-green-700 mt-2">From ${svc.base_price}</p>
                </button>
              ))}
              {services.length === 0 && (
                <p className="text-gray-400 text-sm col-span-2">No services available</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Choose time slot */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-sm text-blue-600 mb-4 hover:underline">← Back</button>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Choose a time slot</h1>
            <p className="text-sm text-gray-500 mb-4">
              Service: <span className="text-blue-600 font-medium">{selectedService?.name}</span> ({selectedService?.estimated_duration} min)
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Select date</label>
              <input
                type="date"
                value={slotDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => handleDateChange(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {loadingSlots && <p className="text-gray-400 text-sm">Finding available slots...</p>}
            {!loadingSlots && slotDate && slots.length === 0 && (
              <p className="text-gray-400 text-sm">No availability on this date. Try another day.</p>
            )}
            {slots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedSlot(slot); setStep(3) }}
                    className={`border rounded-lg p-3 text-left hover:border-blue-400 transition-colors
                      ${selectedSlot === slot ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">{slot.technician_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Contact details */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="text-sm text-blue-600 mb-4 hover:underline">← Back</button>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Your details</h1>
            <p className="text-sm text-gray-500 mb-4">
              {selectedService?.name} · {selectedSlot && fmt(selectedSlot.start)}
            </p>
            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input required type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="555-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service Address *</label>
                <input required value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, City TX" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Anything useful for the technician..." />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl px-4 py-3 text-sm font-semibold">
                {saving ? 'Submitting...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
