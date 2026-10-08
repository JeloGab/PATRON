import { useMemo, useState } from 'react'
import StatusPill from './StatusPill.jsx'
import { formatDateTime, isUpcomingEvent } from '../lib/dates.js'
import { eventStatusLabel, eventTypeLabel } from '../lib/events.js'

export default function EventTable({
  events,
  empty,
  showWhen = false,
  onSelect,
  selectedId,
  showSearch = false,
}) {
  const [type, setType] = useState('all')
  const [query, setQuery] = useState('')
  const types = useMemo(
    () => ['all', ...Array.from(new Set(events.map((event) => eventTypeLabel(event))))],
    [events],
  )
  const rows = events.filter((event) => {
    if (type !== 'all' && eventTypeLabel(event) !== type) return false
    if (!showSearch || !query.trim()) return true
    const hay =
      `${event.title} ${event.priest || ''} ${eventTypeLabel(event)} ${eventStatusLabel(event)}`.toLowerCase()
    return hay.includes(query.trim().toLowerCase())
  })

  if (events.length === 0) {
    return <p className="empty">{empty}</p>
  }

  return (
    <div>
      <div className="filters">
        <label className="field filters__type">
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {types.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All types' : item}
              </option>
            ))}
          </select>
        </label>
        {showSearch && (
          <label className="field filters__search">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, priest, or type"
            />
          </label>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date & time</th>
            <th>Title</th>
            <th>Type</th>
            <th>Priest</th>
            <th>No. of participants</th>
            <th>Status</th>
            {showWhen && <th>When</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((event) => {
            const upcoming = isUpcomingEvent(event)
            return (
              <tr
                key={event.id}
                className={[
                  onSelect ? 'is-clickable' : '',
                  selectedId === event.id ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={onSelect ? () => onSelect(event) : undefined}
              >
                <td>{formatDateTime(event.date, event.time)}</td>
                <td>{event.title}</td>
                <td>{eventTypeLabel(event)}</td>
                <td>{event.priest || '—'}</td>
                <td>{event.participants == null ? '—' : event.participants.toLocaleString()}</td>
                <td>
                  <StatusPill status={eventStatusLabel(event)} />
                </td>
                {showWhen && <td>{upcoming ? 'Upcoming' : 'Past'}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
      )}
    </div>
  )
}
