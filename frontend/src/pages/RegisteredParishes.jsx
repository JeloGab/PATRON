import { useMemo, useState } from 'react'
import ChurchMedia from '../components/ChurchMedia.jsx'
import EditParishModal from '../components/EditParishModal.jsx'
import RegisterParishModal from '../components/RegisterParishModal.jsx'
import StaffProvisionModal from '../components/StaffProvisionModal.jsx'
import { formatRegisteredDate, loadParishes, saveParishes } from '../lib/parishes.js'

function StatusPill({ status }) {
  const active = status === 'active'
  return (
    <span className={`status-pill ${active ? 'status-pill--active' : 'status-pill--inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function RegisteredParishes() {
  const [parishes, setParishes] = useState(() => loadParishes())
  const [query, setQuery] = useState('')
  const [diocese, setDiocese] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)
  const [editingParish, setEditingParish] = useState(null)
  const [notice, setNotice] = useState('')

  const dioceses = useMemo(
    () => ['all', ...Array.from(new Set(parishes.map((p) => p.diocese)))],
    [parishes],
  )

  const list = parishes.filter((parish) => {
    const hay =
      `${parish.name} ${parish.municipality} ${parish.diocese} ${parish.address}`.toLowerCase()
    const matchesQuery = hay.includes(query.trim().toLowerCase())
    const matchesDiocese = diocese === 'all' || parish.diocese === diocese
    const matchesStatus = statusFilter === 'all' || parish.status === statusFilter
    return matchesQuery && matchesDiocese && matchesStatus
  })

  function persist(next) {
    setParishes(next)
    saveParishes(next)
  }

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4500)
  }

  function handleRegister(parish) {
    persist([parish, ...parishes])
    showNotice(`${parish.name} was added to the registry.`)
  }

  function handleProvision({ parishId, role, fullName }) {
    const next = parishes.map((parish) =>
      parish.id === parishId ? { ...parish, staffCount: parish.staffCount + 1 } : parish,
    )
    persist(next)
    const parish = parishes.find((item) => item.id === parishId)
    const roleLabel = role === 'parish_priest' ? 'parish priest' : 'parish manager'
    showNotice(
      `Staff account created for ${fullName} (${roleLabel}) at ${parish?.name || 'the parish'}.`,
    )
  }

  function handleEditSave(updated) {
    persist(parishes.map((parish) => (parish.id === updated.id ? updated : parish)))
    showNotice(`${updated.name} was updated.`)
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Registry</p>
          <h1>Registered parishes</h1>
          <p className="lede">
            Review parishes onboarded to PATRON, their staffing levels, and registration status across
            participating dioceses.
          </p>
        </div>
        <p className="stat">
          <strong>{parishes.length}</strong>
          parishes registered
        </p>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <div className="page__actions">
        <button type="button" className="btn btn--gold" onClick={() => setRegisterOpen(true)}>
          Register parish
        </button>
        <button type="button" className="btn" onClick={() => setStaffOpen(true)}>
          Staff provision
        </button>
      </div>

      <div className="toolbar toolbar--admin">
        <label className="search">
          <span className="sr-only">Search parishes</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, municipality, or diocese…"
          />
        </label>
        <label className="select">
          <span className="sr-only">Filter by diocese</span>
          <select value={diocese} onChange={(e) => setDiocese(e.target.value)}>
            {dioceses.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All dioceses' : item}
              </option>
            ))}
          </select>
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

      {list.length === 0 ? (
        <p className="empty">No parish matches that search.</p>
      ) : (
        <ul className="grid">
          {list.map((parish) => (
            <li key={parish.id}>
              <button
                type="button"
                className="parish-card admin-parish-card parish-card--button"
                onClick={() => setEditingParish(parish)}
              >
                <ChurchMedia
                  id={parish.id}
                  accent={parish.accent}
                  className="parish-card__media"
                  alt={parish.name}
                >
                  <StatusPill status={parish.status} />
                </ChurchMedia>
                <div className="parish-card__body">
                  <p className="parish-card__diocese">{parish.diocese}</p>
                  <h2>{parish.name}</h2>
                  <p className="muted">{parish.municipality}</p>
                  <dl className="facts facts--card">
                    <div>
                      <dt>Staff</dt>
                      <dd>{parish.staffCount}</dd>
                    </div>
                    <div>
                      <dt>Parishioners</dt>
                      <dd>{parish.parishioners.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Date registered</dt>
                      <dd>{formatRegisteredDate(parish.registeredAt)}</dd>
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
          ))}
        </ul>
      )}

      <RegisterParishModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegister={handleRegister}
      />
      <StaffProvisionModal
        open={staffOpen}
        onClose={() => setStaffOpen(false)}
        parishes={parishes}
        onProvision={handleProvision}
      />
      <EditParishModal
        open={Boolean(editingParish)}
        parish={editingParish}
        onClose={() => setEditingParish(null)}
        onSave={handleEditSave}
      />
    </div>
  )
}
