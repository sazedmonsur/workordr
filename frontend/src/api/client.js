import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('workordr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear token and redirect to login
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('workordr_token')
      localStorage.removeItem('workordr_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ───────────────────────────────────────────────────────────────────
export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data)

// ── Customers ──────────────────────────────────────────────────────────────
export const getCustomers   = () => api.get('/customers').then(r => r.data)
export const createCustomer = (data) => api.post('/customers', data).then(r => r.data)

// ── Technicians ────────────────────────────────────────────────────────────
export const getTechnicians = (includeInactive = false) =>
  api.get('/technicians', { params: { include_inactive: includeInactive } }).then(r => r.data)
export const getTechnician  = (id) => api.get(`/technicians/${id}`).then(r => r.data)
export const createTechnician = (data) => api.post('/technicians', data).then(r => r.data)
export const updateTechnician = (id, data) => api.put(`/technicians/${id}`, data).then(r => r.data)
export const assignServiceToTech = (techId, serviceId) =>
  api.post(`/technicians/${techId}/services/${serviceId}`).then(r => r.data)
export const removeServiceFromTech = (techId, serviceId) =>
  api.delete(`/technicians/${techId}/services/${serviceId}`).then(r => r.data)
export const createTechnicianLogin = (techId, email, password) =>
  api.post(`/technicians/${techId}/create-login`, { email, password }).then(r => r.data)

// ── Services ───────────────────────────────────────────────────────────────
export const getServices   = (activeOnly = true) =>
  api.get('/services', { params: { active_only: activeOnly } }).then(r => r.data)
export const createService = (data) => api.post('/services', data).then(r => r.data)
export const updateService = (id, data) => api.put(`/services/${id}`, data).then(r => r.data)

// ── Jobs ───────────────────────────────────────────────────────────────────
export const getJobs        = (params) => api.get('/jobs', { params }).then(r => r.data)
export const getJob         = (id) => api.get(`/jobs/${id}`).then(r => r.data)
export const createJob      = (data) => api.post('/jobs', data).then(r => r.data)
export const updateJob      = (id, data) => api.put(`/jobs/${id}`, data).then(r => r.data)
export const updateJobStatus = (id, data) => api.patch(`/jobs/${id}/status`, data).then(r => r.data)
export const deleteJob      = (id) => api.delete(`/jobs/${id}`).then(r => r.data)
export const completeJob    = (id, data) => api.post(`/jobs/${id}/complete`, data).then(r => r.data)
export const addJobNotes    = (id, notes) => api.post(`/jobs/${id}/notes`, { notes }).then(r => r.data)
export const getJobHistory  = (id) => api.get(`/jobs/${id}/history`).then(r => r.data)
export const getDispatchJobs = (date) => api.get('/jobs/admin/dispatch', { params: { date } }).then(r => r.data)

// ── Schedules ──────────────────────────────────────────────────────────────
export const getSchedules  = (params) => api.get('/schedules', { params }).then(r => r.data)
export const createSchedule = (data) => api.post('/schedules', data).then(r => r.data)

// ── Availability ───────────────────────────────────────────────────────────
export const searchAvailability  = (date, duration = 60) =>
  api.get('/availability/search', { params: { date, duration } }).then(r => r.data)
export const getTechAvailability = (techId) => api.get(`/availability/${techId}`).then(r => r.data)
export const addAvailabilityBlock = (techId, data) =>
  api.post(`/availability/${techId}`, data).then(r => r.data)
export const deleteAvailabilityBlock = (slotId) =>
  api.delete(`/availability/slot/${slotId}`).then(r => r.data)

// ── Bookings ───────────────────────────────────────────────────────────────
export const createBooking = (data) => api.post('/bookings', data).then(r => r.data)

// ── Invoices ───────────────────────────────────────────────────────────────
export const getInvoices   = () => api.get('/invoices').then(r => r.data)
export const getInvoice    = (id) => api.get(`/invoices/${id}`).then(r => r.data)
export const createInvoice = (data) => api.post('/invoices', data).then(r => r.data)
export const markInvoicePaid = (id, method) =>
  api.patch(`/invoices/${id}/mark-paid`, { method }).then(r => r.data)

// ── Payments ───────────────────────────────────────────────────────────────
export const createPaymentIntent = (invoice_id) =>
  api.post('/payments/create-intent', { invoice_id }).then(r => r.data)
export const confirmPayment = (data) =>
  api.post('/payments/confirm', data).then(r => r.data)

// ── Analytics ──────────────────────────────────────────────────────────────
export const getDashboardStats    = () => api.get('/dashboard/stats').then(r => r.data)
export const getAnalyticsOverview = () => api.get('/admin/analytics/overview').then(r => r.data)

// ── Notifications ──────────────────────────────────────────────────────────
export const getNotifications = (params) =>
  api.get('/admin/notifications', { params }).then(r => r.data)
