import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { getSession, setSession } from '../lib/session.js'

const OFFICE_ACCOUNT = {
  email: 'office@parish.org',
  password: 'parish',
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (getSession()) return <Navigate to="/" replace />

  function submit(event) {
    event.preventDefault()
    const matchesAccount =
      email.trim().toLowerCase() === OFFICE_ACCOUNT.email && password === OFFICE_ACCOUNT.password
    if (!matchesAccount) {
      setError('That office email or password is not recognized.')
      return
    }

    setSession({
      email: OFFICE_ACCOUNT.email,
      role: 'admin',
    })
    navigate('/', { replace: true })
  }

  return (
    <div className="login">
      <aside className="login__aside">
        <Logo light />
        <div className="login__aside-inner">
          <p className="eyebrow">Parish manager</p>
          <h1>The office entrance</h1>
          <p className="lede">
            Schedules, sacramental records, and document requests for the parish staff.
          </p>
          <ul className="login__points">
            <li>Event calendar</li>
            <li>Sacrament applications</li>
            <li>Records and announcements</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <form className="card login__card" onSubmit={submit}>
          <p className="eyebrow">Admin</p>
          <h1>Sign in</h1>

          {error && <p className="alert">{error}</p>}

          <div className="form-grid">
            <label className="field field--full">
              <span>Office email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="office@parish.org"
                required
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
                required
              />
            </label>
          </div>

          <button type="submit" className="btn btn--gold login__submit">
            Sign in
          </button>
          <p className="login__account">
            Parish office account
            <span>
              {OFFICE_ACCOUNT.email}
              <br />
              {OFFICE_ACCOUNT.password}
            </span>
          </p>
        </form>
      </main>
    </div>
  )
}
