// The diocese logo: one image, uploaded by the sysadmin, printed on every certificate
// every parish issues. GET/POST/DELETE /api/admin/diocese/logo

import { useCallback, useEffect, useState } from 'react'
import { useConfirm } from '../../components/ConfirmProvider.jsx'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import Loading from '../../components/Loading.jsx'
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
    setNotice(
      'The diocese logo was updated. It prints on every certificate from every parish, including those already issued.',
    )
  }

  async function remove() {
    const ok = await ask({
      title: 'Remove diocese logo',
      message:
        'Every certificate is rendered on demand, so the logo disappears from certificates already issued as well as new ones.',
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
    setNotice('The diocese logo was removed. Certificates print without it.')
  }

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading the diocese logo…" />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__hero">
        <p className="eyebrow">
          <Icon name="shield" /> Diocese of Libmanan
        </p>
        <h1>Diocese logo</h1>
        <p className="lede">
          One logo for the whole diocese. It prints on the left of the header of every
          certificate every parish issues, beside that parish&rsquo;s own seal. It is read
          when a certificate is drawn rather than copied when one is issued, so replacing it
          here corrects every certificate — including those already downloaded.
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
            <p className="empty">
              No diocese logo has been uploaded. Certificates print with the parish name
              alone, which is how they look today.
            </p>
            <PhotoDrop
              onFiles={upload}
              accept="image/png,image/jpeg"
              busy={busy === 'upload'}
              lead="Drag the diocese logo here"
              hint="PNG or JPEG, up to 1 MB. A square image on a transparent or plain background prints best."
            />
          </>
        )}
      </section>
    </div>
  )
}
