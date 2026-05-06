import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getEffectiveConfig } from './api'
import { useAuth } from './auth'
import { useCart } from './cart'
import { canAccessAdmin, getRoleFromPayload } from './roles'
import { Button } from './ui'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getUserId(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const v = payload.userId ?? payload.sub ?? payload.id
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null
}

export function AppShell() {
  const auth = useAuth()
  const cart = useCart()
  const config = getEffectiveConfig()
  const userId = getUserId(auth.payload)
  const role = getRoleFromPayload(auth.payload)
  const isAdmin = canAccessAdmin(role)
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const userLabel = useMemo(() => {
    if (!auth.isAuthenticated) return 'Visitante'
    return userId ? `User ${userId}` : 'Logado'
  }, [auth.isAuthenticated, userId])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      const t = e.target as Node | null
      if (!t) return
      if (menuRef.current && menuRef.current.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  async function onLogout() {
    setOpen(false)
    await auth.logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
            <div className="brand-badge">M</div>
            <div>
              <div className="brand-title">Mercado</div>
              <div className="brand-sub">Produtos frescos, checkout rápido</div>
            </div>
          </NavLink>

          <nav className="topnav">
            <NavLink to="/" end className={({ isActive }) => `topnav-link ${isActive ? 'active' : ''}`}>
              Produtos
            </NavLink>
            <NavLink to="/checkout" className={({ isActive }) => `topnav-link ${isActive ? 'active' : ''}`}>
              Carrinho <span className="muted small">({cart.totalItems})</span>
            </NavLink>
          </nav>

          <div className="top-actions" ref={menuRef}>
            <button type="button" className="menu-btn" onClick={() => setOpen((v) => !v)}>
              <span className={`status-dot ${auth.isAuthenticated ? 'on' : ''}`} />
              <span className="menu-label">{userLabel}</span>
            </button>

            {open ? (
              <div className="menu">
                <div className="menu-meta">
                  <div className="menu-meta-line">
                    API: <span className="mono">{config.apiOrigin}</span>
                  </div>
                  <div className="menu-meta-line">
                    Env: <span className="mono">{config.environment || '(vazio)'}</span>
                  </div>
                  {role !== 'UNKNOWN' ? (
                    <div className="menu-meta-line">
                      Role: <span className="mono">{role}</span>
                    </div>
                  ) : null}
                </div>

                <div className="menu-links">
                  <NavLink to="/settings" className="menu-link" onClick={() => setOpen(false)}>
                    Configurações
                  </NavLink>

                  {auth.isAuthenticated ? (
                    <>
                      <NavLink to="/app" className="menu-link" onClick={() => setOpen(false)}>
                        Dashboard
                      </NavLink>
                      <NavLink to="/orders" className="menu-link" onClick={() => setOpen(false)}>
                        Pedidos
                      </NavLink>
                      <NavLink to="/companies" className="menu-link" onClick={() => setOpen(false)}>
                        Empresas
                      </NavLink>
                      <NavLink to="/users" className="menu-link" onClick={() => setOpen(false)}>
                        Usuários
                      </NavLink>
                      <NavLink to="/notifications" className="menu-link" onClick={() => setOpen(false)}>
                        Notificações
                      </NavLink>
                      <NavLink to="/files" className="menu-link" onClick={() => setOpen(false)}>
                        Arquivos
                      </NavLink>
                      {isAdmin ? (
                        <NavLink to="/products" className="menu-link" onClick={() => setOpen(false)}>
                          Produtos (admin)
                        </NavLink>
                      ) : null}
                    </>
                  ) : (
                    <NavLink to="/login?from=%2F" className="menu-link" onClick={() => setOpen(false)}>
                      Entrar
                    </NavLink>
                  )}
                </div>

                <div className="menu-actions">
                  {auth.isAuthenticated ? (
                    <Button variant="secondary" onClick={() => void onLogout()}>
                      Sair
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.isAuthenticated) return children
  const from = `${location.pathname}${location.search}`
  return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (!auth.isAuthenticated) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />
  }
  const role = getRoleFromPayload(auth.payload)
  if (canAccessAdmin(role)) return children
  return <Navigate to="/app" replace />
}

