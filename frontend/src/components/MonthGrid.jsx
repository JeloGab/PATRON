// The month calendar, shared by both staff calendars.

import { buildMonthGrid, formatMonth, toISODate, todayISO } from '../lib/dates.js'
import { eventCategory } from '../lib/schedule.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS = 2

export default function MonthGrid({
  year,
  month,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  selectedEventId,
  eventsByDate,
  parishBlocksByDate,
  priestBlocksByDate,
  reservedDates,
  blockLabel = 'Parish blocked',
  legend = true,
}) {
  const cells = buildMonthGrid(year, month)
  const today = todayISO()

  return (
    <>
      {legend && (
        <div className="cal-legend">
          <span className="cal-legend__item cal-legend__item--sacramental">Sacramental</span>
          <span className="cal-legend__item cal-legend__item--general">General</span>
          <span className="cal-legend__item cal-legend__item--seminar">Seminar</span>
          <span className="cal-legend__item cal-legend__item--blocked">Blocked</span>
        </div>
      )}

      <div className="cal" role="grid" aria-label={formatMonth(year, month)}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="cal__weekday" role="columnheader">
            {day}
          </div>
        ))}

        {cells.map((date) => {
          const iso = toISODate(date)
          const inMonth = date.getMonth() === month
          const items = eventsByDate?.get(iso) ?? []
          const parishBlocks = parishBlocksByDate?.get(iso) ?? []
          const priestBlocks = priestBlocksByDate?.get(iso) ?? []
          const reserved = reservedDates?.has(iso) ?? false
          const extra = Math.max(0, items.length - MAX_CHIPS)

          return (
            <div
              key={iso}
              className={[
                'cal__day',
                inMonth ? '' : 'is-out',
                iso === today ? 'is-today' : '',
                iso === selectedDate ? 'is-selected' : '',
                parishBlocks.length + priestBlocks.length > 0 ? 'is-blocked' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="gridcell"
            >
              <button type="button" className="cal__date" onClick={() => onSelectDate?.(iso)}>
                {date.getDate()}
              </button>

              {items.slice(0, MAX_CHIPS).map((event) => (
                <button
                  key={event.eventId}
                  type="button"
                  className={`cal__event cal__event--${eventCategory(event)} ${
                    selectedEventId === event.eventId ? 'is-selected' : ''
                  }`}
                  onClick={() => {
                    onSelectDate?.(iso)
                    onSelectEvent?.(event)
                  }}
                >
                  {event.title}
                </button>
              ))}

              {/* The parishioner calendar's only word for a sacramental day. No
                  title, no rite, no time — the view it comes from selects none of
                  them. Staff calendars never pass reservedDates. */}
              {reserved && <span className="cal__reserved">Reserved</span>}

              {parishBlocks.slice(0, 1).map((block) => (
                <span key={block.blockedDateId} className="cal__block">
                  {block.reason || blockLabel}
                </span>
              ))}
              {priestBlocks.slice(0, 1).map((block) => (
                <span key={block.blockedDateId} className="cal__block">
                  {block.reason || 'Unavailable'}
                </span>
              ))}

              {extra > 0 && <span className="cal__more">+{extra} more</span>}
            </div>
          )
        })}
      </div>
    </>
  )
}
