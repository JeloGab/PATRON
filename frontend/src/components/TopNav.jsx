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
  { to: '/priest/managers', label: 'Parish managers' },
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
          {/* The name block is the way to /account in all four navigations. /account is
              a top-level route outside every layout, so this link leaves the layout
              rather than navigating within it. */}
          <NavLink to="/account" className="topbar__meta" aria-label="Your account">
            <p className="topbar__name">{session?.name || session?.email || 'Parish office'}</p>
            <p className="topbar__role">Parish manager</p>
          </NavLink>
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
          <NavLink to="/account" className="topbar__meta" aria-label="Your account">
            <p className="topbar__name">{session?.name || 'Parish priest'}</p>
            <p className="topbar__role">Parish priest</p>
          </NavLink>
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
          <NavLink to="/account" className="topbar__meta" aria-label="Your account">
            <p className="topbar__name">{session?.name || 'System admin'}</p>
            <p className="topbar__role">System admin</p>
          </NavLink>
          <SignOut />
        </div>
      </div>
    </header>
  )
}

function UserNav() {
  const { pathname } = useLocation()
  const session = getSession()
  const onParishes = pathname === '/user' || pathname.startsWith('/user/parish')
  const onRequests = pathname.startsWith('/user/requests')
  const initial = (session?.name || 'P').slice(0, 1).toUpperCase()

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink to={session ? '/user' : '/login'} className="topbar__brand">
          <Logo compact />
        </NavLink>

        <div className="topbar__user">
          {session ? (
            <>
              <div className="avatar" aria-hidden="true">
                {initial}
              </div>
              <NavLink to="/account" className="topbar__meta" aria-label="Your account">
                <p className="topbar__name">{session.name || 'Parishioner'}</p>
                <p className="topbar__role">Parishioner</p>
              </NavLink>
              <SignOut />
            </>
          ) : (
            <NavLink to="/login" className="btn btn--ghost">
              Sign in
            </NavLink>
          )}
        </div>
      </div>

      {/* Second row, like the priest and manager navigations, so this strip is
          centred by the same rule instead of needing one of its own. In a single row
          it was a flex item between the brand and the account block, which can only
          ever be centred in the space those two leave over — never on the page.

          Two tabs signed in, one signed out: "My requests" has nothing to show
          without a session, and /verify is reachable from the sign-in page and from
          every certificate's QR. */}
      <div className="topbar__tabs">
        <nav className="tabs" aria-label="Parishioner">
          <NavLink to="/user" end className={`tabs__link ${onParishes ? 'is-active' : ''}`}>
            Parishes
          </NavLink>
          {session && (
            <NavLink to="/user/requests" className={`tabs__link ${onRequests ? 'is-active' : ''}`}>
              My requests
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}

export default function TopNav() {
  const session = getSession()
  if (session?.role === 'priest') return <PriestNav />
  if (session?.role === 'sysadmin') return <AdminNav />
  if (session?.role === 'manager') return <ManagerNav />
  return <UserNav />
}
