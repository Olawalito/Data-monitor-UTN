import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Session } from '../types/api'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.getSession().then((value) => { if (active) setSession(value) }).catch(() => { if (active) setSession(null) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    async login(username, password) { setSession(await api.login(username, password)) },
    async logout() { try { await api.logout() } finally { setSession(null) } },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// The provider and hook intentionally share this small module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
