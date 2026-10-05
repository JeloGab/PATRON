import { useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { clearSession, getSession } from '../lib/session.js'

export default function TopNav() {
  const navigate = useNavigate()
  const user = getSession()

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="topbar__brand">
          <Logo compact />
        </div>

        <p className="topbar__section">Registered parishes</p>

        <div className="topbar__user">
          {user && (
            <>
              <div className="avatar" aria-hidden="true">
                {(user.name || 'A').slice(0, 1)}
              </div>
              <div className="topbar__meta">
                <p className="topbar__name">{user.name || 'System admin'}</p>
                <p className="topbar__role">System admin</p>
              </div>
              <button type="button" className="btn btn--ghost" onClick={logout}>
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
