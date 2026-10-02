import { useState } from 'react'
import { Link } from 'react-router-dom'
import StatusPill from '../components/StatusPill.jsx'
import { useOffice } from '../context/OfficeContext.jsx'
import { DOCUMENT_TYPES } from '../data/mock.js'
import { formatDateTime, formatLongDate, todayISO } from '../lib/dates.js'
import { findBestMatch, matchPercent } from '../lib/matches.js'

const FILTERS = [
  { id: 'needs', label: 'Needs action' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

function matchesFilter(item, filter) {
  if (filter === 'needs') return item.status === 'For approval' || item.status === 'For verification'
  if (filter === 'approved') return item.status === 'Approved'
  if (filter === 'rejected') return item.status === 'Rejected'
  return true
}

function nextRef(documents) {
  const max = documents.reduce((highest, item) => {
    const value = Number(String(item.id).replace(/\D/g, ''))
    return Number.isFinite(value) ? Math.max(highest, value) : highest
  }, 3000)
  return `DOC-${max + 1}`
}

function nowTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function DocumentRequests() {
  const { documents, records, addDocument, confirmDocumentMatch } = useOffice()
  const [filter, setFilter] = useState('needs')
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ applicant: '', document: DOCUMENT_TYPES[0] })
  const [error, setError] = useState('')

  const needsCount = documents.filter((item) => matchesFilter(item, 'needs')).length
  const rows = documents.filter((item) => matchesFilter(item, filter))
  const selected = documents.find((item) => item.id === selectedId) || null
  const suggestion = selected ? findBestMatch(selected, records) : null
  const confirmed = selected?.matchedRecordId
    ? records.find((record) => record.id === selected.matchedRecordId) || null
    : null
  const shownMatch = confirmed
    ? { record: confirmed, percent: matchPercent(selected, confirmed) }
    : suggestion

  function openRow(item) {
    setSelectedId((current) => (current === item.id ? null : item.id))
  }

  function submitRequest(event) {
    event.preventDefault()
    if (!draft.applicant.trim()) {
      setError('Enter the applicant’s name.')
      return
    }
    const item = {
      id: nextRef(documents),
      applicant: draft.applicant.trim(),
      document: draft.document,
      date: todayISO(),
      time: nowTime(),
      status: 'For verification',
      matchedRecordId: null,
    }
    addDocument(item)
    setDraft({ applicant: '', document: DOCUMENT_TYPES[0] })
    setError('')
    setCreating(false)
    setFilter('needs')
    setSelectedId(item.id)
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Document requests</p>
          <h1>Requests</h1>
          <p className="lede">
            Certificate and recommendation requests. Needs action holds only requests that are for
            approval or for verification.
          </p>
        </div>
        <div className="panel__actions">
          <p className="stat">
            <strong>{rows.length}</strong>
            {filter === 'all' ? 'requests' : 'in this view'}
          </p>
          <button type="button" className="btn btn--gold" onClick={() => setCreating((open) => !open)}>
            New request
          </button>
        </div>
      </header>

      {creating && (
        <form className="card editor" onSubmit={submitRequest}>
          <p className="eyebrow">New request</p>
          <h2>Add a document request</h2>
          {error && <p className="alert">{error}</p>}
          <div className="form-grid">
            <label className="field">
              <span>Applicant</span>
              <input
                value={draft.applicant}
                onChange={(event) => setDraft((current) => ({ ...current, applicant: event.target.value }))}
                placeholder="Name of the applicant"
              />
            </label>
            <label className="field">
              <span>Document</span>
              <select
                value={draft.document}
                onChange={(event) => setDraft((current) => ({ ...current, document: event.target.value }))}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setCreating(false)
                setError('')
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--gold">
              Save request
            </button>
          </div>
        </form>
      )}

      <section className="panel">
        <div className="filter-bar" role="tablist" aria-label="Request filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={`filter-chip ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.id === 'needs' && needsCount > 0 && (
                <span className="notif" aria-label={`${needsCount} need action`}>
                  {needsCount}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="empty">No requests in this view.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ref no.</th>
                  <th>Applicant</th>
                  <th>Date & time</th>
                  <th>Document</th>
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
                    <td>{item.id}</td>
                    <td>{item.applicant}</td>
                    <td>{formatDateTime(item.date, item.time)}</td>
                    <td>{item.document}</td>
                    <td>
                      <StatusPill status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="request-split">
          <section className="card" aria-labelledby="request-detail-heading">
            <p className="eyebrow">Selected request</p>
            <h2 id="request-detail-heading">{selected.applicant}</h2>
            <dl className="facts">
              <div>
                <dt>Ref no.</dt>
                <dd>{selected.id}</dd>
              </div>
              <div>
                <dt>Applicant</dt>
                <dd>{selected.applicant}</dd>
              </div>
              <div>
                <dt>Date & time</dt>
                <dd>{formatDateTime(selected.date, selected.time)}</dd>
              </div>
              <div>
                <dt>Document</dt>
                <dd>{selected.document}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusPill status={selected.status} />
                </dd>
              </div>
            </dl>
          </section>

          <section className="card" aria-labelledby="match-heading">
            <p className="eyebrow">Match finder</p>
            <h2 id="match-heading">Sacramental records</h2>
            {shownMatch ? (
              <>
                <p className="match-score">{shownMatch.percent}% match</p>
                {confirmed && <p className="notice">Match confirmed against this record.</p>}
                <dl className="facts">
                  <div>
                    <dt>Registry no.</dt>
                    <dd>{shownMatch.record.id}</dd>
                  </div>
                  <div>
                    <dt>Sacrament</dt>
                    <dd>{shownMatch.record.sacrament}</dd>
                  </div>
                  <div>
                    <dt>Subject(s)</dt>
                    <dd>{shownMatch.record.subjects}</dd>
                  </div>
                  <div>
                    <dt>Date of sacrament</dt>
                    <dd>{formatLongDate(shownMatch.record.date)}</dd>
                  </div>
                  <div>
                    <dt>Officiant</dt>
                    <dd>{shownMatch.record.officiant}</dd>
                  </div>
                  <div>
                    <dt>Encoded by</dt>
                    <dd>{shownMatch.record.encodedBy}</dd>
                  </div>
                </dl>
                <div className="match-actions">
                  <button
                    type="button"
                    className="btn btn--gold"
                    disabled={Boolean(confirmed)}
                    onClick={() => confirmDocumentMatch(selected.id, shownMatch.record.id)}
                  >
                    {confirmed ? 'Match confirmed' : 'Confirm match'}
                  </button>
                  <Link
                    className="btn btn--ghost"
                    to={`/records?search=${encodeURIComponent(selected.applicant)}`}
                  >
                    Search other records
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="muted">No sacramental record matches this request.</p>
                <div className="match-actions">
                  <Link
                    className="btn btn--ghost"
                    to={`/records?search=${encodeURIComponent(selected.applicant)}`}
                  >
                    Search other records
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
