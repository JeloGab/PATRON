import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useOffice } from '../context/OfficeContext.jsx'
import { PRIESTS, SACRAMENTS } from '../data/mock.js'
import { formatDateTime } from '../lib/dates.js'

const FILTERS = {
  verify: {
    label: 'pending applications',
    match: (item) => item.status === 'Pending',
  },
  requirements: {
    label: 'applications with requirements still open',
    match: (item) => item.requirements.some((requirement) => !requirement.checked),
  },
}

const EMPTY_DRAFT = null

export default function SacramentApplications() {
  const { applications, setApplicationStatus, updateApplication, toggleRequirement } = useOffice()
  const [params] = useSearchParams()
  const focus = params.get('focus')
  const filter = FILTERS[focus]
  const rows = filter ? applications.filter(filter.match) : applications
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [error, setError] = useState('')

  function openRow(item) {
    if (selectedId === item.id) {
      setSelectedId(null)
      setDraft(EMPTY_DRAFT)
      setError('')
      return
    }
    setSelectedId(item.id)
    setError('')
    setDraft({
      title: item.title,
      date: item.date,
      time: item.time,
      sacrament: item.sacrament,
      priest: item.priest,
      participants: String(item.participants),
    })
  }

  function save(event) {
    event.preventDefault()
    const participants = Number(draft.participants)
    if (!draft.title.trim() || !draft.date || !draft.time || !draft.sacrament || !draft.priest) {
      setError('Complete every field before saving.')
      return
    }
    if (!Number.isInteger(participants) || participants < 1) {
      setError('Enter the number of participants as a whole number greater than zero.')
      return
    }
    updateApplication(selectedId, {
      title: draft.title.trim(),
      date: draft.date,
      time: draft.time,
      sacrament: draft.sacrament,
      priest: draft.priest,
      participants,
    })
    setError('')
  }

  const selected = applications.find((item) => item.id === selectedId)

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Sacrament applications</p>
          <h1>Applications</h1>
          <p className="lede">
            Open a row to edit the schedule and check the requirements. Status is either Pending or
            Complete.
          </p>
        </div>
        <p className="stat">
          <strong>{rows.length}</strong>
          {filter ? 'in this view' : 'applications'}
        </p>
      </header>

      {filter && (
        <p className="notice">
          Showing {filter.label}. <Link to="/applications">Show all applications</Link>
        </p>
      )}

      <section className="panel">
        {rows.length === 0 ? (
          <p className="empty">No applications in this view.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date & time</th>
                  <th>Sacrament</th>
                  <th>Priest assigned</th>
                  <th>No. of participants</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className={`is-clickable ${selectedId === item.id ? 'is-selected' : ''}`}
                    onClick={() => openRow(item)}
                  >
                    <td>{item.title}</td>
                    <td>{formatDateTime(item.date, item.time)}</td>
                    <td>{item.sacrament}</td>
                    <td>{item.priest}</td>
                    <td>{item.participants.toLocaleString()}</td>
                    <td>
                      <select
                        className="table-select"
                        value={item.status}
                        aria-label={`Status for ${item.title}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setApplicationStatus(item.id, event.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && draft && (
        <form className="card editor" onSubmit={save}>
          <p className="eyebrow">Requirements</p>
          <h2>{selected.title}</h2>
          {error && <p className="alert">{error}</p>}

          <div className="form-grid">
            <label className="field field--full">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Time</span>
              <input
                type="time"
                value={draft.time}
                onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Sacrament</span>
              <select
                value={draft.sacrament}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sacrament: event.target.value }))
                }
              >
                {SACRAMENTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priest assigned</span>
              <select
                value={draft.priest}
                onChange={(event) => setDraft((current) => ({ ...current, priest: event.target.value }))}
              >
                {PRIESTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>No. of participants</span>
              <input
                type="number"
                min="1"
                step="1"
                value={draft.participants}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, participants: event.target.value }))
                }
              />
            </label>
          </div>

          <ul className="checks">
            {selected.requirements.map((requirement) => (
              <li key={requirement.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={requirement.checked}
                    onChange={() => toggleRequirement(selected.id, requirement.id)}
                  />
                  <span>{requirement.label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => openRow(selected)}>
              Close
            </button>
            <button type="submit" className="btn btn--gold">
              Save changes
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
