export function unwrapList(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    const candidates = [v.data, v.items, v.results, v.rows, v.orders]
    for (const c of candidates) {
      if (Array.isArray(c)) return c
    }
  }
  return null
}

export function unwrapObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

export function pickId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const keys = ['id', '_id', 'uuid', 'productId', 'orderId', 'userId', 'fileId', 'companyId', 'notificationId']
  for (const k of keys) {
    const x = v[k]
    if (typeof x === 'string') return x
    if (typeof x === 'number') return String(x)
  }
  return null
}
