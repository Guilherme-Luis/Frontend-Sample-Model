import { unwrapObject } from './data'

export type AppRole = 'ADMIN' | 'USER' | 'UNKNOWN'

export function getRoleFromPayload(payload: unknown): AppRole {
  const obj = unwrapObject(payload)
  if (!obj) return 'UNKNOWN'
  const raw = obj.role
  if (typeof raw === 'string') {
    const r = raw.toUpperCase()
    if (r === 'ADMIN') return 'ADMIN'
    if (r === 'USER') return 'USER'
    if (r.includes('ADMIN')) return 'ADMIN'
    if (r.includes('USER')) return 'USER'
  }
  return 'UNKNOWN'
}

export function canAccessAdmin(role: AppRole) {
  return role === 'ADMIN'
}
