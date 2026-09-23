import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { clearSession, getSession } from '../lib/session.js'

export default function UserLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getSession()
  const onParishes = location.pathname === '/' || location.pathname.startsWith('/parish')

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <NavLink to="/" className="topbar__brand">
            <Logo compact />
          </NavLink>

          <nav className="tabs" aria-label="User">
            <NavLink to="/" end className={`tabs__link ${onParishes ? 'is-active' : ''}`}>
              Parishes
            </NavLink>
            <NavLink
              to="/verify"
              className={({ isActive }) => `tabs__link ${isActive ? 'is-active' : ''}`}
            >
              Verify document
            </NavLink>
          </nav>

          <div className="topbar__user">
            <div className="avatar" aria-hidden="true">
              {(user?.name || 'P').slice(0, 1)}
            </div>
            <div className="topbar__meta">
              <p className="topbar__name">{user?.name || 'Parishioner'}</p>
              <p className="topbar__role">User view</p>
            </div>
            <button type="button" className="btn btn--ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="stage">
        <Outlet />
      </main>

      <footer className="foot">
        <p>PATRON · Verifiable sacramental records for Catholic parishes</p>
      </footer>
    </div>
  )
}
