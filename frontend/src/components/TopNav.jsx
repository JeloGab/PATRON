import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useParish } from '../context/ParishContext.jsx'
import { clearSession, getSession } from '../lib/session.js'
import Logo from './Logo.jsx'

const MANAGER_LINKS = [
  { to: '/manager', label: 'Dashboard', end: true },
  { to: '/manager/schedule', label: 'Event scheduling', also: ['/manager/events'] },
  { to: '/manager/applications', label: 'Sacrament applications' },
  { to: '/manager/records', label: 'Sacramental records' },
  { to: '/manager/documents', label: 'Document requests' },
  { to: '/manager/announcements', label: 'Announcements' },
]

const PRIEST_LINKS = [
  { to: '/priest', label: 'My calendar', end: true },
  { to: '/priest/approvals', label: 'Pending approvals' },
]

function isCurrent(item, pathname) {
  if (item.end) return pathname === item.to
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true
  return item.also?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function SignOut() {
  const navigate = useNavigate()

  function signOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <button type="button" className="btn btn--ghost" onClick={signOut}>
      Sign out
    </button>
  )
}

function ManagerNav() {
  const { pathname } = useLocation()
  const session = getSession()
  const initial = (session?.name || session?.email || 'P').slice(0, 1).toUpperCase()

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink to="/manager" className="topbar__brand">
          <Logo compact />
        </NavLink>

        <div className="topbar__user">
          <div className="avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="topbar__meta">
            <p className="topbar__name">{session?.name || session?.email || 'Parish office'}</p>
            <p className="topbar__role">Parish manager</p>
          </div>
          <SignOut />
        </div>
      </div>

      <div className="topbar__tabs">
        <nav className="tabs" aria-label="Parish manager">
          {MANAGER_LINKS.map((item) => {
            const current = isCurrent(item, pathname)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`tabs__link ${current ? 'is-active' : ''}`}
                aria-current={current ? 'page' : undefined}
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

function PriestNav() {
  const { pathname } = useLocation()
  const session = getSession()
  const { pendingCount } = useParish()
  const initial = (session?.name || 'P').slice(0, 1).toUpperCase()

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink to="/priest" className="topbar__brand">
          <Logo compact />
        </NavLink>

        <div className="topbar__user">
          <div className="avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="topbar__meta">
            <p className="topbar__name">{session?.name || 'Parish priest'}</p>
            <p className="topbar__role">Parish priest</p>
          </div>
          <SignOut />
        </div>
      </div>

      <div className="topbar__tabs">
        <nav className="tabs" aria-label="Parish priest">
          {PRIEST_LINKS.map((item) => {
            const current = isCurrent(item, pathname)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`tabs__link ${current ? 'is-active' : ''}`}
                aria-current={current ? 'page' : undefined}
              >
                {item.to === '/priest/approvals' && pendingCount > 0 && (
                  <span className="notif" aria-label={`${pendingCount} pending`}>
                    {pendingCount}
                  </span>
                )}
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

function AdminNav() {
  const session = getSession()
  const initial = (session?.name || 'A').slice(0, 1).toUpperCase()

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="topbar__brand">
          <Logo compact />
        </div>

        <p className="topbar__section">Registered parishes</p>

        <div className="topbar__user">
          <div className="avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="topbar__meta">
            <p className="topbar__name">{session?.name || 'System admin'}</p>
            <p className="topbar__role">System admin</p>
          </div>
          <SignOut />
        </div>
      </div>
    </header>
  )
}

export default function TopNav() {
  const session = getSession()
  if (session?.role === 'priest') return <PriestNav />
  if (session?.role === 'system_admin') return <AdminNav />
  return <ManagerNav />
}
