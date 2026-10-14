// The priest's announcements: approve or reject what the office wrote, or post his own
// — which is born approved, and therefore cannot carry an image.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnnouncementImages from '../../components/AnnouncementImages.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { STATUS_HINT, STATUS_LABEL, canArchive, statusPill } from '../../lib/announcements.js'
import { formatStamp } from '../../lib/documents.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession } from '../../lib/session.js'

const TABS = ['pending', 'approved', 'rejected', 'archived']
const EMPTY = { title: '', content: '' }

export default function AnnouncementApprovals() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState(null)
  const [status, setStatus] = useState('pending')
  const [draft, setDraft] = useState(EMPTY)
  const [composing, setComposing] = useState(false)
  const [rejectingId, setRejectingId] = useState(null)
  const [reason, setReason] = useState('')
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
  const pendingCount = (announcements ?? []).filter((item) => item.status === 'pending').length

  async function act(announcement, action, body = {}) {
    setError('')
    setNotice('')
    setBusy(announcement.announcementId)
    const r = await authed({
      method: 'POST',
      path: `/api/announcements/${announcement.announcementId}/${action}`,
      body,
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

    const said = { approve: 'published', reject: 'rejected', archive: 'archived' }[action]
    setNotice(`“${announcement.title}” was ${said}.`)
    setRejectingId(null)
    setReason('')
    load()
  }

  async function post(submitEvent) {
    submitEvent.preventDefault()
    setError('')
    setNotice('')

    const title = draft.title.trim()
    const content = draft.content.trim()
    if (!title || !content) {
      setError('Give the announcement a title and a message.')
      return
    }

    setBusy('post')
    const r = await authed({ method: 'POST', path: '/api/announcements', body: { title, content } })
    setBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    setDraft(EMPTY)
    setComposing(false)
    setStatus('approved')
    setNotice('Published. Your own announcement needs no approval.')
    load()
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Announcements</p>
          <h1>Announcement approvals</h1>
          <p className="lede">
            What the parish office has written, and anything you post yourself. Approving publishes
            to the public feed, and approval is final — a correction is an archive and a new
            announcement.
          </p>
        </div>
        <div className="panel__actions">
          <p className="stat">
            <strong>{announcements ? pendingCount : '—'}</strong>
            waiting for you
          </p>
          <button
            type="button"
            className="btn btn--gold"
            onClick={() => setComposing((open) => !open)}
          >
            {composing ? 'Close' : 'Post my own'}
          </button>
        </div>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {composing && (
        <form className="card editor" onSubmit={post}>
          <p className="eyebrow">Your announcement</p>
          <p className="notice">
            Yours is published the moment you post it — you are the approver, so it never waits.
            One consequence: <strong>it cannot carry an image</strong>, because images can only be
            attached before approval. For an announcement with a photograph, ask the office to
            write it and approve theirs.
          </p>
          <div className="form-grid">
            <label className="field field--full">
              <span>Title *</span>
              <input
                value={draft.title}
                onChange={(changed) =>
                  setDraft((current) => ({ ...current, title: changed.target.value }))
                }
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
                placeholder="The feed is public, so no personal details of any parishioner."
              />
            </label>
          </div>
          <div className="form-actions">
            <div className="form-actions__buttons">
              <button type="button" className="btn btn--ghost" onClick={() => setComposing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--gold" disabled={busy === 'post'}>
                {busy === 'post' ? 'Publishing…' : 'Publish'}
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
          </button>
        ))}
      </div>

      {announcements === null ? (
        <p className="empty">Loading announcements…</p>
      ) : rows.length === 0 ? (
        <p className="empty">
          {status === 'pending'
            ? 'Nothing is waiting for your approval.'
            : `No ${STATUS_LABEL[status].toLowerCase()} announcement.`}
        </p>
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
                {item.imageCount > 0 && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() =>
                      setOpenId(openId === item.announcementId ? null : item.announcementId)
                    }
                  >
                    {openId === item.announcementId ? 'Hide images' : `View ${item.imageCount} image${item.imageCount === 1 ? '' : 's'}`}
                  </button>
                )}
                {item.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="btn btn--gold"
                      onClick={() => act(item, 'approve')}
                      disabled={busy === item.announcementId}
                    >
                      {busy === item.announcementId ? 'Publishing…' : 'Approve and publish'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setRejectingId(item.announcementId)}
                    >
                      Reject
                    </button>
                  </>
                )}
                {canArchive(item, 'priest') && (
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

              {rejectingId === item.announcementId && (
                <div className="form-grid">
                  <label className="field field--full">
                    <span>Reason (optional)</span>
                    <input
                      value={reason}
                      onChange={(changed) => setReason(changed.target.value)}
                      placeholder="e.g. Wait until the schedule is confirmed"
                    />
                  </label>
                  <div className="form-actions__buttons field--full">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setRejectingId(null)}
                    >
                      Keep it pending
                    </button>
                    <button
                      type="button"
                      className="btn btn--gold"
                      onClick={() =>
                        act(item, 'reject', reason.trim() ? { reason: reason.trim() } : {})
                      }
                      disabled={busy === item.announcementId}
                    >
                      Confirm rejection
                    </button>
                  </div>
                </div>
              )}

              {openId === item.announcementId && (
                <AnnouncementImages
                  announcement={item}
                  canWrite={false}
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
