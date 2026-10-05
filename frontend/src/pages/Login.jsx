import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { ACCOUNTS, findAccount } from '../lib/accounts.js'
import { getSession, homeForRole, setSession } from '../lib/session.js'

export default function Login() {
  const navigate = useNavigate()
  const session = getSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (session?.role) return <Navigate to={homeForRole(session.role)} replace />

  function submit(event) {
    event.preventDefault()
    const account = findAccount(email, password)
    if (!account) {
      setError('That email or password is not recognized.')
      return
    }

    setSession({
      email: account.email,
      name: account.name,
      role: account.role,
    })
    navigate(homeForRole(account.role), { replace: true })
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
            opens the priest calendar, and a parish manager opens the parish office.
          </p>
          <ul className="login__points">
            <li>System admin registry</li>
            <li>Priest calendar and approvals</li>
            <li>Parish manager office</li>
          </ul>
        </div>
      </aside>

      <main className="login__main">
        <form className="card login__card" onSubmit={submit}>
          <p className="eyebrow">Account</p>
          <h1>Sign in</h1>

          {error && <p className="alert">{error}</p>}

          <div className="form-grid">
            <label className="field field--full">
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@parish.org"
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

          <ul className="login__accounts">
            {ACCOUNTS.map((account) => (
              <li key={account.email}>
                {account.label}
                <span>
                  {account.email}
                  <br />
                  {account.password}
                </span>
              </li>
            ))}
          </ul>
        </form>
      </main>
    </div>
  )
}
