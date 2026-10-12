import { useEffect, useRef, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { messageFor } from '../lib/errors.js'
import { checkPhoto, contentTypeFor, MAX_PER_RECORD } from '../lib/fileCheck.js'
import PhotoDrop from './PhotoDrop.jsx'

// Ledger photos on a saved entry — the page of the physical register it was copied
// from.
//
// The upload is a RAW body, not multipart:
//
//   Content-Type   the file's own type. express.raw only parses the types it was
//                  given, so this header decides whether the body arrives at all.
//                  Taken from the sniffed bytes rather than file.type, which comes
//                  from the OS and is sometimes empty.
//   X-File-Name    percent-encoded. An unencoded name makes fetch() THROW before it
//                  sends, because HTTP headers are Latin-1 only and a screenshot's
//                  name often contains a narrow no-break space.
//
// The server sniffs the bytes and ignores what we declared, so `checkPhoto` here is
// only a pre-flight — it saves a wasted 5 MB round trip, it is not the gate.
export default function RecordAttachments({ record, canWrite, onRecordChange, onSessionEnd }) {
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const previewUrl = useRef(null)

  // Blob URLs are not garbage collected — they hold the bytes until revoked.
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

  // Sequential, never parallel. Each POST answers with the whole record, so parallel
  // uploads would race on which response wins — and worse, two requests could each
  // see room under the ten-per-entry limit and both succeed.
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

  // The route sends the bytes with Content-Disposition: inline and still requires the
  // Bearer token, so this cannot be an <img src>. It is fetched with the token and
  // turned into a blob URL. One at a time, deliberately: fetching several in an
  // effect keyed on the results makes the first to resolve re-run the effect, whose
  // cleanup cancels every sibling still in flight.
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
