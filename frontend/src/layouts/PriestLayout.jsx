// Owns the priest's pending-approval count: TopNav gets it as a prop, child routes
// through Outlet context, so no provider is needed.

import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from '../components/TopNav.jsx'
import { authed } from '../lib/api.js'
import { isoOffset, todayISO } from '../lib/dates.js'
import { getSession } from '../lib/session.js'

const WINDOW_DAYS = 91

export default function PriestLayout() {
  const session = getSession()
  const priestId = session?.userId ?? null
  const [pendingCount, setPendingCount] = useState(0)

  const refresh = useCallback(async () => {
    const r = await authed({
      path: `/api/events?from=${todayISO()}&to=${isoOffset(WINDOW_DAYS)}`,
    })
    if (!r.ok) return
    setPendingCount(
      r.json.events.filter(
        (event) =>
          event.status === 'pending' &&
          event.eventType === 'sacramental' &&
          event.assignedPriestId === priestId,
      ).length,
    )
  }, [priestId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="shell">
      <TopNav pendingCount={pendingCount} />
      <main className="stage">
        <Outlet context={{ refresh }} />
      </main>
      <footer className="foot">
        <p>PATRON · Parish priest calendar, unavailable dates, and document approvals</p>
      </footer>
    </div>
  )
}
