// The parishioner's own requests; withdrawal is pending-only.

import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { authed, isSessionError } from '../../lib/api.js'
import {
  RELATIONSHIP_LABEL,
  STATUS_HINT,
  STATUS_LABEL,
  formatStamp,
  statusPill,
} from '../../lib/documents.js'
import { certificateFileName, downloadPdf } from '../../lib/download.js'
import { formatLongDate } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession, getSession } from '../../lib/session.js'

export default function MyRequests() {
  const navigate = useNavigate()
  const user = getSession()
  const [params] = useSearchParams()
  const submittedId = params.get('submitted')
  const [requests, setRequests] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState(null)

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const load = useCallback(async () => {
    const r = await authed({ path: '/api/requests' })
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
  }, [endSession])

  useEffect(() => {
    load()
  }, [load])

  if (!user) return <Navigate to="/login" replace />

  async function cancel(request) {
    if (!window.confirm(`Withdraw your request for ${request.subjectName}?`)) return
    setBusyId(request.applicationId)
    setError('')
    setNotice('')

    const r = await authed({
      method: 'POST',
      path: `/api/requests/${request.applicationId}/cancel`,
      body: {},
    })
    setBusyId(null)

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      load()
      return
    }

    setNotice('Your request was withdrawn.')
    setRequests((current) =>
      (current ?? []).map((item) =>
        item.applicationId === r.json.request.applicationId ? r.json.request : item,
      ),
    )
  }

  async function getPdf(request) {
    setBusyId(request.applicationId)
    setError('')

    const meta = await authed({ path: `/api/requests/${request.applicationId}/certificate` })
    if (isSessionError(meta)) {
      endSession()
      return
    }

    const message = await downloadPdf({
      path: `/api/requests/${request.applicationId}/certificate.pdf`,
      fileName: certificateFileName(meta.ok ? meta.json.certificate?.verificationCode : null),
      onSessionEnd: endSession,
    })
    setBusyId(null)
    if (message) setError(message)
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Your applications</p>
          <h1>My document requests</h1>
          <p className="lede">
            Every certificate you have requested, and where each one has reached. A request is
            approved by a priest of the issuing parish, never by the office alone.
          </p>
        </div>
        <p className="stat">
          <strong>{requests ? requests.length : '—'}</strong>
          {requests?.length === 1 ? 'request' : 'requests'}
        </p>
      </header>

      {submittedId && (
        <p className="notice">
          Your request was submitted and is now{' '}
          <span className={statusPill('pending')}>Pending</span>. The parish office will look for
          the register entry.
        </p>
      )}
      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {requests === null ? (
        <p className="empty">Loading your requests…</p>
      ) : requests.length === 0 ? (
        <div className="card empty-card">
          <p className="empty">You have not requested any documents yet.</p>
          <Link to="/user" className="btn btn--gold">
            Browse parishes
          </Link>
        </div>
      ) : (
        <ul className="request-list">
          {requests.map((item) => (
            <li key={item.applicationId} className="card request-card">
              <div className="request-card__head">
                <div>
                  <p className="eyebrow">{item.documentName}</p>
                  <h2>{item.subjectName}</h2>
                  <p className="muted">{item.parishName}</p>
                </div>
                <span className={statusPill(item.status)}>{STATUS_LABEL[item.status]}</span>
              </div>

              <dl className="facts facts--compact">
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatStamp(item.submittedAt)}</dd>
                </div>
                <div>
                  <dt>For</dt>
                  <dd>{RELATIONSHIP_LABEL[item.relationship] ?? item.relationship}</dd>
                </div>
                <div>
                  <dt>Purpose</dt>
                  <dd>{item.purpose}</dd>
                </div>
                {item.subjectBirthDate && (
                  <div>
                    <dt>Date of birth given</dt>
                    <dd>{formatLongDate(item.subjectBirthDate)}</dd>
                  </div>
                )}
                {item.status === 'approved' && (
                  <div>
                    <dt>Approved</dt>
                    <dd>
                      {formatStamp(item.approvedAt)}
                      {item.approvedByName ? ` · ${item.approvedByName}` : ''}
                    </dd>
                  </div>
                )}
                {item.statusReason && (
                  <div>
                    <dt>Reason given</dt>
                    <dd>{item.statusReason}</dd>
                  </div>
                )}
              </dl>

              <p className="muted request-card__note">{STATUS_HINT[item.status]}</p>

              <div className="form-actions__buttons">
                {item.status === 'approved' && (
                  <button
                    type="button"
                    className="btn btn--gold"
                    onClick={() => getPdf(item)}
                    disabled={busyId === item.applicationId}
                  >
                    {busyId === item.applicationId ? 'Preparing…' : 'Download certificate'}
                  </button>
                )}
                {item.status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => cancel(item)}
                    disabled={busyId === item.applicationId}
                  >
                    Withdraw request
                  </button>
                )}
                {item.isPaid && <span className="chip chip--quiet">Fee marked paid</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
