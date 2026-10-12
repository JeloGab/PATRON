import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { call } from '../lib/api.js'
import { getSession, landingFor } from '../lib/session.js'

// Password recovery, for parishioners only — and the page says so rather than letting
// a priest type a username here and wait for mail that cannot come.
//
// Three different accounts, three different recoveries, all of them deliberate:
//
//   parishioner  this page. Supabase Auth owns the password and emails the link.
//   staff        no self-service. The system admin resets a priest, a priest resets
//                his managers, and the reset hands back a temporary password in the
//                response — it is never mailed, because `app_user` holds no email
//                address for staff.
//   sysadmin     a hand-written SQL update, by structure: they have no superior.
//                See docs/ops.md.
//
// `POST /api/auth/forgot-password` ALWAYS answers `{ sent: true }`. A failure from
// Supabase is logged server-side and still reported here as success, so the form
// cannot be used to find out who has an account. That is why this page can never say
// "no account with that email" — it genuinely does not know.
const MESSAGES = {
  MISSING_CREDENTIALS: 'Enter the email address on your account.',
  INVALID_EMAIL: 'That email address is not valid.',
  TOO_MANY_ATTEMPTS:
    'Too many requests from this connection. Wait about an hour before trying again.',
  AUTH_PROVIDER_ERROR: 'The sign-in service is not responding. Please try again shortly.',
  NETWORK_ERROR:
    'Cannot reach the server. Check that the API is running on port 4000 and that this page is on http://localhost:5173.',
  REQUEST_FAILED: 'Something went wrong. Please try again.',
}

export default function ForgotPassword() {
  const session = getSession()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (session?.role) return <Navigate to={landingFor(session)} replace />

  async function submit(event) {
    event.preventDefault()
    setError('')

    const address = email.trim()
    if (!address) {
      setError(MESSAGES.MISSING_CREDENTIALS)
      return
    }

    setPending(true)
    const result = await call({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { email: address },
    })
    setPending(false)

    if (!result.ok) {
      // Only two real failures reach here: the rate limiter, which is five an hour on
      // this route, and the server being unreachable.
      setError(MESSAGES[result.json?.code] ?? MESSAGES.REQUEST_FAILED)
      return
    }

    setSentTo(address)
  }

  if (sentTo) {
    return (
      <div className="login">
        <main className="login__main">
          <div className="card login__card">
            <p className="eyebrow">Check your email</p>
            <h1>Reset link sent</h1>
            <p className="notice">
              If <strong>{sentTo}</strong> belongs to a parishioner account, a reset link is on its
              way to it. The link opens this site and asks for a new password.
            </p>
            <p className="muted">
              The link can be used once and expires. If it has already expired by the time you open
              it, this page will say so and you can ask for another.
            </p>
            <Link to="/login" className="btn btn--gold login__submit">
              Back to sign in
            </Link>
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
          <h1>Forgotten password</h1>
          <p className="lede">
            Enter the email address on your parishioner account and a reset link will be sent to
            it.
          </p>
          <ul className="login__points">
            <li>Parishioner accounts only</li>
            <li>Parish staff are reset by their parish, never by email</li>
            <li>The link works once</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <form className="card login__card" onSubmit={submit}>
          <p className="eyebrow">Account</p>
          <h1>Send a reset link</h1>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <div className="form-grid">
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
          </div>

          <button type="submit" className="btn btn--gold login__submit" disabled={pending}>
            {pending ? 'Sending…' : 'Send reset link'}
          </button>

          {/* Staff have no email address in `app_user`, so there is nothing to send to.
              Saying it here is cheaper than a priest waiting on mail that will never
              arrive. */}
          <p className="notice">
            Parish staff sign in with a username. Ask the parish priest to reset a manager, or the
            diocesan administrator to reset a priest — the new temporary password is handed over
            directly, not emailed.
          </p>

          <p className="login__account">
            Remembered it?
            <span>
              <Link to="/login" className="text-btn">
                Back to sign in
              </Link>
            </span>
          </p>
        </form>
      </main>
    </div>
  )
}
