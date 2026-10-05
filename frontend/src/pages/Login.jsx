import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { PRIEST } from '../data/mock.js'
import { getSession, setSession } from '../lib/session.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (getSession()) return <Navigate to="/" replace />

  function submit(event) {
    event.preventDefault()
    const matchesAccount =
      email.trim().toLowerCase() === PRIEST.email && password === PRIEST.password
    if (!matchesAccount) {
      setError('That priest email or password is not recognized.')
      return
    }

    setSession({
      email: PRIEST.email,
      name: PRIEST.name,
      role: 'priest',
    })
    navigate('/', { replace: true })
  }

  return (
    <div className="login">
      <aside className="login__aside">
        <Logo light />
        <div className="login__aside-inner">
          <p className="eyebrow">Parish priest</p>
          <h1>The priest’s entrance</h1>
          <p className="lede">
            Your assigned schedule, the dates the church has blocked, and document requests waiting
            for your approval.
          </p>
          <ul className="login__points">
            <li>My calendar</li>
            <li>Unavailable dates</li>
            <li>Pending approvals</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <form className="card login__card" onSubmit={submit}>
          <p className="eyebrow">Priest</p>
          <h1>Sign in</h1>

          {error && <p className="alert">{error}</p>}

          <div className="form-grid">
            <label className="field field--full">
              <span>Priest email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="priest@parish.org"
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
            Parish priest account
            <span>
              {PRIEST.email}
              <br />
              {PRIEST.password}
            </span>
          </p>
        </form>
      </main>
    </div>
  )
}
