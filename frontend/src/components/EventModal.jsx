// One event; rescheduling and approving both re-run Rule 1's three checks.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authed, isSessionError } from '../lib/api.js'
import { formatLongDate } from '../lib/dates.js'
import { messageFor } from '../lib/errors.js'
import {
  CHECK_MESSAGES,
  EDITABLE_STATUSES,
  STATUS_LABEL,
  SACRAMENT_LABEL,
  TYPE_LABEL,
  eventTypeLabel,
  statusPill,
  timeRange,
} from '../lib/schedule.js'
import Modal from './Modal.jsx'
import PriestSuggestion from './PriestSuggestion.jsx'

function messageOf(result) {
  return CHECK_MESSAGES[result.json?.code] ?? messageFor(result)
}

export default function EventModal({ event, role, priests = [], onClose, onChange, onSessionEnd }) {
  const [form, setForm] = useState({
    eventDate: event.eventDate,
    startTime: (event.startTime ?? '').slice(0, 5),
    endTime: (event.endTime ?? '').slice(0, 5),
    assignedPriestId: event.assignedPriestId ?? '',
  })
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState('')
  const [asking, setAsking] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const isManager = role === 'manager'
  const isPriest = role === 'priest'
  const open = EDITABLE_STATUSES.includes(event.status)
  const isSacramental = event.eventType === 'sacramental'
  const canDecide = isPriest && isSacramental && event.status === 'pending'

  async function act({ label, method = 'POST', path, body }) {
    setError('')
    setBusy(label)
    const r = await authed({ method, path, body })
    setBusy('')

    if (isSessionError(r)) {
      onSessionEnd()
      return null
    }
    if (!r.ok) {
      setError(messageOf(r))
      return null
    }
    onChange(r.json.event)
    setAsking('')
    setReason('')
    return r.json.event
  }

  async function save(submitEvent) {
    submitEvent.preventDefault()
    setError('')

    const patch = {}
    if (form.eventDate !== event.eventDate) patch.eventDate = form.eventDate
    if (form.startTime !== (event.startTime ?? '').slice(0, 5)) patch.startTime = form.startTime
    if (form.endTime !== (event.endTime ?? '').slice(0, 5)) patch.endTime = form.endTime
    if (form.assignedPriestId !== (event.assignedPriestId ?? '')) {
      patch.assignedPriestId = form.assignedPriestId
    }

    if (Object.keys(patch).length === 0) {
      setEditing(false)
      return
    }
    if (form.startTime >= form.endTime) {
      setError('The end time must be later than the start time.')
      return
    }

    const saved = await act({ label: 'save', method: 'PATCH', path: `/api/events/${event.eventId}`, body: patch })
    if (saved) setEditing(false)
  }

  const willLoseApproval = isSacramental && event.status === 'approved'

  return (
    <Modal open title={event.title} onClose={onClose}>
      <div className="modal__meta">
        <span className={statusPill(event.status)}>{STATUS_LABEL[event.status]}</span>
        <span className="chip chip--quiet">{eventTypeLabel(event)}</span>
        {event.priestNeedsReassignment && (
          <span className="chip chip--quiet">Assigned priest is no longer active</span>
        )}
      </div>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <dl className="facts">
        <div>
          <dt>Date</dt>
          <dd>{formatLongDate(event.eventDate)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{timeRange(event.startTime, event.endTime)}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>
            {TYPE_LABEL[event.eventType]}
            {event.sacramentType ? ` · ${SACRAMENT_LABEL[event.sacramentType]}` : ''}
          </dd>
        </div>
        <div>
          <dt>Assigned priest</dt>
          <dd>{event.assignedPriestName || 'None'}</dd>
        </div>
        {event.description && (
          <div>
            <dt>Description</dt>
            <dd>{event.description}</dd>
          </div>
        )}
        {event.approvedAt && (
          <div>
            <dt>Approved</dt>
            <dd>{formatLongDate(event.approvedAt.slice(0, 10))}</dd>
          </div>
        )}
        {event.statusReason && (
          <div>
            <dt>Reason</dt>
            <dd>{event.statusReason}</dd>
          </div>
        )}
      </dl>

      {isManager && open && !editing && (
        <div className="form-actions__buttons">
          <Link to={`/manager/roster?eventId=${event.eventId}`} className="btn btn--gold">
            Open roster
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
            Reschedule
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setAsking('cancel')}>
            Cancel event
          </button>
        </div>
      )}

      {isManager && editing && (
        <form className="form-grid" onSubmit={save}>
          {willLoseApproval && (
            <p className="notice field--full">
              This event is approved. Changing the date, the time or the priest sends it back to
              <strong> For approval</strong>, and the assigned priest decides again.
            </p>
          )}
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm((c) => ({ ...c, eventDate: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Start</span>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((c) => ({ ...c, startTime: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>End</span>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((c) => ({ ...c, endTime: e.target.value }))}
            />
          </label>
          {/* The reassign path. excludeEventId is load-bearing: without it this event
              counts as its own schedule conflict and every priest already on it reads as
              busy. editEvent passes the same exclusion to runChecks on save. */}
          {isSacramental && (
            <div className="field field--full">
              <PriestSuggestion
                eventDate={form.eventDate}
                startTime={form.startTime}
                endTime={form.endTime}
                excludeEventId={event.eventId}
                selectedId={form.assignedPriestId}
                onPick={(userId) => setForm((c) => ({ ...c, assignedPriestId: userId }))}
              />
            </div>
          )}

          <label className="field">
            <span>Assigned priest</span>
            <select
              value={form.assignedPriestId}
              onChange={(e) => setForm((c) => ({ ...c, assignedPriestId: e.target.value }))}
            >
              {!isSacramental && <option value="">No priest assigned</option>}
              {priests.map((priest) => (
                <option key={priest.userId} value={priest.userId}>
                  {priest.fullName}
                </option>
              ))}
            </select>
            {isSacramental && (
              <span className="form-hint">A sacramental event must have a priest.</span>
            )}
          </label>
          <div className="form-actions__buttons field--full">
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
              Keep as it is
            </button>
            <button type="submit" className="btn btn--gold" disabled={busy === 'save'}>
              {busy === 'save' ? 'Checking…' : 'Save new time'}
            </button>
          </div>
        </form>
      )}

      {canDecide && (
        <div className="form-actions__buttons">
          <button
            type="button"
            className="btn btn--gold"
            onClick={() => act({ label: 'approve', path: `/api/events/${event.eventId}/approve` })}
            disabled={busy === 'approve'}
          >
            {busy === 'approve' ? 'Checking…' : 'Approve'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setAsking('reject')}>
            Reject
          </button>
        </div>
      )}

      {asking && (
        <div className="form-grid">
          <label className="field field--full">
            <span>Reason (optional)</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={asking === 'reject' ? 'e.g. The date falls on a diocesan activity' : 'e.g. The family rescheduled'}
            />
          </label>
          <div className="form-actions__buttons field--full">
            <button type="button" className="btn btn--ghost" onClick={() => setAsking('')}>
              Keep it open
            </button>
            <button
              type="button"
              className="btn btn--gold"
              onClick={() =>
                act({
                  label: asking,
                  path: `/api/events/${event.eventId}/${asking}`,
                  body: reason.trim() ? { reason: reason.trim() } : {},
                })
              }
              disabled={busy === asking}
            >
              {busy === asking
                ? 'Saving…'
                : asking === 'reject'
                  ? 'Confirm rejection'
                  : 'Confirm cancellation'}
            </button>
          </div>
        </div>
      )}

      {isPriest && !isSacramental && (
        <p className="muted">
          General and seminar events need no approval — they are approved when the office creates
          them.
        </p>
      )}
      {!open && (
        <p className="muted">
          {STATUS_LABEL[event.status]} is final. Nothing about this event can be changed.
        </p>
      )}
    </Modal>
  )
}
