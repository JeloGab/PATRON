// Staff password change, mounted outside the role layouts.

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'
import { call, isSessionError } from '../../lib/api.js'
import { clearSession, getSession, getToken, landingFor, patchSession } from '../../lib/session.js'

const MIN_LENGTH = 8
const MAX_BYTES = 72

function byteLength(value) {
  return new TextEncoder().encode(value).length
}

const MESSAGES = {
  PASSWORD_TOO_SHORT: `Your new password must be at least ${MIN_LENGTH} characters.`,
  PASSWORD_TOO_LONG: `Your new password is too long — ${MAX_BYTES} bytes at most.`,
  NOT_A_STAFF_ACCOUNT:
    'This account signs in through email, so its password is not changed here. Use password recovery instead.',
  UPDATE_BLOCKED: 'Your account cannot be updated right now. Please contact your parish office.',
  NETWORK_ERROR:
    'Cannot reach the server. Check that the API is running on port 4000 and that this page is on http://localhost:5173.',
  REQUEST_FAILED: 'Something went wrong. Please try again.',
}

export default function ChangePassword() {
  const navigate = useNavigate()
  const session = getSession()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (!session) return <Navigate to="/login" replace />

  const forced = Boolean(session.mustChangePassword)

  if (session.role === 'parishioner') {
    return (
      <div className="login">
        <main className="login__main">
          <div className="card login__card">
            <p className="eyebrow">Account</p>
            <h1>Password</h1>
            <p className="notice">{MESSAGES.NOT_A_STAFF_ACCOUNT}</p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate(landingFor(session), { replace: true })}
            >
              Back
            </button>
          </div>
        </main>
      </div>
    )
  }

  function signOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!current || !next) {
      setError('Enter your current password and a new one.')
      return
    }
    if (next.length < MIN_LENGTH) {
      setError(MESSAGES.PASSWORD_TOO_SHORT)
      return
    }
    if (byteLength(next) > MAX_BYTES) {
      setError(MESSAGES.PASSWORD_TOO_LONG)
      return
    }

    if (next !== confirm) {
      setError('The new password and its confirmation do not match.')
      return
    }
    if (next === current) {
      setError('Your new password must be different from your current one.')
      return
    }

    setPending(true)
    const result = await call({
      method: 'POST',
      path: '/api/auth/change-password',
      token: getToken(),
      body: { currentPassword: current, newPassword: next },
    })
    setPending(false)

    if (!result.ok) {
      if (result.json?.code === 'INVALID_CREDENTIALS') {
        setError('That is not your current password.')
        return
      }
      if (isSessionError(result)) {
        signOut()
        return
      }
      setError(MESSAGES[result.json?.code] ?? MESSAGES.REQUEST_FAILED)
      return
    }

    navigate(landingFor(patchSession({ token: result.json.token, mustChangePassword: false })), {
      replace: true,
    })
  }

  return (
    <div className="login">
      <aside className="login__aside">
        <Logo light tag="" />
        <div className="login__aside-inner">
          <p className="eyebrow">PATRON</p>
          <h1>{forced ? 'Set your own password' : 'Change your password'}</h1>
          <p className="lede">
            {forced
              ? 'Your account was created with a temporary password. Choose your own before you continue — nothing else in PATRON is available until you do.'
              : 'Choose a new password for your account. You will stay signed in on this device.'}
          </p>
          <ul className="login__points">
            <li>At least {MIN_LENGTH} characters</li>
            <li>Known only to you — never shared with the parish office</li>
            <li>Signs you out everywhere else</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <form className="card login__card" onSubmit={submit}>
          <p className="eyebrow">{session.name || 'Account'}</p>
          <h1>{forced ? 'New password' : 'Change password'}</h1>

          {forced && (
            <p className="notice">
              This account is still on its temporary password. Change it to reach the rest of
              PATRON.
            </p>
          )}

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <div className="form-grid">
            <label className="field field--full">
              <span>{forced ? 'Temporary password' : 'Current password'}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </label>
            <label className="field field--full">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
              <span className="form-hint">At least {MIN_LENGTH} characters.</span>
            </label>
            <label className="field field--full">
              <span>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
          </div>

          <button type="submit" className="btn btn--gold login__submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save password'}
          </button>

          <button type="button" className="text-btn" onClick={signOut}>
            Sign out
          </button>
        </form>
      </main>
    </div>
  )
}
