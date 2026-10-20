// Parishioner registration; the app_user row appears at first login, not here.

import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'
import { call } from '../../lib/api.js'
import { getSession, landingFor } from '../../lib/session.js'

const MIN_LENGTH = 8
const MAX_BYTES = 72
const MAX_EMAIL = 60

function byteLength(value) {
  return new TextEncoder().encode(value).length
}

const MESSAGES = {
  INVALID_NAME: 'Enter your full name — 2 to 50 characters.',
  INVALID_EMAIL: 'That email address is not valid.',
  PASSWORD_TOO_SHORT: `Choose a password of at least ${MIN_LENGTH} characters.`,
  PASSWORD_TOO_LONG: `That password is too long — ${MAX_BYTES} bytes at most.`,
  TOO_MANY_ATTEMPTS:
    'Too many sign-up attempts from this connection. Wait about an hour and try again.',
  AUTH_PROVIDER_ERROR: 'The sign-in service is not responding. Please try again shortly.',
  NETWORK_ERROR:
    'Cannot reach the server. Check that the API is running on port 4000 and that this page is on http://localhost:5173.',
  REQUEST_FAILED: 'Something went wrong creating your account. Please try again.',
}

export default function Signup() {
  const session = getSession()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (session?.role) return <Navigate to={landingFor(session)} replace />

  async function submit(event) {
    event.preventDefault()
    setError('')

    const name = fullName.trim()
    const address = email.trim()

    if (!name || !address || !password) {
      setError('Fill in your name, email and a password.')
      return
    }
    if (name.length < 2 || name.length > 50) {
      setError(MESSAGES.INVALID_NAME)
      return
    }
    if (address.length > MAX_EMAIL) {
      setError(`That email address is too long — ${MAX_EMAIL} characters at most.`)
      return
    }
    if (password.length < MIN_LENGTH) {
      setError(MESSAGES.PASSWORD_TOO_SHORT)
      return
    }
    if (byteLength(password) > MAX_BYTES) {
      setError(MESSAGES.PASSWORD_TOO_LONG)
      return
    }

    if (password !== confirm) {
      setError('The password and its confirmation do not match.')
      return
    }

    setPending(true)
    const result = await call({
      method: 'POST',
      path: '/api/auth/register',
      body: { fullName: name, email: address, password },
    })
    setPending(false)

    if (!result.ok) {
      setError(MESSAGES[result.json?.code] ?? MESSAGES.REQUEST_FAILED)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="login">
        <main className="login__main">
          <div className="card login__card">
            <p className="eyebrow">Check your email</p>
            <h1>Confirm your address</h1>
            <p className="notice">
              If <strong>{email.trim()}</strong> is not registered, a confirmation link is
              on its way to it. Open the link, then sign in — your account is set up on your first
              sign-in, not now.
            </p>
            <p className="muted">
              Nothing was sent to a parish office: a parishioner account belongs to you, not to a
              parish.
            </p>
            <Link to="/login" className="btn btn--gold login__submit">
              Go to sign in
            </Link>
            <p className="login__account">
              Link never arrived?
              <span>
                <Link to="/forgot-password" className="text-btn">
                  Send a new one
                </Link>
              </span>
            </p>
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
          <h1>Create a parishioner account</h1>
          <p className="lede">
            An account lets you request baptismal, confirmation, marriage and death certificates
            from any parish in the diocese, and follow each request until it is ready.
          </p>
          <ul className="login__points">
            <li>Request certificates without going to the office first</li>
            <li>Follow every request through to approval</li>
            <li>No parish to choose — your account is diocese-wide</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <form className="card login__card" onSubmit={submit}>
          <p className="eyebrow">Account</p>
          <h1>Sign up</h1>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <div className="form-grid">
            <label className="field field--full">
              <span>Full name</span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Juan Dela Cruz"
              />
              <span className="form-hint">As it should appear on a certificate request.</span>
            </label>
            <label className="field field--full">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <label className="field field--full">
              <span>Password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <span className="form-hint">At least {MIN_LENGTH} characters.</span>
            </label>
            <label className="field field--full">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
          </div>

          <button type="submit" className="btn btn--gold login__submit" disabled={pending}>
            {pending ? 'Creating your account…' : 'Create account'}
          </button>

          <p className="login__account">
            Parish staff, or already registered?
            <span>
              <Link to="/login" className="text-btn">
                Sign in instead
              </Link>
            </span>
          </p>
        </form>
      </main>
    </div>
  )
}
