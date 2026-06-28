import { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'

const AuthCtx = createContext(null)

const TOKEN_KEY = 'workordr_token'
const USER_KEY  = 'workordr_user'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restore = async () => {
      try {
        const token   = await SecureStore.getItemAsync(TOKEN_KEY)
        const userStr = await SecureStore.getItemAsync(USER_KEY)
        if (token && userStr) setUser(JSON.parse(userStr))
      } catch {
        // nothing stored
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [])

  const login = async (token, userData) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    setUser(null)
  }

  const getToken = () => SecureStore.getItemAsync(TOKEN_KEY)

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
