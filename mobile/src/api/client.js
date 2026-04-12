import axios from 'axios'

// Change this to your machine's local IP when testing on physical device
// e.g. 'http://192.168.1.100:8000'
const BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

export const getJobsByTechnician = (technicianId) =>
  api.get('/jobs', { params: { technician_id: technicianId } }).then(r => r.data)

export const getJob = (id) =>
  api.get(`/jobs/${id}`).then(r => r.data)

export const updateJobStatus = (id, status, notes) =>
  api.patch(`/jobs/${id}/status`, { status, notes }).then(r => r.data)

export const createInvoice = (data) =>
  api.post('/invoices', data).then(r => r.data)

export const getTechnicians = () =>
  api.get('/technicians').then(r => r.data)
