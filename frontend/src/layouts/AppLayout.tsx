import {
  ArrowUpRight,
  Boxes,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useResource } from '../hooks/useResource'
import type { HealthResponse } from '../types/api'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/vendors', label: 'Vendors', icon: Truck },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
]

export function AppLayout() {
  const health = useResource<HealthResponse>('/api/health')
  const location = useLocation()
  const section =
    links.find((link) => link.to !== '/' && location.pathname.startsWith(link.to))?.label ||
    'Dashboard'
  useEffect(() => {
    document.title = `${section} · StockPilot`
  }, [section])
  useEffect(() => {
    const interval = window.setInterval(health.refresh, 30000)
    return () => window.clearInterval(interval)
  }, [health.refresh])
  const connected = health.data?.status === 'UP' && !health.error

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink className="brand" to="/" aria-label="StockPilot home">
          <span className="brand-mark">
            <Boxes size={23} />
          </span>
          <span>StockPilot</span>
        </NavLink>
        <div className="workspace-switch">
          <span className="workspace-avatar">SP</span>
          <div>
            <strong>StockPilot</strong>
            <span>Operations workspace</span>
          </div>
          <PanelLeftClose size={15} aria-hidden="true" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {to === '/purchase-orders' && <span className="soon-tag">Soon</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="phase-note">
            <span className="phase-tag">PHASE 01</span>
            <p>
              A foundation for
              <br />
              everyday operations.
            </p>
            <span>
              Catalog & vendor management <ArrowUpRight size={13} />
            </span>
          </div>
          <button
            className={`api-status ${connected ? 'connected' : ''}`}
            onClick={health.refresh}
            title="Click to check backend connectivity"
            aria-label="Check API status"
          >
            <span className="status-dot" />
            API Status: {connected ? 'Connected' : health.loading ? 'Checking…' : 'Disconnected'}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <div className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{section}</strong>
          </div>
          <span className="environment-label">
            <span className="status-dot" />
            Local workspace
          </span>
        </div>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>StockPilot</span>
          <span>Purchasing & inventory operations</span>
        </footer>
      </div>
    </div>
  )
}
