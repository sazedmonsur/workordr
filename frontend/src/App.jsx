import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Jobs from './pages/Jobs'
import DispatchBoard from './pages/DispatchBoard'
import Invoices from './pages/Invoices'
import Technicians from './pages/Technicians'
import Services from './pages/Services'
import NotificationsLog from './pages/NotificationsLog'
import BookingPage from './pages/BookingPage'
import BookingConfirmation from './pages/BookingConfirmation'
import InvoiceView from './pages/InvoiceView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public / customer-facing (no admin sidebar) */}
        <Route path="/book" element={<BookingPage />} />
        <Route path="/book/confirmed" element={<BookingConfirmation />} />
        <Route path="/invoice/:id/pay" element={<InvoiceView />} />

        {/* Admin portal */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="dispatch" element={<DispatchBoard />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="technicians" element={<Technicians />} />
          <Route path="services" element={<Services />} />
          <Route path="notifications" element={<NotificationsLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
