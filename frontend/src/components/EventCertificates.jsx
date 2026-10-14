// Certificates issued by a completed event, read under the event.

import { useCallback, useEffect, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { formatStamp } from '../lib/documents.js'
import { certificateFileName, downloadPdf } from '../lib/download.js'
import { messageFor } from '../lib/errors.js'

export default function EventCertificates({ eventId, onSessionEnd }) {
  const [certificates, setCertificates] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    const r = await authed({ path: `/api/events/${eventId}/certificates` })
    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      setCertificates([])
      return
    }
    setCertificates(r.json.certificates)
  }, [eventId, onSessionEnd])

  useEffect(() => {
    load()
  }, [load])

  async function getPdf(certificate) {
    setBusyId(certificate.certificateId)
    setError('')
    const message = await downloadPdf({
      path: `/api/events/${eventId}/certificates/${certificate.certificateId}/pdf`,
      fileName: certificateFileName(certificate.verificationCode),
      onSessionEnd,
    })
    setBusyId(null)
    if (message) setError(message)
  }

  if (certificates !== null && certificates.length === 0) return null

  return (
    <>
      <h3 className="eyebrow">Certificates issued</h3>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {certificates === null ? (
        <p className="empty">Loading certificates…</p>
      ) : (
        <ul className="priest-list">
          {certificates.map((certificate) => (
            <li key={certificate.certificateId} className="priest-list__row">
              <div>
                <strong>{certificate.snapshot?.subjectName ?? certificate.documentName}</strong>
                <p className="muted">
                  {certificate.documentName} · book {certificate.snapshot?.bookNo}, page{' '}
                  {certificate.snapshot?.pageNo}, entry {certificate.snapshot?.entryNo}
                </p>
                <p className="muted">
                  <span className="mono">{certificate.verificationCode}</span> ·{' '}
                  {formatStamp(certificate.issuedAt)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => getPdf(certificate)}
                disabled={busyId === certificate.certificateId}
              >
                {busyId === certificate.certificateId ? 'Preparing…' : 'Download'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="muted">
        Each code resolves on the public verifier. A parishioner who took part cannot see these
        here — their copy comes from requesting a certificate against the new register entry.
      </p>
    </>
  )
}
