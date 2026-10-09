import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StaffProvisionModal from '../components/StaffProvisionModal.jsx'
import { authed, isSessionError } from '../lib/api.js'
import { messageFor } from '../lib/errors.js'
import { clearSession } from '../lib/session.js'

// Tier two of provisioning — the priest's own job, and the half the sysadmin cannot do.
//
//   GET  /api/users/managers                      own parish only
//   POST /api/users/managers                      { fullName }
//   POST /api/users/managers/:id/deactivate|reactivate|reset-password
//
// The whole router is `requireRole('priest')`, so there is no parish to choose: the
// priest's parish comes from his token, and `withActor` has Postgres enforce it. That
// is why the provision call sends only a name — passing a parishId would be ignored at
// best and is impossible to honour at worst, since RLS scopes the insert.
//
// It also means this page cannot exist before the priest has changed his temporary
// password: `requirePasswordChanged` guards the router, so every call here answers
// PASSWORD_CHANGE_REQUIRED 403 until he has.

function StatusPill({ status }) {
  const active = status === 'active'
  return (
    <span className={`status-pill ${active ? 'status-pill--active' : 'status-pill--inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function Managers() {
  const navigate = useNavigate()
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [busyUserId, setBusyUserId] = useState(null)

  // navigate(), not window.location — the app is on BrowserRouter today and moves to
  // HashRouter with the verifier slice. Setting window.location.hash works in one and
  // is silently ignored in the other, so a revoked session would do nothing at all.
  function endSession() {
    clearSession()
    navigate('/login', { replace: true })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const result = await authed({ path: '/api/users/managers' })

    if (isSessionError(result)) {
      endSession()
      return
    }
    if (!result.ok) {
      setError(messageFor(result))
      setLoading(false)
      return
    }
    setManagers(result.json.managers ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 6000)
  }

  async function handleProvision({ fullName }) {
    const result = await authed({
      method: 'POST',
      path: '/api/users/managers',
      body: { fullName },
    })
    if (isSessionError(result)) {
      endSession()
      return { error: 'Session ended.' }
    }
    if (!result.ok) return { error: messageFor(result) }

    await load()
    return {
      credentials: {
        fullName: result.json.user?.fullName ?? fullName,
        username: result.json.user?.username ?? '—',
        tempPassword: result.json.tempPassword,
      },
    }
  }

  async function managerAction(manager, action) {
    if (action === 'deactivate' && !window.confirm(`Deactivate ${manager.fullName}?`)) return
    setBusyUserId(manager.userId)
    const result = await authed({
      method: 'POST',
      path: `/api/users/managers/${manager.userId}/${action}`,
    })
    setBusyUserId(null)

    if (isSessionError(result)) {
      endSession()
      return
    }
    if (!result.ok) {
      setError(messageFor(result))
      return
    }

    await load()
    if (action === 'reset-password') {
      // An alert rather than a toast: a notice that fades would take an unrecoverable
      // credential with it.
      window.alert(
        `Temporary password for ${manager.fullName}:\n\n${result.json.tempPassword}\n\nShown once. They must change it at next sign in.`,
      )
      return
    }
    showNotice(
      `${manager.fullName} was ${action === 'deactivate' ? 'deactivated' : 'reactivated'}.`,
    )
  }

  const activeCount = managers.filter((manager) => manager.status === 'active').length

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Parish office</p>
          <h1>Parish managers</h1>
          <p className="lede">
            Managers run the parish office — encoding records, scheduling events and processing
            document requests. Only you can create their accounts.
          </p>
        </div>
        <p className="stat">
          <strong>{activeCount}</strong>
          active managers
        </p>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="page__actions">
        <button type="button" className="btn btn--gold" onClick={() => setProvisionOpen(true)}>
          Provision manager
        </button>
        <button type="button" className="btn btn--ghost" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading && managers.length === 0 ? (
        <p className="empty">Loading managers…</p>
      ) : managers.length === 0 ? (
        <p className="empty">
          No managers yet. Provision one so the parish office can encode records and process
          requests.
        </p>
      ) : (
        <section className="panel" aria-labelledby="managers-heading">
          <div className="panel__head">
            <div>
              <h2 id="managers-heading">Your parish</h2>
              <p className="muted panel__note">
                Accounts are never deleted — deactivating keeps the audit trail intact.
              </p>
            </div>
          </div>

          <ul className="priest-list">
            {managers.map((manager) => (
              <li key={manager.userId} className="priest-list__row">
                <div>
                  <strong>{manager.fullName}</strong>
                  <p className="muted">
                    <span className="mono">{manager.username}</span>
                    {manager.mustChangePassword ? ' · temporary password not yet changed' : ''}
                  </p>
                </div>
                <div className="form-actions__buttons">
                  <StatusPill status={manager.status} />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => managerAction(manager, 'reset-password')}
                    disabled={busyUserId === manager.userId}
                  >
                    Reset password
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost priest-list__remove"
                    onClick={() =>
                      managerAction(
                        manager,
                        manager.status === 'active' ? 'deactivate' : 'reactivate',
                      )
                    }
                    disabled={busyUserId === manager.userId}
                  >
                    {manager.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StaffProvisionModal
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        onProvision={handleProvision}
        roleLabel="parish manager"
        scopeLabel="your parish"
      />
    </div>
  )
}
