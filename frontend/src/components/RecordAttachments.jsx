// Ledger photos on a saved entry: raw-body upload, bytes fetched with the token.

import { useEffect, useRef, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { messageFor } from '../lib/errors.js'
import { checkPhoto, contentTypeFor, MAX_PER_RECORD } from '../lib/fileCheck.js'
import PhotoDrop from './PhotoDrop.jsx'

export default function RecordAttachments({ record, canWrite, onRecordChange, onSessionEnd }) {
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const previewUrl = useRef(null)

  function setPreviewUrl(next) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = next?.url ?? null
    setPreview(next)
  }

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    },
    [],
  )

  async function uploadOne(file, alreadyHeld) {
    const bad = await checkPhoto(file, alreadyHeld)
    if (bad) return bad

    const r = await authed({
      method: 'POST',
      path: `/api/records/${record.recordId}/attachments`,
      raw: file,
      headers: {
        'Content-Type': await contentTypeFor(file),
        'X-File-Name': encodeURIComponent(file.name),
      },
    })

    if (isSessionError(r)) {
      onSessionEnd()
      return 'Session ended.'
    }
    if (!r.ok) return messageFor(r)

    onRecordChange(r.json.record)
    return null
  }

  async function uploadMany(files) {
    setError('')
    setUploading(true)
    let held = record.attachments.length
    for (const file of files) {
      const message = await uploadOne(file, held)
      if (message) {
        setError(message)
        break
      }
      held += 1
    }
    setUploading(false)
  }

  async function view(attachment) {
    setBusyId(attachment.attachmentId)
    setError('')
    const r = await authed({
      path: `/api/records/${record.recordId}/attachments/${attachment.attachmentId}`,
      as: 'blob',
    })
    setBusyId(null)

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setPreviewUrl({
      attachmentId: attachment.attachmentId,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      url: URL.createObjectURL(r.blob),
    })
  }

  async function remove(attachment) {
    if (!window.confirm(`Remove ${attachment.fileName}?`)) return
    setBusyId(attachment.attachmentId)
    setError('')
    const r = await authed({
      method: 'DELETE',
      path: `/api/records/${record.recordId}/attachments/${attachment.attachmentId}`,
    })
    setBusyId(null)

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    if (preview?.attachmentId === attachment.attachmentId) setPreviewUrl(null)
    onRecordChange(r.json.record)
  }

  const remaining = MAX_PER_RECORD - record.attachments.length

  return (
    <>
      <h3 className="eyebrow">Ledger photos</h3>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {record.attachments.length === 0 ? (
        <p className="empty">No photo of the register page yet.</p>
      ) : (
        <ul className="priest-list">
          {record.attachments.map((file) => (
            <li key={file.attachmentId} className="priest-list__row">
              <div>
                <strong>{file.fileName}</strong>
                <p className="muted">
                  {file.contentType} · {Math.max(1, Math.round(file.byteSize / 1024))} KB
                </p>
              </div>
              <div className="form-actions__buttons">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => view(file)}
                  disabled={busyId === file.attachmentId}
                >
                  {busyId === file.attachmentId ? 'Opening…' : 'View'}
                </button>
                {canWrite && (
                  <button
                    type="button"
                    className="btn btn--ghost priest-list__remove"
                    onClick={() => remove(file)}
                    disabled={busyId === file.attachmentId}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <figure className="ledger-preview">
          {preview.contentType.startsWith('image/') ? (
            <img className="ledger-preview__img" src={preview.url} alt={preview.fileName} />
          ) : (
            <a className="btn btn--ghost" href={preview.url} target="_blank" rel="noreferrer">
              Open {preview.fileName}
            </a>
          )}
          <figcaption className="muted">{preview.fileName}</figcaption>
        </figure>
      )}

      {canWrite && (
        <PhotoDrop
          onFiles={uploadMany}
          multiple
          busy={uploading}
          disabled={remaining <= 0}
          hint={`JPEG, PNG, WebP or PDF, up to 5 MB each. ${remaining} of ${MAX_PER_RECORD} remaining. Removing a photo does not touch the register entry.`}
        />
      )}
    </>
  )
}
