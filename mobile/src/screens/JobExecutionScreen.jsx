import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { getJob, updateJobStatus } from '../api/client'

export default function JobExecutionScreen({ route, navigation }) {
  const { jobId } = route.params
  const [job, setJob] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    getJob(jobId).then(j => {
      setJob(j)
      setNotes(j.notes || '')
    }).finally(() => setLoading(false))
  }, [jobId])

  const saveNotes = async () => {
    setSaving(true)
    try {
      const updated = await updateJobStatus(jobId, 'in_progress', notes)
      setJob(updated)
      Alert.alert('Saved', 'Notes saved successfully')
    } catch {
      Alert.alert('Error', 'Could not save notes')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = () => {
    Alert.alert(
      'Complete Job',
      'Mark this job as completed and proceed to create invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            setCompleting(true)
            try {
              await updateJobStatus(jobId, 'completed', notes)
              navigation.navigate('CompleteJob', { jobId, jobTitle: job.title, customerName: job.customer?.name })
            } catch {
              Alert.alert('Error', 'Could not complete job')
            } finally {
              setCompleting(false)
            }
          }
        }
      ]
    )
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1d4ed8" />
    </View>
  )

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Job header */}
        <View style={styles.header}>
          <View style={styles.statusDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{job?.title}</Text>
            <Text style={styles.customer}>{job?.customer?.name}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Notes</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={8}
            placeholder="Add notes about the work being done, parts used, observations..."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnSave]}
            onPress={saveNotes}
            disabled={saving}
          >
            <Text style={styles.btnTextSecondary}>{saving ? 'Saving...' : 'Save Notes'}</Text>
          </TouchableOpacity>
        </View>

        {/* Complete */}
        <View style={styles.divider} />
        <View style={styles.completeSection}>
          <Text style={styles.completeHint}>
            When the job is done, tap below to mark it complete and create an invoice.
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnComplete]}
            onPress={handleComplete}
            disabled={completing}
          >
            <Text style={styles.btnTextPrimary}>
              {completing ? 'Completing...' : 'Mark Complete & Invoice'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7c3aed' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  customer: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  notesInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14,
    color: '#111827', borderWidth: 1, borderColor: '#e5e7eb', minHeight: 160, lineHeight: 20,
  },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10 },
  btnSave: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  btnComplete: { backgroundColor: '#16a34a' },
  btnTextSecondary: { color: '#1d4ed8', fontWeight: '700', fontSize: 15 },
  btnTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  completeSection: {},
  completeHint: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 8, lineHeight: 18 },
})
