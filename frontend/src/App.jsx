import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import SuperAdmin from './pages/SuperAdmin'
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

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / customer-facing */}
          <Route path="/login" element={<Login />} />
          <Route path="/superadmin" element={<SuperAdmin />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/book/confirmed" element={<BookingConfirmation />} />
          <Route path="/invoice/:id/pay" element={<InvoiceView />} />

          {/* Protected admin portal */}
          <Route element={<RequireAuth />}>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
