import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getSession } from '../lib/session.js'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'
import Tabs from './Tabs.jsx'

const MANAGER_LINKS = [
  { to: '/manager', label: 'Dashboard', end: true },
  { to: '/manager/schedule', label: 'Event scheduling', also: ['/manager/events'] },
  { to: '/manager/roster', label: 'Event rosters' },
  { to: '/manager/records', label: 'Sacramental records' },
  { to: '/manager/documents', label: 'Document requests' },
  { to: '/manager/announcements', label: 'Announcements' },
  { to: '/manager/parish', label: 'Parish profile' },
]

const PRIEST_LINKS = [
  { to: '/priest', label: 'My calendar', end: true },
  { to: '/priest/approvals', label: 'Pending approvals', badge: 'events' },
  { to: '/priest/documents', label: 'Document approvals', badge: 'documents' },
  { to: '/priest/announcements', label: 'Announcements', badge: 'announcements' },
  { to: '/priest/managers', label: 'Parish managers' },
  { to: '/priest/parish', label: 'Parish profile' },
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
          <Avatar initial={initial} hasPhoto={session?.hasPhoto} />
          <NavLink to="/account" className="topbar__meta" aria-label="Your account">
            <p className="topbar__name">{session?.name || session?.email || 'Parish office'}</p>
            <p className="topbar__role">Parish manager</p>
          </NavLink>
          <SignOut />
        </div>
      </div>

      <div className="topbar__tabs">
        <Tabs label="Parish manager">
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
        </Tabs>
      </div>
    </header>
  )
}

// The count is read by name off the layout's counts object, so adding a badge to
// another tab is one key in PRIEST_LINKS and one count in PriestLayout.
function Badge({ waiting }) {
  if (!waiting || waiting.count === 0) return null
  const shown = waiting.more ? `${waiting.count}+` : String(waiting.count)
  return (
    <span className="notif" aria-label={`${shown} waiting`}>
      {shown}
    </span>
  )
}

function PriestNav({ counts }) {
  const { pathname } = useLocation()
  const session = getSession()
  const initial = (session?.name || 'P').slice(0, 1).toUpperCase()

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink to="/priest" className="topbar__brand">
          <Logo compact />
        </NavLink>

        <div className="topbar__user">
          <Avatar initial={initial} hasPhoto={session?.hasPhoto} />
          <NavLink to="/account" className="topbar__meta" aria-label="Your account">
            <p className="topbar__name">{session?.name || 'Parish priest'}</p>
            <p className="topbar__role">Parish priest</p>
          </NavLink>
          <SignOut />
        </div>
      </div>

      <div className="topbar__tabs">
        <Tabs label="Parish priest">
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
                <Badge waiting={item.badge ? counts[item.badge] : null} />
                {item.label}
              </NavLink>
            )
          })}
        </Tabs>
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
          <Avatar initial={initial} hasPhoto={session?.hasPhoto} />
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
  const onFeed = pathname === '/feed'
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
              <Avatar initial={initial} hasPhoto={session?.hasPhoto} />
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

      <div className="topbar__tabs">
        <Tabs label="Parishioner">
          <NavLink to="/user" end className={`tabs__link ${onParishes ? 'is-active' : ''}`}>
            Parishes
          </NavLink>
          {session && (
            <NavLink to="/user/requests" className={`tabs__link ${onRequests ? 'is-active' : ''}`}>
              My requests
            </NavLink>
          )}
          <NavLink to="/feed" className={`tabs__link ${onFeed ? 'is-active' : ''}`}>
            Announcements
          </NavLink>
        </Tabs>
      </div>
    </header>
  )
}

export default function TopNav({ counts = {} }) {
  const session = getSession()
  if (session?.role === 'priest') return <PriestNav counts={counts} />
  if (session?.role === 'sysadmin') return <AdminNav />
  if (session?.role === 'manager') return <ManagerNav />
  return <UserNav />
}
