import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { createInvoice, getJob } from '../api/client'

const EMPTY_ITEM = () => ({ description: '', quantity: '1', unit_price: '' })

export default function CompleteJobScreen({ route, navigation }) {
  const { jobId } = route.params
  const [job, setJob] = useState(null)
  const [items, setItems] = useState([EMPTY_ITEM()])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { getJob(jobId).then(setJob) }, [jobId])

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const addItem = () => {
    if (items.length >= 5) return
    setItems(prev => [...prev, EMPTY_ITEM()])
  }

  const removeItem = (index) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return sum + qty * price
  }, 0)

  const handleSubmit = async () => {
    const valid = items.every(i => i.description.trim() && parseFloat(i.unit_price) > 0)
    if (!valid) {
      Alert.alert('Validation', 'All items need a description and a price.')
      return
    }

    setSubmitting(true)
    try {
      await createInvoice({
        job_id: jobId,
        tax: 0,
        items: items.map(i => ({
          description: i.description.trim(),
          quantity: parseInt(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price),
        })),
      })
      setDone(true)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create invoice'
      Alert.alert('Error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Invoice Created!</Text>
        <Text style={styles.successSub}>
          Invoice has been sent to the office. The customer will be billed from the web app.
        </Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.doneBtnText}>Back to Job List</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Job summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{job?.title ?? '—'}</Text>
          <Text style={styles.summaryCustomer}>{job?.customer?.name ?? '—'}</Text>
          <View style={[styles.badge]}>
            <Text style={styles.badgeText}>Completed</Text>
          </View>
        </View>

        {/* Line items */}
        <Text style={styles.sectionTitle}>Invoice Line Items</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNum}>Item {index + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Description (e.g. Labor - 2 hours)"
              placeholderTextColor="#9ca3af"
              value={item.description}
              onChangeText={v => updateItem(index, 'description', v)}
            />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={item.quantity}
                  onChangeText={v => updateItem(index, 'quantity', v)}
                  placeholder="1"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.inputLabel}>Unit Price ($)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={item.unit_price}
                  onChangeText={v => updateItem(index, 'unit_price', v)}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
            <Text style={styles.itemTotal}>
              Item total: ${((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
            </Text>
          </View>
        ))}

        {items.length < 5 && (
          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Text style={styles.addItemText}>+ Add Item</Text>
          </TouchableOpacity>
        )}

        {/* Subtotal */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>$0.00</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>${subtotal.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Creating Invoice...' : 'Create Invoice'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 48 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  summaryTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  summaryCustomer: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  itemCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemNum: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  removeText: { fontSize: 12, color: '#ef4444' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10,
    fontSize: 14, color: '#111827', marginBottom: 8, backgroundColor: '#f9fafb',
  },
  inputLabel: { fontSize: 11, color: '#6b7280', marginBottom: 3, fontWeight: '500' },
  row: { flexDirection: 'row' },
  itemTotal: { fontSize: 12, color: '#2563eb', fontWeight: '600', textAlign: 'right' },
  addItemBtn: {
    borderWidth: 1, borderColor: '#bfdbfe', borderStyle: 'dashed', borderRadius: 10,
    padding: 12, alignItems: 'center', marginBottom: 16,
  },
  addItemText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  totalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  grandTotal: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 10 },
  grandLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  grandValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  submitBtn: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f8fafc' },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  doneBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
