import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { getSession, setSession } from '../lib/session.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@patron.ph')
  const [password, setPassword] = useState('patron')
  const [error, setError] = useState('')

  if (getSession()) return <Navigate to="/" replace />

  function submit(event) {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }
    setSession({
      name: 'Diocesan Administrator',
      email: email.trim(),
      role: 'system_admin',
    })
    navigate('/', { replace: true })
  }

  return (
    <div className="auth">
      <aside className="auth__panel">
        <Logo light />
        <p className="auth__kicker">System administration</p>
        <h1 className="auth__title">One registry for every participating parish.</h1>
        <p className="auth__lead">
          Register parishes, review diocesan coverage, and provision parish priests and managers —
          before sacramental records go live for a community.
        </p>
        <ul className="auth__points">
          <li>Registered parish directory</li>
          <li>Parish onboarding and staff accounts</li>
          <li>Active and inactive parish status</li>
        </ul>
      </aside>

      <section className="auth__form-wrap">
        <form className="card auth__form" onSubmit={submit}>
          <p className="eyebrow">System admin</p>
          <h2>Sign in</h2>
          <p className="muted">Use any email and password. This layout is frontend-only.</p>

          {error && <p className="alert">{error}</p>}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button type="submit" className="btn btn--gold btn--block">
            Enter console
          </button>
        </form>
      </section>
    </div>
  )
}
