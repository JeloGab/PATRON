import { useMemo } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { getSession } from '../lib/session.js'
import { getRequests } from '../lib/requests.js'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function statusLabel(status) {
  if (status === 'pending') return 'Pending'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return status
}

export default function MyRequests() {
  const user = getSession()
  const [params] = useSearchParams()
  const submittedId = params.get('submitted')

  const requests = useMemo(() => (user ? getRequests(user.email) : []), [user])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Your applications</p>
          <h1>My document requests</h1>
          <p className="lede">
            Track certificate requests you submitted to participating parishes. Pending items await
            parish manager review.
          </p>
        </div>
        <p className="stat">
          <strong>{requests.length}</strong>
          {requests.length === 1 ? 'request' : 'requests'}
        </p>
      </header>

      {submittedId && (
        <p className="notice">
          Your request <strong>{submittedId}</strong> was submitted and is now{' '}
          <span className="status-pill status-pill--pending">Pending</span>.
        </p>
      )}

      {requests.length === 0 ? (
        <div className="card empty-card">
          <p className="empty">You have not requested any documents yet.</p>
          <Link to="/" className="btn btn--gold">
            Browse parishes
          </Link>
        </div>
      ) : (
        <ul className="request-list">
          {requests.map((item) => (
            <li key={item.id} className="card request-card">
              <div className="request-card__head">
                <div>
                  <p className="eyebrow">{item.documentType}</p>
                  <h2>{item.subjectName}</h2>
                  <p className="muted">{item.churchName}</p>
                </div>
                <span className={`status-pill status-pill--${item.status}`}>
                  {statusLabel(item.status)}
                </span>
              </div>

              <dl className="facts facts--compact">
                <div>
                  <dt>Request ID</dt>
                  <dd className="mono">{item.id}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDate(item.createdAt)}</dd>
                </div>
                <div>
                  <dt>Purpose</dt>
                  <dd>{item.purpose}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>{item.contactEmail}</dd>
                </div>
              </dl>

              {item.status === 'pending' && (
                <p className="muted request-card__note">
                  Waiting for parish manager approval. A PDF will be available after approval.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
