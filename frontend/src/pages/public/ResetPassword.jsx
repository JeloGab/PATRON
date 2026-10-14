// The new password; its token comes from lib/authFragment.js, not the route.

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'
import { call } from '../../lib/api.js'
import { clearRecovery, peekRecoveryError, peekRecoveryToken } from '../../lib/authFragment.js'

const MIN_LENGTH = 8
const MAX_BYTES = 72

function byteLength(value) {
  return new TextEncoder().encode(value).length
}

const MESSAGES = {
  INVALID_RESET_TOKEN:
    'This reset link has expired or has already been used. Ask for a new one and open it straight away.',
  PASSWORD_TOO_SHORT: `Your new password must be at least ${MIN_LENGTH} characters.`,
  PASSWORD_TOO_LONG: `Your new password is too long — ${MAX_BYTES} bytes at most.`,
  TOO_MANY_ATTEMPTS: 'Too many attempts. Wait about 15 minutes before trying again.',
  AUTH_PROVIDER_ERROR: 'The sign-in service is not responding. Please try again shortly.',
  NETWORK_ERROR:
    'Cannot reach the server. Check that the API is running on port 4000 and that this page is on http://localhost:5173.',
  REQUEST_FAILED: 'Something went wrong. Please try again.',
}

export default function ResetPassword() {
  const navigate = useNavigate()

  const [token] = useState(() => peekRecoveryToken())
  const [linkError] = useState(() => peekRecoveryError())
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (linkError) clearRecovery()
  }, [linkError])

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!next) {
      setError('Enter a new password.')
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

    setPending(true)
    const result = await call({
      method: 'POST',
      path: '/api/auth/reset-password',
      body: { accessToken: token, newPassword: next },
    })
    setPending(false)

    if (!result.ok) {
      setError(MESSAGES[result.json?.code] ?? MESSAGES.REQUEST_FAILED)
      return
    }

    clearRecovery()
    setDone(true)
  }

  if (!token || linkError) {
    return (
      <div className="login">
        <main className="login__main">
          <div className="card login__card">
            <p className="eyebrow">Password reset</p>
            <h1>{linkError ? 'This link has expired' : 'Open the link from your email'}</h1>
            <p className="notice">
              {linkError
                ? MESSAGES.INVALID_RESET_TOKEN
                : 'This page needs the one-time link that was emailed to you. Request a reset, then open the link from that message on this device.'}
            </p>
            <Link to="/forgot-password" className="btn btn--gold login__submit">
              Send a reset link
            </Link>
            <p className="login__account">
              Remembered your password?
              <span>
                <Link to="/login" className="text-btn">
                  Back to sign in
                </Link>
              </span>
            </p>
          </div>
        </main>
      </div>
    )
  }

  if (done) {
    return (
      <div className="login">
        <main className="login__main">
          <div className="card login__card">
            <p className="eyebrow">Password reset</p>
            <h1>Your password is changed</h1>
            <p className="notice">
              Sign in with your email address and your new password. Any other device you were
              signed in on has been signed out.
            </p>
            <button
              type="button"
              className="btn btn--gold login__submit"
              onClick={() => navigate('/login', { replace: true })}
            >
              Go to sign in
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="login">
      <aside className="login__aside">
        <Logo light tag="" />
        <div className="login__aside-inner">
          <p className="eyebrow">PATRON</p>
          <h1>Choose a new password</h1>
          <p className="lede">
            You opened a one-time reset link. Set a new password now — the link cannot be used
            again.
          </p>
          <ul className="login__points">
            <li>At least {MIN_LENGTH} characters</li>
            <li>Known only to you</li>
            <li>Signs you out everywhere else</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <form className="card login__card" onSubmit={submit}>
          <p className="eyebrow">Account</p>
          <h1>New password</h1>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <div className="form-grid">
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
            {pending ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </main>
    </div>
  )
}
