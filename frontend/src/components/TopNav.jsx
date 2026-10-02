import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { clearSession, getSession } from '../lib/session.js'

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/schedule', label: 'Event scheduling', also: ['/events'] },
  { to: '/applications', label: 'Sacrament applications' },
  { to: '/records', label: 'Sacramental records' },
  { to: '/documents', label: 'Document requests' },
  { to: '/announcements', label: 'Announcements' },
]

function isCurrent(item, pathname) {
  if (item.end) return pathname === '/'
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true
  return item.also?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export default function TopNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const initial = (session?.email || 'P').slice(0, 1).toUpperCase()

  function signOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink to="/" className="topbar__brand">
          <Logo compact />
        </NavLink>

        <div className="topbar__user">
          <div className="avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="topbar__meta">
            <p className="topbar__name">{session?.email || 'Parish office'}</p>
            <p className="topbar__role">Admin</p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      <div className="topbar__tabs">
        <nav className="tabs" aria-label="Parish manager">
          {LINKS.map((item) => {
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
