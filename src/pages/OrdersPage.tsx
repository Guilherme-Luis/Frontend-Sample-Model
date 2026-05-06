import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createOrder, deleteOrder, listOrders, listProducts, updateOrderStatus } from '../api'
import { pickId, unwrapList, unwrapObject } from '../data'
import { useAsyncData } from '../hooks'
import { Button, Card, ErrorBox, JsonView, Select, Spinner, TextInput } from '../ui'

function getStr(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

function getNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return null
}

function formatBRL(value: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  } catch {
    return `R$ ${value.toFixed(2)}`
  }
}

type OrderItem = { productId: string; quantity: number }

export function OrdersPage() {
  const ordersLoader = useCallback(() => listOrders(), [])
  const productsLoader = useCallback(() => listProducts(), [])

  const ordersState = useAsyncData(ordersLoader)
  const productsState = useAsyncData(productsLoader)

  const orders = useMemo(() => unwrapList(ordersState.data) ?? [], [ordersState.data])
  const summary = useMemo(() => unwrapObject(ordersState.data), [ordersState.data])
  const totalOrders = useMemo(() => (summary ? getNum(summary.totalOrders) : null), [summary])
  const totalValue = useMemo(() => (summary ? getNum(summary.totalValue) : null), [summary])
  const products = useMemo(() => unwrapList(productsState.data) ?? [], [productsState.data])

  const productOptions = useMemo(() => {
    return products
      .map((p, idx) => {
        const id = pickId(p) ?? ''
        const obj = unwrapObject(p)
        const name = obj ? getStr(obj.name) : ''
        return { id, label: name ? `${name} (${id})` : id || `#${idx + 1}` }
      })
      .filter((x) => x.id)
  }, [products])

  const [selected, setSelected] = useState<unknown | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [items, setItems] = useState<OrderItem[]>([{ productId: '', quantity: 1 }])

  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('SHIPPED')

  function selectOrder(it: unknown) {
    setSelected(it)
    const id = pickId(it) ?? ''
    setOrderId(id)
  }

  function updateItem(idx: number, next: Partial<OrderItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...next } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: '', quantity: 1 }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setActionError(null)
    try {
      const clean = items
        .filter((it) => it.productId && Number.isFinite(it.quantity) && it.quantity > 0)
        .map((it) => ({ productId: it.productId, quantity: Number(it.quantity) }))
      await createOrder({ items: clean })
      setItems([{ productId: '', quantity: 1 }])
      await ordersState.reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onUpdateStatus(e: FormEvent) {
    e.preventDefault()
    if (!orderId) return
    setBusy(true)
    setActionError(null)
    try {
      await updateOrderStatus(orderId, status)
      await ordersState.reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!orderId) return
    if (!confirm(`Deletar pedido ${orderId}?`)) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteOrder(orderId)
      setOrderId('')
      setSelected(null)
      await ordersState.reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h2>Pedidos</h2>
          <p className="muted small">
            Resumo: <span className="mono">{totalOrders ?? '—'}</span> pedidos • Total:{' '}
            <span className="mono">{totalValue !== null ? formatBRL(totalValue) : '—'}</span>
          </p>
        </div>
        <div className="row">
          <Button variant="secondary" type="button" onClick={() => void ordersState.reload()}>
            Recarregar
          </Button>
        </div>
      </div>

      <ErrorBox error={ordersState.error} />
      <ErrorBox error={actionError} />

      <div className="grid-2">
        <Card title={`Lista (${orders.length})`}>
          {ordersState.loading ? (
            <Spinner />
          ) : orders.length ? (
            <div className="list">
              {orders.map((it, idx) => {
                const id = pickId(it) ?? `#${idx + 1}`
                const obj = unwrapObject(it)
                const statusLabel = obj ? getStr(obj.status) : ''
                const total = obj ? getNum(obj.total) : null
                const label = `${statusLabel || '—'}${total !== null ? ` • ${formatBRL(total)}` : ''}`
                return (
                  <button key={`${id}-${idx}`} type="button" className={`list-item ${selected === it ? 'active' : ''}`} onClick={() => selectOrder(it)}>
                    <div className="list-title">{label || id}</div>
                    <div className="list-sub">{id}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="muted">Nenhum pedido retornado.</p>
          )}

          {selected ? (
            <>
              <div className="hr" />
              <JsonView value={selected} />
            </>
          ) : null}
        </Card>

        <div className="stack">
          <Card
            title="Criar pedido"
            actions={
              <Button type="button" variant="secondary" onClick={() => void productsState.reload()}>
                Recarregar produtos
              </Button>
            }
          >
            <ErrorBox error={productsState.error} />
            {productsState.loading ? <Spinner label="Carregando produtos…" /> : null}

            <form className="form" onSubmit={(e) => void onCreate(e)}>
              {items.map((it, idx) => (
                <div key={idx} className="row row-gap">
                  <div className="grow">
                    <Select
                      label={`Produto #${idx + 1}`}
                      value={it.productId}
                      onChange={(e) => updateItem(idx, { productId: e.target.value })}
                    >
                      <option value="">Selecione…</option>
                      {productOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div style={{ width: 160 }}>
                    <TextInput
                      label="Qtd"
                      inputMode="numeric"
                      value={String(it.quantity)}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="row row-end">
                    <Button type="button" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))}

              <div className="row">
                <Button type="button" variant="secondary" onClick={addItem}>
                  Adicionar item
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Criando…' : 'Criar'}
                </Button>
              </div>
            </form>
          </Card>

          <Card
            title="Atualizar status / Cancelar"
            actions={
              <Button type="button" variant="danger" onClick={() => void onDelete()} disabled={busy || !orderId}>
                Cancelar
              </Button>
            }
          >
            <form className="form" onSubmit={(e) => void onUpdateStatus(e)}>
              <TextInput label="OrderID" value={orderId} onChange={(e) => setOrderId(e.target.value)} required />
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} required>
                <option value="PENDING">PENDING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="CANCELED">CANCELED</option>
              </Select>
              <Button type="submit" disabled={busy || !orderId}>
                {busy ? 'Salvando…' : 'Atualizar status'}
              </Button>
            </form>
            <p className="muted small">Cancelar só funciona quando o pedido estiver em PENDING.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
