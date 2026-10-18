// Images on an announcement: up to four, JPEG or PNG, 2 MB each, raw-body upload.

import { useEffect, useRef, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { IMAGE_ACCEPT, MAX_IMAGES, MAX_IMAGE_BYTES } from '../lib/announcements.js'
import { messageFor } from '../lib/errors.js'
import Loading from './Loading.jsx'
import PhotoDrop from './PhotoDrop.jsx'

export default function AnnouncementImages({ announcement, canWrite, onChanged, onSessionEnd }) {
  const [images, setImages] = useState(null)
  const [previews, setPreviews] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const urls = useRef([])

  useEffect(() => {
    let live = true

    async function load() {
      const r = await authed({ path: `/api/announcements/${announcement.announcementId}/images` })
      if (!live) return
      if (isSessionError(r)) {
        onSessionEnd()
        return
      }
      if (!r.ok) {
        setError(messageFor(r))
        setImages([])
        return
      }
      setImages(r.json.images)
    }

    load()
    return () => {
      live = false
    }
  }, [announcement.announcementId, onSessionEnd])

  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  async function view(image) {
    if (previews[image.imageId]) return
    setBusy(image.imageId)
    const r = await authed({
      path: `/api/announcements/${announcement.announcementId}/images/${image.imageId}`,
      as: 'blob',
    })
    setBusy('')

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    const url = URL.createObjectURL(r.blob)
    urls.current.push(url)
    setPreviews((current) => ({ ...current, [image.imageId]: url }))
  }

  async function upload(files) {
    const file = files[0]
    if (!file) return
    setError('')

    if (file.size > MAX_IMAGE_BYTES) {
      setError(`${file.name} is larger than 2 MB.`)
      return
    }
    if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
      setError('Announcement images must be JPEG or PNG.')
      return
    }

    setBusy('upload')
    const r = await authed({
      method: 'POST',
      path: `/api/announcements/${announcement.announcementId}/images`,
      raw: file,
      headers: {
        'Content-Type': file.type,
        'X-File-Name': encodeURIComponent(file.name),
      },
    })
    setBusy('')

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setImages((current) => [...(current ?? []), r.json.image])
    onChanged?.()
  }

  async function remove(image) {
    if (!window.confirm(`Remove ${image.fileName}?`)) return
    setBusy(image.imageId)
    const r = await authed({
      method: 'DELETE',
      path: `/api/announcements/${announcement.announcementId}/images/${image.imageId}`,
    })
    setBusy('')

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setImages((current) => (current ?? []).filter((item) => item.imageId !== image.imageId))
    onChanged?.()
  }

  const remaining = MAX_IMAGES - (images?.length ?? 0)

  return (
    <>
      <h3 className="eyebrow">Images</h3>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {images === null ? (
        <Loading label="Loading images…" />
      ) : images.length === 0 ? (
        <p className="empty">No image attached.</p>
      ) : (
        <ul className="priest-list">
          {images.map((image) => (
            <li key={image.imageId} className="priest-list__row">
              <div>
                <strong>
                  Slot {image.slotNo} · {image.fileName}
                </strong>
                <p className="muted">
                  {image.contentType} · {Math.max(1, Math.round(image.byteSize / 1024))} KB
                </p>
                {previews[image.imageId] && (
                  <img className="feed__image" src={previews[image.imageId]} alt={image.fileName} />
                )}
              </div>
              <div className="form-actions__buttons">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => view(image)}
                  disabled={busy === image.imageId || Boolean(previews[image.imageId])}
                >
                  {busy === image.imageId ? 'Opening…' : 'View'}
                </button>
                {canWrite && (
                  <button
                    type="button"
                    className="btn btn--ghost priest-list__remove"
                    onClick={() => remove(image)}
                    disabled={busy === image.imageId}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <PhotoDrop
          onFiles={upload}
          accept={IMAGE_ACCEPT}
          busy={busy === 'upload'}
          disabled={remaining <= 0}
          lead="Drag an image here"
          hint={`JPEG or PNG, up to 2 MB. ${remaining} of ${MAX_IMAGES} remaining. Images can only be changed before a priest approves the announcement.`}
        />
      )}
    </>
  )
}
