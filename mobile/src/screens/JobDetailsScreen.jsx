import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { getJob, updateJobStatus } from '../api/client'

const STATUS_COLOR = {
  assigned:    '#dbeafe', en_route: '#fed7aa', in_progress: '#fef9c3',
  completed:   '#dcfce7', invoiced: '#f3e8ff', paid: '#dcfce7',
  cancelled:   '#fee2e2', scheduled: '#dbeafe', pending: '#f3f4f6',
}

// What button to show for each current status (assigned gets its own accept/reject UI)
const NEXT_ACTION = {
  scheduled:   { label: 'Start Driving', nextStatus: 'en_route' },
  en_route:    { label: 'Arrived — Start Job', nextStatus: 'in_progress' },
  in_progress: { label: 'Continue Working', nextStatus: null, action: 'continue' },
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

export default function JobDetailsScreen({ route, navigation }) {
  const { jobId } = route.params
  const [job, setJob]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getJob(jobId).then(setJob).finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => { load() }, [load])

  const handleAction = async (nextStatus) => {
    if (nextStatus === null) {
      navigation.navigate('JobExecution', { jobId: job.id })
      return
    }
    const confirmMsg = nextStatus === 'en_route'
      ? 'Mark yourself as heading to this job?'
      : 'Mark yourself as arrived and starting work?'
    Alert.alert('Confirm', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setActing(true)
          try {
            await updateJobStatus(jobId, nextStatus)
            load()
          } catch {
            Alert.alert('Error', 'Status update failed')
          } finally {
            setActing(false)
          }
        },
      },
    ])
  }

  const handleAccept = () => {
    Alert.alert('Accept Job', 'Accept this job assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setActing(true)
          try {
            await updateJobStatus(jobId, 'scheduled')
            load()
          } catch {
            Alert.alert('Error', 'Could not accept job')
          } finally {
            setActing(false)
          }
        },
      },
    ])
  }

  const handleReject = () => {
    Alert.alert('Reject Job', 'Reject this job? It will return to the unassigned queue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActing(true)
          try {
            await updateJobStatus(jobId, 'pending')
            navigation.goBack()
          } catch {
            Alert.alert('Error', 'Could not reject job')
          } finally {
            setActing(false)
          }
        },
      },
    ])
  }

  const fmtDt = (dt) => {
    if (!dt) return null
    const utc = dt.endsWith('Z') || dt.includes('+') ? dt : dt + 'Z'
    return new Date(utc).toLocaleString([], {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) return (
    <View style={s.centered}><ActivityIndicator color="#3b82f6" size="large" /></View>
  )
  if (!job) return (
    <View style={s.centered}><Text style={s.errorText}>Job not found</Text></View>
  )

  const statusBg = STATUS_COLOR[job.status] || '#f3f4f6'
  const action = NEXT_ACTION[job.status]

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {/* Status banner */}
      <View style={[s.banner, { backgroundColor: statusBg }]}>
        <Text style={s.bannerStatus}>{job.status.replace(/_/g, ' ').toUpperCase()}</Text>
        <Text style={s.bannerTitle}>{job.title}</Text>
      </View>

      {/* Details */}
      <View style={s.section}>
        <Row label="Customer"    value={job.customer?.name} />
        <Row label="Service"     value={job.service?.name} />
        <Row label="Address"     value={job.address || job.customer?.address} />
        <Row label="Scheduled"   value={fmtDt(job.scheduled_at)} />
        {job.scheduled_end_at && <Row label="Est. End" value={fmtDt(job.scheduled_end_at)} />}
        <Row label="Description" value={job.description} />
        {job.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{job.notes}</Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={s.actions}>
        {/* Accept / Reject — shown only when newly assigned */}
        {job.status === 'assigned' && (
          <View style={s.acceptRejectBox}>
            <Text style={s.assignedLabel}>You have been assigned this job</Text>
            <View style={s.acceptRejectRow}>
              <TouchableOpacity
                style={[s.acceptBtn, acting && s.btnDisabled]}
                onPress={handleAccept}
                disabled={acting}
              >
                <Text style={s.acceptBtnText}>{acting ? '...' : 'Accept'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.rejectBtn, acting && s.btnDisabled]}
                onPress={handleReject}
                disabled={acting}
              >
                <Text style={s.rejectBtnText}>{acting ? '...' : 'Reject'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {action && (
          <TouchableOpacity
            style={[s.primaryBtn, acting && s.btnDisabled]}
            onPress={() => handleAction(action.nextStatus)}
            disabled={acting}
          >
            <Text style={s.primaryBtnText}>
              {acting ? 'Updating...' : action.label}
            </Text>
          </TouchableOpacity>
        )}

        {job.status === 'in_progress' && (
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => navigation.navigate('JobExecution', { jobId: job.id })}
          >
            <Text style={s.primaryBtnText}>Add Notes / Complete Job</Text>
          </TouchableOpacity>
        )}

        {['completed', 'invoiced', 'paid'].includes(job.status) && (
          <View style={s.doneBox}>
            <Text style={s.doneText}>
              {job.status === 'paid' ? 'Paid' : job.status === 'invoiced' ? 'Invoice Sent' : 'Job Completed'}
            </Text>
          </View>
        )}

        {/* Quote button — available any time a job is active */}
        {!['completed', 'invoiced', 'paid', 'cancelled'].includes(job.status) && (
          <TouchableOpacity
            style={s.quoteBtn}
            onPress={() => navigation.navigate('Quote', {
              jobId: job.id,
              jobTitle: job.title,
              technicianId: job.technician_id,
            })}
          >
            <Text style={s.quoteBtnText}>Create Quote</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#ef4444' },
  banner:    { padding: 20, paddingTop: 24 },
  bannerStatus: { fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 1, marginBottom: 4 },
  bannerTitle:  { fontSize: 20, fontWeight: '700', color: '#111827' },
  section:   { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16,
               shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
               borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel:  { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  rowValue:  { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
  notesBox:  { marginTop: 8, padding: 10, backgroundColor: '#f9fafb', borderRadius: 8 },
  notesLabel:{ fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#374151' },
  actions:   { padding: 16, gap: 10 },
  primaryBtn:{ backgroundColor: '#3b82f6', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnDisabled:{ opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneBox:   { backgroundColor: '#dcfce7', borderRadius: 12, padding: 15, alignItems: 'center' },
  doneText:  { color: '#15803d', fontWeight: '700', fontSize: 15 },
  acceptRejectBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  assignedLabel:   { fontSize: 13, color: '#1d4ed8', fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  acceptRejectRow: { flexDirection: 'row', gap: 10 },
  acceptBtn:  { flex: 1, backgroundColor: '#16a34a', borderRadius: 10, padding: 14, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rejectBtn:  { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
  rejectBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  quoteBtn:   { borderWidth: 1.5, borderColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center' },
  quoteBtnText: { color: '#7c3aed', fontWeight: '700', fontSize: 15 },
})
