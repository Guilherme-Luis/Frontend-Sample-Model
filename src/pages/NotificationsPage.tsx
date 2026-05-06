import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createNotification,
  deleteNotification,
  listNotifications,
  readNotification,
  updateNotification,
} from '../api'
import { useAuth } from '../auth'
import { pickId, unwrapList, unwrapObject } from '../data'
import { useAsyncData } from '../hooks'
import { canAccessAdmin, getRoleFromPayload } from '../roles'
import { Button, Card, ErrorBox, JsonView, Spinner, TextArea, TextInput } from '../ui'

function getStr(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

export function NotificationsPage() {
  const auth = useAuth()
  const role = getRoleFromPayload(auth.payload)
  const isAdmin = canAccessAdmin(role)

  const loader = useCallback(() => listNotifications(), [])
  const { data, error, loading, reload } = useAsyncData(loader)
  const items = useMemo(() => unwrapList(data) ?? [], [data])

  const [selected, setSelected] = useState<unknown | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [cTitle, setCTitle] = useState('Pedido confirmado')
  const [cMessage, setCMessage] = useState('Seu pedido foi confirmado com sucesso')
  const [cType, setCType] = useState('EMAIL')

  const [id, setId] = useState('')
  const [uTitle, setUTitle] = useState('')
  const [uMessage, setUMessage] = useState('')
  const [uType, setUType] = useState('EMAIL')
  const [uRead, setURead] = useState(false)

  function selectItem(it: unknown) {
    setSelected(it)
    const obj = unwrapObject(it)
    const nid = pickId(it) ?? ''
    setId(nid)
    if (obj) {
      setUTitle(getStr(obj.title))
      setUMessage(getStr(obj.message))
      setUType(getStr(obj.type) || 'EMAIL')
      setURead(Boolean(obj.read))
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setActionError(null)
    try {
      await createNotification({ title: cTitle, message: cMessage, type: cType })
      await reload()
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
      await updateNotification(id, { title: uTitle, message: uMessage, type: uType, read: uRead })
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onRead() {
    if (!id) return
    setBusy(true)
    setActionError(null)
    try {
      await readNotification(id)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!id) return
    if (!confirm(`Deletar notificação ${id}?`)) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteNotification(id)
      setId('')
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
        <h2>Notificações</h2>
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
                const nid = pickId(it) ?? `#${idx + 1}`
                const obj = unwrapObject(it)
                const title = obj ? getStr(obj.title) : ''
                const read = obj ? Boolean(obj.read) : false
                return (
                  <button key={`${nid}-${idx}`} type="button" className={`list-item ${selected === it ? 'active' : ''}`} onClick={() => selectItem(it)}>
                    <div className="list-title">
                      {title || nid} {read ? '' : <span className="pill pill-warn">NOVO</span>}
                    </div>
                    <div className="list-sub">{nid}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="muted">Nenhuma notificação retornada.</p>
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
            <Card title="Criar notificação (admin)">
              <form className="form" onSubmit={(e) => void onCreate(e)}>
                <TextInput label="Título" value={cTitle} onChange={(e) => setCTitle(e.target.value)} required />
                <TextArea label="Mensagem" value={cMessage} onChange={(e) => setCMessage(e.target.value)} required />
                <TextInput label="Tipo" value={cType} onChange={(e) => setCType(e.target.value)} required />
                <Button disabled={busy} type="submit">
                  {busy ? 'Enviando…' : 'Criar'}
                </Button>
              </form>
            </Card>
          ) : null}

          <Card
            title={isAdmin ? 'Atualizar / Ler / Deletar' : 'Ler'}
            actions={
              <div className="row">
                <Button type="button" variant="secondary" onClick={() => void onRead()} disabled={busy || !id}>
                  Marcar como lida
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
              <form className="form" onSubmit={(e) => void onUpdate(e)}>
                <TextInput label="NotificationID" value={id} onChange={(e) => setId(e.target.value)} required />
                <TextInput label="Título" value={uTitle} onChange={(e) => setUTitle(e.target.value)} required />
                <TextArea label="Mensagem" value={uMessage} onChange={(e) => setUMessage(e.target.value)} required />
                <TextInput label="Tipo" value={uType} onChange={(e) => setUType(e.target.value)} required />
                <label className="field row">
                  <span className="field-label">Read</span>
                  <input type="checkbox" checked={uRead} onChange={(e) => setURead(e.target.checked)} />
                </label>
                <Button disabled={busy} type="submit">
                  {busy ? 'Salvando…' : 'Atualizar'}
                </Button>
              </form>
            ) : (
              <div className="form">
                <TextInput label="NotificationID" value={id} onChange={(e) => setId(e.target.value)} required />
                <p className="muted small">Create/Update/Delete exigem permissão de admin no backend.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
