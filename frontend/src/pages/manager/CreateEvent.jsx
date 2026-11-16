// Scheduling an event; the three checks refuse on save, with no override.

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PriestSuggestion from '../../components/PriestSuggestion.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { formatWeekdayDate, todayISO } from '../../lib/dates.js'
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

function seedForm(search) {
  const date = search.get('date') ?? ''
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayISO()
  return valid ? { ...EMPTY, eventDate: date } : EMPTY
}

export default function CreateEvent() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [form, setForm] = useState(() => seedForm(search))
  const [priests, setPriests] = useState([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [multi, setMulti] = useState(false)
  const [dates, setDates] = useState([])
  const [results, setResults] = useState(null)

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

  function changeType(event) {
    const eventType = event.target.value
    setForm((current) => ({ ...current, eventType }))
    if (eventType === 'sacramental') {
      setMulti(false)
      setDates([])
      setResults(null)
    }
  }

  function toggleMulti(event) {
    const on = event.target.checked
    setMulti(on)
    setResults(null)
    setError('')
    if (!on) setDates([])
  }

  function addDate() {
    const date = form.eventDate
    setResults(null)

    if (!date) {
      setError('Pick a date to add.')
      return
    }
    if (date < todayISO()) {
      setError('An event can only be scheduled for today or later.')
      return
    }
    if (dates.includes(date)) {
      setError('That date is already on the list.')
      return
    }

    setError('')
    setDates((current) => [...current, date].sort())
    setForm((current) => ({ ...current, eventDate: '' }))
  }

  function removeDate(date) {
    setDates((current) => current.filter((item) => item !== date))
    setResults(null)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setResults(null)

    if (!form.title.trim()) {
      setError('Give the event a title.')
      return
    }
    const unadded =
      multi && form.eventDate && !dates.includes(form.eventDate) ? [form.eventDate] : []
    const chosen = [...dates, ...unadded].sort()

    if (multi && chosen.length === 0) {
      setError('Add at least one date, or untick Several dates.')
      return
    }
    if (multi && chosen.some((date) => date < todayISO())) {
      setError('An event can only be scheduled for today or later.')
      return
    }
    if (!multi && !form.eventDate) {
      setError('Choose the date of the event.')
      return
    }
    if (!multi && form.eventDate < todayISO()) {
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
      startTime: form.startTime,
      endTime: form.endTime,
    }
    if (sacramental) body.sacramentType = form.sacramentType
    if (form.description.trim()) body.description = form.description.trim()
    if (form.assignedPriestId) body.assignedPriestId = form.assignedPriestId

    if (unadded.length > 0) setForm((current) => ({ ...current, eventDate: '' }))

    setPending(true)

    const outcome = []
    const unsaved = []

    for (const date of multi ? chosen : [form.eventDate]) {
      const r = await authed({
        method: 'POST',
        path: '/api/events',
        body: { ...body, eventDate: date },
      })

      if (isSessionError(r)) {
        setPending(false)
        endSession()
        return
      }
      if (r.ok) {
        outcome.push({ date, ok: true })
      } else {
        outcome.push({ date, ok: false, message: CHECK_MESSAGES[r.json?.code] ?? messageFor(r) })
        unsaved.push(date)
      }
    }

    setPending(false)

    if (unsaved.length === 0) {
      navigate('/manager/schedule', { replace: true })
      return
    }

    if (!multi) {
      setError(outcome[0].message)
      return
    }

    setDates(unsaved)
    setResults(outcome)
  }

  const saved = results ? results.filter((item) => item.ok).length : 0

  const picked = dates.length + (form.eventDate && !dates.includes(form.eventDate) ? 1 : 0)

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
              : 'General and seminar events are approved as soon as they are created. One that runs on several dates is saved as one event per date, each checked on its own.'}
          </p>
        </div>
      </header>

      <form className="card form-card" onSubmit={submit}>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {results && (
          <div className="notice" role="status">
            <p>
              <strong>
                {saved} of {results.length} dates saved.
              </strong>{' '}
              The ones that were refused are still on the list below — move them to another
              day and submit again. Nothing that saved is undone.
            </p>
            <ul className="date-list">
              {results.map((item) => (
                <li key={item.date} className={item.ok ? 'is-saved' : 'is-failed'}>
                  <span className="date-list__text">{formatWeekdayDate(item.date)}</span>
                  <span className="date-list__note">{item.ok ? 'Created' : item.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {priests.length === 0 && (
          <p className="notice">
            No active priest is assigned to this parish yet, so a sacramental event cannot be
            created. The diocesan administrator provisions priests.
          </p>
        )}

        <div className="form-grid">
          <label className="field">
            <span>Type<b className="req">*</b></span>
            <select value={form.eventType} onChange={changeType}>
              {EVENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {sacramental && (
            <label className="field">
              <span>Sacrament<b className="req">*</b></span>
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
            <span>Title<b className="req">*</b></span>
            <input
              value={form.title}
              onChange={update('title')}
              placeholder="e.g. Baptism of the Dela Cruz child"
            />
          </label>

          {!sacramental && (
            <label className="check-line field--full">
              <input type="checkbox" checked={multi} onChange={toggleMulti} />
              <span className="check-line__text">
                Several dates — the same event, saved once for each date you add
              </span>
            </label>
          )}

          {multi ? (
            <div className="field field--full">
              <span>Dates<b className="req">*</b></span>
              <div className="date-add">
                <input
                  type="date"
                  value={form.eventDate}
                  min={todayISO()}
                  onChange={update('eventDate')}
                />
                <button type="button" className="btn btn--ghost" onClick={addDate}>
                  Add date
                </button>
              </div>
              {dates.length > 0 ? (
                <ul className="date-list">
                  {dates.map((date) => (
                    <li key={date}>
                      <span className="date-list__text">{formatWeekdayDate(date)}</span>
                      <button type="button" className="text-btn" onClick={() => removeDate(date)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="form-hint">
                  Pick a day and press Add date. They all share this title, these times and this
                  priest.
                </span>
              )}
            </div>
          ) : (
            <label className="field">
              <span>Date<b className="req">*</b></span>
              <input
                type="date"
                value={form.eventDate}
                min={todayISO()}
                onChange={update('eventDate')}
              />
            </label>
          )}

          <label className="field">
            <span>Start<b className="req">*</b></span>
            <input type="time" value={form.startTime} onChange={update('startTime')} />
          </label>

          <label className="field">
            <span>End<b className="req">*</b></span>
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
            <span>Assigned priest{sacramental && <b className="req">*</b>}</span>
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
            {multi
              ? 'Every date is checked on its own — parish blocked dates, then the priest’s own unavailability, then his other events. A date that clashes is refused and stays on the list; the others are still created.'
              : 'The date is checked against parish blocked dates, then the priest’s own unavailability, then his other events — a clash is refused, not warned about, and touching times count as a clash. A funeral is recorded in the death register once completed.'}
          </p>
          <div className="form-actions__buttons">
            <Link to="/manager/schedule" className="btn btn--ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn--gold" disabled={pending}>
              {pending
                ? multi
                  ? 'Checking the dates…'
                  : 'Checking the date…'
                : multi
                  ? `Create ${picked} event${picked === 1 ? '' : 's'}`
                  : 'Create event'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
