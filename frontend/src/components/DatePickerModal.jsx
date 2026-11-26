// Picking several dates on a month calendar that shows what is already on each day.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { formatMonth, formatWeekdayDate, todayISO } from '../lib/dates.js'
import { messageFor } from '../lib/errors.js'
import { clock, groupByDate, monthWindow, timeRange } from '../lib/schedule.js'
import Modal from './Modal.jsx'
import MonthGrid from './MonthGrid.jsx'

const COUNTED = ['approved', 'completed']
const WARNED = ['pending', 'approved', 'completed']

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd
}

function clashesOn({ iso, startTime, endTime, priestId, eventsByDate, blocksByDate }) {
  if (!startTime || !endTime) return []
  const found = []

  for (const block of blocksByDate.get(iso) ?? []) {
    if (block.type === 'priest' && block.priestId !== priestId) continue
    const wholeDay = !block.startTime || !block.endTime
    if (wholeDay) {
      found.push(block.type === 'parish' ? 'The parish is closed all day.' : 'He is unavailable all day.')
      continue
    }
    if (overlaps(startTime, endTime, block.startTime.slice(0, 5), block.endTime.slice(0, 5))) {
      const when = timeRange(block.startTime, block.endTime)
      found.push(
        block.type === 'parish' ? `The parish is closed ${when}.` : `He is unavailable ${when}.`
      )
    }
  }

  if (priestId) {
    for (const event of eventsByDate.get(iso) ?? []) {
      if (event.assignedPriestId !== priestId) continue
      if (!COUNTED.includes(event.status)) continue
      if (overlaps(startTime, endTime, event.startTime.slice(0, 5), event.endTime.slice(0, 5))) {
        found.push(`He already has ${event.title}, ${timeRange(event.startTime, event.endTime)}.`)
      }
    }
  }

  return found
}

export default function DatePickerModal({
  open,
  intent = 'event',
  selected = [],
  startTime,
  endTime,
  priestId,
  onToggle,
  onClose,
  onSessionEnd,
}) {
  const first = new Date()
  const [cursor, setCursor] = useState({ year: first.getFullYear(), month: first.getMonth() })
  const [events, setEvents] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { from, to } = monthWindow(cursor.year, cursor.month)
    const [e, b] = await Promise.all([
      authed({ path: `/api/events?from=${from}&to=${to}` }),
      authed({ path: `/api/blocked-dates?from=${from}&to=${to}` }),
    ])

    if (isSessionError(e) || isSessionError(b)) {
      onSessionEnd()
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
  }, [cursor.year, cursor.month, onSessionEnd])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const eventsByDate = useMemo(() => groupByDate(events ?? [], 'eventDate'), [events])
  const blocksByDate = useMemo(() => groupByDate(blocks ?? [], 'date'), [blocks])
  const parishBlocksByDate = useMemo(
    () => groupByDate((blocks ?? []).filter((b) => b.type === 'parish'), 'date'),
    [blocks]
  )
  const priestBlocksByDate = useMemo(
    () =>
      groupByDate(
        (blocks ?? []).filter((b) => b.type === 'priest' && b.priestId === priestId),
        'date'
      ),
    [blocks, priestId]
  )

  const chosen = useMemo(() => new Set(selected), [selected])
  const today = todayISO()

  const affected = useMemo(() => {
    if (intent !== 'block') return []

    const found = new Map()
    for (const iso of selected) {
      for (const event of eventsByDate.get(iso) ?? []) {
        if (!WARNED.includes(event.status)) continue
        if (priestId && event.assignedPriestId !== priestId) continue
        found.set(event.eventId, event)
      }
    }

    return [...found.values()].sort((a, b) =>
      a.eventDate === b.eventDate
        ? a.startTime.localeCompare(b.startTime)
        : a.eventDate.localeCompare(b.eventDate)
    )
  }, [intent, selected, eventsByDate, priestId])

  const warnings = useMemo(
    () =>
      selected
        .slice()
        .sort()
        .map((iso) => ({
          iso,
          reasons: clashesOn({ iso, startTime, endTime, priestId, eventsByDate, blocksByDate }),
        }))
        .filter((item) => item.reasons.length > 0),
    [selected, startTime, endTime, priestId, eventsByDate, blocksByDate]
  )

  function shiftMonth(step) {
    setCursor((current) => {
      const date = new Date(current.year, current.month + step, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  function pick(iso) {
    if (iso < today) return
    onToggle(iso)
  }

  if (!open) return null

  return (
    <Modal open title="Choose the dates" onClose={onClose}>
      <div className="datepick">
      <div className="panel__actions month-nav">
        <button type="button" className="btn btn--ghost btn--tight" onClick={() => shiftMonth(-1)}>
          ← Previous
        </button>
        <strong className="datepick__month">{formatMonth(cursor.year, cursor.month)}</strong>
        <button type="button" className="btn btn--ghost btn--tight" onClick={() => shiftMonth(1)}>
          Next →
        </button>
      </div>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <p className="muted form-hint">
        Click a day to add it, click it again to take it off. Days already carrying events or
        blocks show them, so nothing is picked blind. Past days cannot be chosen.
      </p>

      <MonthGrid
        year={cursor.year}
        month={cursor.month}
        selectedDates={chosen}
        onSelectDate={pick}
        onOpenDay={pick}
        eventsByDate={eventsByDate}
        parishBlocksByDate={parishBlocksByDate}
        priestBlocksByDate={priestBlocksByDate}
      />

      {selected.length > 0 && (
        <ul className="date-list">
          {selected
            .slice()
            .sort()
            .map((iso) => (
              <li key={iso}>
                <span className="date-list__text">{formatWeekdayDate(iso)}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--tight"
                  onClick={() => onToggle(iso)}
                >
                  Remove
                </button>
              </li>
            ))}
        </ul>
      )}

      {intent === 'block' ? (
        affected.length > 0 ? (
          <div className="notice" role="status">
            <p>
              <strong>
                {affected.length} event{affected.length === 1 ? '' : 's'} fall on the days you
                picked.
              </strong>{' '}
              Blocking these days does not touch them. Nothing is cancelled or moved, and you can
              reschedule each one afterwards as the parish decides.
            </p>
            <ul className="date-list">
              {affected.map((event) => (
                <li key={event.eventId}>
                  <span className="date-list__text">{formatWeekdayDate(event.eventDate)}</span>
                  <span className="date-list__note">
                    {event.title}, {timeRange(event.startTime, event.endTime)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null
      ) : !startTime || !endTime ? (
        <p className="notice">
          Set the start and end time on the form to see which of these days would be refused. A
          day can be free and the hour still taken.
        </p>
      ) : warnings.length > 0 ? (
        <div className="notice" role="status">
          <p>
            <strong>
              {warnings.length} of {selected.length} dates look likely to be refused
            </strong>{' '}
            at {clock(startTime)} to {clock(endTime)}. This is a guide, not the ruling: the three
            checks run on the server when you submit, and they decide.
          </p>
          <ul className="date-list">
            {warnings.map((item) => (
              <li key={item.iso} className="is-failed">
                <span className="date-list__text">{formatWeekdayDate(item.iso)}</span>
                <span className="date-list__note">{item.reasons.join(' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="form-actions__buttons">
        <button type="button" className="btn btn--gold" onClick={onClose}>
          Done
        </button>
      </div>
      </div>
    </Modal>
  )
}
