// Owns the priest's three tab badges: counts to TopNav, refresh() through Outlet context.

import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from '../components/TopNav.jsx'
import { authed } from '../lib/api.js'
import { isoOffset, todayISO } from '../lib/dates.js'
import { getSession } from '../lib/session.js'

const WINDOW_DAYS = 91
const NONE = { count: 0, more: false }

export default function PriestLayout() {
  const session = getSession()
  const priestId = session?.userId ?? null
  const [counts, setCounts] = useState({ events: NONE, documents: NONE, announcements: NONE })

  const refresh = useCallback(async () => {
    const [events, documents, announcements] = await Promise.all([
      authed({ path: `/api/events?from=${todayISO()}&to=${isoOffset(WINDOW_DAYS)}` }),
      authed({ path: '/api/documents?status=verified' }),
      authed({ path: '/api/announcements' }),
    ])

    setCounts((current) => ({
      events: events.ok
        ? {
            count: events.json.events.filter(
              (event) =>
                event.status === 'pending' &&
                event.eventType === 'sacramental' &&
                event.assignedPriestId === priestId,
            ).length,
            more: false,
          }
        : current.events,

      documents: documents.ok
        ? { count: documents.json.requests.length, more: Boolean(documents.json.hasMore) }
        : current.documents,

      announcements: announcements.ok
        ? {
            count: announcements.json.announcements.filter((item) => item.status === 'pending')
              .length,
            more: false,
          }
        : current.announcements,
    }))
  }, [priestId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="shell">
      <TopNav counts={counts} />
      <main className="stage">
        <Outlet context={{ refresh }} />
      </main>
      <footer className="foot">
        <p>PATRON · Parish priest calendar, unavailable dates, and document approvals</p>
      </footer>
    </div>
  )
}
