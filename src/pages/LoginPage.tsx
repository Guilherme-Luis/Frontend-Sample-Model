import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getEffectiveConfig, registerUser } from '../api'
import { useAuth } from '../auth'
import { Button, Card, ErrorBox, InlineCode, TextInput } from '../ui'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const from = params.get('from') ?? '/'

  const [email, setEmail] = useState('usuario@gmail.com')
  const [password, setPassword] = useState('Mn@123456')
  const [name, setName] = useState('usuario123')
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const cfg = useMemo(() => getEffectiveConfig(), [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      if (mode === 'register') {
        await registerUser(name, email, password)
        setOkMsg('Cadastro realizado. Agora faça login.')
        setMode('login')
      } else {
        await auth.login(email, password)
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page center-page">
      <div className="stack">
        <div className="hero-title">
          <div className="badge">M</div>
          <div>
            <h1>Mercado</h1>
            <p className="muted">
              API: <InlineCode>{cfg.apiOrigin}</InlineCode> / Env:{' '}
              <InlineCode>{cfg.environment || '(vazio)'}</InlineCode>
            </p>
          </div>
        </div>

        <Card
          title={mode === 'login' ? 'Entrar' : 'Criar conta'}
          actions={
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
            >
              {mode === 'login' ? 'Cadastrar' : 'Voltar'}
            </Button>
          }
        >
          {okMsg && <div className="alert alert-success">{okMsg}</div>}
          <ErrorBox error={error} />

          <form className="form" onSubmit={(e) => void onSubmit(e)}>
            {mode === 'register' && (
              <TextInput
                label="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            )}
            <TextInput
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <TextInput
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />

            <Button type="submit" disabled={busy}>
              {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
            </Button>

            <p className="muted small">
              Ajuste a API em <Link to="/settings">Configurações</Link> (abre mesmo sem login).
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
