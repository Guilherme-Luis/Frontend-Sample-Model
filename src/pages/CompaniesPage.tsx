import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  patchCompany,
} from '../api'
import { useAuth } from '../auth'
import { pickId, unwrapList, unwrapObject } from '../data'
import { useAsyncData } from '../hooks'
import { canAccessAdmin, getRoleFromPayload } from '../roles'
import { Button, Card, ErrorBox, JsonView, Spinner, TextInput } from '../ui'

function getStr(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

export function CompaniesPage() {
  const auth = useAuth()
  const role = getRoleFromPayload(auth.payload)
  const isAdmin = canAccessAdmin(role)

  const loader = useCallback(() => listCompanies(), [])
  const { data, error, loading, reload } = useAsyncData(loader)
  const items = useMemo(() => unwrapList(data) ?? [], [data])

  const [selected, setSelected] = useState<unknown | null>(null)
  const [details, setDetails] = useState<unknown | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [cName, setCName] = useState('Empresa Exemplo')
  const [cCnpj, setCCnpj] = useState('56.507.472/0001-90')
  const [cEmail, setCEmail] = useState('contato@empresaexemplo.com')
  const [cPhone, setCPhone] = useState('99999-9999')
  const [cImage, setCImage] = useState<File | null>(null)

  const [id, setId] = useState('')
  const [pPhone, setPPhone] = useState('')
  const [pImage, setPImage] = useState<File | null>(null)

  function selectItem(it: unknown) {
    setSelected(it)
    setDetails(null)
    const obj = unwrapObject(it)
    const nextId = pickId(it) ?? ''
    setId(nextId)
    if (obj) setPPhone(getStr(obj.phone))
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setActionError(null)
    try {
      await createCompany({ name: cName, cnpj: cCnpj, email: cEmail, phone: cPhone, image: cImage })
      setCImage(null)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onPatch(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setBusy(true)
    setActionError(null)
    try {
      await patchCompany(id, { phone: pPhone || undefined, image: pImage })
      setPImage(null)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onGet() {
    if (!id) return
    setBusy(true)
    setActionError(null)
    try {
      const d = await getCompany(id)
      setDetails(d)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!id) return
    if (!confirm(`Deletar empresa ${id}?`)) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteCompany(id)
      setDetails(null)
      setSelected(null)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-h">
        <h2>Empresas</h2>
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
                const cid = pickId(it) ?? `#${idx + 1}`
                const obj = unwrapObject(it)
                const name = obj ? getStr(obj.name) : ''
                return (
                  <button key={`${cid}-${idx}`} type="button" className={`list-item ${selected === it ? 'active' : ''}`} onClick={() => selectItem(it)}>
                    <div className="list-title">{name || cid}</div>
                    <div className="list-sub">{cid}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="muted">Nenhuma empresa retornada.</p>
          )}

          {selected ? (
            <>
              <div className="hr" />
              <JsonView value={selected} />
            </>
          ) : null}
        </Card>

        <div className="stack">
          {isAdmin ? (
            <Card title="Criar empresa (admin)">
              <form className="form" onSubmit={(e) => void onCreate(e)}>
                <TextInput label="Nome" value={cName} onChange={(e) => setCName(e.target.value)} required />
                <TextInput label="CNPJ" value={cCnpj} onChange={(e) => setCCnpj(e.target.value)} required />
                <TextInput label="Email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required />
                <TextInput label="Telefone" value={cPhone} onChange={(e) => setCPhone(e.target.value)} required />
                <label className="field">
                  <span className="field-label">Imagem</span>
                  <input className="input" type="file" accept="image/*" onChange={(e) => setCImage(e.target.files?.[0] ?? null)} />
                </label>
                <Button disabled={busy} type="submit">
                  {busy ? 'Enviando…' : 'Criar'}
                </Button>
              </form>
            </Card>
          ) : null}

          <Card
            title={isAdmin ? 'Gerenciar (Patch/Get/Delete)' : 'Consultar (Get)'}
            actions={
              <div className="row">
                <Button type="button" variant="secondary" onClick={() => void onGet()} disabled={busy || !id}>
                  Buscar
                </Button>
                {isAdmin ? (
                  <Button type="button" variant="danger" onClick={() => void onDelete()} disabled={busy || !id}>
                    Deletar
                  </Button>
                ) : null}
              </div>
            }
          >
            {isAdmin ? (
              <form className="form" onSubmit={(e) => void onPatch(e)}>
                <TextInput label="CompanieID" value={id} onChange={(e) => setId(e.target.value)} required />
                <TextInput label="Telefone (opcional)" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
                <label className="field">
                  <span className="field-label">Imagem (opcional)</span>
                  <input className="input" type="file" accept="image/*" onChange={(e) => setPImage(e.target.files?.[0] ?? null)} />
                </label>
                <Button disabled={busy} type="submit">
                  {busy ? 'Salvando…' : 'Patch'}
                </Button>
              </form>
            ) : (
              <div className="form">
                <TextInput label="CompanieID" value={id} onChange={(e) => setId(e.target.value)} required />
                <p className="muted small">Create/Patch/Delete exigem permissão de admin no backend.</p>
              </div>
            )}

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
