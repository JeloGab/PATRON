import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { call } from '../lib/api.js'
import { getSession, landingFor, setSession } from '../lib/session.js'

// Two sign-in routes, because there are two credential systems.
//
//   staff        username + password, bcrypt checked by Express.
//                Supabase Auth never hears of a priest or a manager.
//   parishioner  email + password, owned by Supabase Auth.
//
// A single field cannot serve both: staff have no email in `app_user`, and asking a
// priest for one would be asking for something that does not exist. Hence the
// toggle — it is the credential system, made visible.
const MODES = {
  staff: {
    key: 'staff',
    label: 'Parish staff',
    path: '/api/auth/staff/login',
    field: 'username',
    fieldLabel: 'Username',
    inputType: 'text',
    placeholder: 'jdelacruz',
    // NOT type="email". A username is not an email, and `type="email"` with
    // `required` makes the browser refuse to submit — no request is sent, the
    // console stays silent, and it reads as a broken button.
    wrongCredentials: 'That username or password is not recognised.',
    missing: 'Enter your username and password.',
  },
  parishioner: {
    key: 'parishioner',
    label: 'Parishioner',
    path: '/api/auth/login',
    field: 'email',
    fieldLabel: 'Email',
    inputType: 'email',
    placeholder: 'name@example.com',
    wrongCredentials: 'That email or password is not recognised.',
    missing: 'Enter your email and password.',
  },
}

const MESSAGES = {
  ACCOUNT_INACTIVE:
    'This account has been deactivated. Ask your parish office, or the diocesan administrator, to restore it.',
  EMAIL_NOT_VERIFIED:
    'Confirm your email address first — open the link that was sent to you, then sign in again.',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Wait about 15 minutes before trying again.',
  AUTH_PROVIDER_ERROR: 'The sign-in service is not responding. Please try again in a moment.',
  PROVISIONING_FAILED: 'Your account could not be set up. Please contact the parish office.',
  NETWORK_ERROR:
    'Cannot reach the server. Check that the API is running on port 4000 and that this page is on http://localhost:5173.',
  REQUEST_FAILED: 'Something went wrong signing you in. Please try again.',
}

export default function Login() {
  const navigate = useNavigate()
  const session = getSession()
  const [mode, setMode] = useState('staff')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (session?.role) return <Navigate to={landingFor(session)} replace />

  const config = MODES[mode]

  function switchMode(next) {
    if (next === mode) return
    setMode(next)
    setIdentifier('')
    setPassword('')
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!identifier.trim() || !password) {
      setError(config.missing)
      return
    }

    setPending(true)
    const result = await call({
      method: 'POST',
      path: config.path,
      body: { [config.field]: identifier.trim(), password },
    })
    setPending(false)

    if (!result.ok) {
      const code = result.json?.code
      if (code === 'INVALID_CREDENTIALS' || code === 'MISSING_CREDENTIALS') {
        setError(code === 'MISSING_CREDENTIALS' ? config.missing : config.wrongCredentials)
        return
      }
      setError(MESSAGES[code] ?? MESSAGES.REQUEST_FAILED)
      return
    }

    const { token, user } = result.json

    // landingFor() decides: a temporary password routes to /change-password, since
    // `requirePasswordChanged` answers PASSWORD_CHANGE_REQUIRED 403 on every other
    // route and the role home would render an app where nothing loads.
    navigate(landingFor(setSession({ token, user })), { replace: true })
  }

  return (
    <div className="login">
      <aside className="login__aside">
        <Logo light tag="" />
        <div className="login__aside-inner">
          <p className="eyebrow">PATRON</p>
          <h1>Parish Management System</h1>
          <p className="lede">
            Sign in with your account. A system admin opens the diocesan registry, a parish priest
            opens the priest calendar, a parish manager opens the parish office, and a parishioner
            opens the parish directory.
          </p>
          <ul className="login__points">
            <li>System admin registry</li>
            <li>Priest calendar and approvals</li>
            <li>Parish manager office</li>
            <li>Parishioner directory and document requests</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <form className="card login__card" onSubmit={submit}>
          <p className="eyebrow">Account</p>
          <h1>Sign in</h1>

          <div className="seg" role="group" aria-label="Account type">
            {Object.values(MODES).map((item) => (
              <button
                key={item.key}
                type="button"
                className={`seg__btn ${mode === item.key ? 'is-active' : ''}`}
                aria-pressed={mode === item.key}
                onClick={() => switchMode(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <div className="form-grid">
            <label className="field field--full">
              <span>{config.fieldLabel}</span>
              <input
                // `key` forces a fresh input when the tab changes, so the browser
                // does not keep autofilling an email into the username field.
                key={config.key}
                type={config.inputType}
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={config.placeholder}
              />
            </label>
            <label className="field field--full">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </label>
          </div>

          <button type="submit" className="btn btn--gold login__submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>

          {/* The reciprocal of the verifier's own "Parish sign in" link. Someone holding
              a certificate needs no account at all, and this is the only place they
              would think to look for that. */}
          <p className="login__account">
            Only need to check a certificate?
            <span>
              <Link to="/verify" className="text-btn">
                Verify a document — no account needed
              </Link>
            </span>
          </p>
        </form>
      </main>
    </div>
  )
}
