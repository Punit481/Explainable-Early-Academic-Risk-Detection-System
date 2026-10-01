import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { api, clearSession, loadSession, saveSession, setUnauthorizedHandler, type Session } from './api'

interface AuthState {
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

/** Holds who is logged in, for the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession)

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  // An expired token on any request logs the teacher out
  useEffect(() => setUnauthorizedHandler(logout), [logout])

  async function login(email: string, password: string) {
    const newSession = await api.login(email, password)
    saveSession(newSession)
    setSession(newSession)
  }

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return auth
}

/** Shows its children only when logged in; otherwise goes to /login and comes back after. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
