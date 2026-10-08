import { useState } from 'react'
import StatusPill from '../components/StatusPill.jsx'
import { useParish } from '../context/ParishContext.jsx'
import { formatDateTime } from '../lib/dates.js'

const FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

function matchesFilter(item, filter) {
  if (filter === 'pending') return item.status === 'For approval'
  if (filter === 'approved') return item.status === 'Approved'
  if (filter === 'rejected') return item.status === 'Rejected'
  return true
}

export default function PendingApprovals() {
  const { approvals, pendingCount, decideApproval } = useParish()
  const [filter, setFilter] = useState('pending')
  const [selectedId, setSelectedId] = useState(null)

  const rows = approvals.filter((item) => matchesFilter(item, filter))
  const selected = approvals.find((item) => item.id === selectedId) || null

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Document requests</p>
          <h1>Pending approvals</h1>
          <p className="lede">
            Requests the parish office has sent for your approval. Approve or reject each one before
            the certificate is released.
          </p>
        </div>
        <p className="stat">
          <strong>{pendingCount}</strong>
          waiting
        </p>
      </header>

      <section className="panel">
        <div className="filter-bar" role="tablist" aria-label="Approval filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={`filter-chip ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.id === 'pending' && pendingCount > 0 && (
                <span className="notif" aria-label={`${pendingCount} pending`}>
                  {pendingCount}
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
                  <th>Sent by</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className={selectedId === item.id ? 'is-selected' : ''}>
                    <td>{item.id}</td>
                    <td>{item.applicant}</td>
                    <td>{formatDateTime(item.date, item.time)}</td>
                    <td>{item.document}</td>
                    <td>{item.sentBy}</td>
                    <td>
                      <StatusPill status={item.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setSelectedId((current) => (current === item.id ? null : item.id))}
                      >
                        {selectedId === item.id ? 'Close' : 'Review'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="card editor" aria-labelledby="approval-heading">
          <p className="eyebrow">Sent by the parish office</p>
          <h2 id="approval-heading">{selected.applicant}</h2>
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
          {selected.status === 'For approval' ? (
            <div className="match-actions">
              <button
                type="button"
                className="btn btn--gold"
                onClick={() => decideApproval(selected.id, 'Approved')}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => decideApproval(selected.id, 'Rejected')}
              >
                Reject
              </button>
            </div>
          ) : (
            <p className="notice notice--follow">This request has already been {selected.status.toLowerCase()}.</p>
          )}
        </section>
      )}
    </div>
  )
}
