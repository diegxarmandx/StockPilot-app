import {
  Boxes,
  LayoutDashboard,
  Package,
  Building2,
  ClipboardList,
  History,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
  { to: '/inventory', label: 'Inventory', icon: History },
]
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`}
        >
          <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <NavLink className="brand" to="/" aria-label="StockPilot home" onClick={onNavigate}>
      <span className="brand-mark">
        <Boxes size={22} aria-hidden="true" />
      </span>
      <span>StockPilot</span>
    </NavLink>
  )
}
export function AppLayout() {
  const location = useLocation()
  const drawer = useRef<HTMLDialogElement>(null)
  const section =
    links.find((link) => link.to !== '/' && location.pathname.startsWith(link.to))?.label ||
    'Dashboard'
  useEffect(() => {
    document.title = `${section} · StockPilot`
  }, [section])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)')
    const close = () => {
      if (media.matches) drawer.current?.close()
    }
    media.addEventListener('change', close)
    return () => media.removeEventListener('change', close)
  }, [])
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">WORKSPACE</p>
        <Navigation />
        <div className="sidebar-footer">
          <Boxes size={16} aria-hidden="true" />
          <span>Purchasing & inventory</span>
        </div>
      </aside>
      <dialog
        ref={drawer}
        className="navigation-drawer"
        aria-label="Navigation"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button')
          const first = controls[0]
          const last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect()
            if (event.clientX > bounds.right) drawer.current?.close()
          }
        }}
      >
        <div className="drawer-heading">
          <Brand onNavigate={() => drawer.current?.close()} />
          <button
            className="icon-button"
            aria-label="Close navigation"
            onClick={() => drawer.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <Navigation onNavigate={() => drawer.current?.close()} />
      </dialog>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            aria-haspopup="dialog"
            onClick={() => drawer.current?.showModal()}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>StockPilot</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>{section}</strong>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>StockPilot</span>
          <span>Purchasing & inventory</span>
        </footer>
      </div>
    </div>
  )
}
