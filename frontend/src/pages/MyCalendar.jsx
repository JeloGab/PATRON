import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import StatusPill from '../components/StatusPill.jsx'
import { useParish } from '../context/ParishContext.jsx'
import {
  buildMonthGrid,
  formatDateTime,
  formatMonth,
  formatWeekdayDate,
  isUpcomingEvent,
  toISODate,
  todayISO,
} from '../lib/dates.js'
import { eventStatusLabel, eventTypeLabel } from '../lib/events.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function groupByDate(items) {
  const map = new Map()
  items.forEach((item) => {
    const list = map.get(item.date) || []
    list.push(item)
    map.set(item.date, list)
  })
  return map
}

export default function MyCalendar() {
  const { events, churchBlocks, unavailable, priest } = useParish()
  const location = useLocation()
  const today = todayISO()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedId, setSelectedId] = useState(null)
  const [range, setRange] = useState('all')
  const [showLists, setShowLists] = useState(Boolean(location.state?.showUnavailable))

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )
  const eventsByDate = useMemo(() => groupByDate(events), [events])
  const blocksByDate = useMemo(() => groupByDate(churchBlocks), [churchBlocks])
  const unavailableByDate = useMemo(() => groupByDate(unavailable), [unavailable])

  const upcomingCount = events.filter((event) => isUpcomingEvent(event)).length
  const dayEvents = eventsByDate.get(selectedDate) || []
  const dayBlocks = blocksByDate.get(selectedDate) || []
  const dayUnavailable = unavailableByDate.get(selectedDate) || []
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
    document.getElementById('priest-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Parish priest</p>
          <h1>My calendar</h1>
          <p className="lede">
            Church blocked dates, and only the events assigned to {priest.name}.
          </p>
        </div>
        <div className="panel__actions">
          <button
            type="button"
            className={`btn btn--ghost ${showLists ? 'is-active' : ''}`}
            onClick={() => setShowLists((current) => !current)}
          >
            Date lists
          </button>
          <Link to="/unavailable" className="btn btn--gold">
            Add unavailable date
          </Link>
        </div>
      </header>

      {showLists && (
        <>
          <section className="panel" aria-labelledby="blocked-heading">
            <h2 id="blocked-heading">Church blocked dates</h2>
            {churchBlocks.length === 0 ? (
              <p className="empty">The church has no blocked dates.</p>
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
                    {churchBlocks.map((block) => (
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

          <section className="panel panel--spaced" aria-labelledby="unavailable-heading">
            <h2 id="unavailable-heading">My unavailable dates</h2>
            {unavailable.length === 0 ? (
              <p className="empty">You have not marked any unavailable dates.</p>
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
                    {unavailable.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDateTime(entry.date, entry.time)}</td>
                        <td>{entry.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <p className="map-summary">
        <strong>{events.length}</strong> assigned events
        <span>{upcomingCount} upcoming</span>
        <span>{churchBlocks.length} church blocked</span>
        <span>{unavailable.length} unavailable</span>
      </p>

      <section className="panel" id="priest-calendar" aria-labelledby="calendar-heading">
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
          <span className="cal-legend__item cal-legend__item--sacramental">Assigned to me</span>
          <span className="cal-legend__item cal-legend__item--blocked">Church blocked</span>
          <span className="cal-legend__item cal-legend__item--unavailable">Unavailable</span>
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
            const items = eventsByDate.get(iso) || []
            const dayBlockList = blocksByDate.get(iso) || []
            const dayUnavailableList = unavailableByDate.get(iso) || []
            const shown = items.slice(0, 1).length + (dayBlockList.length > 0 ? 1 : 0) + (dayUnavailableList.length > 0 ? 1 : 0)
            const extra = items.length + dayBlockList.length + dayUnavailableList.length - shown
            return (
              <div
                key={iso}
                className={[
                  'cal__day',
                  inMonth ? '' : 'is-out',
                  iso === today ? 'is-today' : '',
                  iso === selectedDate ? 'is-selected' : '',
                  dayBlockList.length > 0 ? 'is-blocked' : '',
                  dayBlockList.length === 0 && dayUnavailableList.length > 0 ? 'is-unavailable' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="gridcell"
              >
                <button type="button" className="cal__date" onClick={() => setSelectedDate(iso)}>
                  {date.getDate()}
                </button>
                {items.slice(0, 1).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={`cal__event cal__event--sacramental ${
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
                {dayUnavailableList.slice(0, 1).map((entry) => (
                  <span key={entry.id} className="cal__unavailable">
                    {entry.reason}
                  </span>
                ))}
                {extra > 0 && <span className="cal__more">+{extra} more</span>}
              </div>
            )
          })}
        </div>

        <div className="day-detail">
          <h3>{formatWeekdayDate(selectedDate)}</h3>
          {dayBlocks.length === 0 && dayUnavailable.length === 0 && dayEvents.length === 0 ? (
            <p className="muted">Nothing on this day.</p>
          ) : (
            <ul className="day-detail__list">
              {dayBlocks.map((block) => (
                <li key={block.id}>
                  <strong>Church blocked</strong>
                  <span>
                    {formatDateTime(block.date, block.time)} · {block.reason}
                  </span>
                </li>
              ))}
              {dayUnavailable.map((entry) => (
                <li key={entry.id}>
                  <strong>Unavailable</strong>
                  <span>
                    {formatDateTime(entry.date, entry.time)} · {entry.reason}
                  </span>
                </li>
              ))}
              {dayEvents.map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong>
                  <span>
                    {eventTypeLabel(event)} · {event.participants?.toLocaleString()} participants
                  </span>
                  <StatusPill status={eventStatusLabel(event)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel panel--spaced" aria-labelledby="my-events-heading">
        <div className="panel__head">
          <div>
            <h2 id="my-events-heading">Assigned to me</h2>
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
        {listed.length === 0 ? (
          <p className="empty">No events in this view.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Participants</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listed.map((event) => (
                  <tr
                    key={event.id}
                    className={`is-clickable ${selectedId === event.id ? 'is-selected' : ''}`}
                    onClick={() => focusEvent(event)}
                  >
                    <td>{formatDateTime(event.date, event.time)}</td>
                    <td>{event.title}</td>
                    <td>{eventTypeLabel(event)}</td>
                    <td>{event.participants?.toLocaleString() ?? '—'}</td>
                    <td>
                      <StatusPill status={eventStatusLabel(event)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
