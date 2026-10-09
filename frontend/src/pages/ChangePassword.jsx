import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { call, isSessionError } from '../lib/api.js'
import { clearSession, getSession, getToken, landingFor, patchSession } from '../lib/session.js'

// Reached two ways:
//
//   forced     a provisioned priest or manager signs in on a temporary password.
//              `requirePasswordChanged` answers PASSWORD_CHANGE_REQUIRED 403 on every
//              other route, so this is the only page they can use. It sits OUTSIDE
//              the role layouts for exactly that reason — inside one it would be
//              unreachable precisely when it is needed.
//   voluntary  any staff member changing their password later.
//
// Staff only. A parishioner's password lives in Supabase Auth, so the server answers
// NOT_A_STAFF_ACCOUNT 403; they are told to use recovery instead of being shown a
// bare error.
const MIN_LENGTH = 8
const MAX_BYTES = 72

// bcrypt truncates at 72 BYTES, not characters, and the server enforces the same.
// An accented or non-Latin password can pass a character count and still be
// rejected, so the check has to be done in bytes on this side too.
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

  // The route is outside the role guards, so a parishioner can reach it. Say why it
  // is not for them rather than letting them submit into a 403.
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
    // The server has no notion of a confirmation field — this is the client's job,
    // and it matters most here, where a typo would lock a priest out of an account
    // he has just been given.
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
      // INVALID_CREDENTIALS here means the CURRENT password was mistyped. The session
      // is fine. This is the case the narrowed 401 rule exists for — signing them out
      // would strand a priest mid-way through his first sign-in, on a temporary
      // password, in a loop.
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

    // Only a token comes back, no user object — so merge, never rebuild. And it must
    // be stored before anything else is requested: the old token is already dead.
    //
    // landingFor() is given what patchSession RETURNS, not the `session` in scope:
    // that closure still has mustChangePassword true, so routing on it would send us
    // straight back here, forever.
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
