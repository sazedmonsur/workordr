import { useEffect, useState } from 'react'
import { getInvoices, getInvoice, createPaymentIntent, confirmPayment, markInvoicePaid } from '../api/client'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import StatusBadge from '../components/StatusBadge'

// Use your publishable key from .env or hardcode test key for dev
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK || '')

function CheckoutForm({ invoiceId, total, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError('')

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message)
      setProcessing(false)
      return
    }

    try {
      await confirmPayment({ payment_intent_id: paymentIntent.id, invoice_id: invoiceId })
      onSuccess()
    } catch {
      setError('Payment confirmed with Stripe but failed to update invoice.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">Test card: 4242 4242 4242 4242 · Any future date · Any CVC</p>
      <div className="flex gap-2">
        <button type="submit" disabled={!stripe || processing}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium">
          {processing ? 'Processing...' : `Pay $${total}`}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [clientSecret, setClientSecret] = useState('')
  const [payError, setPayError] = useState('')
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)

  const load = () => {
    getInvoices().then(setInvoices).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openInvoice = async (inv) => {
    const detail = await getInvoice(inv.id)
    setSelected(detail)
    setClientSecret('')
    setPayError('')
  }

  const handlePayClick = async () => {
    setLoadingIntent(true)
    setPayError('')
    try {
      const { client_secret } = await createPaymentIntent(selected.id)
      setClientSecret(client_secret)
    } catch (err) {
      setPayError(err.response?.data?.detail || 'Could not initiate payment')
    } finally {
      setLoadingIntent(false)
    }
  }

  const handlePaySuccess = () => {
    load()
    setSelected(prev => ({ ...prev, status: 'paid' }))
    setClientSecret('')
  }

  const handleMarkPaid = async (method) => {
    setMarkingPaid(true)
    setPayError('')
    try {
      const updated = await markInvoicePaid(selected.id, method)
      setSelected(updated)
      load()
    } catch (err) {
      setPayError(err.response?.data?.detail || 'Failed to mark as paid')
    } finally {
      setMarkingPaid(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invoices</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Invoice list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">All Invoices</h2>
          </div>
          {loading ? (
            <p className="p-6 text-gray-400 text-sm">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No invoices yet</td></tr>
                )}
                {invoices.map(inv => (
                  <tr key={inv.id}
                    onClick={() => openInvoice(inv)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800">{inv.customer?.name}</td>
                    <td className="px-6 py-3 text-gray-700">${parseFloat(inv.total).toFixed(2)}</td>
                    <td className="px-6 py-3"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invoice detail */}
        {selected && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Invoice Detail</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selected.customer?.name}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            {/* Line items */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left text-xs text-gray-500">Description</th>
                  <th className="py-2 text-right text-xs text-gray-500">Qty</th>
                  <th className="py-2 text-right text-xs text-gray-500">Price</th>
                  <th className="py-2 text-right text-xs text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {selected.items?.map(item => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{item.description}</td>
                    <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-500">${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium text-gray-800">${parseFloat(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-sm text-right mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${parseFloat(selected.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${parseFloat(selected.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>Total</span>
                <span>${parseFloat(selected.total).toFixed(2)}</span>
              </div>
            </div>

            {selected.status !== 'paid' && (
              <>
                {payError && <p className="text-sm text-red-600 mb-3">{payError}</p>}
                {!clientSecret ? (
                  <div className="space-y-2">
                    <button
                      onClick={handlePayClick}
                      disabled={loadingIntent || markingPaid}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium"
                    >
                      {loadingIntent ? 'Loading payment...' : 'Pay by Card (Online)'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkPaid('cash')}
                        disabled={markingPaid || loadingIntent}
                        className="flex-1 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium"
                      >
                        {markingPaid ? 'Saving...' : 'Mark Paid — Cash'}
                      </button>
                      <button
                        onClick={() => handleMarkPaid('e-transfer')}
                        disabled={markingPaid || loadingIntent}
                        className="flex-1 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium"
                      >
                        {markingPaid ? 'Saving...' : 'Mark Paid — Transfer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm
                      invoiceId={selected.id}
                      total={parseFloat(selected.total).toFixed(2)}
                      onSuccess={handlePaySuccess}
                      onCancel={() => setClientSecret('')}
                    />
                  </Elements>
                )}
              </>
            )}

            {selected.status === 'paid' && (
              <div className="text-center py-3 bg-green-50 rounded-lg text-green-700 font-medium text-sm">
                Payment received
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
