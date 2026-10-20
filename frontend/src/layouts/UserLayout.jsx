// The parishioner shell, also used signed-out by the directory and the feed.

import { Outlet } from 'react-router-dom'
import TopNav from '../components/TopNav.jsx'

export default function UserLayout() {
  return (
    <div className="shell">
      <TopNav />

      <main className="stage">
        <Outlet />
      </main>

      <footer className="foot">
        <p>PATRON · Verifiable sacramental records for Catholic parishes</p>
      </footer>
    </div>
  )
}
