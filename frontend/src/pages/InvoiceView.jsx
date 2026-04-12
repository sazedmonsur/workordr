import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getInvoice, createPaymentIntent, confirmPayment } from '../api/client'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK || '')

function PayForm({ invoice, onPaid }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError]   = useState('')

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true); setError('')
    try {
      const { client_secret, payment_intent_id } = await createPaymentIntent(invoice.id)
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      })
      if (result.error) throw new Error(result.error.message)
      await confirmPayment({ payment_intent_id, invoice_id: invoice.id })
      onPaid()
    } catch (err) {
      setError(err.message || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="mt-4 space-y-3">
      <div className="border border-gray-200 rounded-lg p-3">
        <CardElement options={{ style: { base: { fontSize: '14px', color: '#1f2937' } } }} />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit" disabled={paying || !stripe}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl px-4 py-3 text-sm font-semibold"
      >
        {paying ? 'Processing...' : `Pay $${parseFloat(invoice.total).toFixed(2)}`}
      </button>
      <p className="text-xs text-center text-gray-400">Test card: 4242 4242 4242 4242 · Any future date · Any CVV</p>
    </form>
  )
}

export default function InvoiceView() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paid, setPaid]       = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getInvoice(id)
      .then(inv => { setInvoice(inv); if (inv.status === 'paid') setPaid(true) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading invoice...</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Invoice not found.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <span className="text-xl font-bold text-gray-900">
          Work<span className="text-blue-600">Ordr</span>
        </span>
        <span className="ml-3 text-gray-400 text-sm">Invoice</span>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Invoice</h1>
              <p className="text-xs text-gray-400 mt-0.5">#{invoice.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold
              ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {invoice.status === 'paid' ? 'PAID' : 'DUE'}
            </span>
          </div>

          {invoice.customer && (
            <div className="mb-4 text-sm">
              <p className="font-medium text-gray-700">{invoice.customer.name}</p>
              <p className="text-gray-400">{invoice.customer.email}</p>
            </div>
          )}

          {/* Line items */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2">Description</th>
                  <th className="text-center pb-2">Qty</th>
                  <th className="text-right pb-2">Price</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoice.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 text-gray-700">{item.description}</td>
                    <td className="py-2 text-center text-gray-500">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-500">${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">${parseFloat(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-1 text-sm border-t border-gray-100 pt-3">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>${parseFloat(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Tax</span>
              <span>${parseFloat(invoice.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>${parseFloat(invoice.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment */}
          {paid ? (
            <div className="mt-6 bg-green-50 rounded-xl p-4 text-center">
              <p className="text-green-700 font-semibold">Payment received. Thank you!</p>
            </div>
          ) : (
            <Elements stripe={stripePromise}>
              <PayForm invoice={invoice} onPaid={() => { setPaid(true); setInvoice(i => ({ ...i, status: 'paid' })) }} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}
