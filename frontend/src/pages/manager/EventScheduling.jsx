import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EventModal from '../../components/EventModal.jsx'
import EventTable from '../../components/EventTable.jsx'
import Loading from '../../components/Loading.jsx'
import MonthGrid from '../../components/MonthGrid.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { formatMonth, formatWeekdayDate, todayISO } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'
import {
  STATUS_LABEL,
  clock,
  eventTypeLabel,
  groupByDate,
  monthWindow,
  statusPill,
  timeRange,
} from '../../lib/schedule.js'
import { clearSession } from '../../lib/session.js'

export default function EventScheduling() {
  const navigate = useNavigate()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [events, setEvents] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [priests, setPriests] = useState([])
  const [openId, setOpenId] = useState(null)
  const [showBlocked, setShowBlocked] = useState(false)
  const [error, setError] = useState('')

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const load = useCallback(async () => {
    const { from, to } = monthWindow(cursor.year, cursor.month)
    const [e, b] = await Promise.all([
      authed({ path: `/api/events?from=${from}&to=${to}` }),
      authed({ path: `/api/blocked-dates?from=${from}&to=${to}` }),
    ])

    if (isSessionError(e) || isSessionError(b)) {
      endSession()
      return
    }
    if (!e.ok) {
      setError(messageFor(e))
      setEvents([])
      return
    }
    setError('')
    setEvents(e.json.events)
    setBlocks(b.ok ? b.json.blocks : [])
  }, [cursor.year, cursor.month, endSession])

  useEffect(() => {
    load()
  }, [load])

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

  const eventsByDate = useMemo(() => groupByDate(events ?? [], 'eventDate'), [events])

  const parishBlocks = useMemo(() => (blocks ?? []).filter((b) => b.type === 'parish'), [blocks])
  const priestBlocks = useMemo(() => (blocks ?? []).filter((b) => b.type === 'priest'), [blocks])
  const parishBlocksByDate = useMemo(() => groupByDate(parishBlocks, 'date'), [parishBlocks])
  const priestBlocksByDate = useMemo(() => groupByDate(priestBlocks, 'date'), [priestBlocks])

  const dayEvents = eventsByDate.get(selectedDate) ?? []
  const dayBlocks = [
    ...(parishBlocksByDate.get(selectedDate) ?? []),
    ...(priestBlocksByDate.get(selectedDate) ?? []),
  ]
  const open = (events ?? []).find((item) => item.eventId === openId) ?? null

  function shiftMonth(amount) {
    const next = new Date(cursor.year, cursor.month + amount, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
    setEvents(null)
  }

  function applyChange(next) {
    setEvents((current) =>
      (current ?? []).map((item) => (item.eventId === next.eventId ? next : item)),
    )
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Scheduling</p>
          <h1>Parish calendar</h1>
          <p className="lede">
            Events and blocked dates for the month shown. A sacramental event waits for its
            assigned priest to approve it; general and seminar events are approved as soon as the
            office creates them.
          </p>
        </div>
        <div className="panel__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setShowBlocked((o) => !o)}>
            {showBlocked ? 'Hide blocked dates' : 'Blocked dates'}
          </button>
          <Link to="/manager/events/block" className="btn btn--ghost">
            Add blocked date
          </Link>
          <Link to="/manager/events/new" className="btn btn--gold">
            Create event
          </Link>
        </div>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {showBlocked && (
        <section className="panel" aria-labelledby="blocked-heading">
          <h2 id="blocked-heading">Blocked dates this month</h2>
          {blocks.length === 0 ? (
            <p className="empty">No date is blocked in this window.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Scope</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block) => (
                    <tr key={block.blockedDateId}>
                      <td>{formatWeekdayDate(block.date)}</td>
                      <td>
                        {block.startTime
                          ? timeRange(block.startTime, block.endTime)
                          : 'Whole day'}
                      </td>
                      <td>{block.type === 'parish' ? 'Whole parish' : 'One priest'}</td>
                      <td>{block.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <p className="map-summary">
        <strong>{events ? events.length : '—'}</strong> events this month
        <span>{parishBlocks.length} parish blocks</span>
        <span>{priestBlocks.length} priest blocks</span>
      </p>

      <section className="panel" id="parish-calendar" aria-labelledby="calendar-heading">
        <div className="panel__head">
          <h2 id="calendar-heading">{formatMonth(cursor.year, cursor.month)}</h2>
          <div className="panel__actions">
            <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(-1)}>
              Previous
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                const current = new Date()
                setCursor({ year: current.getFullYear(), month: current.getMonth() })
                setSelectedDate(todayISO())
              }}
            >
              Today
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(1)}>
              Next
            </button>
          </div>
        </div>

        {events === null ? (
          <Loading label="Loading the month…" />
        ) : (
          <MonthGrid
            year={cursor.year}
            month={cursor.month}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectEvent={(event) => setOpenId(event.eventId)}
            selectedEventId={openId}
            eventsByDate={eventsByDate}
            parishBlocksByDate={parishBlocksByDate}
            priestBlocksByDate={priestBlocksByDate}
          />
        )}

        <div className="day-detail">
          <h3>{formatWeekdayDate(selectedDate)}</h3>
          {dayBlocks.length === 0 && dayEvents.length === 0 ? (
            <p className="muted">Nothing scheduled on this day.</p>
          ) : (
            <>
              {dayBlocks.length > 0 && (
                <ul className="day-detail__list">
                  {dayBlocks.map((block) => (
                    <li key={block.blockedDateId}>
                      <strong>{block.type === 'parish' ? 'Parish blocked' : 'Priest unavailable'}</strong>
                      <span>
                        {block.startTime ? timeRange(block.startTime, block.endTime) : 'Whole day'}
                        {block.reason ? ` · ${block.reason}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {dayEvents.length > 0 && (
                <ul className="day-detail__list">
                  {dayEvents.map((event) => (
                    <li key={event.eventId}>
                      <strong>{event.title}</strong>
                      <span>
                        {clock(event.startTime)} · {eventTypeLabel(event)} ·{' '}
                        {event.assignedPriestName || 'No priest'} ·{' '}
                        <span className={statusPill(event.status)}>
                          {STATUS_LABEL[event.status]}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => setOpenId(event.eventId)}
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>All events this month</h2>
        </div>
        <EventTable
          events={events ?? []}
          empty="No event falls in this month."
          onSelect={(event) => setOpenId(event.eventId)}
          selectedId={openId}
          showSearch
        />
      </section>

      {open && (
        <EventModal
          event={open}
          role="manager"
          priests={priests}
          onClose={() => setOpenId(null)}
          onChange={applyChange}
          onSessionEnd={endSession}
        />
      )}
    </div>
  )
}
