// GET /api/auth/me, read-only: no route lets an account edit its own name.

import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'
import SignaturePad from '../../components/SignaturePad.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { messageFor } from '../../lib/errors.js'
import { clearSession, getSession, landingFor, patchSession } from '../../lib/session.js'

const ROLE_LABEL = {
  sysadmin: 'System administrator',
  priest: 'Parish priest',
  manager: 'Parish manager',
  parishioner: 'Parishioner',
}

export default function Account() {
  const navigate = useNavigate()
  const session = getSession()
  const [me, setMe] = useState(null)
  const [parish, setParish] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState(null)
  const [signatureState, setSignatureState] = useState('loading')
  const [signatureBusy, setSignatureBusy] = useState('')

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const loadSignature = useCallback(async () => {
    const r = await authed({ path: '/api/users/signature', as: 'blob' })
    if (!r.ok) {
      setSignatureState('none')
      return
    }
    setSignatureUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(r.blob)
    })
    setSignatureState('present')
  }, [])

  useEffect(() => {
    let live = true

    async function load() {
      const r = await authed({ path: '/api/auth/me' })
      if (!live) return

      if (isSessionError(r)) {
        endSession()
        return
      }
      if (!r.ok) {
        setError(messageFor(r))
        return
      }

      setMe(r.json.user)

      patchSession({
        name: r.json.user.fullName ?? '',
        email: r.json.user.email ?? '',
        username: r.json.user.username ?? '',
        role: r.json.user.role,
        parishId: r.json.user.parishId ?? null,
        mustChangePassword: Boolean(r.json.user.mustChangePassword),
      })

      if (r.json.user.role === 'priest' || r.json.user.role === 'manager') {
        const p = await authed({ path: '/api/parish' })
        if (live && p.ok) setParish(p.json.parish)
      }
    }

    load()
    return () => {
      live = false
    }
  }, [endSession])

  useEffect(() => {
    if ((me?.role ?? session?.role) === 'priest') loadSignature()
  }, [me?.role, session?.role, loadSignature])

  if (!session) return <Navigate to="/login" replace />

  if (session.mustChangePassword) return <Navigate to="/change-password" replace />

  function signOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  async function emailResetLink() {
    setError('')
    setNotice('')
    setSending(true)
    const r = await authed({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { email: me?.email ?? session.email },
    })
    setSending(false)

    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setNotice(
      `A reset link has been sent to ${me?.email ?? session.email}. Open it to choose a new password.`,
    )
  }

  async function saveSignature(blob) {
    setError('')
    setNotice('')
    setSignatureBusy('save')
    const r = await authed({
      method: 'POST',
      path: '/api/users/signature',
      raw: blob,
      headers: { 'Content-Type': 'image/png' },
    })
    setSignatureBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(
        r.status === 404
          ? 'The signature feature is not deployed on the server yet.'
          : messageFor(r),
      )
      return
    }
    setNotice('Your signature was saved. Every certificate you sign from now on carries it.')
    loadSignature()
  }

  async function removeSignature() {
    if (!window.confirm('Remove your signature? No certificate can be issued without one.')) return
    setError('')
    setNotice('')
    setSignatureBusy('remove')
    const r = await authed({ method: 'DELETE', path: '/api/users/signature' })
    setSignatureBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setSignatureUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setSignatureState('none')
    setNotice('Your signature was removed. Certificates cannot be issued until you draw a new one.')
  }

  const role = me?.role ?? session.role
  const isStaff = role === 'sysadmin' || role === 'priest' || role === 'manager'

  return (
    <div className="login">
      <aside className="login__aside">
        <Logo light tag="" />
        <div className="login__aside-inner">
          <p className="eyebrow">PATRON</p>
          <h1>Your account</h1>
          <p className="lede">
            These details come from the parish register of users, not from this device. They are
            shown as the server holds them.
          </p>
          <ul className="login__points">
            <li>Changed by whoever provisioned the account</li>
            <li>Deactivation never deletes — the audit trail is kept</li>
            <li>Signing out clears this device only</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <div className="card login__card">
          <p className="eyebrow">{ROLE_LABEL[role] ?? 'Account'}</p>
          <h1>{me?.fullName ?? session.name ?? 'Account'}</h1>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          {notice && <p className="notice">{notice}</p>}

          {!me && !error ? (
            <p className="empty">Loading your account…</p>
          ) : (
            <dl className="facts">
              <div>
                <dt>Role</dt>
                <dd>{ROLE_LABEL[role] ?? role}</dd>
              </div>
              <div>
                <dt>{me?.username ? 'Username' : 'Email'}</dt>
                <dd>{me?.username || me?.email || '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{me?.status === 'active' ? 'Active' : (me?.status ?? '—')}</dd>
              </div>
              <div>
                <dt>Parish</dt>
                <dd>
                  {parish?.name ??
                    (me?.parishId
                      ? 'Your parish'
                      : 'None — a parishioner account is diocese-wide')}
                </dd>
              </div>
            </dl>
          )}

          {role === 'priest' && (
            <>
              <h3 className="eyebrow">Signature</h3>
              <p className="muted">
                Drawn once and reused. Every certificate you approve carries it, and a copy is
                kept with that certificate — so redrawing it never changes one already issued.
                No certificate can be issued while you have none.
              </p>

              {signatureState === 'loading' ? (
                <p className="empty">Loading your signature…</p>
              ) : signatureState === 'present' ? (
                <>
                  <img className="signature__preview" src={signatureUrl} alt="Your signature" />
                  <div className="form-actions__buttons">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setSignatureState('drawing')}
                    >
                      Draw a new one
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={removeSignature}
                      disabled={signatureBusy === 'remove'}
                    >
                      {signatureBusy === 'remove' ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {signatureState === 'none' && (
                    <p className="alert">
                      You have no signature on file, so no certificate can be issued with your
                      name — including those generated when a sacramental event is completed.
                    </p>
                  )}
                  <SignaturePad onSave={saveSignature} busy={signatureBusy === 'save'} />
                </>
              )}
            </>
          )}

          <h3 className="eyebrow">Password</h3>
          {isStaff ? (
            <>
              <p className="muted">
                Your password is held by PATRON itself. Changing it signs out every other device
                immediately.
              </p>
              <Link to="/change-password" className="btn btn--gold login__submit">
                Change password
              </Link>
            </>
          ) : (
            <>
              <p className="muted">
                Your password is held by the sign-in service, not by PATRON, so it is changed
                through a link sent to your email address.
              </p>
              <button
                type="button"
                className="btn btn--gold login__submit"
                onClick={emailResetLink}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Email me a reset link'}
              </button>
            </>
          )}

          <div className="form-actions__buttons">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate(landingFor(session))}
            >
              Back
            </button>
            <button type="button" className="btn btn--ghost" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
