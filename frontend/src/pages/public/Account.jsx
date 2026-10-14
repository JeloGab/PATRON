// GET /api/auth/me, read-only: no route lets an account edit its own name.

import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'
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

  useEffect(() => {
    let live = true

    async function load() {
      const r = await authed({ path: '/api/auth/me' })
      if (!live) return

      if (isSessionError(r)) {
        clearSession()
        navigate('/login', { replace: true })
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
  }, [navigate])

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
