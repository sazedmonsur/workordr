import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Platform, ScrollView,
} from 'react-native'
import { getTechAvailability, addAvailabilityBlock, deleteAvailabilityBlock } from '../api/client'
import { useAuth } from '../context/AuthContext'

const SLOT_TYPE_STYLE = {
  blocked:  { bg: '#fee2e2', text: '#b91c1c', label: 'Blocked' },
  time_off: { bg: '#fef9c3', text: '#a16207', label: 'Time Off' },
}

function fmtDt(dt) {
  return new Date(dt).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AvailabilityScreen() {
  const { user, logout } = useAuth()
  const technician_id = user?.technician_id
  const [slots, setSlots]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]     = useState(false)

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const [form, setForm] = useState({
    slot_type: 'blocked',
    start_time: tomorrow.toISOString().slice(0, 16),
    end_time: '',
    notes: '',
  })

  const load = () => {
    if (!technician_id) return
    setLoading(true)
    getTechAvailability(technician_id)
      .then(setSlots)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [technician_id])

  const handleAdd = async () => {
    if (!form.start_time || !form.end_time) {
      Alert.alert('Missing fields', 'Please fill in start and end time.')
      return
    }
    setSaving(true)
    try {
      await addAvailabilityBlock(technician_id, {
        slot_type: form.slot_type,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        notes: form.notes || undefined,
      })
      setShowModal(false)
      load()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to add block')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (slot) => {
    Alert.alert('Remove Block', 'Remove this availability block?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await deleteAvailabilityBlock(slot.id)
            load()
          } catch { Alert.alert('Error', 'Failed to remove') }
        },
      },
    ])
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>My Availability</Text>
          <Text style={s.headerSub}>Block time off or unavailability</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
            <Text style={s.addBtnText}>+ Block</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Text style={s.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={slots}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const style = SLOT_TYPE_STYLE[item.slot_type] || SLOT_TYPE_STYLE.blocked
            return (
              <View style={s.card}>
                <View style={[s.typeBadge, { backgroundColor: style.bg }]}>
                  <Text style={[s.typeText, { color: style.text }]}>{style.label}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.slotTime}>{fmtDt(item.start_time)} – {fmtDt(item.end_time)}</Text>
                  {item.notes && <Text style={s.slotNotes}>{item.notes}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)} style={s.deleteBtn}>
                  <Text style={s.deleteText}>×</Text>
                </TouchableOpacity>
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No blocks set. You're fully available during working hours.</Text>
            </View>
          }
        />
      )}

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Block Time</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={s.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Type</Text>
            <View style={s.typeRow}>
              {[['blocked', 'Blocked'], ['time_off', 'Time Off']].map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[s.typeOption, form.slot_type === val && s.typeOptionActive]}
                  onPress={() => setForm(f => ({ ...f, slot_type: val }))}
                >
                  <Text style={[s.typeOptionText, form.slot_type === val && s.typeOptionTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Start Date & Time</Text>
            <TextInput
              value={form.start_time}
              onChangeText={v => setForm(f => ({ ...f, start_time: v }))}
              style={s.input}
              placeholder="YYYY-MM-DDTHH:MM (e.g. 2026-04-15T09:00)"
              autoCapitalize="none"
            />
            <Text style={s.hint}>Tip: Use format YYYY-MM-DDTHH:MM</Text>
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>End Date & Time</Text>
            <TextInput
              value={form.end_time}
              onChangeText={v => setForm(f => ({ ...f, end_time: v }))}
              style={s.input}
              placeholder="YYYY-MM-DDTHH:MM (e.g. 2026-04-15T17:00)"
              autoCapitalize="none"
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Notes (optional)</Text>
            <TextInput
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              style={s.input}
              placeholder="e.g. Team meeting"
            />
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Add Block'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f9fafb' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle:{ fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub:  { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  addBtn:     { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10,
                padding: 12, marginBottom: 8, gap: 10,
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText:   { fontSize: 11, fontWeight: '700' },
  slotTime:   { fontSize: 13, color: '#111827', fontWeight: '500' },
  slotNotes:  { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  deleteBtn:  { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fee2e2',
                alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#ef4444', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyText:  { color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  modal:      { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { color: '#3b82f6', fontSize: 15 },
  formGroup:  { marginBottom: 16 },
  formLabel:  { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  input:      { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10,
                fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  hint:       { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  typeRow:    { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
                padding: 10, alignItems: 'center', backgroundColor: '#fff' },
  typeOptionActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  typeOptionText:   { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  typeOptionTextActive: { color: '#3b82f6', fontWeight: '700' },
  saveBtn:     { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn:   { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  logoutBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
})
