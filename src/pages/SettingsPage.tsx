import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  clearConfigOverrides,
  decodeJwtPayload,
  getAuthToken,
  getEffectiveConfig,
  getRuntimeConfig,
  saveConfig,
} from '../api'
import { Button, Card, ErrorBox, InlineCode, JsonView, TextInput } from '../ui'

export function SettingsPage() {
  const runtime = useMemo(() => getRuntimeConfig(), [])
  const [cfg, setCfg] = useState(() => getEffectiveConfig())
  const [apiOrigin, setApiOrigin] = useState(cfg.apiOrigin)
  const [environment, setEnvironment] = useState(cfg.environment)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const token = getAuthToken()
  const payload = token ? decodeJwtPayload(token) : null

  function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const next = saveConfig({ apiOrigin, environment })
      setCfg(next)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  function onReset() {
    clearConfigOverrides()
    const next = getEffectiveConfig()
    setCfg(next)
    setApiOrigin(next.apiOrigin)
    setEnvironment(next.environment)
  }

  return (
    <div className="page">
      <div className="page-h">
        <h2>Configurações</h2>
        <p className="muted">
          A app usa <InlineCode>public/app-config.js</InlineCode> como padrão e permite override via
          LocalStorage.
        </p>
      </div>

      <div className="grid-2">
        <Card
          title="Backend"
          actions={
            <div className="row">
              <Button type="button" variant="secondary" onClick={onReset}>
                Resetar override
              </Button>
            </div>
          }
        >
          <ErrorBox error={error} />
          <form className="form" onSubmit={onSave}>
            <TextInput
              label="API Origin (host)"
              placeholder="https://api.suaempresa.com"
              value={apiOrigin}
              onChange={(e) => setApiOrigin(e.target.value)}
              required
            />
            <TextInput
              label="Environment (segmento no path)"
              placeholder="prod / dev / v1 / (vazio)"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
            />
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>

          <div className="hr" />
          <p className="muted small">
            Base atual: <InlineCode>{cfg.apiOrigin}</InlineCode> / Env:{' '}
            <InlineCode>{cfg.environment || '(vazio)'}</InlineCode>
          </p>
          <p className="muted small">
            Padrão (runtime): <InlineCode>{runtime.apiOrigin ?? '(não definido)'}</InlineCode> /{' '}
            <InlineCode>{runtime.environment ?? '(não definido)'}</InlineCode>
          </p>
        </Card>

        <Card title="Auth">
          <p className="muted small">
            Token: <InlineCode>{token ? 'presente' : 'ausente'}</InlineCode>
          </p>
          {payload ? <JsonView value={payload} /> : <p className="muted">Faça login para ver o payload do JWT.</p>}
        </Card>
      </div>
    </div>
  )
}
