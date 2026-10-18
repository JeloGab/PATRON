// The priest's own unavailability — Rule 1 check 2, from his side.

import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BlockDates from '../../components/BlockDates.jsx'
import { clearSession, getSession } from '../../lib/session.js'

export default function UnavailableDate() {
  const navigate = useNavigate()
  const session = getSession()

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div className="page">
      <Link to="/priest" className="back">
        ← Back to my calendar
      </Link>

      <header className="page__hero">
        <div>
          <p className="eyebrow">My schedule</p>
          <h1>Unavailable dates</h1>
          <p className="lede">
            Dates you cannot take. A new sacramental event assigned to you is refused on these
            days, and so is rescheduling one onto them. Events already on your calendar are left
            untouched.
          </p>
        </div>
      </header>

      <BlockDates
        scope="priest"
        selfId={session?.userId}
        selfName={session?.name}
        onSessionEnd={endSession}
      />
    </div>
  )
}
