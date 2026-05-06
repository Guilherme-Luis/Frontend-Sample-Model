import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { listCompanies, listFiles, listNotifications, listOrders, listProducts, listUsers } from '../api'
import { useAuth } from '../auth'
import { unwrapList, unwrapObject } from '../data'
import { useAsyncData } from '../hooks'
import { canAccessAdmin, getRoleFromPayload } from '../roles'
import { Card, InlineCode, Spinner } from '../ui'

export function DashboardPage() {
  const auth = useAuth()
  const role = getRoleFromPayload(auth.payload)
  const isAdmin = canAccessAdmin(role)

  const loader = useCallback(async () => {
    const res = await Promise.all([
      listProducts(),
      listOrders(),
      listUsers(),
      listCompanies(),
      listNotifications(),
      listFiles(),
    ])
    return {
      products: res[0],
      orders: res[1],
      users: res[2],
      companies: res[3],
      notifications: res[4],
      files: res[5],
    }
  }, [])

  const { data, loading, error, reload } = useAsyncData(loader)
  const productsCount = useMemo(() => unwrapList((data as any)?.products)?.length ?? null, [data])
  const ordersSummary = useMemo(() => unwrapObject((data as any)?.orders), [data])
  const ordersCount = useMemo(() => {
    const v = ordersSummary?.totalOrders
    return typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : unwrapList((data as any)?.orders)?.length ?? null
  }, [ordersSummary, data])
  const ordersTotalValue = useMemo(() => {
    const v = ordersSummary?.totalValue
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(v.replace(',', '.'))
      return Number.isFinite(n) ? n : null
    }
    return null
  }, [ordersSummary])
  const usersCount = useMemo(() => unwrapList((data as any)?.users)?.length ?? null, [data])
  const companiesCount = useMemo(() => unwrapList((data as any)?.companies)?.length ?? null, [data])
  const notificationsCount = useMemo(() => unwrapList((data as any)?.notifications)?.length ?? null, [data])
  const filesCount = useMemo(() => unwrapList((data as any)?.files)?.length ?? null, [data])

  return (
    <div className="page">
      <div className="page-h">
        <h2>Visão geral</h2>
        <p className="muted">
          Token ativo: <InlineCode>{auth.token ? 'sim' : 'não'}</InlineCode> • Role:{' '}
          <InlineCode>{role}</InlineCode>
        </p>
      </div>

      {loading ? <Spinner /> : null}
      {error ? <p className="muted">Falha ao carregar métricas. Veja os detalhes nas telas.</p> : null}

      <div className="grid">
        <Card title="Catálogo">
          <p className="muted">Acompanhe o catálogo e teste o fluxo de compra.</p>
          <p className="muted small">
            Produtos: <InlineCode>{productsCount ?? '—'}</InlineCode> • Ir para{' '}
            <Link to="/">Catálogo</Link>
          </p>
        </Card>
        <Card title="Checkout">
          <p className="muted">Finalize um pedido a partir do carrinho.</p>
          <p className="muted small">
            Ir para <Link to="/checkout">Checkout</Link>
          </p>
        </Card>
        <Card title="Pedidos">
          <p className="muted">Crie pedidos e atualize status.</p>
          <p className="muted small">
            Pedidos: <InlineCode>{ordersCount ?? '—'}</InlineCode> • Ir para{' '}
            <Link to="/orders">Pedidos</Link>
          </p>
          {ordersTotalValue !== null ? (
            <p className="muted small">
              Total: <InlineCode>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ordersTotalValue)}</InlineCode>
            </p>
          ) : null}
        </Card>
      </div>

      <div className="grid">
        <Card title="Usuários">
          <p className="muted">Listagem, update e (admin) role.</p>
          <p className="muted small">
            Usuários: <InlineCode>{usersCount ?? '—'}</InlineCode> • Ir para <Link to="/users">Usuários</Link>
          </p>
        </Card>
        <Card title="Empresas">
          <p className="muted">Listagem e detalhes; (admin) create/patch/delete.</p>
          <p className="muted small">
            Empresas: <InlineCode>{companiesCount ?? '—'}</InlineCode> • Ir para <Link to="/companies">Empresas</Link>
          </p>
        </Card>
        <Card title="Notificações & Arquivos">
          <p className="muted">(admin) create/update/delete notificações; arquivos exigem auth.</p>
          <p className="muted small">
            Notificações: <InlineCode>{notificationsCount ?? '—'}</InlineCode> • Arquivos: <InlineCode>{filesCount ?? '—'}</InlineCode>
          </p>
          <p className="muted small">
            <Link to="/notifications">Notificações</Link> • <Link to="/files">Arquivos</Link>
          </p>
        </Card>
      </div>

      {isAdmin ? (
        <div className="row">
          <Link className="muted small" to="/products">
            Produtos (admin)
          </Link>
        </div>
      ) : null}

      <div className="row">
        <Link className="muted small" to="/settings">
          Configurações
        </Link>
        <button className="btn btn-ghost" type="button" onClick={() => void reload()}>
          Recarregar métricas
        </button>
      </div>
    </div>
  )
}
