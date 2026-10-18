import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ApplicationModal from '../../components/ApplicationModal.jsx'
import Loading from '../../components/Loading.jsx'
import Seg from '../../components/Seg.jsx'
import { authed, call, isSessionError } from '../../lib/api.js'
import {
  EARLIEST_SACRAMENT_YEAR,
  LIMITS,
  RECORD_TYPE_LABEL,
  RELATIONSHIPS,
  STATUS_LABEL,
  formatStamp,
  registryOf,
  statusPill,
} from '../../lib/documents.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession } from '../../lib/session.js'

const TABS = ['pending', 'verified', 'approved', 'rejected', 'cancelled']

const EMPTY_WALK_IN = {
  documentTypeId: '',
  requestorName: '',
  requestorContact: '',
  relationship: 'self',
  purpose: '',
  subjectName: '',
  subjectBirthDate: '',
  fatherName: '',
  motherName: '',
  sacramentYear: '',
  notes: '',
}

export default function DocumentRequests() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [requests, setRequests] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [types, setTypes] = useState([])
  const [filing, setFiling] = useState(false)
  const [walkIn, setWalkIn] = useState(EMPTY_WALK_IN)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const load = useCallback(async () => {
    const r = await authed({ path: `/api/documents?status=${status}&page=${page}` })
    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      setRequests([])
      return
    }
    setRequests(r.json.requests)
    setHasMore(r.json.hasMore)
  }, [status, page, endSession])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let live = true
    async function loadTypes() {
      const r = await call({ path: '/api/document-types' })
      if (live && r.ok) setTypes(r.json.documentTypes)
    }
    loadTypes()
    return () => {
      live = false
    }
  }, [])

  function switchTab(next) {
    setStatus(next)
    setPage(1)
    setRequests(null)
    setOpenId(null)
  }

  function update(field) {
    return (event) => setWalkIn((current) => ({ ...current, [field]: event.target.value }))
  }

  async function fileWalkIn(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    const subjectName = walkIn.subjectName.trim().replace(/\s+/g, ' ')
    const purpose = walkIn.purpose.trim().replace(/\s+/g, ' ')
    const requestorName = walkIn.requestorName.trim().replace(/\s+/g, ' ')

    if (!walkIn.documentTypeId) {
      setError('Choose which certificate is being requested.')
      return
    }
    if (requestorName.length < 2) {
      setError('Enter the name of the person making the request.')
      return
    }
    if (subjectName.length < LIMITS.subjectName.min) {
      setError('Enter the name that should appear on the document.')
      return
    }
    if (purpose.length < LIMITS.purpose.min) {
      setError('Enter what the certificate is for.')
      return
    }
    if (walkIn.sacramentYear) {
      const year = Number(walkIn.sacramentYear)
      const thisYear = new Date().getFullYear()
      if (!/^\d{4}$/.test(walkIn.sacramentYear) || year < EARLIEST_SACRAMENT_YEAR || year > thisYear) {
        setError(`The year of the sacrament must be between ${EARLIEST_SACRAMENT_YEAR} and ${thisYear}.`)
        return
      }
    }

    const body = {
      documentTypeId: walkIn.documentTypeId,
      requestorName,
      relationship: walkIn.relationship,
      purpose,
      subjectName,
    }
    if (walkIn.requestorContact.trim()) body.requestorContact = walkIn.requestorContact.trim()
    if (walkIn.subjectBirthDate) body.subjectBirthDate = walkIn.subjectBirthDate
    if (walkIn.fatherName.trim()) body.fatherName = walkIn.fatherName.trim()
    if (walkIn.motherName.trim()) body.motherName = walkIn.motherName.trim()
    if (walkIn.sacramentYear) body.sacramentYear = walkIn.sacramentYear
    if (walkIn.notes.trim()) body.notes = walkIn.notes.trim()

    setPending(true)
    const r = await authed({ method: 'POST', path: '/api/documents/walk-in', body })
    setPending(false)

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    setWalkIn(EMPTY_WALK_IN)
    setFiling(false)
    setNotice(`Walk-in request filed for ${r.json.request.subjectName}. It is pending a register entry.`)
    switchTab('pending')
  }

  function applyChange(next) {
    setRequests((current) =>
      (current ?? []).map((item) => (item.applicationId === next.applicationId ? next : item)),
    )
  }

  const open = (requests ?? []).find((item) => item.applicationId === openId) ?? null

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Document requests</p>
          <h1>Requests</h1>
          <p className="lede">
            Find the register entry a request is asking for and attach it. Attaching the entry is
            what marks a request verified — a priest can only approve a request that already has
            its entry.
          </p>
        </div>
        <div className="panel__actions">
          <p className="stat">
            <strong>{requests ? requests.length : '—'}</strong>
            in this view
          </p>
          <button type="button" className="btn btn--gold" onClick={() => setFiling((o) => !o)}>
            {filing ? 'Close' : 'File a walk-in'}
          </button>
        </div>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {filing && (
        <form className="card editor" onSubmit={fileWalkIn}>
          <p className="eyebrow">Walk-in request</p>
          <h2>File for someone at the counter</h2>

          <div className="form-grid">
            <label className="field">
              <span>Certificate *</span>
              <select value={walkIn.documentTypeId} onChange={update('documentTypeId')}>
                <option value="">Choose…</option>
                {types.map((type) => (
                  <option key={type.documentTypeId} value={type.documentTypeId}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Requesting person *</span>
              <input value={walkIn.requestorName} onChange={update('requestorName')} />
            </label>
            <label className="field">
              <span>Their contact</span>
              <input
                value={walkIn.requestorContact}
                onChange={update('requestorContact')}
                placeholder="Mobile number or email"
              />
              <span className="form-hint">Optional, free text — up to 60 characters.</span>
            </label>
            <label className="field">
              <span>Their relationship *</span>
              <select value={walkIn.relationship} onChange={update('relationship')}>
                {RELATIONSHIPS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Name on the document *</span>
              <input value={walkIn.subjectName} onChange={update('subjectName')} />
            </label>
            <label className="field">
              <span>Date of birth</span>
              <input type="date" value={walkIn.subjectBirthDate} onChange={update('subjectBirthDate')} />
            </label>
            <label className="field">
              <span>Year of the sacrament</span>
              <input
                value={walkIn.sacramentYear}
                onChange={update('sacramentYear')}
                inputMode="numeric"
                maxLength={4}
              />
            </label>
            <label className="field">
              <span>Father’s name</span>
              <input value={walkIn.fatherName} onChange={update('fatherName')} />
            </label>
            <label className="field">
              <span>Mother’s name</span>
              <input value={walkIn.motherName} onChange={update('motherName')} />
            </label>
            <label className="field field--full">
              <span>What is it for? *</span>
              <input value={walkIn.purpose} onChange={update('purpose')} />
            </label>
            <label className="field field--full">
              <span>Notes</span>
              <textarea rows={2} value={walkIn.notes} onChange={update('notes')} />
            </label>
          </div>

          <div className="form-actions">
            <p className="muted form-hint">
              The request is filed against this parish — the one you are signed in to.
            </p>
            <div className="form-actions__buttons">
              <button type="button" className="btn btn--ghost" onClick={() => setFiling(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--gold" disabled={pending}>
                {pending ? 'Filing…' : 'File request'}
              </button>
            </div>
          </div>
        </form>
      )}

      <Seg label="Request status">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`seg__btn ${status === tab ? 'is-active' : ''}`}
            aria-pressed={status === tab}
            onClick={() => switchTab(tab)}
          >
            {STATUS_LABEL[tab]}
          </button>
        ))}
      </Seg>

      {requests === null ? (
        <Loading label="Loading requests…" />
      ) : requests.length === 0 ? (
        <p className="empty">
          {status === 'pending'
            ? 'No request is waiting for a register entry.'
            : `No ${STATUS_LABEL[status].toLowerCase()} request.`}
        </p>
      ) : (
        <ul className="priest-list">
          {requests.map((item) => (
            <li key={item.applicationId} className="priest-list__row">
              <div>
                <strong>{item.subjectName}</strong>
                <p className="muted">
                  {item.documentName} · {RECORD_TYPE_LABEL[item.recordType]} register ·{' '}
                  {formatStamp(item.submittedAt)}
                </p>
                <p className="muted">
                  {item.isWalkIn ? `Walk-in: ${item.requestorName}` : item.createdByName || 'Parishioner'}
                  {registryOf(item) ? ` · ${registryOf(item)}` : ' · no entry attached'}
                </p>
              </div>
              <div className="form-actions__buttons">
                <span className={statusPill(item.status)}>{STATUS_LABEL[item.status]}</span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setOpenId(item.applicationId)}
                >
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <div className="form-actions__buttons">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="muted">Page {page}</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setPage((current) => current + 1)}
            disabled={!hasMore}
          >
            Next
          </button>
        </div>
      )}

      {open && (
        <ApplicationModal
          request={open}
          role="manager"
          onClose={() => setOpenId(null)}
          onChange={applyChange}
          onSessionEnd={endSession}
        />
      )}
    </div>
  )
}
