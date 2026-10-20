// The suggested priest, as a sentence above the picker.

import { useEffect, useState } from 'react'
import { authed } from '../lib/api.js'
import { formatMonth } from '../lib/dates.js'

function monthOf(iso) {
  const year = Number(String(iso).slice(0, 4))
  const month = Number(String(iso).slice(5, 7))
  if (!year || !month) return 'that month'
  return formatMonth(year, month - 1)
}

export default function PriestSuggestion({
  eventDate,
  startTime,
  endTime,
  excludeEventId = null,
  selectedId = '',
  onPick,
}) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!eventDate || !startTime || !endTime) {
      setData(null)
      return
    }

    let live = true
    const params = new URLSearchParams({ eventDate, startTime, endTime })
    if (excludeEventId) params.set('excludeEventId', excludeEventId)

    async function load() {
      const r = await authed({ path: `/api/events/priest-suggestion?${params}` })
      if (!live) return
      setData(r.ok ? r.json : null)
    }

    load()
    return () => {
      live = false
    }
  }, [eventDate, startTime, endTime, excludeEventId])

  if (!data) return null

  if (data.parishBlocked) {
    return (
      <p className="suggestion suggestion--none">
        The parish is blocked on this date, so no priest can be assigned. Saving will be
        refused.
      </p>
    )
  }

  const suggested = data.candidates.find((entry) => entry.userId === data.suggestedPriestId)

  if (!suggested) {
    const busy = data.candidates.filter((entry) => !entry.available).length
    return (
      <p className="suggestion suggestion--none">
        No priest is free at this time
        {busy > 0 && ` — ${busy} of ${data.candidates.length} are away or already booked`}.
        Try another date or time.
      </p>
    )
  }

  const passedOver = data.candidates.find(
    (entry) =>
      entry.available && !entry.hasSignature && entry.monthCount < suggested.monthCount,
  )

  return (
    <div className="suggestion">
      <p className="suggestion__lead">
        Suggested: <strong>{suggested.fullName}</strong>
      </p>

      <p className="suggestion__why">
        {suggested.monthCount === 0
          ? `Nothing else booked in ${monthOf(eventDate)}`
          : `Fewest events in ${monthOf(eventDate)} (${suggested.monthCount})`}
        , and free at this time.
        {passedOver &&
          ` ${passedOver.fullName} is lighter (${passedOver.monthCount}) but has not drawn a signature yet.`}
      </p>

      {selectedId === suggested.userId ? (
        <p className="suggestion__done">Already selected.</p>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={() => onPick(suggested.userId)}>
          Use this priest
        </button>
      )}
    </div>
  )
}
