import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fileDownloadUrl } from './api'
import { pickId, unwrapObject } from './data'

export type CartItem = {
  productId: string
  name?: string
  price?: number
  imageUrl?: string
  quantity: number
}

type CartContextValue = {
  items: CartItem[]
  totalItems: number
  add: (product: unknown, quantity?: number) => void
  remove: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clear: () => void
}

const LS_KEY = 'mercado.cart'
const CartContext = createContext<CartContextValue | null>(null)

function readStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x) => x && typeof x.productId === 'string' && typeof x.quantity === 'number')
  } catch {
    return []
  }
}

function writeStored(items: CartItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

function getStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined
}

function getNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function guessImageUrl(obj: Record<string, unknown>): string | undefined {
  const imageId =
    (typeof obj.imageId === 'string' && obj.imageId) ||
    (typeof obj.imageID === 'string' && obj.imageID) ||
    (typeof obj.fileId === 'string' && obj.fileId) ||
    null
  if (imageId) return fileDownloadUrl(imageId)

  const img = obj.image
  if (img && typeof img === 'object' && !Array.isArray(img)) {
    const imgObj = img as Record<string, unknown>
    const nestedId = typeof imgObj.id === 'string' ? imgObj.id : null
    if (nestedId) return fileDownloadUrl(nestedId)
  }

  const direct =
    getStr(obj.imageUrl) ??
    getStr(obj.image_url) ??
    getStr(obj.image) ??
    getStr(obj.thumbnail) ??
    getStr(obj.photo) ??
    getStr(obj.url)
  if (direct && /^https?:\/\//i.test(direct)) return direct
  if (direct && direct.startsWith('data:image/')) return direct
  if (direct && direct.startsWith('/')) return direct
  const nested = obj.image
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const n = nested as Record<string, unknown>
    const u = getStr(n.url) ?? getStr(n.path)
    if (u && (/^https?:\/\//i.test(u) || u.startsWith('data:image/') || u.startsWith('/'))) return u
  }
  return undefined
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStored())

  useEffect(() => {
    writeStored(items)
  }, [items])

  const add = useCallback((product: unknown, quantity = 1) => {
    const productId = pickId(product)
    if (!productId) return
    const obj = unwrapObject(product)
    const name = obj ? getStr(obj.name) ?? getStr(obj.title) : undefined
    const price = obj ? getNum(obj.price) : undefined
    const imageUrl = obj ? guessImageUrl(obj) : undefined

    const q = Math.max(1, Math.floor(quantity))
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.productId === productId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + q }
        return next
      }
      return [...prev, { productId, name, price, imageUrl, quantity: q }]
    })
  }, [])

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((x) => x.productId !== productId))
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const q = Math.max(1, Math.floor(quantity))
    setItems((prev) => prev.map((x) => (x.productId === productId ? { ...x, quantity: q } : x)))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const totalItems = useMemo(() => items.reduce((acc, it) => acc + it.quantity, 0), [items])

  const value = useMemo<CartContextValue>(
    () => ({ items, totalItems, add, remove, setQuantity, clear }),
    [items, totalItems, add, remove, setQuantity, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
