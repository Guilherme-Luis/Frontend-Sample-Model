import { useCallback, useMemo, useState } from 'react'
import { deleteFile, downloadFile, getFile, listFiles, uploadFile } from '../api'
import { pickId, unwrapList, unwrapObject } from '../data'
import { useAsyncData } from '../hooks'
import { Button, Card, ErrorBox, JsonView, Spinner, TextInput } from '../ui'

function getStr(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function FilesPage() {
  const loader = useCallback(() => listFiles(), [])
  const { data, error, loading, reload } = useAsyncData(loader)
  const items = useMemo(() => unwrapList(data) ?? [], [data])

  const [selected, setSelected] = useState<unknown | null>(null)
  const [details, setDetails] = useState<unknown | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [id, setId] = useState('')
  const [downloadName, setDownloadName] = useState('download.bin')

  function selectItem(it: unknown) {
    setSelected(it)
    setDetails(null)
    const fid = pickId(it) ?? ''
    setId(fid)
    const obj = unwrapObject(it)
    const name = obj ? (getStr(obj.filename) || getStr(obj.originalName) || getStr(obj.name)) : ''
    setDownloadName(name || `file-${fid || 'download'}`)
  }

  async function onUpload() {
    if (!fileToUpload) return
    setBusy(true)
    setActionError(null)
    try {
      await uploadFile(fileToUpload)
      setFileToUpload(null)
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
      const d = await getFile(id)
      setDetails(d)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onDownload() {
    if (!id) return
    setBusy(true)
    setActionError(null)
    try {
      const blob = await downloadFile(id)
      downloadBlob(blob, downloadName || `file-${id}`)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!id) return
    if (!confirm(`Deletar arquivo ${id}?`)) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteFile(id)
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
        <h2>Arquivos</h2>
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
                const fid = pickId(it) ?? `#${idx + 1}`
                const obj = unwrapObject(it)
                const label = obj
                  ? getStr(obj.filename) || getStr(obj.originalName) || getStr(obj.name)
                  : ''
                return (
                  <button key={`${fid}-${idx}`} type="button" className={`list-item ${selected === it ? 'active' : ''}`} onClick={() => selectItem(it)}>
                    <div className="list-title">{label || fid}</div>
                    <div className="list-sub">{fid}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="muted">Nenhum arquivo retornado.</p>
          )}

          {selected ? (
            <>
              <div className="hr" />
              <JsonView value={selected} />
            </>
          ) : null}
        </Card>

        <div className="stack">
          <Card title="Upload">
            <div className="form">
              <label className="field">
                <span className="field-label">Arquivo</span>
                <input className="input" type="file" onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)} />
              </label>
              <Button disabled={busy || !fileToUpload} type="button" onClick={() => void onUpload()}>
                {busy ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
          </Card>

          <Card
            title="Gerenciar (Get/Download/Delete)"
            actions={
              <div className="row">
                <Button type="button" variant="secondary" onClick={() => void onGet()} disabled={busy || !id}>
                  Buscar
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onDownload()} disabled={busy || !id}>
                  Download
                </Button>
                <Button type="button" variant="danger" onClick={() => void onDelete()} disabled={busy || !id}>
                  Deletar
                </Button>
              </div>
            }
          >
            <div className="form">
              <TextInput label="FileID" value={id} onChange={(e) => setId(e.target.value)} />
              <TextInput label="Nome do download" value={downloadName} onChange={(e) => setDownloadName(e.target.value)} />
            </div>

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
