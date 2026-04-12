import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Customers
export const getCustomers = () => api.get('/customers').then(r => r.data)
export const createCustomer = (data) => api.post('/customers', data).then(r => r.data)

// Technicians
export const getTechnicians = () => api.get('/technicians').then(r => r.data)
export const createTechnician = (data) => api.post('/technicians', data).then(r => r.data)

// Jobs
export const getJobs = (params) => api.get('/jobs', { params }).then(r => r.data)
export const getJob = (id) => api.get(`/jobs/${id}`).then(r => r.data)
export const createJob = (data) => api.post('/jobs', data).then(r => r.data)
export const updateJobStatus = (id, data) => api.patch(`/jobs/${id}/status`, data).then(r => r.data)

// Schedules
export const getSchedules = (params) => api.get('/schedules', { params }).then(r => r.data)
export const createSchedule = (data) => api.post('/schedules', data).then(r => r.data)

// Invoices
export const getInvoices = () => api.get('/invoices').then(r => r.data)
export const getInvoice = (id) => api.get(`/invoices/${id}`).then(r => r.data)
export const createInvoice = (data) => api.post('/invoices', data).then(r => r.data)

// Payments
export const createPaymentIntent = (invoice_id) =>
  api.post('/payments/create-intent', { invoice_id }).then(r => r.data)
export const confirmPayment = (data) =>
  api.post('/payments/confirm', data).then(r => r.data)

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data)
