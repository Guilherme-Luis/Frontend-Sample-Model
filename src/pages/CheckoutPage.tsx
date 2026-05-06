import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../api'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { Button, Card, ErrorBox, InlineCode, TextInput } from '../ui'

function formatBRL(value: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  } catch {
    return `R$ ${value.toFixed(2)}`
  }
}

export function CheckoutPage() {
  const auth = useAuth()
  const cart = useCart()
  const navigate = useNavigate()

  const total = useMemo(() => {
    return cart.items.reduce((acc, it) => acc + (it.price ?? 0) * it.quantity, 0)
  }, [cart.items])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const items = cart.items.map((it) => ({ productId: it.productId, quantity: it.quantity }))
      const res = await createOrder({ items })
      cart.clear()
      setStatus('Pedido criado com sucesso.')
      void res
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h2>Checkout</h2>
          <p className="muted small">
            {auth.isAuthenticated ? (
              <>
                Autenticado. Você pode finalizar o pedido.
              </>
            ) : (
              <>
                Para finalizar, faça login.
              </>
            )}
          </p>
        </div>
        <div className="row">
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>
            Voltar ao catálogo
          </Button>
          {!auth.isAuthenticated ? (
            <Button type="button" onClick={() => navigate('/login?from=%2Fcheckout')}>
              Fazer login
            </Button>
          ) : null}
        </div>
      </div>

      <ErrorBox error={error} />
      {status ? <div className="alert alert-success">{status}</div> : null}

      <div className="grid-2">
        <Card title={`Itens (${cart.totalItems})`}>
          {cart.items.length ? (
            <div className="list">
              {cart.items.map((it) => (
                <div key={it.productId} className="list-item">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div className="list-title">{it.name ?? it.productId}</div>
                      <div className="list-sub">{it.productId}</div>
                    </div>
                    <div className="row">
                      <TextInput
                        label="Qtd"
                        inputMode="numeric"
                        value={String(it.quantity)}
                        onChange={(e) => cart.setQuantity(it.productId, Number(e.target.value))}
                      />
                      <Button type="button" variant="ghost" onClick={() => cart.remove(it.productId)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                    <span className="muted small">Preço</span>
                    <span className="mono">
                      {it.price !== undefined ? formatBRL(it.price) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Seu carrinho está vazio.</p>
          )}
        </Card>

        <Card title="Resumo">
          <p className="muted small">
            Total estimado: <InlineCode>{formatBRL(total)}</InlineCode>
          </p>
          <div className="hr" />
          <form className="form" onSubmit={(e) => void onSubmit(e)}>
            <Button type="submit" disabled={!auth.isAuthenticated || busy || cart.items.length === 0}>
              {busy ? 'Finalizando…' : 'Finalizar pedido'}
            </Button>
            {!auth.isAuthenticated ? (
              <p className="muted small">Faça login para habilitar o botão de finalizar.</p>
            ) : null}
          </form>
        </Card>
      </div>
    </div>
  )
}

