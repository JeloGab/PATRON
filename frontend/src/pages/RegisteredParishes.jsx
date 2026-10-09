import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChurchMedia from '../components/ChurchMedia.jsx'
import RegisterParishModal from '../components/RegisterParishModal.jsx'
import StaffProvisionModal from '../components/StaffProvisionModal.jsx'
import { authed, isSessionError } from '../lib/api.js'
import { messageFor } from '../lib/errors.js'
import { accentFor, formatRegisteredDate, municipalityFromAddress } from '../lib/parishes.js'
import { clearSession } from '../lib/session.js'

// The sysadmin registry, reading the real API:
//
//   GET  /api/admin/parishes                         every parish, any status
//   POST /api/admin/parishes                         register
//   GET  /api/admin/priests                          every priest, each with parish_id
//   POST /api/admin/priests                          provision
//   POST /api/admin/priests/:id/deactivate|reactivate|reset-password
//
// Four fields the mock page showed are gone, each for its own reason:
//
//   diocese       no such column, and the whole system is one diocese — a filter with
//                 one value is noise.
//   parishioners  "parishioners belong to no parish" is a locked tenancy decision, so
//                 a per-parish headcount would misstate the architecture.
//   staffCount    replaced by a real PRIEST count. Managers are provisioned by priests
//                 through a priest-scoped route, so a sysadmin genuinely cannot see
//                 them — labelling priests as "staff" would be a quiet undercount.
//   accent        derived from the parish uuid instead, so a card keeps its colour.
//
// `EditParishModal` is not mounted: there is no sysadmin parish-edit route, and parish
// deactivation is a designed-but-unbuilt backlog item. A button that cannot work is
// worse than no button.

