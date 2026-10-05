import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useParish } from '../context/ParishContext.jsx'
import { clearSession, getSession } from '../lib/session.js'
import Logo from './Logo.jsx'

const LINKS = [
  { to: '/', label: 'My calendar', end: true },
  { to: '/approvals', label: 'Pending approvals' },
]

export default function TopNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const { pendingCount } = useParish()
  const initial = (session?.name || 'P').slice(0, 1).toUpperCase()

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
            <p className="topbar__name">{session?.name || 'Parish priest'}</p>
            <p className="topbar__role">Parish priest</p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      <div className="topbar__tabs">
        <nav className="tabs" aria-label="Parish priest">
          {LINKS.map((item) => {
            const current = item.end ? pathname === '/' : pathname === item.to || pathname.startsWith(`${item.to}/`)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`tabs__link ${current ? 'is-active' : ''}`}
                aria-current={current ? 'page' : undefined}
              >
                {item.to === '/approvals' && pendingCount > 0 && (
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
