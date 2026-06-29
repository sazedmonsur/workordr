import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { getDispatchJobs, getTechnicians, createSchedule, updateJobStatus } from '../api/client'
import StatusBadge from '../components/StatusBadge'

const STATUS_COLORS = {
  requested:   'border-l-gray-400 bg-gray-50',
  pending:     'border-l-gray-400 bg-gray-50',
  scheduled:   'border-l-blue-400 bg-blue-50',
  assigned:    'border-l-blue-500 bg-blue-50',
  en_route:    'border-l-orange-400 bg-orange-50',
  in_progress: 'border-l-yellow-400 bg-yellow-50',
  completed:   'border-l-green-400 bg-green-50',
  invoiced:    'border-l-purple-400 bg-purple-50',
  cancelled:   'border-l-red-300 bg-red-50',
}

function fmt(dt) {
  if (!dt) return '—'
  // API returns UTC without Z — append it so the browser converts to local time correctly
  const utc = dt.endsWith('Z') || dt.includes('+') ? dt : dt + 'Z'
  return new Date(utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toLocalDate(d) {
  // Return actual LOCAL date (not UTC), formatted as YYYY-MM-DD
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Convert local datetime string to UTC ISO string
function localToUTC(localDtStr) {
  if (!localDtStr) return ''
  const dt = new Date(localDtStr)
  return dt.toISOString()
}

// Convert UTC ISO string to local datetime string for input
function utcToLocalInput(utcStr) {
  if (!utcStr) return ''
  const utc = utcStr.endsWith('Z') || utcStr.includes('+') ? utcStr : utcStr + 'Z'
  const dt = new Date(utc)
  const year = dt.getFullYear()
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  const hours = String(dt.getHours()).padStart(2, '0')
  const mins = String(dt.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${mins}`
}

// ── Job card ──────────────────────────────────────────────────────────────
function JobCard({ job, index, onUnassign, onSchedule }) {
  const color = STATUS_COLORS[job.status] || 'border-l-gray-300 bg-white'
  const needsSchedule = onSchedule && ['pending', 'requested'].includes(job.status)
  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`border-l-4 rounded-lg p-3 mb-2 shadow-sm cursor-grab select-none transition-shadow
            ${color}
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300 rotate-1' : ''}
          `}
        >
          <div className="flex justify-between items-start mb-1">
            <p className="text-sm font-semibold text-gray-800 leading-tight">{job.title}</p>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-xs text-gray-500 mb-1">{job.customer?.name}</p>
          {job.service && (
            <p className="text-xs text-blue-600 mb-1">{job.service.name}</p>
          )}
          {job.scheduled_at && (
            <p className="text-xs text-gray-400">
              {fmt(job.scheduled_at)} — {fmt(job.scheduled_end_at)}
            </p>
          )}
          {job.address && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{job.address}</p>
          )}
          <div className="flex gap-2 mt-1.5">
            {needsSchedule && (
              <button
                onClick={(e) => { e.stopPropagation(); onSchedule(job) }}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                + Schedule
              </button>
            )}
            {onUnassign && job.technician_id && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnassign(job) }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Unassign
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}

// ── Tech column ───────────────────────────────────────────────────────────
function TechColumn({ tech, jobs, onUnassign, onSchedule }) {
  const activeCount = jobs.filter(j => ['assigned', 'en_route', 'in_progress'].includes(j.status)).length
  return (
    <div className="flex-shrink-0 w-64">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
          {tech.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{tech.name}</p>
          <p className="text-xs text-gray-400">
            {tech.skill_level} · {tech.working_hours_start}–{tech.working_hours_end}
          </p>
        </div>
        <span className="ml-auto text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 flex-shrink-0">
          {activeCount}
        </span>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={tech.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-40 rounded-xl p-2 transition-colors border-2 border-dashed
              ${snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}
            `}
          >
            {jobs.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-xs text-gray-300 text-center pt-6">Drop job here</p>
            )}
            {jobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} onUnassign={onUnassign}
                onSchedule={onSchedule ? (job) => onSchedule(job, tech.id) : null} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DispatchBoard() {
  const [date, setDate] = useState(toLocalDate(new Date()))
  const [jobs, setJobs] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Schedule modal state
  const [modal, setModal] = useState(null) // { jobId, destTechId }
  const [scheduleForm, setScheduleForm] = useState({ scheduled_start: '', scheduled_end: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveWarning, setSaveWarning] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([getDispatchJobs(date), getTechnicians()])
      .then(([j, t]) => { setJobs(j); setTechnicians(t) })
      .catch(() => setError('Failed to load dispatch data'))
      .finally(() => setLoading(false))
  }, [date])

  useEffect(() => { load() }, [load])

  // Partition jobs: unassigned (no tech) vs per-tech
  const unassigned = jobs.filter(j => !j.technician_id)
  const byTech = (techId) => jobs.filter(j => j.technician_id === techId)

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    const srcId = source.droppableId
    const destId = destination.droppableId
    if (srcId === destId) return

    const job = jobs.find(j => j.id === draggableId)
    if (!job) return

    if (destId === 'unassigned') {
      // Remove assignment — update status back to pending
      updateJobStatus(draggableId, { status: 'pending', changed_by: 'admin' })
        .then(load)
        .catch(() => {})
      return
    }

    // Dropping on a tech column → open schedule modal with local times
    const datePrefix = date + 'T'
    const localStart = datePrefix + '09:00'
    const localEnd = datePrefix + '10:00'
    setScheduleForm({
      scheduled_start: localStart,
      scheduled_end: localEnd,
    })
    setSaveError('')
    setModal({ jobId: draggableId, destTechId: destId })
  }

  const handleScheduleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveWarning('')
    try {
      const result = await createSchedule({
        job_id: modal.jobId,
        technician_id: modal.destTechId,
        scheduled_start: localToUTC(scheduleForm.scheduled_start),
        scheduled_end: localToUTC(scheduleForm.scheduled_end),
      })
      if (result.warning) {
        setSaveWarning(result.warning)
      }
      setModal(null)
      load()
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleScheduleFromCard = (job, techId) => {
    const datePrefix = date + 'T'
    setScheduleForm({
      scheduled_start: datePrefix + '09:00',
      scheduled_end:   datePrefix + '10:00',
    })
    setSaveError('')
    setModal({ jobId: job.id, destTechId: techId })
  }

  const handleUnassign = (job) => {
    if (!window.confirm(`Remove ${job.technician?.name || 'technician'} from "${job.title}"?`)) return
    updateJobStatus(job.id, { status: 'pending', changed_by: 'admin' })
      .then(load)
      .catch(() => {})
  }

  const pendingJob = modal ? jobs.find(j => j.id === modal.jobId) : null
  const destTech = modal ? technicians.find(t => t.id === modal.destTechId) : null

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
          <p className="text-sm text-gray-400 mt-0.5">Drag jobs to assign. Drag to Unassigned to remove.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDate(toLocalDate(new Date()))}
            className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-2"
          >
            Today
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-5 overflow-x-auto pb-4 flex-1 items-start">
            {/* Unassigned queue */}
            <div className="flex-shrink-0 w-64">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm">
                  ?
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Unassigned Queue</p>
                  <p className="text-xs text-gray-400">{unassigned.length} job{unassigned.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Droppable droppableId="unassigned">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-40 rounded-xl p-2 border-2 border-dashed transition-colors
                      ${snapshot.isDraggingOver ? 'border-gray-400 bg-gray-100' : 'border-gray-200 bg-white'}
                    `}
                  >
                    {unassigned.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-xs text-gray-300 text-center pt-6">All jobs assigned</p>
                    )}
                    {unassigned.map((job, i) => (
                      <JobCard key={job.id} job={job} index={i} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Divider */}
            <div className="flex-shrink-0 w-px bg-gray-200 self-stretch mt-11" />

            {/* Technician columns */}
            {technicians.length === 0 ? (
              <p className="text-gray-400 text-sm pt-12">No active technicians. Add technicians first.</p>
            ) : (
              technicians.map(tech => (
                <TechColumn
                  key={tech.id}
                  tech={tech}
                  jobs={byTech(tech.id)}
                  onUnassign={handleUnassign}
                  onSchedule={handleScheduleFromCard}
                />
              ))
            )}
          </div>
        </DragDropContext>
      )}

      {/* Schedule modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="font-semibold text-gray-800 mb-1">Schedule Job</h2>
            {pendingJob && (
              <p className="text-sm text-gray-500 mb-1">
                <span className="font-medium text-gray-700">{pendingJob.title}</span> → {destTech?.name}
              </p>
            )}
            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{saveError}</p>
            )}
            {saveWarning && (
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded mb-3">{saveWarning}</p>
            )}
            <form onSubmit={handleScheduleSave} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start *</label>
                <input
                  required type="datetime-local"
                  value={scheduleForm.scheduled_start}
                  onChange={e => setScheduleForm(f => ({ ...f, scheduled_start: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End *</label>
                <input
                  required type="datetime-local"
                  value={scheduleForm.scheduled_end}
                  onChange={e => setScheduleForm(f => ({ ...f, scheduled_end: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  {saving ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => { setModal(null); setSaveError('') }}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
