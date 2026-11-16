// One parish for a signed-in parishioner: office details, calendar, clergy and
// approved announcements.
//
// The page sits behind RequireRole role="parishioner" (App.jsx), which is why the
// calendar can live here with no guard of its own — every visitor already holds a
// parishioner token. The parish and announcement routes it calls are public; the
// calendar route is not.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ChurchMedia from '../../components/ChurchMedia.jsx'
import Loading from '../../components/Loading.jsx'
import MonthGrid from '../../components/MonthGrid.jsx'
import PriestPhoto from '../../components/PriestPhoto.jsx'
import { BASE, authed, call, isSessionError } from '../../lib/api.js'
import { formatLongDate, formatMonth, formatWeekdayDate, todayISO } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'
import { accentFor, municipalityFromAddress } from '../../lib/parishes.js'
import { eventTypeLabel, groupByDate, monthWindow, timeRange } from '../../lib/schedule.js'
import { clearSession } from '../../lib/session.js'

export default function ChurchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const now = new Date()
  const [parish, setParish] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // `month` is 0-indexed, because MonthGrid compares it against Date#getMonth().
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [calendar, setCalendar] = useState(null)
  const [calendarError, setCalendarError] = useState('')

  useEffect(() => {
    let live = true

    async function load() {
      setLoading(true)
      const r = await call({ path: `/api/parishes/${encodeURIComponent(id)}` })
      if (!live) return

      if (!r.ok) {
        setError(messageFor(r))
        setLoading(false)
        return
      }
      setParish(r.json.parish)

      const feed = await call({ path: `/api/parishes/${encodeURIComponent(id)}/announcements` })
      if (!live) return
      if (feed.ok) setAnnouncements(feed.json.announcements)
      setLoading(false)
    }

    load()
    return () => {
      live = false
    }
  }, [id])

  
  const { from, to } = monthWindow(cursor.year, cursor.month)

  useEffect(() => {
    let live = true

    async function loadCalendar() {
      setCalendar(null)
      setCalendarError('')

      const r = await authed({
        path: `/api/calendar?parishId=${encodeURIComponent(id)}&from=${from}&to=${to}`,
      })
      if (!live) return

      
      if (isSessionError(r)) {
        clearSession()
        navigate('/login', { replace: true })
        return
      }

      if (!r.ok) {
        setCalendarError(messageFor(r))
        setCalendar({ events: [], reservedDates: [], blockedDates: [] })
        return
      }
      setCalendar(r.json)
    }

    loadCalendar()
    return () => {
      live = false
    }
  }, [id, from, to, navigate])

  const eventsByDate = useMemo(() => groupByDate(calendar?.events ?? [], 'eventDate'), [calendar])
  const parishBlocksByDate = useMemo(
    () => groupByDate(calendar?.blockedDates ?? [], 'date'),
    [calendar]
  )
  const reservedDates = useMemo(() => new Set(calendar?.reservedDates ?? []), [calendar])

  const dayEvents = eventsByDate.get(selectedDate) ?? []
  const dayBlocks = parishBlocksByDate.get(selectedDate) ?? []
  const dayReserved = reservedDates.has(selectedDate)

  function shiftMonth(amount) {
    const next = new Date(cursor.year, cursor.month + amount, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading parish…" />
      </div>
    )
  }

  if (!parish) {
    return (
      <div className="page">
        <p className="empty">
          {error || 'This parish is not listed in the directory. It may have been deactivated.'}
        </p>
        <Link to="/user" className="btn btn--gold">
          Back to parishes
        </Link>
      </div>
    )
  }

  const accent = accentFor(parish.parishId)
  const municipality = municipalityFromAddress(parish.address)

  const priests = Array.isArray(parish.priests) ? parish.priests : []

  return (
    <div className="page">
      <Link to="/user" className="back">
        ← All parishes
      </Link>

      <article className="detail">
        <ChurchMedia
          id={parish.parishId}
          accent={accent}
          className="detail__banner"
          name={parish.name}
          alt={parish.name}
        >
          <div className="detail__banner-shade">
            {municipality && <p className="eyebrow eyebrow--light">{municipality}</p>}
            <h1>{parish.name}</h1>
            <p>{parish.address}</p>
          </div>
        </ChurchMedia>

        <div className="detail__grid">
          <div className="stack">
            <section className="card">
              <p className="eyebrow">Parish office</p>
              <dl className="facts">
                <div>
                  <dt>Address</dt>
                  <dd>{parish.address}</dd>
                </div>
                <div>
                  <dt>Contact number</dt>
                  <dd>
                    {parish.contactNo ? (
                      <a href={`tel:${parish.contactNo}`}>{parish.contactNo}</a>
                    ) : (
                      <span className="muted">Not listed</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    {parish.email ? (
                      <a href={`mailto:${parish.email}`}>{parish.email}</a>
                    ) : (
                      <span className="muted">Not listed</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            {(parish.officeHours || parish.massSchedule) && (
              <section className="card">
                <p className="eyebrow">Schedule</p>
                <dl className="facts facts--stacked">
                  {parish.officeHours && (
                    <div>
                      <dt>Office hours</dt>
                      <dd className="schedule-text">{parish.officeHours}</dd>
                    </div>
                  )}
                  {parish.massSchedule && (
                    <div>
                      <dt>Mass schedule</dt>
                      <dd className="schedule-text">{parish.massSchedule}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}
          </div>

          <aside className="stack">
            <section className="card cta-card">
              <p className="eyebrow">Online issuance</p>
              <h2 className="cta-card__title">Request a document</h2>
              <p className="muted">
                Apply for a baptismal, confirmation, marriage or death certificate from this
                parish. A request is pending until the office processes it and a priest approves
                it.
              </p>
              <Link
                to={`/user/parish/${parish.parishId}/request`}
                className="btn btn--gold btn--block"
              >
                Open application form
              </Link>
            </section>

            <section className="card">
              <p className="eyebrow">Certificates</p>
              <p className="muted">
                Every certificate PATRON issues carries a reference and a QR code that anyone can
                check without an account.
              </p>
              <Link to="/verify" className="btn btn--ghost btn--block">
                Verify a document
              </Link>
            </section>
          </aside>
        </div>

        <section className="card" aria-labelledby="parish-calendar-heading">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Parish calendar</p>
              <h2 id="parish-calendar-heading">{formatMonth(cursor.year, cursor.month)}</h2>
            </div>
            <div className="panel__actions month-nav">
              <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(-1)}>
                ← Previous
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(1)}>
                Next →
              </button>
              <span className="month-nav__sep" aria-hidden="true" />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const current = new Date()
                  setCursor({ year: current.getFullYear(), month: current.getMonth() })
                  setSelectedDate(todayISO())
                }}
              >
                Today
              </button>
            </div>
          </div>

          <p className="muted">
            Parish activities you can take part in, and the days the office is closed. A day
            marked <strong>Reserved</strong> is already taken by a sacrament — those are
            private, so no details are shown.
          </p>

          {/* legend={false} on the grid below: the staff legend names Sacramental as a
              titled chip, which is exactly what must not appear here. */}
          <div className="cal-legend">
            <span className="cal-legend__item cal-legend__item--general">General</span>
            <span className="cal-legend__item cal-legend__item--seminar">Seminar</span>
            <span className="cal-legend__item cal-legend__item--reserved">Reserved</span>
            <span className="cal-legend__item cal-legend__item--blocked">Unavailable</span>
          </div>

          {calendarError && <p className="empty">{calendarError}</p>}

          {calendar === null ? (
            <Loading label="Loading the month…" />
          ) : (
            <MonthGrid
              year={cursor.year}
              month={cursor.month}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              eventsByDate={eventsByDate}
              parishBlocksByDate={parishBlocksByDate}
              reservedDates={reservedDates}
              blockLabel="Unavailable"
              legend={false}
            />
          )}

          <div className="day-detail">
            <h3>{formatWeekdayDate(selectedDate)}</h3>
            {dayEvents.length === 0 && dayBlocks.length === 0 && !dayReserved ? (
              <p className="muted">Nothing on this day.</p>
            ) : (
              <ul className="day-detail__list">
                {dayBlocks.map((block) => (
                  <li key={block.blockedDateId}>
                    <strong>{block.reason || 'Unavailable'}</strong>
                    <span>
                      {block.startTime
                        ? `Office closed ${timeRange(block.startTime, block.endTime)}`
                        : 'Office closed all day'}
                    </span>
                  </li>
                ))}

                {dayReserved && (
                  <li>
                    <strong>Reserved</strong>
                    <span>A sacrament is scheduled on this day. Details are private.</span>
                  </li>
                )}

                {dayEvents.map((event) => (
                  <li key={event.eventId}>
                    <strong>{event.title}</strong>
                    <span>
                      {eventTypeLabel(event)} · {timeRange(event.startTime, event.endTime)}
                    </span>
                    {event.description && <span>{event.description}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {priests.length > 0 && (
          <section className="card">
            <p className="eyebrow">Priests</p>
            <ul className="clergy">
              {priests.map((priest) => (
                <li key={priest.userId} className="clergy__row">
                  <PriestPhoto
                    parishId={parish.parishId}
                    userId={priest.userId}
                    name={priest.fullName}
                    hasPhoto={priest.hasPhoto}
                  />
                  <span className="clergy__name">{priest.fullName}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card">
          <p className="eyebrow">Announcements</p>
          {announcements.length === 0 ? (
            <p className="empty">This parish has no announcements right now.</p>
          ) : (
            <ul className="feed">
              {announcements.map((item) => (
                <li key={item.announcementId} className="feed__item">
                  <h3>{item.title}</h3>
                  <p className="muted">
                    {item.publishedOn ? formatLongDate(item.publishedOn) : 'Not dated'}
                  </p>
                  <p className="feed__body">{item.content}</p>
                  {item.imageCount > 0 && (
                    <div className="feed__images">
                      {Array.from({ length: item.imageCount }, (_, index) => (
                        <img
                          key={index}
                          className="feed__image"
                          src={`${BASE}/api/feed/${item.announcementId}/images/${index + 1}`}
                          alt=""
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </div>
  )
}
