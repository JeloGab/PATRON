// One document request; attaching the register entry is what verifies it.

import { useCallback, useEffect, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { formatLongDate } from '../lib/dates.js'
import {
  RECORD_TYPE_LABEL,
  RELATIONSHIP_LABEL,
  STATUS_HINT,
  STATUS_LABEL,
  formatStamp,
  registryOf,
  statusPill,
} from '../lib/documents.js'
import { certificateFileName, downloadPdf } from '../lib/download.js'
import { messageFor } from '../lib/errors.js'
import Modal from './Modal.jsx'

const OPEN_STATUSES = ['pending', 'verified']

export default function ApplicationModal({ request, role, onClose, onChange, onSessionEnd }) {
  const [certificate, setCertificate] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const isManager = role === 'manager'
  const isPriest = role === 'priest'
  const open = OPEN_STATUSES.includes(request.status)
  const canApprove = isPriest && request.status === 'verified'
  const canReject = isManager ? open : request.status === 'verified'

  useEffect(() => {
    let live = true
    if (request.status !== 'approved') {
      setCertificate(null)
      return undefined
    }

    async function load() {
      const r = await authed({ path: `/api/documents/${request.applicationId}/certificate` })
      if (live && r.ok) setCertificate(r.json.certificate)
    }

    load()
    return () => {
      live = false
    }
  }, [request.applicationId, request.status])

  const act = useCallback(
    async ({ label, method = 'POST', path, body }) => {
      setError('')
      setBusy(label)
      const r = await authed({ method, path, body })
      setBusy('')

      if (isSessionError(r)) {
        onSessionEnd()
        return null
      }
      if (!r.ok) {
        setError(messageFor(r))
        return null
      }

      onChange(r.json.request)
      if (r.json.certificate) setCertificate(r.json.certificate)
      return r.json
    },
    [onChange, onSessionEnd],
  )

  async function search(event) {
    event.preventDefault()
    setError('')
    setBusy('search')
    const r = await authed({
      path: `/api/records?q=${encodeURIComponent(query)}&type=${encodeURIComponent(request.recordType)}`,
    })
    setBusy('')

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setResults(r.json.results)
  }

  async function attach(recordId) {
    const done = await act({
      label: recordId,
      method: 'PATCH',
      path: `/api/documents/${request.applicationId}/record`,
      body: { recordId },
    })
    if (done) {
      setResults(null)
      setQuery('')
    }
  }

  async function getPdf() {
    setError('')
    setBusy('pdf')
    const message = await downloadPdf({
      path: `/api/documents/${request.applicationId}/certificate.pdf`,
      fileName: certificateFileName(certificate?.verificationCode),
      onSessionEnd,
    })
    setBusy('')
    if (message) setError(message)
  }

  return (
    <Modal open title={request.documentName} onClose={onClose}>
      <div className="modal__meta">
        <span className={statusPill(request.status)}>{STATUS_LABEL[request.status]}</span>
        {request.isWalkIn && <span className="chip chip--quiet">Walk-in</span>}
        {request.isPaid && <span className="chip chip--quiet">Fee paid</span>}
      </div>

      <p className="muted">{STATUS_HINT[request.status]}</p>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <h3 className="eyebrow">The request</h3>
      <dl className="facts">
        <div>
          <dt>Name on the document</dt>
          <dd>{request.subjectName}</dd>
        </div>
        <div>
          <dt>Register</dt>
          <dd>{RECORD_TYPE_LABEL[request.recordType] ?? request.recordType}</dd>
        </div>
        <div>
          <dt>Requested by</dt>
          <dd>
            {request.isWalkIn
              ? `${request.requestorName} (walk-in${request.requestorContact ? `, ${request.requestorContact}` : ''})`
              : request.createdByName || 'A parishioner'}
          </dd>
        </div>
        <div>
          <dt>Relationship</dt>
          <dd>{RELATIONSHIP_LABEL[request.relationship] ?? request.relationship}</dd>
        </div>
        <div>
          <dt>Purpose</dt>
          <dd>{request.purpose}</dd>
        </div>
        {request.subjectBirthDate && (
          <div>
            <dt>Date of birth</dt>
            <dd>{formatLongDate(request.subjectBirthDate)}</dd>
          </div>
        )}
        {request.sacramentYear && (
          <div>
            <dt>Year of the sacrament</dt>
            <dd>{request.sacramentYear}</dd>
          </div>
        )}
        {(request.fatherName || request.motherName) && (
          <div>
            <dt>Parents</dt>
            <dd>{[request.fatherName, request.motherName].filter(Boolean).join(' · ')}</dd>
          </div>
        )}
        {request.notes && (
          <div>
            <dt>Notes from the requestor</dt>
            <dd>{request.notes}</dd>
          </div>
        )}
        <div>
          <dt>Submitted</dt>
          <dd>{formatStamp(request.submittedAt)}</dd>
        </div>
        {request.verifiedAt && (
          <div>
            <dt>Entry attached</dt>
            <dd>
              {formatStamp(request.verifiedAt)}
              {request.verifiedByName ? ` · ${request.verifiedByName}` : ''}
            </dd>
          </div>
        )}
        {request.approvedAt && (
          <div>
            <dt>Approved</dt>
            <dd>
              {formatStamp(request.approvedAt)}
              {request.approvedByName ? ` · ${request.approvedByName}` : ''}
            </dd>
          </div>
        )}
        {request.statusReason && (
          <div>
            <dt>Reason</dt>
            <dd>{request.statusReason}</dd>
          </div>
        )}
      </dl>

      <h3 className="eyebrow">Register entry</h3>
      {request.recordId ? (
        <p className="notice">
          {registryOf(request)} · {RECORD_TYPE_LABEL[request.recordType]}
          {request.recordDate ? `, ${formatLongDate(request.recordDate)}` : ''}
        </p>
      ) : (
        <p className="muted">
          No entry attached yet. The certificate is a copy of a register entry, so one must be
          attached before a priest can approve this.
        </p>
      )}

      {isManager && open && (
        <>
          <form className="verify-bar" onSubmit={search}>
            <label className="verify-bar__field">
              <span>
                Search the {RECORD_TYPE_LABEL[request.recordType]?.toLowerCase()} register
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={request.subjectName}
                autoComplete="off"
              />
            </label>
            <button type="submit" className="btn btn--gold" disabled={busy === 'search'}>
              {busy === 'search' ? 'Searching…' : 'Search'}
            </button>
          </form>
          <p className="hint">
            Every word must appear in the subject’s name, in any order. Only this register is
            searched, so a wrong-register entry cannot be attached by accident.
          </p>

          {results !== null &&
            (results.length === 0 ? (
              <p className="empty">
                No entry in this register matches. Try fewer words, or a maiden name.
              </p>
            ) : (
              <ul className="priest-list">
                {results.map((row) => (
                  <li key={row.subjectId} className="priest-list__row">
                    <div>
                      <strong>{row.fullName}</strong>
                      <p className="muted">
                        Book {row.bookNo}, page {row.pageNo}, entry {row.entryNo}
                        {row.recordDate ? ` · ${formatLongDate(row.recordDate)}` : ''}
                        {row.dateOfBirth ? ` · born ${formatLongDate(row.dateOfBirth)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => attach(row.recordId)}
                      disabled={busy === row.recordId || row.recordId === request.recordId}
                    >
                      {row.recordId === request.recordId
                        ? 'Attached'
                        : busy === row.recordId
                          ? 'Attaching…'
                          : 'Attach'}
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </>
      )}

      {request.status === 'approved' && (
        <>
          <h3 className="eyebrow">Certificate</h3>
          <dl className="facts">
            <div>
              <dt>Verification code</dt>
              <dd className="mono">{certificate?.verificationCode ?? '—'}</dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{formatStamp(certificate?.issuedAt)}</dd>
            </div>
          </dl>
          <button type="button" className="btn btn--gold" onClick={getPdf} disabled={busy === 'pdf'}>
            {busy === 'pdf' ? 'Preparing…' : 'Download certificate'}
          </button>
        </>
      )}

      <h3 className="eyebrow">Actions</h3>
      <div className="form-actions__buttons">
        {isManager && open && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => act({ label: 'paid', path: `/api/documents/${request.applicationId}/paid` })}
            disabled={request.isPaid || busy === 'paid'}
          >
            {request.isPaid ? 'Fee already marked paid' : busy === 'paid' ? 'Saving…' : 'Mark fee paid'}
          </button>
        )}

        {canApprove && (
          <button
            type="button"
            className="btn btn--gold"
            onClick={() =>
              act({ label: 'approve', path: `/api/documents/${request.applicationId}/approve` })
            }
            disabled={busy === 'approve'}
          >
            {busy === 'approve' ? 'Approving…' : 'Approve and issue'}
          </button>
        )}

        {canReject && !rejecting && (
          <button type="button" className="btn btn--ghost" onClick={() => setRejecting(true)}>
            Reject
          </button>
        )}
      </div>

      {canReject && rejecting && (
        <div className="form-grid">
          <label className="field field--full">
            <span>Reason (optional)</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. No entry for this name in the register"
            />
          </label>
          <div className="form-actions__buttons field--full">
            <button type="button" className="btn btn--ghost" onClick={() => setRejecting(false)}>
              Keep it open
            </button>
            <button
              type="button"
              className="btn btn--gold"
              onClick={() =>
                act({
                  label: 'reject',
                  path: `/api/documents/${request.applicationId}/reject`,
                  body: reason.trim() ? { reason: reason.trim() } : {},
                })
              }
              disabled={busy === 'reject'}
            >
              {busy === 'reject' ? 'Rejecting…' : 'Confirm rejection'}
            </button>
          </div>
        </div>
      )}

      {isPriest && request.status === 'pending' && (
        <p className="muted">
          Nothing to decide yet: the office has not attached a register entry. A request can only
          be approved once the entry it copies is attached.
        </p>
      )}
    </Modal>
  )
}
