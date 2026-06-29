import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, SectionList,
} from 'react-native'
import { getJobs } from '../api/client'
import { useAuth } from '../context/AuthContext'

const STATUS_COLOR = {
  assigned:    { bg: '#dbeafe', text: '#1d4ed8' },
  en_route:    { bg: '#fed7aa', text: '#c2410c' },
  in_progress: { bg: '#fef9c3', text: '#a16207' },
  completed:   { bg: '#dcfce7', text: '#15803d' },
  invoiced:    { bg: '#f3e8ff', text: '#7e22ce' },
  paid:        { bg: '#dcfce7', text: '#166534' },
  scheduled:   { bg: '#dbeafe', text: '#1e40af' },
  requested:   { bg: '#f3f4f6', text: '#4b5563' },
  pending:     { bg: '#f3f4f6', text: '#4b5563' },
  cancelled:   { bg: '#fee2e2', text: '#b91c1c' },
}

function fmtTime(dt) {
  if (!dt) return null
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dt) {
  if (!dt) return null
  const d = new Date(dt)
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function JobCard({ job, onPress }) {
  const sc = STATUS_COLOR[job.status] || STATUS_COLOR.pending
  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(job)}>
      <View style={s.cardTop}>
        <View style={s.cardLeft}>
          <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.customer}>{job.customer?.name}</Text>
          {job.service && <Text style={s.service}>{job.service.name}</Text>}
          {job.address && <Text style={s.address} numberOfLines={1}>{job.address}</Text>}
        </View>
        <View style={s.cardRight}>
          <View style={[s.badge, { backgroundColor: sc.bg }]}>
            <Text style={[s.badgeText, { color: sc.text }]}>{job.status.replace(/_/g, ' ')}</Text>
          </View>
          {job.scheduled_at && (
            <Text style={s.time}>{fmtTime(job.scheduled_at)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function JobListScreen({ navigation }) {
  const { user, logout } = useAuth()
  const technician_id = user?.technician_id
  const [sections, setSections] = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState('today') // today | upcoming | all

  const handleLogout = async () => {
    await logout()
    navigation.replace('Login')
  }

  const ACTIVE_STATUSES = ['assigned', 'en_route', 'in_progress', 'scheduled', 'requested', 'pending']

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const jobs = await getJobs({ technician_id })
      const active = jobs.filter(j => !['cancelled', 'paid'].includes(j.status))

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

      if (tab === 'today') {
        const todayJobs = active.filter(j => {
          if (!j.scheduled_at) return false
          const d = new Date(j.scheduled_at)
          return d >= today && d < tomorrow
        })
        // Also show active unscheduled jobs
        const unscheduled = active.filter(j => !j.scheduled_at && ACTIVE_STATUSES.includes(j.status))
        setSections([
          { title: 'Today', data: todayJobs.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)) },
          ...(unscheduled.length ? [{ title: 'Unscheduled', data: unscheduled }] : []),
        ].filter(s => s.data.length > 0))
      } else if (tab === 'upcoming') {
        const upcoming = active.filter(j => j.scheduled_at && new Date(j.scheduled_at) >= tomorrow)
        const grouped = {}
        upcoming.forEach(j => {
          const key = fmtDate(j.scheduled_at)
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(j)
        })
        setSections(Object.entries(grouped).map(([title, data]) => ({
          title,
          data: data.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
        })))
      } else {
        setSections([{ title: 'All Jobs', data: active }])
      }
    } catch {}
    if (isRefresh) setRefreshing(false)
    else setLoading(false)
  }, [technician_id, tab])

  useEffect(() => { load() }, [load])

  const handlePress = (job) => navigation.navigate('JobDetail', { jobId: job.id })

  return (
    <View style={s.container}>
      {/* Account header */}
      <View style={s.accountHeader}>
        <View>
          <Text style={s.accountName}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[['today', 'Today'], ['upcoming', 'Upcoming'], ['all', 'All']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.sectionCount}>{section.data.length} job{section.data.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
          renderItem={({ item }) => <JobCard job={item} onPress={handlePress} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No jobs for this view</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                   backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
                   borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  accountName:   { fontSize: 13, fontWeight: '600', color: '#374151' },
  logoutBtn:     { backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  logoutText:    { color: '#dc2626', fontSize: 12, fontWeight: '600' },
  tabs:      { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab:       { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText:   { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  tabTextActive: { color: '#3b82f6', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                   paddingVertical: 8, paddingTop: 16 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount:  { fontSize: 11, color: '#d1d5db' },
  card:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
               shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop:   { flexDirection: 'row', gap: 10 },
  cardLeft:  { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  jobTitle:  { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  customer:  { fontSize: 12, color: '#6b7280' },
  service:   { fontSize: 11, color: '#3b82f6', marginTop: 2 },
  address:   { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  badge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  time:      { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
})
