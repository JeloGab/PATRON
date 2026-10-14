import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BlockDates from '../../components/BlockDates.jsx'
import { authed } from '../../lib/api.js'
import { clearSession } from '../../lib/session.js'

export default function BlockDate() {
  const navigate = useNavigate()
  const [priests, setPriests] = useState([])

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    let live = true
    async function load() {
      const r = await authed({ path: '/api/parish/priests' })
      if (live && r.ok) setPriests(r.json.priests)
    }
    load()
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="page">
      <Link to="/manager/schedule" className="back">
        ← Back to the calendar
      </Link>

      <header className="page__hero">
        <div>
          <p className="eyebrow">Scheduling</p>
          <h1>Blocked dates</h1>
          <p className="lede">
            Close a date for the whole parish, or record that one priest is unavailable. A blocked
            date refuses new events on it; events already scheduled are left alone and listed for
            you.
          </p>
        </div>
      </header>

      <BlockDates scope="parish" priests={priests} onSessionEnd={endSession} />
    </div>
  )
}
