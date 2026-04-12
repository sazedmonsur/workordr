import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { getJob, addJobNotes, completeJob } from '../api/client'

export default function JobExecutionScreen({ route, navigation }) {
  const { jobId } = route.params
  const [job, setJob]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [showCompleteForm, setShowCompleteForm] = useState(false)

  useEffect(() => {
    getJob(jobId).then(j => {
      setJob(j)
      setNotes(j.notes || '')
    }).finally(() => setLoading(false))
  }, [jobId])

  const handleSaveNotes = async () => {
    if (!notes.trim()) return
    setSaving(true)
    try {
      await addJobNotes(jobId, notes)
      Alert.alert('Saved', 'Notes saved.')
    } catch {
      Alert.alert('Error', 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = () => {
    Alert.alert('Complete Job?', 'Mark this job as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        style: 'destructive',
        onPress: async () => {
          setCompleting(true)
          try {
            await completeJob(jobId, completionNotes || notes)
            navigation.navigate('CompleteJob', { jobId })
          } catch (err) {
            Alert.alert('Error', err.response?.data?.detail || 'Failed to complete job')
          } finally {
            setCompleting(false)
          }
        },
      },
    ])
  }

  if (loading) return (
    <View style={s.centered}><ActivityIndicator color="#3b82f6" size="large" /></View>
  )

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{job?.title}</Text>
          <Text style={s.headerSub}>{job?.customer?.name}</Text>
          {job?.address && <Text style={s.headerSub}>{job.address}</Text>}
        </View>

        {/* Notes section */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Work Notes</Text>
          <TextInput
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you do? Parts used, observations..."
            style={s.notesInput}
          />
          <TouchableOpacity
            style={[s.secondaryBtn, saving && s.btnDisabled]}
            onPress={handleSaveNotes}
            disabled={saving}
          >
            <Text style={s.secondaryBtnText}>{saving ? 'Saving...' : 'Save Notes'}</Text>
          </TouchableOpacity>
        </View>

        {/* Photo placeholder */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Photos</Text>
          <View style={s.photosPlaceholder}>
            <Text style={s.photoIcon}>📷</Text>
            <Text style={s.photoHint}>Photo uploads coming soon</Text>
          </View>
        </View>

        {/* Completion */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Complete Job</Text>
          {showCompleteForm ? (
            <>
              <Text style={s.fieldLabel}>Completion Summary (optional)</Text>
              <TextInput
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="Summary for the customer..."
                style={[s.notesInput, { minHeight: 80 }]}
              />
              <TouchableOpacity
                style={[s.completeBtn, completing && s.btnDisabled]}
                onPress={handleComplete}
                disabled={completing}
              >
                <Text style={s.completeBtnText}>{completing ? 'Completing...' : 'Mark Complete & Create Invoice'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCompleteForm(false)} style={s.cancelLink}>
                <Text style={s.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={s.completeBtn} onPress={() => setShowCompleteForm(true)}>
              <Text style={s.completeBtnText}>Complete Job →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f9fafb' },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:     { backgroundColor: '#1e3a8a', padding: 20, paddingTop: 24 },
  headerTitle:{ fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub:  { fontSize: 13, color: '#93c5fd', marginTop: 2 },
  card:       { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16,
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionLabel:{ fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase',
                 letterSpacing: 0.5, marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  notesInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10,
                fontSize: 13, color: '#111827', minHeight: 140, marginBottom: 10 },
  secondaryBtn:{ borderWidth: 1, borderColor: '#3b82f6', borderRadius: 10, padding: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  completeBtn:{ backgroundColor: '#059669', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled:{ opacity: 0.6 },
  cancelLink: { alignItems: 'center', padding: 10 },
  cancelLinkText: { color: '#9ca3af', fontSize: 13 },
  photosPlaceholder: { borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed', borderRadius: 8,
                       padding: 24, alignItems: 'center' },
  photoIcon:  { fontSize: 32, marginBottom: 6 },
  photoHint:  { color: '#9ca3af', fontSize: 12 },
})
