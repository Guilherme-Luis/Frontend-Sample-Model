import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  clearAuthToken,
  decodeJwtPayload,
  getAuthToken,
  login as apiLogin,
  logout as apiLogout,
} from './api'

type AuthContextValue = {
  token: string | null
  payload: unknown | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAuthToken())
  const [payload, setPayload] = useState<unknown | null>(() =>
    token ? decodeJwtPayload(token) : null,
  )

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    setToken(res.token)
    setPayload(res.payload)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      clearAuthToken()
      setToken(null)
      setPayload(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      payload,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, payload, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

