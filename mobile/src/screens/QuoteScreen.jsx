import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { createQuote } from '../api/client'

const emptyItem = () => ({ key: Math.random().toString(), description: '', quantity: '1', unit_price: '' })

export default function QuoteScreen({ route, navigation }) {
  const { jobId, jobTitle, technicianId } = route.params

  const [items, setItems]   = useState([emptyItem()])
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)

  const updateItem = (key, field, value) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i))
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()])

  const removeItem = (key) => {
    if (items.length === 1) return
    setItems(prev => prev.filter(i => i.key !== key))
  }

  const subtotal = items.reduce((sum, i) => {
    const qty   = parseFloat(i.quantity) || 0
    const price = parseFloat(i.unit_price) || 0
    return sum + qty * price
  }, 0)

  const handleSubmit = async () => {
    const valid = items.filter(i => i.description.trim() && parseFloat(i.unit_price) > 0)
    if (!valid.length) {
      Alert.alert('Missing info', 'Add at least one line item with a description and price.')
      return
    }
    setSaving(true)
    try {
      await createQuote({
        job_id: jobId,
        technician_id: technicianId || null,
        notes: notes.trim() || null,
        items: valid.map(i => ({
          description: i.description.trim(),
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price),
        })),
      })
      Alert.alert('Quote Submitted', 'Your quote has been sent to the admin for review.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit quote')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Create Quote</Text>
          <Text style={s.headerSub}>{jobTitle}</Text>
        </View>

        {/* Line items */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Line Items</Text>

          {items.map((item, idx) => (
            <View key={item.key} style={s.lineItem}>
              <View style={s.lineItemHeader}>
                <Text style={s.lineItemNum}>Item {idx + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(item.key)}>
                    <Text style={s.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={s.input}
                placeholder="Description (e.g. Labor - 2hrs, Materials)"
                value={item.description}
                onChangeText={v => updateItem(item.key, 'description', v)}
              />
              <View style={s.row}>
                <View style={s.halfField}>
                  <Text style={s.fieldLabel}>Qty</Text>
                  <TextInput
                    style={s.input}
                    placeholder="1"
                    keyboardType="decimal-pad"
                    value={item.quantity}
                    onChangeText={v => updateItem(item.key, 'quantity', v)}
                  />
                </View>
                <View style={[s.halfField, { marginLeft: 8 }]}>
                  <Text style={s.fieldLabel}>Unit Price ($)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={item.unit_price}
                    onChangeText={v => updateItem(item.key, 'unit_price', v)}
                  />
                </View>
              </View>
              {item.description && item.unit_price ? (
                <Text style={s.itemTotal}>
                  Subtotal: ${((parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                </Text>
              ) : null}
            </View>
          ))}

          <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
            <Text style={s.addItemText}>+ Add Line Item</Text>
          </TouchableOpacity>
        </View>

        {/* Total */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Total Estimate</Text>
          <Text style={s.totalAmount}>${subtotal.toFixed(2)}</Text>
        </View>

        {/* Notes */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Notes (optional)</Text>
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            multiline
            placeholder="Any additional notes or conditions for this quote..."
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit */}
        <View style={{ paddingHorizontal: 12 }}>
          <TouchableOpacity
            style={[s.submitBtn, saving && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnText}>Submit Quote to Admin</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelLink} onPress={() => navigation.goBack()}>
            <Text style={s.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  header:      { backgroundColor: '#1e3a8a', padding: 20, paddingTop: 24 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: '#93c5fd', marginTop: 2 },
  card:        { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16,
                 shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionLabel:{ fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase',
                 letterSpacing: 0.5, marginBottom: 12 },
  lineItem:    { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 10 },
  lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineItemNum: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  removeText:  { fontSize: 12, color: '#ef4444' },
  input:       { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10,
                 fontSize: 14, color: '#111827', marginBottom: 8 },
  row:         { flexDirection: 'row' },
  halfField:   { flex: 1 },
  fieldLabel:  { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  itemTotal:   { fontSize: 12, color: '#059669', fontWeight: '600', textAlign: 'right' },
  addItemBtn:  { borderWidth: 1, borderColor: '#3b82f6', borderStyle: 'dashed', borderRadius: 8,
                 padding: 12, alignItems: 'center', marginTop: 4 },
  addItemText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  totalCard:   { backgroundColor: '#1e3a8a', marginHorizontal: 12, borderRadius: 12,
                 padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:  { color: '#93c5fd', fontSize: 14, fontWeight: '600' },
  totalAmount: { color: '#fff', fontSize: 24, fontWeight: '800' },
  submitBtn:   { backgroundColor: '#059669', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  cancelLink:  { alignItems: 'center', padding: 12 },
  cancelLinkText: { color: '#9ca3af', fontSize: 13 },
})
