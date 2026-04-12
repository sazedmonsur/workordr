import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getJobsByTechnician, getTechnicians } from '../api/client'

const STATUS_COLORS = {
  pending:     { bg: '#fef9c3', text: '#854d0e' },
  scheduled:   { bg: '#dbeafe', text: '#1e40af' },
  in_progress: { bg: '#f3e8ff', text: '#7e22ce' },
  completed:   { bg: '#dcfce7', text: '#166534' },
  cancelled:   { bg: '#fee2e2', text: '#991b1b' },
}

// For MVP: use the first technician from the DB
// In a real app this would come from auth
export default function JobListScreen({ navigation }) {
  const [jobs, setJobs] = useState([])
  const [techId, setTechId] = useState(null)
  const [techName, setTechName] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const techs = await getTechnicians()
      if (techs.length === 0) {
        Alert.alert('No technicians', 'Please add a technician from the web app first.')
        return
      }
      const tech = techs[0]
      setTechId(tech.id)
      setTechName(tech.name)
      const myJobs = await getJobsByTechnician(tech.id)
      setJobs(myJobs.filter(j => j.status !== 'cancelled'))
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server. Check your API URL.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(useCallback(() => { loadData() }, []))

  const onRefresh = () => { setRefreshing(true); loadData() }

  const renderJob = ({ item }) => {
    const colors = STATUS_COLORS[item.status] || STATUS_COLORS.pending
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.customerName}>{item.customer?.name}</Text>
        {item.description && (
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        )}
        <Text style={styles.date}>
          Created {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    )
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1d4ed8" />
    </View>
  )

  return (
    <View style={styles.container}>
      {techName ? (
        <View style={styles.techBanner}>
          <Text style={styles.techLabel}>Logged in as</Text>
          <Text style={styles.techName}>{techName}</Text>
        </View>
      ) : null}
      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        renderItem={renderJob}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No jobs assigned to you</Text>
            <Text style={styles.emptyHint}>Pull down to refresh</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  techBanner: {
    backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#dbeafe', flexDirection: 'row',
    alignItems: 'center', gap: 6,
  },
  techLabel: { fontSize: 12, color: '#6b7280' },
  techName: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  customerName: { fontSize: 13, color: '#2563eb', fontWeight: '500', marginBottom: 4 },
  desc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 6 },
  date: { fontSize: 11, color: '#9ca3af' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyHint: { fontSize: 13, color: '#9ca3af' },
})
