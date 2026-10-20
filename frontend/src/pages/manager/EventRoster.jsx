// An event's participants and their frozen requirement checklists.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CompleteEventModal from '../../components/CompleteEventModal.jsx'
import EventCertificates from '../../components/EventCertificates.jsx'
import Loading from '../../components/Loading.jsx'
import RequirementChecklist from '../../components/RequirementChecklist.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { formatLongDate, isoOffset, todayISO } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'
import {
  GENDERS,
  PARTICIPANT_STATUS_HINT,
  PARTICIPANT_STATUS_LABEL,
  fieldRules,
  marriageWarning,
  participantPill,
  rosterAcceptsAdditions,
  rosterIsOpen,
} from '../../lib/roster.js'
import { STATUS_LABEL, eventTypeLabel, timeRange } from '../../lib/schedule.js'
import { clearSession } from '../../lib/session.js'

const WINDOW_DAYS = 91

const EMPTY = {
  participantName: '',
  gender: 'male',
  participantDateOfBirth: '',
  participantContact: '',
  sponsorName: '',
}

export default function EventRoster() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const eventId = params.get('eventId') ?? ''
  const [events, setEvents] = useState(null)
  const [participants, setParticipants] = useState(null)
  const [priests, setPriests] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [checklistFor, setChecklistFor] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    let live = true
    async function load() {
      const r = await authed({
        path: `/api/events?from=${todayISO()}&to=${isoOffset(WINDOW_DAYS)}`,
      })
      if (!live) return
      if (isSessionError(r)) {
        endSession()
        return
      }
      if (!r.ok) {
        setError(messageFor(r))
        setEvents([])
        return
      }
      setEvents(r.json.events)
    }
    load()
    return () => {
      live = false
    }
  }, [endSession])

  useEffect(() => {
    let live = true
    async function loadPriests() {
      const r = await authed({ path: '/api/parish/priests' })
      if (live && r.ok) setPriests(r.json.priests)
    }
    loadPriests()
    return () => {
      live = false
    }
  }, [])

  const event = useMemo(
    () => (events ?? []).find((item) => item.eventId === eventId) ?? null,
    [events, eventId],
  )

  const loadRoster = useCallback(async () => {
    if (!eventId) {
      setParticipants(null)
      return
    }
    const r = await authed({ path: `/api/participants?eventId=${encodeURIComponent(eventId)}` })
    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      setParticipants([])
      return
    }
    setError('')
    setParticipants(r.json.participants)
  }, [eventId, endSession])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  const rules = fieldRules(event)
  const canAdd = rosterAcceptsAdditions(event)
  const canEdit = rosterIsOpen(event)
  const warning = event && participants ? marriageWarning(event, participants) : null
  const canComplete =
    event?.status === 'approved' && event.eventDate <= todayISO() && event.eventType === 'sacramental'
  const cleared = (participants ?? []).filter((person) => person.status === 'cleared').length

  function update(field) {
    return (changed) => setForm((current) => ({ ...current, [field]: changed.target.value }))
  }

  function startAdd() {
    setForm(EMPTY)
    setEditingId(null)
    setAdding(true)
    setError('')
    setNotice('')
  }

  function startEdit(person) {
    setForm({
      participantName: person.participantName ?? '',
      gender: person.gender ?? 'male',
      participantDateOfBirth: person.participantDateOfBirth ?? '',
      participantContact: person.participantContact ?? '',
      sponsorName: person.sponsorName ?? '',
    })
    setEditingId(person.participantId)
    setAdding(false)
    setError('')
    setNotice('')
  }

  function closeForm() {
    setAdding(false)
    setEditingId(null)
    setForm(EMPTY)
  }

  async function submit(submitEvent) {
    submitEvent.preventDefault()
    setError('')
    setNotice('')

    const name = form.participantName.trim().replace(/\s+/g, ' ')
    if (name.length < 2) {
      setError('Enter the participant’s full name.')
      return
    }
    if (rules.birthDate && !form.participantDateOfBirth) {
      setError('A date of birth is required for a baptism or a confirmation.')
      return
    }
    if (rules.contact && !form.participantContact.trim()) {
      setError('A contact is required for a seminar or a general event.')
      return
    }

    const body = { participantName: name, gender: form.gender }
    if (form.participantDateOfBirth) body.participantDateOfBirth = form.participantDateOfBirth
    if (form.participantContact.trim()) body.participantContact = form.participantContact.trim()
    if (rules.sponsor && form.sponsorName.trim()) body.sponsorName = form.sponsorName.trim()

    setBusy('save')
    const r = editingId
      ? await authed({ method: 'PATCH', path: `/api/participants/${editingId}`, body })
      : await authed({ method: 'POST', path: '/api/participants', body: { ...body, eventId } })
    setBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    const saved = r.json.participant
    setNotice(
      editingId
        ? `${saved.participantName} was updated.`
        : saved.status === 'cleared'
          ? `${saved.participantName} was added and is already cleared — every requirement matched automatically.`
          : `${saved.participantName} was added. Their checklist is waiting.`,
    )
    closeForm()
    loadRoster()
  }

  async function withdraw(person) {
    if (!window.confirm(`Withdraw ${person.participantName} from this event?`)) return
    setBusy(person.participantId)
    setError('')
    const r = await authed({
      method: 'POST',
      path: `/api/participants/${person.participantId}/withdraw`,
    })
    setBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setNotice(`${person.participantName} was withdrawn.`)
    loadRoster()
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Rosters</p>
          <h1>Event participants</h1>
          <p className="lede">
            Who is taking part, and whether their prerequisites are satisfied. Only cleared
            participants are written into the register when the event is completed.
          </p>
        </div>
        {event && (
          <p className="stat">
            <strong>{participants ? `${cleared}/${participants.length}` : '—'}</strong>
            cleared
          </p>
        )}
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="notice">{notice}</p>}

      <div className="toolbar">
        <label className="field">
          <span>Event</span>
          <select
            value={eventId}
            onChange={(changed) => {
              const next = changed.target.value
              setParams(next ? { eventId: next } : {})
              setParticipants(null)
              closeForm()
              setNotice('')
            }}
          >
            <option value="">Choose an event…</option>
            {(events ?? []).map((item) => (
              <option key={item.eventId} value={item.eventId}>
                {formatLongDate(item.eventDate)} · {item.title} · {eventTypeLabel(item)} ·{' '}
                {STATUS_LABEL[item.status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!eventId ? (
        <p className="empty">
          Choose an event to see its roster. Events from today through the next three months are
          listed.
        </p>
      ) : !event ? (
        <p className="empty">That event is not in the current window. Choose another.</p>
      ) : (
        <>
          <section className="panel">
            <div className="panel__head">
              <div>
                <h2>{event.title}</h2>
                <p className="muted panel__note">
                  {formatLongDate(event.eventDate)} · {timeRange(event.startTime, event.endTime)} ·{' '}
                  {eventTypeLabel(event)} · {STATUS_LABEL[event.status]}
                </p>
              </div>
              <div className="panel__actions">
                {canAdd && (
                  <button type="button" className="btn btn--gold" onClick={startAdd}>
                    Add participant
                  </button>
                )}
                {canComplete && (
                  <button
                    type="button"
                    className="btn btn--gold"
                    onClick={() => setCompleting(true)}
                  >
                    Complete and issue
                  </button>
                )}
              </div>
            </div>

            {!canAdd && rosterIsOpen(event) && (
              <p className="notice">
                This event is approved, so no new participant can be added. Corrections and
                withdrawals are still open.
              </p>
            )}
            {!rosterIsOpen(event) && (
              <p className="notice">
                This event is {STATUS_LABEL[event.status].toLowerCase()}, so the roster is closed.
              </p>
            )}
            {warning && <p className="alert">{warning}</p>}

            {(adding || editingId) && (
              <form className="card editor" onSubmit={submit}>
                <p className="eyebrow">{editingId ? 'Correct a participant' : 'New participant'}</p>
                <div className="form-grid">
                  <label className="field">
                    <span>Full name *</span>
                    <input
                      value={form.participantName}
                      onChange={update('participantName')}
                      placeholder="Name as it should appear in the register"
                    />
                  </label>
                  <label className="field">
                    <span>Gender *</span>
                    <select value={form.gender} onChange={update('gender')}>
                      {GENDERS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Date of birth {rules.birthDate ? '*' : ''}</span>
                    <input
                      type="date"
                      value={form.participantDateOfBirth}
                      max={todayISO()}
                      onChange={update('participantDateOfBirth')}
                    />
                  </label>
                  <label className="field">
                    <span>Contact {rules.contact ? '*' : ''}</span>
                    <input
                      value={form.participantContact}
                      onChange={update('participantContact')}
                      placeholder="Mobile number or email"
                    />
                  </label>
                  {rules.sponsor && (
                    <label className="field field--full">
                      <span>Sponsor</span>
                      <input
                        value={form.sponsorName}
                        onChange={update('sponsorName')}
                        placeholder="Godparent or witness, if any"
                      />
                    </label>
                  )}
                </div>
                <div className="form-actions">
                  <p className="muted form-hint">
                    A date of birth is what lets a prerequisite match a register entry
                    automatically — without one, every requirement is checked by hand.
                  </p>
                  <div className="form-actions__buttons">
                    <button type="button" className="btn btn--ghost" onClick={closeForm}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn--gold" disabled={busy === 'save'}>
                      {busy === 'save' ? 'Saving…' : editingId ? 'Save changes' : 'Add to roster'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {event.status === 'completed' && (
              <EventCertificates eventId={event.eventId} onSessionEnd={endSession} />
            )}

            {participants === null ? (
              <Loading label="Loading the roster…" />
            ) : participants.length === 0 ? (
              <p className="empty">No participant on this roster yet.</p>
            ) : (
              <ul className="priest-list">
                {participants.map((person) => (
                  <li key={person.participantId} className="priest-list__row">
                    <div>
                      <strong>{person.participantName}</strong>
                      <p className="muted">
                        <span className={participantPill(person.status)}>
                          {PARTICIPANT_STATUS_LABEL[person.status]}
                        </span>
                        {person.participantDateOfBirth
                          ? ` · born ${formatLongDate(person.participantDateOfBirth)}`
                          : ' · no date of birth'}
                        {person.participantContact ? ` · ${person.participantContact}` : ''}
                        {person.sponsorName ? ` · sponsor: ${person.sponsorName}` : ''}
                      </p>
                      <p className="muted">{PARTICIPANT_STATUS_HINT[person.status]}</p>
                    </div>
                    <div className="form-actions__buttons">
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setChecklistFor(person)}
                      >
                        Checklist
                      </button>
                      {canEdit && person.status !== 'withdrawn' && (
                        <>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => startEdit(person)}
                          >
                            Correct
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => withdraw(person)}
                            disabled={busy === person.participantId}
                          >
                            Withdraw
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {completing && participants && (
        <CompleteEventModal
          event={event}
          participants={participants}
          signatory={priests.find((p) => p.userId === event.assignedPriestId) ?? null}
          onClose={() => setCompleting(false)}
          onDone={(updated) => {
            setEvents((current) =>
              (current ?? []).map((item) =>
                item.eventId === updated.eventId ? updated : item,
              ),
            )
            loadRoster()
          }}
          onSessionEnd={endSession}
        />
      )}

      {checklistFor && (
        <RequirementChecklist
          participant={checklistFor}
          canDecide={canEdit}
          onClose={() => setChecklistFor(null)}
          onDecided={loadRoster}
          onSessionEnd={endSession}
        />
      )}
    </div>
  )
}
