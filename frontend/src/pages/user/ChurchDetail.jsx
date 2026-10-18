// One parish publicly, plus its approved announcements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChurchMedia from '../../components/ChurchMedia.jsx'
import Loading from '../../components/Loading.jsx'
import PriestPhoto from '../../components/PriestPhoto.jsx'
import { BASE, call } from '../../lib/api.js'
import { formatLongDate } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'
import { accentFor, municipalityFromAddress } from '../../lib/parishes.js'

export default function ChurchDetail() {
  const { id } = useParams()
  const [parish, setParish] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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

  // Absent until the clergy views exist; empty for a parish with no active priest.
  // Both render nothing rather than an empty card.
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
          {/* A stack, so Schedule sits under Parish office down the left side and finishes
              level with the aside, matching the staff profile. */}
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
                {/* Office hours and the Mass schedule left this list for the Schedule card
                    directly below, matching the staff profile. */}
              </dl>
            </section>

            {/* Both nullable, so the card appears only when the parish has typed at least
                one of them and each row renders only when present — a parish that has
                typed neither sees this page exactly as it was. facts--stacked keeps the
                card one column, because these are the page's only multi-line values. */}
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
