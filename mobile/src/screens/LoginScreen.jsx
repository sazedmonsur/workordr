import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { loginUser } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen({ navigation }) {
  const { login, user, loading } = useAuth()

  // If already authenticated, skip login screen
  useEffect(() => {
    if (!loading && user) navigation.replace('Tabs')
  }, [user, loading])
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Enter your email and password'); return }
    setError(''); setLoading(true)
    try {
      const data = await loginUser(email.toLowerCase().trim(), password)
      if (data.user.role !== 'technician') {
        setError('This app is for technicians. Use the web portal to manage your account.')
        return
      }
      await login(data.token, data.user)
      navigation.replace('Tabs')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.logo}>Work<Text style={s.blue}>Ordr</Text></Text>
          <Text style={s.sub}>Technician Sign In</Text>
        </View>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              placeholder="you@company.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>Ask your admin to create your login credentials.</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  inner:       { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  header:      { alignItems: 'center', marginBottom: 36 },
  logo:        { fontSize: 32, fontWeight: '800', color: '#111827' },
  blue:        { color: '#3b82f6' },
  sub:         { fontSize: 15, color: '#9ca3af', marginTop: 6 },
  errorBox:    { backgroundColor: '#fef2f2', borderRadius: 10, padding: 14, marginBottom: 16 },
  errorText:   { color: '#dc2626', fontSize: 13, textAlign: 'center' },
  form:        { backgroundColor: '#fff', borderRadius: 16, padding: 20,
                  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  field:       { marginBottom: 14 },
  label:       { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input:       { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
                  backgroundColor: '#fafafa' },
  btn:         { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14,
                  alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint:        { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 },
})
