import { Outlet } from 'react-router-dom'
import TopNav from '../components/TopNav.jsx'

export default function PriestLayout() {
  return (
    <div className="shell">
      <TopNav />
      <main className="stage">
        <Outlet />
      </main>
      <footer className="foot">
        <p>PATRON · Parish priest calendar, unavailable dates, and document approvals</p>
      </footer>
    </div>
  )
}
