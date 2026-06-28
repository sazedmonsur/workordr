import { createContext, useContext, useState, useEffect } from 'react'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token   = localStorage.getItem('workordr_token')
    const userStr = localStorage.getItem('workordr_user')
    if (token && userStr) {
      try { setUser(JSON.parse(userStr)) }
      catch { localStorage.removeItem('workordr_token'); localStorage.removeItem('workordr_user') }
    }
    setLoading(false)
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('workordr_token', token)
    localStorage.setItem('workordr_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('workordr_token')
    localStorage.removeItem('workordr_user')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
