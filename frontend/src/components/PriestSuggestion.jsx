// The suggested priest, as a sentence above the picker.
//
// It fetches for itself rather than taking the answer as a prop, because both CreateEvent
// and the reassign path in EventModal need the identical question asked, and a rule
// written twice will disagree with itself. The server decides WHO is suggested; this file
// only decides how to say it.

import { useEffect, useState } from 'react'
import { authed } from '../lib/api.js'
import { formatMonth } from '../lib/dates.js'

// Reads the month off the ISO string rather than parsing a Date, because a 'YYYY-MM-DD'
// parsed as UTC lands on the previous day in UTC+8 and would name the wrong month on the
// first of the month.
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
    // Availability cannot be computed without all three, so there is nothing to suggest
    // until the manager has filled them in. The line simply is not there yet.
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
      // A failed suggestion is silent. It is advice, and the three checks still refuse on
      // save, so an error banner here would read as though the form itself were broken.
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

  // Named only when someone lighter was passed over for want of a signature. That is the
  // one case where the suggestion is not simply "the fewest events", so leaving it
  // unexplained would make the answer look arbitrary.
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