function StatusPill({ status }) {
  const active = status === 'active'
  return (
    <span className={`status-pill ${active ? 'status-pill--active' : 'status-pill--inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function RegisteredParishes() {
  const navigate = useNavigate()
  const [parishes, setParishes] = useState([])
  const [priests, setPriests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [provisionFor, setProvisionFor] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [busyUserId, setBusyUserId] = useState(null)

  // navigate(), not window.location — the app is on BrowserRouter today and moves to
  // HashRouter with the verifier slice. Setting window.location.hash works in one and
  // is silently ignored in the other, so a revoked session would do nothing at all.
  function endSession() {
    clearSession()
    navigate('/login', { replace: true })
  }

  // One request for every priest rather than one per parish: the list carries
  // `parishId` on each row, so the per-parish counts are a group-by on the client.
  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const [parishResult, priestResult] = await Promise.all([
      authed({ path: '/api/admin/parishes' }),
      authed({ path: '/api/admin/priests' }),
    ])

    if (isSessionError(parishResult) || isSessionError(priestResult)) {
      endSession()
      return
    }
    if (!parishResult.ok) {
      setError(messageFor(parishResult))
      setLoading(false)
      return
    }
    if (!priestResult.ok) {
      setError(messageFor(priestResult))
      setLoading(false)
      return
    }

    setParishes(parishResult.json.parishes ?? [])
    setPriests(priestResult.json.priests ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 6000)
  }

  const priestsByParish = useMemo(() => {
    const map = new Map()
    for (const priest of priests) {
      const key = priest.parishId
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(priest)
    }
    return map
  }, [priests])

  const list = parishes.filter((parish) => {
    const hay = `${parish.name} ${parish.address}`.toLowerCase()
    const matchesQuery = hay.includes(query.trim().toLowerCase())
    const matchesStatus = statusFilter === 'all' || parish.status === statusFilter
    return matchesQuery && matchesStatus
  })

  const selected = parishes.find((parish) => parish.parishId === selectedId) || null
  const selectedPriests = selected ? priestsByParish.get(selected.parishId) ?? [] : []

  async function handleRegister(payload) {
    const result = await authed({ method: 'POST', path: '/api/admin/parishes', body: payload })
    if (isSessionError(result)) {
      endSession()
      return 'Session ended.'
    }
    if (!result.ok) return messageFor(result)

    await load()
    showNotice(`${payload.name} was added to the registry.`)
    return null
  }

  async function handleProvision({ fullName }) {
    const result = await authed({
      method: 'POST',
      path: '/api/admin/priests',
      body: { fullName, parishId: provisionFor.parishId },
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

  // Deactivate, reactivate and reset-password are all POSTs with no body, so they
  // share one handler. `reset-password` returns a fresh temporary password, which is
  // shown once — exactly like provisioning.
  async function priestAction(priest, action) {
    if (action === 'deactivate' && !window.confirm(`Deactivate ${priest.fullName}?`)) return
    setBusyUserId(priest.userId)
    const result = await authed({
      method: 'POST',
      path: `/api/admin/priests/${priest.userId}/${action}`,
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
      // Deliberately a window.alert: a toast that fades would take an unrecoverable
      // credential with it.
      window.alert(
        `Temporary password for ${priest.fullName}:\n\n${result.json.tempPassword}\n\nShown once. They must change it at next sign in.`,
      )
      return
    }
    showNotice(
      `${priest.fullName} was ${action === 'deactivate' ? 'deactivated' : 'reactivated'}.`,
    )
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Registry</p>
          <h1>Registered parishes</h1>
          <p className="lede">
            Parishes onboarded to PATRON, their assigned priests, and registration status across the
            Diocese of Libmanan.
          </p>
        </div>
        <p className="stat">
          <strong>{parishes.length}</strong>
          parishes registered
        </p>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="page__actions">
        <button type="button" className="btn btn--gold" onClick={() => setRegisterOpen(true)}>
          Register parish
        </button>
        <button type="button" className="btn btn--ghost" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="toolbar toolbar--admin">
        <label className="search">
          <span className="sr-only">Search parishes</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or address…"
          />
        </label>
        <label className="select">
          <span className="sr-only">Filter by status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      {loading && parishes.length === 0 ? (
        <p className="empty">Loading the registry…</p>
      ) : list.length === 0 ? (
        <p className="empty">
          {parishes.length === 0
            ? 'No parishes registered yet. Register the first one to begin.'
            : 'No parish matches that search.'}
        </p>
      ) : (
        <ul className="grid">
          {list.map((parish) => {
            const parishPriests = priestsByParish.get(parish.parishId) ?? []
            const activeCount = parishPriests.filter((p) => p.status === 'active').length
            return (
              <li key={parish.parishId}>
                <button
                  type="button"
                  className="parish-card admin-parish-card parish-card--button"
                  onClick={() =>
                    setSelectedId(selectedId === parish.parishId ? null : parish.parishId)
                  }
                >
                  <ChurchMedia
                    id={parish.parishId}
                    accent={accentFor(parish.parishId)}
                    className="parish-card__media"
                    alt={parish.name}
                  >
                    <StatusPill status={parish.status} />
                  </ChurchMedia>
                  <div className="parish-card__body">
                    <h2>{parish.name}</h2>
                    <p className="muted">{municipalityFromAddress(parish.address)}</p>
                    <dl className="facts facts--card">
                      <div>
                        <dt>Priests</dt>
                        <dd>{activeCount}</dd>
                      </div>
                      <div>
                        <dt>Contact</dt>
                        <dd>{parish.contactNo || '—'}</dd>
                      </div>
                      <div>
                        <dt>Date registered</dt>
                        <dd>{formatRegisteredDate(parish.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>
                          <StatusPill status={parish.status} />
                        </dd>
                      </div>
                    </dl>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected && (
        <section className="panel panel--spaced" aria-labelledby="parish-detail-heading">
          <div className="panel__head">
            <div>
              <h2 id="parish-detail-heading">{selected.name}</h2>
              <p className="muted panel__note">
                {selected.address}
                {selected.email ? ` · ${selected.email}` : ''}
              </p>
            </div>
            <div className="panel__actions">
              <button
                type="button"
                className="btn btn--gold"
                onClick={() => setProvisionFor(selected)}
                disabled={selected.status !== 'active'}
              >
                Provision priest
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>
          </div>

          {selected.status !== 'active' && (
            <p className="notice">
              This parish is deactivated, so staff cannot be provisioned into it — the server
              answers PARISH_INACTIVE.
            </p>
          )}

          {selectedPriests.length === 0 ? (
            <p className="empty">
              No priests yet. A parish with no priest cannot do anything, since only priests
              provision managers.
            </p>
          ) : (
            <ul className="priest-list">
              {selectedPriests.map((priest) => (
                <li key={priest.userId} className="priest-list__row">
                  <div>
                    <strong>{priest.fullName}</strong>
                    <p className="muted">
                      <span className="mono">{priest.username}</span>
                      {priest.mustChangePassword ? ' · temporary password not yet changed' : ''}
                    </p>
                  </div>
                  <div className="form-actions__buttons">
                    <StatusPill status={priest.status} />
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => priestAction(priest, 'reset-password')}
                      disabled={busyUserId === priest.userId}
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost priest-list__remove"
                      onClick={() =>
                        priestAction(
                          priest,
                          priest.status === 'active' ? 'deactivate' : 'reactivate',
                        )
                      }
                      disabled={busyUserId === priest.userId}
                    >
                      {priest.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="form-hint muted">
            Accounts are never deleted — deactivating preserves the audit trail, so past approvals
            keep their signatory.
          </p>
        </section>
      )}

      <RegisterParishModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegister={handleRegister}
      />
      <StaffProvisionModal
        open={Boolean(provisionFor)}
        onClose={() => setProvisionFor(null)}
        onProvision={handleProvision}
        roleLabel="parish priest"
        scopeLabel={provisionFor?.name}
      />
    </div>
  )
}
