// The office's announcements: compose, edit and attach images while a priest has not
// approved yet. Approved is final, so a correction is an archive plus a new one.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnnouncementImages from '../../components/AnnouncementImages.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import {
  STATUSES,
  STATUS_HINT,
  STATUS_LABEL,
  canArchive,
  isOpen,
  statusPill,
} from '../../lib/announcements.js'
import { formatStamp } from '../../lib/documents.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession } from '../../lib/session.js'

const TABS = ['pending', 'approved', 'rejected', 'archived']
const EMPTY = { title: '', content: '' }

export default function Announcements() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState(null)
  const [status, setStatus] = useState('pending')
  const [draft, setDraft] = useState(EMPTY)
  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const load = useCallback(async () => {
    const r = await authed({ path: '/api/announcements' })
    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      setAnnouncements([])
      return
    }
    setError('')
    setAnnouncements(r.json.announcements)
  }, [endSession])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(
    () => (announcements ?? []).filter((item) => item.status === status),
    [announcements, status],
  )
  const counts = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s, 0]))
    for (const item of announcements ?? []) map[item.status] = (map[item.status] ?? 0) + 1
    return map
  }, [announcements])

  function closeForm() {
    setComposing(false)
    setEditingId(null)
    setDraft(EMPTY)
  }

  async function submit(submitEvent) {
    submitEvent.preventDefault()
    setError('')
    setNotice('')

    const title = draft.title.trim()
    const content = draft.content.trim()
    if (!title || !content) {
      setError('Give the announcement a title and a message.')
      return
    }

    setBusy('save')
    const r = editingId
      ? await authed({
          method: 'PATCH',
          path: `/api/announcements/${editingId}`,
          body: { title, content },
        })
      : await authed({ method: 'POST', path: '/api/announcements', body: { title, content } })
    setBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    setNotice(
      editingId
        ? 'The announcement was updated.'
        : 'Submitted for the priest to approve. It is not on the public feed yet.',
    )
    closeForm()
    setStatus('pending')
    load()
  }

  async function act(announcement, action) {
    setError('')
    setNotice('')
    setBusy(announcement.announcementId)
    const r = await authed({
      method: 'POST',
      path: `/api/announcements/${announcement.announcementId}/${action}`,
      body: {},
    })
    setBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setNotice(`“${announcement.title}” was archived.`)
    load()
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Announcements</p>
          <h1>Parish announcements</h1>
          <p className="lede">
            Written here, approved by a priest, then published on the public feed. Once approved an
            announcement cannot be edited — a correction is an archive and a new announcement.
          </p>
        </div>
        <div className="panel__actions">
          <p className="stat">
            <strong>{announcements ? counts.pending : '—'}</strong>
            waiting on a priest
          </p>
          <button
            type="button"
            className="btn btn--gold"
            onClick={() => {
              setDraft(EMPTY)
              setEditingId(null)
              setComposing((open) => !open)
            }}
          >
            {composing ? 'Close' : 'New announcement'}
          </button>
        </div>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {(composing || editingId) && (
        <form className="card editor" onSubmit={submit}>
          <p className="eyebrow">{editingId ? 'Edit announcement' : 'New announcement'}</p>
          <div className="form-grid">
            <label className="field field--full">
              <span>Title *</span>
              <input
                value={draft.title}
                onChange={(changed) =>
                  setDraft((current) => ({ ...current, title: changed.target.value }))
                }
                placeholder="e.g. Schedule of Simbang Gabi"
              />
            </label>
            <label className="field field--full">
              <span>Message *</span>
              <textarea
                rows={6}
                value={draft.content}
                onChange={(changed) =>
                  setDraft((current) => ({ ...current, content: changed.target.value }))
                }
                placeholder="Written for parishioners. No names or personal details — the feed is public."
              />
            </label>
          </div>
          <div className="form-actions">
            <p className="muted form-hint">
              The feed is public and unauthenticated, so it carries no personal details of any
              parishioner.
            </p>
            <div className="form-actions__buttons">
              <button type="button" className="btn btn--ghost" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn--gold" disabled={busy === 'save'}>
                {busy === 'save' ? 'Saving…' : editingId ? 'Save changes' : 'Submit for approval'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="seg" role="group" aria-label="Announcement status">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`seg__btn ${status === tab ? 'is-active' : ''}`}
            aria-pressed={status === tab}
            onClick={() => {
              setStatus(tab)
              setOpenId(null)
            }}
          >
            {STATUS_LABEL[tab]}
            {announcements && counts[tab] > 0 ? ` (${counts[tab]})` : ''}
          </button>
        ))}
      </div>

      {announcements === null ? (
        <p className="empty">Loading announcements…</p>
      ) : rows.length === 0 ? (
        <p className="empty">No {STATUS_LABEL[status].toLowerCase()} announcement.</p>
      ) : (
        <ul className="feed">
          {rows.map((item) => (
            <li key={item.announcementId} className="card feed__item">
              <div className="request-card__head">
                <div>
                  <h2>{item.title}</h2>
                  <p className="muted">
                    {formatStamp(item.createdAt)}
                    {item.imageCount > 0
                      ? ` · ${item.imageCount} image${item.imageCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
                </div>
                <span className={statusPill(item.status)}>{STATUS_LABEL[item.status]}</span>
              </div>

              <p className="feed__body">{item.content}</p>
              <p className="muted">{STATUS_HINT[item.status]}</p>
              {item.statusReason && <p className="alert">Reason: {item.statusReason}</p>}

              <div className="form-actions__buttons">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setOpenId(openId === item.announcementId ? null : item.announcementId)}
                >
                  {openId === item.announcementId ? 'Hide images' : 'Images'}
                </button>
                {isOpen(item) && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setDraft({ title: item.title, content: item.content })
                      setEditingId(item.announcementId)
                      setComposing(false)
                    }}
                  >
                    Edit
                  </button>
                )}
                {canArchive(item, 'manager') && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => act(item, 'archive')}
                    disabled={busy === item.announcementId}
                  >
                    Archive
                  </button>
                )}
              </div>

              {openId === item.announcementId && (
                <AnnouncementImages
                  announcement={item}
                  canWrite={isOpen(item)}
                  onChanged={load}
                  onSessionEnd={endSession}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
