// The priest's approval queue; approving issues the certificate in the same call.

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import ApplicationModal from '../../components/ApplicationModal.jsx'
import Loading from '../../components/Loading.jsx'
import Seg from '../../components/Seg.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import {
  RECORD_TYPE_LABEL,
  STATUS_LABEL,
  formatStamp,
  registryOf,
  statusPill,
} from '../../lib/documents.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession } from '../../lib/session.js'

const TABS = [
  { id: 'verified', label: 'For approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

export default function DocumentApprovals() {
  const navigate = useNavigate()
  const { refresh } = useOutletContext()
  const [status, setStatus] = useState('verified')
  const [requests, setRequests] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [error, setError] = useState('')
  const [canSign, setCanSign] = useState(true)

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const load = useCallback(async () => {
    const r = await authed({ path: `/api/documents?status=${status}` })
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
  }, [status, endSession])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let live = true
    async function checkSignature() {
      const r = await authed({ path: '/api/users/signature', as: 'blob' })
      // A 404 means no signature on file. It also means the route is not deployed yet,
      // in which case the old name-only behaviour still applies and the banner is
      // merely premature - not wrong.
      if (live) setCanSign(r.ok)
    }
    checkSignature()
    return () => {
      live = false
    }
  }, [])

  function applyChange(next) {
    setRequests((current) =>
      (current ?? []).map((item) => (item.applicationId === next.applicationId ? next : item)),
    )

    refresh()
  }

  const open = (requests ?? []).find((item) => item.applicationId === openId) ?? null

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Certificates</p>
          <h1>Document approvals</h1>
          <p className="lede">
            Requests whose register entry has been found and attached by the office. Approving one
            issues the certificate immediately, with its verification code and QR.
          </p>
        </div>
        <p className="stat">
          <strong>{requests ? requests.length : '—'}</strong>
          {status === 'verified' ? 'awaiting you' : 'in this view'}
        </p>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {!canSign && (
        <p className="alert">
          You have no signature on file. A certificate cannot be issued without it — including
          those generated when a sacramental event is completed. Draw one on{' '}
          <Link to="/account" className="text-btn">
            your account page
          </Link>
          .
        </p>
      )}

      <Seg label="Approval status">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`seg__btn ${status === tab.id ? 'is-active' : ''}`}
            aria-pressed={status === tab.id}
            onClick={() => {
              setStatus(tab.id)
              setRequests(null)
              setOpenId(null)
            }}
          >
            {tab.label}
          </button>
        ))}
      </Seg>

      {requests === null ? (
        <Loading label="Loading requests…" />
      ) : requests.length === 0 ? (
        <p className="empty">
          {status === 'verified'
            ? 'Nothing is waiting for your approval. The office attaches the register entry first.'
            : `No ${STATUS_LABEL[status].toLowerCase()} request.`}
        </p>
      ) : (
        <ul className="priest-list">
          {requests.map((item) => (
            <li key={item.applicationId} className="priest-list__row">
              <div>
                <strong>{item.subjectName}</strong>
                <p className="muted">
                  {item.documentName} · {RECORD_TYPE_LABEL[item.recordType]} register
                </p>
                <p className="muted">
                  {registryOf(item) ?? 'No entry attached'} · attached{' '}
                  {formatStamp(item.verifiedAt)}
                  {item.verifiedByName ? ` by ${item.verifiedByName}` : ''}
                </p>
              </div>
              <div className="form-actions__buttons">
                <span className={statusPill(item.status)}>{STATUS_LABEL[item.status]}</span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setOpenId(item.applicationId)}
                >
                  Review
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <ApplicationModal
          request={open}
          role="priest"
          onClose={() => setOpenId(null)}
          onChange={applyChange}
          onSessionEnd={endSession}
        />
      )}
    </div>
  )
}
