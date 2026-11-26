// The office's announcements: compose, edit and attach images until a priest approves.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnnouncementImages from '../../components/AnnouncementImages.jsx'
import FacebookSync from '../../components/FacebookSync.jsx'
import Skeleton from '../../components/Skeleton.jsx'
import Modal from '../../components/Modal.jsx'
import PhotoDrop from '../../components/PhotoDrop.jsx'
import Seg from '../../components/Seg.jsx'
import { useConfirm } from '../../components/ConfirmProvider.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import {
  IMAGE_ACCEPT,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  STATUSES,
  STATUS_HINT,
  STATUS_LABEL,
  canArchive,
  isOpen,
  statusPill,
} from '../../lib/announcements.js'
import { formatStamp } from '../../lib/documents.js'
import { syncStateOf } from '../../lib/facebook.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession } from '../../lib/session.js'

const TABS = ['pending', 'approved', 'rejected', 'archived']
const EMPTY = { title: '', content: '' }

export default function Announcements() {
  const navigate = useNavigate()
  const { ask } = useConfirm()
  const [announcements, setAnnouncements] = useState(null)
  const [status, setStatus] = useState('pending')
  const [draft, setDraft] = useState(EMPTY)
  const [composing, setComposing] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [staged, setStaged] = useState([])
  const [formError, setFormError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const stagedUrls = useRef([])

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

  useEffect(
    () => () => {
      stagedUrls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  const rows = useMemo(
    () => (announcements ?? []).filter((item) => item.status === status),
    [announcements, status],
  )
  const counts = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s, 0]))
    for (const item of announcements ?? []) map[item.status] = (map[item.status] ?? 0) + 1
    return map
  }, [announcements])

  const detail = useMemo(
    () => (announcements ?? []).find((item) => item.announcementId === detailId) ?? null,
    [announcements, detailId],
  )
  const editable = detail ? isOpen(detail) : true

  function clearStaged() {
    staged.forEach((item) => URL.revokeObjectURL(item.url))
    stagedUrls.current = stagedUrls.current.filter((url) => !staged.some((i) => i.url === url))
    setStaged([])
  }

  function openCompose() {
    setDraft(EMPTY)
    setDetailId(null)
    setFormError('')
    clearStaged()
    setComposing(true)
  }

  function openDetail(item) {
    setDraft({ title: item.title, content: item.content })
    setComposing(false)
    setFormError('')
    clearStaged()
    setDetailId(item.announcementId)
  }

  function closeForm() {
    setComposing(false)
    setDetailId(null)
    setDraft(EMPTY)
    setFormError('')
    clearStaged()
  }

  function stage(files) {
    setFormError('')
    const room = MAX_IMAGES - staged.length
    if (room <= 0) {
      setFormError(`Up to ${MAX_IMAGES} images.`)
      return
    }

    const accepted = []
    for (const file of Array.from(files).slice(0, room)) {
      if (file.size > MAX_IMAGE_BYTES) {
        setFormError(`${file.name} is larger than 2 MB.`)
        continue
      }
      if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
        setFormError('Announcement images must be JPEG or PNG.')
        continue
      }
      const url = URL.createObjectURL(file)
      stagedUrls.current.push(url)
      accepted.push({ id: `${file.name}-${file.size}-${Math.random()}`, file, url })
    }
    if (accepted.length > 0) setStaged((current) => [...current, ...accepted])
  }

  function unstage(id) {
    setStaged((current) => {
      const gone = current.find((item) => item.id === id)
      if (gone) URL.revokeObjectURL(gone.url)
      return current.filter((item) => item.id !== id)
    })
  }

  async function uploadImage(announcementId, file) {
    return authed({
      method: 'POST',
      path: `/api/announcements/${announcementId}/images`,
      raw: file,
      headers: {
        'Content-Type': file.type,
        'X-File-Name': encodeURIComponent(file.name),
      },
    })
  }

  async function submit(submitEvent) {
    submitEvent.preventDefault()
    setFormError('')
    setNotice('')

    const title = draft.title.trim()
    const content = draft.content.trim()
    if (!title || !content) {
      setFormError('Give the announcement a title and a message.')
      return
    }

    setBusy('save')

    if (detailId) {
      const r = await authed({
        method: 'PATCH',
        path: `/api/announcements/${detailId}`,
        body: { title, content },
      })
      setBusy('')

      if (isSessionError(r)) {
        endSession()
        return
      }
      if (!r.ok) {
        setFormError(messageFor(r))
        return
      }

      setNotice('The announcement was updated.')
      closeForm()
      load()
      return
    }

    const created = await authed({
      method: 'POST',
      path: '/api/announcements',
      body: { title, content },
    })

    if (isSessionError(created)) {
      setBusy('')
      endSession()
      return
    }
    if (!created.ok) {
      setBusy('')
      setFormError(messageFor(created))
      return
    }

    const announcementId = created.json.announcement.announcementId
    const failed = []

    for (const item of staged) {
      const r = await uploadImage(announcementId, item.file)
      if (isSessionError(r)) {
        setBusy('')
        endSession()
        return
      }
      if (!r.ok) failed.push(item.file.name)
    }

    setBusy('')
    closeForm()
    setStatus('pending')
    load()

    if (failed.length === 0) {
      setNotice(
        staged.length === 0
          ? 'Submitted for the priest to approve. It is not on the public feed yet.'
          : `Submitted for the priest to approve, with ${staged.length} image${
              staged.length === 1 ? '' : 's'
            }. It is not on the public feed yet.`,
      )
      return
    }

    setError(
      `The announcement was submitted, but ${failed.length} image${
        failed.length === 1 ? '' : 's'
      } could not be attached (${failed.join(', ')}). Open it and try again — images can still be changed until a priest approves it.`,
    )
  }

  function patch(next) {
    setAnnouncements((list) =>
      (list ?? []).map((item) =>
        item.announcementId === next.announcementId
          ? { ...item, ...next, imageCount: item.imageCount }
          : item,
      ),
    )
  }

  async function archive(announcement) {
    const live = announcement.status === 'approved'
    const onPage = live && syncStateOf(announcement) === 'synced'

    const ok = await ask({
      title: 'Archive this announcement',
      message: live
        ? `It leaves the public feed straight away.${
            onPage
              ? ' The Facebook post stays up — only the parish priest can remove that.'
              : ''
          } A correction is a new announcement, which the priest still has to approve.`
        : 'This draft is filed away. It is not published, so nothing changes for anyone reading the feed.',
      confirmLabel: 'Archive',
    })

    if (!ok) return
    await act(announcement, 'archive')
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
          <button type="button" className="btn btn--gold" onClick={openCompose}>
            New announcement
          </button>
        </div>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <Seg label="Announcement status">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`seg__btn ${status === tab ? 'is-active' : ''}`}
            aria-pressed={status === tab}
            onClick={() => setStatus(tab)}
          >
            {STATUS_LABEL[tab]}
            {announcements && counts[tab] > 0 ? ` (${counts[tab]})` : ''}
          </button>
        ))}
      </Seg>

      {announcements === null ? (
        <Skeleton variant="cards" label="Loading announcements…" />
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

              <FacebookSync announcement={item} onChanged={patch} onSessionEnd={endSession} />

              <div className="form-actions__buttons">
                <button type="button" className="btn btn--ghost" onClick={() => openDetail(item)}>
                  {isOpen(item) ? 'Open' : 'View images'}
                </button>
                {canArchive(item, 'manager') && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => archive(item)}
                    disabled={busy === item.announcementId}
                  >
                    Archive
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        title={composing ? 'New announcement' : editable ? 'Edit announcement' : detail?.title || ''}
        open={composing || Boolean(detail)}
        onClose={closeForm}
      >
        <form className="editor" onSubmit={submit}>
          {formError && (
            <p className="alert" role="alert">
              {formError}
            </p>
          )}

          {editable ? (
            <div className="form-grid">
              <label className="field field--full">
                <span>Title<b className="req">*</b></span>
                <input
                  value={draft.title}
                  onChange={(changed) =>
                    setDraft((current) => ({ ...current, title: changed.target.value }))
                  }
                  placeholder="e.g. Schedule of Simbang Gabi"
                />
              </label>
              <label className="field field--full">
                <span>Message<b className="req">*</b></span>
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
          ) : (
            <p className="feed__body">{detail?.content}</p>
          )}

          {detail ? (
            <AnnouncementImages
              announcement={detail}
              canWrite={editable}
              onChanged={load}
              onSessionEnd={endSession}
            />
          ) : (
            <>
              <h3 className="eyebrow">Images</h3>
              {staged.length === 0 ? (
                <p className="empty">No image attached.</p>
              ) : (
                <ul className="priest-list">
                  {staged.map((item) => (
                    <li key={item.id} className="priest-list__row">
                      <div>
                        <strong>{item.file.name}</strong>
                        <p className="muted">
                          {item.file.type} · {Math.max(1, Math.round(item.file.size / 1024))} KB
                        </p>
                        <img className="feed__image" src={item.url} alt={item.file.name} />
                      </div>
                      <div className="form-actions__buttons">
                        <button
                          type="button"
                          className="btn btn--ghost priest-list__remove"
                          onClick={() => unstage(item.id)}
                          disabled={busy === 'save'}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <PhotoDrop
                onFiles={stage}
                accept={IMAGE_ACCEPT}
                multiple
                disabled={staged.length >= MAX_IMAGES || busy === 'save'}
                lead="Drag an image here"
                hint={`JPEG or PNG, up to 2 MB. ${
                  MAX_IMAGES - staged.length
                } of ${MAX_IMAGES} remaining. They are attached when the announcement is submitted.`}
              />
            </>
          )}

          <div className="form-actions">
            <p className="muted form-hint">
              The feed is public and unauthenticated, so it carries no personal details of any
              parishioner.
            </p>
            <div className="form-actions__buttons">
              <button type="button" className="btn btn--ghost" onClick={closeForm}>
                {editable ? 'Cancel' : 'Close'}
              </button>
              {editable && (
                <button type="submit" className="btn btn--gold" disabled={busy === 'save'}>
                  {busy === 'save'
                    ? 'Saving…'
                    : detailId
                      ? 'Save changes'
                      : 'Submit for approval'}
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
