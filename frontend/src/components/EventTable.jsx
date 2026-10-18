// The event list, on the real event shape.

import { useMemo, useState } from 'react'
import { formatDateTime } from '../lib/dates.js'
import { STATUS_LABEL, eventTypeLabel, statusPill, timeRange } from '../lib/schedule.js'

export default function EventTable({
  events,
  empty,
  onSelect,
  selectedId,
  showSearch = false,
}) {
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')

  const types = useMemo(
    () => ['all', ...Array.from(new Set(events.map((event) => eventTypeLabel(event))))],
    [events],
  )

  const rows = events.filter((event) => {
    if (type !== 'all' && eventTypeLabel(event) !== type) return false
    if (status !== 'all' && event.status !== status) return false
    if (!showSearch || !query.trim()) return true
    const hay = `${event.title} ${event.assignedPriestName || ''} ${eventTypeLabel(event)}`
    return hay.toLowerCase().includes(query.trim().toLowerCase())
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
        <label className="field filters__type">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
              placeholder="Search title, priest or type"
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
                <th>Date &amp; time</th>
                <th>Title</th>
                <th>Type</th>
                <th>Priest</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr
                  key={event.eventId}
                  className={[
                    onSelect ? 'is-clickable' : '',
                    selectedId === event.eventId ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={onSelect ? () => onSelect(event) : undefined}
                >
                  <td>{formatDateTime(event.eventDate, event.startTime)}</td>
                  <td>{event.title}</td>
                  <td>{eventTypeLabel(event)}</td>
                  <td>
                    {event.assignedPriestName || '—'}
                    {event.priestNeedsReassignment && (
                      <span className="chip chip--quiet">Needs reassignment</span>
                    )}
                  </td>
                  <td>{timeRange(event.startTime, event.endTime)}</td>
                  <td>
                    <span className={statusPill(event.status)}>{STATUS_LABEL[event.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
