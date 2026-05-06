import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createProduct,
  getProduct,
  listProducts,
  toggleProduct,
  updateProduct,
} from '../api'
import { unwrapList, pickId, unwrapObject } from '../data'
import { useAsyncData } from '../hooks'
import { Button, Card, ErrorBox, JsonView, Spinner, TextArea, TextInput } from '../ui'

function getStr(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

export function ProductsPage() {
  const loader = useCallback(() => listProducts(), [])
  const { data, error, loading, reload } = useAsyncData(loader)
  const items = useMemo(() => unwrapList(data) ?? [], [data])

  const [selected, setSelected] = useState<unknown | null>(null)
  const [details, setDetails] = useState<unknown | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [cName, setCName] = useState('banana')
  const [cDesc, setCDesc] = useState('banana amarela')
  const [cPrice, setCPrice] = useState('10')
  const [cStock, setCStock] = useState('10')
  const [cImage, setCImage] = useState<File | null>(null)

  const [uId, setUId] = useState('')
  const [uName, setUName] = useState('')
  const [uDesc, setUDesc] = useState('')
  const [uPrice, setUPrice] = useState('')
  const [uStock, setUStock] = useState('')
  const [uImage, setUImage] = useState<File | null>(null)

  function selectItem(it: unknown) {
    setSelected(it)
    setDetails(null)
    const obj = unwrapObject(it)
    const id = pickId(it) ?? ''
    setUId(id)
    if (obj) {
      setUName(getStr(obj.name))
      setUDesc(getStr(obj.description))
      setUPrice(getStr(obj.price))
      setUStock(getStr(obj.stock))
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setActionError(null)
    try {
      await createProduct({ name: cName, description: cDesc, price: cPrice, stock: cStock, image: cImage })
      setCImage(null)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault()
    if (!uId) return
    setBusy(true)
    setActionError(null)
    try {
      await updateProduct(uId, { name: uName, description: uDesc, price: uPrice, stock: uStock, image: uImage })
      setUImage(null)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onToggle() {
    if (!uId) return
    setBusy(true)
    setActionError(null)
    try {
      await toggleProduct(uId)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onFetchDetails() {
    if (!uId) return
    setBusy(true)
    setActionError(null)
    try {
      const d = await getProduct(uId)
      setDetails(d)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-h">
        <h2>Produtos</h2>
        <div className="row">
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Recarregar
          </Button>
        </div>
      </div>

      <ErrorBox error={error} />
      <ErrorBox error={actionError} />

      <div className="grid-2">
        <Card title={`Lista (${items.length})`}>
          {loading ? (
            <Spinner />
          ) : items.length ? (
            <div className="list">
              {items.map((it, idx) => {
                const id = pickId(it) ?? `#${idx + 1}`
                const obj = unwrapObject(it)
                const name = obj ? getStr(obj.name) : ''
                return (
                  <button
                    key={`${id}-${idx}`}
                    type="button"
                    className={`list-item ${selected === it ? 'active' : ''}`}
                    onClick={() => selectItem(it)}
                  >
                    <div className="list-title">{name || id}</div>
                    <div className="list-sub">{id}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="muted">Nenhum produto retornado.</p>
          )}

          {selected ? (
            <>
              <div className="hr" />
              <JsonView value={selected} />
            </>
          ) : null}
        </Card>

        <div className="stack">
          <Card title="Criar produto">
            <form className="form" onSubmit={(e) => void onCreate(e)}>
              <TextInput label="Nome" value={cName} onChange={(e) => setCName(e.target.value)} required />
              <TextArea label="Descrição" value={cDesc} onChange={(e) => setCDesc(e.target.value)} required />
              <TextInput label="Preço" value={cPrice} onChange={(e) => setCPrice(e.target.value)} required />
              <TextInput label="Estoque" value={cStock} onChange={(e) => setCStock(e.target.value)} required />
              <label className="field">
                <span className="field-label">Imagem</span>
                <input className="input" type="file" accept="image/*" onChange={(e) => setCImage(e.target.files?.[0] ?? null)} />
              </label>
              <Button disabled={busy} type="submit">
                {busy ? 'Enviando…' : 'Criar'}
              </Button>
            </form>
          </Card>

          <Card
            title="Atualizar / Toggle"
            actions={
              <div className="row">
                <Button type="button" variant="secondary" onClick={() => void onFetchDetails()} disabled={busy || !uId}>
                  Buscar por ID
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onToggle()} disabled={busy || !uId}>
                  Toggle
                </Button>
              </div>
            }
          >
            <form className="form" onSubmit={(e) => void onUpdate(e)}>
              <TextInput label="ProductID" value={uId} onChange={(e) => setUId(e.target.value)} required />
              <TextInput label="Nome" value={uName} onChange={(e) => setUName(e.target.value)} required />
              <TextArea label="Descrição" value={uDesc} onChange={(e) => setUDesc(e.target.value)} required />
              <TextInput label="Preço" value={uPrice} onChange={(e) => setUPrice(e.target.value)} required />
              <TextInput label="Estoque" value={uStock} onChange={(e) => setUStock(e.target.value)} required />
              <label className="field">
                <span className="field-label">Imagem (opcional)</span>
                <input className="input" type="file" accept="image/*" onChange={(e) => setUImage(e.target.files?.[0] ?? null)} />
              </label>
              <Button disabled={busy} type="submit">
                {busy ? 'Salvando…' : 'Atualizar'}
              </Button>
            </form>

            {details ? (
              <>
                <div className="hr" />
                <JsonView value={details} />
              </>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  )
}
