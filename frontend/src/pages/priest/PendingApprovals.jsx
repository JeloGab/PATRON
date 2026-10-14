// Sacramental events assigned to this priest and still waiting on him.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import EventModal from '../../components/EventModal.jsx'
import MonthGrid from '../../components/MonthGrid.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { formatWeekdayDate, isoOffset, todayISO } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'
import { STATUS_LABEL, eventTypeLabel, statusPill, timeRange } from '../../lib/schedule.js'
import { clearSession, getSession } from '../../lib/session.js'

const WINDOW_DAYS = 91

const FILTERS = [
  { id: 'pending', label: 'For approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All mine' },
]

export default function PendingApprovals() {
  const navigate = useNavigate()
  const session = getSession()
  const priestId = session?.userId
  const { refresh } = useOutletContext()
  const [events, setEvents] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [openId, setOpenId] = useState(null)
  const [error, setError] = useState('')

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const load = useCallback(async () => {
    const r = await authed({
      path: `/api/events?from=${todayISO()}&to=${isoOffset(WINDOW_DAYS)}`,
    })
    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      setEvents([])
      return
    }
    setError('')
    setEvents(r.json.events)
  }, [endSession])

  useEffect(() => {
    load()
  }, [load])

  const mine = useMemo(
    () =>
      (events ?? []).filter(
        (event) => event.eventType === 'sacramental' && event.assignedPriestId === priestId,
      ),
    [events, priestId],
  )

  const rows = useMemo(() => {
    if (filter === 'all') return mine
    return mine.filter((event) => event.status === filter)
  }, [mine, filter])

  const pendingCount = mine.filter((event) => event.status === 'pending').length
  const open = (events ?? []).find((item) => item.eventId === openId) ?? null

  function applyChange(next) {
    setEvents((current) =>
      (current ?? []).map((item) => (item.eventId === next.eventId ? next : item)),
    )

    refresh()
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Approvals</p>
          <h1>Pending approvals</h1>
          <p className="lede">
            Sacramental Events that are Assigned to You.
          </p>
        </div>
        <p className="stat">
          <strong>{events ? pendingCount : '—'}</strong>
          waiting for you
        </p>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="seg" role="group" aria-label="Approval status">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`seg__btn ${filter === item.id ? 'is-active' : ''}`}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {events === null ? (
        <p className="empty">Loading your events…</p>
      ) : rows.length === 0 ? (
        <p className="empty">
          {filter === 'pending'
            ? 'Nothing is waiting for your approval in the next three months.'
            : 'No event in this view.'}
        </p>
      ) : (
        <ul className="priest-list">
          {rows.map((event) => (
            <li key={event.eventId} className="priest-list__row">
              <div>
                <strong>{event.title}</strong>
                <p className="muted">
                  {formatWeekdayDate(event.eventDate)} ·{' '}
                  {timeRange(event.startTime, event.endTime)} · {eventTypeLabel(event)}
                </p>
                {event.statusReason && <p className="muted">Reason: {event.statusReason}</p>}
              </div>
              <div className="form-actions__buttons">
                <span className={statusPill(event.status)}>{STATUS_LABEL[event.status]}</span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setOpenId(event.eventId)}
                >
                  {event.status === 'pending' ? 'Review' : 'Open'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <EventModal
          event={open}
          role="priest"
          onClose={() => setOpenId(null)}
          onChange={applyChange}
          onSessionEnd={endSession}
        />
      )}
    </div>
  )
}
