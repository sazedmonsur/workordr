import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, Image,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { getJob, addJobNotes, completeJob, addJobPhoto, getJobPhotos } from '../api/client'

export default function JobExecutionScreen({ route, navigation }) {
  const { jobId } = route.params
  const [job, setJob]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [photos, setPhotos]   = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const loadPhotos = useCallback(() => {
    getJobPhotos(jobId).then(setPhotos).catch(() => {})
  }, [jobId])

  useEffect(() => {
    getJob(jobId).then(j => {
      setJob(j)
      setNotes(j.notes || '')
    }).finally(() => setLoading(false))
    loadPhotos()
  }, [jobId, loadPhotos])

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to attach photos.')
      return
    }
    Alert.alert('Add Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const cam = await ImagePicker.requestCameraPermissionsAsync()
          if (cam.status !== 'granted') return
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.6,
            base64: true,
          })
          if (!result.canceled && result.assets?.[0]?.base64) {
            await uploadPhoto(result.assets[0])
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.6,
            base64: true,
          })
          if (!result.canceled && result.assets?.[0]?.base64) {
            await uploadPhoto(result.assets[0])
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const uploadPhoto = async (asset) => {
    setUploadingPhoto(true)
    try {
      const ext = asset.uri.split('.').pop() || 'jpg'
      await addJobPhoto(jobId, {
        job_id: jobId,
        technician_id: job?.technician_id || null,
        caption: null,
        data: `data:image/${ext};base64,${asset.base64}`,
      })
      loadPhotos()
    } catch {
      Alert.alert('Error', 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

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

        {/* Photos */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Photos ({photos.length})</Text>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoStrip}>
              {photos.map(p => (
                <Image key={p.id} source={{ uri: p.data }} style={s.photoThumb} />
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={[s.secondaryBtn, uploadingPhoto && s.btnDisabled]}
            onPress={handleAddPhoto}
            disabled={uploadingPhoto}
          >
            <Text style={s.secondaryBtnText}>
              {uploadingPhoto ? 'Uploading...' : '📷  Add Photo'}
            </Text>
          </TouchableOpacity>
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
  photoStrip: { marginBottom: 10 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
})
