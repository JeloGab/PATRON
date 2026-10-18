// The priest's calendar: parish events, parish blocks, his own unavailable days.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EventModal from '../../components/EventModal.jsx'
import EventTable from '../../components/EventTable.jsx'
import Loading from '../../components/Loading.jsx'
import MonthGrid from '../../components/MonthGrid.jsx'
import Seg from '../../components/Seg.jsx'
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
import { clearSession, getSession } from '../../lib/session.js'

export default function MyCalendar() {
  const navigate = useNavigate()
  const session = getSession()
  const priestId = session?.userId
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [events, setEvents] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [openId, setOpenId] = useState(null)
  const [mineOnly, setMineOnly] = useState(true)
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

  const shownEvents = useMemo(() => {
    const all = events ?? []
    if (!mineOnly) return all
    return all.filter((event) => event.assignedPriestId === priestId)
  }, [events, mineOnly, priestId])

  const eventsByDate = useMemo(() => groupByDate(shownEvents, 'eventDate'), [shownEvents])
  const parishBlocksByDate = useMemo(
    () => groupByDate((blocks ?? []).filter((b) => b.type === 'parish'), 'date'),
    [blocks],
  )
  const myBlocksByDate = useMemo(
    () =>
      groupByDate(
        (blocks ?? []).filter((b) => b.type === 'priest' && b.priestId === priestId),
        'date',
      ),
    [blocks, priestId],
  )

  const dayEvents = eventsByDate.get(selectedDate) ?? []
  const dayParishBlocks = parishBlocksByDate.get(selectedDate) ?? []
  const dayMyBlocks = myBlocksByDate.get(selectedDate) ?? []
  const open = (events ?? []).find((item) => item.eventId === openId) ?? null
  const myPending = (events ?? []).filter(
    (event) =>
      event.status === 'pending' &&
      event.eventType === 'sacramental' &&
      event.assignedPriestId === priestId,
  )

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
          <p className="eyebrow">My schedule</p>
          <h1>My calendar</h1>
          <p className="lede">
            Assigned Events, Parish Block Dates, Unavailable Dates and Parish Calendar
             as a Whole.
          </p>
        </div>
        <div className="panel__actions">
          {myPending.length > 0 && (
            <Link to="/priest/approvals" className="btn btn--gold">
              {myPending.length} waiting for approval
            </Link>
          )}
          <Link to="/priest/unavailable" className="btn btn--ghost">
            Unavailable dates
          </Link>
        </div>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <Seg label="Whose events">
        <button
          type="button"
          className={`seg__btn ${mineOnly ? 'is-active' : ''}`}
          aria-pressed={mineOnly}
          onClick={() => setMineOnly(true)}
        >
          Assigned to me
        </button>
        <button
          type="button"
          className={`seg__btn ${mineOnly ? '' : 'is-active'}`}
          aria-pressed={!mineOnly}
          onClick={() => setMineOnly(false)}
        >
          Whole parish
        </button>
      </Seg>

      <section className="panel" aria-labelledby="calendar-heading">
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
            priestBlocksByDate={myBlocksByDate}
          />
        )}

        <div className="day-detail">
          <h3>{formatWeekdayDate(selectedDate)}</h3>
          {dayEvents.length === 0 && dayParishBlocks.length === 0 && dayMyBlocks.length === 0 ? (
            <p className="muted">Nothing on this day.</p>
          ) : (
            <>
              {(dayParishBlocks.length > 0 || dayMyBlocks.length > 0) && (
                <ul className="day-detail__list">
                  {dayParishBlocks.map((block) => (
                    <li key={block.blockedDateId}>
                      <strong>Parish blocked</strong>
                      <span>
                        {block.startTime ? timeRange(block.startTime, block.endTime) : 'Whole day'}
                        {block.reason ? ` · ${block.reason}` : ''}
                      </span>
                    </li>
                  ))}
                  {dayMyBlocks.map((block) => (
                    <li key={block.blockedDateId}>
                      <strong>You are unavailable</strong>
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
          <h2>{mineOnly ? 'My events this month' : 'All parish events this month'}</h2>
        </div>
        <EventTable
          events={shownEvents}
          empty={mineOnly ? 'No event is assigned to you this month.' : 'No event this month.'}
          onSelect={(event) => setOpenId(event.eventId)}
          selectedId={openId}
          showSearch
        />
      </section>

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
