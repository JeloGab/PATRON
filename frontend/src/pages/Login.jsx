import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { getSession, setSession } from '../lib/session.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('parishioner@patron.ph')
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
      name: 'Elena Cruz',
      email: email.trim(),
      role: 'user',
    })
    navigate('/', { replace: true })
  }

  return (
    <div className="auth">
      <aside className="auth__panel">
        <Logo light />
        <p className="auth__kicker">Catholic parish management</p>
        <h1 className="auth__title">Records that the Church can stand behind.</h1>
        <p className="auth__lead">
          PATRON helps parishioners find their church, review parish details, and confirm that an
          issued certificate is authentic — without handling paper ledgers.
        </p>
        <ul className="auth__points">
          <li>Directory of participating parishes</li>
          <li>Mass schedules and sacrament offices</li>
          <li>Public verification of issued documents</li>
        </ul>
      </aside>

      <section className="auth__form-wrap">
        <form className="card auth__form" onSubmit={submit}>
          <p className="eyebrow">User view</p>
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
            Enter PATRON
          </button>

          <div className="auth__divider">
            <span>or</span>
          </div>

          <Link to="/verify" className="btn btn--ghost btn--block">
            Verify a document
          </Link>
          <p className="auth__note muted">No account needed — public verification only.</p>
        </form>
      </section>
    </div>
  )
}
