import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fileDownloadUrl, listProducts } from '../api'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { pickId, unwrapList, unwrapObject } from '../data'
import { useAsyncData } from '../hooks'
import { Button, Card, ErrorBox, InlineCode, Spinner, TextInput } from '../ui'

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

function guessImageUrl(obj: Record<string, unknown>): string | null {
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
    (typeof obj.imageUrl === 'string' && obj.imageUrl) ||
    (typeof obj.image_url === 'string' && obj.image_url) ||
    (typeof obj.image === 'string' && obj.image) ||
    (typeof obj.thumbnail === 'string' && obj.thumbnail) ||
    (typeof obj.photo === 'string' && obj.photo) ||
    (typeof obj.url === 'string' && obj.url)
  if (direct && (/^https?:\/\//i.test(direct) || direct.startsWith('data:image/') || direct.startsWith('/')))
    return direct
  const nested = obj.image
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const n = nested as Record<string, unknown>
    const u = (typeof n.url === 'string' && n.url) || (typeof n.path === 'string' && n.path) || null
    if (u && (/^https?:\/\//i.test(u) || u.startsWith('data:image/') || u.startsWith('/'))) return u
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

export function CatalogPage() {
  const auth = useAuth()
  const cart = useCart()
  const navigate = useNavigate()

  const loader = useCallback(() => listProducts(), [])
  const { data, error, loading, reload } = useAsyncData(loader)
  const items = useMemo(() => unwrapList(data) ?? [], [data])

  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return items
    return items.filter((p) => {
      const obj = unwrapObject(p)
      const name = obj ? getStr(obj.name).toLowerCase() : ''
      const desc = obj ? getStr(obj.description).toLowerCase() : ''
      const id = pickId(p) ?? ''
      return name.includes(query) || desc.includes(query) || id.toLowerCase().includes(query)
    })
  }, [items, q])

  const hasAuthError =
    error &&
    typeof error === 'object' &&
    error !== null &&
    typeof (error as any).status === 'number' &&
    ((error as any).status === 401 || (error as any).status === 403)

  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h2>Produtos</h2>
          <p className="muted small">
            Navegue e monte seu carrinho. Para finalizar, é necessário <InlineCode>login</InlineCode>.
          </p>
        </div>
        <div className="row">
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Recarregar
          </Button>
          <Button type="button" onClick={() => navigate('/checkout')}>
            Carrinho ({cart.totalItems})
          </Button>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Buscar">
          <div className="form">
            <TextInput label="Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nome, descrição ou id" />
          </div>
        </Card>
        <Card
          title="Conta"
          actions={
            auth.isAuthenticated ? (
              <Button variant="secondary" type="button" onClick={() => navigate('/app')}>
                Painel
              </Button>
            ) : (
              <Button variant="secondary" type="button" onClick={() => navigate('/login?from=%2F')}>
                Entrar
              </Button>
            )
          }
        >
          <p className="muted small">
            {auth.isAuthenticated ? 'Você está logado.' : 'Você ainda não está logado.'} Ajuste o backend em{' '}
            <Link to="/settings">Configurações</Link>.
          </p>
        </Card>
      </div>

      <ErrorBox error={hasAuthError ? 'A API parece exigir login para listar produtos. Faça login para continuar.' : error} />

      {loading ? (
        <Spinner />
      ) : filtered.length ? (
        <div className="catalog">
          {filtered.map((p, idx) => {
            const id = pickId(p) ?? `#${idx + 1}`
            const obj = unwrapObject(p)
            const name = obj ? getStr(obj.name) : id
            const desc = obj ? getStr(obj.description) : ''
            const priceRaw = obj ? getNum(obj.price) : null
            const imageUrl = obj ? guessImageUrl(obj) : null
            const stock = obj ? getNum(obj.stock) : null
            const outOfStock = stock !== null ? stock <= 0 : false
            const disabled = !pickId(p) || outOfStock
            return (
              <div key={`${id}-${idx}`} className="product">
                <div className="product-img">
                  {imageUrl ? (
                    <img src={imageUrl} alt={name} />
                  ) : (
                    <div className="product-ph">{name.slice(0, 2).toUpperCase()}</div>
                  )}
                </div>
                <div className="product-body">
                  <div className="product-title">{name}</div>
                  {desc ? <div className="product-desc">{desc}</div> : null}
                  <div className="product-meta">
                    <span className="muted small mono">{id}</span>
                    <span className="product-price">
                      {priceRaw !== null ? formatBRL(priceRaw) : <span className="muted small">—</span>}
                    </span>
                  </div>
                  <div className="product-meta">
                    <span className={`stock ${outOfStock ? 'off' : ''}`}>
                      {stock !== null ? `Estoque: ${stock}` : 'Estoque: —'}
                    </span>
                    {outOfStock ? <span className="pill pill-warn">Indisponível</span> : null}
                  </div>
                  <div className="row">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={disabled}
                      onClick={() => cart.add(p, 1)}
                    >
                      {outOfStock ? 'Sem estoque' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="muted">Nenhum produto retornado.</p>
      )}
    </div>
  )
}
