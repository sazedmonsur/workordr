import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { getTechnicians } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen({ navigation }) {
  const { setTechnician } = useAuth()
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getTechnicians()
      .then(setTechnicians)
      .catch(() => setError('Could not connect to server. Check your BASE_URL in api/client.js'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (tech) => {
    setTechnician(tech)
    navigation.replace('Tabs')
  }

  const skillColor = { junior: '#3b82f6', senior: '#8b5cf6', specialist: '#f59e0b' }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>Work<Text style={s.logoBlue}>Ordr</Text></Text>
        <Text style={s.sub}>Select your profile to continue</Text>
      </View>

      {loading && <ActivityIndicator color="#3b82f6" size="large" />}
      {!!error && <Text style={s.error}>{error}</Text>}

      <FlatList
        data={technicians}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => handleSelect(item)}>
            <View style={[s.avatar, { backgroundColor: (skillColor[item.skill_level] || '#6b7280') + '22' }]}>
              <Text style={[s.avatarText, { color: skillColor[item.skill_level] || '#6b7280' }]}>
                {item.name.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.detail}>{item.email}</Text>
              <Text style={s.detail}>{item.skill_level} · {item.working_hours_start}–{item.working_hours_end}</Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading && !error ? (
          <Text style={s.empty}>No technicians found. Add technicians via the admin portal.</Text>
        ) : null}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header:    { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 },
  logo:      { fontSize: 28, fontWeight: '800', color: '#111827' },
  logoBlue:  { color: '#3b82f6' },
  sub:       { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
               borderRadius: 12, padding: 14, marginBottom: 10,
               shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatar:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center',
               justifyContent: 'center', marginRight: 12 },
  avatarText:{ fontSize: 18, fontWeight: '700' },
  name:      { fontSize: 15, fontWeight: '600', color: '#111827' },
  detail:    { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  arrow:     { fontSize: 22, color: '#d1d5db' },
  error:     { color: '#ef4444', textAlign: 'center', marginHorizontal: 20, marginBottom: 12 },
  empty:     { textAlign: 'center', color: '#9ca3af', marginTop: 40, paddingHorizontal: 20 },
})
