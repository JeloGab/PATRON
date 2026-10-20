// The office landing page, built from the list endpoints — there is no counters route.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EventTable from '../../components/EventTable.jsx'
import Loading from '../../components/Loading.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { formatWeekRange, isoOffset, startOfWeek, toISODate, todayISO } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession } from '../../lib/session.js'

const AHEAD_DAYS = 60

function countLabel({ rows, hasMore }) {
  if (rows === null) return '—'
  return hasMore ? `${rows}+` : String(rows)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [parish, setParish] = useState(null)
  const [events, setEvents] = useState(null)
  const [needsEntry, setNeedsEntry] = useState({ rows: null, hasMore: false })
  const [needsPriest, setNeedsPriest] = useState({ rows: null, hasMore: false })
  const [error, setError] = useState('')

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const load = useCallback(async () => {
    const from = toISODate(startOfWeek(new Date()))
    const to = isoOffset(AHEAD_DAYS)

    const [p, e, pendingDocs, verifiedDocs] = await Promise.all([
      authed({ path: '/api/parish' }),
      authed({ path: `/api/events?from=${from}&to=${to}` }),
      authed({ path: '/api/documents?status=pending' }),
      authed({ path: '/api/documents?status=verified' }),
    ])

    if ([p, e, pendingDocs, verifiedDocs].some(isSessionError)) {
      endSession()
      return
    }

    if (p.ok) setParish(p.json.parish)
    if (!e.ok) {
      setError(messageFor(e))
      setEvents([])
    } else {
      setError('')
      setEvents(e.json.events)
    }
    if (pendingDocs.ok) {
      setNeedsEntry({ rows: pendingDocs.json.requests.length, hasMore: pendingDocs.json.hasMore })
    }
    if (verifiedDocs.ok) {
      setNeedsPriest({
        rows: verifiedDocs.json.requests.length,
        hasMore: verifiedDocs.json.hasMore,
      })
    }
  }, [endSession])

  useEffect(() => {
    load()
  }, [load])

  const today = todayISO()
  const week = useMemo(() => {
    const start = startOfWeek(new Date())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { from: toISODate(start), to: toISODate(end) }
  }, [])

  const live = useMemo(
    () => (events ?? []).filter((event) => !['cancelled', 'rejected'].includes(event.status)),
    [events],
  )
  const thisWeek = live.filter(
    (event) => event.eventDate >= week.from && event.eventDate <= week.to,
  )
  const upcoming = live.filter((event) => event.eventDate >= today)
  const awaitingApproval = live.filter(
    (event) => event.status === 'pending' && event.eventType === 'sacramental',
  )

  const metrics = [
    {
      label: 'Events this week',
      value: events === null ? '—' : String(thisWeek.length),
      hint: `Sun–Sat · ${formatWeekRange()}`,
      to: '/manager/schedule',
    },
    {
      label: 'Waiting on a priest',
      value: events === null ? '—' : String(awaitingApproval.length),
      hint: 'Sacramental events not yet approved',
      to: '/manager/schedule',
    },
    {
      label: 'Requests to match',
      value: countLabel(needsEntry),
      hint: 'No register entry attached yet',
      to: '/manager/documents',
    },
    {
      label: 'Requests with an entry',
      value: countLabel(needsPriest),
      hint: 'Waiting for a priest to approve the issuance',
      to: '/manager/documents',
    },
  ]

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Parish manager</p>
          <h1>Dashboard</h1>
          <p className="lede">
            {parish?.name ?? 'Your parish'}. Review the office queue, then the coming schedule.
          </p>
        </div>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <section className="metrics" aria-label="Office summary">
        {metrics.map((item) => (
          <Link key={item.label} to={item.to} className="metric">
            <p className="metric__label">{item.label}</p>
            <p className="metric__value">{item.value}</p>
            <p className="metric__hint">{item.hint}</p>
            <span className="metric__more">View</span>
          </Link>
        ))}
      </section>

      <section className="panel" aria-labelledby="upcoming-heading">
        <div className="panel__head">
          <div>
            <h2 id="upcoming-heading">Upcoming events</h2>
            <p className="muted panel__note">
              {events === null
                ? 'Loading…'
                : `${upcoming.length === 1 ? '1 event' : `${upcoming.length} events`} from today through the next ${AHEAD_DAYS} days`}
            </p>
          </div>
          <div className="panel__actions">
            <Link to="/manager/schedule" className="btn btn--ghost">
              Open calendar
            </Link>
            <Link to="/manager/events/new" className="btn btn--gold">
              Create event
            </Link>
          </div>
        </div>

        {events === null ? (
          <Loading label="Loading the schedule…" />
        ) : (
          <EventTable events={upcoming} empty="No upcoming event on the schedule." />
        )}
      </section>
    </div>
  )
}
