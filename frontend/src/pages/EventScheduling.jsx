import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EventTable from '../components/EventTable.jsx'
import { useEvents } from '../context/EventsContext.jsx'
import {
  buildMonthGrid,
  formatDateTime,
  formatMonth,
  formatWeekdayDate,
  isUpcomingEvent,
  toISODate,
  todayISO,
} from '../lib/dates.js'
import { eventCategory, eventStatusLabel, eventTypeLabel } from '../lib/events.js'
import StatusPill from '../components/StatusPill.jsx'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function EventScheduling() {
  const { events, blocks } = useEvents()
  const today = todayISO()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedId, setSelectedId] = useState(null)
  const [range, setRange] = useState('all')
  const [showBlocked, setShowBlocked] = useState(false)

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const byDate = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      const list = map.get(event.date) || []
      list.push(event)
      map.set(event.date, list)
    })
    return map
  }, [events])

  const blocksByDate = useMemo(() => {
    const map = new Map()
    blocks.forEach((block) => {
      const list = map.get(block.date) || []
      list.push(block)
      map.set(block.date, list)
    })
    return map
  }, [blocks])

  const upcomingCount = events.filter((event) => isUpcomingEvent(event)).length
  const pastCount = events.length - upcomingCount
  const dayEvents = byDate.get(selectedDate) || []
  const dayBlocks = blocksByDate.get(selectedDate) || []

  const listed = events.filter((event) => {
    if (range === 'upcoming') return isUpcomingEvent(event)
    if (range === 'past') return !isUpcomingEvent(event)
    return true
  })

  function shiftMonth(amount) {
    const next = new Date(cursor.year, cursor.month + amount, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  function focusEvent(event) {
    const [year, month] = event.date.split('-').map(Number)
    setCursor({ year, month: month - 1 })
    setSelectedDate(event.date)
    setSelectedId(event.id)
    document.getElementById('parish-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Event scheduling</p>
          <h1>Parish calendar</h1>
          <p className="lede">
            Every upcoming and past event on one calendar. Select a date, or a row below, to place
            it on the month.
          </p>
        </div>
        <div className="panel__actions">
          <button
            type="button"
            className={`btn btn--ghost ${showBlocked ? 'is-active' : ''}`}
            onClick={() => setShowBlocked((current) => !current)}
          >
            Blocked dates
          </button>
          <Link to="/events/block" className="btn btn--ghost">
            Add blocked date
          </Link>
          <Link to="/events/new" className="btn btn--gold">
            Create event
          </Link>
        </div>
      </header>

      {showBlocked && (
        <section className="panel" aria-labelledby="blocked-heading">
          <h2 id="blocked-heading">Blocked dates</h2>
          {blocks.length === 0 ? (
            <p className="empty">No dates are blocked.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date & time</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block) => (
                    <tr key={block.id}>
                      <td>{formatDateTime(block.date, block.time)}</td>
                      <td>{block.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <p className="map-summary">
        <strong>{events.length}</strong> events mapped
        <span>{upcomingCount} upcoming</span>
        <span>{pastCount} past</span>
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
                setSelectedDate(today)
              }}
            >
              Today
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(1)}>
              Next
            </button>
          </div>
        </div>

        <div className="cal-legend">
          <span className="cal-legend__item cal-legend__item--sacramental">Sacramental</span>
          <span className="cal-legend__item cal-legend__item--general">General</span>
          <span className="cal-legend__item cal-legend__item--seminar">Seminar</span>
          <span className="cal-legend__item cal-legend__item--blocked">Blocked</span>
        </div>

        <div className="cal" role="grid" aria-label={formatMonth(cursor.year, cursor.month)}>
          {WEEKDAYS.map((day) => (
            <div key={day} className="cal__weekday" role="columnheader">
              {day}
            </div>
          ))}
          {cells.map((date) => {
            const iso = toISODate(date)
            const inMonth = date.getMonth() === cursor.month
            const items = byDate.get(iso) || []
            const dayBlockList = blocksByDate.get(iso) || []
            const extra = Math.max(0, items.length - 2)
            return (
              <div
                key={iso}
                className={[
                  'cal__day',
                  inMonth ? '' : 'is-out',
                  iso === today ? 'is-today' : '',
                  iso === selectedDate ? 'is-selected' : '',
                  dayBlockList.length > 0 ? 'is-blocked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="gridcell"
              >
                <button type="button" className="cal__date" onClick={() => setSelectedDate(iso)}>
                  {date.getDate()}
                </button>
                {items.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={`cal__event cal__event--${eventCategory(event)} ${
                      isUpcomingEvent(event) ? '' : 'is-past'
                    } ${selectedId === event.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedDate(iso)
                      setSelectedId(event.id)
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayBlockList.slice(0, 1).map((block) => (
                  <span key={block.id} className="cal__block">
                    {block.reason}
                  </span>
                ))}
                {extra > 0 && <span className="cal__more">+{extra} more</span>}
              </div>
            )
          })}
        </div>

        <div className="day-detail">
          <h3>{formatWeekdayDate(selectedDate)}</h3>
          {dayBlocks.length === 0 && dayEvents.length === 0 ? (
            <p className="muted">No events on this day.</p>
          ) : (
            <>
              {dayBlocks.length > 0 && (
                <ul className="day-detail__list">
                  {dayBlocks.map((block) => (
                    <li key={block.id}>
                      <strong>Blocked</strong>
                      <span>
                        {formatDateTime(block.date, block.time)} · {block.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {dayEvents.length > 0 && (
                <ul className="day-detail__list">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <strong>{event.title}</strong>
                      <span>
                        {eventCategory(event) === 'sacramental'
                          ? `${event.sacrament} · ${event.priest} · ${event.participants.toLocaleString()} participants`
                          : eventTypeLabel(event)}
                      </span>
                      <StatusPill status={eventStatusLabel(event)} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      <section className="panel panel--spaced" aria-labelledby="all-events-heading">
        <div className="panel__head">
          <div>
            <h2 id="all-events-heading">All events</h2>
            <p className="muted panel__note">Select a row to jump to that date on the calendar.</p>
          </div>
          <div className="seg" role="group" aria-label="Filter events">
            {[
              ['all', 'All'],
              ['upcoming', 'Upcoming'],
              ['past', 'Past'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`seg__btn ${range === value ? 'is-active' : ''}`}
                onClick={() => setRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <EventTable
          events={listed}
          showWhen
          selectedId={selectedId}
          onSelect={focusEvent}
          showSearch
          empty="No events in this view."
        />
      </section>
    </div>
  )
}
