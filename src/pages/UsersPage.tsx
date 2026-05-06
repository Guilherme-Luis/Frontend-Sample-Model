import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { deleteUser, getUser, listUsers, updateUser, updateUserRole } from '../api'
import { useAuth } from '../auth'
import { pickId, unwrapList, unwrapObject } from '../data'
import { useAsyncData } from '../hooks'
import { canAccessAdmin, getRoleFromPayload } from '../roles'
import { Button, Card, ErrorBox, JsonView, Spinner, TextInput } from '../ui'

function getStr(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

export function UsersPage() {
  const auth = useAuth()
  const roleFromToken = getRoleFromPayload(auth.payload)
  const isAdmin = canAccessAdmin(roleFromToken)

  const loader = useCallback(() => listUsers(), [])
  const { data, error, loading, reload } = useAsyncData(loader)
  const items = useMemo(() => unwrapList(data) ?? [], [data])

  const [selected, setSelected] = useState<unknown | null>(null)
  const [details, setDetails] = useState<unknown | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('USER')

  function selectItem(it: unknown) {
    setSelected(it)
    setDetails(null)
    const obj = unwrapObject(it)
    const uid = pickId(it) ?? ''
    setId(uid)
    if (obj) {
      setName(getStr(obj.name))
      setEmail(getStr(obj.email))
      setRole(getStr(obj.role) || 'USER')
    }
  }

  async function onGet() {
    if (!id) return
    setBusy(true)
    setActionError(null)
    try {
      const d = await getUser(id)
      setDetails(d)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setBusy(true)
    setActionError(null)
    try {
      await updateUser(id, { name, email })
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onRole(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setBusy(true)
    setActionError(null)
    try {
      await updateUserRole(id, role)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!id) return
    if (!confirm(`Deletar usuário ${id}?`)) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteUser(id)
      setId('')
      setSelected(null)
      setDetails(null)
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
        <h2>Usuários</h2>
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
                const uid = pickId(it) ?? `#${idx + 1}`
                const obj = unwrapObject(it)
                const label = obj ? getStr(obj.name) || getStr(obj.email) : ''
                return (
                  <button key={`${uid}-${idx}`} type="button" className={`list-item ${selected === it ? 'active' : ''}`} onClick={() => selectItem(it)}>
                    <div className="list-title">{label || uid}</div>
                    <div className="list-sub">{uid}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="muted">Nenhum usuário retornado.</p>
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
            title="Gerenciar"
            actions={
              <div className="row">
                <Button type="button" variant="secondary" onClick={() => void onGet()} disabled={busy || !id}>
                  Buscar
                </Button>
                <Button type="button" variant="danger" onClick={() => void onDelete()} disabled={busy || !id}>
                  Deletar
                </Button>
              </div>
            }
          >
            <form className="form" onSubmit={(e) => void onUpdate(e)}>
              <TextInput label="UserID" value={id} onChange={(e) => setId(e.target.value)} required />
              <TextInput label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
              <TextInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button disabled={busy} type="submit">
                {busy ? 'Salvando…' : 'Atualizar usuário'}
              </Button>
            </form>

            {isAdmin ? (
              <>
                <div className="hr" />
                <form className="form" onSubmit={(e) => void onRole(e)}>
                  <TextInput label="Role" value={role} onChange={(e) => setRole(e.target.value)} required />
                  <Button disabled={busy} type="submit">
                    {busy ? 'Salvando…' : 'Atualizar role'}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="hr" />
                <p className="muted small">Alterar role exige permissão de admin no backend.</p>
              </>
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
