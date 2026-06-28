import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = 'https://backend-production-21cd.up.railway.app'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Attach JWT token to every request
api.interceptors.request.use(async config => {
  try {
    const token = await SecureStore.getItemAsync('workordr_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

// Auth
export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data)

// Technicians
export const getTechnician = (id) => api.get(`/technicians/${id}`).then(r => r.data)

// Jobs
export const getJobs = (params) => api.get('/jobs', { params }).then(r => r.data)
export const getJob  = (id) => api.get(`/jobs/${id}`).then(r => r.data)
export const updateJobStatus = (id, status, notes, changedBy = 'technician') =>
  api.patch(`/jobs/${id}/status`, { status, notes, changed_by: changedBy }).then(r => r.data)
export const addJobNotes = (id, notes) => api.post(`/jobs/${id}/notes`, { notes }).then(r => r.data)
export const completeJob = (id, notes) => api.post(`/jobs/${id}/complete`, { notes }).then(r => r.data)

// Invoices
export const createInvoice = (data) => api.post('/invoices', data).then(r => r.data)

// Availability
export const getTechAvailability     = (techId) => api.get(`/availability/${techId}`).then(r => r.data)
export const addAvailabilityBlock    = (techId, data) => api.post(`/availability/${techId}`, data).then(r => r.data)
export const deleteAvailabilityBlock = (slotId) => api.delete(`/availability/slot/${slotId}`).then(r => r.data)
