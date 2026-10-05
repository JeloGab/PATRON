import { useMemo, useState } from 'react'
import { monthDays } from '../lib/calendar.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatLong(date) {
  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ParishCalendar({ churchId }) {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(() => new Date())

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const days = useMemo(() => monthDays(churchId, year, month), [churchId, year, month])
  const lead = days[0].date.getDay()
  const availableCount = days.filter((day) => day.status === 'available').length
  const unavailableCount = days.length - availableCount
  const active = days.find((day) => sameDay(day.date, selected)) ?? null

  const title = cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

  function shiftMonth(amount) {
    const next = new Date(year, month + amount, 1)
    setCursor(next)
    setSelected(next)
  }

  return (
    <div className="calendar">
      <div className="calendar__head">
        <button type="button" className="calendar__nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <h3 className="calendar__title">{title}</h3>
        <button type="button" className="calendar__nav" onClick={() => shiftMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>

      <p className="calendar__counts">
        <span className="calendar__count calendar__count--available">{availableCount} available</span>
        <span className="calendar__count calendar__count--unavailable">{unavailableCount} unavailable</span>
      </p>

      <div className="calendar__weekdays" aria-hidden="true">
        {WEEKDAYS.map((label) => (
          <span key={label} className="calendar__weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="calendar__grid" aria-label={`${title} parish calendar`}>
        {Array.from({ length: lead }, (_, index) => (
          <span key={`pad-${index}`} className="calendar__pad" />
        ))}
        {days.map((day) => {
          const isToday = sameDay(day.date, today)
          const isSelected = sameDay(day.date, selected)
          return (
            <button
              key={day.date.getDate()}
              type="button"
              className={[
                'calendar__day',
                `calendar__day--${day.status}`,
                isToday ? 'calendar__day--today' : '',
                isSelected ? 'calendar__day--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={isSelected}
              aria-label={`${formatLong(day.date)}, ${day.status}. ${day.reason}`}
              onClick={() => setSelected(day.date)}
            >
              <span className="calendar__day-num">{day.date.getDate()}</span>
              <span className="calendar__day-label">
                {day.status === 'available' ? 'Available' : 'Unavailable'}
              </span>
            </button>
          )
        })}
      </div>

      <ul className="calendar__legend">
        <li className="calendar__count calendar__count--available">Available</li>
        <li className="calendar__count calendar__count--unavailable">Unavailable</li>
      </ul>

      {active && (
        <div className={`calendar__detail calendar__detail--${active.status}`}>
          <p className="calendar__detail-date">{formatLong(active.date)}</p>
          <p className="calendar__detail-status">
            {active.status === 'available' ? 'Available' : 'Unavailable'}
          </p>
          <p className="muted">{active.reason}</p>
        </div>
      )}
    </div>
  )
}
