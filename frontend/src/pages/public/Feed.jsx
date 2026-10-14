// The public announcement feed: GET /api/feed, no account, approved announcements from
// every parish. Its images are public bytes, so they are ordinary <img> elements.

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'
import { call } from '../../lib/api.js'
import { formatLongDate } from '../../lib/dates.js'
import { messageFor } from '../../lib/errors.js'

const BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:4000').replace(/\/$/, '')

export default function Feed() {
  const [announcements, setAnnouncements] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await call({ path: `/api/feed?page=${page}` })
    if (!r.ok) {
      setError(messageFor(r))
      setAnnouncements([])
      return
    }
    setError('')
    setAnnouncements(r.json.announcements)
    setHasMore(r.json.hasMore)
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/login" className="topbar__brand">
            <Logo compact />
          </Link>
          <div className="topbar__user">
            <Link to="/verify" className="btn btn--ghost">
              Verify a document
            </Link>
            <Link to="/login" className="btn btn--ghost">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="stage">
        <div className="page">
          <header className="page__hero">
            <div>
              <p className="eyebrow">Parish announcements</p>
              <h1>What is happening in the parishes</h1>
              <p className="lede">
                Published announcements from every parish in PATRON. No account is needed, and
                nothing here names a parishioner.
              </p>
            </div>
          </header>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          {announcements === null ? (
            <p className="empty">Loading the feed…</p>
          ) : announcements.length === 0 ? (
            <p className="empty">No announcement has been published yet.</p>
          ) : (
            <ul className="feed">
              {announcements.map((item) => (
                <li key={item.announcementId} className="card feed__item">
                  <p className="eyebrow">{item.parishName}</p>
                  <h2>{item.title}</h2>
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

          {(page > 1 || hasMore) && (
            <div className="form-actions__buttons">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Newer
              </button>
              <span className="muted">Page {page}</span>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPage((current) => current + 1)}
                disabled={!hasMore}
              >
                Older
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="foot">
        <p>PATRON · Verifiable sacramental records for Catholic parishes</p>
      </footer>
    </div>
  )
}
