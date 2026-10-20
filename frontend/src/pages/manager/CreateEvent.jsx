// Scheduling an event; the three checks refuse on save, with no override.

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PriestSuggestion from '../../components/PriestSuggestion.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { todayISO } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'
import { CHECK_MESSAGES, EVENT_TYPES, SACRAMENT_TYPES } from '../../lib/schedule.js'
import { clearSession } from '../../lib/session.js'

const EMPTY = {
  eventType: 'sacramental',
  sacramentType: 'baptism',
  title: '',
  description: '',
  eventDate: '',
  startTime: '08:00',
  endTime: '09:00',
  assignedPriestId: '',
}

export default function CreateEvent() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [priests, setPriests] = useState([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    let live = true
    async function load() {
      const r = await authed({ path: '/api/parish/priests' })
      if (!live) return
      if (isSessionError(r)) {
        endSession()
        return
      }
      if (!r.ok) {
        setError(messageFor(r))
        return
      }
      setPriests(r.json.priests)

      if (r.json.priests.length > 0) {
        setForm((current) => ({
          ...current,
          assignedPriestId: current.assignedPriestId || r.json.priests[0].userId,
        }))
      }
    }
    load()
    return () => {
      live = false
    }
  }, [endSession])

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const sacramental = form.eventType === 'sacramental'

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!form.title.trim()) {
      setError('Give the event a title.')
      return
    }
    if (!form.eventDate) {
      setError('Choose the date of the event.')
      return
    }

    if (form.eventDate < todayISO()) {
      setError('An event can only be scheduled for today or later.')
      return
    }
    if (form.startTime >= form.endTime) {
      setError('The end time must be later than the start time.')
      return
    }
    if (sacramental && !form.assignedPriestId) {
      setError('A sacramental event must have an assigned priest — he is the one who approves it.')
      return
    }

    const body = {
      eventType: form.eventType,
      title: form.title.trim(),
      eventDate: form.eventDate,
      startTime: form.startTime,
      endTime: form.endTime,
    }
    if (sacramental) body.sacramentType = form.sacramentType
    if (form.description.trim()) body.description = form.description.trim()
    if (form.assignedPriestId) body.assignedPriestId = form.assignedPriestId

    setPending(true)
    const r = await authed({ method: 'POST', path: '/api/events', body })
    setPending(false)

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(CHECK_MESSAGES[r.json?.code] ?? messageFor(r))
      return
    }

    navigate('/manager/schedule', { replace: true })
  }

  return (
    <div className="page">
      <Link to="/manager/schedule" className="back">
        ← Back to the calendar
      </Link>

      <header className="page__hero">
        <div>
          <p className="eyebrow">Scheduling</p>
          <h1>Create an event</h1>
          <p className="lede">
            {sacramental
              ? 'A sacramental event is saved as For approval and sent to its assigned priest.'
              : 'General and seminar events are approved as soon as they are created.'}
          </p>
        </div>
      </header>

      <form className="card form-card" onSubmit={submit}>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {priests.length === 0 && (
          <p className="notice">
            No active priest is assigned to this parish yet, so a sacramental event cannot be
            created. The diocesan administrator provisions priests.
          </p>
        )}

        <div className="form-grid">
          <label className="field">
            <span>Type *</span>
            <select value={form.eventType} onChange={update('eventType')}>
              {EVENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {sacramental && (
            <label className="field">
              <span>Sacrament *</span>
              <select value={form.sacramentType} onChange={update('sacramentType')}>
                {SACRAMENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field field--full">
            <span>Title *</span>
            <input
              value={form.title}
              onChange={update('title')}
              placeholder="e.g. Baptism of the Dela Cruz child"
            />
          </label>

          <label className="field">
            <span>Date *</span>
            <input
              type="date"
              value={form.eventDate}
              min={todayISO()}
              onChange={update('eventDate')}
            />
          </label>

          <label className="field">
            <span>Start *</span>
            <input type="time" value={form.startTime} onChange={update('startTime')} />
          </label>

          <label className="field">
            <span>End *</span>
            <input type="time" value={form.endTime} onChange={update('endTime')} />
          </label>

          {sacramental && (
            <div className="field field--full">
              <PriestSuggestion
                eventDate={form.eventDate}
                startTime={form.startTime}
                endTime={form.endTime}
                selectedId={form.assignedPriestId}
                onPick={(userId) => setForm((current) => ({ ...current, assignedPriestId: userId }))}
              />
            </div>
          )}

          <label className="field">
            <span>Assigned priest {sacramental ? '*' : ''}</span>
            <select value={form.assignedPriestId} onChange={update('assignedPriestId')}>
              {!sacramental && <option value="">No priest assigned</option>}
              {priests.map((priest) => (
                <option key={priest.userId} value={priest.userId}>
                  {priest.fullName}
                  {priest.hasSignature === false ? ' · no signature yet' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--full">
            <span>Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={update('description')}
              placeholder="Optional. Anything the office or the priest should know on the day."
            />
          </label>
        </div>

        <div className="form-actions">
          <p className="muted form-hint">
            The date is checked against parish blocked dates, then the priest’s own unavailability,
            then his other events — a clash is refused, not warned about, and touching times
            count as a clash. A funeral is recorded in the death register once completed.
          </p>
          <div className="form-actions__buttons">
            <Link to="/manager/schedule" className="btn btn--ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn--gold" disabled={pending}>
              {pending ? 'Checking the date…' : 'Create event'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
