// The diocese logo: one image, uploaded by the sysadmin, printed on every certificate.

import { useCallback, useEffect, useState } from 'react'
import { useConfirm } from '../../components/ConfirmProvider.jsx'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import Skeleton from '../../components/Skeleton.jsx'
import PhotoDrop from '../../components/PhotoDrop.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession } from '../../lib/session.js'

const LOGO_TYPES = ['image/png', 'image/jpeg']
const MAX_LOGO_BYTES = 1 * 1024 * 1024

export default function DioceseLogo() {
  const navigate = useNavigate()
  const { ask } = useConfirm()
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [version, setVersion] = useState(0)

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    let live = true
    let created = null

    async function load() {
      const r = await authed({ path: '/api/admin/diocese/logo', as: 'blob' })
      if (!live) return

      if (isSessionError(r)) {
        endSession()
        return
      }

      setLoading(false)
      if (!r.ok) {
        setUrl(null)
        return
      }

      created = URL.createObjectURL(r.blob)
      setUrl(created)
    }

    load()
    return () => {
      live = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [endSession, version])

  async function upload(files) {
    const file = files[0]
    if (!file) return
    setError('')
    setNotice('')

    if (file.size > MAX_LOGO_BYTES) {
      setError('That image is larger than 1 MB.')
      return
    }
    if (!LOGO_TYPES.includes(file.type)) {
      setError('The diocese logo must be a PNG or a JPEG.')
      return
    }

    setBusy('upload')
    const r = await authed({
      method: 'POST',
      path: '/api/admin/diocese/logo',
      raw: file,
      headers: { 'Content-Type': file.type },
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

    setVersion((current) => current + 1)
    setNotice('Logo updated. It applies to every certificate, including those already issued.')
  }

  async function remove() {
    const ok = await ask({
      title: 'Remove logo',
      message:
        'Certificates render on demand, so it also disappears from those already issued.',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    setError('')
    setNotice('')
    setBusy('remove')
    const r = await authed({ method: 'DELETE', path: '/api/admin/diocese/logo' })
    setBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    setVersion((current) => current + 1)
    setNotice('Logo removed. Certificates print without it.')
  }

  if (loading) {
    return (
      <div className="page">
        <Skeleton variant="media" label="Loading the logo…" />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__hero">
        <h1>Diocese logo</h1>
        <p className="lede">
          One logo for every parish. It prints beside the parish seal on each certificate,
          and because certificates are drawn when they are downloaded, replacing it here
          updates the ones already issued too.
        </p>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <section className="card">
        <p className="eyebrow">
          <Icon name="image" /> Current logo
        </p>

        {url ? (
          <>
            <img className="logo-preview" src={url} alt="Diocese logo" />
            <div className="form-actions__buttons">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={remove}
                disabled={busy === 'remove'}
              >
                {busy === 'remove' ? 'Removing…' : 'Remove logo'}
              </button>
            </div>
            <p className="muted form-hint">
              Replacing it needs the old one removed first.
            </p>
          </>
        ) : (
          <>
            <p className="empty">No logo uploaded. Certificates print without one.</p>
            <PhotoDrop
              onFiles={upload}
              accept="image/png,image/jpeg"
              busy={busy === 'upload'}
              lead="Drag the logo here"
              hint="PNG or JPEG, up to 1 MB. Square prints best."
            />
          </>
        )}
      </section>
    </div>
  )
}
