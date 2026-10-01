import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { clearSession, getSession } from '../lib/session.js'

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getSession()
  const onParishes = location.pathname === '/' || location.pathname.startsWith('/parish')
  const onVerify = location.pathname === '/verify'
  const onRequests = location.pathname.startsWith('/requests')

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink to={user ? '/' : '/login'} className="topbar__brand">
          <Logo compact />
        </NavLink>

        <nav className="tabs" aria-label="Main">
          <NavLink to="/" end className={`tabs__link ${onParishes ? 'is-active' : ''}`}>
            Parishes
          </NavLink>
          {user && (
            <NavLink to="/requests" className={`tabs__link ${onRequests ? 'is-active' : ''}`}>
              My requests
            </NavLink>
          )}
          <NavLink to="/verify" className={`tabs__link ${onVerify ? 'is-active' : ''}`}>
            Verify document
          </NavLink>
        </nav>

        <div className="topbar__user">
          {user ? (
            <>
              <div className="avatar" aria-hidden="true">
                {(user.name || 'P').slice(0, 1)}
              </div>
              <div className="topbar__meta">
                <p className="topbar__name">{user.name || 'Parishioner'}</p>
                <p className="topbar__role">User view</p>
              </div>
              <button type="button" className="btn btn--ghost" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn btn--ghost">
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  )
}
