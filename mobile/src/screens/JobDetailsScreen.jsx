import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native'
import { getJob, updateJobStatus } from '../api/client'

const STATUS_COLORS = {
  pending:     { bg: '#fef9c3', text: '#854d0e' },
  scheduled:   { bg: '#dbeafe', text: '#1e40af' },
  in_progress: { bg: '#f3e8ff', text: '#7e22ce' },
  completed:   { bg: '#dcfce7', text: '#166534' },
  cancelled:   { bg: '#fee2e2', text: '#991b1b' },
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

export default function JobDetailsScreen({ route, navigation }) {
  const { jobId } = route.params
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    getJob(jobId)
      .then(setJob)
      .finally(() => setLoading(false))
  }, [jobId])

  const handleStart = async () => {
    Alert.alert('Start Job', 'Mark this job as In Progress?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          setStarting(true)
          try {
            const updated = await updateJobStatus(jobId, 'in_progress')
            setJob(updated)
            navigation.navigate('JobExecution', { jobId })
          } catch {
            Alert.alert('Error', 'Could not update job status')
          } finally {
            setStarting(false)
          }
        }
      }
    ])
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1d4ed8" />
    </View>
  )

  if (!job) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Job not found</Text>
    </View>
  )

  const colors = STATUS_COLORS[job.status] || STATUS_COLORS.pending

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{job.title}</Text>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {job.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        {job.description && <Text style={styles.desc}>{job.description}</Text>}
      </View>

      {/* Customer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.card}>
          <InfoRow label="Name" value={job.customer?.name} />
          <InfoRow label="Email" value={job.customer?.email} />
          <InfoRow label="Phone" value={job.customer?.phone} />
          <InfoRow label="Address" value={job.customer?.address} />
        </View>
      </View>

      {/* Schedule */}
      {job.schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.card}>
            <InfoRow
              label="Start"
              value={new Date(job.schedule.scheduled_start).toLocaleString()}
            />
            <InfoRow
              label="End"
              value={new Date(job.schedule.scheduled_end).toLocaleString()}
            />
          </View>
        </View>
      )}

      {/* Notes */}
      {job.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}>
            <Text style={styles.notes}>{job.notes}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      {job.status === 'scheduled' && (
        <TouchableOpacity
          style={[styles.btn, styles.btnStart]}
          onPress={handleStart}
          disabled={starting}
        >
          <Text style={styles.btnText}>{starting ? 'Starting...' : 'Start Job'}</Text>
        </TouchableOpacity>
      )}

      {job.status === 'in_progress' && (
        <TouchableOpacity
          style={[styles.btn, styles.btnContinue]}
          onPress={() => navigation.navigate('JobExecution', { jobId })}
        >
          <Text style={styles.btnText}>Continue Job</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#ef4444', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  desc: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  infoLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
  notes: { fontSize: 14, color: '#374151', lineHeight: 20 },
  btn: { marginTop: 24, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnStart: { backgroundColor: '#7c3aed' },
  btnContinue: { backgroundColor: '#2563eb' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
