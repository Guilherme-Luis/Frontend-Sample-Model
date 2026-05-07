type AppConfig = {
  apiOrigin: string
  environment: string
}

type ApiProblem = {
  status: number
  message: string
  data?: unknown
}

const LS_TOKEN_KEY = 'mercado.authToken'
const LS_API_ORIGIN_KEY = 'mercado.apiOrigin'
const LS_ENV_KEY = 'mercado.environment'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '')
}

function normalizeEnv(env: string): string {
  return env.replace(/^\/+|\/+$/g, '')
}

export function getAuthToken(): string | null {
  return localStorage.getItem(LS_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(LS_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(LS_TOKEN_KEY)
}

export function decodeJwtPayload(token: string): unknown | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getRuntimeConfig(): Partial<AppConfig> {
  return (window.__APP_CONFIG__ ?? {}) as Partial<AppConfig>
}

export function getEffectiveConfig(): AppConfig {
  const runtime = getRuntimeConfig()

  const apiOrigin =
    localStorage.getItem(LS_API_ORIGIN_KEY) ??
    runtime.apiOrigin ??
    'http://localhost:3003'

  const environment =
    localStorage.getItem(LS_ENV_KEY) ?? runtime.environment ?? 'development'

  return {
    apiOrigin: normalizeOrigin(apiOrigin),
    environment: normalizeEnv(environment),
  }
}

export function saveConfig(next: Partial<AppConfig>): AppConfig {
  const current = getEffectiveConfig()
  const merged: AppConfig = {
    apiOrigin: next.apiOrigin ? normalizeOrigin(next.apiOrigin) : current.apiOrigin,
    environment:
      next.environment !== undefined ? normalizeEnv(next.environment) : current.environment,
  }
  localStorage.setItem(LS_API_ORIGIN_KEY, merged.apiOrigin)
  localStorage.setItem(LS_ENV_KEY, merged.environment)
  return merged
}

export function clearConfigOverrides(): void {
  localStorage.removeItem(LS_API_ORIGIN_KEY)
  localStorage.removeItem(LS_ENV_KEY)
}

function buildBaseUrl(): string {
  if (import.meta.env.DEV) return '/__api'

  const { apiOrigin, environment } = getEffectiveConfig()
  const envPart = environment ? `/${environment}` : ''
  return `${apiOrigin}${envPart}/api`
}

function buildUrl(pathname: string): string {
  const base = buildBaseUrl()
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${path}`
}

export function apiUrl(pathname: string): string {
  return buildUrl(pathname)
}

export function fileDownloadUrl(fileId: string): string {
  return apiUrl(`/files/${encodeURIComponent(fileId)}/download`)
}

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }
  try {
    return await response.text()
  } catch {
    return null
  }
}

function toApiProblem(status: number, data: unknown): ApiProblem {
  if (isRecord(data)) {
    const msg =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      `HTTP ${status}`
    return { status, message: msg, data }
  }
  if (typeof data === 'string' && data.trim()) return { status, message: data, data }
  return { status, message: `HTTP ${status}`, data }
}

async function requestJson<T>(
  method: string,
  path: string,
  opts?: { body?: unknown; headers?: Record<string, string>; auth?: boolean },
): Promise<T> {
  const url = buildUrl(path)
  const headers: Record<string, string> = { ...(opts?.headers ?? {}) }

  if (import.meta.env.DEV) {
    const cfg = getEffectiveConfig()
    headers['x-api-origin'] = cfg.apiOrigin
    headers['x-api-environment'] = cfg.environment
  }

  if (opts?.auth !== false) {
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let body: BodyInit | undefined
  if (opts?.body instanceof FormData) {
    body = opts.body
  } else if (opts?.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
    body = JSON.stringify(opts.body)
  }

  const res = await fetch(url, { method, headers, body })
  const data = await readBody(res)
  if (!res.ok) throw toApiProblem(res.status, data)
  return data as T
}

async function requestBlob(
  method: string,
  path: string,
  opts?: { headers?: Record<string, string>; auth?: boolean },
): Promise<Blob> {
  const url = buildUrl(path)
  const headers: Record<string, string> = { ...(opts?.headers ?? {}) }

  if (import.meta.env.DEV) {
    const cfg = getEffectiveConfig()
    headers['x-api-origin'] = cfg.apiOrigin
    headers['x-api-environment'] = cfg.environment
  }

  if (opts?.auth !== false) {
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, { method, headers })
  if (!res.ok) {
    const data = await readBody(res)
    throw toApiProblem(res.status, data)
  }
  return await res.blob()
}

export async function login(email: string, password: string): Promise<{
  token: string
  payload: unknown | null
  raw: unknown
}> {
  const raw = await requestJson<unknown>('POST', '/auth/login', {
    auth: false,
    body: { email, password },
  })

  if (!isRecord(raw) || typeof raw.token !== 'string') {
    throw { status: 0, message: 'Resposta de login não contém token', data: raw } satisfies ApiProblem
  }

  setAuthToken(raw.token)
  return { token: raw.token, payload: decodeJwtPayload(raw.token), raw }
}

export async function registerUser(name: string, email: string, password: string): Promise<unknown> {
  return await requestJson('POST', '/auth/register', {
    auth: false,
    body: { name, email, password },
  })
}

export async function logout(): Promise<unknown> {
  const raw = await requestJson('POST', '/auth/logout', { body: null })
  clearAuthToken()
  return raw
}

export async function listCompanies(): Promise<unknown> {
  return await requestJson('GET', '/companies')
}

export async function getCompany(id: string): Promise<unknown> {
  return await requestJson('GET', `/companies/${encodeURIComponent(id)}`)
}

export async function createCompany(input: {
  name: string
  cnpj: string
  email: string
  phone: string
  image?: File | null
}): Promise<unknown> {
  const fd = new FormData()
  fd.set('name', input.name)
  fd.set('cnpj', input.cnpj)
  fd.set('email', input.email)
  fd.set('phone', input.phone)
  if (input.image) fd.set('image', input.image)
  return await requestJson('POST', '/companies', { body: fd })
}

export async function patchCompany(
  id: string,
  input: { phone?: string; image?: File | null },
): Promise<unknown> {
  const fd = new FormData()
  if (input.phone !== undefined) fd.set('phone', input.phone)
  if (input.image) fd.set('image', input.image)
  return await requestJson('PATCH', `/companies/${encodeURIComponent(id)}`, { body: fd })
}

export async function deleteCompany(id: string): Promise<unknown> {
  return await requestJson('DELETE', `/companies/${encodeURIComponent(id)}`)
}

export async function listNotifications(): Promise<unknown> {
  return await requestJson('GET', '/notifications')
}

export async function createNotification(input: {
  title: string
  message: string
  type: string
}): Promise<unknown> {
  return await requestJson('POST', '/notifications', { body: input })
}

export async function readNotification(id: string): Promise<unknown> {
  return await requestJson('PATCH', `/notifications/${encodeURIComponent(id)}`)
}

export async function updateNotification(
  id: string,
  input: { title: string; message: string; type: string; read: boolean },
): Promise<unknown> {
  return await requestJson('PUT', `/notifications/${encodeURIComponent(id)}`, { body: input })
}

export async function deleteNotification(id: string): Promise<unknown> {
  return await requestJson('DELETE', `/notifications/${encodeURIComponent(id)}`)
}

export async function listOrders(): Promise<unknown> {
  return await requestJson('GET', '/orders')
}

export async function createOrder(input: {
  items: Array<{ productId: string; quantity: number }>
}): Promise<unknown> {
  return await requestJson('POST', '/orders', { body: input })
}

export async function updateOrderStatus(id: string, status: string): Promise<unknown> {
  return await requestJson('PATCH', `/orders/${encodeURIComponent(id)}/status`, {
    body: { status },
  })
}

export async function deleteOrder(id: string): Promise<unknown> {
  return await requestJson('DELETE', `/orders/${encodeURIComponent(id)}`)
}

export async function listProducts(): Promise<unknown> {
  return await requestJson('GET', '/products')
}

export async function getProduct(id: string): Promise<unknown> {
  return await requestJson('GET', `/products/${encodeURIComponent(id)}`)
}

export async function createProduct(input: {
  name: string
  description: string
  price: string | number
  stock: string | number
  image?: File | null
}): Promise<unknown> {
  const fd = new FormData()
  fd.set('name', input.name)
  fd.set('description', input.description)
  fd.set('price', String(input.price))
  fd.set('stock', String(input.stock))
  if (input.image) fd.set('image', input.image)
  return await requestJson('POST', '/products', { body: fd })
}

export async function updateProduct(
  id: string,
  input: {
    name: string
    description: string
    price: string | number
    stock: string | number
    image?: File | null
  },
): Promise<unknown> {
  const fd = new FormData()
  fd.set('name', input.name)
  fd.set('description', input.description)
  fd.set('price', String(input.price))
  fd.set('stock', String(input.stock))
  if (input.image) fd.set('image', input.image)
  return await requestJson('PUT', `/products/${encodeURIComponent(id)}`, { body: fd })
}

export async function toggleProduct(id: string): Promise<unknown> {
  return await requestJson('PATCH', `/products/${encodeURIComponent(id)}/toggle`)
}

export async function listUsers(): Promise<unknown> {
  return await requestJson('GET', '/users')
}

export async function getUser(id: string): Promise<unknown> {
  return await requestJson('GET', `/users/${encodeURIComponent(id)}`)
}

export async function updateUser(
  id: string,
  input: { name: string; email: string },
): Promise<unknown> {
  return await requestJson('PUT', `/users/${encodeURIComponent(id)}`, { body: input })
}

export async function deleteUser(id: string): Promise<unknown> {
  return await requestJson('DELETE', `/users/${encodeURIComponent(id)}`)
}

export async function updateUserRole(id: string, role: string): Promise<unknown> {
  return await requestJson('PATCH', `/users/${encodeURIComponent(id)}/role`, {
    body: { role },
  })
}

export async function listFiles(): Promise<unknown> {
  return await requestJson('GET', '/files')
}

export async function getFile(id: string): Promise<unknown> {
  return await requestJson('GET', `/files/${encodeURIComponent(id)}`)
}

export async function uploadFile(file: File): Promise<unknown> {
  const fd = new FormData()
  fd.set('file', file)
  return await requestJson('POST', '/files', { body: fd })
}

export async function deleteFile(id: string): Promise<unknown> {
  return await requestJson('DELETE', `/files/${encodeURIComponent(id)}`)
}

export async function downloadFile(id: string): Promise<Blob> {
  return await requestBlob('GET', `/files/${encodeURIComponent(id)}/download`)
}
